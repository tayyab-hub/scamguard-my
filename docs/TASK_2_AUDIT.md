# Task 2 technical audit

Audited **2026-09-04** on `task-2-core-platform` using Windows, Node 24.18.0, Python 3.12.13, PostgreSQL 17.11 and installed Chrome. Verdict: **Task 2 verified with minor fixes** and suitable for review/merge within its documented private-development scope. Main was not changed and Task 3 was not started.

## Defects found and fixed

1. **Low severity — validation metadata privacy.** Pydantic includes an unknown JSON key in the location for an `extra_forbidden` error. Because that key is user-controlled, it could disclose content chosen as a field name in the 422 response. `app/core/errors.py` now removes only the untrusted final location segment for this error type and retains useful trusted locations for normal query/body validation. A focused regression failed before and passed after the fix.
2. **Low severity — internally inconsistent list page under a concurrent commit.** PostgreSQL's default read-committed isolation allowed an insert between the separate count and row queries, producing `total: 0` with one item in a deterministic reproduction. `app/services/analyses.py` now uses a request-scoped repeatable-read transaction for that list operation. The regression forces a commit immediately after the count and verifies that one response uses one snapshot while the next request sees the new row.
3. **Low severity — transient motion after reduced-motion activation.** The global reduced-motion rule set a very short transition duration but left the default transition property active. Cancelling a running loading animation could therefore leave one browser transition for a frame. `frontend/src/styles.css` now disables transition properties under `prefers-reduced-motion: reduce`. The existing immediate no-animation assertion failed with the required two-worker command before the fix and all six focused motion cases passed afterward without changing the test.

The frontend Unicode preview limit was also challenged with emoji-heavy content. The existing Zod behavior already matches the backend's Unicode character count, so no production change was made; a contract regression records that behavior.

## Live runtime evidence

An audit-only ignored harness started the real `python -m app` entry point on port 8010, Vite on 5180, installed Chrome and the dedicated `scamguard_e2e` PostgreSQL database. It verified:

- health 200, readiness 200, API docs 200 and no-store health response;
- three valid Message/URL boundary submissions returned 201;
- ten empty, whitespace, oversized, malformed or unsupported inputs returned 422 and created zero rows;
- a browser-created record survived refresh, FastAPI restart and Vite restart;
- Dashboard/history displayed genuine persisted state and no assessment;
- Phone and QR remained disabled/local-only and produced no writes;
- with FastAPI stopped, Overview and Analyse rendered controlled unavailable states with zero false writes, then recovered after restart;
- with PostgreSQL stopped while FastAPI remained alive, health stayed 200, readiness and POST returned 503, capabilities stopped advertising submission, errors exposed no password/DSN/SQL, no row was created, and readiness plus writes recovered after restart;
- the 320 px layout had no horizontal overflow.

Expected browser resource errors were observed only while FastAPI was deliberately stopped and Vite returned proxy 500 responses. The connected Playwright regression suite separately passed its no-console/page-error assertions.

PostgreSQL was inspected directly. `analyses` contains only `id`, `input_type`, `content`, `status`, `created_at` and `updated_at`; UUID/text/varchar/timezone-aware types match the migration. The primary key, input/status checks, non-empty/length checks and `(created_at DESC, id DESC)` index exist. No intelligence fields were found.

## Verification results

| Check | Result |
| --- | --- |
| `python -m pip check` | PASS, no broken requirements |
| TypeScript | PASS |
| ESLint | PASS, zero warnings |
| Vitest | 46 passed in 3 files |
| Vite production build | PASS; JS 395.84 kB / 120.47 kB gzip, CSS 32.98 kB / 6.83 kB gzip |
| Playwright connected regression | 18 passed |
| Playwright built/offline preview | 6 passed |
| Playwright real PostgreSQL persistence | 2 passed |
| Ruff check | PASS |
| Ruff format check | PASS, 27 files formatted |
| Full Pytest with `TEST_DATABASE_URL` | 55 passed, 0 skipped, 2 dependency deprecation warnings |
| Integration-only Pytest | 28 passed, 27 deselected, 0 skipped, 2 dependency deprecation warnings |
| Alembic upgrade/current/heads/check | PASS; `0001_analysis_intake (head)`; no new operations |

Docker Compose commands were attempted but Docker is not installed on this machine. This is an environment limitation for Docker-specific verification, not a skipped database audit: the repository's existing genuine PostgreSQL 17.11 instance and separate `scamguard_test`/`scamguard_e2e` databases ran every database-dependent check.

## Remaining boundaries

The backend is an unauthenticated shared private development service. Public hosting still requires authentication/ownership, authorization, consent, retention/deletion, encryption decisions, abuse/rate controls, operational backups and deployment review. Offset pagination can move records between separate page requests, although each response is internally consistent. Write idempotency is absent; users must check history after an uncertain POST acknowledgement.

No classification, URL reputation, Phone intelligence, QR decoding, OCR, risk/confidence/evidence, ML, community reporting, adaptive learning or campaign functionality exists. Remote CI, the Task 2 Vercel branch preview, Linux, non-Chrome browsers, physical devices, load testing and a fresh dependency vulnerability audit were not independently verified.
