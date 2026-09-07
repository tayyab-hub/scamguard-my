# Accepted decisions

Recorded: 2026-09-03, Asia/Kuala_Lumpur. These decisions come from the current implementation and the accepted project requirements. “Planned” means a binding direction for future work, not a working component. Changes need an explicit task, rationale, affected contracts/data, migration plan, and updated verification; do not reverse them casually.

| ID | Decision | Current adoption and reason |
| --- | --- | --- |
| D01 | FastAPI backend | Implemented with an application factory, Pydantic schemas/settings and versioned routes. Keep a clear HTTP boundary and centralized safe errors. |
| D02 | React + TypeScript frontend | Implemented with strict compiler settings, React Router, TanStack Query, and Zod. Preserve typed presentation and runtime validation at the network boundary. |
| D03 | PostgreSQL with SQLAlchemy/Psycopg and Alembic | Task 2 implements and verifies the `analyses` table through revision `0001_analysis_intake`, real readiness, explicit transactions and isolated PostgreSQL integration tests. Do not substitute an in-memory database for persistence evidence. |
| D04 | Forensic Intelligence identity | Implemented warm light ivory/charcoal/terracotta/olive theme. Tokens, branding, footer, documentation and screenshot assets agree. Preserve accessibility and professional workspace layout. |
| D05 | Real database-derived analytics only | Task 2 dashboard totals/latest/recent and history query persisted submissions. No production fake data or synthetic fallback. Unavailable is distinct from measured zero; risk-derived analytics remain unimplemented. |
| D06 | Controlled adaptive learning | Planned only. Feedback must be validated/moderated, datasets and models versioned, evaluation reproducible, and promotion explicit with rollback. Unreviewed community input must never trigger automatic training or deployment. |
| D07 | No automatic suspicious URL browsing | Task 2 may store a submitted URL as inert text but never navigates to, fetches or executes it. Any separately authorized retrieval system requires a reviewed network/SSRF safety design. |
| D08 | Genuine ML metrics only | No models, training code, dataset, predictions or evaluation metrics exist. Future metrics must come from documented reproducible experiments, with provenance and leakage-resistant splits. Heuristics and demonstrations must be labelled accurately. |
| D09 | Separate risk from confidence | Planned result-contract rule. Risk and strength of supporting evidence are different quantities; neither may be fabricated or substituted for the other. No current API field or UI score implements this decision. |
| D10 | Insufficient-information outcome | Planned explicit domain state for missing, unsupported or inconclusive evidence. It must not imply “safe.” It differs from current analysis-unavailable and network-error states; no assessment outcome exists yet. |
| D11 | Distinct liveness, readiness and capabilities | Implemented: health checks process liveness; readiness probes PostgreSQL; capabilities disables analysis. “API connected” is not proof of database readiness or a functioning detector. |
| D12 | Minimal navigation and honest unavailable behavior | Implemented routes `/`, `/analyse` and `/help`, plus catch-all not-found handling. Keep only Overview, Analyse and the functional Help & Support route in navigation until more routes work. Drafting does not submit; no assessment has been made. |
| D13 | Privacy before content collection | Task 2 permits non-sensitive Message/URL storage only in a disclosed private shared development dataset. Phone/QR drafts remain local. Public or sensitive collection still requires ownership/access, purpose, minimization, retention/deletion, consent/permitted use and abuse decisions. Full privacy controls are not implemented. |
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

### D20 — General product scope and Task 1 closure (2026-09-04)

Following supervisor feedback, SCAMGUARD is a general international platform, formally **SCAMGUARD: Multi-Modal Scam Detection & Reporting Web Application**. The earlier Malaysia-focused scope is historical. Remove visible MY/country positioning while preserving Forensic Intelligence design, architecture and historical records. Keep the existing GitHub repository and Vercel domain unchanged. Task 1 is complete; the supplied deployed preview is https://scamguard-my.vercel.app/. Task 2 is now explicitly authorized on task-2-core-platform, without automatic merge or Task 3 continuation.

## D21 — Task 2 is private shared development persistence (2026-09-04)

Accepted: store validated Message/URL content only for intake/history in one private development dataset. No authentication was requested; do not pretend UUIDs or CORS provide ownership/access control. Warn before submission and use only non-sensitive development content. A public backend is prohibited until authentication/authorization, ownership, consent, retention/deletion including backups, encryption and abuse controls are explicitly reviewed. No training reuse is authorized.

## D22 — Submission is separate from intelligence (2026-09-04)

**Historical Task 2 decision. D29/D30 and Alembic 0002 supersede it for MESSAGE; it still describes
URL behavior.**

Accepted: SUBMITTED means successfully validated and committed. Current APIs produce no other status, risk/confidence/verdict/evidence/model fields or result. PROCESSING/COMPLETED/FAILED enum values reserve a lifecycle vocabulary only; no worker/transitions exist. Future result fields require reviewed Alembic migrations rather than speculative nullable columns. Phone/QR remain UI-only.

Keep existing analysis_available:false and supported_inputs:[] for intelligence. Add independently verified submission_available/submission_inputs for MESSAGE/URL storage, gated by PERSISTENCE_ENABLED and an actual domain-table query. Legacy previews default missing submission capability fields to unavailable. True zero counts require a successful database query; flagged remains null.

## D23 — Storage, validation and retry boundaries (2026-09-04)

Accepted: PostgreSQL/SQLAlchemy/Psycopg with Alembic revision 0001_analysis_intake; UUID primary keys, timezone-aware timestamps, named enum/content CHECK constraints and descending created_at/id index. Explicit service commit and request rollback/close. Trim and validate Message/URL at the API boundary; body cap includes chunked uploads. URL validation performs no network access. History previews are minimized, not anonymized; full detail is on demand and React-escaped.

Writes are never automatically retried. A lost response after commit is ambiguous, so the UI instructs checking history before retrying. Idempotency, deletion/retention and public authentication are deliberately deferred and must not be claimed complete. Pagination is bounded offset pagination; concurrent inserts can move page boundaries.

## D24 — Isolated real database verification (2026-09-04)

Accepted: dedicated *_test PostgreSQL database for migration upgrade/downgrade/re-upgrade, schema comparison, insert/read/rollback and fresh-app persistence. These tests reset only their explicitly named disposable test database; never development or production. Browser flow uses a separate *_e2e database and genuinely persisted test submissions. Default offline/regression suites use persistence disabled and dedicated ports, never reuse an arbitrary developer server. Local runtime/credentials/data stay under ignored paths; no SQLite substitute or production seed data.

## D25 — Task 2 completion UX and Windows launcher (2026-09-05)

Accepted: the functional Help & Support route provides local FAQ search, safety/privacy guidance and a local feedback composer. A configured public `VITE_SUPPORT_EMAIL` may expose a mailto action; the app never claims delivery and collects no account. Message/URL feedback uses exact accessible client guidance while backend validation stays authoritative. Active health/package metadata is `scamguard-api`; the frontend temporarily accepts the former health identifier for rolling compatibility.

Windows development uses repository-relative PowerShell launch/stop scripts, thin double-click wrappers and trusted-workspace VS Code tasks. The launcher requires the existing portable PostgreSQL cluster and prepared dependencies, enables no global execution policy, runs Alembic explicitly, reuses only recognized services and refuses unknown port owners. Shutdown validates stored process identity, stops only launcher-owned application processes and cleanly stops the repository PostgreSQL cluster without deleting data.

## D26 — Task 2 closure and Task 3 branch boundary (2026-09-05)

Task 2 passed its full frontend, backend, real PostgreSQL and browser gates, then was merged to
`main` with a no-fast-forward merge (`425aab0`) and pushed. Task 3 is developed only on
`task-3-message-intelligence`, may be pushed for review, and must not be merged automatically. Main
Vercel remains a frontend preview; no public backend is authorized.

## D27 — Three-class licensed message dataset and leakage control (2026-09-05)

Use Mendeley Data DOI `10.17632/f45bkkt8pr.1`, version 1, under CC BY 4.0 for the first message model.
Preserve distinct ham→LEGITIMATE, spam→SPAM and smishing→SCAM labels. Retain immutable source and
checksums; remove conflicting normalized groups and exact duplicates before splitting; keep
near-duplicate clusters within one fixed-seed partition. Candidate choice uses validation only and
the test split remains untouched until final evaluation. No synthetic augmentation is included.

## D28 — Transparent local model artifact and genuine evaluation (2026-09-05)

The selected model is word 1–2 gram TF-IDF plus class-weighted Logistic Regression, version
`message-tfidf-logreg-v1`. It beat Linear SVM and Multinomial Naive Bayes on validation macro F1 and
was measured once on the untouched test split. Deploy a checksum-verified plain JSON artifact with
vocabulary/IDF/coefficients/intercepts rather than executable pickle/joblib serialization. Every
data, split, preprocessing, dependency or model change requires a new version and evaluation record.

## D29 — Conservative Message-specific hybrid decision contract (2026-09-05)

Every MESSAGE runs the local classifier and maintainable deterministic contextual rules. Fusion
outputs LOW, CAUTION, ELEVATED, HIGH or INSUFFICIENT_EVIDENCE, with risk score separate from
confidence. Evidence includes exact local snippets and component versions/status. Strong local
evidence cannot be reduced by an external model; external output without grounded evidence cannot
raise risk. Results are decision support and never absolute proof of safety or fraud. This fusion is
Message-specific and does not complete the future cross-modal Unified Risk Engine.

## D30 — Optional fail-safe backend AI review (2026-09-05)

External contextual review is optional, backend-only and disabled by default. When explicitly
enabled, ambiguous cases may use OpenAI Responses API structured output with the pinned
`gpt-5-mini-2025-08-07`, `store=False`, timeout, zero SDK retries and best-effort secret redaction.
Message text is untrusted data; the prompt forbids following instructions or browsing links.
Malformed, ungrounded, refused or failed output is recorded only as a safe status and never prevents
the local assessment. Store provider/model/status/contribution, not raw provider payload, secret,
debug detail or chain-of-thought. Enabling third-party review remains an explicit privacy/cost choice.

## D31 — Task 3 closure and main merge (2026-09-05)

Task 3 passed its recorded local, database, migration, browser and manual verification gates. Its
published feature history is accepted for a no-fast-forward merge into `main`. The optional external
AI adapter remains disabled by default and has not been live-provider verified; no paid request was
made. The merge does not authorize public backend deployment or Task 4 implementation.

## D32 — Task 4 offline URL intelligence (2026-09-07)

Task 4 is explicitly authorized on `task-4-url-intelligence`, based on remote-verified main at `7625a6f`. Preserve Message/Phone/QR boundaries and do not merge or begin Task 5. URL analysis is string-only: no DNS, HTTP GET/HEAD, webpage rendering, redirects, files, browser navigation or arbitrary-port contact. This supersedes D22's URL intake-only behavior. Future retrieval requires separately reviewed SSRF isolation and strict DNS/address/redirect/resource controls.

## D33 — URL normalization, suffixes and privacy

Centralize strict parsing in the URL domain. Pin tldextract 5.3.1 and its bundled snapshot with downloads/cache disabled and private suffixes included. Use IDNA/UTS46, preserve path/query escapes and a credential-redacted original, exclude fragments/userinfo from model input while retaining corresponding evidence, and remove userinfo before the first database write. General path/query secret anonymization is not claimed. No destination links are clickable.

## D34 — Licensed URL-only training and honest bias

Use the UCI PhiUSIIL CC BY 4.0 archive with source checksum, attribution and URL/label only. Validate, remove normalized duplicates/conflicts before splitting, and hold registrable-domain groups within one partition. Fixed seed 20260907; validation selects among three fixed classical candidates. The selected 120-tree random forest exports checksum-verified JSON as url_ml_v1. Domain-held-out macro F1 is 0.984698, but all legitimate training URLs are HTTPS homepages; source bias and residual cross-domain campaign overlap prohibit broad real-world accuracy claims. No webpage-derived or supplied reputation/similarity feature is used.

## D35 — URL-specific conservative fusion

Version parser/features/model/rules/fusion independently. url_fusion_v1 is an explicit categorical decision table, with no invented scam percentage. ML alone and accumulated weak evidence are capped at Caution. Related indicators count once by family; elevated/high requires meaningful corroboration or a validated attributed reputation signal. HTTPS never proves legitimacy. A missing/corrupt model is explicitly unavailable; rules still run, and a no-indicator case yields insufficient evidence.

## D36 — Reputation protocol without a live adapter

An injectable validated reputation interface is useful for testing future integration. Default DISABLED; no provider/key/network adapter exists, and no live request was made. Mocked success, timeout, error and invalid output preserve local results. Future fixed-endpoint backend adapters require strict transport timeouts, validated output, environment-only keys and deliberate privacy authorization. Historical retrieval never repeats analysis/provider work.

## D37 — Reuse neutral Task 3 result storage

No schema change is required: existing neutral result, audit/version/component JSON and completion fields hold URL results. Keep Alembic 0001 and 0002 byte-for-byte unchanged. URL rows use their own component versions; Message rows/metadata remain intact. New URL API and frontend schemas distinguish the two modalities, and URL details omit percentage risk displays. Package the URL JSON artifact for installed-backend deployments; URL_MODEL_PATH is an optional operator override. Local launchers remain development-only and the unauthenticated backend stays private.

## D38 — Task 4 accepted closure and main merge (2026-09-07)

Task 4 URL Intelligence is COMPLETE and manually accepted by the user. Closure, publishing the final feature-branch commit, a no-fast-forward merge into main and pushing main are explicitly authorized, superseding D32's review-only merge boundary. Closure changes documentation only; retain the existing verification evidence without rerunning Task 4 tests. Preserve the Task 4 branch and history, never force-push, and stop after verifying the merge and remote state. Task 5 has not started. No backend deployment is authorized; Git push success alone does not establish Vercel deployment success.
