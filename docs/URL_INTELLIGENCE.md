# URL Intelligence — Task 4

Task 4 analyses URL strings locally. It does not open, resolve, request, render or crawl submitted destinations. This avoids an SSRF-capable destination-fetching path and accidental contact with malicious infrastructure. A browser request to SCAMGUARD's own API is separate from accessing the submitted URL.

## Pipeline and components

`AnalysisCreate → parse_url → URLClassifier + evidence detectors → optional reputation boundary → categorical fusion → persisted assessment`.

The domain is `backend/app/url_intelligence/`. Parsing, feature extraction, classifier, rules, reputation and fusion are separate modules. MESSAGE retains its Task 3 classifier/rules/fusion and optional AI path. URL never enters that classifier or AI adapter.

Versions: `url_parser_v1`, `url_features_v1`, `url_ml_v1`, `url_rules_v1`, `url_fusion_v1`. The shared per-record model/rules/fusion columns identify the appropriate input's components; historical Message metadata is untouched. Model details and reputation status/provider/version live in the existing component JSON.

## Validation, normalization and privacy

Only absolute HTTP(S) text of at most 2,048 characters is accepted. Message keeps its 5,000-character limit. Reject unsupported schemes, missing or malformed hosts, invalid ports, bad percent escapes, backslashes, embedded whitespace, control/format characters and malformed Unicode. Controls are checked before trimming because standard URL parsers may silently strip them. Surrounding ordinary spaces are trimmed.

The analytical representation lowercases scheme/IDNA hostname, removes a single terminal hostname dot, compresses valid IP literals, removes default ports, supplies `/` for an empty path, and excludes userinfo and fragments. It preserves path/query case, escaping and parameter order. Unicode names use IDNA with UTS #46 and STD3 validation; the ASCII spelling is displayed to make internationalised names visible. Encoded hostnames and IPv6 zone identifiers are deliberately unsupported. Numeric/hex-like alternate hosts are flagged without resolving or guessing their target address.

The credential-redacted original preserves submitted spelling and empty query/fragment delimiters. All userinfo before the final `@` is removed before the first database commit, leaving the separator as evidence. No original username/password is stored or returned. The parser object retains the credential-presence flag. Fragments remain in redacted original content and produce contextual evidence; they are not model input or interpreted as webpage code. No full duplicate normalized URL is persisted: retain minimal hostname/domain/parser flags instead.

Query/path/fragment values can still contain secrets. This is not general anonymization; the interface warns against sensitive content. Training records are public research data, never private submissions. All displayed input/evidence remains escaped inert text, without destination anchors, previews, image loads or browser navigation.

## Public suffix handling

[tldextract's official documentation](https://github.com/john-kurkowski/tldextract/blob/master/README.md) supports offline snapshot use. Pin `tldextract==5.3.1`, with `suffix_list_urls=()`, `cache_dir=None`, `fallback_to_snapshot=True`, and private suffixes included. There is no runtime suffix download or cache freshness dependency. `accounts.example.co.uk` maps to `example.co.uk`; `tenant.github.io` maps to `tenant.github.io`. IPs and unknown suffixes have no claimed registrable public domain. The bundled snapshot SHA-256 is `b69315c085d53972724b8f2df111ffc329b0c84fe0a47d62c8c91655cc774a38`. Snapshot updates require a reviewed dependency/model reproduction change; it is not a live domain-registration lookup.

## Explainable detectors and thresholds

Each evidence item contains category, severity (`CONTEXT`, `WEAK`, `MEANINGFUL`), label/title, explanation, bounded snippet/value, source and family. Counts and withheld-token descriptions are explicitly measurements, not invented literal quotations.

| Detector categories | Trigger and interpretation |
| --- | --- |
| IP_ADDRESS_HOST | Valid IPv4/IPv6 literal; weak host-context signal. |
| NONSTANDARD_HOST_REPRESENTATION | IPv6 or a numeric/hex-like spelling; weak, no inferred destination. |
| MISSING_MEANINGFUL_DOMAIN | No suffix-based domain and not an IP; weak. |
| EXCESSIVE_SUBDOMAINS | At least four labels above the registrable domain; weak. |
| SUSPICIOUS_SUBDOMAIN_BRANDING / BRAND_LIKE_TOKEN_MISMATCH | An exact brand-like token in a subdomain/path outside its small listed domain set; meaningful contextual mismatch, not proof of impersonation. |
| PUNYCODE | `xn--` hostname; contextual, not inherently malicious. |
| UNICODE_HOMOGLYPH_RISK | Latin with Greek/Cyrillic letters in a hostname; weak mixed-script possibility, never an exact intended-brand claim. |
| EMBEDDED_CREDENTIALS / AT_SIGN_CONFUSION | Authority userinfo; meaningful/weak respectively, same family so counted once. |
| UNUSUAL_PORT / HTTP_ONLY | Port other than 80/443 / HTTP scheme; weak transport context. |
| EXCESSIVE_URL_LENGTH | Analytical length at least 256 characters; weak complexity. |
| EXCESSIVE_PATH_DEPTH | At least eight nonempty segments; weak complexity. |
| EXCESSIVE_QUERY_PARAMETERS | At least 12 parameters; weak complexity. |
| ENCODING_OBFUSCATION | At least six percent escapes, three encoded delimiters, or a double-encoded escape. Double encoding is meaningful; ordinary delimiter/encoding density is weak. |
| HIGH_ENTROPY_TOKENS | Alphanumeric path/query token at least 24 characters with Shannon entropy at least 4.2 bits/character; weak complexity. Values withheld. |
| SUSPICIOUS_KEYWORDS | Exact lexical tokens: login, verify, verification, secure, account, update, wallet, bank, payment, invoice, unlock, reset, signin, confirm; weak. |
| URL_SHORTENER | Exact known shortening host; weak transparency signal, never expanded. |
| REDIRECT_PARAMETER / MULTIPLE_REDIRECT_PARAMETERS | One / more than one destination-like query key. Inspect at most eight values and one additional percent-decoding layer, report nested HTTP(S) hostnames only; weak, no claim a redirect occurred. |
| SUSPICIOUS_FILE_EXTENSION | Path ends with exe/scr/msi/bat/cmd/ps1/js/vbs/zip/rar/7z/apk; meaningful download context. No file downloaded. |
| FRAGMENT_CONTENT | Nonempty fragment retained but not interpreted; contextual transparency signal. |
| REPUTATION_MATCH | Only a validated configured-provider malicious result; source/version recorded. No real adapter is currently configured. |

The four documented brand patterns are PayPal, Microsoft, Apple and Google. Their exact domain sets are in `rules.py`; this is not a general trademark/affiliation database. Shorteners: bit.ly, t.co, tinyurl.com, goo.gl, ow.ly, is.gd, buff.ly, rebrand.ly, cutt.ly. Redirect keys: url, redirect, redirect_uri, next, target, continue, return, returnurl.

Thresholds are explicit versioned review heuristics, not learned scam cutoffs or universal browser limits. The training URL-length p99 was 41 for legitimate and 232 for phishing; the 256 review threshold is deliberately conservative. The source's legitimate-homepage bias makes it unsuitable for empirically estimating normal real-world path/query depth. Depth/query/entropy thresholds therefore remain documented conservative engineering choices, protected by tests with benign complex URLs. No thresholds were tuned on the held-out test set.

## Exact URL fusion

Evaluate this ordered decision table, with a strong ML signal defined as PHISHING classifier strength at least 0.90:

1. Validated reputation status COMPLETED and verdict MALICIOUS → HIGH.
2. At least two distinct meaningful evidence families → HIGH with strong ML, otherwise ELEVATED.
3. One meaningful family plus strong ML → ELEVATED.
4. Any evidence, any PHISHING estimate, or classifier strength below 0.75 → CAUTION.
5. Available classifier and no prior condition → LOW.
6. Unavailable classifier and no useful evidence → INSUFFICIENT_EVIDENCE.

Related evidence counts once by family: credentials/@ cannot double-count, nor can multiple brand tokens. Weak indicators never become High by accumulating. HTTPS contributes no safety rule. ML suspicion alone is capped at Caution. A legitimate model estimate cannot erase meaningful evidence; provider failure/unknown/no-match cannot lower local risk. With no provider, results are deterministic. Family counts and ML thresholds are conservative policy, not calibrated population-risk estimates.

The API's URL `risk_score` is always null. `confidence_score` is separate uncalibrated classifier strength, or null if unavailable; the URL UI shows a categorical classifier-strength description only in details, with no scam percentage. INSUFFICIENT_EVIDENCE chiefly covers model-unavailable/no-indicator situations, unlike Message's short-context rule. Ordinary valid URLs can reasonably receive Low observed risk without being called safe.

Actions follow evidence: independently verify a brand's official app/site, avoid credential entry, avoid sensitive data over HTTP, verify shortened/nested destinations, avoid opening/downloading unverified content, and contact the organisation independently for elevated/high outcomes.

## Optional reputation and no-fetch boundary

`URLReputationProvider` is an injectable protocol with a validated `ReputationSignal`. No live adapter, network client, API key configuration or provider request is implemented. The production builder supplies no provider, yielding DISABLED. Tests inject only mocks and verify malicious success, invalid output, timeout and safe failure statuses. Historical GET paths read stored JSON and never invoke providers or classifiers.

Any future adapter must use a fixed reviewed provider endpoint, backend-only environment secret, strict transport timeout, no implicit retries, response validation, source/version attribution and explicit operator consent to transmit URLs. Full paths/queries may disclose secrets or personal data to a provider; stripping userinfo is not sufficient anonymization. Until a concrete reviewed adapter exists, no live reputation verification is claimed.

Future webpage inspection needs a separately authorized isolation design: allowlisted schemes, DNS resolution controls, private/local/link-local/cloud-metadata blocking, redirect revalidation, connection deadlines, size and content-type limits, and a sandboxed environment. These are future prerequisites, not an implemented fetcher. Current URL analysis does not make HTTP, HEAD, DNS, browser, redirect or arbitrary-port connections.

## Persistence and deployment

No new database columns are needed: Task 3 already added neutral assessment, status, audit JSON and completion fields. Alembic remains `0002_message_intelligence`; no historical migration was edited. URL rows now follow SUBMITTED → PROCESSING → COMPLETED or a safe URL_ANALYSIS_FAILED result. Old Message and URL intake/history remain readable. Tests cover real PostgreSQL, a fresh app and no provider re-run on GET.

Models load from a package-relative default with configurable `URL_MODEL_PATH`; the artifact is checksum-verified JSON, never executable pickle. A missing/corrupt URL model is explicitly unavailable while rules still operate. Normal operation does not require sklearn or a third-party key. Development Start/Stop tooling stays development-only. Production needs independently hosted infrastructure and the existing access/privacy gate; do not expose the unauthenticated shared backend publicly.

See [datasets](URL_DATASETS.md), [model evaluation](URL_MODEL_EVALUATION.md), [testing](TESTING.md), and [Task 4 report](TASK_4_REPORT.md).
