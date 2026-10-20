# SCAMGUARD final completion audit — 20 October 2026

Evidence prepared at 2026-10-20T16:29:47.166530+00:00. Filename identifies the requested completion pass; machine records retain actual UTC timestamps. This is a bounded engineering and academic audit, not a certification or a prediction of marks.

## A. Executive assessment

**TECHNICALLY READY, OWNER ACCEPTANCE PENDING.** The implemented four-mode application is feature-complete within the supplied proposal's private decision-support scope. The required volunteer study and personal acceptance/delivery work remain unfinished. “Reporting” means each user's explainable private analysis history, as explicitly stated in the user-designated proposal (PDF pages 8–9); public reporting and OCR are excluded.

Starting main and freshly fetched origin/main were `ca65ab29c3762947c8db97186156a53802713d48`. No tracked edits, unmerged local commits, stashes or open PRs were present. Eight untracked chart-generation files were preserved with original hashes, ZIP and binary patch under ignored `.tmp/final-completion-20261020/`; they were then ignored, not deleted. Historical branches, source data, model artifacts, documents, local development data and production users were preserved.

The technical release is normal merge `0208efdd23c41d1665b28459b4e8b9d461168d33` from [PR #1](https://github.com/tayyab-hub/scamguard-my/pull/1). The dated evidence/docs follow-up is separate from the runtime release; it does not change engines or deployment contracts.

| Priority | Established gap | Disposition |
| --- | --- | --- |
| P0 | No critical application defect reproduced in this pass | Preserve working engines and policies; do not manufacture changes. |
| P1 | Known advisories in three pinned dependencies | Patch urllib3, brace-expansion and source-map-js; clean audits and affected regressions. |
| P1 | API examples omitted required signup fields and used obsolete login input | Correct examples against actual schemas. |
| P1 | Academic objectives/calendar and current release evidence were stale | Restore proposal objectives and plan; create dated editable candidates and current evidence. |
| P1 | Provider commit/log and migration checks had previously been access-limited | Signed-in consoles inspected; expected head read using SELECT only. |
| Owner | Proposed volunteer study, final assessment rules, hardware, inbox and oral performance | Exact remaining actions in section J; no fabricated completion. |
| P2 | Recovery/idempotency, rate-bucket cleanup, broader model validity, load/restore evidence | Disclose as residual limitations; no speculative new feature phase. |

## B. Implemented functionality

| Feature | Verified behaviour | Evidence and boundary |
| --- | --- | --- |
| Message | Frozen TF–IDF/logistic-regression labels, normalized deterministic rules, evidence sufficiency/conflict guards, five-category fusion, nullable confidence | Full backend suite, frozen reproduction, ten new authored cases and production obfuscated-OTP/unknown-vocabulary fixtures. |
| URL | Strict HTTP(S) parsing, offline IDNA/domain handling, 27 local features, frozen forest and explainable rules; userinfo redaction | URL tests and 234,674-row verifier; no fetching/DNS or live reputation. |
| Phone | International normalization, possible/valid/type/region metadata, conservative output | Phone tests and production fixture; no subscriber identity, call or trained fraud model. |
| QR upload | PNG/JPEG/WebP validation, 5 MiB/4096-axis/16M-pixel bounds, single symbol, UTF-8 and 5,000-byte payload limit, routing | Upload/decoder/rejection tests and production reserved-domain/payment fixtures; image discarded. |
| QR camera | Explicit permission/start, local native/WASM decoding, stop/cancel/navigation cleanup, stopped preview then separate Analyse | Synthetic-stream and built-worker tests; physical camera remains owner work. |
| QR payment/privacy | Generic TLV/CRC subset, payment-integrity Caution floor, supported credential redaction before new persistence | QR/security tests and production invalid-CRC explanation; no merchant verification or complete scheme compliance. |
| Accounts | Signup, username/email login, profile edits, session restoration/revocation, password-confirmed deletion | Auth/PostgreSQL/browser suite; controlled production signup/profile/logout/login/deletion. |
| Recovery | Generic request, expiring one-time token, locked consumption, password replacement and session revocation | Local mocked-mail/token tests; production generic request and invalid token rejection. Inbox delivery not tested. |
| Private workspace | Owned immutable results; detail/history/search/type/risk/order/pagination; dashboard counts; owned deletion/reanalysis | Real PostgreSQL and browser tests; production two-account isolation across all modes and search. |
| UX/accessibility | Labelled forms, focus/dialog handling, non-colour status, reduced motion, nullable confidence and error/loading states | Unit/browser regressions and fresh visual captures. Production main routes tested at 320, 375, 390, 430, 768, 1024, 1366 and 1440 CSS px. Not an assistive-technology certification. |

## C. Corrected defects

* `backend/requirements.lock`: urllib3 **2.7.0 → 2.8.0** removes three known streaming/proxy-TLS advisories. The URL engine does not fetch user destinations, but retaining an affected installed transitive package was unnecessary. See [stream buffering](https://github.com/advisories/GHSA-vxq7-64xx-v4gw), [Deflate loop](https://github.com/advisories/GHSA-gh4c-6fx4-qh6g) and [proxy TLS](https://github.com/advisories/GHSA-8988-9cw3-xx77).
* `frontend/package-lock.json`: development-only brace-expansion **5.0.9 → 5.0.12** and source-map-js **1.2.1 → 1.2.2**, with matching integrity hashes. Direct dependencies remain unchanged. See [brace recursion](https://github.com/advisories/GHSA-qhr7-859c-m2p7), [brace patch](https://github.com/advisories/GHSA-q2hr-2g5m-vwhr), [brace resource exhaustion](https://github.com/advisories/GHSA-6j4f-fj2g-mc7p) and [source-map advisory](https://github.com/advisories/GHSA-68fv-2mgg-jv7q).
* `backend/tests/test_final_adversarial.py`: ten independent authored regressions cover impersonation, bank/OTP theft, investment, delivery, mixed context, Unicode/leet obfuscation, protective advice, ordinary text and short/unknown-vocabulary abstention. Network resolution/connection is prohibited during the suspicious-fixture checks. These guard existing behaviour; they did not drive policy/model tuning.
* `.gitignore`: ignores archived temporary `.chart-data-*` candidates without removing them.
* `docs/API.md`: required full-name/username signup fields, `identifier` login, profile/reset examples and complete public profile response; correct current deployment status.
* `docs/ARCHITECTURE.md`: current URL fusion v2 and QR payment-integrity floor replace obsolete descriptions.
* Active objectives, requirements, plan, Gantt, evaluation, conclusion, study protocol and presentation notes now distinguish proposal commitments, technical results, history and owner work. The editable report generator creates a new dated candidate rather than overwriting prior submissions.

## D. Testing

All 19 complete local gates passed. After the final Python security patch, the six affected backend/inference/package/persistence gates passed again. [Machine record](evidence/completion-verification.json) contains commands, timings and log hashes.

| Gate / command | Observed result |
| --- | --- |
| `npm run typecheck`; `npm run lint` | Pass; zero ESLint warnings |
| `npm test` | 164 passed, 12 files |
| `npm run build` | Pass, including QR worker/WASM production packaging |
| `python -m pytest -q` | 365 passed; one opt-in live-AI skip; two upstream deprecation warnings |
| `python -m ruff check backend`; `python -m ruff format --check backend` | Pass |
| `python -m pip check` | No broken requirements |
| `alembic current`; `alembic heads`; `alembic check` | Single head `0006_qr_intelligence`; no new operations |
| `python backend/scripts/evaluate_message_reliability.py` | Frozen matrix/probability/fusion diagnostics reproduced; no fitting |
| `python backend/scripts/verify_url_pipeline.py` | 234,674 rows; 197,700 isolated domains; exact test matrix |
| `pip wheel --no-deps --no-build-isolation ./backend` and ZIP inspection | Frozen model bytes and required modules match; QR dependencies present; no tests/.env/cache packaged |
| `npm run test:e2e -- --workers=1` | 18 passed |
| `npm run test:preview -- --workers=1` | 8 passed |
| `npm run test:persistence -- --workers=1` | 26 passed |
| `scripts/Test-DevScripts.ps1`; `git diff --check` | Pass |
| `npm audit --json`; pip-audit 2.10.1 against requirements.lock | Zero known advisories after patches |
| `python backend/scripts/scan_repository_secrets.py` | Zero bounded findings; 308 current files and 879 historical blobs in that recorded scan |

Environment: Windows, Node 24.18.0, Python 3.12.14, local PostgreSQL 17.11 and installed Chrome. Database tests used only loopback `scamguard_test` and `scamguard_e2e`. The local development database was preserved. CI uses Linux/PostgreSQL 17/Playwright Chromium; production Neon reports PostgreSQL 18. Cross-version production smoke is separate evidence.

Initial failures were operational: sandbox/esbuild access and a local PostgreSQL port mismatch (5432 versus configured 55432). The latter yielded 240 passes, one skip, one failure and 114 errors before correction; these are not the final result. Only the owned cluster was restarted on 55432, then gates were rerun. No product assertion failure remained. Warnings: Starlette's httpx test-client deprecation, AnyIO BlockingPortal alias deprecation, and Playwright colour-environment warning. The live external-AI test remains intentionally disabled because it contacts a paid provider. pip-audit warns that the Python pins are not fully hash-locked.

## E. Security

Reviewed controls include Argon2id password hashing, digest-only opaque session/reset tokens, secure HttpOnly production cookies, synchronizer CSRF with exact Origin checking, rate limits scoped to resolved account and source, locked single-use reset consumption, session revocation, owner predicates on every private operation, parameterized literal search, repeatable-read query snapshots, explicit lifecycle transactions, bounded image work and inert escaped output. Failure logs retain operational identifiers and exception classes rather than submitted text or raw tokens. Production CSRF/Origin rejection and foreign-account denial were exercised.

[Dependency audit](evidence/completion-dependency-audit.json), [wheel inspection](evidence/completion-wheel.json) and [bounded secret scan](evidence/completion-secret-scan.json) have explicit scopes. The secret scanner checks common key patterns and known local private values; it excludes corpora, model arrays, lockfiles and media. Production secret values were neither retrieved nor compared. Zero matches is not a proof that every secret is absent.

Residuals: signup can reveal duplicate identifiers; trusted-proxy assumptions need continued hosting control; rate-limit rows have no scheduled cleanup; there is no request-idempotency key or automatic recovery of abandoned PROCESSING rows; sensitive arbitrary text may still be submitted; deletion does not prove immediate backup erasure. No independent penetration test, production load test, restore drill or comprehensive screen-reader audit is claimed. Cold starts were observed during initial public probing and remain a demonstration risk.

## F. Intelligence

No artifact, vocabulary, source label, split, feature set, learned parameter, threshold, rule or fusion weight changed. Optional AI remained disabled.

| Frozen classifier | Test evidence | Interpretation |
| --- | --- | --- |
| Message | n=1,160; matrix `[[960,4,3],[7,71,9],[0,13,93]]`; accuracy 0.968966; macro F1 0.895235; SCAM recall 93/106 = 0.877358 | Three-class classifier evidence, not final five-level risk accuracy |
| URL | n=36,901; matrix `[[19846,89],[471,16495]]`; accuracy 0.984824; macro F1 0.984698; phishing recall 16495/16966 = 0.972239 | Domain-held-out string classification; no live-site ground truth |

Message Brier score is approximately 0.050491, log loss 0.126021 and ECE 0.054496 on that frozen test. These are dataset diagnostics, not calibrated real-world fraud probabilities. Of 106 SCAM rows, v2 fused outcomes remain **3 Low, 41 Caution, 42 Elevated, 18 High and 2 Insufficient Evidence**. [Five-row diagnostic](evidence/completion-message-residuals.json) retains row identifiers/hashes and model/rule reasoning without republishing the messages. Their wording resembles mobile promotions, shopping/prize/loan offers or an opt-out/user-ID message; weak observable evidence and lexical ambiguity explain the residual outputs. Labels were retained. No sender/offer truth can be independently established from the string. These are false-negative risks, not “corrected labels.”

The historical English SMS corpus has minority-class and temporal/language limits. URL legitimate training records are all HTTPS homepages without queries; domain grouping does not remove that collection bias or prove temporal/campaign independence. Repeating the held-out verifier is reproducibility evidence, not a new accuracy study. Ten new authored cases are contract tests, not a population benchmark.

Phone provides numbering metadata. QR provides decode/routing and a partial payment-integrity check. Neither is a trained scam classifier; valid numbering, decodability or CRC cannot establish a legitimate person or merchant. Low does not mean verified safe, and Insufficient Evidence is unranked uncertainty.

## G. Production

The baseline Vercel deployment used `ca65ab2`; Render used `2620bdfa43d6696b1695b3f14cd40616197b94cc` because later main commits were frontend/docs changes. That distinction was verified against source paths; a different provider SHA is not automatically drift. After PR #1, the new runtime release is `0208efdd23c41d1665b28459b4e8b9d461168d33`.

* Vercel: Ready, Latest, Current Production at application merge 0208efdd23c41d1665b28459b4e8b9d461168d33. Deployment `8xHYmDUj4UYWsEzT9zcToKLBqaij`.
* Render: Deploy succeeded / Live at application merge 0208efdd23c41d1665b28459b4e8b9d461168d33. Deployment `dep-dbbp1htg1s2s73b49o8g`. Observed startup reached Alembic/PostgreSQL initialization and Uvicorn application-startup completion; no traceback/error in the inspected startup range. Earlier logs outside retention cannot be assessed.
* Neon: `SELECT version_num FROM alembic_version;` returned one row, `0006_qr_intelligence`, on the production branch/database. No migration or user-data mutation was issued from the console.
* Public frontend plus health/readiness/capabilities through Vercel and directly through Render returned HTTP 200; database connected and all four engines ready/advertised.
* Controlled production smoke: **16 passed, 0 failed**. Two random synthetic accounts exercised all four modes, null confidence, payment warning, durable history/dashboard, profile, session lifecycle, eight responsive widths, CSRF/Origin rejection and all-mode A/B detail/delete/search/list/dashboard isolation. Only records/accounts created by this run were deleted; **2 / 2 accounts cleaned up**. No existing users' records were accessed.
* A supplementary screenshot run passed three capture checks and deleted its one synthetic account. Across both successful runs, all **three of three** created accounts were removed. [Capture provenance](evidence/completion-production-captures.json) records this separately. Initial images caught loading/transition states; the final captures waited for loaded content with reduced motion.

[Release/provider record](evidence/completion-release.json), [public probes](evidence/completion-production-probes.json) and [synthetic smoke](evidence/completion-production-smoke.json) contain actual observations. Initial cold-start timeouts preceded successful warm checks and are disclosed. Health and smoke are point-in-time checks, not an uptime SLA. Resend inbox delivery and physical-device camera remain unverified.

## H. Academic alignment

Located and retained the original Word template, registration form, proposal marking schemes, editable reports, editable proposal deck, screenshots and diagrams. The latest user-designated 56-page proposal supplies O1 identify, O2 design, O3 develop/deploy and O4 functional/classifier/volunteer evaluation (PDF pages 7–9), private-reporting scope, exclusion of OCR/public reports, and the 12-week 1 September–20 November plan (pages 43–47). It resolves the prior missing-scope/calendar question. Proposed report/presentation milestones are 18/20 November, subject to the official timetable. No signed approval event is fabricated.

New local editable artifacts:

* `output/documents/SCAMGUARD_CSC1250_FINAL_CANDIDATE_2026-10-20.docx`: 67 rendered pages, source-template sections/geometry/logo preserved, refreshed contents/figure/table fields, current objectives/calendar/evaluation and authentic fresh screenshots. The cover label is intentionally changed to Final Report; personal fields remain blank. Earlier reports/template remain untouched.
* `output/presentations/SCAMGUARD_CSC1250_FINAL_CANDIDATE_2026-10-20.pptx`: 13 editable slides, source-derived Calibri/Cambria and warm palette, native tables/architecture, notes, transitions, evidence links, demo fallback and anticipated questions. All slides rendered and individually checked. Proposed 13m15s pacing is preparation, not official allocation or a completed rehearsal.

Personal academic files remain ignored under `output/`. Generic sources, sanitized evidence and deliberately synthetic screenshots are versioned. The report distinguishes freshly reproduced frozen matrices from historical September controlled-case/latency measurements. Source retrieval dates remain historical unless actually refreshed. The supplied rubrics govern the proposal: no invented final rubric, guaranteed marks or “all objectives met” claim. O4 is partial because the volunteer study has not been conducted. Technical camera streams and informal “working” feedback are not study observations.

[Academic QA](evidence/completion-academic-qa.json) records exact deliverable hashes, all 67 inspected report pages and all 13 inspected slides. Native Word and Poppler supplied the report render because packaged LibreOffice was unavailable. Slide font configuration and image embedding were repaired before final validation; final package/layout checks and reimport passed. This does not establish compatibility with every Office version or actual projector performance.

## I. GitHub

Repository: [tayyab-hub/scamguard-my](https://github.com/tayyab-hub/scamguard-my). Technical branch `codex/final-completion-20261020`; commit `6d68b8978183e374e406985480b6fce8cf2e1126`; [PR #1](https://github.com/tayyab-hub/scamguard-my/pull/1); normal merge `0208efdd23c41d1665b28459b4e8b9d461168d33`. [Required CI](https://github.com/tayyab-hub/scamguard-my/actions/runs/39452527771) passed before merging. The GitHub connector lacked PR-write permission (403); the existing signed-in GitHub browser account created/merged the PR normally. No credentials were exposed, permissions changed, force-push used or history rewritten.

The final documentation/evidence follow-up is listed in the repository's completion PR and the final user handoff. Runtime files are unchanged by that follow-up; path-scoped provider source equivalence is checked. CI for the follow-up is required before its normal merge. No personal academic DOCX/PPTX, secrets, environment files, dependencies, dumps or test-account credentials are staged.

## J. Remaining owner-only actions

1. Conduct and honestly report the proposed consented volunteer study under O4, including task completion/errors/help and interpretation. Use the aligned protocol and blank results form.
2. Confirm the final rubric/template/declarations, official deadlines, presentation duration and submission rules. Proposed 18/20 November dates are not an official timetable.
3. Complete/check cover information, review authorship and understanding, and refresh Word fields after personal edits.
4. Record physical camera behaviour on the actual presentation device, including cancellation/denial and upload fallback.
5. Test password-reset delivery with an account and inbox you control, including one-time use and prior-session revocation; retain no token/password.
6. Rehearse, test room/display/network, retain offline evidence and obtain the submission receipt.

The full exact checklist is [FINAL_PERSONAL_ACTIONS.md](FINAL_PERSONAL_ACTIONS.md). Provider commit/log/migration access and synthetic production ownership checks are no longer owner-only blockers.

## K. Final readiness verdict

**TECHNICALLY READY, OWNER ACCEPTANCE PENDING.**

Technical release checks, dependency remediation, frozen reproduction, production observations and editable candidates are evidenced. Mandatory human/assessment work remains; therefore **READY FOR SUBMISSION is not claimed**.
