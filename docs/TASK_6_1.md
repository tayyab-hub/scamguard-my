# Task 6.1 — authentication, profile and data-management polish

Status: implemented and fully verified on `task-6-1-auth-profile-polish`; manual acceptance and merge
are pending. QR Intelligence was not started.

## Data and security design

Alembic `0005_auth_profile_polish` adds nullable `users.full_name`, nullable `users.username`, a
partial unique normalized-username index and `password_reset_tokens`. Null profile fields are a
deliberate transition for accounts created before Task 6.1. No name or username is inferred from an
email. New signup and authenticated profile update require both fields.

Full names are NFC-normalized, trimmed, 2–100 characters, and allow international Unicode letters,
combining marks, spaces, periods, apostrophes and common hyphens. Controls, markup, numbers and other
punctuation are rejected. Usernames are 3–30 ASCII letters, numbers or underscores; they are stored
lowercase and are case-insensitively unique. Email retains the existing validated, trimmed, lowercase
normalization. Passwords remain 12–128 characters with a passphrase-friendly length policy and
Argon2id storage.

Reset secrets contain 256 random bits from Python `secrets`, exist in a one-time URL, and are stored
only as `AUTH_TOKEN_PEPPER` HMAC-SHA-256 digests. They expire after 30 minutes by default. A successful
reset marks every outstanding token used, replaces the Argon2id password hash and revokes all sessions.
Request and confirmation use PostgreSQL rate-limit buckets. Public request responses are identical for
existing and absent emails.

Production delivery uses Resend. Required new Render names are `FRONTEND_BASE_URL`, `MAIL_PROVIDER`,
`RESEND_API_KEY`, and `RESEND_FROM_EMAIL`. Create a Resend account, verify a sending domain, issue a
sending-only domain-scoped key, and add the values to Render before deploying Task 6.1. No Vercel
variable is required; the existing relative `/api/v1` rewrite remains authoritative.

## Data visibility and editing

Application records live in Neon PostgreSQL and pass through FastAPI ownership filters. Users see
their records on Overview, Analysis History and expanded Analysis Detail. Security tables—sessions,
rate buckets and reset tokens—have no frontend endpoint.

Full name and username are editable. Email is read-only until verified email-change delivery exists.
Completed analysis content and results are immutable for audit integrity. Analyse again is available
on an owned completed Message, URL or Phone detail: it copies input to an editable browser draft and a
subsequent submit creates a new owned row. The source row is never changed. Foreign detail requests
remain the same 404 and cannot disclose input.

## Manual acceptance

1. Run `git switch task-6-1-auth-profile-polish`, start the normal local stack, and confirm `/ready`.
2. Create an account with a Unicode or hyphenated full name, mixed-case username, valid email and a
   12+ character passphrase. Confirm inline invalid-name/username/email/password/mismatch feedback.
3. Log out; sign in first with email, then with the username in different casing. Confirm the same
   generic error for a wrong identifier and wrong password.
4. Open Account. Change full name and username, save, refresh, and confirm persistence. Confirm email
   is read-only and a duplicate/malformed username is rejected.
5. For a pre-Task-6.1 account, confirm the profile-completion notice appears and Account can save the
   missing fields without losing history.
6. From Sign in choose Forgot password. In local/test, inspect the in-process mail outbox through the
   automated backend test rather than a public endpoint. In a configured staging Render deployment,
   use the received Resend link. Set a new passphrase, confirm old sessions stop working, the old
   password fails, the new password works, and the link cannot be reused.
7. Create one Message, URL and Phone analysis. From each expanded history/detail choose Analyse again,
   edit the copied input, submit, and confirm two separate records exist while the original is intact.
8. Sign in as a second user and confirm the first user's dashboard, history, details and copied inputs
   are inaccessible. Confirm own deletion and account deletion still work.
9. Review Help and Account explanations of Neon persistence, user-visible views, editable profile data
   and immutable analysis results at desktop and mobile widths.

Do not test password-reset email in production until the migration and four new Render settings are
present. Do not manually alter Neon; the production start process applies Alembic. Do not merge this
branch or begin QR until manual acceptance is complete.
