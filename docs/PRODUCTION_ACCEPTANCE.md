# Production acceptance and owner checklist

Date: 2026-09-12. Production baseline: main `4b327ccf21b59e295622e3b321cec62dc523dbde`.
Task 8 passed owner manual acceptance and was merged/deployed before Task 9 began.
Task 9 is a separate review branch, **not merged or deployed to production**. Its saved-QR privacy
correction therefore remains pending owner merge. No production accounts, email, data mutations,
secret changes or provider configuration changes were performed during this closure review.

## Recorded evidence

| Check | Evidence / result | Evidence class |
| --- | --- | --- |
| Main baseline | Clean main matched origin/main after fetch; Task 8 merged; no unmerged branch reported by `git branch --all --no-merged main` at baseline | Git observation |
| Vercel | Ready production deployment at the complete main SHA above; [deployment](https://vercel.com/tayyab-d919/scamguard-my/7VEzXTKgsrHhm7nLDq1pP1Bax6mS) | Authenticated provider UI, Task 8 closure on 2026-09-12 |
| Render | Live at the same complete SHA; branch main; auto-deploy On Commit; successful build/start; [deployment](https://dashboard.render.com/web/srv-dafsk1740ujc73cpn0ng/deploys/dep-daijeaojo6nc73blh9u0) | Authenticated provider UI, same-day Task 8 closure |
| Neon | SELECT-only inspection found `alembic_version=0006_qr_intelligence`, matching repository head; database connected | Authenticated Neon UI, same-day Task 8 closure; no data mutation |
| Health | HTTP 200, status ok, service scamguard-api, version 0.1.0, through Vercel and directly on Render | Fresh Task 9 public GETs |
| Ready | HTTP 200, ready, database connected, Message/URL/Phone/QR ready, through both paths | Fresh Task 9 public GETs |
| Capabilities | HTTP 200, submissions and analysis available, MESSAGE/URL/PHONE/QR present, through both paths | Fresh Task 9 public GETs |
| HTML routes | Login/signup/recovery/Help render; private routes redirect anonymous users to login; checked routes returned 200 SPA shell | Same-day Task 8 closure browser/HTTP observation |
| Public security | Anonymous /auth/me, /dashboard and /analyses return 401 with no-store | Same-day Task 8 closure HTTP observation |
| Frontend assets | Deployed QR worker and WASM returned 200; local Task 9 production-build suite loads the real packaged decoder | Production asset GET + separate local automated evidence |
| Resend configuration | Owner previously confirmed Task 6.1 setup. Successful production startup is consistent with required MAIL_PROVIDER=resend, sender, API key and HTTPS frontend configuration checks | Owner report + configuration/startup inference, not inbox delivery |
| Generic manual function | Owner's Task 9 reply: “its working”; preceding Task 8 acceptance covers owner-reported UI/workflow acceptance | Owner report; devices, exact cases and artifacts unspecified |

Provider observations are a dated baseline, not a claim that Task 9 branch code is deployed.
Public readiness does not exercise authenticated mutations, send mail, verify the migration revision
itself or prove persistent availability. The Neon SELECT supplies revision evidence separately.
Render's free service lacked shell access; no production shell or direct DB mutation was used.

The working same-origin API rewrite is configured in the Vercel deployment/project. The repository's
frontend/vercel.json contains the SPA catch-all, not the full provider API rewrite configuration.
Preserve the existing provider rule. A fresh provider project needs that rule explicitly recreated.

## Resend acceptance

Do not expose or rotate the key merely to verify configuration. Actual request → received inbox →
valid link → new-password login is **NOT PERFORMED by this review**. Local automated reset tests cover
generic response, expiry, invalid/single-use tokens, old/new password behavior and session revocation.
If a resend.dev test sender is still used, confirm its permitted recipient restriction before a demo;
broader recipients require an appropriately verified sending domain. Actual configured sender/domain
and deliverability were not inspected here. See [official sender restriction documentation](https://resend.com/docs/knowledge-base/403-error-resend-dev-domain).

Owner checklist, using only an account/inbox you control:

- [ ] Record current production commit and date; warm readiness before demonstration.
- [ ] Confirm login by username/email, refresh, profile, logout and private History on that release.
- [ ] Submit permitted fixtures in all four modes; confirm stored detail after refresh and deletion.
- [ ] Request reset, receive the email, check HTTPS link, change password, reject old password and
  reused link, accept new password and verify prior-session revocation. Record result without token.
- [ ] Record any provider sender/domain restriction and the presentation fallback.
- [ ] After reviewing Task 9, authorize merge separately, then verify both providers at that merge
  commit and repeat health/ready/capabilities and a permitted synthetic QR privacy check.

Controlled A/B creation and destructive acceptance were executed only in isolated local test DBs.
No instruction here authorizes the agent to create production accounts or send an email.

## Physical-device matrix

All device-specific rows are **NOT PERFORMED / no recorded evidence supplied**. The owner's generic
functional confirmation cannot identify a browser/device or replace a study. Chromium desktop/mobile
emulation and synthetic canvas MediaStreams passed separately; they are not Safari or real cameras.

| Device/browser | Required actions | Recorded result |
| --- | --- | --- |
| iPhone Safari | Production login; Analyse; Start camera permission; rear camera; inert detection/Analyse; cancel/navigation stream shutdown; denied permission; upload fallback; mobile History | NOT PERFORMED — model/OS/browser/date/evidence unrecorded |
| Android Chrome | Same checks, including rear camera selection, permission denial and upload fallback | NOT PERFORMED — model/OS/browser/date/evidence unrecorded |
| Desktop Chrome/Edge webcam | Permission, scan/detection, cancel/navigation cleanup, upload fallback; keyboard/dialog/History/filter flow | NOT PERFORMED on physical webcam — device/browser/date/evidence unrecorded |

For each execution record: device and OS, exact browser version, date/time, production commit,
tester pseudonym, each expected/observed result and a permitted screenshot/video reference. Never
capture passwords, reset tokens, provider secrets or unrelated private content. Report any failed
or unavailable action honestly. See DEMO_SCRIPT.md for upload/local fallback and SCREENSHOT_CHECKLIST.md.

## Operational boundaries

No backup restore, retention deletion, load/soak, uptime/SLA, independent pentest, formal screen-reader
audit or volunteer usability study was performed. Production is available for an owner rehearsal;
unconditional camera/mail demo readiness still needs the evidence above. Do not deploy paid services,
change plans, rewrite data or treat public smoke as proof of those missing checks.
