# Controlled live demo script
Target 3:15 within the presentation; use the extended route for a 6–8 minute standalone demonstration.
Baseline production URL: https://scamguard-my.vercel.app.
Task 9 privacy fixes require owner review/merge before claiming the demo uses Task 9.

## Preparation (before screen sharing)
Verify ready/capabilities and the deployment commit. Use an existing owner-controlled production
account only after manual acceptance, or an isolated local demo account. Never display credentials,
reset links, environment pages, real personal history or incoming notifications.
Open data/demo/task9/fixtures.json; have url.png, phone.png, message.png and payment.png accessible.
These are controlled text/QR fixtures, not verified fraud/merchant examples. Do not call any number,
navigate to fixture destinations, scan payment fixtures with a banking app or authorize payment.
No real malicious website is needed. Rehearse against the exact release and use observed outputs.

| Step / time | What to click or supply | What to say | Expected observation / fallback |
| --- | --- | --- | --- |
| 1 / 0:10 | Sign in privately; show dashboard. | “This is my private analysis workspace.” | Real owned totals. If login fails, use prepared local environment; no fabricated dashboard. |
| 2 / 0:15 | Show distributions and a History link. | “These counts come from my saved records.” | Filtered History opens; existing activity may differ from screenshots. |
| 3 / 0:35 | Analyse → Message; paste scam_like from fixtures.json; Analyse content. | “The system combines a local three-class model with explicit evidence.” | Frozen local fixture currently yields ELEVATED; explain evidence, not an absolute scam verdict. If an updated reviewed result differs, report it honestly. |
| 4 / 0:25 | Expand evidence/actions/technical details. | “Risk and confidence are different; this score is not a fraud probability.” | Recommendations and limits readable; do not promise certainty. |
| 5 / 0:20 | History; search a unique phrase and open the record. | “This result is stored; Analyse again creates a new assessment.” | Saved result unchanged; no automatic re-analysis on retrieval. |
| 6 / 0:20 | URL: conventional or brand_structure fixture. | “Only the URL string is checked. The website is not visited.” | Explain visible structural categories and conservative fusion; no clickable destination. |
| 7 / 0:20 | Phone: fixed fixture. | “Valid numbering metadata cannot establish trust.” | INSUFFICIENT_EVIDENCE. Premium fixture, if time, gives CAUTION for cost metadata only. |
| 8 / 0:20 | QR → upload url.png or phone.png; Analyse. | “Decoding is separate from the security assessment.” | Routed result; image discarded. Payment extension explains CRC is not merchant verification. |
| 9 / 0:25 | Scan with camera → Start; present url.png on another device; then Analyse QR. | “Capture stops before I decide whether to analyse; nothing opens automatically.” | Stopped-camera preview, explicit submission. At 10 seconds without detection, cancel and use the same PNG upload. |
| 10 / 0:05 | Show Account/History briefly. | “Ownership is enforced by the API, with local A/B regression evidence.” | Do not expose another person's data or attempt destructive demo actions. |

Extended demo: compare benign Message LOW with short Message/Phone Insufficient Evidence;
show search/type/risk/sort, detail, Analyse again; cancel a deletion dialog without deleting valued
data; show two local test accounts if rehearsed. Password reset is a separate private acceptance task,
not a public live-email gamble.

## Backup strategy
1. Warm production before the session; confirm it is the approved commit, not a branch preview.
2. If Render sleeps/network fails, explain the operational limitation and switch to the prepared
   local PostgreSQL/API/frontend. Check readiness before the talk.
3. If camera fails, cancel and upload the exact controlled QR. Never pretend upload was a live scan.
4. Keep authentic labelled screenshots and an owner-recorded rehearsal video as a final fallback.
   Do not generate a fake interface, successful result or participant recording.
5. Avoid double submission after a timeout; inspect History for a committed result first.
