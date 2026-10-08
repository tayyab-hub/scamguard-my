# Software and hardware requirements

Tables 8–9 specify the actual dependency groups and the equipment roles they support. Version declarations come from frontend/package.json, package-lock.json, backend/pyproject.toml and requirements.lock. These are repository versions, not a recommendation to upgrade. Exact resolved versions remain in the locks. Alternatives are retrospective engineering comparisons unless explicitly marked as evaluated; they are not invented decision history.

**Table 8. Software needs, reasons and trade-offs.** Sources: dependency files and implementation; Google (n.d.), MDN contributors (n.d.), OWASP Foundation (n.d.-a, n.d.-b), Render (n.d.), Vercel (n.d.).

| Technology | Purpose | Why required | Why selected | Alternative considered | Trade-off |
| --- | --- | --- | --- | --- | --- |
| React 19 and TypeScript 5.9 | Typed component UI | Four input/result workflows need consistent state | Matches implemented components and strict transport types | Server templates (analytical alternative) | More frontend tooling and bundle cost. |
| React Router 7; TanStack Query 5; Zod 4 | Routing, server state and boundary validation | Account changes require cache isolation and typed responses | Already exercised by navigation/identity regressions | Manual routing/fetch/state (analytical alternative) | Library complexity; client guards do not authorize API access. |
| Vite 7; Tailwind 4; lucide-react | Build, styling and icons | Produce deployable assets and consistent controls | Existing build/design tokens and route chunks | Other bundler/CSS approach (analytical alternative) | Toolchain size; icon/style consistency still needs review. |
| Node >=22.12; npm lock | Frontend build/test runtime | Required by package engines and locked installation | Release ran Node 24.18.0 | Other compatible Node runtime | Version compatibility must be maintained. |
| Python >=3.12; FastAPI; Uvicorn; Pydantic | Validated HTTP API | Central analysis, auth and error contracts | Matches Python engines and schema-driven routes | Django or Node API (analytical alternatives) | Synchronous analysis occupies request workers. |
| PostgreSQL; SQLAlchemy 2; Psycopg 3 | Relational persistence and transactions | Ownership, uniqueness, cascades and consistent snapshots | Matches actual schema and PostgreSQL integration tests | Document store or SQLite (analytical alternatives) | Database connectivity and migrations become dependencies. |
| Alembic | Versioned schema changes | Deploy existing data without implicit recreation | Explicit 0001–0006 revision chain | Manual DDL (analytical alternative) | Upgrade ordering and recovery require care. |
| scikit-learn; local JSON artifacts | Offline model training/export and custom inference | Reproducible learned Message and URL components | Selected families won fixed validation comparisons | Message SVM/NB; URL SVM/logistic (actually evaluated) | Historical data bias; JSON export requires fidelity checks. |
| tldextract 5.3.1; IDNA | Offline suffix and Unicode URL handling | Parse host/domain consistently without DNS | Pinned offline PSL and shared parser | Ad hoc splitting (analytical alternative) | Bundled suffix data ages; no live ownership evidence. |
| phonenumbers 9.0.38 | Number parsing and metadata | International structure without guessing subscribers | Pinned package, reproducible metadata tests | Live reputation service (future alternative) | No identity or fraud detection; metadata can age. |
| Pillow 12.3.0; zxing-cpp 3.1.1; python-multipart 0.0.32 | Bounded server QR image decode | Validate raster before decoding one payload | Existing byte/pixel/payload limits and tests | Remote decoder (analytical alternative) | Untrusted decoder inputs need bounds; limited image coverage. |
| MediaDevices; BarcodeDetector; zxing-wasm 3.1.3 | Browser camera and local fallback decoder | Explicit on-device capture without frame upload | Native detector when available; same-origin worker otherwise | Upload-only workflow | Permission/browser variation; deferred WASM payload. |
| argon2-cffi; email-validator | Password hashes and account input validation | Protect password verification and normalize account identifiers | Argon2id parameters are explicit; tests cover validation | Other password KDF (analytical alternative) | Hash verification costs memory/CPU; no MFA. |
| Vercel; Render; Neon | Frontend, Python service and managed PostgreSQL | Public delivery with separated service responsibilities | Verified same-commit final deployment | Single managed host (analytical alternative) | More service boundaries; cold starts/network failures. |
| Resend | Production password-recovery mail | Deliver a reset token through a controlled inbox channel | Implemented backend mail adapter | Other mail provider (analytical alternative) | Delivery/domain/provider failure; inbox evidence pending. |
| Optional OpenAI SDK | Grounded external Message review | Not needed for baseline; optional eligible context only | Existing backend-only disabled-by-default adapter | Local-only processing (actual evaluation baseline) | Privacy/cost/network dependency if enabled; no live test claimed. |
| Vitest; Testing Library; Playwright; Pytest/httpx; ESLint; Ruff; Git | Verification and revision tracking | Check contracts, UI, DB boundaries and release identity | Recorded final gates and reproducible commands | Manual-only testing (analytical alternative) | Selected tests are not exhaustive certification. |

**Table 9. Hardware and environment requirements.** Source: recorded execution environment and architecture.

| Role | Requirement | Justification / evidence boundary |
| --- | --- | --- |
| Development computer | Windows computer running Node, Python, local PostgreSQL and Chrome; sufficient disk/RAM for installed dependencies and retained corpora. | Matches the observed release test environment. Exact CPU/RAM and minimum spec NOT YET EVIDENCED; no invented benchmark minimum. |
| Development browser/network | Chrome used for recorded browser tests; internet needed for dependency setup, research and cloud deployment. | Tests run on loopback with isolated DBs; network access is not required by local URL/Phone inference. |
| Development camera | Camera/webcam and permission needed only for physical live-QR checks. | Synthetic streams prove selected lifecycle behaviour, not camera compatibility; upload remains available. |
| Client device | Phone, tablet or computer with a modern JavaScript browser and internet access. | Responsive UI checked at 320–1440 CSS px in Chromium; hardware/browser compatibility beyond that evidence must be recorded. |
| Client camera | Optional camera with browser MediaDevices support on an allowed secure context. | Needed for live QR only; image upload is the fallback (MDN contributors, n.d.). |
| Cloud server | Vercel delivery infrastructure, a Render Python web service and Neon PostgreSQL; no purchased server hardware is part of the project. | Roles are verified in release records. Exact allocated CPU/RAM/storage quotas and workload capacity are provider configuration, not inferred from a green badge. |
| Demo equipment | Presentation computer, projector/display, internet and optional phone/webcam; local app plus copied QR fixtures as backup. | Check room readability and the actual device before delivery; neither is established by a development screenshot. |

No GPU, purchased server or benchmarked minimum bandwidth is asserted. Production PostgreSQL engine-version inventory is separate from local PostgreSQL 17 test evidence; Alembic head describes application schema, not the PostgreSQL major version. The selected hardware profile supports the demonstrated workload; capacity guarantees require measurement.
