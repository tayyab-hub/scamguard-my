# SCAMGUARD — current project state

Updated **2026-09-10, Asia/Kuala_Lumpur** for Task 8 implementation and review.

## Current milestone

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

## Task 8 implementation

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
