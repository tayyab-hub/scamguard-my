# SCAMGUARD architecture

Audited 2026-09-07. Read `PROGRESS.md` for executed verification and `DECISIONS.md` for constraints. The product uses the warm-light Forensic Intelligence identity and a general international scope.

## CURRENTLY IMPLEMENTED

```text
React Router → AppShell → Overview / Analyse / Help / NotFound
  TanStack Query + Zod transport
    /api/v1
      FastAPI → safe request/error middleware → typed routes
        analysis service → local Message intelligence engine
          checksum-verified TF-IDF Logistic Regression artifact
          deterministic contextual indicators
          optional backend-only grounded external contextual review
          conservative Message-specific fusion
        SQLAlchemy/Psycopg → PostgreSQL → Alembic 0001 + 0002
```

### Frontend

React 18, TypeScript, Vite and Tailwind provide the responsive application. `AppShell` supplies the desktop sidebar, mobile navigation, skip link, focused route headings and titles. The design system centralizes the Forensic Intelligence tokens, short motion and `prefers-reduced-motion` behavior.

The four typed Analyse modes are Message, URL, Phone and QR. Message submits only when both storage and Message intelligence are advertised. It displays real risk, separate confidence, evidence, actions, components, versions and limitations returned by the API. URL validates, runs a separate offline URL classifier/evidence/fusion pipeline, and persists an assessment without destination access. Phone is a local text draft. QR keeps local file metadata only for one PNG/JPEG/WEBP up to 5 MiB; no bytes are read, decoded, uploaded or persisted. Phone/QR controls remain disabled for analysis.

Overview uses real database totals, flagged counts, latest time and recent records. A flagged record has stored `ELEVATED` or `HIGH` risk. Loading, unavailable, failure and genuine-empty states never fall back to fixtures. History retrieves persisted detail on demand and renders submitted URLs as inert text. Help and support preparation remain browser-local.

### Backend and local Message intelligence

FastAPI owns the `/api/v1` contract, request IDs, no-store/nosniff headers, exact-origin CORS, safe error envelopes and bounded bodies. SQLAlchemy sessions use explicit commits and rollback/close handling. PostgreSQL readiness checks both connectivity and the domain table when enabled.

Message processing is synchronous after durable intake. The checksum-verified JSON artifact contains a three-class word-ngram TF-IDF Logistic Regression model (`LEGITIMATE`, `SPAM`, `SCAM`); no pickle is loaded. Deterministic indicators cover urgency, threat, credentials, financial requests, impersonation, prizes, investments, job/tasks, delivery/account themes, secrecy, redirection and suspicious actions. Context rules suppress safety, education and negated examples.

Message-specific fusion keeps risk separate from confidence and returns `LOW`, `CAUTION`, `ELEVATED`, `HIGH`, or `INSUFFICIENT_EVIDENCE`. Strong local evidence has a floor. External AI cannot lower it or dominate the result; unsupported high AI signals are discarded. Short context-poor messages return insufficient evidence. Details and measured limitations are documented in `MESSAGE_INTELLIGENCE.md`.

Optional OpenAI contextual review is backend-only and disabled by default. When an administrator deliberately enables it and supplies a key, only ambiguous cases are considered. Best-effort redaction runs first, the message is treated as untrusted data, responses must match a Pydantic schema and evidence must be an exact redacted-message snippet. Provider errors become component status while local processing completes. No URL browsing or client-side key exists.

### Database and migrations

Alembic `0001_analysis_intake` creates the analyses table and constraints. Additive `0002_message_intelligence` preserves all Task 2 rows while adding nullable risk/confidence, summary, evidence/actions/components/limitations, component versions, AI metadata/status/contribution, completion time and safe failure code. Historical intake-only Message and URL rows remain valid with null results.

`AnalysisStatus` is `SUBMITTED`, `PROCESSING`, `COMPLETED`, or `FAILED`. Message and URL records normally complete. Historical intake-only records remain submitted. The composite newest-first index supports history. Dashboard flagged counts derive only from stored elevated/high risk values.

### Configuration, deployment and privacy

Backend settings load from `backend/.env` with process variables taking precedence. Persistence defaults off. `DATABASE_URL` requires `postgresql+psycopg`; production rejects missing/default passwords and non-HTTPS CORS. The model artifact path and optional AI settings are environment controlled; secrets use Pydantic `SecretStr` and are never returned.

Vercel serves only the frontend and remains safe without an API. The current unauthenticated backend is a private shared-development service with no ownership boundary. It must not be publicly hosted until authentication/authorization, purpose and consent, rate limiting, retention/deletion, encryption, abuse controls, and deployment logging are resolved. External redaction is best-effort and does not make sensitive data safe to submit.

## PLANNED ARCHITECTURE

Live URL reputation adapters and remote webpage inspection, phone normalization/reporting/reputation, screenshot/OCR, QR decoding and URL/payment routing, cross-modal unified risk, community moderation, controlled adaptive learning, campaign intelligence and Model Lab are not implemented. Suspicious URLs must never be automatically browsed. Community reports must not directly retrain or promote a model. Genuine metrics and held-out evaluation are required for every learned component.

Task 3 fusion applies only to Message evidence; it is not the planned cross-modal risk engine. A future queue/worker is also unselected and should be justified by measured latency or reliability needs rather than added speculatively.

## Task 4 URL domain

The service routes URL to `app/url_intelligence` and MESSAGE to the unchanged `app/ml` domain. URL parsing uses strict validation and pinned offline tldextract/IDNA; userinfo is removed before durable intake. The JSON random forest consumes 27 freshly derived local features; four detector groups produce explainable evidence. Separate `url_fusion_v1` prevents weak indicators or ML alone from producing High. An optional injectable reputation protocol defaults disabled; no network adapter exists.

Task 3 already added neutral persisted status/risk/summary/evidence/actions/component/version/completion fields, so no Task 4 schema migration is necessary. URL model/rules/fusion versions occupy the current row's audit columns; reputation and minimal analytical metadata use component JSON. No Message rows are rewritten. History reads stored results without re-running models/providers. Refer to URL_INTELLIGENCE.md for the exact parsing, privacy, no-fetch and future SSRF boundary.

## Post-Task 4 presentation layer

The UI refinement is frontend-only. lib/resultPresentation.ts maps existing stored assessments to documented display scores and severity-ordered evidence without mutating data or rerunning fusion. ResultPresentation.tsx owns shared hero, score, confidence, evidence, actions and native metadata disclosure; MessageResult/URLResult supply the modality-specific rows. Both new submissions and history pass the real analysis ID and completion time. URL API risk_score stays null; its ordinal index exists only in presentation. No backend, API schema, model, dataset or migration changed. See [UI_UX_REFINEMENT.md](UI_UX_REFINEMENT.md).
