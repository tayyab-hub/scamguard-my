"""Report paths/categories only; inspect current code and unique historical code/document blobs.

Research corpora, images, model arrays and lockfiles are excluded from pattern scanning. This is
bounded secret hygiene, not proof that every possible secret has been detected.
"""

import hashlib
import io
import json
import re
import subprocess
from pathlib import Path
from urllib.parse import urlsplit

from dotenv import dotenv_values

ROOT = Path(__file__).resolve().parents[2]
PATTERNS = {
    "private_key": re.compile(rb"-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----"),
    "provider_token": re.compile(rb"\b(?:sk-proj-|ghp_|github_pat_|re_)[A-Za-z0-9_-]{24,}\b"),
    "openai_token": re.compile(rb"\bsk-[A-Za-z0-9]{32,}\b"),
}


def eligible(name):
    return not (
        name.startswith("data/")
        # The generated path/category-only report must not hash itself recursively.
        or name == "docs/evidence/secret_scan.json"
        or "/artifacts/" in name
        or name.endswith(("package-lock.json", "requirements.lock"))
    ) and Path(name).suffix in {
        ".py",
        ".ts",
        ".tsx",
        ".js",
        ".mjs",
        ".json",
        ".md",
        ".yml",
        ".yaml",
        ".ps1",
        ".cmd",
        ".example",
        ".html",
        ".css",
        ".toml",
        ".ini",
    }


def git(*args, **kwargs):
    return subprocess.check_output(["git", *args], cwd=ROOT, **kwargs)


def local_secrets():
    secrets = set()
    for path in [ROOT / ".env", ROOT / "backend/.env", ROOT / "frontend/.env"]:
        if not path.exists():
            continue
        for key, value in dotenv_values(path).items():
            if not value:
                continue
            if key == "DATABASE_URL":
                value = urlsplit(value.replace("postgresql+psycopg", "postgresql")).password or ""
            elif not re.search(r"(?:KEY|TOKEN|PEPPER|PASSWORD)$", key):
                continue
            if len(value) >= 12 and value not in {
                "local-development-only-change-me",
                "scamguard_local_only",
            }:
                secrets.add(value.encode())
    return secrets


def main():
    private_values = local_secrets()
    findings = []

    def scan(name, raw, scope):
        for category, pattern in PATTERNS.items():
            if pattern.search(raw):
                findings.append(dict(path=name, scope=scope, category=category))
        if any(value in raw for value in private_values):
            findings.append(dict(path=name, scope=scope, category="known_local_secret"))

    names = git("ls-files", "--cached", "--others", "--exclude-standard", "-z").decode().split("\0")
    current = [name for name in names if eligible(name) and (ROOT / name).is_file()]
    code_hash = hashlib.sha256()
    for name in sorted(current):
        raw = (ROOT / name).read_bytes()
        scan(name, raw, "working_tree")
        code_hash.update(name.encode() + b"\0" + hashlib.sha256(raw).digest())
    objects = {}
    for line in git("rev-list", "--objects", "--all").decode().splitlines():
        oid, _, name = line.partition(" ")
        if eligible(name):
            objects[oid] = name
    output = git("cat-file", "--batch", input=("\n".join(objects) + "\n").encode())
    stream = io.BytesIO(output)
    historical = 0
    for oid, name in objects.items():
        header = stream.readline().decode().split()
        assert header[0] == oid and header[1] == "blob"
        raw = stream.read(int(header[2]))
        stream.read(1)
        scan(name, raw, "git_history")
        historical += 1
    summary = dict(
        current_files=len(current),
        unique_historical_blobs=historical,
        findings=findings,
        current_scope_sha256=code_hash.hexdigest(),
        limits=(
            "Common key patterns + known local secret values; excludes corpora/models/locks/media. "
            "Production secret values were neither retrieved nor compared."
        ),
    )
    print(json.dumps(summary, indent=2))
    raise SystemExit(bool(findings))


if __name__ == "__main__":
    main()
