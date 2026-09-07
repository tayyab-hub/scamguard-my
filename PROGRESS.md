# SCAMGUARD — current project state

Updated **2026-09-07, Asia/Kuala_Lumpur** for Task 4 URL Intelligence verification.

## Current milestone

**Task 3 COMPLETE and merged to main. Task 4 URL Intelligence COMPLETE on its review branch.**
Main was verified against GitHub at `7625a6f54b904532d5cd0273139d429ab1aadcb6` before work. The initially clean checkout was updated with `pull --ff-only`; `task-4-url-intelligence` was created and its upstream pushed. Task 4 must not be merged automatically. Task 5 has not started.

## Implemented capabilities

| Area | Status | Current behavior |
| --- | --- | --- |
| Task 1 Foundation | COMPLETE | Forensic Intelligence UI, responsiveness, keyboard/reduced-motion access, offline resilience and development launchers. |
| Task 2 Core Platform | COMPLETE | Real PostgreSQL intake/history/dashboard, safe API validation/errors and private shared-workspace boundary. |
| Task 3 Message Intelligence | COMPLETE | Existing local three-class model, evidence, conservative fusion, optional disabled contextual AI and persisted explainable results. Message domain and artifact unchanged. |
| Task 4 URL Intelligence | COMPLETE | Strict HTTP(S)/IDNA/offline PSL parsing, trained local forest, explainable evidence, deterministic conservative fusion and persisted results without accessing destinations. |
| URL dataset and evaluation | COMPLETE | UCI PhiUSIIL CC BY 4.0, checked source, normalization/dedup/conflict handling before domain grouping, fixed splits, three candidate comparisons, export reproduction and genuine held-out metrics. |
| Optional URL reputation architecture | COMPLETE | Validated injectable protocol and mocks. Disabled by default, no real adapter/key/provider request. |
| URL UI and Help | COMPLETE | Evidence/actions/risk/status/details/history, truthful no-fetch and HTTPS guidance, loading/failure handling and 320px browser coverage. |
| Phone Intelligence (Task 5) | NOT STARTED | Draft-only unavailable state retained. |
| QR/Screenshot Intelligence | NOT STARTED | Local file metadata only; no decode/upload/camera/content analysis. |
| Auth/community/adaptive/campaign/extensions | NOT STARTED | No new implementation. |
| Production/public backend | NOT READY | The unauthenticated shared backend must remain private; developer launchers are not production hosting. |

## Verified checks

| Check | Observed result |
| --- | --- |
| Frontend TypeScript / ESLint | PASS / PASS, zero lint warnings. |
| Vitest | PASS: 57 tests, four files. |
| Production frontend build | PASS: 1,751 modules; JS 425.48 kB (127.71 kB gzip), CSS 34.55 kB (7.12 kB gzip). |
| Playwright foundation/motion/visual | PASS: 18 tests. |
| Built offline preview | PASS: six tests. |
| Real PostgreSQL browser flows | PASS: four desktop/mobile Message+URL tests, including URL risk cases and responsive/no-destination-request checks. |
| Ruff | PASS: lint and format checks, 48 Python files. |
| Full Pytest with real PostgreSQL | PASS: 160 tests; one deliberately skipped opt-in live AI test; two existing dependency deprecation warnings. |
| Alembic | PASS: upgrade/current/heads/check at 0002_message_intelligence, no drift. Existing downgrade/re-upgrade passed only on disposable *_test DB. No Task 4 migration needed. |
| Dependency consistency / packaging | PASS: pip check; local wheel includes URL artifact with the exact expected checksum. |
| URL preparation/inference verification | PASS: 234,674 unique URLs and 197,700 disjoint domain groups; processed hashes checked; deployed JSON test confusion matrix exactly matches sklearn. |
| URL training reproduction | PASS: --verify recreated exact artifact bytes; confidence parity on 512 validation rows within 1e-12. |
| Browser-assisted manual cases | PASS: synthetic→HIGH, normal→LOW, IP→CAUTION, brand-like subdomain→ELEVATED, redirect→CAUTION, javascript rejected; no console errors or off-origin requests. |
| Actual backend restart persistence | PASS: five prior URL assessments unchanged after process restart, with browser history/reload evidence retained. |

The direct CUA tool could not initialize due a Windows sandbox ACL error; a controlled Playwright browser provided application interaction and screenshots, which were visually inspected. Sandboxed esbuild and PostgreSQL startup required approved host execution. Initial tests exposed the expected new FAQ count and a post-submit field-state defect; both were fixed and the affected suites passed. Existing Zod build annotations, Starlette/AnyIO deprecations and browser color-environment warnings remain, without suppressions.

## Model evidence and limitations

URL model `url_ml_v1` selected a 120-tree depth-12 random forest. Test phishing precision 0.994633, recall 0.972239, F1 0.983308; macro F1 0.984698, weighted F1 0.984810. Confusion matrix in LEGITIMATE/PHISHING order: `[[19846,89],[471,16495]]`. These are source-held-out binary classification metrics, not five-level fusion accuracy or a scam probability.

**Severe collection bias:** all legitimate training URLs are HTTPS homepages with no query. Deep-link false positives and cross-domain campaign overlap remain limitations. ML alone and all weak indicators are capped at Caution; High requires meaningful corroboration or a validated reputation signal. There is no live reputation verification, external current-data validation, general secret anonymization, webpage scanning, public authentication or safety guarantee.

The original Message model remains mainly English historical SMS with the documented class imbalance and calibration limitations. No paid external request was made and no private submission was used for training.

## Review handoff

Read [Task 4 report](docs/TASK_4_REPORT.md), [URL methodology](docs/URL_INTELLIGENCE.md), [dataset provenance](docs/URL_DATASETS.md), [model evaluation](docs/URL_MODEL_EVALUATION.md), and [testing](docs/TESTING.md). Task 4 is ready for manual supervisor-style verification. Stop at this review boundary: do not merge Task 4, begin Phone Intelligence, expose the backend publicly or provision cloud services.
