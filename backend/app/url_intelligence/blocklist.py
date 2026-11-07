# Offline-checked phishing blocklist (url-blocklist-v1). The server downloads the OpenPhish
# community feed (non-commercial use) from one fixed endpoint in the background and keeps it in
# memory; submitted URLs are only compared with that list and are never requested. The feed is
# not stored in the repository because its redistribution terms are not established.

"""Background-refreshed OpenPhish feed used as a URLReputationProvider."""

from __future__ import annotations

import logging
import threading
import time
import urllib.request
from urllib.parse import urlsplit

from app.url_intelligence.brands import OFFICIAL_DOMAINS
from app.url_intelligence.features import SHORTENERS
from app.url_intelligence.popular import POPULAR_DOMAINS
from app.url_intelligence.reputation import ReputationSignal
from app.url_intelligence.rules import EXTRA_SHORTENERS, FREE_HOSTING

# A feed entry on a shared service (one Google Drive file, one bit.ly code, one storage bucket)
# must not flag the whole service: for these parents only an exact URL match counts.
PATH_SHARED_HOSTS = frozenset(
    "googleapis.com googleusercontent.com amazonaws.com cloudfront.net blob.core.windows.net "
    "ipfs.io dweb.link telegra.ph forms.gle docs.google.com drive.google.com dropbox.com "
    "1drv.ms sharepoint.com notion.site canva.site".split()
)
SHARED_PARENTS = (
    OFFICIAL_DOMAINS
    | POPULAR_DOMAINS
    | FREE_HOSTING
    | SHORTENERS
    | EXTRA_SHORTENERS
    | PATH_SHARED_HOSTS
)
# After any download attempt, wait before trying again so an outage cannot cause a retry on
# every analysis.
RETRY_COOLDOWN_SECONDS = 15 * 60

PROVIDER_NAME = "openphish-community"
MAX_FEED_BYTES = 8 * 1024 * 1024
MAX_ENTRIES = 200_000
FETCH_TIMEOUT_SECONDS = 15
logger = logging.getLogger("scamguard.intelligence")


def _key(url: str) -> tuple[str, str] | None:
    """Return (host, host+path+query) ignoring fragment, trailing slash and host case."""
    try:
        parts = urlsplit(url.strip())
    except ValueError:
        return None
    if parts.scheme.lower() not in {"http", "https"} or not parts.hostname:
        return None
    host = parts.hostname.lower().rstrip(".")
    path = parts.path.rstrip("/")
    query = f"?{parts.query}" if parts.query else ""
    return host, f"{host}{path}{query}"


class PhishingFeedProvider:
    """Exact URL or exact host matches against the most recent successful feed download."""

    def __init__(self, url: str, refresh_hours: int, fetch=None):
        self.url = url
        self.refresh_seconds = refresh_hours * 3600
        self._fetch = fetch or self._download
        self._lock = threading.Lock()
        self._urls: frozenset[str] = frozenset()
        self._hosts: frozenset[str] = frozenset()
        self._loaded_at: float | None = None
        self._last_attempt: float | None = None
        self._refreshing = False

    # Fixed endpoint, bounded size and timeout; this request is for the feed only.
    def _download(self) -> str:
        request = urllib.request.Request(self.url, headers={"User-Agent": "scamguard-blocklist"})
        with urllib.request.urlopen(request, timeout=FETCH_TIMEOUT_SECONDS) as response:  # noqa: S310
            data = response.read(MAX_FEED_BYTES + 1)
        if len(data) > MAX_FEED_BYTES:
            raise ValueError("Phishing feed exceeds the size limit")
        return data.decode("utf-8", errors="replace")

    def refresh(self) -> None:
        try:
            urls, hosts = set(), set()
            for line in self._fetch().splitlines()[:MAX_ENTRIES]:
                key = _key(line)
                if key:
                    urls.add(key[1])
                    # Only an entry for the whole host (no path or query) marks the host itself.
                    if key[1] == key[0]:
                        hosts.add(key[0])
            if not urls:
                raise ValueError("Phishing feed is empty")
            with self._lock:
                self._urls, self._hosts = frozenset(urls), frozenset(hosts)
                self._loaded_at = time.time()
            logger.info("event=phishing_feed_loaded entries=%d", len(urls))
        except Exception as exc:  # keep the previous list; URL analysis must not fail
            logger.warning("event=phishing_feed_unavailable exception_type=%s", type(exc).__name__)
        finally:
            with self._lock:
                self._refreshing = False

    def refresh_in_background(self) -> None:
        with self._lock:
            now = time.time()
            recent = (
                self._last_attempt is not None and now - self._last_attempt < RETRY_COOLDOWN_SECONDS
            )
            if self._refreshing or recent:
                return
            self._refreshing = True
            self._last_attempt = now
        threading.Thread(target=self.refresh, name="phishing-feed", daemon=True).start()

    def review(self, normalized_url: str) -> ReputationSignal:
        with self._lock:
            loaded_at, urls, hosts = self._loaded_at, self._urls, self._hosts
        if loaded_at is None or time.time() - loaded_at > self.refresh_seconds:
            self.refresh_in_background()
        if loaded_at is None:
            return ReputationSignal(status="UNAVAILABLE", provider=PROVIDER_NAME)
        version = "feed-" + time.strftime("%Y%m%dT%H%MZ", time.gmtime(loaded_at))
        key = _key(normalized_url)
        shared = key is not None and any(
            key[0] == parent or key[0].endswith("." + parent) for parent in SHARED_PARENTS
        )
        dedicated_host = key is not None and key[0] in hosts and not shared
        malicious = key is not None and (key[1] in urls or dedicated_host)
        return ReputationSignal(
            status="COMPLETED",
            provider=PROVIDER_NAME,
            version=version,
            verdict="MALICIOUS" if malicious else "NO_KNOWN_MATCH",
        )
