# SCAMGUARD — current project state

Updated **2026-09-10, Asia/Kuala_Lumpur** for Task 7 implementation verification.

## Current milestone

Tasks 1–6.1 are complete. Task 6.1 was merged normally into `main` and pushed at
`546447fa02072f0a87a5fae90c9f8f8f57aafa07`; its branch remains preserved. The user-verified
production architecture remains Vercel → same-origin `/api/v1` rewrite → Render → Neon PostgreSQL.

**Task 7 QR Intelligence is implemented and fully locally verified on
`task-7-qr-intelligence`, awaiting manual acceptance before merge or deployment.** Task 8 final
integration/reporting has not started.

| Area | Status | Current behavior |
| --- | --- | --- |
| Tasks 1–5 | COMPLETE | Foundation, persistence/intelligence, authentication, ownership and production architecture. |
| Task 6 Phone Intelligence | COMPLETE | Accepted, merged and preserved. |
| Task 6.1 Auth/profile polish | COMPLETE | Accepted and merged; profiles, username login, password reset and immutable Analyse again. |
| Task 7 QR Intelligence | IN REVIEW | Bounded upload/decoding, payload routing, private persistence and full local verification complete. |
| Task 8 final integration/reporting | NOT STARTED | No implementation or reporting work begun. |

## Task 7 implementation

- `POST /api/v1/analyses/qr` accepts exactly one authenticated PNG/JPEG/WebP multipart upload while
  retaining opaque server sessions, exact Origin + CSRF, PostgreSQL analysis rate limiting and
  backend-derived ownership. The generic JSON analysis route remains unchanged for Message/URL/Phone.
- Pinned `zxing-cpp==3.1.1`, `Pillow==12.3.0` and `python-multipart==0.0.32` provide local decoding,
  bounded raster validation and multipart parsing. No decoder API, OS package, OCR or network access
  is used.
- Backend limits are 5 MiB, 4096 pixels per axis, 16 million decoded pixels, one still image, one QR
  symbol and 5,000 UTF-8 payload bytes. SVG, MIME/content mismatch, corrupt/disguised/animated files,
  bombs, empty/no/multiple QR and unsupported controls fail safely before persistence.
- Payloads classify as URL, PHONE, TEXT, EMAIL, SMS, WIFI, GEO, PAYMENT or OTHER. Supported HTTP(S),
  phone and suitable text reuse the unchanged intelligence engines and inherit their exact risk,
  score, confidence, evidence and actions. QR contributes no independent severity.
- EMV-style payment TLV/CRC validation is bounded and conservative. A valid structure remains
  insufficient evidence; invalid structure/CRC is at most caution. Formatting never verifies the
  merchant, recipient, ownership, legitimacy or transaction safety.
- The image is decoded in memory and discarded. Private history retains decoded content and derived
  assessment/audit metadata, not the image. URL credentials and Wi-Fi passwords are redacted before
  storage; phones use E.164. QR history requires a new upload rather than Analyse again.
- The responsive frontend now supports click/drag/drop, mobile capture hint, preview/remove/replace,
  decode progress/errors, escaped inert decoded content, payment limitations, subtype history and
  dashboard counts without redesigning the approved Forensic Intelligence UI.
- Readiness verifies QR decoder initialization, capabilities advertises QR, and Alembic
  `0006_qr_intelligence` extends only analysis constraints while preserving Task 6.1 data.

See [QR Intelligence](docs/QR_INTELLIGENCE.md) for the method, privacy boundary and limitations.

## Verification evidence

| Check | Observed result |
| --- | --- |
| Backend Pytest with real PostgreSQL | PASS: 283 passed; 1 explicitly opt-in live-AI test skipped; 2 existing dependency deprecation warnings. |
| QR unit/API/security/persistence | PASS: raster and payload validation, classifications/routes, EMV/CRC, no severity inflation, no-network behavior, auth/CSRF, owner isolation, redaction, deletion and invalid-upload non-persistence. |
| Ruff / dependency check | PASS: lint, format check and `pip check`; 67 Python files formatted. |
| TypeScript / ESLint | PASS / PASS with zero ESLint warnings. |
| Vitest | PASS: 133 tests in 9 files. |
| Production frontend build | PASS: 1,762 modules; JS 478.38 kB (142.17 kB gzip), CSS 43.86 kB (8.93 kB gzip). Existing Zod/Rollup annotation warnings only. |
| Foundation/motion/visual Playwright | PASS: 18 desktop/mobile tests. |
| Built offline preview | PASS: 6 desktop/mobile tests. |
| Real PostgreSQL Playwright | PASS: 12 desktop/mobile tests, including upload → URL route → history/dashboard → refresh and no off-origin request. |
| Alembic | PASS: `0006_qr_intelligence` single head/current/check and isolated `0006 → 0005 → 0006`; full fixture preserves a Task 6.1 user/analysis. |
| Packaging | PASS: wheel contains all QR modules and exact Pillow/python-multipart/zxing-cpp runtime metadata. |
| Secret/diff review | PASS: no private key or credential pattern found; generated/runtime folders remain ignored; `git diff --check` is clean. |

## Known limitations

- QR decoding cannot establish who created/distributed a code or whether its content is legitimate.
- Stylized, damaged, obscured, multi-code, animated, non-raster, non-UTF-8 and oversized inputs are
  intentionally unsupported; no general OCR or screenshot intelligence exists.
- Payment structure and CRC are integrity checks, not bank/account/merchant/reputation validation.
- No decoded link is opened or fetched; no number is contacted; no Wi-Fi or payment action executes.
- Existing Message, URL, Phone, dataset/score and infrastructure limitations remain. Basic database
  rate limiting is not enterprise DDoS protection.
- Provider backup retention/deletion, legal privacy language, incident response and broad-public
  controls remain owner responsibilities.

## Review boundary

Do not merge or deploy Task 7 until the user completes manual acceptance. No Vercel, Render, Neon or
Resend setting was changed. A later approved merge requires ordinary Render dependency install +
Alembic/redeployment and a Vercel rebuild; the existing CDN rewrite must remain unchanged. Do not
begin Task 8.
