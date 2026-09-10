# Task 5–6 privacy model

Status: implemented for the Task 5 application boundary; this is an academic prototype explanation,
not a legally complete privacy policy.

SCAMGUARD minimizes account data to a normalized email address, a one-way Argon2id password hash and
timestamps. It stores submitted Message/URL content, normalized E.164 Phone content, the local assessment, evidence and audit metadata
under the submitting account so the user can retrieve private history. It does not store plaintext
passwords, password hints, raw session/CSRF secrets, security questions or profile data.

Authenticated users can list, read and delete only their own analyses. Other accounts cannot see the
record in history, fetch it directly, delete it, or include it in dashboard totals. Historical records
created before accounts have no owner and are hidden from all ordinary users. Account deletion requires
the current password and deletes the account, all server-side sessions and all ownership-linked
analyses through reviewed foreign-key cascades. An individual analysis deletion requires a restrained
frontend confirmation and immediately invalidates the user's history/dashboard queries.

Users should not submit passwords, one-time codes, financial credentials, government identifiers or
other unnecessary sensitive information. URL analysis is string-only and never opens or fetches the
destination. Message and URL results are decision support, not a guarantee that content is safe or
fraudulent. The original Message dataset and current URL dataset/model limitations remain documented.

Local Message, URL and Phone intelligence works without a third party. Phone uses only bundled
numbering-plan metadata: it never calls/messages the number, contacts social/messaging services,
performs subscriber/SIM/reverse-person lookup, or sends the number to an external reputation or AI
provider. Numbering validity does not establish assignment, caller identity, intent, safety or fraud.
Optional external contextual AI is
disabled by default; no production key is configured. If an operator deliberately enables it, the
backend may send best-effort-redacted Message text to the configured provider, while local evidence
continues to work if that provider fails. URL analysis has no live reputation provider and performs no
network retrieval.

Production infrastructure uses Vercel (public frontend), Render (FastAPI) and Neon (managed
PostgreSQL). The user has verified Neon connectivity and Render health/readiness; the Task 5 Vercel
frontend and private-history acceptance are user-verified. Only Render receives the database connection
and auth secret; Vercel uses the existing public same-origin API routing. Provider account terms, database backups,
deletion propagation into provider backups,
formal retention periods, legal notices, incident response, encryption guarantees beyond HTTPS/TLS,
and organizational access procedures still require owner review before broader public or sensitive use.
Basic database rate limits are not enterprise DDoS protection.

See [Authentication](AUTHENTICATION.md) and [Production deployment](PRODUCTION_DEPLOYMENT.md).
