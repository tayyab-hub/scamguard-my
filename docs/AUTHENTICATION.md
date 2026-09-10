# Task 5 authentication and authorization

Status (2026-09-10): **complete and user-verified in the Vercel → Render → Neon production
architecture.** Task 6 reuses these controls unchanged for Phone analyses.

## Architecture

SCAMGUARD uses full-name/username/email accounts and opaque server-side sessions. Passwords are hashed with
Argon2id (`argon2-cffi`) using the application's explicit time, memory and parallelism settings.
Passwords, raw session tokens and raw CSRF tokens are never stored. A cryptographically random
session token exists only in an HttpOnly cookie; the database stores an HMAC-SHA-256 digest made
with the environment-only `AUTH_TOKEN_PEPPER`. Sessions expire, can be revoked, and are shared
through PostgreSQL rather than process memory.

Production uses one `Secure; HttpOnly; SameSite=None; Path=/` session cookie because the Vercel and
Render origins are different sites. Local development uses `Secure=false; SameSite=Lax`. The
frontend always sends credentialed requests, keeps the synchronizer CSRF token only in memory, and
obtains a fresh CSRF token from `GET /api/v1/auth/me` after a page refresh. It does not place auth
secrets in localStorage.

State-changing requests require all three of:

1. a current server-side session;
2. an exact allowed `Origin` header; and
3. the matching `X-CSRF-Token` synchronizer token.

This protects logout, profile changes, analysis creation/deletion and account deletion. Signup and login require an
exact allowed origin and have PostgreSQL-backed rate limits. Login accepts a normalized username or
email. Errors deliberately use the same `Invalid username/email or password.` response for an unknown account and a wrong password; a dummy Argon2
verification reduces user-enumeration timing differences. Email is validated, normalized to lower
case, unique in PostgreSQL, and duplicate races return a safe conflict response. Passwords are 12–128
characters without obsolete composition rules. Usernames are 3–30 ASCII letters, numbers or
underscores, stored lowercase and uniquely indexed. Full names support Unicode letters/marks, spaces,
apostrophes, periods and hyphens after trimming, and reject controls/markup. Migration
`0005_auth_profile_polish` keeps both fields nullable for existing production users; new signups and
profile updates require both.

Password recovery stores only an HMAC-SHA-256 digest of a 256-bit random one-time token. Tokens expire
after 30 minutes, become used on success, and are removed with the account. Request and confirmation
use the existing PostgreSQL rate buckets. A successful reset replaces the Argon2id hash and revokes
every session. Public request responses never disclose whether the email exists. Development/test
delivery is held only in an in-process outbox; production uses Resend server-side and never returns or
logs the reset URL.

## Endpoints

| Method and path | Behavior |
| --- | --- |
| `POST /api/v1/auth/signup` | Creates a validated profile and session; returns minimal user data plus the in-memory CSRF token. |
| `POST /api/v1/auth/login` | Verifies a username/email identifier with a generic failure and creates a new session token. |
| `GET /api/v1/auth/me` | Validates the cookie and returns the current profile plus a stable per-session CSRF token. |
| `PATCH /api/v1/auth/profile` | Changes only the authenticated user's full name and username; requires Origin and CSRF. |
| `POST /api/v1/auth/password-reset/request` | Gives a generic response and delivers a short-lived one-time link where applicable. |
| `POST /api/v1/auth/password-reset/confirm` | Consumes the link, replaces the password hash and revokes all sessions. |
| `POST /api/v1/auth/logout` | Requires CSRF, revokes the database session and clears the cookie. |
| `DELETE /api/v1/auth/account` | Requires CSRF and the current password; deletes the user transactionally. Foreign-key cascades delete sessions and owned analyses. |

Task 8 derives that CSRF token through a domain-separated HMAC of the opaque session using the
existing pepper, storing only its digest. New sessions have distinct tokens; a legacy session digest
transitions once on restoration. Ordinary `/me` calls no longer break another tab's valid CSRF.
The frontend clears private caches on identity changes, scopes queries to user identity and sends
only identity-change notifications between tabs. Late restoration/profile responses cannot revive a
cleared identity. Failed logout reports failure and keeps the session visible until revocation is
confirmed. The server remains authoritative for session validity, ownership and revocation.

Analysis submission, history, detail, deletion and dashboard API operations require authentication.
Health, readiness and the non-user-specific capabilities probe remain public. The frontend protects
Overview, Analyse and Account routes, preserves only safe in-app intended destinations, and returns
to Sign In on a 401 without an open redirect.

## Ownership and access control

`0003_auth_ownership` adds `users`, `auth_sessions`, `auth_rate_limits`, and nullable
`analyses.user_id`. New submissions ignore any client ownership claim and set `user_id` from the
validated session. Every list, detail, deletion and dashboard query includes the authenticated user
ID. A record that is missing, belongs to somebody else, or is a legacy unowned record produces the
same 404 detail behavior, avoiding an IDOR/existence oracle.

Pre-authentication rows remain `user_id = NULL`. They are preserved for migration compatibility but
are invisible to normal accounts and excluded from their dashboard totals. They are not assigned to
the first or any later user. Schema nullability exists only for those records; the application always
sets ownership for new writes.

PostgreSQL-backed fixed-window rate buckets cover signup by client IP, login by IP plus normalized
identifier, password-reset request/confirmation, and analysis submission by user. Transaction-scoped PostgreSQL advisory locks serialize each
bucket, so limits are shared across workers. This is basic application abuse protection, not a DDoS
service or enterprise bot defense.

## Security review boundary

- SQLAlchemy parameters prevent user text from becoming SQL; React renders submitted text as text,
  not executable markup.
- Session tokens are random, rotated on every login, stored hashed, expired and revocable. HTTPS and
  the HttpOnly flag reduce—but cannot eliminate—token theft risk.
- Exact CORS origins are required in production. Wildcards and credentialed `*` are rejected.
- Authorization is enforced in backend queries, not only through hidden frontend navigation.
- Safe error envelopes do not expose hashes, tokens, database details, tracebacks or raw content.
- The raw CSRF token is necessarily present in the authenticated JSON response and frontend memory;
  XSS would still be serious. The existing no-HTML rendering boundary and dependency hygiene remain
  important.
- Cross-site cookies may be blocked by restrictive browser privacy settings. Verify the actual
  Vercel/Render pair in target browsers; same-site custom domains or a reviewed same-origin proxy are
  future mitigations if this occurs.

See [Privacy model](PRIVACY_MODEL.md), [API](API.md), and [Production deployment](PRODUCTION_DEPLOYMENT.md).
