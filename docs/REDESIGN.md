# Forensic Intelligence visual migration

This is the historical visual-migration delivery record from 2026-09-03. The later documentation-only memory handoff is recorded in [PROGRESS.md](../PROGRESS.md); read [CODEX.md](../CODEX.md) before future implementation. Counts and archive references below describe this migration's point-in-time deliverable, not the source inventory after later tasks.

## Baseline recorded before visual changes

2026-09-03: inspected the existing frontend and backend and read README.md, DESIGN_SYSTEM.md, TASK_1.md, and the API implementation. No additional AGENTS.md instructions were present. Source file hashes were captured before editing to verify the preservation boundary at completion.

| Existing check | Baseline result |
| --- | --- |
| TypeScript (`npm run typecheck`) | PASS |
| ESLint (`npm run lint`) | PASS |
| Vitest (`npm test`) | PASS — 24 tests |
| Production build (`npm run build`) | PASS |
| Playwright (`npm run test:e2e`, installed Chrome) | PASS — 4 tests |

The baseline build reports two third-party Zod/Rollup comment-annotation warnings. Playwright reports a CLI color-environment warning. Neither is an application console error. Existing tests are retained without rewriting their assertions, removing coverage, or changing skip behavior.

This is a visual migration of Task 1. The backend, API contracts, SQLAlchemy/PostgreSQL configuration, request handling, queries, and unavailable-analysis behavior are preserved. Task 2 is not part of this work.

## Visual changes

The application now uses the warm light Forensic Intelligence palette throughout: ivory canvas and paper cards, charcoal body text, terracotta actions, olive API liveness, and a muted amber capability notice. Serif display headings, compact monospace metadata, quieter borders, smaller corner radii, and consistent field/focus styling replace the previous visual treatment. Branding, favicon, browser theme color, footer, README, and design documentation use the current identity.

Overview and Analyse are the only navigation entries, pointing to the existing `/` and `/analyse` routes. No future-module links, synthetic analytics, fake results, or new application capabilities were added. The metric placeholders, empty history, local drafts, loading/error/retry states, API status behavior, and disabled analysis action retain their existing meaning.

The desktop/sidebar breakpoint stays at 1024px. Mobile keeps its fixed bottom navigation and safe-area padding. Content-type choices stack below 380px, and short desktop sidebars can scroll, keeping controls usable without changing routing or analysis behavior.

## Files changed

13 existing files were updated:

```text
README.md
docs/DESIGN_SYSTEM.md
docs/TASK_1.md
frontend/index.html
frontend/public/favicon.svg
frontend/src/styles.css
frontend/src/components/ApiStatus.tsx
frontend/src/components/Brand.tsx
frontend/src/components/PageHeading.tsx
frontend/src/components/States.tsx
frontend/src/layout/AppShell.tsx
frontend/src/pages/AnalysePage.tsx
frontend/src/pages/DashboardPage.tsx
```

Seven deliverable files were added:

```text
docs/REDESIGN.md
docs/SCREENSHOTS.md
docs/screenshots/dashboard-desktop.png
docs/screenshots/dashboard-mobile.png
docs/screenshots/analyse-desktop.png
docs/screenshots/analyse-mobile.png
frontend/e2e/visual-regression.spec.ts
```

The original foundation inventory in FILES_CREATED.txt remains a historical record. At visual-migration delivery, the redesigned source deliverable contained 73 files including the seven additions above. The later project-memory documents are not included in that historical count.

## Preservation audit

SHA-256 comparisons against the before-edit inventory confirm:

- All **22 backend files are byte-for-byte unchanged**, including routes, schemas, errors, configuration, sessions, migrations, dependencies, and tests.
- All **seven existing test files are byte-for-byte unchanged**. Original fixtures and test setup are also unchanged. No assertions, skip conditions, timeouts, or test selection were relaxed.
- Frontend API transport, Zod schemas, query hooks, environment parsing, app route definitions, and main providers are unchanged.
- PostgreSQL Compose settings, environment examples, package manifests/lockfiles, TypeScript/ESLint/Vite/Playwright configuration, and CI are unchanged.
- `.gitignore` is unchanged and includes every required generated-folder exclusion.
- Source and documentation scans found no outdated theme terminology or previous palette values. The current production build contains the new theme.

The local hash baseline and packaging helper are kept in ignored `.local/` work files, outside the source archive.

## Final checks

| Check | Before | After |
| --- | --- | --- |
| TypeScript | PASS | PASS |
| ESLint, zero warnings | PASS | PASS |
| Vitest | 24 passed | 24 passed |
| Production build | PASS | PASS |
| Existing Playwright tests | 4 passed | 4 passed |
| Additional visual/keyboard/responsive tests | Not present | 6 passed |
| Total Playwright tests | 4 passed | 10 passed |
| Backend pytest | Original foundation: 22 passed, 1 skipped | 22 passed, 1 pre-existing integration skip |

No browser console or page errors occurred in the successful live API flows. Expected 503 fixtures remain confined to tests. The production build produces 370.31 kB of JavaScript (113.92 kB gzip) and 27.79 kB of CSS (5.80 kB gzip).

Commands executed from `frontend/`: `npm.cmd run typecheck`, `npm.cmd run lint`, `npm.cmd test`, `npm.cmd run build`, and `npm.cmd run test:e2e` with `PLAYWRIGHT_CHANNEL=chrome`. Documentation capture additionally sets `UPDATE_DOC_SCREENSHOTS=1`. Prettier was applied only to modified presentation files and the newly added visual test. From `backend/`, `.venv/Scripts/python.exe -m pytest` verified the unchanged backend. Approved access was used for bundler/browser execution because of the known Windows sandbox restriction.

The existing Zod/Rollup annotation warnings, Playwright CLI color-environment warning, and Starlette/httpx/AnyIO deprecation warnings remain non-failing third-party messages. They were not suppressed.

## Screenshot inspection

The four deliverable images are linked in [SCREENSHOTS.md](SCREENSHOTS.md). Desktop images are full-page captures at 1440px width; mobile images capture the actual 390px viewport. Additional full-page mobile images and radio/input focus images are retained in ignored Playwright output for inspection.

Manual inspection covered clipping, horizontal overflow, contrast, spacing, element sizing, navigation, mobile overlap, and focus visibility on both pages. Full-page mobile screenshots originally showed viewport-fixed navigation floating across a long stitched document; documentation capture was changed to use the real mobile viewport, while retaining full-page images for QA. This capture adjustment does not alter the rendered application or weaken a test assertion.

No remaining clipping, horizontal overflow, broken navigation, inaccessible focus ring, or unusable overlapping form control was observed. The mobile content scrolls beneath the fixed navigation as intended, with page-bottom clearance. Additional browser assertions verify layouts at 320, 768, and 1024px, text contrast of at least 4.5:1 for the checked token pairs, and control/focus contrast of at least 3:1. Skip-link activation, route-heading focus, native radio-arrow navigation, field focus, and disabled submission are exercised.

## Clean source deliverable

The source-only ZIP was generated in the ignored `.local/` folder for this migration. Its entries were checked to exclude `node_modules`, `.venv`, `dist`, `__pycache__`, `.pytest_cache`, `.ruff_cache`, `test-results`, `playwright-report`, and `*.egg-info`, plus local secrets and temporary files. The four documentation PNGs are intentional assets and were included. Local installed dependencies remain available for development and are not part of the source deliverable.

The existing ZIP predates the project-memory handoff and must not be distributed as the current source. Its ignored helper contains a fixed 73-file assertion and is not a maintained general release packager. No archive was regenerated during the documentation-only handoff; any future requested source package must use a fresh inventory and preserve all generated-folder/secret exclusions.

## Remaining limitations

- The pre-existing PostgreSQL integration test remains skipped because `TEST_DATABASE_URL` is not configured; this redesign does not change database setup. CI has not run remotely.
- Browser verification uses installed Chrome and Chromium mobile emulation, not physical devices, Safari, or Firefox. Contrast checks and manual review are not a complete accessibility audit.
- The theme is warm light only, with English UI. No new content submission, authentication, storage, or detection functionality is introduced.
- The original analysis-unavailable behavior remains in force. Advanced ML, OCR, QR, adaptive learning, and campaign detection are not implemented.

**Task 2 has not been started.**
