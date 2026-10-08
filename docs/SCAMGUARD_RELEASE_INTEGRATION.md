# SCAMGUARD release integration — 8 October 2026

Status: release verification and deployment in progress. Do not treat pending checks below as passed.

## Scope and baseline

- Repository: https://github.com/tayyab-hub/scamguard-my; production branch: `main`.
- Original baseline: `4df277bdf93a2e1424ac533d488cd7ba127b35ce`, the recorded September release.
- The user clarified during this release that Phase 2 was **planned only**. No Phase 2 implementation is claimed or included. Release scope is the baseline plus the existing Phase 1 engineering changes and suitable technical documentation.
- Inspection found one worktree, no pending merge/rebase and no local branch commits outside main. A fresh origin fetch found no remote changes to reconcile. GitHub reports `main` unprotected; no protection is bypassed.
- Existing four engines, QR upload/camera, auth/session/reset/account workflows, private history, dashboard/statistics, explanations, recommendations and Help remain in scope. No redesign or new model training is part of this release.

## Preservation and integration

Before editing release files, 157 changed/untracked files were archived with their original bytes, hashes and a binary Git patch under ignored `.tmp/release-integration-20261008/`. The local branch `codex/release-base-20261008` preserves the original baseline. The integration branch is `codex/release-integration-20261008`.

No conflict resolution, reset, destructive clean, force push or history rewrite was required. Generated academic DOCX submissions remain local under ignored `output/`; they may contain personal cover details and are preserved in the local checkpoint. Technical Markdown, generation sources and explicitly synthetic screenshots are suitable versioned evidence. `.tmp/` is now ignored by the repository rather than relying only on a local exclusion.

Phase 1 includes account/source login budgets, replacement-session revocation, rehash-on-login, account-deletion attempt limits, safe diagnostics and startup/body-buffer reliability; Message rules-only obfuscation normalization and uncertainty/corroboration guards; neutral URL context corrections; QR payment-integrity/destination/redaction safeguards; nullable confidence and historical-response compatibility; evidence-balanced results, applicable actions, inconclusive-history navigation and late-401/timeout handling. See the unchanged historical [Phase 1 report](ENGINEERING_REVIEW_2026-10-08.md) for its exact methods and measured limitations.

## Commits and rollout order

| Commit / step | State |
| --- | --- |
| Frontend compatibility commit | `da01a036fa8d9b72a0687af81bb8571ff8a59893`, normally merged as `ad14e75345f7566df0825a74eecbbd08bb83e108` and pushed to main |
| Backend, integration tests and technical documentation | `219db7978e984045a040eb493b0509bbdd7ae292` |
| Integrated main / GitHub push | Normal merge `2620bdfa43d6696b1695b3f14cd40616197b94cc`; both main and integration branch verified on origin |
| Vercel compatibility frontend | Ready production deployment [6HzpvLG88m5uiQKf5tN5MDpfc5aS](https://vercel.com/tayyab-d919/scamguard-my/6HzpvLG88m5uiQKf5tN5MDpfc5aS), source `ad14e75345f7566df0825a74eecbbd08bb83e108` |
| Render production | Existing service; dashboard authentication pending |

The integrated Vercel deployment [45FaBNvYNDZ8ZQb8ooEf3iL2YAM2](https://vercel.com/tayyab-d919/scamguard-my/45FaBNvYNDZ8ZQb8ooEf3iL2YAM2)
is Ready / Production / Current at `2620bdfa43d6696b1695b3f14cd40616197b94cc`.
Render's public capabilities changed to the v2 implementation by 13:53 UTC, with all four
engines ready and database connected. Its exact deployed SHA and startup logs still require
dashboard sign-in; behavior alone is not SHA verification.

## Integration correction discovered in GitHub CI

Both initial hosted runs failed the first desktop camera test while all other executed tests
passed (the integrated run: 355 backend, 164 frontend, 18 foundation and 25 persistence passed;
one camera failure, one live-AI skip; preview did not execute). The retained Playwright trace
shows the first camera worker request loading `zxing-wasm/reader`, followed by a document reload
and changed optimized React dependency hash. The reload resets the selected camera input to
upload mode. This is cold-start Vite dependency discovery, not evidence of a failed QR decode.

Explicitly include `zxing-wasm/reader` in `optimizeDeps` so discovery happens at startup. This
follows [Vite's dependency pre-bundling guidance](https://vite.dev/guide/dep-pre-bundling).
No assertion, retry setting, timeout or test was removed. This configuration does not change
the production bundle or the QR decoder. Follow-up local frontend checks passed; the complete
hosted rerun and final smoke evidence are recorded below when available.

Frontend-before-backend compatibility still applies. New Message results can have null confidence; the new frontend accepts old and new payloads, but the old frontend can reject those results. The safe sequence is to deploy the compatibility frontend with the old backend, verify Vercel Ready at that commit, then release the backend and integrated tests/documentation. Existing auto-deploy behavior should be used, without duplicate deployments. No provider secret, paid plan or new service is required.

Observed Vercel configuration: Git repository `tayyab-hub/scamguard-my`, production `main`, root `frontend`, Vite defaults (`npm run build`, `dist`), Node 24.x and automatic Git deployments. Preserve existing API routing and environment settings. The Render source configuration remains root `backend`, locked Python package build, `scripts/start_production.py`, readiness at `/api/v1/ready`, and the existing environment-only Neon/auth/mail settings.

## Database safety

There are no new migrations or schema changes in this integration. The expected single head is `0006_qr_intelligence`. Local downgrade/re-upgrade and schema checks use isolated `_test` / `_e2e` PostgreSQL databases. Production validation will use read-only readiness/schema evidence plus synthetic account-owned test records, with cleanup limited to those accounts. No existing production users or analyses may be altered.

## Release verification

The complete current suite passed again: **355 backend + 164 frontend + 52 browser tests = 571 passed**, zero final test failures, one opt-in live-AI skip. The browser total is 18 foundation + 8 built preview + 26 real PostgreSQL. All 19 release gates passed, including 16 separate static launcher assertions. Detailed logs remain local under `.tmp/release-integration-20261008/checks/`; commands, log hashes, timings, test counts and model packaging checks are in [release-integration-verification.json](evidence/release-integration-verification.json).

The first static-launcher invocation was blocked by the machine's default PowerShell script policy before execution. The repository's established per-process invocation passed; no machine-wide setting changed. The existing two backend dependency deprecations and Vite annotation warnings remain. Both frozen model reproductions passed without retraining. Alembic reports the single `0006_qr_intelligence` head and no schema drift. No package dependency changed.

Staged inspection covered 144 files, no prohibited paths and no file above 50 MiB; the largest
new file was a 580,243-byte synthetic screenshot. A fresh bounded scan covered 287 current files
and 859 historical blobs with zero findings. Generated SVG path-line trailing spaces were
normalized before commit; parsed XML semantics were checked unchanged. Original bytes remain
in the local checkpoint, and historical evidence hashes retain their original scope.

Required gates: TypeScript, ESLint, Vitest, production build, full pytest with real PostgreSQL, Ruff lint/format, pip compatibility, Alembic current/heads/check, frozen Message evaluation, URL pipeline verification, backend wheel packaging, all three Playwright suites, static launcher checks, whitespace and bounded secret/staged-file inspection.

The online npm advisory audit was previously blocked by automatic approval review for registry metadata egress; this release does not silently retry that rejected operation or claim a fresh vulnerability-audit result.

## Production evidence

| Area | Actual release result |
| --- | --- |
| GitHub expected commits / source/model presence | Pending push verification |
| Vercel live SHA and deployment | Pending |
| Render live SHA and startup logs | Pending |
| Neon connectivity and migration readiness | Pending live checks |
| Website navigation, responsive layout and console | Pending live smoke |
| Auth, session restoration/logout and account isolation | Pending live smoke |
| Message, URL, Phone, QR, uncertainty and explanations | Pending live smoke |
| Persistence, reopening and owned deletion | Pending live smoke |
| Reset-mail delivery to an owner-controlled inbox | Not verified; requires an owner-controlled inbox |

## Rollback and limitations

The previous production release is `4df277bdf93a2e1424ac533d488cd7ba127b35ce`. Roll back backend application code first if necessary, then frontend, keeping nullable-confidence support while any newer backend is active. Do not roll back the database or erase stored analyses. Saved v2 records remain compatible with the updated frontend; an older frontend can reject their null confidence even after a backend rollback, so retaining the compatibility frontend is preferable.

No claim of calibrated fraud probability, live reputation lookup, caller identity, merchant authentication or physical-device camera validation is introduced. The frozen models retain their documented historical dataset biases and measured false negatives. Deployment acceptance does not replace a penetration test or human usability study.

## Academic alignment

Keep the four-engine scope, frozen models and Vercel–Render–Neon topology. No ER diagram update is needed. Update implementation/methodology/security explanations and screenshots using the exact deltas in section 13 of the Phase 1 report. Label Phase 2 as planned. The generated September Word package remains a historical local artifact; production claims must use the final deployed commit and smoke evidence recorded here when complete.
