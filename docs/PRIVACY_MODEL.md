# Task 5–7 privacy model

Status: implemented for the Task 5 application boundary; this is an academic prototype explanation,
not a legally complete privacy policy.

SCAMGUARD limits account profile data to a full name, normalized username, normalized email address,
a one-way Argon2id password hash and timestamps. It stores submitted Message/URL content,
normalized E.164 Phone content, decoded QR content, the local assessment, evidence and audit metadata
under the submitting account so the user can retrieve private history. It does not store plaintext
passwords, password hints, raw session/CSRF/reset secrets, or security questions. Reset records contain
only an HMAC digest, expiry/use timestamps and the owning user ID.

Authenticated users can list, read and delete only their own analyses. Other accounts cannot see the
record in history, fetch it directly, delete it, or include it in dashboard totals. Historical records
created before accounts have no owner and are hidden from all ordinary users. Account deletion requires
the current password and deletes the account, all server-side sessions and all ownership-linked
analyses and reset records through reviewed foreign-key cascades. An individual analysis deletion requires a restrained
frontend confirmation and immediately invalidates the user's history/dashboard queries.

The Overview, Analysis History and expanded Analysis Detail are the user-facing views of persisted
Neon data. Security tables are never exposed. Full name and username may be updated; email is read-only
without a verification flow. Completed analysis content and assessments are immutable. Analyse again
copies owned input into a new browser draft, which may be edited and submitted as a separate record;
the original is not mutated.

For QR, the authenticated backend validates and decodes one bounded raster image into an in-memory
pixel buffer. It does not retain the original image in application storage or PostgreSQL; the upload
parser may use a transient operating-system spool that is closed and removed after the request.
Private history stores decoded content and derived audit metadata,
including a file SHA-256 fingerprint, and marks the original image as not retained. URL credentials
and Wi-Fi password fields are redacted before storage; routed phones are normalized to E.164. Because
the image is discarded, QR history cannot reconstruct it and requires a new upload for another run.

Users should not submit passwords, one-time codes, financial credentials, government identifiers or
other unnecessary sensitive information. URL analysis is string-only and never opens or fetches the
destination. Message and URL results are decision support, not a guarantee that content is safe or
fraudulent. The original Message dataset and current URL dataset/model limitations remain documented.

Local Message, URL, Phone and QR intelligence works without a third party. Phone uses only bundled
numbering-plan metadata: it never calls/messages the number, contacts social/messaging services,
performs subscriber/SIM/reverse-person lookup, or sends the number to an external reputation or AI
provider. Numbering validity does not establish assignment, caller identity, intent, safety or fraud.
Optional external contextual AI is
disabled by default; no production key is configured. If an operator deliberately enables it, the
backend may send best-effort-redacted Message text to the configured provider, while local evidence
continues to work if that provider fails. URL analysis has no live reputation provider and performs no
network retrieval.

QR decoding does not open links, execute payloads, contact numbers, join networks or launch payment
flows. It does not verify the creator, merchant, recipient or ownership of an account. A payment CRC
is an integrity check only. Identical-image fingerprints can be identifying metadata, so they remain
inside the same private ownership/deletion boundary as the rest of the analysis.

Production infrastructure uses Vercel (public frontend), Render (FastAPI) and Neon (managed
PostgreSQL). The user has verified Neon connectivity and Render health/readiness; the Task 5 Vercel
frontend and private-history acceptance are user-verified. Only Render receives the database connection
and auth secret; Vercel uses the existing public same-origin API routing. Provider account terms, database backups,
deletion propagation into provider backups,
formal retention periods, legal notices, incident response, encryption guarantees beyond HTTPS/TLS,
and organizational access procedures still require owner review before broader public or sensitive use.
Basic database rate limits are not enterprise DDoS protection.

See [Authentication](AUTHENTICATION.md) and [Production deployment](PRODUCTION_DEPLOYMENT.md).
