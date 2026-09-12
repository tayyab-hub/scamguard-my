# Final performance and reliability review

Measured 2026-09-12 on the Windows development machine, Python 3.12.14. Evidence comes from the
production frontend build, source/query inspection, browser lifecycle tests and
[evaluation JSON](evidence/final_evaluation.json). No late speculative optimization was applied.

## Frontend build inventory

Vite production build: 1,769 modules, 5.81 seconds for this run. Decimal kB as reported by Vite.

| Asset | Raw kB | Gzip kB | Loading |
| --- | ---: | ---: | --- |
| Initial JavaScript | 476.16 | 143.08 | Application entry |
| CSS | 46.96 | 9.52 | Application styles |
| Help | 15.25 | 5.69 | Lazy route |
| Account | 6.70 | 2.37 | Lazy route |
| Password reset pages | 6.16 | 2.33 | Lazy routes, shared chunk |
| QR worker | 36.25 | not reported | Only when native detector is unavailable/unsupported |
| QR WASM | 1,093.29 | 460.98 | Same-origin worker fallback on demand |

These are asset sizes, not measured network transfer totals or load-time guarantees.
The initial bundle remains substantial. The large decoder is deferred and its actual emitted
worker/binary were exercised by the 8-test built-preview suite. Existing third-party Rollup/Zod
annotation warnings remain; no chunk-size warning. No asset CDN runtime download is required.

## Local latency sample

One representative input per operation, 30 sequential warm calls, perf_counter milliseconds.
Startup/import/model loading is excluded, as are HTTP transport, DB transactions, provider mail,
cold starts and concurrent load. QR includes fixture-file reading, decoding and routed assessment.
There is no claimed population confidence interval or production SLA; these timings are descriptive.

| Local operation | Samples | Median ms | p95 ms | Max ms |
| --- | ---: | ---: | ---: | ---: |
| message | 30 | 0.179 | 0.229 | 0.230 |
| url | 30 | 0.357 | 0.589 | 0.671 |
| phone | 30 | 0.098 | 0.135 | 0.136 |
| qr_decode_and_assess | 30 | 1.195 | 1.780 | 1.837 |

## Queries, requests and resources

- History uses bounded pages (UI 10), literal escaped owner-scoped substring search, deterministic
  order and summary columns. Detail is fetched on expansion. Offset/search performance on very
  large histories is unmeasured; a leading-wildcard search may need a measured indexing change later.
- Dashboard performs three domain SELECTs: owned count, latest five summaries and grouped type/risk
  counts. Authentication and transaction statements are additional. Source inspection found no
  per-row query loop; this is not a production SQL profiler or a load measurement.
- TanStack Query uses 30-second stale time, no automatic request retry, refetch on window focus
  and mutation invalidation. Health polls every 30 seconds. These are intentional requests;
  no uncontrolled repeated-submission loop was established. No idempotency keys exist.
- Camera scans sequentially with bounded resolution/frequency and a 90-second deadline. Tests cover
  delayed permission/decoder races, cancel, navigation, hiding, unmount, detected state, errors and
  resource cleanup. Frames stay on-device. Real hardware remains a separate acceptance gap.
- QR image decode is bounded by bytes, dimensions, pixels and payload length. Analysis remains
  synchronous; slow inputs/DB/cold starts can occupy request workers. A network error can occur
  after commit: check History before retrying.

## Backend packaging and operations

The existing production wheel built successfully: scamguard_api-0.1.0-py3-none-any.whl,
790,984 bytes in this run. Package inspection verifies Message/URL artifacts, Phone/QR modules,
mail service and required decoder dependencies. The wheel itself is ignored build output; the
Render source deployment additionally provides Alembic migrations and startup scripts.
pip check reports no broken requirements. This is dependency compatibility, not a Python
vulnerability database audit or a Linux production load test.

Fresh public production health/ready/capabilities requests succeeded through Vercel and directly on
Render. Provider state is separately recorded in PRODUCTION_ACCEPTANCE.md. Render's observed free
instance can cold-start; no cold-start distribution, availability window, backup restore, stress,
soak or enterprise-capacity test was performed. Prepare the local/upload demo fallback.
