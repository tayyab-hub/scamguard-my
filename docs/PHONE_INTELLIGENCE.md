# Task 6 — Phone Intelligence

Status: manually accepted and merged to `main` on 2026-09-10; production redeployment is owner-controlled.

## Objective and academic position

Task 6 makes `PHONE` a first-class authenticated analysis type alongside `MESSAGE` and `URL`. It
provides useful numbering-plan facts and restrained safety advice without claiming to know a caller's
identity, reputation, ownership or intent.

> A phone number's numbering metadata cannot by itself establish whether the caller is fraudulent.
> ScamGuard therefore uses conservative, explainable risk indicators and reports insufficient
> evidence where a defensible scam determination cannot be made.

## Parsing and normalization

The backend pins `phonenumbers==9.0.38` and uses its bundled offline numbering metadata. Input must
begin with `+` and an international calling code; ScamGuard never silently assumes Malaysia or any
other region. ASCII digits, spaces, hyphens and balanced parentheses are accepted. Controls, format
characters, letters, markup, quotes, non-ASCII digits, malformed parentheses, multiple plus signs,
ambiguous national numbers and oversized input are rejected.

The raw input limit is 64 characters. After formatting is removed, an international number must have
7–15 digits. Accepted input is normalized to E.164 before persistence. The assessment may report the
international display form, calling code, region, possible/valid flags and library number type.
`valid` means the value matches known numbering-plan patterns; it does not prove assignment, current
use, subscriber identity or safety.

## Evidence and risk rules

Every result records explicit `NUMBERING_METADATA` evidence with a category, label, explanation,
severity and family. The engine versions are `phone-intelligence-v1`, `phone-parser-v1`,
`phone-rules-v1` and `phone-fusion-v1`.

- Ordinary valid mobile, fixed-line, fixed/mobile, toll-free, personal, pager, VoIP, foreign and
  unknown-type numbers remain `INSUFFICIENT_EVIDENCE`. They are never called legitimate or safe.
- A reliably valid `PREMIUM_RATE` or `SHARED_COST` classification produces `CAUTION`, because a
  callback may cost more. It is not treated as proof of fraud.
- A parseable but impossible or invalid numbering pattern is reported as a format finding and remains
  `INSUFFICIENT_EVIDENCE`; it does not become `HIGH`.
- Phone assessments have no numeric `risk_score` or `confidence_score`. The UI does not manufacture a
  probability or map the category to an arbitrary number.

Recommendations cover independent verification, passwords/OTP codes, money-transfer pressure,
official organizational channels, and premium-rate callbacks when applicable.

## Privacy and security boundary

Phone Intelligence is deterministic and offline. It does not call or message the number, contact
WhatsApp/Telegram, perform subscriber/SIM/reverse-person lookup, scrape social accounts, browse a
website, or send the number to a reputation or AI provider. No API key or paid service is required.
Only accepted normalized E.164 content and the structured result are persisted under the authenticated
user. Application exception logging does not include raw submitted content.

The existing Task 5 controls are unchanged: HttpOnly opaque server-side sessions, Argon2id,
synchronizer CSRF, exact-origin validation, database-backed per-user analysis rate limiting,
backend-derived ownership, private queries, safe foreign-record 404s and cascade account deletion.
React renders stored content as text. Parameterized SQLAlchemy writes and authoritative backend
validation cover HTML/XSS strings, SQL-like strings, control characters and oversized payloads.

## API and database integration

`POST /api/v1/analyses` accepts `{"input_type":"PHONE","content":"+44 (20) 7946-0958"}` with the
same session, Origin, CSRF, persistence and rate-limit requirements as other analyses. It stores
`+442079460958`, completes synchronously, and returns the shared detail envelope with a typed Phone
assessment. List, detail, delete and dashboard routes require no parallel API.

Alembic revision `0004_phone_intelligence` extends `analysis_input_type` to include `PHONE` and adds a
64-character Phone branch to the existing content constraint. It does not rewrite Message/URL rows.
Downgrade restores the old Message/URL constraint and therefore requires Phone rows to be removed
first; automated downgrade-to-base/re-upgrade runs only after clearing a disposable `*_test`
database. Never use that destructive test sequence on development, Neon or production data.

`GET /api/v1/capabilities` advertises Phone when persistence and all local engines are available.
`GET /api/v1/ready` checks that the Phone engine initialized, alongside the existing database/table,
Message and URL checks. `/health` remains process liveness and is unchanged.

## Frontend and persistence behavior

The existing Phone tab now has international validation, submits through the shared mutation, and
renders a Phone-specific result with normalized/display numbers, region, calling code, type,
possible/valid state, evidence, recommendations, versions and limitations. It is keyboard-operable,
responsive, and obeys live reduced-motion preferences. History labels Phone records, loads the stored
assessment without re-analysis, and deletes through the existing confirmation. Overview counts and
recent/flagged data remain database-derived and per-user; `CAUTION` is not added to the established
ELEVATED/HIGH flagged definition.

## Verification scope

Deterministic tests cover GB, US, Malaysia, Australia, Germany and France examples; fixed, mobile,
fixed/mobile, VoIP, premium and shared-cost types; malformed/ambiguous/invalid/impossible/oversized/
Unicode/control/HTML/SQL-like input; no-network guards; persistence/restart/history/dashboard/delete;
authentication, CSRF, ownership, spoofing, account cascade and PostgreSQL rate limiting. Frontend unit
and real-browser tests cover mode switching, validation, submission, evidence, limitations, actions,
failure behavior, login, history/reload persistence, keyboard use, reduced motion and 320px-to-desktop
layout. Exact executed results are recorded in `PROGRESS.md` and `docs/TESTING.md`.

## Known limitations

Bundled numbering metadata can describe number-plan structure, not whether a number is assigned,
active, spoofed, ported, controlled by the displayed caller, or associated with reports. Metadata also
changes over time and must be deliberately upgraded and regression-tested. Task 6 adds no reputation
database, caller-name service, live carrier lookup, network inspection or cross-modal correlation.
