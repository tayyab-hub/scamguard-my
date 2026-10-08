# SCAMGUARD — current project state

## Release pushed; provider inspection partly access-limited — 2026-10-08

The owner authorized GitHub push and deployment and clarified that Phase 2 was planned only.
A recoverable local checkpoint preserves all pre-integration work. No conflicts or new migrations.
Fresh 19-gate verification passed: 355 backend, 164 frontend and 52 browser tests; one live-AI skip.
Frontend compatibility was released first, then the integrated backend. Application release
reference `9034f1b01144a733fe29d2ad33d047bee6083a7e` also fixes the cold Vite camera-worker reload
found in hosted CI; its complete hosted rerun passed 571 tests with one live-AI skip and zero
failures. Vercel deploys successfully; Render serves
v2 results with all four engines ready and database connected. Live smoke: 16 passed, 0 failed;
all four synthetic accounts across both attempts were deleted. Render SHA/startup logs and a
fresh Neon version query need provider sign-in. Current evidence:
[integration record](docs/SCAMGUARD_RELEASE_INTEGRATION.md).
The engineering-review section below describes the earlier local checkpoint.

Updated **2026-10-08, Asia/Kuala_Lumpur** after the user-authorized local engineering review.

## Historical local engineering review checkpoint

Implemented account/source login budgets, replacement-session revocation, safe failure logs,
startup/body-buffer reliability, Message v2 normalization/abstention/conflict guards, URL v2
context neutrality, QR payment-integrity safeguards, evidence-balanced results, contextual actions,
inconclusive-history navigation and late-401/timeout handling. No migration, trained-model,
dependency, secret or hosting change. The schema remains `0006_qr_intelligence` with no drift.

Executed: pytest **355 passed / 1 opt-in live-AI skip**; Vitest **164 passed / 12 files**;
Playwright **52 passed** (18 foundation + 8 built preview + 26 real PostgreSQL). TypeScript,
ESLint, Ruff check/format, pip check, build, wheel and Alembic checks passed. Frozen Message and
URL evaluations reproduced; Message probability diagnostics were measured without retraining.
The policy still returns Low for 3/106 historical SCAM examples; confidence remains uncalibrated.
Online npm audit was blocked by automatic approval review for registry metadata egress.

Changes are uncommitted and undeployed. Existing academic work is preserved. Release frontend
before backend because new Message abstentions may have null confidence. Full findings, exact
academic deltas and evidence: [engineering review](docs/ENGINEERING_REVIEW_2026-10-08.md).

The following September sections are historical release/academic records.

## September release and academic closure

Task 9 was accepted and normally merged without conflicts. Final main and both deployed providers:
`4df277bdf93a2e1424ac533d488cd7ba127b35ce`. Vercel Ready, Render Live, database connected,
head `0006_qr_intelligence`, and all four public capabilities were recorded.
The first-field Wi-Fi and embedded payment URL credential-redaction fixes are in this release.
See `docs/FINAL_RELEASE.md` for exact checks and dated observations. No Neon mutation was performed.
The academic pass prepares the supplied Word template, rubric matrices, evidence and defence notes.
No application changes, new stage, commit, push or deployment are part of the academic pass.

The following details describe Task 9 implementation and its earlier branch verification.
Raw Message CSV publisher bytes restored from the verified archive, with a -text attribute;
normalized content and frozen models unchanged. The disposable migration fixture now clears old
QR test rows before its pre-QR downgrade. No production migration or infrastructure change.

Final verification: TypeScript/ESLint PASS; Vitest 159/11 files; Pytest 310 passed, one opt-in live AI
skip, two dependency warnings; Playwright 18 foundation + 8 built preview + 24 real PostgreSQL = 50;
Ruff check/format PASS (71 files); pip check PASS; Alembic current/heads/check PASS; production build
and wheel PASS. See `docs/FINAL_TEST_REPORT.md` for scan, package, accessibility and scope details.
All eight required widths (320/375/390/430/768/1024/1366/1440) exercised; camera streams are synthetic.

Message's frozen 1,160-test matrix reproduced (accuracy .968966, macro F1 .895235); URL's 36,901-test
matrix reproduced (accuracy .984824, macro F1 .984698). Controlled URL 13/13, Phone 10/10, QR 15/15,
payment 4/4 behavior checks passed. A separate missing-payment-fields case documents incomplete
standard validation. These are not live fraud accuracy or full EMV compliance results.

Documentation index: `docs/INDEX.md`; includes requirements, architecture/data/database, security,
evaluation, tests, limitations/future work, report guide, presentation/demo/Q&A, screenshot checklist,
production acceptance and strict examiner review. Subjective readiness: 78/100, not an academic grade.
The owner says "its working": generic functional acceptance only. Device/date/evidence unspecified;
volunteer usability is NOT YET CONDUCTED. Report/deck authorship, device/mail evidence, study and
rehearsal remain owner actions. No production accounts or messages were created/sent by this review.

The following Task 8 record is historical and superseded by the current closure above.

## Historical Task 8 milestone (2026-09-10)

Tasks 1–7, including Task 6.1, are complete, accepted, merged and deployed as confirmed by the user.
The stable production architecture is Vercel → same-origin `/api/v1` rewrite → Render → Neon.
The user also confirmed Render's old backend branch was corrected and reset-mail configuration
completed. Task 8 changes no provider configuration or secrets.

**Task 8 Peak Enhancement is implemented and locally verified on `task-8-peak-enhancement`, for
manual review before merge or deployment. Task 9 Final Integration is NOT STARTED.**

Starting main/origin-main: `42a9db1e1d29ef0c05c248a416f6b90ac341d256`, clean after fetch.
The completion commit/push belongs only to the Task 8 feature branch.

| Task | Status |
| --- | --- |
| 1 Foundation | COMPLETE |
| 2 Core Platform | COMPLETE |
| 3 Message Intelligence | COMPLETE |
| 4 URL Intelligence | COMPLETE |
| 5 Authentication / Production | COMPLETE |
| 6 Phone Intelligence | COMPLETE |
| 6.1 Authentication / Profile | COMPLETE |
| 7 QR Intelligence | COMPLETE |
| 8 Peak Enhancement | IMPLEMENTED / MANUAL REVIEW |
| 9 Final Integration / Evaluation / Closure | NOT STARTED |

## Historical Task 8 implementation

- Explicit live QR camera: Start → native QR detector or locally packaged WASM worker → capture
  stops → inert decoded text preview → explicit Analyse. Cancel, navigation, hiding, unmount,
  timeout and delayed permission/decoder races release tracks/worker/timers. Upload remains.
- Authenticated `POST /analyses/qr/payload` validates bounded text and reuses unchanged QR
  classification/routing/redaction/ownership/rate controls. CAMERA provenance is client-reported;
  image metadata is null. No image, recording, decoded URL fetch or external QR service.
- First-class History with private server-side content/summary search, type/risk filters,
  newest/oldest/risk sort and 10-record pages. SQL selects summaries only; count/page reads stay
  consistent. Dashboard uses real scoped type/risk counts and labelled filter links.
- Stable per-session CSRF prevents tab restoration breaking existing forms. Private queries are
  user-scoped, caches clear on identity changes, tab messages carry no content, late identity
  responses are ignored, and failed logout reports unconfirmed revocation.
- Native confirmation dialogs with inert background, explicit Tab wrapping, safe initial focus,
  Escape/pending behavior and focus return. Mode examples, repeat-analysis action, visible risk
  guidance/limitations, focused form errors, profile dirty feedback and recovery actions improve UX.
- Existing Forensic Intelligence identity and restrained CSS motion retained; scanner/dialog/detected
  states added with live reduced-motion support. Mobile inputs avoid focus zoom. Lazy route chunks
  keep initial JS below the previous raw size despite new features.

## Verification evidence

| Check | Observed result |
| --- | --- |
| TypeScript / ESLint | PASS / PASS, zero ESLint warnings |
| Vitest | PASS: 159 tests across 11 files |
| Backend Pytest, isolated real PostgreSQL | PASS: 300 passed, 1 opt-in live-provider test skipped; 2 existing dependency deprecation warnings |
| Ruff / format / pip check | PASS; 68 Python files formatted; no broken requirements |
| Alembic | PASS: current and single head `0006_qr_intelligence`; no new upgrade operations. Existing disposable migration regression also passes. No Task 8 migration |
| Foundation/keyboard/motion/contrast/responsive Playwright | PASS: 18 desktop/mobile tests |
| Built offline-preview Playwright | PASS: 8 desktop/mobile tests, including real packaged worker/WASM loading |
| Real PostgreSQL Playwright | PASS: full 20 desktop/mobile scenarios; 14 relevant scenarios repeated successfully for final visual captures |
| Production build | PASS: 1,769 modules; initial JS 476.16 kB / 143.08 kB gzip; CSS 46.96 / 9.52 kB gzip. No chunk-size warning; decoder license notices included |
| Deferred camera assets | Worker 36.25 kB; WASM 1,093.29 kB / 460.98 kB gzip; neither loaded before fallback is needed |
| npm runtime audit | PASS: zero reported vulnerabilities |
| Secret/diff review | Changed/new files checked for private local environment values and credential patterns without printing values; zero findings. Runtime/test artifacts remain ignored |

Build warnings are the existing Zod/Rollup pure-annotation notices. Browser runners emit the existing
NO_COLOR/FORCE_COLOR warning. Initial outdated copy/navigation assertions were reconciled with
intentional behavior; a real modal Tab-wrap issue was fixed and verified. Foundation output now has
its own folder, preventing it from deleting other suites' review artifacts.

See [Task 8 audit, decisions and full acceptance instructions](docs/TASK_8_PEAK_ENHANCEMENT.md),
[Testing](docs/TESTING.md), [API](docs/API.md), and [Privacy](docs/PRIVACY_MODEL.md).

## Review boundary and limitations

Physical iPhone Safari, Android Chrome and Edge camera acceptance remains required; Chromium
emulation and synthetic MediaStreams do not establish hardware/browser compatibility. Hosted Task 8
frontend/API pairing and production verification have not been performed. QR provenance does not
verify who created a code, payment CRC does not verify a recipient, and the intelligence engines
retain their original dataset, calibration and offline-evidence limitations.

Long result/history pages, small secondary metadata, capstone-scale substring/offset queries, basic
rate limiting, provider backup retention and formal privacy/security/accessibility review remain
limitations. A 1.09 MB raw fallback reader can be noticeable on a slow first scan.

**Do not merge, deploy, change provider settings or start Task 9 without further user instructions.**
