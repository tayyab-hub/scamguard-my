# Task 8 — Peak enhancement, UX innovation and product polish

Historical implementation record. On 2026-09-12 the owner accepted Task 8, which was merged and
deployed at main `4b327ccf21b59e295622e3b321cec62dc523dbde`. Its original review restrictions and
Task 9-not-started wording below are superseded. Current status/evidence: PROGRESS.md,
FINAL_TEST_REPORT.md and PRODUCTION_ACCEPTANCE.md. Original results/dates are preserved.

Task 8 development starts from `42a9db1e1d29ef0c05c248a416f6b90ac341d256`, verified equal to
`origin/main` after fetching, with a clean worktree. Branch: `task-8-peak-enhancement`.
Task 7 and the production routing fixes are present. Production operational status is supplied by
the owner; this task does not change provider configuration, merge main or deploy. Task 9 is NOT STARTED.

## Initial audit and priorities

The audit covered the shell/routes, all four inputs and result components, upload lifecycle,
dashboard/history/detail, authentication/profile/recovery, Help/privacy, state components and CSS;
API schemas/routes, persistence/queries/indexes/transactions, authentication/CSRF/rate limits/mail,
QR bounds/classification/redaction, model boundaries, request/error handling and verification setup.

| Priority | Finding | Decision and reason |
| --- | --- | --- |
| P0 | Private TanStack Query data survives account transitions; query keys are shared. | Clear/cancel private caches before identity transitions and scope private queries to the user. Prevent stale cross-account display. |
| P0 | `/auth/me` rotates CSRF on every restoration, invalidating other tabs. | Derive a stable, domain-separated session CSRF token, retaining digest validation and exact Origin checks. |
| P0 | Logout clears identity even when revocation fails; rejection is unhandled. | Show a recoverable error and preserve the authenticated state until revocation is confirmed. |
| P1 | No live camera scanner. | Add explicit-start, bounded local decoding, inert preview and explicit submission into the existing QR engine. |
| P1 | History is hidden in Overview with pagination only. | Add a dedicated private History route, server search/type/risk filters and deterministic sorting, retaining bounded pages. |
| P1 | Dashboard cannot explain the user's mix of checks or uncertainty. | Add measured type/risk distributions and direct review actions; no decorative or fabricated trends. |
| P1 | Modal deletion lacks focus containment/restoration and background isolation. | Share a native modal dialog with focus restoration and keyboard coverage. |
| P1 | List/dashboard queries hydrate full assessment JSON unnecessarily. | Select summary fields only; aggregate scoped counts in SQL within the existing snapshot. |
| P2 | Important result limitations are buried inside technical metadata. | Make limitations visible separately while keeping technical disclosure compact. |
| P2 | Low versus insufficient evidence is not explained consistently at the decision point. | Add explicit shared category guidance without changing any model/risk/score. |
| P2 | Analyse copy is repetitive; no safe first-use examples or clear repeat action. | Add labelled examples through the real pipeline, compact mode guidance and Analyse another. |
| P2 | Recovery errors offer no direct new-link action; profile success remains stale after editing. | Improve recovery navigation, form feedback and connected errors. |
| P2 | Motion exists but does not cover dialogs or new scanner/filter states. | Extend the established CSS tokens; all nonessential motion remains opt-in. |

The existing forensic visual identity, typed API validation, bounded upload, no-fetch/no-contact
intelligence, ownership checks, opaque sessions, Argon2id and migration discipline are retained.
No evidence supports changing the intelligence algorithms or adding a database migration merely
for this milestone.

## Considered and rejected

- Analysis comparison: different evidence engines and unchanged model versions make a side-by-side
  score comparison misleading; immutable Analyse again already solves repeat review.
- Chatbot, gamification and decorative charts: unrelated to evidence review and add no defensible value.
- Automatic URL opening, payment launching or backend frame streaming: violate the privacy and inert-content boundary.
- A large charting/animation framework: labelled CSS bars and existing motion tokens suffice.
- Full-text/trigram indexes or cursor pagination now: current owner/date index and bounded pages
  suffice for this workload. Literal substring search is bounded but remains linear within an owner's
  matching data; document this limitation before large-scale use.

## Camera architecture, privacy and security

`QrCameraInput` owns user interaction; `CameraScanner` owns one cancellable MediaStream session.
Choosing the camera input method does not request permission. **Start camera** is the explicit
permission action. Video prefers the environment camera, requests no audio and uses a muted inline
preview. When multiple devices are reported after permission, Switch camera closes the old stream
before requesting the next one. No persistent device identifiers are stored.

Native `BarcodeDetector` is feature-detected, including QR format support. Missing, unsupported or
failing native detection uses pinned MIT-licensed `zxing-wasm@3.1.3`, built from ZXing-C++, in a
dedicated worker. Vite emits the matching reader binary as a same-origin asset: there is no runtime
CDN dependency. The worker and binary load only when the fallback is needed. Each session processes
at most four sequential frames per second at a maximum 960-pixel long edge, with no overlapping jobs.
The main UI does not run the WASM decoding operation. UTF-8 bytes are validated, and multiple codes
are not silently reduced to an arbitrary choice.

Every exit aborts the session, clears timers, terminates the fallback worker, stops all tracks,
detaches `srcObject` and clears the temporary canvas. This includes detection, cancel, input-mode
change, navigation, unmount, page hiding, device termination, scanner failure and a 90-second idle
deadline. Permission granted after cancellation is immediately stopped. A late decoding result
cannot revive a closed session. Returning to the tab never restarts the camera automatically.

Detected text is escaped, inert and kept only in React memory until explicit submission. There is no
video recording, frame upload, frame history or browser storage. **Analyse QR** sends only validated
text plus a constrained decoder identifier to `POST /api/v1/analyses/qr/payload`. The server enforces
session, Origin, CSRF, shared analysis rate limit, UTF-8/control/byte limits and ownership. It calls
the same QR classifier, redaction, payment parser and intelligence orchestration used by uploads.
Camera metadata is explicitly **client-reported**; the server does not falsely claim to have verified
an image. Image format/dimensions/fingerprint are null for camera input. Existing upload records keep
their original metadata and remain readable. QR adds no new score or severity.

No scanner path opens a URL, contacts a phone, launches another app, interprets HTML/JavaScript,
executes Wi-Fi/payment instructions, fetches decoded content or sends it to an external AI service.
Only the approved local QR engine processes submitted content. Upload remains a separate, normal
file picker, including on mobile (the old capture hint no longer commandeers that choice).

## Browser compatibility

- iPhone Safari: secure origin, camera permission and a compatible browser are required. Inline,
  muted preview avoids forced full-screen playback. Native barcode support is not assumed; the local
  worker/WASM reader is the fallback. Rear-camera preference is a request, not a hardware guarantee.
- Android Chrome: same explicit permission flow; native QR detection is used only when reported
  available. Otherwise the fallback runs. Device enumeration and switching depend on browser/device.
- Desktop Chrome/Edge: works with an available webcam or the local fallback; no camera, denial,
  busy hardware, unsupported context and decoder failure have a retry/upload path.
- Embedded webviews, insecure HTTP LAN addresses, enterprise permission policies, low-memory devices,
  old WebAssembly/Worker implementations and poor lighting can prevent scanning. Localhost is useful
  for desktop development; a phone opening a plain HTTP LAN IP generally needs an HTTPS development
  origin instead. No provider configuration was changed to create one.

These are implementation paths and documented platform constraints, **not physical-device acceptance**.
Desktop Chrome tests use actual local WASM decoding with synthetic camera frames. Mobile Chromium
emulation is not Safari or a physical Android camera.

Primary references: [MDN getUserMedia](https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia),
[MDN BarcodeDetector detection](https://developer.mozilla.org/en-US/docs/Web/API/BarcodeDetector/detect),
and [ZXing WASM source/documentation](https://github.com/Sec-ant/zxing-wasm). Package version and license
were checked against npm and the installed package on 2026-09-10.

The wrapper is MIT; ZXing C++ and its WASM binding use Apache 2.0. The upstream notices are included
under `frontend/public/licenses` and copied into the build. Only the reader entry point is shipped.

## Product and interaction changes

| Area | Implemented change | Why it improves the application |
| --- | --- | --- |
| Analyse | Shared compact mode guidance, dashboard mode shortcuts, clearly labelled examples and Analyse another | Makes the four modes discoverable and supports first use without a forced tutorial. Examples still use the real pipeline and never generate fake results. |
| Message | Example message and unchanged model/rule evidence presentation | Supports a reproducible demonstration without inventing AI confidence. |
| URL | No-visit guidance and clear category-index wording, also for URL-routed QR | Avoids interpreting the ordinal index as a measured fraud probability. |
| Phone | International-number guidance and explicit intent limitation | Distinguishes numbering information from caller identity or scam evidence. |
| QR | Upload/camera choice, camera state feedback, stopped-camera preview and source-aware result metadata | Makes the privacy boundary and next action visible. |
| Results | Category-specific guidance beside the headline, visible limitations, separate Technical details | Low never implies safe; insufficient evidence stays distinct and essential caveats are not hidden behind implementation metadata. |
| Dashboard | Database type/risk counts with labelled links to matching history and four quick actions | Shows real usage and uncertainty; helps users find records needing review. Bar lengths encode counts, not probabilities. |
| History | Dedicated route/navigation, submitted-content/summary search, type/risk filters, oldest/newest/risk order and clear-filter action | Turns a hidden record list into a practical evidence browser. |
| History scale | Existing 10-item bounded pages, server-side filtering, deterministic ID tie-breaks and repeatable-read count/row snapshot | Avoids downloading all records and prevents inconsistent count/page reads within one request. |
| Deletion | Native modal dialog, inert background, focus containment/return, Escape handling and pending protection | Prevents keyboard users interacting behind a confirmation; deleting the last record returns to the preceding page. |
| Auth | Stable per-session CSRF, private cache isolation and recoverable logout failure | Fixes real privacy/reliability defects rather than cosmetic login changes. |
| Cross-tab identity | Same-origin BroadcastChannel sends only an identity-change notification | Other tabs clear private state after sign-in/sign-out/account deletion; no credential or analysis text is broadcast. |
| Profile | Clearer data controls, history/privacy actions, pending/dirty feedback and success reset on editing | Prevents stale success messages and redundant unchanged submissions. |
| Recovery | Delivery guidance, retry/change-email action, new-link action, token removal from the current URL and no-referrer policy | Helps recovery without exposing account existence or leaving reset secrets in subsequent navigation/referrers. |
| Accessibility | Connected login-password errors, first-invalid-field focus, native modal focus, touch-size controls and 16px mobile inputs | Makes forms and destructive actions usable by keyboard and avoids iOS focus zoom without restricting user zoom. |
| States | Actionable history empty/no-match states, existing honest skeletons, camera-specific error guidance and preserved ambiguous-write advice | A user can distinguish no evidence, no data, service failure and a saved result. |

Evidence order, model versions, actual scores, recommended actions, payment CRC interpretation,
no-fetch/no-contact methodology and immutable saved results remain unchanged. Technical IDs and
component versions remain inspectable. QR camera records do not masquerade as uploaded images.

## Animation and visual design

The approved ivory/charcoal/terracotta/olive identity remains. Existing 150/180/240ms CSS tokens now
also cover native dialog entrance/backdrop and detected-QR feedback. Camera scanning alone has a
subtle moving line while active; labels still convey status. Navigation, mode panels, validation,
results, disclosures, buttons and skeletons retain the existing restrained system. History risk
labels gain semantic surface colors alongside words; dashboard bars are static measured lengths.

All nonessential movement is inside `prefers-reduced-motion: no-preference`; the global reduce rule
removes animation, delay and transitions immediately, including a mid-scan preference change. The
camera still decodes and its state remains readable. No motion library, chart library, particles,
parallax, unbounded decorative animation or invented metrics were added.

## Backend, API and database decisions

- History search uses a CSRF-protected read-only POST body, so private search text is absent from
  request URLs, browser history and conventional URL access logs. Filters and query length are
  validated; SQLAlchemy escapes substring wildcard characters and parameterizes queries.
- Summaries project the required fields plus QR subtype rather than hydrating model/evidence JSON
  for every row. Full detail is still loaded only when opened. The dashboard groups counts in SQL,
  uses the same owner scope and transaction snapshot, and accounts separately for unassessed records.
- The existing `(user_id, created_at DESC, id DESC)` index supports owner/history access. Literal
  substring search and risk sorting can still scan an owner's records; measured large-scale needs
  would justify a future query plan/index review. Offset pages can shift between requests during
  concurrent inserts; the UI does not claim cursor stability.
- No schema change or migration was needed. The Alembic head remains `0006_qr_intelligence`.
  Existing users, auth/profile fields and all four record types are preserved.
- CSRF is derived with domain-separated HMAC from the random HttpOnly session secret, with only its
  digest retained in PostgreSQL. Existing sessions migrate on `/auth/me`; an already-open pre-upgrade
  tab may need one refresh. New sessions still receive a distinct CSRF token. Exact Origin checks,
  Argon2id, secure production cookie requirements, expiry, revocation and reset-token single use remain.

## Performance and dependency review

Baseline observed production build: JavaScript 478.38 kB / 142.17 kB gzip; CSS 43.86 kB / 8.93 kB gzip.
Task 8 lazy-loads Help, Account and password recovery. The fallback is a separate worker and a
1,093.29 kB reader binary (460.98 kB gzip); it does not enter the startup JavaScript. Native decoding
avoids that download entirely. Exact final bundle/check results are recorded in the verification
table after the final build. The new pinned decoder is MIT licensed; npm initially reported zero
vulnerabilities. No existing intelligence library was upgraded for appearance.

## Security review and residual boundaries

Reviewed auth/session/cookie/CSRF/Origin controls; profile/analysis/delete ownership; reset expiry,
single-use and revocation; body bounds; QR MIME/format/decompression/payload protections; safe error
envelopes; SQL parameterization; React escaping; no automatic destination access; query caching;
logging; mail and environment handling. The concrete privacy/CSRF/logout findings above were fixed.
No production secret, provider setting, Neon data, Render service or Vercel deployment was changed.

This is not a penetration-test certification. Signup uniqueness still discloses account/username
conflicts by design, while login and reset-request responses remain generic. Password-reset delivery
timing is not constant-time. Basic fixed-window rate limits are not DDoS protection. Shared-host
administrators/provider backups and legally defined retention remain outside UI deletion guarantees.
There is no idempotency key or durable job queue: a lost POST response may follow a committed record,
and a process interruption can leave a processing record. Content search is private application data,
not anonymized data. Camera decoder identity cannot be authenticated from client text alone.

## Exact manual camera acceptance

For desktop review in the existing Windows workspace, keep the Task 8 branch checked out, run
`.\dev.ps1 -NoBrowser` from the repository root, and open `http://127.0.0.1:5173`. Use the existing
local account/database setup; `.\stop-dev.ps1` stops launcher-owned services when finished.
Do not copy or print production credentials. The automated fixture
`frontend/test-results/qr-fixtures/controlled-url.png` can provide a non-sensitive code on a second
display, or create a QR for the example below. A phone cannot use this computer's loopback address.

Use a non-sensitive QR containing `https://example.com/scamguard-camera-demo` and a PNG of the same
code. Test the Task 8 frontend **with the Task 8 backend** on an approved HTTPS test origin; do not
deploy to production as part of these instructions. Run the sequence separately on physical iPhone
Safari, Android Chrome and desktop Chrome/Edge. Record device/browser version and result for each.

1. Sign in and open Analyse → QR Code. Confirm the camera indicator is off and Upload image works.
2. Choose Scan with camera. Confirm it remains off until **Start camera**.
3. Select Start camera. Verify a permission prompt appears if permission was not already granted.
4. Allow video permission. Confirm no microphone request, visible inline preview and a preference
   for the rear camera on phones where available. Frame one complete, well-lit QR code.
5. Confirm detection stops the camera indicator before showing decoded text. No browser navigation,
   payment app, phone call, SMS composer, mail app or map should open.
6. Inspect the preview. Confirm history has not changed yet. Select **Analyse QR** explicitly.
7. Verify a QR result with URL route, category/evidence/actions/limitations and camera source. Open
   History and reload; the saved result remains. No image fingerprint is invented for camera input.
8. Return to QR camera, choose Scan again/Start camera and use a blank scene. Select Cancel scan.
   Verify the indicator disappears and focus returns to Start camera.
9. Start again; switch camera when the control is offered. Confirm the previous camera closes and
   the chosen camera appears. Do not assume every device exposes multiple cameras.
10. Start again and change to Message mode; verify capture stops. Repeat using History navigation,
    browser Back, tab switching/backgrounding, page reload and closing the tab.
11. Return to QR mode; confirm it never resumes automatically. Leave a blank scan for 90 seconds and
    verify a stopped-camera message with a restart/upload action.
12. Revoke permission in browser site settings; select Start camera and deny. Verify concise denial
    guidance, no active indicator, Retry camera and Upload image instead.
13. Use Upload image instead, select the prepared PNG and Analyse QR. Verify a normal uploaded-image
    result. Camera permission must not be required by the image picker.
14. Where possible test no camera, a camera busy in another app, blocked camera policy and an insecure
    HTTP origin. Each must show a useful failure/fallback, without raw device/internal errors.
15. Present two QR codes simultaneously. The scanner must request one code rather than silently
    choose one. Try poor lighting, rotated codes and damaged codes; no fabricated detection is allowed.
16. Test a QR with `javascript:`, `tel:`, `sms:`, `mailto:`, HTML, Wi-Fi and payment-like data. Content
    stays inert. Real backend results must keep insufficient evidence distinct from Low and must not
    equate payment CRC validity with merchant legitimacy.
17. Enable the OS Reduce Motion preference before and during a scan. The line becomes static, status
    stays legible, detection still works, and all buttons remain usable.

## Manual product, mobile and regression acceptance

At 375, 390, 430, 768, 1024, 1366 and 1440+ pixels, inspect Overview, every Analyse mode and result,
QR upload/camera, History, Account, login, signup, forgot/reset password, Help/privacy, deletion
dialogs and mobile navigation. Check clipping, wrapping, touch targets, viewport zoom, focus,
sidebar/bottom-nav reachability and readable chart labels. Test keyboard only as well as pointer/touch.

Create a test account, sign in by username and email, restore a session and open a second tab. Update
profile in the first tab after the second restores; it must still succeed. Log out and verify private
history disappears in both tabs. Sign in as a different account and verify no old totals, previews or
details flash. Simulate failed logout and verify the UI reports that revocation was not confirmed.

Run real Message, URL, Phone, QR upload and camera checks. Follow evidence → actions → visible
limitations → Technical details. Try each risk category using controlled fixtures and verify no fraud
probability is invented. Use Analyse another and Analyse again; the old result must remain unchanged.
Search history by saved content and summary; combine type/risk filters, change order, clear filters,
move between pages and delete the only last-page item. Confirm cancel/Escape restores focus and Tab
cannot escape an open dialog. Test empty account, no search match and network/API failures.

For password recovery use the configured local test mail capture, not production provider changes.
Verify generic request confirmation, malformed/expired/used links, password mismatch, a valid reset,
all-session revocation and a direct route to request another link. Reset-link removal from the current
address bar means refreshing requires reopening the email link. Actual mail delivery must be
verified by the owner on the intended test environment.

## Final verification and visual review

| Gate | Observed result |
| --- | --- |
| TypeScript / ESLint | PASS / PASS, zero warnings |
| Vitest | 159 passed, 11 files |
| Backend Pytest with real isolated PostgreSQL | 300 passed, 1 opt-in paid/provider integration skipped, 2 existing deprecation warnings |
| Ruff / format / pip check | PASS; 68 files formatted, no broken requirements |
| Alembic current / heads / check | `0006_qr_intelligence`, single head, no new operations; no Task 8 migration |
| Foundation Playwright | 18 desktop/mobile passed, including keyboard, motion, contrast and responsive checks |
| Built-preview Playwright | 8 desktop/mobile passed, including the actual emitted QR worker/WASM |
| Real PostgreSQL Playwright | 20 desktop/mobile passed; 14 relevant cases repeated for final visual captures |
| Production build | PASS, 1,769 modules; main JS 476.16 kB / 143.08 kB gzip; CSS 46.96 / 9.52 kB gzip |
| Baseline comparison | Main raw JS decreases 2.22 kB from 478.38; gzip increases 0.91 kB from 142.17. CSS increases 3.10 kB raw / 0.59 gzip |
| Deferred assets | QR worker 36.25 kB; reader WASM 1,093.29 kB / 460.98 gzip; no decoder download before needed |
| Dependency / secret review | npm runtime audit reports zero vulnerabilities; no private local environment value or credential pattern found in changed/new files |

The build retains two existing Zod/Rollup annotation notices, without a chunk-size warning.
Browser runners emit the existing NO_COLOR/FORCE_COLOR warning. Python warnings concern Starlette
httpx and AnyIO deprecations. No paid AI request was made. Windows runtime/temp ACL issues were
resolved using approved execution and an ignored workspace test-temporary directory. All final gates
above completed; earlier failures are not hidden as successful runs.

After the automated checks, local screenshots were independently inspected for populated and empty
Overview, every Analyse mode, Message/URL/Phone/QR results, upload/live/detected camera, searchable
History, Account, login/signup, forgot/reset, Help/privacy and deletion dialogs. Desktop, tablet and
mobile captures were reviewed. The browser suite explicitly checks 375, 390, 430, 768, 1024, 1366 and
1440 widths, with existing 320px coverage. Labels, borders, wrapping and major actions remain
coherent. The review prompted the neutral availability notice, source-aware camera privacy copy,
camera preview positioning and neutral empty-assessment icon.

Long mobile result pages and dense secondary metadata are still visible compromises. Fixed sidebar,
bottom navigation and offscreen skip-link positions in full-page screenshots reflect the capture's
scroll position; actual keyboard/viewport behavior is separately asserted. Captures are ignored local
QA output, not a Task 9 presentation evidence pack or a human usability study.

Native hardware permission prompts, physical iPhone Safari/Android/Edge cameras, hosted frontend/API
pairing, remote CI and production deployment are not inferred from local automation. The Task 8
branch contains the frontend and backend together for review. Existing production settings remain
unchanged, and Task 9 is NOT STARTED.

## Strict examiner assessment and next-stage limits

The strongest Task 8 changes, ranked by combined technical, UX and demonstration value, are:

1. Real on-device camera decoding with explicit review and complete cleanup.
2. Cross-account cache isolation, stable multi-tab CSRF and honest logout failure.
3. Private server-side history search/filter/sort with bounded consistent pages.
4. Clear Low/insufficient distinction and visible result limitations.
5. Measured dashboard distributions linked to the actual supporting records.
6. Native confirmation dialogs with verified keyboard containment/restoration.
7. One coherent four-mode Analyse flow with real-pipeline examples and repeat actions.
8. Lazy routes and worker-based decoding while keeping the initial bundle controlled.
9. Recovery/profile feedback and safer reset-link handling.
10. Restrained scanner/dialog motion, mobile navigation and reduced-motion consistency.

The application still cannot justify a high-distinction outcome through polish alone. Its main
limitations are the original historical/imbalanced model data, uncalibrated display scales and
limited evidence of generalization to current multilingual scams; these were not altered in Task 8.
Phone intent and payment-recipient legitimacy remain outside the available evidence. A valid,
innocuous-looking input can still receive cautious model output, so uncertainty and false positives
must be evaluated rigorously later rather than marketed away.

An examiner can also challenge the absence of physical-device camera acceptance, representative
user task-completion studies, screen-reader/zoom testing, measured slow-device performance and
large-history load tests. Result/history pages are long, some metadata is small and repeated guidance
still creates reading effort. Search/filter state deliberately stays in memory rather than persisting
sensitive query strings across refreshes. Help's feedback is a prepared offline workflow, not an
operational scam-reporting service; the broad project title should be explained honestly.

There is no comprehensive independent security audit, incident-response operation, enterprise abuse
protection or confirmed provider-backup erasure policy. Camera provenance is client-reported, and
browser/extension compromise remains outside the application boundary. Deployment/API pairing and
the unchanged same-origin proxy still need later approval and production verification. These are
limitations for the user's eventual Task 9 work, not work begun or claimed complete here.
