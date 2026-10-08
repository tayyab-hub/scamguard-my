# SCAMGUARD — final production release closure

Verified 2026-09-12, Asia/Kuala_Lumpur. This is the final release of the accepted Task 9 work;
no new development stage, feature, redesign or intelligence-methodology change was introduced.

## Release identity

- Accepted Task 9: `afabf5cab42da880e91a07e0d46ea202cd94cf9d`.
- Starting main: `4b327ccf21b59e295622e3b321cec62dc523dbde`.
- Task 9 normal merge SHA / final main SHA: `4df277bdf93a2e1424ac533d488cd7ba127b35ce`.
- Merge parents: starting main and the exact accepted Task 9 commit. No conflicts occurred.
- The merged tree exactly matches accepted Task 9. All gates were rerun on this merged main.
- GitHub push: SUCCESS, `4b327cc..4df277b main -> main`; local main matches origin/main, clean.
- Vercel: READY, Production / Current, same complete final SHA, current scamguard-my.vercel.app domain.
  [Deployment](https://vercel.com/tayyab-d919/scamguard-my/99prHFv1YGBv9b5EzpxwuMJdDZ2f), 19-second build.
- Render: Deploy succeeded / LIVE, Auto-Deploy, main, same complete final SHA.
  [Deployment](https://dashboard.render.com/web/srv-dafsk1740ujc73cpn0ng/deploys/dep-dailgknqj5pc73ai1pp0),
  1m28s deployment; build successful and application startup complete.

## Verification on merged main before push

| Gate | Result |
| --- | --- |
| TypeScript | PASS |
| ESLint | PASS, zero warnings |
| Vitest | 159 passed, 11 files |
| Frontend production build | PASS |
| Pytest, isolated local PostgreSQL | 310 passed, one opt-in live AI skip, two existing dependency warnings |
| Ruff lint / format | PASS / PASS; 71 files |
| pip check | No broken requirements |
| Alembic current / heads / check, local test DB | Single head 0006_qr_intelligence; no drift |
| Playwright foundation | 18 passed |
| Playwright built preview | 8 passed |
| Playwright real PostgreSQL | 24 passed |
| Playwright total | 50 passed; Chromium desktop/mobile emulation, not physical-device testing |
| Secret scan | 0 findings; 228 current files / 734 unique historical blobs in the documented bounded scope |
| Git whitespace / clean tree / accepted-tree identity | PASS |

Machine-readable execution record: [verification.json](evidence/release-verification.json).
Each check's local log is named in that record. The runner stops on the first failure; no gate failed.

## Production checks after deployment

Six fresh GETs passed through https://scamguard-my.vercel.app and directly through
https://scamguard-capstone-api.onrender.com on 2026-09-12 at 13:52:55–13:53:02 UTC:

- `/api/v1/health`: HTTP 200, status ok, scamguard-api 0.1.0.
- `/api/v1/ready`: HTTP 200, ready; database connected; Message, URL, Phone and QR ready.
- `/api/v1/capabilities`: HTTP 200; analysis/submission available; MESSAGE/URL/PHONE/QR advertised.

Raw public responses: [production-endpoints.json](evidence/release-production-endpoints.json).

Neon production branch, neondb: ran only `SELECT version_num FROM alembic_version;`.
The result was one row, `0006_qr_intelligence`, observed at approximately 21:55 MYT.
No manual database data, schema, role, branch, configuration or secret modification was performed.

## QR privacy correction deployment

The confirmed live Render commit is the verified merge containing accepted Task 9's
`backend/app/qr_intelligence/engine.py`. It includes first-field Wi-Fi password redaction and
embedded payment HTTP(S) URL-userinfo redaction before saving new records. The local merged-main
suite passed the credential-redaction, upload/camera persistence/history/search and A/B regressions.
Assessment still uses original decoded bytes. No production records were rewritten.

This confirms the fixes are included in the live deployed version. An authenticated production
submission exercising redaction was not performed; it remains part of the owner's manual QR check.
No production accounts or reset emails were created/sent during this closure.

## Remaining manual production acceptance

Use owner-controlled accounts and synthetic examples. Record browser/device, date and release SHA.
Never display real credentials or reset tokens, open fixture URLs, call fixture numbers or pay.

1. Authentication: signup if needed; username/email login; refresh; wrong-password response; logout;
   protected-route redirect and cross-tab logout behavior.
2. Message: submit benign/scam-like/short fixtures; inspect risk, evidence and limitations; confirm
   the saved result after refresh. Risk is advisory, not a fraud probability.
3. URL: submit conventional and suspicious-structure fixtures; inspect evidence and saved result;
   confirm no destination is opened.
4. Phone: valid international, premium-cost and invalid fixtures; inspect normalization and
   Insufficient Evidence/Caution boundaries; no number is contacted.
5. QR upload: upload a known PNG, inspect routed result and History. Include synthetic first-field
   Wi-Fi and embedded payment-userinfo cases; confirm credentials are redacted from saved content.
6. QR camera: explicitly start, grant permission, detect, inspect stopped-camera preview, then Analyse;
   verify cancel/navigation cleanup, denied-permission handling and upload fallback on actual devices.
7. History/search/filter: find owned saved analyses; combine search/type/risk/sort; check pagination,
   detail refresh and cancellation of the deletion dialog.
8. Analyse again: owned Message/URL/Phone detail creates a new editable draft and new result; the
   original remains unchanged. QR requires a fresh upload or scan.
9. Profile: edit own full name/username; refresh and confirm; check duplicate rejection and isolation.
10. Password reset: request using an inbox you control; receive the mail; use the HTTPS link;
    verify new-password login, old-password rejection, single-use/invalid link and prior-session revocation.
11. User A/User B: create permitted synthetic analyses under A; verify B cannot list, search, retrieve
    or delete them and B's dashboard excludes them. Foreign detail/delete should return 404.

Existing UI/regression evidence and the owner's prior acceptance remain valid within their scope.
These manual checks are not silently marked passed by deployment badges or public endpoint responses.
This record was preserved into the documentation package during academic review. The release SHA remains the deployed application version; documentation edits are not a new production deployment.
