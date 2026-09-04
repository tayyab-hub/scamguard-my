# Accepted decisions

Recorded: 2026-09-03, Asia/Kuala_Lumpur. These decisions come from the current implementation and the accepted project requirements. “Planned” means a binding direction for future work, not a working component. Changes need an explicit task, rationale, affected contracts/data, migration plan, and updated verification; do not reverse them casually.

| ID | Decision | Current adoption and reason |
| --- | --- | --- |
| D01 | FastAPI backend | Implemented with an application factory, Pydantic schemas/settings and versioned routes. Keep a clear HTTP boundary and centralized safe errors. |
| D02 | React + TypeScript frontend | Implemented with strict compiler settings, React Router, TanStack Query, and Zod. Preserve typed presentation and runtime validation at the network boundary. |
| D03 | PostgreSQL with SQLAlchemy/Psycopg and Alembic | Configuration/session lifecycle and migration scaffolding exist. No domain tables or migration revisions exist; successful real PostgreSQL readiness is not locally verified. Do not substitute an in-memory database to declare PostgreSQL integration complete. |
| D04 | Forensic Intelligence identity | Implemented warm light ivory/charcoal/terracotta/olive theme. Tokens, branding, footer, documentation and screenshot assets agree. Preserve accessibility and professional workspace layout. |
| D05 | Real database-derived analytics only | Current dashboard returns explicit unconfigured/null/empty data. Future counts, trends and history must query actual persisted records; no production fake data or synthetic fallback. Unavailable is distinct from measured zero. |
| D06 | Controlled adaptive learning | Planned only. Feedback must be validated/moderated, datasets and models versioned, evaluation reproducible, and promotion explicit with rollback. Unreviewed community input must never trigger automatic training or deployment. |
| D07 | No automatic suspicious URL browsing | Current URL entry is an unsent memory-only draft. Future URL inspection must not automatically navigate to, fetch, or execute submitted targets. Any separately authorized retrieval system requires a reviewed network/SSRF safety design. |
| D08 | Genuine ML metrics only | No models, training code, dataset, predictions or evaluation metrics exist. Future metrics must come from documented reproducible experiments, with provenance and leakage-resistant splits. Heuristics and demonstrations must be labelled accurately. |
| D09 | Separate risk from confidence | Planned result-contract rule. Risk and strength of supporting evidence are different quantities; neither may be fabricated or substituted for the other. No current API field or UI score implements this decision. |
| D10 | Insufficient-information outcome | Planned explicit domain state for missing, unsupported or inconclusive evidence. It must not imply “safe.” It differs from current analysis-unavailable and network-error states; no assessment outcome exists yet. |
| D11 | Distinct liveness, readiness and capabilities | Implemented: health checks process liveness; readiness probes PostgreSQL; capabilities disables analysis. “API connected” is not proof of database readiness or a functioning detector. |
| D12 | Minimal navigation and honest unavailable behavior | Implemented routes `/` and `/analyse`, plus catch-all not-found handling. Keep only Overview and Analyse in navigation until more routes work. Drafting does not submit; no assessment has been made. |
| D13 | Privacy before content collection | Current drafts stay in component memory and are discarded on navigation/reload; there is no content persistence or submission. Future collection requires ownership/access, purpose, minimization, retention/deletion, consent/permitted use, and abuse decisions first. Full privacy controls are not implemented. |
| D14 | Preserve contracts during redesigns | Implemented visual migration retained backend and API/client behavior. Future functional contract evolution must be explicitly scoped and coordinated across schemas, tests, and docs. Never enable capabilities based solely on a frontend control. |
| D15 | Explicit task boundaries and honest evidence | Task 1 and its visual migration were delivered; the memory-handoff task added documentation only. No automatic Task 2 continuation. Preserve tests and historical evidence; record skips, unrun CI, environment limits and actual completion status. See D16 for the later deployment-preparation scope. |

### D16 — Task 1 deployment boundary (accepted 2026-09-03)

Task 1 now explicitly includes GitHub-safe local Git preparation and Vercel readiness for the existing React/Vite frontend. Deploy/import only `frontend`, with the approved Forensic Intelligence UI and a static SPA rewrite. No FastAPI deployment, framework switch, new authentication, database model or detection feature is part of this task. Blank/unset API configuration must remain safe through existing unavailable/error states without fake data. Actual PostgreSQL persistence is Task 2; live backend hosting and scam detection are later. Task 2 is paused. This scope clarification supersedes the earlier requirement to clear real PostgreSQL verification before completing the frontend foundation milestone; it does not claim the database works.

Local checks and configuration establish readiness, not an actual GitHub push, hosted URL or remote CI result. Those require the target repository/project and subsequent live verification. The baseline uses the existing configured Git author identity; no global identity or remote is overwritten.

### D17 — Usable Task 1 preview without a deployed API (accepted 2026-09-03)

The user reports the GitHub-connected Vercel frontend is deployed and explicitly requests a page-level resilience fix. Amend the earlier full-page request-error presentation only: failed dashboard/capabilities queries retain the approved unavailable Overview and memory-only Analyse interface with a visible safe error and retry. Initial pending states remain; submission stays disabled. No fake query data, metrics, history, capabilities or results are created. Keep the client, runtime validation, health badge, API contracts, environment defaults and backend unchanged. This does not establish a blanket fallback for future backend-required features.

Verification must cover successful responses, unreachable/non-JSON APIs, unavailable metrics instead of zero, independent health reporting, disabled submission/local draft privacy, retries, direct routes, and desktop/mobile behavior. Publish only after passing checks to the existing `main`; GitHub pushes are expected to trigger the user's connected Vercel deployment but do not prove hosted completion. PostgreSQL persistence and backend deployment remain paused Task 2 work.

### D18 — Restrained CSS motion within the approved design (accepted 2026-09-03)

The user approved short, controlled entrance and interaction motion while preserving Forensic Intelligence colors, typography, geometry, navigation and D17 offline behavior. Use existing CSS/Tailwind with shared durations/easing, primarily opacity/transform. No new animation dependency, timer loops, waiting for exit animations, constant decorative movement, or backend work. Persistent navigation and health queries must survive page transitions; disabled analysis remains disabled. Genuine pending activity alone may repeat a restrained indicator; successful health polls must not repeatedly pulse the badge.

Reduced motion disables scanning, pulses, entrance/positional interaction effects and delays without hiding state or compromising keyboard focus. Tests must verify both motion preferences, live preference changes during loading, touch behavior, finite settled animation, independent truthful connectivity, local drafts and offline preview resilience. This changes presentation only and does not authorize Task 2. Keep the settled design and API contracts intact.

### D19 — Four planned Analyse interfaces, no new capabilities (accepted 2026-09-04)

Task 1 exposes typed MESSAGE, URL, PHONE and QR presentation modes in the approved design. Phone and QR UI are complete only; all intelligence, phone reporting/reputation, QR decoding and URL/payment routing remain future work. Keep the existing capabilities/client/backend untouched and analysis disabled. A tab is not permission to submit to the API. Phone accepts natural international formats; normalization belongs to a future backend contract.

QR selection checks local MIME/extension/size metadata for one non-empty PNG/JPEG/WEBP up to 5 MiB. Display filename/size only; do not read image bytes, decode, render a preview, create object URLs, upload, persist or request camera access. This avoids unnecessary image processing in a UI milestone. Memory-only drafts and the selected file disappear on navigation/reload. Tests must preserve Message/URL behavior and verify keyboard/responsive/reduced-motion access, local file lifecycle and no analysis requests.

## Future decisions still required

The first Core Platform task must settle initial supported input scope, analysis lifecycle and result schema (including D09/D10), validation and limits, authentication/ownership, raw-content handling, retention/deletion, error semantics and migration boundaries. No choice of classifier, training corpus, inference provider, OCR library, queue, object store, backend deployment host, or campaign algorithm has been accepted or implemented merely by listing a future roadmap stage.

Keep future changes as dated entries that reference the decision being amended and explain compatibility, data/privacy implications, and the verification required. The current code remains authoritative for what runs; this document records what must guide authorized future development.
