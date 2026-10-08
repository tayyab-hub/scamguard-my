# Examiner defence training pack

68 distinct questions. The short and deeper answers are targets for approximately 10 and 30 seconds, not measured rehearsal results. Speak the direct answer first, then reason and evidence. Evidence paths are repository-relative; open the cited file and explain it in your own words. External concepts use the verified sources in FINAL_REFERENCES.md.

## Q01 Problem — What user problem does SCAMGUARD address?

**10-second answer:** It lets a user inspect an unfamiliar item before acting, with reasons and limits in one private workflow.

**30-second deeper answer:** The input may be message wording, a link, a number or a QR payload. Each exposes different evidence, so I preserve those differences while using a common result layout. The contribution is decision support; improved decisions or reduced losses have not yet been measured.

**Technical evidence:** [docs/FINAL_PROBLEM_STATEMENT.md](FINAL_PROBLEM_STATEMENT.md)

**Common mistake to avoid:** Do not claim that all users need the product or that losses were reduced.

## Q02 Problem — Why is multi-channel analysis relevant?

**10-second answer:** A QR code can contain a URL, number or text, so routing connects the modes without making their risks interchangeable.

**30-second deeper answer:** The integration reduces the need to re-enter decoded content into unrelated workflows. However, it does not combine four submissions into a universal score. A QR URL result inherits the URL method and its limits. The practical value of this workflow still needs user-comprehension evidence.

**Technical evidence:** [backend/app/qr_intelligence/engine.py](../backend/app/qr_intelligence/engine.py)

**Common mistake to avoid:** Do not call this cross-modal probability fusion.

## Q03 Objectives — Are the objectives genuinely SMART?

**10-second answer:** There are four objectives, each with an output, measurement, evidence and the recorded final-release time boundary.

**30-second deeper answer:** The template permits three to four objectives. My table maps each one to source and verification. They are retrospective acceptance objectives, not a claim that identical targets were approved before development. The original approved proposal schedule is missing and is explicitly requested as a manual action.

**Technical evidence:** [docs/FINAL_SMART_OBJECTIVES.md](FINAL_SMART_OBJECTIVES.md)

**Common mistake to avoid:** Do not backdate objectives or invent an approved plan.

## Q04 Objectives — How do you prove an objective is complete?

**10-second answer:** I use the evidence named in its acceptance row and retain any narrower manual or evaluation gap.

**30-second deeper answer:** For example, four advertised ready modes and integration tests support implementation. They do not prove physical camera compatibility on every phone. Likewise, a password-reset test with local mail capture supports its code path but does not establish delivery to a production inbox. Completion is scoped to the measurement.

**Technical evidence:** [docs/FINAL_SMART_OBJECTIVES.md](FINAL_SMART_OBJECTIVES.md)

**Common mistake to avoid:** Do not turn a readiness response into evidence for every workflow.

## Q05 Scope — Who are the target users?

**10-second answer:** Individuals reviewing unfamiliar content, including students and staff, and educators or assessors inspecting the methods.

**30-second deeper answer:** These are intended audiences rather than sampled participants. The application assumes a modern browser and the ability to read its explanations. The evidence is strongest for the selected English SMS and URL data. I do not claim universal language, accessibility or demographic suitability.

**Technical evidence:** [docs/FINAL_SCOPE_DELIVERABLES.md](FINAL_SCOPE_DELIVERABLES.md)

**Common mistake to avoid:** Do not say everyone or invent a target-user survey.

## Q06 Scope — What is explicitly outside scope?

**10-second answer:** Live destination fetching, caller identification, payment authorization, public reporting and adaptive learning are outside the implemented scope.

**30-second deeper answer:** The QR parser handles a generic payment structure subset; it does not certify a scheme or merchant. Phone supplies numbering metadata rather than reputation. Optional external Message review is disabled by default. These limits are deliberate boundaries and must remain visible in the report and demonstration.

**Technical evidence:** [docs/LIMITATIONS.md](LIMITATIONS.md)

**Common mistake to avoid:** Do not demonstrate planned features as completed ones.

## Q07 Related systems — Which three systems did you critically compare?

**10-second answer:** VirusTotal, Google Safe Browsing and Truecaller, using their official documentation and a common comparison structure.

**30-second deeper answer:** VirusTotal aggregates analysis, Safe Browsing checks maintained threat information, and Truecaller supplies communication reputation and Phone/URL lookup. I compare scope, deliverables, design and documented implementation. Undocumented internals are labelled unknown; I did not benchmark these services or infer that missing documentation means a feature is absent.

**Technical evidence:** [docs/BACKGROUND_OF_STUDY.md](BACKGROUND_OF_STUDY.md)

**Common mistake to avoid:** Do not pretend to know proprietary model architectures.

## Q08 Related systems — Does Truecaller already check URLs?

**10-second answer:** Yes. Its documented Scam Checker checks phone numbers and URLs; I do not claim that combination is unique.

**30-second deeper answer:** The difference I can defend is SCAMGUARD’s inspected implementation: reproducible local models, conservative numbering evidence, QR routing and owner-controlled explanation records. Truecaller has communication reputation and blocking features SCAMGUARD lacks. The comparison is a trade-off, not evidence that this project performs better.

**Technical evidence:** [docs/RELATED_SYSTEM_COMPARISON.md](RELATED_SYSTEM_COMPARISON.md)

**Common mistake to avoid:** Do not describe Truecaller as phone-only.

## Q09 Related systems — Is all VirusTotal analysis public?

**10-second answer:** No. Its standard sharing and its separate organisation-private scanning are different workflows.

**30-second deeper answer:** The private option has different analysis content and retention. That qualification prevents an unfair privacy comparison. SCAMGUARD retains owned assessments in its application database and does not send URLs to VirusTotal, but this narrower local method also lacks VirusTotal’s breadth of contributed threat information.

**Technical evidence:** [docs/FINAL_SOURCE_REGISTER.md](FINAL_SOURCE_REGISTER.md)

**Common mistake to avoid:** Do not say VirusTotal has no privacy option.

## Q10 Architecture — Walk me through a production request.

**10-second answer:** The browser uses Vercel’s same-origin API rewrite to Render FastAPI, which validates the request and accesses Neon PostgreSQL.

**30-second deeper answer:** The API derives the user from a valid session, applies the relevant guards and runs the selected engine. It stores an owned assessment with explicit transactions, then returns structured evidence. The frontend validates the response and displays it. Health, readiness and capabilities remain distinct public probes.

**Technical evidence:** [docs/ARCHITECTURE.md](ARCHITECTURE.md)

**Common mistake to avoid:** Do not say the browser connects directly to Neon.

## Q11 Architecture — Why is this not just CRUD?

**10-second answer:** CRUD supports history, but the technical work includes model export, evidence fusion, QR lifecycle handling and ownership enforcement.

**30-second deeper answer:** The Message and URL artifacts reproduce selected trained classifiers without executable serialization. QR adds bounded decoding and conservative routing, while camera consent and cancellation involve asynchronous resource management. A/B tests validate authorization through real PostgreSQL. These are inspectable contributions beyond record creation and display.

**Technical evidence:** [docs/FINAL_EVALUATION.md](FINAL_EVALUATION.md)

**Common mistake to avoid:** Do not dismiss CRUD; explain the nontrivial work built around it.

## Q12 React — Why React and TypeScript?

**10-second answer:** They support reusable typed input/result components and shared application state across the four modes and account lifecycle.

**30-second deeper answer:** The project already uses strict types, response validation and modular components. These choices help keep transport and presentation contracts aligned. They do not replace backend validation, and the trade-off is frontend toolchain and bundle complexity. I am justifying the implemented choice, not claiming React is universally best.

**Technical evidence:** [frontend/package.json](../frontend/package.json)

**Common mistake to avoid:** Do not claim TypeScript validates untrusted runtime JSON by itself.

## Q13 React — What does TanStack Query do here?

**10-second answer:** It manages server-state fetching, invalidation and identity-scoped cached data for the authenticated interface.

**30-second deeper answer:** After a mutation, affected queries are refreshed. Account changes clear private cached state and use identity-aware query keys. This prevents stale account information appearing during transitions, but the API still independently checks ownership. Cache behaviour cannot secure a server endpoint that lacks authorization.

**Technical evidence:** [docs/ARCHITECTURE.md](ARCHITECTURE.md)

**Common mistake to avoid:** Do not make client caching the security boundary.

## Q14 FastAPI — Why FastAPI?

**10-second answer:** It fits the Python intelligence code and provides schema-driven HTTP validation and explicit route dependencies.

**30-second deeper answer:** Pydantic schemas define accepted data and response contracts, while authentication dependencies centralise session and CSRF checks. Python also hosts the offline classifiers and QR decoder. The current synchronous analysis can occupy request workers, so framework choice does not establish throughput or eliminate the need for load testing.

**Technical evidence:** [backend/app/api/analyses.py](../backend/app/api/analyses.py)

**Common mistake to avoid:** Do not say async framework means all work is nonblocking.

## Q15 PostgreSQL — Why PostgreSQL rather than SQLite?

**10-second answer:** The deployed design needs relational constraints, transactions, owner-scoped queries and cascades, and tests use the same database family.

**30-second deeper answer:** SQLite could support some prototypes, but substituting it for integration evidence would miss PostgreSQL-specific migration and query behaviour. SQLAlchemy and Psycopg connect the API to the actual database. This choice trades simple local setup for closer evidence about deployed persistence semantics.

**Technical evidence:** [docs/DATABASE.md](DATABASE.md)

**Common mistake to avoid:** Do not invent a performance comparison with SQLite.

## Q16 PostgreSQL — Explain the main relationships.

**10-second answer:** Users own analyses, sessions and reset tokens; foreign keys cascade those owned rows when the account is deleted.

**30-second deeper answer:** Analyses store content and immutable assessment metadata. Session/reset tables store digests and lifecycle timestamps, not raw tokens. Rate-limit buckets are separate and have no direct user foreign key. Legacy analyses with null ownership remain invisible. The ERD is a selected field view of the actual model.

**Technical evidence:** [backend/app/db/models.py](../backend/app/db/models.py)

**Common mistake to avoid:** Do not claim rate-limit buckets cascade with the user.

## Q17 Neon — What does Neon do?

**10-second answer:** Neon hosts the production PostgreSQL database; it stores application rows and Alembic migration state.

**30-second deeper answer:** It is distinct from Render, which runs the Python API, and Vercel, which serves the frontend. The browser does not receive the database connection string. The release observation used a SELECT-only query to confirm revision 0006_qr_intelligence. That does not prove backup restore or database availability over time.

**Technical evidence:** [docs/FINAL_RELEASE.md](FINAL_RELEASE.md)

**Common mistake to avoid:** Do not describe Neon as the frontend or API server.

## Q18 Render — What does Render do?

**10-second answer:** Render runs the FastAPI service and its local intelligence engines, applying explicit migrations through the startup process.

**30-second deeper answer:** The final deployment was observed Live at the same full commit as Vercel. Its free-instance cold start is an operational limitation. I check readiness before a demonstration and prepare local fallback. A green deployment badge only proves that deployment state at the observation time.

**Technical evidence:** [render.yaml](../render.yaml)

**Common mistake to avoid:** Do not claim a measured uptime SLA.

## Q19 Vercel — What does Vercel do?

**10-second answer:** Vercel serves the built React frontend and rewrites API requests to the Render service.

**30-second deeper answer:** The application uses a same-origin API path in the browser, while provider routing forwards requests to the separate backend. Vercel does not train the models or store the user database. The provider-configured API rule and matching release identity establish the deployment arrangement. The repository vercel.json contains only the SPA fallback; a new provider project must recreate the API rule.

**Technical evidence:** [docs/PRODUCTION_ACCEPTANCE.md](PRODUCTION_ACCEPTANCE.md)

**Common mistake to avoid:** Do not put backend secrets in VITE variables.

## Q20 Message ML — What part is actually machine learning?

**10-second answer:** Message uses TF-IDF Logistic Regression; URL uses a 120-tree random forest on 27 locally derived string features.

**30-second deeper answer:** Both were selected from fixed candidates using validation macro F1. Their JSON exports are checksum verified, and frozen runtime predictions reproduce held-out matrices. Phone metadata and QR/payment classification are deterministic, as are the evidence rules and fusion policies around the learned outputs.

**Technical evidence:** [docs/MODEL_EVALUATION.md](MODEL_EVALUATION.md); [docs/URL_MODEL_EVALUATION.md](URL_MODEL_EVALUATION.md)

**Common mistake to avoid:** Do not label every component AI or call URL entirely rules-only.

## Q21 Message ML — Why combine ML and rules?

**10-second answer:** The classifier recognises learned patterns while rules expose specific contextual observations; fusion limits how either affects the final risk.

**30-second deeper answer:** A statistical label alone can be wrong or out of distribution. Explicit indicators make some reasoning inspectable, while suppression rules reduce false alarms for educational or negated text. These are engineering choices, not proof the fused risk is calibrated. Its five-level outputs need separate evaluation if that claim is desired.

**Technical evidence:** [backend/app/ml/fusion.py](../backend/app/ml/fusion.py)

**Common mistake to avoid:** Do not claim a model metric measures the whole fused system.

## Q22 Message ML — Why not use ChatGPT directly?

**10-second answer:** The baseline must run local, versioned methods with reproducible results and a bounded data-sharing boundary.

**30-second deeper answer:** Optional external review exists only for eligible ambiguous messages, is backend-only, and is disabled in the reported evaluation. It uses best-effort redaction and grounded structured output, with local results preserved on failure. I did not perform a head-to-head comparison with ChatGPT and cannot claim higher accuracy than it.

**Technical evidence:** [backend/app/ml/ai_review.py](../backend/app/ml/ai_review.py)

**Common mistake to avoid:** Do not invent an LLM comparison or claim no external adapter exists.

## Q23 Message ML — What is TF-IDF doing?

**10-second answer:** It converts words and word pairs into weighted numeric features based on term frequency and inverse document frequency.

**30-second deeper answer:** The training pipeline uses lowercasing, accent stripping, sublinear term frequency, L2 normalisation and at most 20,000 features. Training-only feature fitting avoids fitting vocabulary on the untouched test data during selection. The exported vocabulary and weights allow the deployed classifier to reproduce the same transformation.

**Technical evidence:** [backend/scripts/train_message_model.py](../backend/scripts/train_message_model.py)

**Common mistake to avoid:** Do not call TF-IDF a language model or semantic comprehension.

## Q24 Dataset — Where did the Message data come from?

**10-second answer:** Mishra and Soni’s Mendeley version 1 dataset contains 5,971 labelled ham, spam and smishing messages.

**30-second deeper answer:** Its 2022 publisher record and CC BY licence are verified. Cleaning retained 5,797 rows; the labels map to LEGITIMATE, SPAM and SCAM. Source/OCR artefacts, historical English content and imbalance limit interpretation. I did not generate these training rows or reuse private application history.

**Technical evidence:** [docs/DATASETS.md](DATASETS.md)

**Common mistake to avoid:** Do not merge spam and scam into one label when describing this model.

## Q25 Dataset — How did you reduce leakage?

**10-second answer:** Message near-duplicate groups stay in one split; URL duplicates and registrable-domain groups are separated across partitions.

**30-second deeper answer:** Message removes exact duplicate/conflicting groups before grouped splitting. URL normalises and deduplicates then splits whole domain groups. Fixed manifests and hashes are verified during reproduction. Campaigns across unrelated domains and temporal leakage are not fully ruled out, so I state precisely which isolation checks were performed.

**Technical evidence:** [docs/DATASETS.md](DATASETS.md); [docs/URL_DATASETS.md](URL_DATASETS.md)

**Common mistake to avoid:** Do not claim every possible leakage route was eliminated.

## Q26 Dataset — Was the test set used to select models?

**10-second answer:** No. The fixed candidate families were selected by validation macro F1 before evaluating the held-out test partition.

**30-second deeper answer:** Message selected Logistic Regression and then refit on train plus validation. URL selected the random forest without refitting on validation/test. Later frozen-runtime reproduction checks the same experiment; it is not a new independent test set and did not tune model selection or fusion using the held-out labels.

**Technical evidence:** [docs/MODEL_EVALUATION.md](MODEL_EVALUATION.md); [docs/URL_MODEL_EVALUATION.md](URL_MODEL_EVALUATION.md)

**Common mistake to avoid:** Do not confuse reproduction with another independent evaluation.

## Q27 Model metrics — What is the Message model’s accuracy?

**10-second answer:** It is 96.8966% on 1,160 held-out messages; macro F1 is 0.895235, with important minority-class errors.

**30-second deeper answer:** The confusion matrix has 960 correct legitimate, 71 correct spam and 93 correct scam labels. Thirteen of 106 scam examples were predicted spam. These are historical dataset-specific classifier metrics. They do not measure current scam prevalence, final five-level risk accuracy or the probability that one submitted message is fraudulent.

**Technical evidence:** [docs/evidence/final_evaluation.json](evidence/final_evaluation.json)

**Common mistake to avoid:** Always state dataset, denominator and classifier scope.

## Q28 Model metrics — Why is accuracy alone insufficient?

**10-second answer:** The Message test set is imbalanced, so high overall accuracy can hide errors in smaller spam and scam classes.

**30-second deeper answer:** There are 967 legitimate test examples, compared with 87 spam and 106 scam. I therefore report per-class precision, recall, F1 and the confusion matrix. Macro F1 weights classes equally, while weighted F1 reflects their support. Neither metric removes collection bias or proves real-world effectiveness.

**Technical evidence:** [docs/EVALUATION.md](EVALUATION.md)

**Common mistake to avoid:** Do not cite only the largest percentage.

## Q29 Model metrics — Explain precision and recall using SCAM.

**10-second answer:** SCAM precision is 93/105; recall is 93/106. One asks about predicted scams, the other about actual scams.

**30-second deeper answer:** Precision counts correctly predicted SCAM examples among every SCAM prediction. Recall counts recovered SCAM examples among the actual SCAM-labelled test rows. The denominators differ because the confusion matrix includes both false positives and false negatives. I keep SPAM separate rather than treating every non-legitimate prediction as SCAM.

**Technical evidence:** [docs/MODEL_EVALUATION.md](MODEL_EVALUATION.md)

**Common mistake to avoid:** Do not reverse the two denominators.

## Q30 Model metrics — Explain macro F1.

**10-second answer:** Calculate each class’s precision/recall harmonic mean, then average the class F1 values with equal weight.

**30-second deeper answer:** For Message, each of LEGITIMATE, SPAM and SCAM contributes one third, regardless of class size. That makes minority performance more visible than an overall accuracy alone. The final macro F1 is 0.895235 for the retained test split. It is not a confidence interval or a calibrated fraud probability.

**Technical evidence:** [docs/EVALUATION.md](EVALUATION.md)

**Common mistake to avoid:** Do not average accuracy and recall or call macro F1 a probability.

## Q31 Model metrics — Is the displayed 80/100 a fraud probability?

**10-second answer:** No. Message shows a scaled stored fusion score; URL shows a category index, with confidence presented separately.

**30-second deeper answer:** The URL categories map to ordinal display values 0, 33, 67 and 100. That mapping does not create precision within a category, and the API’s URL risk_score remains null. Scores must not be compared across modalities. The category and evidence remain the interpretation boundary.

**Technical evidence:** [frontend/src/lib/resultPresentation.ts](../frontend/src/lib/resultPresentation.ts)

**Common mistake to avoid:** Do not say 80% likely to be a scam.

## Q32 URL methodology — What does URL Intelligence actually measure?

**10-second answer:** It measures supported properties of the submitted URL string, learned feature patterns and explicit structural indicators.

**30-second deeper answer:** The forest uses 27 recomputed lexical/structural features. Rules include supported host, encoding and deception-related structure. No HTTP destination, webpage, DNS, certificate or live reputation is collected. A suspicious structure can also occur in benign URLs, so the output is advisory evidence rather than verified website maliciousness.

**Technical evidence:** [backend/app/url_intelligence/features.py](../backend/app/url_intelligence/features.py)

**Common mistake to avoid:** Do not describe it as a website-content scanner.

## Q33 URL methodology — Why no live URL fetching?

**10-second answer:** Opening hostile destinations adds network and privacy risks outside the reviewed scope; the current method is deliberately local.

**30-second deeper answer:** A future fetcher would require separate network isolation, redirect/DNS/address controls, limits and an explicit privacy design. Avoiding requests also means we cannot inspect live content or confirm current reputation. That limitation is shown to the user rather than hidden by an overstated result.

**Technical evidence:** [docs/URL_INTELLIGENCE.md](URL_INTELLIGENCE.md)

**Common mistake to avoid:** Do not promise live evidence while describing a no-fetch system.

## Q34 URL methodology — Why is the URL model’s score so high?

**10-second answer:** The held-out accuracy is 98.4824%, but the source distribution contains a serious HTTPS-homepage collection bias.

**30-second deeper answer:** All legitimate training URLs are HTTPS homepages without queries. Ordinary benign deep links can therefore be unfamiliar to the model. Domain isolation reduces one leakage route but does not remove this bias. The project caps ML-only or weak URL evidence at Caution and does not claim current-world phishing accuracy.

**Technical evidence:** [docs/URL_MODEL_EVALUATION.md](URL_MODEL_EVALUATION.md)

**Common mistake to avoid:** Do not hide the collection bias in an appendix only.

## Q35 URL methodology — What were the URL false positives and negatives?

**10-second answer:** The test matrix has 89 false phishing flags among legitimate URLs and 471 missed phishing labels.

**30-second deeper answer:** The denominators are 19,935 legitimate and 16,966 phishing test rows. Those counts yield a legitimate false-positive rate of about 0.4465% and phishing false-negative rate of about 2.7761%. They describe the source-held-out classifier and not the error rates of the final categorical fusion policy.

**Technical evidence:** [docs/URL_MODEL_EVALUATION.md](URL_MODEL_EVALUATION.md)

**Common mistake to avoid:** Do not swap class labels; the source uses 1 for legitimate and 0 for phishing.

## Q36 Phone methodology — Why use Insufficient Evidence for a valid phone number?

**10-second answer:** A valid numbering pattern does not reveal who is calling or whether their request is fraudulent.

**30-second deeper answer:** The engine uses phonenumbers 9.0.38 for offline structure, region and service-type metadata. Ordinary valid or invalid Phone-only cases remain Insufficient Evidence; premium/shared-cost metadata may justify Caution about cost. No subscriber contact, identity lookup or fraud training set exists in the current Phone engine.

**Technical evidence:** [backend/app/phone_intelligence/engine.py](../backend/app/phone_intelligence/engine.py)

**Common mistake to avoid:** Do not convert valid format into Low or Safe.

## Q37 Phone methodology — Can an attacker spoof a phone number?

**10-second answer:** Caller identity cannot be established by this number-string analysis; the project does not detect or rule out spoofing.

**30-second deeper answer:** Even if a displayed number has plausible formatting, the application has no carrier signalling or verified subscriber evidence linking it to the caller. Its limits therefore state that identity and intent are unknown. The correct next action is independent verification, not a claim that bundled metadata proves authenticity.

**Technical evidence:** [docs/PHONE_INTELLIGENCE.md](PHONE_INTELLIGENCE.md)

**Common mistake to avoid:** Do not claim a spoofing detector or describe unimplemented telecom tracing.

## Q38 QR methodology — Why does a valid QR not mean safe?

**10-second answer:** Successful decoding only reveals encoded content; it does not authenticate the creator, destination or payment recipient.

**30-second deeper answer:** The payload may be a URL, phone, text, Wi-Fi data or payment structure. Supported content routes into its existing method, with inherited limitations. Unknown content remains insufficient. Neither the upload nor camera route automatically executes or opens the decoded object, and the original uploaded image is discarded.

**Technical evidence:** [backend/app/qr_intelligence/engine.py](../backend/app/qr_intelligence/engine.py)

**Common mistake to avoid:** Do not call QR decoding fraud detection.

## Q39 QR methodology — What happens to an uploaded image?

**10-second answer:** The authenticated backend validates and decodes it in memory, then discards it and saves permitted decoded assessment data.

**30-second deeper answer:** Default limits include 5 MiB, maximum dimension 4096, 16 million pixels and a 5000-byte payload. Invalid, missing or multiple symbols are rejected. Saved metadata can include an image fingerprint; the original image bytes are not retained. Camera provenance differs because frames are decoded on-device.

**Technical evidence:** [backend/app/qr_intelligence/decoder.py](../backend/app/qr_intelligence/decoder.py)

**Common mistake to avoid:** Do not say no QR data is stored; decoded text is stored privately.

## Q40 Payment QR — What does CRC validate?

**10-second answer:** It checks consistency of the bytes under the implemented CRC calculation; it does not authenticate a merchant.

**30-second deeper answer:** A malicious actor can construct new content with a matching checksum. The generic parser also lacks complete scheme-specific mandatory-field validation: a minimal format-plus-valid-CRC fixture demonstrates that limitation. Payment verification would need additional authoritative validation and recipient evidence, neither of which is claimed here.

**Technical evidence:** [backend/app/qr_intelligence/payment.py](../backend/app/qr_intelligence/payment.py)

**Common mistake to avoid:** Do not call CRC a signature, encryption or proof of legitimacy.

## Q41 Payment QR — Is the payment parser fully EMV compliant?

**10-second answer:** No. It implements a bounded generic TLV/CRC subset and explicitly reports a missing mandatory-field limitation.

**30-second deeper answer:** EMVCo describes payment-specific QR formats and presentation modes, but implementing a subset is not certification against a full specification. The evaluation retains four selected checks plus a separate missing-fields diagnostic. A successful subset result must not be interpreted as scheme compliance or permission to pay.

**Technical evidence:** [docs/CONTROLLED_EVALUATION.md](CONTROLLED_EVALUATION.md)

**Common mistake to avoid:** Do not claim full EMV or local payment-scheme certification.

## Q42 Payment QR — What exactly did Task 9 fix?

**10-second answer:** It redacts first-field Wi-Fi passwords and URL userinfo embedded in payment QR content before new records are saved.

**30-second deeper answer:** Assessment still uses the original decoded bytes, preserving the original CRC evaluation. Redaction can alter the saved payment text, which is therefore an assessment record rather than a reusable payment instruction. Upload/camera responses, database rows, history and search have regression coverage. Old production rows were not rewritten.

**Technical evidence:** [backend/tests/test_final_closure.py](../backend/tests/test_final_closure.py)

**Common mistake to avoid:** Do not say every secret is detected or that existing records were purged.

## Q43 Camera — How does camera consent work?

**10-second answer:** The user starts the camera, sees a decoded stopped preview, then separately chooses Analyse to submit the text.

**30-second deeper answer:** Frames remain on-device and are not recorded or uploaded. Native detection is used where supported; otherwise a same-origin WASM worker decodes bounded frames. Cancel, navigation, hidden page, unmount, timeout and late permission results must stop tracks and workers. The backend treats the payload and provenance as untrusted client input.

**Technical evidence:** [frontend/src/lib/cameraScanner.ts](../frontend/src/lib/cameraScanner.ts)

**Common mistake to avoid:** Do not start the stream merely by selecting the QR tab.

## Q44 Camera — Have you tested real iPhone and Android cameras?

**10-second answer:** Automated streams and Chromium emulation passed; a detailed physical-device evidence record has not been supplied.

**30-second deeper answer:** The owner said it was working, which I preserve as informal acceptance. It does not identify device, browser version, case or date. The manual matrix requires permission, detection, cancellation and fallback checks on the actual devices. I do not invent physical compatibility from the browser test count.

**Technical evidence:** [docs/PRODUCTION_ACCEPTANCE.md](PRODUCTION_ACCEPTANCE.md)

**Common mistake to avoid:** Do not call iPhone viewport emulation Safari hardware testing.

## Q45 Authentication — Why server-side sessions?

**10-second answer:** They let the API centrally validate expiry and revocation while the browser carries an opaque HttpOnly token.

**30-second deeper answer:** The database stores an HMAC digest, not the raw session token. Logout and successful password reset revoke database sessions. This makes revocation explicit across instances using the shared database. The design still requires CSRF protection and does not make cross-site scripting harmless.

**Technical evidence:** [backend/app/core/auth.py](../backend/app/core/auth.py)

**Common mistake to avoid:** Do not claim sessions eliminate every browser attack.

## Q46 Authentication — Why not localStorage JWT?

**10-second answer:** An HttpOnly cookie avoids direct JavaScript reads of the session token, and server records support explicit revocation.

**30-second deeper answer:** A localStorage bearer token has a different exposure and revocation model. That is an engineering trade-off, not proof JWT is always insecure. This project’s tests and lifecycle are built around opaque sessions. Client code holds the CSRF token only in memory and restores it through authenticated /me.

**Technical evidence:** [docs/AUTHENTICATION.md](AUTHENTICATION.md)

**Common mistake to avoid:** Do not say cookies alone solve CSRF.

## Q47 Authentication — Why Argon2id and where are passwords stored?

**10-second answer:** Argon2id is a memory-hard password hash; only its encoded hash is stored in the users table in PostgreSQL.

**30-second deeper answer:** The application explicitly uses time cost 3, memory 65,536 KiB and parallelism 2. The library handles encoded salt/hash data. The raw password is used for verification and is not stored or logged. Token HMAC digests serve a different purpose and are not substitutes for password hashing.

**Technical evidence:** [backend/app/core/auth.py](../backend/app/core/auth.py)

**Common mistake to avoid:** Do not say passwords are encrypted or stored as plain SHA-256.

## Q48 Password reset — Walk through password recovery.

**10-second answer:** A generic request may send a short-lived token; confirmation consumes it, replaces the hash and revokes sessions.

**30-second deeper answer:** Only a digest of the random token is stored, with expiry and used state. The default lifetime is 30 minutes. Confirmation is protected against reuse through transactional handling. Resend is the production mail adapter; local tests use a controlled outbox. Provider success is distinct from inbox receipt.

**Technical evidence:** [backend/app/api/auth.py](../backend/app/api/auth.py)

**Common mistake to avoid:** Do not expose a reset link during the demonstration.

## Q49 Password reset — How do you avoid account enumeration?

**10-second answer:** Response text is generic for unknown accounts and wrong credentials; rate limits and dummy password verification add controls.

**30-second deeper answer:** A password-reset request does not disclose whether the email exists in its returned message. Login uses the same error for missing identity and wrong password. These measures reduce obvious signals, but timing equivalence has not been independently measured. I therefore do not claim perfect enumeration resistance.

**Technical evidence:** [backend/tests/test_auth.py](../backend/tests/test_auth.py)

**Common mistake to avoid:** Do not say all response timing is proven identical.

## Q50 CSRF — What is CSRF?

**10-second answer:** It is an unwanted request made using a browser’s automatically attached credentials from another site’s context.

**30-second deeper answer:** SCAMGUARD’s authenticated mutations require the session, exact allowed Origin and matching X-CSRF-Token. The server checks the synchronizer-token digest against the session. Origin alone is not the full implemented protection. Public login/signup also use exact-origin checks and database rate limits.

**Technical evidence:** [backend/app/core/auth.py](../backend/app/core/auth.py)

**Common mistake to avoid:** Do not confuse CSRF with SQL injection or CORS.

## Q51 CSRF — Why is your CSRF token stable across tabs?

**10-second answer:** It is derived per session with a domain-separated HMAC, so refreshing /me does not invalidate another tab’s token.

**30-second deeper answer:** The database stores its digest and new sessions receive distinct tokens. This addresses the earlier usability problem of concurrent restoration. Identity notifications between tabs contain identity-change information, not raw credentials. Server-side session validity remains authoritative after a logout or password reset.

**Technical evidence:** [docs/AUTHENTICATION.md](AUTHENTICATION.md)

**Common mistake to avoid:** Do not describe a shared global token for every user.

## Q52 Sessions — What happens after logout or a reset?

**10-second answer:** Logout revokes the current session; successful password reset revokes all sessions for that account.

**30-second deeper answer:** The frontend clears private caches when identity changes and does not report logout success if revocation fails. Late profile or restoration responses cannot restore a cleared identity. The backend checks expiry/revocation on protected operations, so a stale screen cannot authorize access by itself.

**Technical evidence:** [backend/tests/test_auth.py](../backend/tests/test_auth.py)

**Common mistake to avoid:** Do not claim client cache clearing revokes a server session.

## Q53 Privacy — Where is user data stored?

**10-second answer:** Account data and owned decoded/text assessments are in Neon PostgreSQL; original QR images and camera frames are not retained.

**30-second deeper answer:** Records include evidence, versions and timestamps. Specific URL/Wi-Fi credentials are redacted, but arbitrary secrets in free text cannot all be detected. Resend handles reset recipients/links. Optional AI has a separate disabled-by-default boundary. Account deletion does not establish deletion from provider backups.

**Technical evidence:** [docs/PRIVACY_MODEL.md](PRIVACY_MODEL.md)

**Common mistake to avoid:** Do not claim nothing sensitive is stored or backups were purged.

## Q54 Authorization — How do you prevent A seeing B’s records?

**10-second answer:** The API gets identity from the validated session and adds owner constraints to private reads, searches and mutations.

**30-second deeper answer:** Foreign detail/delete requests return 404, and dashboards count only owned rows. Tests create all four input modes under A and assert B cannot list, search, retrieve or delete them. Client-provided user_id is not accepted as ownership. UUID secrecy is not the control.

**Technical evidence:** [backend/tests/test_final_closure.py](../backend/tests/test_final_closure.py)

**Common mistake to avoid:** Do not rely on hidden buttons or unpredictable IDs.

## Q55 Authorization — What is an IDOR?

**10-second answer:** It is access to an object through its identifier without a sufficient authorization check for that requester.

**30-second deeper answer:** An attacker might alter an analysis UUID in a request. The service must still require the record’s owner to match the authenticated user. SCAMGUARD checks this for detail and deletion and scopes list/search/dashboard separately. A random UUID lowers guessing convenience but does not replace the owner predicate.

**Technical evidence:** [backend/app/services/analyses.py](../backend/app/services/analyses.py)

**Common mistake to avoid:** Do not define IDOR as merely sequential IDs.

## Q56 Testing — What evidence proves it works?

**10-second answer:** Source-linked tests, frozen evaluation, real PostgreSQL/browser workflows and dated production observations support specific behaviours.

**30-second deeper answer:** The final merged-main gates recorded 159 Vitest, 50 Playwright and 310 Pytest passes, with one opt-in live AI skip. Provider identities and public probes establish the observed production version and readiness. Human usability, physical cameras and inbox receipt remain separate evidence categories.

**Technical evidence:** [docs/FINAL_EVALUATION.md](FINAL_EVALUATION.md)

**Common mistake to avoid:** Do not say tests prove exhaustive correctness.

## Q57 Testing — What failed during development?

**10-second answer:** Task 9 initially hit migration-test setup errors because QR test rows remained before downgrading to an earlier constraint.

**30-second deeper answer:** The database correctly rejected those rows under the old revision. The suffix-guarded disposable test fixture was corrected to clear its own rows before downgrade, and the full suite passed. Production migration logic and data were unchanged. The failure and correction are recorded rather than erased.

**Technical evidence:** [docs/FINAL_TEST_REPORT.md](FINAL_TEST_REPORT.md)

**Common mistake to avoid:** Do not claim every first run passed or that production data was reset.

## Q58 Testing — Do 50 browser tests mean 50 real devices?

**10-second answer:** No. They are 18 foundation, 8 built-preview and 24 PostgreSQL tests using Chromium desktop/mobile configurations.

**30-second deeper answer:** Some transport states are mocked, while persistence tests use the real local API/database. Built-preview tests exercise the actual emitted QR worker/WASM. Synthetic camera streams validate lifecycle and decoding cases. None of that is a physical Safari device lab or a comprehensive accessibility certification.

**Technical evidence:** [docs/FINAL_TEST_REPORT.md](FINAL_TEST_REPORT.md)

**Common mistake to avoid:** State the split and environment, not just the total.

## Q59 Testing — Does pip check mean dependencies have no vulnerabilities?

**10-second answer:** No. It checks installed dependency compatibility; the secret scan and npm advisory audit have different scopes.

**30-second deeper answer:** The final release secret scan found zero eligible findings across 228 current files and 734 historical blobs. It excludes corpora/models/locks/media and does not retrieve production secrets. The earlier npm audit reported zero advisories at its date. There is no claim of a complete Python vulnerability audit.

**Technical evidence:** [docs/FINAL_TEST_REPORT.md](FINAL_TEST_REPORT.md)

**Common mistake to avoid:** Do not turn compatibility or zero matches into absolute security.

## Q60 Deployment — What is the final release SHA?

**10-second answer:** The final main and merge SHA is 4df277bdf93a2e1424ac533d488cd7ba127b35ce, observed on both production providers.

**30-second deeper answer:** It merges accepted Task 9 commit afabf5c into main without conflicts. The full verification gates ran on merged main before the successful push. Vercel was Ready/Current and Render Live at that commit. Later academic documentation edits do not silently constitute a different application deployment.

**Technical evidence:** [docs/FINAL_RELEASE.md](FINAL_RELEASE.md)

**Common mistake to avoid:** Do not substitute the pre-merge branch SHA for the deployed merge SHA.

## Q61 Deployment — How are migrations handled?

**10-second answer:** Alembic applies explicit revisions before API startup; the final application head is 0006_qr_intelligence.

**30-second deeper answer:** Task 9 added no migration. Disposable local PostgreSQL tests cover relevant preservation and downgrade/re-upgrade paths. Production used only SELECT version_num FROM alembic_version for confirmation, with no manual Neon schema edit. A deployment rollback and a database rollback are separate decisions, especially when data exists.

**Technical evidence:** [docs/DATABASE.md](DATABASE.md)

**Common mistake to avoid:** Do not run destructive test fixtures on Neon.

## Q62 Deployment — What if Render is asleep?

**10-second answer:** The first request may wait for startup; I check readiness before demonstrating and keep a labelled local fallback.

**30-second deeper answer:** The project has not measured a cold-start distribution or promised a production SLA. Loading and unavailable states should be explained rather than replaced with invented successful results. If the demonstration budget is exceeded, I switch to the existing local application or authentic saved captures and state the environment.

**Technical evidence:** [docs/PERFORMANCE_RELIABILITY.md](PERFORMANCE_RELIABILITY.md)

**Common mistake to avoid:** Do not repeatedly click submit or fake a result.

## Q63 Limitations — What is the strongest technical contribution?

**10-second answer:** A reproducible evidence pipeline integrated with bounded QR handling and private, session-authorized assessment history.

**30-second deeper answer:** The contribution can be inspected in exported model artifacts, detector/fusion boundaries, camera cleanup and owner-scoped database tests. It is an integration and engineering contribution, not a claim of a new learning algorithm. The project’s limitations are part of the result, particularly source bias and unmeasured human outcomes.

**Technical evidence:** [docs/FINAL_CONCLUSION.md](FINAL_CONCLUSION.md)

**Common mistake to avoid:** Do not claim invention of Logistic Regression, random forests or scam checking.

## Q64 Evaluation — Have you conducted usability testing?

**10-second answer:** A five-task formative protocol is prepared, but participant observations and scores are not yet evidenced.

**30-second deeper answer:** The plan records unassisted/assisted completion, time, errors, ease and comprehension using consenting participants and synthetic fixtures. It is not a SUS study. The owner’s informal acceptance is recorded separately. Until sessions occur, I cannot give participant counts, averages, quotations or statistical conclusions.

**Technical evidence:** [docs/USABILITY_TEST_PLAN.md](USABILITY_TEST_PLAN.md)

**Common mistake to avoid:** Do not describe automated UI checks as a volunteer study.

## Q65 Evaluation — How fast is it?

**10-second answer:** Thirty warm local calls per operation were measured; those timings exclude HTTP, database work, startup and concurrency.

**30-second deeper answer:** The recorded p95 values are 0.229 ms for Message, 0.589 ms for URL, 0.135 ms for Phone and 1.780 ms for QR decode/assessment. They are narrow in-process measurements, not end-to-end page times or a production performance guarantee. Cold-start and load evidence remain absent.

**Technical evidence:** [docs/PERFORMANCE_RELIABILITY.md](PERFORMANCE_RELIABILITY.md)

**Common mistake to avoid:** Do not claim sub-millisecond production response times.

## Q66 Future work — What would you do with another semester?

**10-second answer:** First validate human comprehension and external model performance, then strengthen operational recovery and independent security evidence.

**30-second deeper answer:** I would use licensed representative data with temporal/campaign-aware validation, conduct approved usability/device work, and test backup recovery and realistic load. Reputation or broader payment support would need explicit provenance and privacy controls. I would prioritise evidence and observed needs before adding more infrastructure or adaptive learning.

**Technical evidence:** [docs/FUTURE_WORK.md](FUTURE_WORK.md)

**Common mistake to avoid:** Do not promise uncontrolled automatic retraining.

## Q67 Evaluation — What if an examiner challenges your chronology?

**10-second answer:** I show the Git timestamps and distinguish recorded commits from actual work starts, planned deadlines and review intervals.

**30-second deeper answer:** The repository first records a completed foundation on 3 September 2026 and ends in the final release on 12 September. That does not prove the entire capstone lasted ten days or that earlier planning did not happen. Original approved dates must come from the owner’s retained schedule, not my inference.

**Technical evidence:** [docs/PROJECT_PLAN.md](PROJECT_PLAN.md)

**Common mistake to avoid:** Do not fabricate a semester-long Gantt to look plausible.

## Q68 Presentation — What do you say if you cannot answer a question?

**10-second answer:** I state the limit directly, explain what I do know and point to the evidence I can verify.

**30-second deeper answer:** For example: I have not tested that device, so I cannot claim compatibility; the existing evidence covers Chromium synthetic streams and upload fallback. I would avoid guessing a result or inventing a reference. A clear boundary demonstrates understanding better than an unsupported confident answer.

**Technical evidence:** [docs/FINAL_DELIVERY_TRAINING.md](FINAL_DELIVERY_TRAINING.md)

**Common mistake to avoid:** Do not bluff or use jargon to conceal uncertainty.
