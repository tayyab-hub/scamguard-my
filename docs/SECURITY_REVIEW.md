# Final internal security review
Date: 2026-09-12. Review the Task 9 branch together with FINAL_AUDIT.md and FINAL_TEST_REPORT.md.
No formal penetration test or independent certification is claimed.

| Boundary | Implemented control and evidence | Practical limit |
| --- | --- | --- |
| Passwords | Argon2id: time cost 3, 65,536 KiB memory, parallelism 2, 32-byte hash. Known-user and missing-user login paths perform hash verification; generic failure. `core/auth.py`, `tests/test_auth.py`. | No measured constant-time guarantee across DB/network/provider operations; no MFA. |
| Sessions | 32 random bytes via token_urlsafe; HMAC-SHA256 digests in auth_sessions; default 168-hour absolute expiry; expiry/revocation checked server-side. | No continuous device-risk checks; database compromise/pepper compromise remain sensitive. |
| Cookies | HttpOnly; production Secure + SameSite=None; server-side opaque token, no localStorage bearer token. | XSS can still act as the user even without reading the cookie. |
| CSRF/origin | Exact allowed origins plus constant-time digest comparison; domain-separated stable per-session CSRF; authenticated ownership derived from session. | SameSite=None makes Origin/CSRF particularly important. CORS alone is not authorization. |
| Rate limits | PostgreSQL advisory-lock serialized buckets for signup/login/analysis/reset; Retry-After on 429. | Basic application limits; no enterprise DDoS defense or automatic old-bucket cleanup. |
| Reset | Random digest-only token; default 30 minutes; locked single-use confirmation; replacement invalidates earlier tokens; all sessions revoked. | Generic body resists direct enumeration, but synchronous mail makes response-time equivalence unproven. Inbox delivery/backup exposure remain operational concerns. |
| Ownership | Owner-scoped list/search/detail/delete/dashboard and profile mutations; foreign/missing/legacy rows use 404; account cascade. All four modes tested with local A/B accounts. | UUID secrecy and UI hiding are not controls; access must continue through these server paths. |
| Input/output | Pydantic bounds/extra-field rejection, SQL parameters, escaped React text, safe error envelopes, request IDs, no-store/nosniff, request body cap. | Not a comprehensive XSS/SQLi fuzzing campaign. No independent frontend security-header audit. |
| URL/Phone | Offline local parsing and inference; socket/DNS/request guards in tests. | Metadata/structure cannot identify an owner or prove fraud. |
| QR | Bounded MIME/content/bytes/dimensions/pixels, one symbol, in-memory decode, no auto-open; explicit camera start/Analyse; track/worker cleanup. | Browser/hardware variability; client-reported camera provenance; dependency/image-parser exposure. |
| Redaction | Task 9 covers first-field Wi-Fi passwords and embedded payment URL userinfo in new saved records. Upload/camera persistence regressions pass. | Not general secret detection for arbitrary text; does not retroactively rewrite production records. |
| Secrets/artifacts | Ignored local environment, locked dependencies, checksum-verified non-executable JSON models, source/history scanner. | Pattern scans cannot prove absence of every secret or vulnerability. |

## Trust and privacy conclusions
No production security control was weakened. No production account creation, reset email, account
deletion or data modification was performed for this review. Existing local fixtures prove auth,
reset, ownership and persistence behaviors against real isolated PostgreSQL.
Public production API denials and provider startup are separate evidence, not authenticated tests.

Payment redaction may alter stored TLV lengths and CRC; assessment continues to refer to the original
submitted bytes. Saved redacted text is not a reusable payment instruction. No full account number,
merchant legitimacy or safe-payment claim follows from CRC consistency.

Remaining risks: unverified inbox delivery; no independent penetration testing; provider backup
retention/deletion and restore untested; no large-scale abuse/load assessment; incomplete privacy
governance; no MFA; expiry/rate/reset records need an operational retention policy.
Review and merge H1 before broader use. Rehearse production only with content you are permitted to submit.
