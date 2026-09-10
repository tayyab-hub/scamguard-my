# SCAMGUARD architecture

Audited 2026-09-10. Read `PROGRESS.md` for executed verification and `DECISIONS.md` for constraints. The product uses the warm-light Forensic Intelligence identity and a general international scope.

## CURRENTLY IMPLEMENTED

```text
React Router → AuthProvider → public Sign In / Sign Up / Help
                            → protected AppShell / Overview / Analyse / Account
  TanStack Query + Zod credentialed transport + in-memory CSRF token
    /api/v1
      FastAPI → safe request/error middleware → typed routes
        auth service → Argon2id + opaque PostgreSQL sessions + DB rate limits
        owned analysis service → local Message intelligence engine
          checksum-verified TF-IDF Logistic Regression artifact
          deterministic contextual indicators
          optional backend-only grounded external contextual review
          conservative Message-specific fusion
                                  → local offline URL intelligence engine/artifact
                                  → local offline Phone numbering/rules engine
        SQLAlchemy/Psycopg → PostgreSQL → Alembic 0001 + 0002 + 0003 + 0004
```

### Frontend

React 19, TypeScript, Vite and Tailwind provide the responsive application. `AppShell` supplies the desktop sidebar, mobile navigation, skip link, focused route headings and titles. The design system centralizes the Forensic Intelligence tokens, short motion and `prefers-reduced-motion` behavior.

The four typed Analyse modes are Message, URL, Phone and QR. Message submits only when both storage
and intelligence are advertised. URL runs a separate offline classifier/evidence/fusion pipeline and
persists without destination access. Phone requires explicit international context, normalizes through
the shared API, and displays conservative offline numbering evidence without a numeric fraud score.
QR keeps local file metadata only for one PNG/JPEG/WEBP up to 5 MiB; no bytes are read, decoded,
uploaded or persisted, and QR analysis remains disabled.

Overview uses only the authenticated user's database totals, flagged counts, latest time and recent
records. A flagged record has stored `ELEVATED` or `HIGH` risk. Loading, unavailable, failure and
genuine-empty states never fall back to fixtures. History retrieves owned persisted detail on demand,
allows confirmed deletion and renders submitted URLs as inert text. Help and privacy remain public.

### Backend and local Message intelligence

FastAPI owns the `/api/v1` contract, request IDs, no-store/nosniff headers, credentialed exact-origin
CORS, safe error envelopes and bounded bodies. Argon2id protects passwords. Opaque session/CSRF
secrets are HMAC-digested in PostgreSQL, sessions expire/revoke, and Origin plus synchronizer-token
checks protect state changes. SQLAlchemy sessions use explicit commits and rollback/close handling.
PostgreSQL readiness checks connectivity and required domain/identity tables; startup verifies
Message, URL and Phone engine initialization.

Message processing is synchronous after durable intake. The checksum-verified JSON artifact contains a three-class word-ngram TF-IDF Logistic Regression model (`LEGITIMATE`, `SPAM`, `SCAM`); no pickle is loaded. Deterministic indicators cover urgency, threat, credentials, financial requests, impersonation, prizes, investments, job/tasks, delivery/account themes, secrecy, redirection and suspicious actions. Context rules suppress safety, education and negated examples.

Message-specific fusion keeps risk separate from confidence and returns `LOW`, `CAUTION`, `ELEVATED`, `HIGH`, or `INSUFFICIENT_EVIDENCE`. Strong local evidence has a floor. External AI cannot lower it or dominate the result; unsupported high AI signals are discarded. Short context-poor messages return insufficient evidence. Details and measured limitations are documented in `MESSAGE_INTELLIGENCE.md`.

Optional OpenAI contextual review is backend-only and disabled by default. When an administrator deliberately enables it and supplies a key, only ambiguous cases are considered. Best-effort redaction runs first, the message is treated as untrusted data, responses must match a Pydantic schema and evidence must be an exact redacted-message snippet. Provider errors become component status while local processing completes. No URL browsing or client-side key exists.

### Database and migrations

Alembic `0001_analysis_intake` creates the analyses table and constraints. Additive
`0002_message_intelligence` preserves all Task 2 rows while adding neutral result fields. Additive
`0003_auth_ownership` adds normalized users, hashed server-side sessions, hashed PostgreSQL rate
buckets and nullable `analyses.user_id`. Historical rows remain null and invisible; new application
writes always receive the authenticated user ID. User deletion cascades sessions and owned analyses.
Additive `0004_phone_intelligence` extends the input-type and per-type length checks for PHONE without
rewriting existing records. Accepted Phone drafts are stored in normalized E.164 form.

`AnalysisStatus` is `SUBMITTED`, `PROCESSING`, `COMPLETED`, or `FAILED`. Message and URL records
normally complete. Historical intake-only records remain submitted. The `(user_id, created_at DESC,
id DESC)` index supports private history. Dashboard totals and flagged counts are scoped by user.

### Configuration, deployment and privacy

Backend settings load from `backend/.env` with process variables taking precedence. Persistence
defaults off locally. Production requires PostgreSQL TLS, a non-default database password, a strong
auth pepper, at least one exact HTTPS CORS origin, persistence, and `Secure; SameSite=None` cookies.
Model paths and optional AI settings are environment controlled; secrets use `SecretStr` and are
never returned.

The user-verified production target is Vercel Vite → same-origin `/api/v1` CDN rewrite → Render
FastAPI → Neon PostgreSQL. Render receives secrets; Vercel uses public routing only. `render.yaml`
builds the backend and the single-instance
free-tier start script applies Alembic before Uvicorn. Message and URL artifacts are packaged JSON,
checksum-verified and never runtime-downloaded; Phone numbering metadata ships in the pinned Python
dependency. Task 6 does not change production configuration or deployment. See
[PRODUCTION_DEPLOYMENT.md](PRODUCTION_DEPLOYMENT.md),
[AUTHENTICATION.md](AUTHENTICATION.md), and [PRIVACY_MODEL.md](PRIVACY_MODEL.md).

## PLANNED ARCHITECTURE

Live URL reputation adapters and remote webpage inspection, Phone reputation/subscriber lookup,
screenshot/OCR, QR decoding and URL/payment routing, cross-modal unified risk, community moderation,
controlled adaptive learning, campaign intelligence and Model Lab are not implemented. Suspicious
URLs must never be automatically browsed. Community reports must not directly retrain or promote a
model. Genuine metrics and held-out evaluation are required for every learned component.

## Task 6 Phone domain

The service routes PHONE to `app/phone_intelligence` through the same authenticated analysis service.
The parser pins `phonenumbers==9.0.38`, requires `+` international context, rejects hostile/ambiguous
forms, and normalizes accepted values to E.164. The engine emits only supported bundled numbering
metadata and rules-based evidence. Premium/shared-cost metadata may produce CAUTION; all other
Phone-only cases conservatively report INSUFFICIENT_EVIDENCE. There is no Phone ML classifier,
probability, provider, destination access, call/message, identity lookup or reputation adapter.
History reads stored results without re-running parsing. See `PHONE_INTELLIGENCE.md`.

Task 3 fusion applies only to Message evidence; it is not the planned cross-modal risk engine. A future queue/worker is also unselected and should be justified by measured latency or reliability needs rather than added speculatively.

## Task 4 URL domain

The service routes URL to `app/url_intelligence` and MESSAGE to the unchanged `app/ml` domain. URL parsing uses strict validation and pinned offline tldextract/IDNA; userinfo is removed before durable intake. The JSON random forest consumes 27 freshly derived local features; four detector groups produce explainable evidence. Separate `url_fusion_v1` prevents weak indicators or ML alone from producing High. An optional injectable reputation protocol defaults disabled; no network adapter exists.

Task 3 already added neutral persisted status/risk/summary/evidence/actions/component/version/completion fields, so no Task 4 schema migration is necessary. URL model/rules/fusion versions occupy the current row's audit columns; reputation and minimal analytical metadata use component JSON. No Message rows are rewritten. History reads stored results without re-running models/providers. Refer to URL_INTELLIGENCE.md for the exact parsing, privacy, no-fetch and future SSRF boundary.

## Post-Task 4 presentation layer

The UI refinement is frontend-only. lib/resultPresentation.ts maps existing stored assessments to documented display scores and severity-ordered evidence without mutating data or rerunning fusion. ResultPresentation.tsx owns shared hero, score, confidence, evidence, actions and native metadata disclosure; MessageResult/URLResult supply the modality-specific rows. Both new submissions and history pass the real analysis ID and completion time. URL API risk_score stays null; its ordinal index exists only in presentation. No backend, API schema, model, dataset or migration changed. See [UI_UX_REFINEMENT.md](UI_UX_REFINEMENT.md).
