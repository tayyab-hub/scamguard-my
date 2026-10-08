# Project plan and recorded chronology

Table 10 reconstructs observed Git activity, not an invented original schedule. Dates are commit timestamps in Asia/Kuala_Lumpur; start/end are first/last relevant commits in each row. A same-day row does not prove the work took one day, and a review interval is not an estimate of labour. Git begins with a completed foundation commit on 3 September 2026. Earlier planning, recruitment and research dates are NOT YET EVIDENCED. The August 2026 cover text in the blank template is not a project deadline.

**Table 10. Recorded phases, tasks and milestones.** Source: evidence/project-git-chronology.txt and the named commit subjects.

| Phase | Tasks | Activities | Deliverable | Milestone | Start | End | Status |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Task 1 foundation | Application shell, API foundation and four-mode interfaces | Implement routes, validation and responsive controls | Foundation application | a6b996a → bd41afa | 2026-09-03 | 2026-09-04 | Committed; interfaces alone did not imply engines. |
| Task 2 persistence | PostgreSQL intake, history, dashboard and support | Integrate API/storage and verify real persisted records | Core platform | be926fa → 425aab0 | 2026-09-04 | 2026-09-05 | Merged. |
| Task 3 Message | Dataset preparation, model candidates, local inference and results | Deduplicate/group/split; select on validation; persist evidence | Message Intelligence | 73d9de2 → 7625a6f | 2026-09-05 | 2026-09-05 | Merged; first committed dataset/model evidence. |
| Task 4 URL | Raw data processing, domain groups, forest/rules and result integration | Derive local features; export/reproduce; guard no-fetch | URL Intelligence | 8e2bec1 → 386e4b7 | 2026-09-07 | 2026-09-07 | Merged; first committed URL research evidence. |
| Result refinement | Explainable result presentation | Map existing result data into consistent visual components | Result interface | c4bcd5e → 080e800 | 2026-09-07 | 2026-09-07 | Merged; methodology unchanged. |
| Task 5 accounts/deployment | Authentication, ownership and managed production | Implement sessions/CSRF, deploy proxy/API/database | Private account platform | 0b1f46d → 1409ba2; baa9163 fix | 2026-09-08 | 2026-09-09 | Merged; production API-base correction recorded. |
| Task 6 Phone | International parsing and conservative metadata | Pin numbering data; test normalization and no-contact | Phone Intelligence | 6d87617 → f24db9f | 2026-09-10 | 2026-09-10 | Merged. |
| Task 6.1 profile/recovery | Profile and password reset lifecycle | Validate identity fields; mail/token/session tests | Account lifecycle | bcff3dd → 546447f | 2026-09-10 | 2026-09-10 | Merged. |
| Task 7 QR | Bounded uploads, payload routing, payment subset | Decode in memory; validate limits; persist private results | QR Intelligence | 72ad78e → 42a9db1 | 2026-09-10 | 2026-09-10 | Merged; retention clarification cd14925. |
| Task 8 camera/polish | Camera lifecycle, history, reanalysis and final UX | Implement local scanning; regression and owner acceptance | Accepted feature-complete app | b8f1aff → 4b327cc | 2026-09-10 | 2026-09-12 | Merged; interval includes review, not continuous work. |
| Task 9 integration | Privacy corrections, controlled evaluation and documentation | Audit/reproduce/test; owner review | Closure evidence | afabf5c | 2026-09-12 | 2026-09-12 | Accepted; no new model or migration. |
| Final production release | Normal merge and complete gate rerun | Push only after passes; verify both hosts and SELECT-only head | Final production release | 4df277b | 2026-09-12 | 2026-09-12 | Merged/pushed/deployed; dated probes retained. |

## Deadlines and academic work outside Git

| Activity | Recorded evidence | Actual start/end or deadline | Required action |
| --- | --- | --- | --- |
| Original proposal and approval | Blank supplied template and marking schemes | NOT YET EVIDENCED | Owner supplies original approved schedule or confirms it was not recorded. |
| Literature review and data acquisition before model commits | Dataset/provenance files appear in Task 3/4 | Acquisition/reading start dates NOT YET EVIDENCED | Use notes/download records if retained; do not infer from publisher dates. |
| Final academic content and source audit | Current documentation working tree | Current audit, separate from historical development; completion logged in package manifest | Preserve the final package and identify it as retrospective preparation. |
| Volunteer evaluation | Protocol and blank results form | NOT YET CONDUCTED; deadline not supplied | Schedule only after permitted recruitment/consent; retain observations. |
| Physical device/production inbox checks | Generic owner acceptance only | Device-specific case dates NOT YET EVIDENCED | Record controlled cases with device/browser/date/release SHA. |
| Final report editing | Template and this prepared content | Institutional due date NOT YET EVIDENCED | Owner confirms deadline and completes cover/submission fields. |
| Presentation rehearsal and delivery | Prepared plan/Q&A | Rehearsal and assessment dates NOT YET EVIDENCED | Book four rehearsals and verify assessment time allocation. |
| Submission | No submission receipt supplied | NOT YET EVIDENCED | Confirm submission channel, required files and receipt. |

Phases depended on shared contracts: persistence preceded owned history; account ownership preceded private QR records; QR routing preceded live camera input. Integration gates preceded the production push. These relationships are supported by the source and commit sequence; a prospectively approved critical path or variance-to-plan analysis cannot be reconstructed from commits alone. The risk register assigns specific controls and contingencies to the threats affecting this plan.
