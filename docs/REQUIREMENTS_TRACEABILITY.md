# Requirements traceability
Date: 2026-09-12. “Production baseline” means Task 8 merge `4b327cc…`; Task 9 fixes remain
unmerged for review. Authenticated production flows are owner-reported, not independently measured.
Exact test counts and limitations: FINAL_TEST_REPORT.md. No fabricated requirement IDs from a rubric.

| ID / requirement | Implementation / code | Test or evidence | Production / acceptance |
| --- | --- | --- | --- |
| R01 Message analysis | ml/{classifier,rules,fusion,engine}.py; MessageResult.tsx | test_message_intelligence.py; Message runtime reproduction; submission.spec.ts | Engine ready; owner-reported functional acceptance |
| R02 URL analysis without fetch | url_intelligence/*; URLResult.tsx | test_url_intelligence.py network guards; verify_url_pipeline.py; url.spec.ts | Engine ready; no authenticated production test by agent |
| R03 Phone metadata/no contact | phone_intelligence/*; PhoneResult.tsx | test_phone_intelligence.py; 10 controlled cases; phone.spec.ts | Engine ready; subscriber/fraud inference out of scope |
| R04 QR upload/routing | qr_intelligence/*; api/analyses.py; QrImageInput.tsx | test_qr_intelligence.py; 15 controlled cases; qr.spec.ts | Engine ready; original image not retained |
| R05 Payment structure/CRC | qr_intelligence/payment.py | Controlled 4-case matrix + missing-field limitation | Structural subset only, no safety/merchant verification |
| R06 Explicit camera and cleanup | cameraScanner.ts; qrDecoder.worker.ts; QrCameraInput.tsx | cameraScanner.test.ts; camera.spec.ts; built WASM decoder tests | Production assets 200; hardware evidence not recorded |
| R07 Signup/login/session/logout | core/auth.py; api/auth.py; AuthProvider.tsx | test_auth.py; Auth.test.tsx; authentication.spec.ts; cross-tab product test | Login UI/anonymous denial verified; owner reports working |
| R08 Profile | api/auth.py; AccountPage.tsx | Profile validation; owned PATCH; duplicate username; lifecycle browser tests | Authenticated confirmation remains manual |
| R09 Password recovery | api/auth.py; services/mail.py; PasswordResetPages.tsx | Generic response, single use/expiry/revocation; mocked mail; recovery UI | Resend required by production config; inbox delivery unverified |
| R10 Private History/search/filter/sort | services/analyses.py; SubmissionHistory.tsx; HistoryPage.tsx | test_task8.py; test_final_closure.py; product-polish.spec.ts | Protected route loads; authenticated interactions manual |
| R11 Real dashboard distributions | api/routes.py; DashboardDistribution.tsx | Grouped scoped counts; no fake fallback; browser History links | Protected route; public readiness not proof of chart data |
| R12 Ownership / A-B isolation | session-derived user_id and owner-scoped services | test_auth.py; all-four-mode test_final_closure.py | Local real PostgreSQL proof; no production test accounts created |
| R13 Immutable results / delete | owned detail, copy-to-new-draft, DELETE and cascade | test_persistence.py; test_auth.py; browser result tests | Existing records present; no production mutation performed |
| R14 QR privacy / redaction | persisted_payload; bounded decoding | Task 9 upload/camera DB/response/search regressions | Task 9 edge-case fix awaiting review and merge |
| R15 Responsive/accessibility | AppShell/styles/labels/ModalDialog | Three browser suites; eight-width auth/mode/result/dialog checks; keyboard/motion/contrast | Reviewed practices; no device or WCAG certification |
| R16 Production persistence | Vercel proxy → Render → Neon; migrations | Provider commit evidence, HTTP ready, SELECT-only production head; local migrations | All four engines ready; head 0006; no Task 9 migration |
| R17 Honest uncertainty/evidence | risk-presentation-v1; separate components/limitations | risk/result tests; evaluation matrices and model reports | Low not safe; Insufficient Evidence not Low |
| R18 Reproducible evaluation | immutable data/artifacts; evaluate_final.py | Source hashes, group isolation, exact runtime matrices | Offline research evidence, not live population accuracy |

Backend paths are under backend/app unless stated; frontend paths under frontend/src;
tests under backend/tests and frontend/e2e-persistence. See API.md for exact route contracts.
No endpoint implements editing completed results or fetching foreign content for Analyse again.
