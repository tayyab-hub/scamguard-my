# Final test report — Task 9

Executed 2026-09-12 on `task-9-final-closure`, starting from main
`4b327ccf21b59e295622e3b321cec62dc523dbde`. Windows, Node 24.18.0, Python 3.12.14, installed Chrome,
real local PostgreSQL on loopback. Runtime/package versions are pinned by the repository locks.
Tests use separate suffix-guarded `_test` and `_e2e` databases. No production account or DB mutation.

## Automated final results

| Gate | Command / scope | Actual result |
| --- | --- | --- |
| TypeScript | frontend: `npm run typecheck` | PASS |
| ESLint | frontend: `npm run lint` | PASS, zero warnings |
| Vitest | frontend: `npm test` | 159 passed, 11 files |
| Production build | frontend: `npm run build` | PASS, 1,769 modules, 5.81 seconds; size inventory in PERFORMANCE_RELIABILITY.md |
| Foundation Playwright | `npm run test:e2e -- --workers=2` | 18 passed, 47.3 seconds; mocked auth/data states plus live UI/transport behavior |
| Built-preview Playwright | `npm run test:preview -- --workers=2` | 8 passed, 10.0 seconds; built app/offline states and actual packaged QR worker/WASM |
| Real PostgreSQL Playwright | `npm run test:persistence -- --workers=1` | 24 passed, 4.4 minutes; desktop and Chromium mobile emulation |
| All Playwright suites | 18 + 8 + 24 | 50 passed, no test retries; not 50 physical-device tests |
| Pytest | backend: `python -m pytest -q`, private TEST_DATABASE_URL supplied | 310 passed, 1 skipped, 2 warnings, 105.55 seconds |
| Ruff lint | root: `python -m ruff check backend` | PASS |
| Ruff format | root: `python -m ruff format --check backend` | PASS, 71 files |
| Python compatibility | `python -m pip check` | No broken requirements |
| Alembic current / heads | private local test DB | `0006_qr_intelligence` current and single head |
| Alembic drift | `python -m alembic check` | No new upgrade operations detected |
| Migration regression | Full Pytest disposable migration fixture | PASS; preservation and guarded downgrade/re-upgrade paths; no Task 9 migration |
| npm dependency audit | `npm audit --json`, including dev dependencies | 0 reported vulnerabilities across all severity levels; 348 dependencies reported |
| Production wheel | `python -m pip wheel --no-deps --no-build-isolation --wheel-dir .tmp/task9-wheel ./backend` | PASS, 790,984 bytes; package/module/dependency inspection passed |
| Secret hygiene | `python backend/scripts/scan_repository_secrets.py` | Zero findings in reviewed current code/docs/config and practical reachable Git history; scope in evidence/secret_scan.json |
| Windows launcher harness | `powershell -NoProfile -ExecutionPolicy Bypass -File scripts/Test-DevScripts.ps1` | 16 static assertions passed; footer corrected from 14 to 16; no launcher runtime change |
| Message frozen reproduction | `python backend/scripts/evaluate_final.py` | Original 1,160-test matrix reproduced; all 5,797 manifest memberships checked |
| URL frozen reproduction | `python backend/scripts/verify_url_pipeline.py` | 234,674 prepared rows / 197,700 isolated domains verified; original 36,901-test matrix reproduced |
| Controlled matrices | same evaluation runner | URL 13/13; Phone 10/10; QR 15/15; payment 4/4 plus a disclosed missing-fields limitation |

One Pytest skip is the deliberately opt-in live external-AI provider test. AI review was disabled;
no paid provider call is claimed. Existing warnings: Starlette/httpx and AnyIO deprecations,
Rollup/Zod pure-annotation notices, and browser runner NO_COLOR/FORCE_COLOR notices. No warnings
were suppressed to obtain a pass. pip check is not a Python vulnerability audit. No fresh clean-machine
install, remote CI, Linux test run or full dependency vulnerability guarantee is claimed.

## Meaningful coverage

Auth/profile tests cover full-name/username/email/password validation, normalized duplicates,
username/email login, wrong login, restore/refresh, logout, cross-tab profile/logout, CSRF/Origin,
expiry/revocation, profile spoofing and account cascade. Reset tests use controlled local mail capture:
generic request response, delivery contract/error handling, URL/token, invalid/expired/single-use,
password replacement, old-password rejection, new login and all-session revocation.

The new all-mode A/B test creates Message, URL, Phone and QR records only in local PostgreSQL.
B cannot list/search/retrieve/delete A's content; detail/delete return 404, dashboard stays empty,
profile owner spoofing is rejected and A remains unchanged. Analyse again can only copy retrieved
owned detail; it is not a separate unprotected server read endpoint. QR needs fresh content.

Existing tests cover Message evidence/recommendations/limits, URL no-fetch and input rejection,
Phone metadata/normalization/conservative risk/no-contact, QR routing/CRC/image validity and bounds,
no/multiple symbols, unsafe schemes, inert output and invalid-upload non-persistence. New privacy
regressions exercise first-field Wi-Fi and payment URL credentials through camera/upload, returned
result, DB storage, history/detail and search. Original-byte CRC evaluation remains unchanged.

Camera coverage includes explicit start, permission failures, actual synthetic-stream decoding,
separate Analyse, no-auto-open, cancel/switch/navigation/hide/unmount, late permission/decoder
races, timeout, stream/worker shutdown and upload fallback. Browser streams are generated canvas
MediaStreams; no physical permission prompt, rear camera or iOS/WebKit acceptance is implied.

## Accessibility, responsive and visual review

Reviewed against relevant accessibility practices, **not WCAG certified**. Existing custom browser
checks exercise keyboard focus, skip link, labels, headings/landmarks, dialog Tab/Escape/focus return,
pending protection, reduced motion and theme contrast tokens (selected text >=4.5:1 and controls/focus
>=3:1). Source review includes error associations, textual status/aria-live and touch controls.
This is not an exhaustive axe audit, assistive-technology study or guarantee for every color/state.

All requested widths were exercised: 320, 375, 390, 430, 768, 1024, 1366 and 1440 CSS px.
Existing product/camera loops plus the new final-closure suite cover auth, dashboard, Analyse,
four mode forms, scanner, saved results, History/filters, Account and dialogs. Overflow assertions
passed; page/console-error checks in the relevant suites passed. No frontend production code change
was needed for this final pass. Wider-than-1440 or every browser/zoom/font combination is not claimed.

Visual inspection sampled newly generated 320px Message result, 1440px QR result, 320px scanner
and desktop deletion dialog. Text wraps and controls remain reachable; long result pages remain
a usability limitation. Captures under ignored frontend/test-results are synthetic local QA.
Full-page captures can place fixed navigation, modal backdrops or a focused skip link at scroll
capture positions; they are not literal document-flow screenshots. Follow SCREENSHOT_CHECKLIST.md
for clean viewport report captures. No screenshot is fabricated or relabelled as physical/production.

## Initial failures and corrections

The first full Pytest run returned 269 passes, one skip and 41 setup errors: new QR records from an
earlier module remained when the disposable migration fixture downgraded to a revision whose
constraint predates QR. The database correctly rejected that downgrade. The already `_test`-guarded
fixture now clears test rows before downgrade; the complete rerun passed 310/1. Production migration
logic and data were untouched. This was fixed rather than skipped or hidden.

Evaluation-runner authoring initially assumed the wrong Message class order and malformed TLV
fixture length. They were corrected to the frozen report's class order and an actually invalid
length; the final runner asserts the original matrices/expectations. No model, split, evidence rule
or risk policy was tuned. Final raw JSON records the successful run and the payment-fields limitation.

## Production, manual and not-performed evidence

PRODUCTION: fresh Task 9 GET health/ready/capabilities through Vercel and directly on Render all
returned 200. Same-day Task 8 closure provider UI recorded Vercel Ready, Render Live/main/On Commit
at starting main, and Neon head via SELECT. Public route/401/asset checks are separately dated in
PRODUCTION_ACCEPTANCE.md. Task 9 code is not production code until owner merge/deploy.

MANUAL OWNER REPORT: Task 8 passed manual acceptance; Task 9 reply was “its working.” This records
generic acceptance, with no device/version/date/case artifact supplied. Agent screenshot inspection
is local visual QA, not a volunteer study.

NOT PERFORMED: physical iPhone/Android/webcam acceptance, reset inbox delivery by this review,
volunteer study, screen-reader audit, independent pentest, backup restore, load/soak/uptime, final
presentation rehearsal. The usability plan and blank results template are ready; no results invented.

## Reproduction and retained evidence

Use the commands in TESTING.md with private disposable DB URLs. For Alembic checks, set DATABASE_URL
to the intended local test DB explicitly; TEST_DATABASE_URL alone does not select Alembic's target.
The browser configuration provisions only a suffix-guarded `_e2e` database. Never print credentials
or use these destructive fixtures against development or Neon. Database-dependent suites were run
separately to avoid simultaneous reset of their own database.

Machine-readable evidence: [evaluation](evidence/final_evaluation.json),
[npm audit](evidence/npm_audit.json), [package inspection](evidence/package_inspection.json),
[secret-scan snapshot](evidence/secret_scan.json). Ordinary raw execution logs remain ignored in .tmp
and screenshots in frontend/test-results; rerunning commands produces new local evidence. The
secret scanner checks common key patterns and known local private values without printing them,
and scans unique eligible reachable historical blobs. It excludes corpora/model arrays/locks/media
and its generated report; production secret values were never retrieved. Zero findings is bounded
hygiene evidence, not proof that every possible secret is absent.

Git whitespace review permits publisher CR at end of line only for the restored raw Message CSV
via its explicit .gitattributes entry; other files retain normal checks. Its normalized bytes were
compared to starting main and are identical. The original publisher checksum is preserved.
