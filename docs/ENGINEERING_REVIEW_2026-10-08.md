# SCAMGUARD engineering review — 8 October 2026

This report describes the user-authorized local engineering review following the September release. Changes are uncommitted in the working tree; they have not been deployed. Existing academic documents and generated Word artifacts were preserved. Earlier release reports describe their dated snapshots, not this implementation.

## 1. Executive summary

The audit covered the React application, FastAPI routes and services, authentication, PostgreSQL models and migrations, all four analysis engines, frozen model training/evaluation, tests, configuration, packaging and deployment instructions. Incremental changes address demonstrated weaknesses without replacing the architecture or trained models.

| Finding | Change | Evidence |
| --- | --- | --- |
| A generic “warning” prefix could suppress scam indicators | Protective-action negation is now limited to its clause; later unsuppressed matches still count | Adversarial and false-positive regression tests |
| Common Unicode, spacing and character substitutions evaded local rules | Rules-only normalization with offsets back to the submitted text | Fullwidth, invisible-character, spaced/dotted-word and substitution fixtures |
| An unseen-vocabulary message could inherit confident model priors | Vocabulary support, ambiguity and disagreement guards; unavailable confidence is nullable | Deterministic tests and persisted browser workflow |
| Model-only warnings and benign international URL context could be overstated | Message corroboration ceiling; URL CONTEXT evidence does not alone raise risk | Engine regressions and frozen evaluation |
| A payment QR could inherit Low despite invalid integrity, or fail on a malformed destination | Integrity floor, safe destination validation and explicit payment advice | Payment-routing and redaction regressions |
| Login limits were tied to source/identifier combinations | Shared per-account budget across aliases/sources plus a separate source budget | Real PostgreSQL auth tests |
| A successful account switch left the previous presented session valid | Revoke that session when issuing the new session | Session replay regression |
| Database and engine failures lacked useful safe diagnostics | Add event, identifier and exception-class logs without sensitive exception content | Log privacy regression |
| A late 401 could clear a newer frontend session | Compare the request's session revision before invalidation | Deferred-response client test |
| Results buried useful actions and did not balance evidence | Put actions first; explain decision, concerns, mitigating observations and uncertainty | Component tests, screenshots and real browser flows |

Existing ownership enforcement, parameterized ORM operations, CSRF/origin checks, bounded uploads, inert submitted content, private history, keyboard operation and reduced motion were retained and exercised. No live reputation provider, paid service, GPU, schema replacement or new product mode was introduced.

## 2. UI/UX improvements

- All result types put recommended actions directly after the verdict. Message advice follows the detected categories rather than adding irrelevant password/payment warnings to every submission.
- A reusable “Why this verdict” section presents actual supporting and mitigating observations separately from uncertainty. Empty mitigation is disclosed; the interface does not manufacture evidence. Older records without the new fields continue to render.
- Unavailable Message confidence displays as unavailable, and insufficient assessments have no numeric risk meter. Confidence explicitly describes an uncalibrated model/evidence indicator.
- Dashboard copy now teaches a useful sequence: read the verdict, examine evidence, verify independently. Counts come from owned persisted records. Inconclusive results have a visible count and a link to the corresponding history filter.
- Degraded capability and history states use the actual API status. A successful live connection is not implied before data arrives. Rate-limit query errors show a bounded Retry-After estimate.
- Analysis requests have a 45-second client deadline, compared with eight seconds for general reads; this accommodates the configurable backend AI deadline and normal overhead. Timeout guidance says to check History before retrying because cancellation does not prove that persistence failed. Reset-mail requests allow 15 seconds.
- The warm ivory, charcoal, terracotta and olive identity is preserved. The evidence layout stacks on narrow screens. Automated checks exercise the existing responsive, keyboard, contrast, focus and reduced-motion contracts; screenshots were inspected. This is not a human usability study or complete WCAG certification.

Inspected UI evidence from synthetic local test accounts: [desktop result](evidence/engineering-screenshots/result-desktop.png), [mobile result](evidence/engineering-screenshots/result-mobile.png), [mobile dashboard](evidence/engineering-screenshots/overview-mobile.png). These captures demonstrate rendering, not detection accuracy or production deployment.

## 3. Backend improvements

Engine capability responses reflect initialized components. The URL engine can explicitly report rules-only operation when its model is unavailable; QR support reflects decoder availability. Readiness requires the Message engine as well as the existing database/schema conditions.

Startup initialization now sits within the engine-disposal boundary, so a failure during model/mail setup still releases the database engine. Request-body buffering uses a bounded bytearray instead of retaining a list of potentially many tiny chunks. Existing JSON/upload byte limits remain in force.

Analysis failures still become durable FAILED records. New logs identify the event, record, modality and exception class without input text. Database and password-reset delivery logs likewise omit sensitive exception content and reset URLs. The API retains bounded public failure responses and request IDs.

The service remains synchronous. These changes do not add background retries, idempotency or crash recovery for records left PROCESSING by worker termination.

## 4. ML / intelligence improvements

**Message.** The frozen word 1–2 gram TF-IDF / class-weighted Logistic Regression model is unchanged. Existing exact/conflicting duplicate removal, near-duplicate grouping, fixed split membership and validation-based candidate selection remain intact. The original model tokenization is unchanged: the new normalization applies only to rules. It handles compatibility characters, selected invisible separators, simple mixed alphanumeric substitutions and separated letters while preserving snippets from the original input. A spelling variant is not itself evidence of fraud. Keyword labels now say “Credential language,” “Money or payment language” and “Authority reference,” avoiding claims of requests or impersonation that a keyword alone cannot establish.

The classifier now exposes the count of matched vocabulary features. Fusion abstains where weak rules cannot support out-of-vocabulary, short or ambiguous text. Strong local indicators survive a conflicting legitimate prediction, but confidence is capped Low. Rule and fusion versions are `message-rules-v2` and `message-fusion-v2`.

**URL.** The frozen Random Forest (120 trees, 27 offline features), parser, suffix snapshot and domain-isolated split are unchanged. Mixed Greek/Cyrillic and Latin script is checked within a hostname label; a Latin suffix alone no longer makes an otherwise single-script international label “mixed.” Neutral fragment/IDN metadata is still shown but does not independently trigger Caution. Rules/fusion are `url_rules_v2` / `url_fusion_v2`. Structured decision/mitigation/uncertainty explanations accompany real evidence. There is no destination fetching, DNS lookup or operational reputation adapter.

**Phone.** The audit retained offline numbering metadata and conservative contextual rules. Number validity still does not establish identity, ownership, reachability or scam reputation. There was no evidence supporting a new model or fabricated risk percentage. Its UI benefits from earlier placement of practical actions.

**QR.** Upload and local-camera decoding still route supported payloads into the existing engines. Payment destination strings are validated before URL routing; a malformed destination becomes a recorded warning rather than failing the entire analysis. Invalid payment integrity cannot be reduced to Low by a benign destination model. Credential-shaped authority text is redacted even for malformed URL-shaped payloads. Payment recommendations explicitly require recipient, amount and currency verification. Classifier/fusion versions are `qr-payload-classifier-v2` / `qr-risk-fusion-v2`. Generic TLV/CRC checks do not authenticate a merchant or implement every payment scheme.

### Measured evaluation, without retraining

`backend/scripts/evaluate_message_reliability.py` reproduces the frozen model evaluation, verifies source/split provenance, computes probability diagnostics and reports the new fusion distribution. It fits no model, calibrator or threshold. Full machine-readable results: [engineering-message-evaluation.json](evidence/engineering-message-evaluation.json).

The Message reproduction verifies 5,797 cleaned rows and 3,477 train / 1,160 validation / 1,160 test memberships. The final classifier was already refit on train plus validation after model selection. The unchanged 1,160-row test confusion matrix is:

| Actual / predicted | LEGITIMATE | SPAM | SCAM |
| --- | ---: | ---: | ---: |
| LEGITIMATE | 960 | 4 | 3 |
| SPAM | 7 | 71 | 9 |
| SCAM | 0 | 13 | 93 |

Accuracy is **96.8966%**, macro F1 **0.895235**, SCAM precision **0.885714**, recall **0.877358** and F1 **0.881517**. These are reproduced historical classifier metrics, not improvement claims or final-verdict accuracy.

New descriptive probability diagnostics: multiclass Brier sum **0.050491** (range 0–2), log loss **0.126021**, and ten-bin top-label expected calibration error **0.054496**. The probabilities remain uncalibrated. Brier/log loss measure probabilistic prediction quality, not calibration alone; ECE depends on binning, support and the sampled population. See the [scikit-learn calibration documentation](https://scikit-learn.org/stable/modules/calibration.html).

| Dataset label | Low | Caution | Elevated | High | Insufficient |
| --- | ---: | ---: | ---: | ---: | ---: |
| LEGITIMATE (967) | 950 | 3 | 0 | 0 | 14 |
| SPAM (87) | 41 | 35 | 5 | 0 | 6 |
| SCAM (106) | 3 | 41 | 42 | 18 | 2 |

This is a fusion-policy distribution, not a classification accuracy table. In particular, **three SCAM-labelled messages still receive Low and two receive Insufficient Evidence**. No thresholds were changed after observing this distribution. Reusing the historical held-out set supplies regression evidence, not an independent contemporary benchmark.

The existing URL verifier also passed: 234,674 rows, 197,700 isolated domain groups, and the original 36,901-test-row matrix `[[19846, 89], [471, 16495]]`. It does not overcome the dataset's HTTPS-homepage bias among legitimate examples. Neither classifier was replaced or retrained.

## 5. Verdict engine

Message v2 centralizes the existing policy weights as named constants:

1. With model vocabulary support, model signal is `P(SCAM) + 0.35 × P(SPAM)`, bounded by one. Without support it is zero.
2. If rule score is below 0.25, zero matched features, context-poor short input, or model confidence below 0.55 can produce Insufficient Evidence with null risk/confidence.
3. Base risk is `0.52 × model signal + 0.48 × rule score`. Three or more indicator categories with rule score at least 0.72 establish a 0.72 floor. Usable rules without model vocabulary receive at least Caution.
4. Valid optional AI with confidence at least 0.55 can only raise the score, by at most 18% of the gap to its signal. It cannot lower local risk. Its contribution flag is true only if the score actually increased. Provider failure does not fail the local result.
5. A model-only warning without rules or actual AI contribution is capped just below 0.42, therefore Caution. Category boundaries remain Low below 0.20, Caution below 0.42, Elevated below 0.65, then High.
6. Confidence retains the descriptive `0.7 × model confidence + 0.3 × evidence strength` policy. Defined model/rule disagreement caps it at 0.54 (Low). No matched features means null confidence.

These are explicit heuristic policy choices inherited from v1 plus v2 guard conditions, **not learned or calibrated fraud probabilities**. Selected categories are not necessarily statistically independent. The guard reasons and disagreement flag are stored with each new result.

URL retains a categorical evidence-family table: at least two meaningful families give Elevated, or High with a PHISHING model estimate of at least 0.90. One meaningful family plus that estimate gives Elevated. Other non-context warnings, a PHISHING estimate, or an uncertain model give Caution. Otherwise an available model gives Low; an unavailable model gives Insufficient Evidence. The dormant reputation boundary cannot be presented as an active external integration.

Phone retains its categorical metadata/context method. Ordinary routed QR payloads retain the underlying verdict. A payment with invalid integrity or an invalid destination cannot fall below Caution; higher routed risks are retained, and this integrity-only floor does not invent a numeric confidence or score.

## 6. Security improvements

- Login now consumes two PostgreSQL-backed budgets: `LOGIN_RATE_LIMIT` attempts per resolved account per 15 minutes, shared by username/email and source changes, and five times that limit per source. Defaults are 10/account and 50/source. These count attempts, including successful logins, not just failures. The source check happens before expensive password work.
- Successful signup/login revokes the previously presented session when issuing the new one. This protects the same-browser account transition; it deliberately does not log out every other device. Successful login updates an outdated Argon2 hash using the configured policy.
- Account deletion password verification has its own per-account attempt budget using the same limit/window. Origin, CSRF and current-password checks remain mandatory.
- Late frontend 401 responses cannot invalidate a newer identity. Existing identity-scoped caches and backend ownership enforcement remain authoritative.
- Sensitive exception text is excluded from the changed logging paths. Reset failures remain generic to the caller. QR redaction covers the newly tested malformed destination path.

The design follows the relevant principles in the [OWASP Authentication Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html) and [Session Management Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html). This was source review and regression testing, not an independent penetration test. Account-wide throttling also introduces a temporary lockout/denial-of-service tradeoff; see limitations below.

## 7. Database changes

**No new migration, table, column, index or data rewrite.** Alembic remains at `0006_qr_intelligence`; `current`, `heads` and `check` passed on isolated local PostgreSQL, with no new upgrade operations detected. The backend suite includes real migration downgrade/upgrade and ownership/persistence checks. Neon was not modified.

New explanation fields fit the existing component JSON; confidence was already nullable in storage. New frontend schemas accept both historical rows and v2 fields. Existing saved verdicts are not silently recomputed. Login limiter scopes reuse the existing rate-limit bucket table.

## 8. Testing

Final results are recorded in [engineering-verification.json](evidence/engineering-verification.json). Tests used the local PostgreSQL 17 cluster, isolated `_test` and `_e2e` databases, and Chrome via Playwright. No production users or analyses were touched.

| Check | Passed | Failed at final run | Skipped |
| --- | ---: | ---: | ---: |
| Backend pytest | 355 | 0 | 1 |
| Frontend Vitest (12 files) | 164 | 0 | 0 |
| Playwright foundation | 18 | 0 | 0 |
| Playwright built preview | 8 | 0 | 0 |
| Playwright real PostgreSQL | 26 | 0 | 0 |

The one skip is the opt-in live external AI integration. Controlled provider success/failure paths are covered without live provider calls. Two existing Starlette/httpx/AnyIO deprecation warnings remain. One stale backend version assertion and two browser assertions for the renamed evidence label were found and corrected; tests still enforce privacy, persistence and actual rendered evidence. After the final QR explanation correction, all 355 backend tests and both QR persistence browser scenarios passed again; reruns are not added to the unique total of 571 passes. The 16 static development-launcher checks also passed separately.

Additional successful checks: ESLint with zero warnings, TypeScript, production Vite build, Ruff check/format (75 Python files), `pip check`, backend wheel build, Message probability-metric unit tests and frozen evaluation, URL artifact/split verification, and Alembic schema checks. The production build reports approximately 479.68 kB main JS (143.96 kB gzip), 47.53 kB CSS (9.61 kB gzip), and the existing deferred QR WASM asset of 1,093.29 kB (460.98 kB gzip). Existing third-party Rollup annotation warnings remain.

The latest online `npm audit` was blocked by automatic approval review because it would transmit private project dependency metadata to npm's registry. No workaround was used. Local dependency compatibility passed; this review does **not** claim a current clean vulnerability audit. The [local secret scan](evidence/engineering-secret-scan.json) covers common key patterns and known local secret values in eligible working-tree files and Git history, excluding corpora, models, locks and media; production secret values were not retrieved. The verification record also includes wheel/source hash comparisons for both models and the changed auth/fusion/QR modules, with no environment file in the wheel.

## 9. Files changed

| Area | Important paths |
| --- | --- |
| Auth, lifecycle, privacy | `backend/app/api/auth.py`, `api/routes.py`, `core/body_limit.py`, `core/errors.py`, `main.py`, `services/analyses.py` |
| Message analysis | `backend/app/ml/classifier.py`, `rules.py`, `fusion.py`, `engine.py` |
| URL and QR | `backend/app/url_intelligence/{rules,fusion,engine}.py`, `backend/app/qr_intelligence/engine.py` |
| Evaluation and backend regression | `backend/scripts/evaluate_message_reliability.py`, `train_message_model.py` (comment correction only), `backend/tests/test_{engine_hardening,security_hardening,probability_metrics,persistence}.py` |
| Shared result presentation | `frontend/src/components/analysis/{ResultPresentation,MessageResult,URLResult,PhoneResult,QrResult}.tsx`, `frontend/src/styles.css` |
| Dashboard, help, API states | `frontend/src/components/{DashboardDistribution,States}.tsx`, `frontend/src/pages/{DashboardPage,AnalysePage,HelpPage}.tsx`, `frontend/src/lib/api.ts` |
| Frontend/browser regression | `frontend/src/app/EngineeringReview.test.tsx`, `frontend/src/lib/api.test.ts`, `frontend/e2e-persistence/{engineering-review,submission}.spec.ts` |
| Current documentation | Root status/decision files; API, architecture, authentication, intelligence, evaluation, testing, security, deployment and academic guides; this report and its evidence |

Many academic Markdown, figure and Word-output files were already modified/untracked before this request. They are preserved and must not be attributed wholesale to this engineering pass. No existing migration, trained artifact, dataset, dependency lockfile or deployment manifest changed.

## 10. New dependencies

**None.** Existing libraries support all changes. No major upgrades or speculative dependency removals were made. The wheel and `pip check` validate local packaging/compatibility, not the absence of security advisories. The online registry audit remains pending authorization.

## 11. Deployment impact

Vercel, Render and Neon remain the target architecture. No infrastructure or provider configuration change is required by this patch. Preserve the existing Vercel API rewrite and backend cookie/origin/TLS settings.

**Deploy the frontend first, then the backend.** The new frontend accepts historical responses and nullable Message confidence; the older frontend can reject new abstention responses. Deploying both in a reviewed release is also suitable. Do not roll the frontend back alone while leaving a v2 backend active. The usual explicit migration startup command remains; no new migration is introduced.

After an authorized release, verify readiness/capabilities, sign-in/session restoration, all four analysis modes, private history, deletion and reset delivery through the actual production proxy. None of those production checks was performed for these local changes. The previously recorded September deployment is not evidence that this patch is live.

## 12. Environment variables

**No new environment variable or secret is required; local secret values were not replaced.** Existing `LOGIN_RATE_LIMIT` now controls the per-account budget and derives the five-times source budget. Operators should understand that semantic change before release.

Backend-only settings remain `DATABASE_URL`, `AUTH_TOKEN_PEPPER`, exact `CORS_ORIGINS`, `APP_ENV`, persistence/cookie/session/rate settings, `FRONTEND_BASE_URL` and the existing mail-provider configuration. Optional AI remains disabled by default and uses backend-only credentials when explicitly enabled. Frontend `VITE_API_BASE_URL` and optional `VITE_SUPPORT_EMAIL` are public; `API_PROXY_TARGET` is development proxy configuration. See the existing `.env.example` files and production guide for the full inventory; no real values are included here.

## 13. Report / presentation changes

| Academic artifact | Exact change to reflect |
| --- | --- |
| Proposal / project scope | Keep four engines, authentication, owned history and dashboard. Describe this as robustness/explainability refinement; no new reputation service, training corpus or product mode. |
| Final report implementation | Add rule-only Unicode/obfuscation normalization with original snippets, clause-level protective context, vocabulary support, abstention, model-only ceiling, conflict confidence, URL context neutrality and QR payment integrity floor. Record v2 rules/fusion identifiers. |
| Methodology / model chapter | Keep the frozen TF-IDF/logistic and URL Random Forest methods/splits. Add descriptive Brier/log-loss/ECE with definitions and limitations; do not call probabilities calibrated or claim improved accuracy. Distinguish model class labels from fused risk categories. |
| Evaluation | Replace current-code test totals with this report's final counts. Preserve dated historical release counts. Include the fusion distribution, including three Low and two Insufficient SCAM examples; it is not an independent test set or fusion accuracy. |
| Architecture / data-flow diagram | Add rules-only normalization and evidence-sufficiency/conflict guards inside Message; show structured assessment basis returned through existing persistence/API. Annotate QR payment-integrity floor. Keep Vercel–Render–Neon topology and optional AI boundary. |
| Database / ER diagram | No structural change. Existing JSON result components carry explanations; nullable confidence remains nullable. Do not draw a new table or migration. |
| Security chapter | Document account+source throttling, session revocation on replacement, rehash-on-login, deletion-attempt limits, safe logging and late-401 protection. Retain lockout/proxy/registration-enumeration limitations. |
| Screenshots | Refresh results with actions and “Why this verdict,” the unavailable-confidence state, and the dashboard inconclusive link after selecting the release to present. Local screenshots in this review use synthetic test accounts, not production claims. |
| Slides / speaker notes | Explain why risk, classifier probability and confidence differ; demonstrate evidence and an honest abstention. Keep Phone metadata and payment CRC limitations visible. |
| Study / viva guide | Answer “Why this verdict?” with detected snippets, recorded policy reason and versions; “How certain?” with uncalibrated confidence/abstention; “Has it shipped?” with the actual deployment evidence, not local tests. |

The existing generated DOCX/figure package was not regenerated. Its September snapshot remains historical; use these exact deltas when producing a report for this newer implementation.

## 14. Remaining limitations

- Mainly English, imbalanced historical SMS data; weak coverage of current regional/multilingual scams. Rules are finite heuristics and can be evaded or over-triggered; correlation among indicators limits interpretation of sums.
- Classifier/fusion confidence is uncalibrated. This review did not train a calibration model or tune thresholds on the held-out set. Some scam-labelled examples still receive Low.
- URL legitimate examples are heavily biased toward HTTPS homepages. No redirect resolution, live content, certificate/registration lookup or active reputation service exists. Phone metadata cannot verify the caller. QR payment support is a generic structural subset; a valid CRC is not merchant authentication.
- Authentication rate limiting can temporarily deny legitimate users under deliberate targeting. Source budgets depend on correct reverse-proxy forwarding/trust configuration; the existing production launcher trusts forwarded IPs. Expired rate buckets do not yet have a cleanup job. Signup explicitly reveals duplicate account availability.
- Synchronous execution has no idempotency key, queue or recovery for abruptly abandoned PROCESSING records. Timeout guidance reduces accidental repeat submissions but does not prevent them.
- Submitted message/query/path text can contain personal data. Escaping and targeted credential redaction are not general anonymization. Optional provider redaction remains best-effort.
- No current production deployment, real-device camera study, inbox-delivery test, human usability study, load/SLA claim or independent penetration test was performed. Online dependency vulnerability auditing remains blocked pending permission.

## 15. Recommended next improvements

1. Obtain representative, consented, multilingual and contemporary labelled examples. Reserve a new untouched evaluation set before comparing character features, calibrated alternatives or fusion thresholds. Report recall, false-positive rate and abstention coverage together.
2. Verify proxy trust and client-address behavior in the deployed chain; then consider adaptive throttling that balances attacks and shared-network access. Add bounded expiry cleanup only with retention/operational requirements.
3. Add idempotent analysis submission and a narrowly scoped recovery policy if real timeouts or abandoned records justify it; avoid a queue merely for architectural appearance.
4. Complete an authorized dependency registry audit, reviewed deployment smoke test, physical-device QR checks and the existing human usability protocol. Keep their findings separate from automated correctness tests.
5. Refresh the report/presentation package and screenshots against the exact approved release. Preserve historical evidence instead of replacing it with undated claims.
