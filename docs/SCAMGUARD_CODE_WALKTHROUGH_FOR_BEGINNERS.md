# SCAMGUARD code walkthrough for beginners

This guide explains the implementation inspected on **28 October 2026**. Read it beside the source, then follow a request yourself. SCAMGUARD provides advisory evidence about suspicious content; it does not prove fraud, certify safety or identify a caller. Its implemented “reporting” is private analysis history. Public community reporting and adaptive learning remain future work.

The source comments explain responsibilities, inputs, decisions and limitations. They use ordinary comments so existing Python docstrings, FastAPI documentation and runtime introspection remain unchanged. [Code comment coverage](CODE_COMMENT_COVERAGE.md) records the inspected files and the checks actually executed for this documentation pass.

## Part 1 — Project folder structure

### The main boundaries

```text
frontend/                 Browser application, build configuration and browser tests
  src/                    React/TypeScript code, styles and component tests
  e2e/                    Foundation UI tests with explicit private-endpoint fixtures
  e2e-persistence/        Real API/PostgreSQL browser workflows
  e2e-preview/            Built application without a backend; worker/WASM checks
backend/
  app/                    FastAPI application and local intelligence engines
  migrations/             Versioned PostgreSQL schema changes
  scripts/                Training, evidence, deployment and test utilities
  tests/                  API, engine, security and PostgreSQL regression tests
data/                     Versioned research inputs, preparation and provenance
docs/                     Architecture, evaluation, historical evidence and this guide
  scripts/academic/       Historical report/figure generation utilities
scripts/                  Windows launcher helpers and their static checks
.github/workflows/        Continuous integration configuration
```

`node_modules`, `.venv`, `.local`, `dist`, test output and caches are local/generated material. Do not try to learn the project by editing them. JSON model artifacts are data consumed by inference, not files to annotate or manually adjust.

### Frontend map

| File or directory under `frontend/` | Responsibility and connection |
| --- | --- |
| `index.html`, `src/main.tsx` | HTML mount point, styles, React root and providers. |
| `src/app/App.tsx` | Route definitions; protected application pages and public authentication/Help routes. |
| `src/layout/AppShell.tsx` | Persistent navigation, account controls, page title/focus and route outlet. |
| `src/auth/AuthContext.ts`, `AuthProvider.tsx`, `ProtectedRoute.tsx` | Shared identity/actions, session restoration and route access experience. |
| `src/pages/AnalysePage.tsx` | Drafts, mode selection, validation, submission state and current result. |
| `src/pages/DashboardPage.tsx`, `HistoryPage.tsx` | Measured account activity and private filtered history. |
| `src/pages/AuthPage.tsx`, `PasswordResetPages.tsx`, `AccountPage.tsx` | Signup/login, recovery, editable profile and account deletion. |
| `src/pages/HelpPage.tsx`, `NotFoundPage.tsx` | Public guidance/search and unknown-route recovery. |
| `src/components/SubmissionHistory.tsx` | Summary rows, on-demand stored detail, deletion and eligible “Analyse again” drafts. |
| `src/components/analysis/` | Mode selector, image/camera inputs, Message/URL/Phone/QR results and shared result sections. |
| `src/components/ApiStatus.tsx`, `States.tsx`, `ErrorBoundary.tsx` | Independent connectivity, query/loading/error states and render-failure fallback. |
| `src/components/ModalDialog.tsx`, `DashboardDistribution.tsx` | Accessible confirmation dialogs and labelled links from measured distributions. |
| `src/components/Brand.tsx`, `PageHeading.tsx`, `PreviewNotice.tsx` | Shared identity, headings and the unavailable-analysis notice. |
| `src/lib/api.ts` | Runtime response schemas, credentialed HTTP transport, safe errors and endpoint helpers. |
| `src/lib/queries.ts` | TanStack Query hooks and account-scoped cache keys/invalidation. |
| `src/lib/submission.ts`, `profileValidation.ts`, `env.ts` | Local form checks and public configuration validation. |
| `src/lib/resultPresentation.ts` | Score meanings, evidence ordering and assessment type guards. |
| `src/lib/cameraScanner.ts`, `qrDecoder.ts`, `qrDecoder.worker.ts` | Camera lifecycle, decoder choice and local worker/WASM processing. |
| `src/styles.css` | Theme, component appearance, responsive rules, focus and reduced motion. |
| `src/test/`, `*.test.ts`, `*.test.tsx` | Controlled fixtures, rendering helpers and unit/component tests. |
| `vite.config.ts`, `playwright*.config.ts`, `eslint.config.js` | Development/build, test environments and static checking. |

### Backend map

| File or directory under `backend/` | Responsibility and connection |
| --- | --- |
| `app/main.py`, `app/__main__.py` | Construct the app, initialize resources, attach middleware/routes and launch the development server. |
| `app/core/config.py` | Typed settings and production configuration checks. |
| `app/core/auth.py` | Password helpers, session verification, CSRF/Origin checks and shared rate limiting. |
| `app/core/body_limit.py`, `errors.py` | Bound received request bytes and return consistent privacy-conscious errors. |
| `app/api/routes.py`, `schemas.py` | Health, readiness, capabilities and dashboard contracts. |
| `app/api/auth.py` | Account request/response schemas and signup/login/profile/recovery/session endpoints. |
| `app/api/analyses.py`, `analysis_schemas.py` | Authenticated analysis/history endpoints and validated request/response contracts. |
| `app/services/analyses.py` | Save intake/results, select engines, serialize records and perform owner-scoped history queries/deletion. |
| `app/services/mail.py` | Development mail capture or configured Resend password-reset transport. |
| `app/db/base.py`, `models.py`, `session.py` | ORM metadata, five table models and database connection/session lifecycle. |
| `app/ml/` | Message JSON classifier, deterministic rules, optional reviewer and final fusion policy. |
| `app/url_intelligence/` | URL parsing, 27 features, JSON classifier, rules, reputation interface and categorical fusion. |
| `app/phone_intelligence/` | Strict international-number parsing and conservative numbering-metadata assessment. |
| `app/qr_intelligence/` | Bounded image decoding, payload classification/redaction and payment integrity/routing. |
| `migrations/env.py`, `migrations/versions/` | Alembic connection setup and the six ordered schema revisions. |
| `scripts/train_*`, `prepare_url_dataset.py` | Offline model/data preparation; running these can rewrite research outputs. |
| `scripts/verify_url_pipeline.py`, `evaluate_message_reliability.py` | Frozen-pipeline reproduction and probability diagnostics without retraining. |
| `scripts/evaluate_final.py` | Generates release evidence and controlled demo outputs; separate from ordinary inference. |
| `scripts/start_production.py`, `prepare_e2e.py`, `scan_repository_secrets.py` | Migration-before-serve, disposable browser-test setup and credential scanning. |

At the root, `dev.ps1` and the Start wrapper launch local development; `stop-dev.ps1` and the Stop wrapper shut it down using recorded process ownership. `compose.yaml` offers PostgreSQL, `render.yaml` describes API hosting, and `frontend/vercel.json` supplies frontend hosting behavior. The package/lock files define dependencies; they are not application logic.

Read `README.md` for setup, `CODEX.md` for repository constraints, `PROGRESS.md` for current/historical evidence, `ROADMAP.md` for scope and `DECISIONS.md` for design rationale. Dates matter: an old milestone report is not a statement that those earlier limitations still describe the current release.

## Part 2 — How SCAMGUARD starts

### Browser startup

1. `frontend/index.html` provides `<div id="root">` and loads `src/main.tsx`.
2. `main.tsx` creates a `QueryClient`: queries have a 30-second stale window and automatic retries are disabled by default. A cache avoids needless repeated reads; it is not the PostgreSQL database.
3. React mounts `StrictMode`, `ErrorBoundary`, `QueryClientProvider`, `BrowserRouter`, `AuthProvider` and `App`. Each provider makes a shared service available to descendants. Development StrictMode can repeat lifecycle work to expose cleanup problems.
4. `AuthProvider` restores the session through `/auth/me`. The cookie accompanies the request automatically; the returned CSRF token stays in frontend memory. Loading and unavailable identity are explicit states.
5. `App` matches the current URL. `ProtectedRoute` handles the signed-out/loading experience; the API independently checks identity and ownership. Lazy pages use `Suspense` while their code loads.
6. `AppShell` retains navigation around the route outlet and manages page metadata/focus. `DashboardPage` uses query hooks to request measured account data.

During development, Vite proxies `/api` to the local backend. The deployed architecture uses the frontend's same-origin `/api/v1` rewrite to the API host. Same-origin here means the browser addresses its own site's API path; the server-side hosting rewrite performs the onward connection.

### API startup

`backend/app/__main__.py` starts Uvicorn. Uvicorn is the HTTP/ASGI server; FastAPI defines what requests mean. `main.py:create_app` creates settings, middleware and routers. Its `lifespan` context creates the database engine/session factory, Message/URL/Phone/QR engines and mail service, stores them on `app.state`, and disposes database resources at shutdown.

SQLAlchemy's engine manages connections; constructing it is different from proving that the database can answer a query. Models are loaded into metadata, but startup does not call `create_all`. Production `scripts/start_production.py:main` applies Alembic migrations before starting Uvicorn. Local `dev.ps1` also applies migrations before launching the servers.

The middleware assigns request IDs, applies response/security/cache headers and catches unexpected failures without exposing raw exception details. `BodyLimitMiddleware` also counts streamed body bytes; trusting only a client-provided length would miss chunked/incorrectly labelled requests. CORS allows configured browser origins but does not replace authentication or CSRF.

### Three different status questions

| Endpoint under `/api/v1` | What it answers |
| --- | --- |
| `/health` | Is this API process responding? It is not proof of database readiness. |
| `/ready` | Are required engines available and, when persistence is enabled, can PostgreSQL respond with the expected tables? |
| `/capabilities` | Which submission/analysis features can the UI offer under this configuration? |

A URL engine can give rules-only output when its classifier is unavailable, while readiness still requires the expected classifier. Do not collapse these different contracts into one “everything works” indicator.

## Part 3 — What happens when a user clicks Analyse

Follow these concrete entry points: [AnalysePage](../frontend/src/pages/AnalysePage.tsx), [query hooks](../frontend/src/lib/queries.ts), [API transport](../frontend/src/lib/api.ts), [analysis routes](../backend/app/api/analyses.py), [analysis service](../backend/app/services/analyses.py).

```mermaid
sequenceDiagram
    actor User
    participant Page as AnalysePage
    participant HTTP as api.ts / FastAPI
    participant Service as services/analyses.py
    participant DB as PostgreSQL
    participant Engine as Selected intelligence engine
    User->>Page: Edit draft, then submit
    Page->>Page: Validate mode/input; show pending state
    Page->>HTTP: POST with session cookie and CSRF
    HTTP->>HTTP: Validate body, session, Origin and rate budget
    HTTP->>Service: Validated content + authenticated user ID
    Service->>DB: Commit SUBMITTED, then PROCESSING
    Service->>Engine: analyse(content)
    Engine-->>Service: Evidence, advisory result, limitations
    Service->>DB: Commit COMPLETED result or FAILED code
    Service-->>HTTP: Serialize saved record
    HTTP-->>Page: Validated response
    Page->>Page: Render result; invalidate private activity/history cache
```

### A Message submission, step by step

1. `AnalysePage` keeps separate mode drafts with `useState`. Typing updates local state. Changing tabs preserves the other drafts; it does not submit them. Example buttons also fill drafts without making analysis requests.
2. Its submit handler checks input and advertised capabilities. `submissionError` provides immediate field feedback. A disabled button improves usability, but does not secure an endpoint.
3. `useSubmitAnalysis` invokes `postSubmission`. Message, URL and Phone use `POST /api/v1/analyses` with `input_type` and `content`.
4. `requestApi` serializes JSON, includes cookies, attaches the in-memory CSRF token, applies cancellation/timeout handling and validates the returned JSON with Zod. A TypeScript interface alone cannot validate bytes received from a server.
5. FastAPI resolves dependencies and Pydantic validation around `create_analysis`. Storage must be enabled; the authenticated session, exact Origin and CSRF value must pass. The shared rate limiter charges the authenticated user's analysis budget. The body cannot choose another owner.
6. `record_submission` creates an `Analysis` with that trusted `user_id`. Message content is validated/trimmed; URL storage removes userinfo credentials, and Phone storage uses E.164 formatting.
7. It commits the intake as `SUBMITTED`, commits `PROCESSING`, then calls the selected engine synchronously. There is no background job queue. Separate commits retain the accepted intake if later work fails, but an interrupted process can leave an unfinished row.
8. A successful result fills risk/confidence, evidence, recommendations, component versions and completion time. An engine exception produces `FAILED` and a safe failure code. Logging uses identifiers and exception type rather than submitted content or raw exception text.
9. The final commit and `refresh` retrieve persisted values. `detail` builds the response. The browser renders the appropriate result component and refreshes affected account cache entries.

An analysis request has a 45-second client timeout; ordinary reads use eight seconds. A timeout/lost response does **not** prove that the database write failed. There is no idempotency key here: repeating a submission can create a second record. The UI therefore advises checking history before retrying and does not automatically retry writes.

### The two QR paths

| User action | Request | Server work before persistence |
| --- | --- | --- |
| Choose an image and click Analyse QR | Multipart `POST /analyses/qr` | Authenticate, enforce limits, validate actual image bytes, decode one QR, then save/assess its payload. |
| Start camera, review decoded text, click Analyse | JSON `POST /analyses/qr/payload` | Validate the submitted text/decoder identifier and construct client-reported camera provenance. The server has no camera image to verify. |

`record_qr_submission` saves credential-redacted text but passes the original decoded payload to the QR engine for routing and integrity checks. An invalid upload fails before a record is created. Neither path stores original image bytes in PostgreSQL.

### Returning to history

`useHistory` requests paginated summaries. `SubmissionHistory` calls `useAnalysisDetail` only for opened detail. `get_submission` and `detail` return the **stored** assessment; they do not run the model again. This preserves the original decision and its versions.

Search uses `POST /analyses/search`, keeping the phrase out of request URLs and requiring CSRF. It is still private request data, so this does not eliminate every possible logging exposure. The service combines owner, text, mode and risk filters; `%`, `_` and escape characters are treated literally in text matching. A repeatable-read transaction keeps the count and page rows on the same snapshot. Sorting by creation time plus UUID provides a stable tie-breaker; pages are bounded.

Deleting a record checks the same ownership boundary, commits the deletion and invalidates cached detail/history/dashboard data. “Analyse again” for supported text modes copies content to a new draft; it never modifies the old result. QR requires another scan/upload because its image was not retained and saved redacted text may no longer be the original payment instruction.

## Part 4 — Understanding each intelligence engine

### Message: learned text patterns plus explicit evidence

Open `app/ml/classifier.py`, `rules.py`, `fusion.py`, then `engine.py`.

`MessageClassifier` loads checksum-verified JSON rather than executable pickle data. Inference normalizes accents/case, extracts word tokens of at least two characters and builds unigrams/bigrams. A unigram is one token; a bigram is a pair of adjacent tokens.

TF-IDF turns recognized terms into a sparse numerical vector. Sublinear term frequency uses `1 + log(count)` so ten repetitions are not ten times as influential as one. IDF weights terms using training-corpus statistics. L2 normalization scales the whole vector to unit length. Unknown terms have no learned feature weight; `matched_features` counts the recognized vector entries.

The exported Logistic Regression model computes one weighted sum plus intercept per class. A numerically stable softmax subtracts the largest logit before exponentiation and produces class probabilities summing to one. The classes are **LEGITIMATE, SPAM and SCAM**. Spam is not automatically a scam, and a model probability is not a measured probability that a particular real-world interaction causes fraud.

`rules.py` separately checks social-engineering indicators. Its normalization handles invisible separators and selected obfuscation while retaining mappings back to original snippets. Protective wording is interpreted in context: “never share your OTP” differs from a request to send it. Simply adding the word “warning” does not suppress a harmful request. Rules are authored logic, not a second trained model.

`fusion.py:fuse` combines the outputs using the existing versioned policy:

| Step | Current behavior and reason |
| --- | --- |
| Model signal | `min(1, P(SCAM) + 0.35 × P(SPAM))`; no matched vocabulary sets this signal to zero. |
| Evidence sufficiency | With rule score below `0.25`, abstain for zero matched features, fewer than three words with `P(SCAM) < 0.75`, or model confidence below `0.55`. |
| Local score | `0.52 × model_signal + 0.48 × rule_score`. These are policy weights, not learned calibration. |
| Strong-rule floor | Rule score at least `0.72` with at least three indicators preserves a score of at least `0.72`. |
| Rules with no vocabulary | If sufficient to avoid abstention, rules can still warn; the policy floor is `0.20` and numerical confidence remains unavailable. |
| Optional reviewer | Grounded accepted output with confidence at least `0.55` may add at most `0.18 × max(0, reviewer_signal − local_score)`; it cannot lower the local score. |
| Unsupported model escalation | With no rule indicators and no actual reviewer contribution, cap a score at `0.4199` if it would reach Elevated. |
| Categories | Below `0.20`: LOW; below `0.42`: CAUTION; below `0.65`: ELEVATED; otherwise HIGH. Abstention is separate and has null scores. |

Confidence is calculated separately from model confidence and evidence strength. Model/rule disagreement caps it below the medium threshold; zero matched vocabulary makes it null. A serious warning with low confidence is possible because strong indicators and uncertainty about the classification can coexist.

`engine.py` orchestrates the classifier, rules, optional reviewer, fusion and user-facing evidence/actions. The optional reviewer is considered for ambiguous/conflicting local signals. `ai_review.py` performs best-effort redaction and validates a structured response with grounded snippets. Missing configuration, timeout or invalid provider output leaves a local result with an honest component status. Provider output is untrusted.

Training is separate. `scripts/train_message_model.py` checks source provenance, removes exact duplicates/conflicts and keeps near-duplicate groups together across fixed splits. Its NFKC/casefolded duplicate key is distinct from the vectorizer's accent-stripping preprocessing. Candidate selection uses validation macro-F1; the accepted Logistic Regression pipeline is refit on train plus validation before frozen test evaluation. No request retrains it.

Limitations include corpus coverage, language/domain shift, adversarial wording, uncalibrated probabilities and imperfect protective-context rules. A held-out benchmark is evidence about that dataset and split, not a guarantee for all new messages.

### URL: structure without visiting the destination

Open `app/url_intelligence/parsing.py`, `features.py`, `classifier.py`, `rules.py`, `fusion.py`, `engine.py`.

`parse_url` accepts supported HTTP(S) input, rejects unsafe control/malformed forms, normalizes internationalized hostnames with IDNA and uses a bundled public-suffix snapshot. It does not resolve DNS or download the page. A registrable domain separates the site identity from arbitrary subdomains: a brand word in a long subdomain is not evidence that the brand owns the destination.

The parser distinguishes a redacted stored representation from the normalized analysis representation. Userinfo credentials are removed, but a structural marker preserves evidence that credentials were present. Paths/query strings can still contain sensitive values; userinfo removal is not universal URL anonymization.

`features.py` produces **27 ordered numeric lexical/structural features**. Order matters because the model's feature indexes refer to those positions. The checked JSON artifact contains a **120-tree Random Forest** with maximum depth 12. The runtime follows each tree's threshold decisions and averages leaf class probabilities. Float32-compatible comparisons preserve parity with exported training behavior. A compatibility branch also supports an older linear artifact shape; it does not mean the checked model is linear.

Rules describe observations as CONTEXT, WEAK or MEANINGFUL and group related indicators into families. Unicode/punycode or a fragment alone is not treated as malicious. A limited brand list cannot recognize every possible impersonation.

`fuse` returns categories, not a numerical URL risk score:

- An accepted malicious reputation verdict yields HIGH; the normal builder has no configured live reputation adapter.
- Two or more meaningful families yield ELEVATED, or HIGH when the model also predicts PHISHING with confidence at least `0.90`.
- One meaningful family plus that strong model signal yields ELEVATED.
- Other non-context evidence, a PHISHING prediction or model confidence below `0.75` yields CAUTION.
- With no warning, a present model permits LOW; with no model it returns INSUFFICIENT_EVIDENCE.

The frontend maps LOW/CAUTION/ELEVATED/HIGH to **0/33/67/100 category indexes**. This is an ordinal display scale. It is not `P(fraud)`, and it is not comparable with Message points. The backend URL `risk_score` remains null.

Offline structure cannot show page contents, redirects, certificate behavior, current reputation or what happens after login. `prepare_url_dataset.py` groups data by registrable domain to reduce leakage; `train_url_model.py` selects the validation winner, and `verify_url_pipeline.py` checks the frozen export without training. Do not assume the training script's `--verify` is read-only: it still fits and writes outputs.

### Phone: numbering metadata, not caller identity

Open `app/phone_intelligence/parsing.py` and `engine.py`. Input must explicitly include `+` and an international country calling code. The parser accepts bounded ASCII formatting, balanced parentheses and 7–15 digits; it rejects ambiguous local-only numbers and normalizes supported input to E.164.

Bundled `phonenumbers` metadata distinguishes a *possible* length from a *valid* numbering pattern and reports number type/region information. These do not establish ownership, current assignment, caller ID authenticity or intent.

Valid premium-rate/shared-cost numbers receive CAUTION for potential cost. Other cases remain INSUFFICIENT_EVIDENCE, including ordinary valid numbers and invalid patterns. Numerical risk and confidence are null. There is no trained Phone fraud model, call, message, subscriber lookup or live reputation lookup.

### QR: a carrier whose content needs its own assessment

Open `app/qr_intelligence/decoder.py`, `engine.py`, `payment.py` and the frontend camera files.

Upload validation checks file size (5 MiB maximum), actual PNG/JPEG/WebP format against declared MIME, dimensions (at most 4096 per side and 16 million pixels), non-animation and image integrity. Decoding uses a reopened image converted to pixels, without treating metadata as instructions. Exactly one readable QR is required. Decoded UTF-8 text is bounded to 5,000 bytes and checked for unsupported control characters. A byte limit differs from a character limit: many Unicode characters need multiple bytes.

`classify_payload` identifies payment, URL, Phone, email, SMS, Wi-Fi, geographic, other-scheme and text payloads. Compatible URL/Phone/text content routes to existing engines; sufficiently substantial text uses Message analysis (20 characters or at least three words). Unsupported structured instructions are described conservatively and never executed. Decoding a QR is not evidence that its destination or payment recipient is trustworthy.

`payment.py` parses selected EMV-style tag-length-value fields. A TLV stores an identifier, declared byte length and value. The parser bounds nested parsing, checks malformed/duplicate structure and verifies a final `63` CRC field using CRC-16/CCITT. CRC detects inconsistent bytes; an attacker can calculate a valid CRC too. The code does not validate every EMV requirement or prove merchant identity, payment-network acceptance or authorization.

Valid payment-only data remains INSUFFICIENT_EVIDENCE. Invalid payment integrity imposes at least CAUTION; routing must not downgrade a stronger underlying warning. Known URL userinfo and Wi-Fi password fields are redacted in saved content; payment URL userinfo is also covered. These targeted rules cannot guarantee removal of every arbitrary secret. The original text is assessed before redaction changes its bytes, so saved payment text may no longer be a valid CRC-bearing instruction.

Camera flow is different from upload. `QrCameraInput` starts only after an explicit user action. `CameraScanner` requests video without audio, bounds frame size, scans sequentially, and ends idle sessions after 90 seconds. `qrDecoder` prefers supported native decoding and otherwise starts a same-origin worker with bundled WASM. Frames remain in the browser. Closing, switching, detection, errors and late permission/decoder completion must clean up tracks, timers, worker and pixels. A decoded payload is shown for review; a separate Analyse action submits text.

**External-review nuance:** `build_qr_engine` receives the same configured `MessageIntelligenceEngine` used for Message input. QR text routed there can reach its optional reviewer when enabled and eligible. Default-disabled AI, local image decoding and on-device camera frames do not justify saying that QR-derived text can never reach a provider. Describe this distinction when explaining privacy. No behavior was changed in this documentation pass.

## Part 5 — Authentication and security

### Signup, login and sessions

`api/auth.py` validates/normalizes names, usernames and email. Passwords use `SecretStr` in request schemas to reduce accidental representation leaks; that is not encryption. `core/auth.py` hashes the raw password with Argon2id. Verification checks a candidate against the stored hash; the original password is not recovered.

After signup/login, `set_auth_cookie` creates a random opaque session token. Its HMAC-SHA256 digest, calculated with the configured pepper, is stored in `auth_sessions`; the raw credential goes to an HttpOnly cookie. HttpOnly stops JavaScript from reading that cookie directly, but does not make injected scripts harmless. Secure and SameSite attributes, HTTPS, safe rendering and server checks have separate roles.

`require_authenticated_session` hashes the presented cookie, loads the stored session/user and rejects revoked/expired sessions. Authentication answers **who is signed in**. Authorization answers **whether that user may access this record**. A UUID makes identifiers hard to guess; the `user_id` predicate actually enforces ownership.

Login applies a source budget before expensive password work and an account budget shared by username/email aliases and source addresses. Unknown users receive dummy password verification work and generic invalid-credential errors. This reduces simple enumeration/timing differences; it does not prove perfectly equal timing. The database rate limiter uses a hashed bucket key and a PostgreSQL advisory transaction lock so concurrent workers share the same counter safely. A rejected request can still commit its increment and return bounded retry guidance.

### CSRF and account transitions

Browsers automatically send cookies, which creates a risk of unwanted requests initiated from another site. Protected mutations require both an allowed exact Origin and a session-derived CSRF token in `X-CSRF-Token`. The token uses a separate derivation domain and remains stable for the session, so opening a second tab does not invalidate the first tab's token. Missing/untrusted Origin is rejected where required. CORS is a browser response-access policy, not a replacement for these checks.

Frontend `AuthProvider` clears private query data across identity changes. Cache keys include user identity; cross-tab notification and revision checks prevent old restoration/401 responses from overriding newer state. A failed logout is not presented as confirmed server revocation. `ProtectedRoute` helps navigation, while the API remains authoritative even if someone directly crafts requests.

Logout revokes the current session before clearing its cookie. Successful password reset revokes all sessions. Account deletion requires the current password plus session/CSRF checks and commits the user deletion; PostgreSQL cascades remove its owned records, sessions and reset tokens.

### Password recovery

`request_password_reset` returns the same acknowledgement for known and unknown addresses. For an existing user it consumes old unused reset tokens, stores a fresh expiring digest and commits before asking the mail service to deliver the raw-token link. Delivery failure receives a privacy-safe log and generic public response. API success is not proof that an email arrived in an inbox.

`confirm_password_reset` locks the matching row with `SELECT ... FOR UPDATE`, checks expiry/use, hashes the new password, consumes reset tokens and revokes sessions in one commit. The lock prevents two simultaneous requests from successfully consuming the same token. The browser captures the reset token in memory and removes it from its visible URL; this reduces later exposure but cannot erase any earlier request/history/log exposure.

### Other boundaries and their limits

Pydantic rejects invalid/extra request fields; SQLAlchemy binds query values instead of building SQL from content; image/request limits bound parsing work; React renders submitted evidence as text; error handlers avoid returning tracebacks. Redaction is targeted and best effort. Local-only URL/Phone analysis does not require visiting a suspicious destination. No individual control proves the whole application completely secure, and these local checks do not re-verify hosting or physical devices.

## Part 6 — Database explained

The [models](../backend/app/db/models.py) describe five PostgreSQL tables. A Python model class declares fields and constraints; an instance represents one row. SQLAlchemy maps operations on those objects to SQL.

| Table | Key and purpose | Connection |
| --- | --- | --- |
| `users` | UUID primary key, identity/profile fields and password hash | Parent of owned analyses, sessions and reset tokens. |
| `auth_sessions` | UUID primary key, token/CSRF digests, expiry and revocation/use timestamps | `user_id` foreign key with delete cascade. |
| `password_reset_tokens` | UUID primary key, token digest, expiry and use timestamp | `user_id` foreign key with delete cascade. |
| `auth_rate_limits` | Hashed bucket key, scope, window start and counter | Shared budget storage; not a user relationship table. |
| `analyses` | UUID primary key, input/status/content, result/audit fields and timestamps | Nullable legacy `user_id`; new submissions receive the authenticated owner. |

A primary key uniquely identifies a row. A foreign key requires the referenced user to exist. `ON DELETE CASCADE` asks PostgreSQL to remove dependent rows when a user is deleted. The application uses explicit queries rather than ORM `relationship()` attributes; the absence of those attributes does not mean the database has no relationships.

UUIDs are identifiers, not permissions. Timezone-aware timestamps avoid interpreting the same stored instant as different local times. JSON fields store structured evidence, recommendations and component details; they are data snapshots, not executable model objects.

`db/session.py:get_session` supplies a request-scoped SQLAlchemy session. A session tracks pending ORM work and its current database transaction. `add` registers a new object; `flush` sends SQL without making it durable; `commit` makes the transaction durable; `rollback` cancels uncommitted changes. Closing the session releases its resources. `expire_on_commit=False` permits access to committed object attributes, while the analysis service explicitly refreshes finalized records.

History uses owner-scoped `select`, count, ordering, limit and offset. Filtering and counting happen in PostgreSQL rather than fetching everyone’s submissions into Python. Old rows with `user_id = NULL` are not silently assigned to the current user and remain invisible to ordinary owned queries.

### Schema history

| Revision | Why it exists |
| --- | --- |
| `0001_analysis_intake` | Original Message/URL intake table and constraints. |
| `0002_message_intelligence` | Nullable assessment/audit columns compatible with older intake rows. |
| `0003_auth_ownership` | Users, sessions, rate limits and nullable analysis ownership. |
| `0004_phone_intelligence` | Extend allowed input types to PHONE. |
| `0005_auth_profile_polish` | Nullable profile fields, unique username and password-reset tokens. |
| `0006_qr_intelligence` | Extend allowed input types to QR using shared result storage. |

Alembic follows `revision`/`down_revision` and records the applied version. `upgrade` moves forward; `downgrade` may discard data or fail if newer rows violate older constraints. For example, an older type constraint cannot accept existing QR rows. Migration round-trip tests therefore use cleared, explicitly disposable `_test` databases. Never use that reset procedure on a personal/deployed database. This pass added ordinary explanatory comments without changing migration identifiers, docstrings or operations.

## Part 7 — Important programming concepts in this code

| Concept | Concrete example | How to reason about it |
| --- | --- | --- |
| Function | `parse_url(text)` | Takes an input and returns a result or raises an error; inspect both the signature and callers. |
| Class/object | `Analysis`, `CameraScanner` | A class describes state/behavior; an instance represents one record or one scanning lifecycle. |
| Dataclass | `FusionResult` | A typed bundle of output values passed between layers without unrelated responsibilities. |
| Dictionary | Message class probabilities | Keys name values. Check expected keys/units before treating a number as a score. |
| Type/union/interface | `InputType`, frontend assessment types | Restrict allowed shapes at development time; external JSON still needs runtime validation. |
| Schema validation | Pydantic and Zod | Turn an external shape into a checked contract or a controlled error. Validation does not establish truth of the content. |
| API route | `@router.post(...)` | Connect a method/path to a handler, dependencies and response contract. |
| HTTP methods | GET detail, POST analysis/search, PATCH profile, DELETE account | Methods describe the operation; POST search is read-only business logic with a private body and CSRF requirement. |
| Dependency injection | `Depends(get_session)`, `Depends(require_csrf)` | FastAPI obtains shared prerequisites and supplies them to the handler; tests can substitute dependencies. |
| Component/props | `MessageResult assessment={...}` | A component renders an interface; props pass inputs from its parent. Rendering should not resubmit analysis. |
| `useState` | `AnalysePage` drafts | Retains local values across renders; setting state requests another render rather than immediately editing the DOM. |
| `useEffect` | Auth restoration/camera cleanup | Synchronizes with external resources after rendering; cleanup prevents stale work or leaked media. |
| `useRef` | Camera/session references | Keeps a mutable handle across renders without causing a render whenever the handle changes. |
| Event handler | Submit/change/click callbacks | Runs in response to an interaction; controlled inputs update state through these callbacks. |
| Promise | A pending `fetch` result | Represents eventual completion or failure. It is not the response value until resolved. |
| Async/await | `requestApi` | Waits for asynchronous completion without blocking browser interaction; `try/catch/finally` handles errors and cleanup. |
| Cancellation | `AbortController`, scan generation checks | Stops work or ignores stale results; already committed server work cannot be undone by aborting the client. |
| Query/mutation | TanStack Query hooks | A query caches fetched data; a mutation performs an operation and invalidates affected cached reads. |
| Exception boundary | FastAPI errors, React `ErrorBoundary` | Different boundaries cover different failures. React render boundaries do not automatically catch asynchronous query errors. |
| Transaction | Reset confirmation/history snapshot | Groups database work with defined consistency/commit rules; a function call is not automatically one atomic transaction. |
| Hash/checksum | Password, session digest, artifact SHA-256 | These have different purposes: slow password verification, protected credential lookup and artifact identity. None is interchangeable with reversible encryption. |
| Test fixture | `auth_client`, `renderApp` | Sets up controlled state and cleanup so a test isolates a specific contract. Always identify what is real and what is mocked. |

A useful reading habit is to annotate a call with four questions: **what enters, what leaves, what changes, what can fail?** For `record_submission`, the inputs include an authenticated owner; the return is saved detail; the side effects are commits; failures can leave a recorded failed/unfinished intake. This reasoning is more useful than memorizing its lines.

## Part 8 — Navigate the code during a presentation

Use synthetic examples and explain the evidence boundary before quoting a result. The following order traces one coherent request rather than jumping between unrelated files.

| Order | Open this exact file/symbol | Demonstrate or explain |
| --- | --- | --- |
| 1 | `frontend/src/main.tsx`, `app/App.tsx:App` | Providers, routing and where the application begins. |
| 2 | `frontend/src/pages/AnalysePage.tsx:AnalysePage` | Local drafts, explicit submission and pending/error states. |
| 3 | `frontend/src/lib/queries.ts:useSubmitAnalysis`, `api.ts:postSubmission`, `requestApi` | Typed request transport, cookies/CSRF and cache invalidation. |
| 4 | `backend/app/api/analyses.py:create_analysis` | Input schema, injected dependencies and trusted owner identity. |
| 5 | `backend/app/services/analyses.py:record_submission` | Durable intake, synchronous engine dispatch and saved results. |
| 6 | `backend/app/ml/classifier.py:MessageClassifier.predict`, `ml/fusion.py:fuse` | Learned class probabilities versus the final evidence-aware warning. |
| 7 | `backend/app/url_intelligence/fusion.py:fuse` | Independent evidence families and why a URL category index is not a probability. |
| 8 | `backend/app/phone_intelligence/engine.py:PhoneIntelligenceEngine.analyse` | Valid numbering metadata still leads to uncertainty about intent. |
| 9 | `backend/app/qr_intelligence/engine.py:classify_payload`, `QRIntelligenceEngine.analyse` | QR routing, redaction, integrity floors and optional Message reviewer nuance. |
| 10 | `frontend/src/lib/cameraScanner.ts:CameraScanner`, `qrDecoder.ts:createQrDecoder` | Explicit camera start, local decoding and cleanup; review before submission. |
| 11 | `backend/app/core/auth.py:require_authenticated_session`, `require_csrf`; `api/auth.py:confirm_password_reset` | Session proof, CSRF/Origin and one-use reset transaction. |
| 12 | `backend/app/db/models.py:Analysis`, `services/analyses.py:list_submissions`, `get_submission` | Owner-scoped persisted history; no inference on ordinary reads. |
| 13 | `frontend/src/lib/resultPresentation.ts:riskScorePresentation` | Message points, URL category indexes and null scores remain distinct. |
| 14 | `backend/tests/test_auth.py`, `test_persistence.py`; `frontend/e2e-persistence/qr.spec.ts` | Locate the named test corresponding to the claim, then explain its assertions and setup. |

Source explains how a feature is implemented; passing tests provide evidence for specific observed contracts. Foundation browser tests mock private endpoints. Persistence browser tests use real PostgreSQL. The built worker test proves asset/worker operation with blank pixels; camera persistence tests decode a generated QR through a canvas video stream. None of these alone proves physical Android/iOS camera acceptance, email delivery or current production health.

## Part 9 — Thirty capstone viva questions

1. **What is the application actually predicting?** Message predicts three dataset classes; URL predicts a learned URL class. Final advisory categories also use evidence and uncertainty rules. Phone/QR structural checks are not independent trained fraud classifiers.
2. **Why separate React, API routes, services and engines?** React manages interaction, routes enforce HTTP contracts/security, services own persistence, and engines assess content. Follow `create_analysis → record_submission → analyse` to see that separation without assuming every layer is pure.
3. **Why use TF-IDF?** It represents recognized words/phrases numerically using training frequency information. It supports compact, reproducible inference, but cannot understand every new phrase or context.
4. **What does Logistic Regression do here?** It weights the TF-IDF features, adds class intercepts and applies softmax. It provides learned class estimates, not a proof of fraud.
5. **Why retain SPAM separately from SCAM?** Unwanted promotion and deceptive harm are different labels. The fusion policy weights spam probability only partly instead of equating it with scam probability.
6. **What happens to unfamiliar vocabulary?** The classifier can produce prior-driven logits with no matched features. Fusion recognizes that lack of evidence and abstains when rules are weak, rather than presenting the prior as safety.
7. **Can the model alone produce High risk?** Message fusion caps uncorroborated model escalation below Elevated. Strong rules or accepted corroborating review matter; inspect `ml/fusion.py` rather than assuming the biggest class probability becomes the verdict.
8. **Why can High risk have low confidence?** Strong-rule floors preserve warnings while disagreement reduces confidence. Severity and certainty answer different questions.
9. **Is 80 Message points an 80% scam probability?** No. It is the scaled stored fusion score under a hand-set advisory policy. It was not calibrated as a real-world fraud probability.
10. **Why does a URL sometimes display 100?** HIGH maps to the ordinal category index 100. The URL backend does not produce a numerical risk score; the display explicitly explains that 100 is not certain fraud.
11. **How does URL analysis avoid contacting a malicious server?** It parses strings, extracts features and uses bundled suffix data/local models. There is no destination fetch or DNS resolution in the configured analysis pipeline, and network-guard tests enforce this boundary.
12. **Why count URL evidence families?** Several indicators can describe the same underlying structure. Counting related observations once avoids treating repeated versions of one clue as independent corroboration.
13. **How does Random Forest inference work?** Each tree follows feature thresholds to a leaf; the runtime averages leaf class probabilities. Feature order and numeric comparison behavior must match export.
14. **What does a valid Phone number prove?** Only conformity to numbering metadata. Caller ID can be spoofed, and validity does not prove ownership or intent, so ordinary valid numbers remain insufficient evidence.
15. **Is decoding a QR an AI classification?** No. The decoder extracts encoded data. Payload routing then uses existing engines or deterministic structure/integrity checks.
16. **What does a valid payment CRC prove?** That the payload matches its checksum under the implemented algorithm. Anyone constructing a payload can compute a matching CRC; it does not authenticate a merchant.
17. **Are camera frames uploaded?** The scanning code processes them in-browser and releases media resources. A separately confirmed text payload is submitted; camera provenance is client-reported, not server image verification.
18. **Can QR-derived text reach an external model?** Yes, if routed to the shared Message engine and the optional reviewer is enabled/eligible. Local QR decoding and default-disabled review do not imply an unconditional no-provider guarantee.
19. **Why use password hashes?** Argon2id verifies candidates without storing recoverable passwords and makes guessing more costly. SecretStr masking and session-token digests are different controls.
20. **Why use opaque session cookies?** A random credential identifies server-side session state, allowing expiry/revocation checks. HttpOnly limits JavaScript access; server validation and other controls remain necessary.
21. **What is authentication versus authorization?** Authentication validates the signed-in session. Authorization restricts queries/mutations to its user ID; knowing another UUID grants no permission.
22. **Why need CSRF protection with HttpOnly?** The browser still sends HttpOnly cookies automatically. Exact Origin and a session-derived request token help distinguish intended application mutations from cross-site requests.
23. **How do multiple tabs avoid replacing each other's CSRF token?** The token is derived consistently from the same session rather than rotated on every `/me` call. Frontend identity/cache coordination also ignores stale responses.
24. **How is password-reset replay prevented?** A digest lookup, expiry/use checks and row lock guard a transaction that consumes tokens, changes the hash and revokes sessions. The lock matters when two confirmations arrive together.
25. **What if Analyse times out after saving?** The row may already be durable. The UI retains an honest failure state and recommends history inspection; automatic retry could create a duplicate because no idempotency key exists.
26. **Why does history not recompute results?** Saved decisions, evidence and component versions are historical facts. Re-running a changed model/provider would silently replace the meaning of that record.
27. **Why separate training, validation and test sets?** Training fits parameters, validation selects candidates, and the held-out test measures the final choice. Duplicate/group leakage would make evaluation look better than true generalization.
28. **What does an automated passing suite establish?** Its explicit assertions under its fixtures/environment. Mocked fetch, real database tests, Chromium emulation and live-provider tests cover different boundaries; counts alone do not establish completeness.
29. **Why migrations instead of startup table creation?** Ordered revisions make schema history and compatibility explicit. Production startup runs those revisions through the wrapper; raw metadata creation cannot reproduce the same controlled history.
30. **What remains outside the implemented/verified claims?** Real-world accuracy beyond the frozen datasets, universal secret redaction, full payment compliance, physical-device coverage and owner study/acceptance are bounded separately. Public community reporting and adaptive learning are not implemented features.

## Part 10 — Ten hands-on learning exercises

Use synthetic content and a disposable local account. These are learning tasks, not changes performed by this documentation pass. Keep implementation experiments on a separate branch and avoid training scripts, deployment changes or database resets against personal data.

1. **Draw a file map.** Start at `main.tsx` and follow imports to `App`, `AuthProvider` and `AnalysePage`. Write one sentence per file describing its responsibility. Check whether you have confused providers with pages.
2. **Trace a local draft.** Type a harmless Message, switch to URL and switch back. Find the `useState` value and change handler that explain the retained text. In browser developer tools, confirm typing alone made no analysis POST; do not copy cookie/header secrets into notes.
3. **Trace one synthetic submission.** Set local breakpoints at the submit handler, `create_analysis`, `record_submission` and `MessageIntelligenceEngine.analyse`. Record the type/shape at each boundary and the final record ID. Explain where the owner ID came from without logging the credential.
4. **Compare three kinds of numbers.** Inspect a Message score, URL category index and Phone null score. Find their branches in `riskScorePresentation`. Explain why sorting all three as comparable fraud percentages would be incorrect.
5. **Reason about unfamiliar text.** Read the no-vocabulary test in `test_engine_hardening.py` and trace its expected abstention through `fuse`. Predict which input fields become null and why a softmax distribution can still exist internally.
6. **Work a tiny TF-IDF example by hand.** Choose two vocabulary entries from a small synthetic example, calculate `1 + log(count)`, apply hypothetical IDF values and normalize the vector. Compare the operations with `MessageClassifier`; do not edit the checked artifact or pretend your hypothetical values are trained weights.
7. **Inspect ownership safely.** Using two disposable accounts, create one synthetic record with account A and request it as B. Locate the server query predicate responsible for rejection and the corresponding backend test. Do not use real third-party IDs or production accounts.
8. **Follow camera cancellation.** Read the test for permission granted after cancellation in `cameraScanner.test.ts`. Draw the order of promise resolution, session invalidation and track stopping. Run that existing test locally and explain why checking only the initial Cancel click would miss the race.
9. **Write a small explanation-preserving test in a practice branch.** Add a new synthetic boundary case to an existing table-driven validation test, predict the result first, and run the focused test. If it fails, determine whether your expectation or the code is wrong before changing anything; do not weaken assertions to get green output.
10. **Build a small pure helper independently.** In a separate scratch file, implement a function that maps the five existing risk labels to descriptive text and rejects unknown labels. Write input/output examples, test null/unknown handling and compare your design with the real result helpers. Keep it out of production until reviewed; the exercise is to practise types, validation and uncertainty without changing the established scoring policy.

For reproducible commands and environment requirements, continue with [Testing](TESTING.md). For this pass's observed outcomes, use [Code comment coverage](CODE_COMMENT_COVERAGE.md). Historical release evidence and current local verification are recorded separately.
