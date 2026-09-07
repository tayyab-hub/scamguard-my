# SCAMGUARD — current project state

Updated **2026-09-07, Asia/Kuala_Lumpur** for the post-Task 4 UI/UX refinement.

## Current milestone

**Task 4 URL Intelligence COMPLETE and merged to main at `386e4b7`. Post-Task 4 UI/UX refinement COMPLETE on `codex/ui-ux-result-refinement` for review.**
The UI branch starts at the accepted Task 4 main merge. It contains frontend presentation, regression coverage, documentation and controlled test screenshots only. No backend, API contract, model, fusion, dataset or migration changes were made. Task 5 has not started; no merge to main is authorized for this refinement.

## UI/UX refinement verification

Shared result heroes, labelled score meters, separate confidence, severity-aware evidence, action checklists and collapsible metadata are used by Message/URL submission and history. Paper surfaces, sidebar, headers, metric cards, validation/pending states and keyboard result navigation are refined. Overview accurately reports the API's available Message/URL modes. See [UI/UX refinement](docs/UI_UX_REFINEMENT.md) for exact score derivation and limitations.

| Current check | Observed result |
| --- | --- |
| TypeScript / ESLint | PASS / PASS; zero lint warnings. |
| Vitest | PASS: 73 tests in four files, including score/null/rounding, evidence ordering, unavailable confidence and advertised capabilities. |
| Production build | PASS: 1,753 modules; JS 431.70 kB (129.84 kB gzip), CSS 41.08 kB (8.46 kB gzip). No dependency added. |
| Foundation/motion/visual Playwright | PASS: 18 desktop/mobile tests, including semantic risk-colour contrast. |
| Built offline preview | PASS: six desktop/mobile cases. |
| Real PostgreSQL browser suite | PASS: six desktop/mobile cases covering Message/URL persistence, score presentation, keyboard metadata, real timestamps/IDs, insufficient evidence and live reduced motion. |
| Browser-assisted visual review | PASS: Message, URL, Overview, Help, validation, held-real-response loading, long URL, keyboard metadata and 320px layouts; no console/page errors or off-origin requests. |
| Backend tests | Not rerun: backend and API fields unchanged, as requested. Accepted Task 4 evidence below remains historical. |

Message risk points are the stored fusion score ×100, rounded; URL uses an explicitly labelled ordinal index (Low 0, Caution 33, Elevated 67, High 100), with no within-category precision. Scores are advisory, not scam probabilities or comparable across modalities. Confidence retains its separate existing meaning. Missing evidence remains unscored.

Initial checks caught one outdated exact metadata assertion and a new Help disclosure selector that included a decorative symbol. Assertions were corrected to match the intended rendered content; all affected checks then passed. Screenshot review also caught stale Overview capability copy, which was corrected and covered. Existing non-failing Zod/Rollup and Playwright colour-environment warnings remain. No remote CI/deployment result or human usability study is claimed.

Current screenshots use the `docs/screenshots/ui-refinement-*` prefix and show controlled records from the disposable *_e2e database, not production users or analytics. Temporary manual-review servers are stopped after capture. Keyboard/focus and live reduced-motion behavior passed; 320/390/768/1024/1440 widths are covered by browser checks. These are not a comprehensive accessibility audit or physical-device/Safari validation.

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

## Accepted Task 4 verification (historical)

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

## Current review boundary

Task 4's accepted [report](docs/TASK_4_REPORT.md), [URL methodology](docs/URL_INTELLIGENCE.md), [dataset provenance](docs/URL_DATASETS.md), and [model evaluation](docs/URL_MODEL_EVALUATION.md) remain valid. Stop after committing, pushing and verifying the UI feature branch. Do not merge it, start Task 5, expose the backend publicly or provision cloud services.
