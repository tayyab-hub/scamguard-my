# SCAMGUARD Forensic Intelligence

The primary experience is a warm light workspace inspired by careful document review: ivory paper, charcoal typography, terracotta actions, fine rules, and restrained olive service indicators. Editorial headings give the product a distinct identity while compact controls and structured panels keep it practical. The palette represents application state, never invented analysis evidence or risk.

All tokens live in `frontend/src/styles.css` through Tailwind 4 `@theme`. Canvas and text have separate semantic names; components use these shared tokens instead of hard-coded surface colors.

Reconciled with the source on 2026-09-03. This identity is an accepted project decision in [DECISIONS.md](../DECISIONS.md); [CODEX.md](../CODEX.md) defines preservation rules. [PROGRESS.md](../PROGRESS.md) is the latest handoff. Design presentation must not imply that the planned analysis and analytics services already work.

| Token | Value | Role |
| --- | --- | --- |
| canvas | `#f6f4ef` | Warm ivory application background |
| sidebar | `#eeece5` | Persistent navigation surface |
| surface | `#fffefa` | Paper cards and input fields |
| surface-raised | `#f0eee7` | Inset panels and subdued controls |
| line | `#d8d5ca` | Decorative divisions and card borders |
| control | `#918d80` | Visible boundaries of interactive controls |
| ink | `#282b25` | Headings and strong text |
| body | `#45483f` | Body text |
| muted | `#68695f` | Secondary text |
| accent | `#a3462a` | Terracotta primary action and selected controls |
| accent-hover | `#823820` | Primary action hover |
| accent-subtle | `#f3e6de` | Selected navigation and guidance panels |
| on-accent | `#fffaf4` | Primary button and brand-mark foreground |
| success | `#45634a` | Confirmed API liveness |
| success-subtle | `#e8eee3` | Reserved supportive service surface |
| warning | `#815c19` | Unavailable capability text |
| warning-subtle | `#f6efd9` | Unavailable capability notice |
| danger | `#a23530` | Reserved error accent |
| focus | `#784023` | Visible keyboard and field focus |

## Typography and geometry

- Display: local Iowan Old Style / Palatino / Georgia serif stack. Page headings are 32px on mobile and 40px from the small breakpoint; empty-state headings are 23px. Guidance and metric display text use their own compact hierarchy.
- Interface: local Segoe UI / system sans-serif for labels, body text, fields and buttons. No remote font requests.
- Metadata: local Cascadia Code / system monospace, used sparingly for compact labels and unavailable-state chips.
- Core panels and buttons: 6–8px corner radii, fine neutral borders, very small shadows, and generally 20–24px card padding. Existing empty-state icon tiles use a larger radius and the API status chip is pill-shaped. Primary buttons have a minimum 44px height.
- The shield mark and favicon share terracotta and warm white. Brand subtitle and footer identify Forensic Intelligence.

## Navigation and responsive behavior

Only **Overview** (`/`) and **Analyse** (`/analyse`) appear in navigation. There are no active links to unimplemented modules. The dashboard component and `/api/v1/dashboard` endpoint keep their existing technical names and contracts.

At 1024px and above, the fixed 260px sidebar remains in place; it can scroll independently on short screens. Below that breakpoint, the bottom navigation retains safe-area padding, visible active state, and page-bottom clearance. The existing 1480px maximum content width and stacked mobile layout are preserved. Message/URL choices stack below 380px to keep their hit targets and text unclipped.

## Accessibility and honest states

Skip navigation, semantic landmarks, route-heading focus, native radio keyboard interaction, labelled fields, live status messages, retries, and the render-error boundary are preserved. Interactive elements have visible 2px focus outlines; selected radio options highlight their enclosing label. Decorative border colors are separate from control boundaries.

The regression suite checks selected normal-text token pairs at a minimum 4.5:1 contrast and selected focus/control boundaries at 3:1. CSS honors reduced-motion preference. These checks complement screenshot inspection and do not replace a full accessibility audit. Interactive controls retain visible focus; programmatically focused page/main landmarks intentionally suppress the default outline while supporting skip navigation and route announcements.

Loading, request failure, retry, explicit empty history, unavailable metrics, and analysis-unavailable messages all use the same light theme. Em dashes continue to mean unavailable values. No charts, analytics, risk scores, safety verdicts, or synthetic records are introduced. Analyse remains a memory-only draft surface with submission disabled.

## Visual evidence

See [SCREENSHOTS.md](SCREENSHOTS.md) for current desktop/mobile Overview and Analyse captures, and [REDESIGN.md](REDESIGN.md) for the historical migration checks, preservation audit, and limitations. [TESTING.md](TESTING.md) documents opt-in screenshot refresh and manual review. The suite captures images and checks behavior/layout; it does not compare golden-image pixels. The documentation handoff preserved the existing four images. The warm light theme is the only supported theme; there is no alternate legacy palette.
