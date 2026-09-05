# SCAMGUARD Forensic Intelligence

The primary experience is a warm light workspace inspired by careful document review: ivory paper, charcoal typography, terracotta actions, fine rules, and restrained olive service indicators. Editorial headings give the product a distinct identity while compact controls and structured panels keep it practical. The palette represents application state, never invented analysis evidence or risk.

All tokens live in `frontend/src/styles.css`: color/type tokens use Tailwind 4 `@theme`, and reusable motion tokens use `:root`. Canvas and text have separate semantic names; components use these shared tokens instead of hard-coded surface colors.

Reconciled with the source on 2026-09-04. This identity is an accepted project decision in [DECISIONS.md](../DECISIONS.md); [CODEX.md](../CODEX.md) defines preservation rules. [PROGRESS.md](../PROGRESS.md) is the latest handoff. Design presentation must not imply that the planned analysis and analytics services already work.

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

Only **Overview** (`/`), **Analyse** (`/analyse`) and **Help & Support** (`/help`) appear in navigation. Help is a real local guidance/search/feedback-preparation route. There are no active links to unimplemented intelligence modules. The dashboard component and `/api/v1/dashboard` endpoint keep their existing technical names and contracts.

At 1024px and above, the fixed 260px sidebar remains in place; it can scroll independently on short screens. Below that breakpoint, the bottom navigation retains safe-area padding, visible active state, and page-bottom clearance. The existing 1480px maximum content width and stacked mobile layout are preserved. Message, URL, Phone Number and QR Code use four compact button tabs. They reflow into two columns below 640px, including 320px mobile; labels may wrap and no horizontal scrolling is required.

## Accessibility and honest states

Skip navigation, semantic landmarks, route-heading focus, tab keyboard interaction (Left/Right, Home/End and roving focus), labelled fields, live status messages, retries, and the render-error boundary are preserved. Interactive elements have visible 2px focus outlines; selected tabs use the accent surface, stronger label and inset bottom rule; the native file input has a visible focus ring around its picker control. Decorative border colors are separate from control boundaries.

The regression suite checks selected normal-text token pairs at a minimum 4.5:1 contrast and selected focus/control boundaries at 3:1. CSS honors reduced-motion preference. These checks complement screenshot inspection and do not replace a full accessibility audit. Interactive controls retain visible focus; programmatically focused page/main landmarks intentionally suppress the default outline while supporting skip navigation and route announcements.

Loading, request failure, retry, explicit empty history, unavailable metrics, and analysis-unavailable messages all use the same light theme. Em dashes continue to mean unavailable values. No charts, analytics, risk scores, safety verdicts, or synthetic records are introduced. Message/URL drafts remain local until an available storage service accepts submission. Saved records display SUBMITTED with no assessment; Phone/QR stay disabled. Real counts/history use the existing panels/tokens; unavailable values remain unavailable.

## Motion and interaction

The Task 1 motion refinement adds CSS transitions/keyframes without a new dependency, palette, font, spacing scale or information architecture. Motion communicates entrance, selection, connectivity and pending activity. It never implies analysis is taking place.

| Token | Value | Use |
| --- | --- | --- |
| `--motion-fast` | `150ms` | Fades, control colors, border/focus changes |
| `--motion-standard` | `180ms` | Main-content entrance, cards, arrow movement and selection |
| `--motion-slow` | `240ms` | Eyebrow rule reveal and a single connection pulse |
| `--motion-step` | `40ms` | Small page/card stagger; last stage starts at 160ms |
| `--motion-activity` | `1800ms` | Low-contrast scanning/checking cadence, only while genuinely pending |
| `--ease-standard` | `cubic-bezier(0.2, 0, 0, 1)` | Controlled interaction feedback |
| `--ease-emphasized` | `cubic-bezier(0.16, 1, 0.3, 1)` | Fast settling entrances without overshoot |

- `motion-enter` uses opacity and a 4px upward settle; `motion-fade` changes opacity only. Content starts partially visible, remains operable during the stagger, and is never held for an exit animation. Entrance styles do not persist after completion. The longest staged page entrance completes within 340ms; nested entrance transforms can combine to at most 8px.
- `route-content` wraps the Outlet and keys only on pathname. Only main page content remounts; persistent sidebar/header/mobile navigation, API badge, query cache, route focus and document titles retain their behavior. The breadcrumb label fades when its text changes.
- Metric cards lift 2px with a modest existing-token border emphasis; their icon containers move 1px. These effects require a fine pointer with hover. No card becomes an interactive control merely because it has hover feedback.
- Primary/secondary/quiet buttons and `action-link` share short transitions and a 0.99 press scale. Add `motion-arrow` to directional icons for a 3px hover movement; `motion-icon` provides a 1px response on retry icons. Disabled, `aria-disabled` and `aria-busy` actions do not receive these movement effects. Future busy states must reflect real activity.
- Sidebar icons/chevrons move 1–2px on pointer hover. Active background/border/text colors transition without moving navigation hit areas. Mobile active-state colors transition without hover-dependent meaning.
- Tab selection uses existing short color/border transitions. A keyed mode panel uses the existing 180ms opacity/4px settle, without an inherited panel delay; typing never remounts it. Border transitions keep the focus outline immediately visible. Input and empty-state timing is local, independent of a containing panel's delay.
- Empty-state icons settle once from 0.97 scale; text and CTA fade briefly. Loading uses a static scan icon and an 8%-accent sweep inside the existing skeleton. No spinner, parallax, neon, filter or large-shadow animation is introduced. Loaded or unavailable content enters immediately; no old/new live regions are duplicated for a cross-fade.
- The API live region remains stable and atomic. Its contents key on the actual label: checking fades into connected/unavailable; connected gets one restrained dot pulse. Unchanged successful polls and navigation do not replay status motion. Only a pending health query uses a subdued repeating dot signal.
- `prefers-reduced-motion: reduce` removes all animation, delay, scanning, pulsing and transition properties. Positional hover/press effects are opt-in under `no-preference`. State labels, keyboard focus, retries and disabled controls remain available. No animation is a prerequisite for understanding or using a control.

Motion is declarative CSS; no animation timers, new manual DOM animation or animation library is used. Do not animate width/height/position, add permanent `will-change` layers, or make ordinary settled panels move continuously. Browser tests exercise both OS motion preferences, including switching to reduced motion during a pending request. See [TESTING.md](TESTING.md).

## Visual evidence

See [SCREENSHOTS.md](SCREENSHOTS.md) for current desktop/mobile Overview and Analyse captures, and [REDESIGN.md](REDESIGN.md) for the historical migration checks, preservation audit, and limitations. [TESTING.md](TESTING.md) documents opt-in screenshot refresh and manual review. The suite captures images and checks behavior/layout; it does not compare golden-image pixels. The September 4 interface enhancement refreshes Analyse and adds Phone/QR desktop/mobile captures. Phone uses a compact natural-entry field; QR uses a dashed local selection area, filename feedback and removable selection. Both have an Upcoming state and an explained disabled action. No camera, decoder, reputation check or assessment is implied. The warm light theme is the only supported theme; there is no alternate legacy palette.

## Task 2 persistence presentation

General SCAMGUARD branding follows supervisor feedback (D20). Preserve the warm palette, typography, spacing and short CSS motion. The new success copy is “Submission recorded.”, with “No assessment yet” retained. Storage is disclosed before submitting. History uses truncated escaped text, on-demand detail, uniquely identified native disclosure buttons and bounded pagination. No badge implies risk or safety.
