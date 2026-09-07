# Post-Task 4 UI/UX refinement

This frontend-only refinement preserves the Forensic Intelligence identity, routes, contracts, stored assessments, local models, rules, fusion and capability boundaries. It follows the accepted Task 4 merge `386e4b7` and is reviewed on `codex/ui-ux-result-refinement`; it is not Task 5 and must not be merged automatically.

## Advisory score presentation: risk-presentation-v1

The categorical risk level is authoritative. Neither displayed number is a probability of fraud, calibrated confidence, measured detection accuracy or a new intelligence prediction. There is no invented within-category precision or per-indicator weight. The two modalities have different score meanings and must not be compared numerically.

| Input | Display derivation | Meaning |
| --- | --- | --- |
| Message | `round(stored risk_score * 100)` | Existing bounded continuous fusion signal, presented as points out of 100 instead of a percentage. |
| URL | `round(category_rank / 3 * 100)` where Low=0, Caution=1, Elevated=2, High=3 | Ordinal category index: 0, 33, 67, 100. Equal spacing is a display convention, not measured equal distances in risk. |
| Insufficient evidence | No score and no meter | Missing evidence is never represented by zero. |
| Historical Message with null score | No score and no meter | No replacement number is inferred. Historical intake/failed rows retain their existing no-assessment state. |

Message retains its backend fusion: model signal is min(1, SCAM + 0.35×SPAM); local score is 0.52×model signal + 0.48×rules score, with the existing strong-rule floor and bounded contextual contribution. See MESSAGE_INTELLIGENCE.md and backend/app/ml/fusion.py for the authoritative implementation. The frontend does not recompute it. Rounding may display 20 for a stored value just below the 0.20 category threshold; the stored category always wins. Stored/API scores and confidence fields are unchanged.

URL's existing categorical decision table already combines model, meaningful evidence families and optional validated reputation. This task maps its **final stored category**, never recomputes that table. In particular, accumulating weak indicators cannot raise the displayed index above the existing Caution category. A 100 index means the highest review category, not certainty; zero means the lowest observed-risk category, not safety. All records in a category receive the same index regardless of confidence or indicator count. The API URL risk_score remains null. No database migration, API field, backend implementation change, training or provider call is introduced.

A visible method label distinguishes Message fusion score from URL category index. Every meter has a text value, accessible name, value range and value text identifying the method/category and saying it is not a probability. The adjacent disclosure explains derivation and non-comparability; the hero includes advisory language. The URL no-fetch/HTTPS explanation remains visible. Numeric scoring is a display convention, not an academically validated new risk measure; no precision/recall or calibration claim is made for it.

## Confidence and contributing signals

Existing confidence is separate: Message's backend confidence combines model strength and evidence; URL confidence is uncalibrated classifier strength. Show the existing low/medium/high label without a percentage that could be mistaken for a scam probability. Null URL confidence is unavailable even if rules still yield a risk result. Model status and limitations remain inspectable.

URL evidence cards sort by existing severity (meaningful, weak, context); stable ties preserve backend order. The hero selects at most three signals and only one per evidence family. These are severity priorities, not additive numeric contributions. Message has no per-indicator contribution field: retain source order and select distinct categories, explicitly stating that individual contributions are not measured. Never invent a ranking by numerical effect. Full evidence remains visible and input/snippets remain inert escaped text.

## Presentation and motion

Shared AnalysisResultHero, RiskScoreDisplay, ConfidenceBadge, EvidenceCard/EvidencePanel, RecommendedActionsPanel and AnalysisMetaPanel live in ResultPresentation.tsx. Small Message/URL adapters supply modality-specific metadata. All submission and history paths use the same rendering and pass real analysis IDs. Completion timestamps are from the assessment; metadata is behind native keyboard-operable details.

The result column now gets nearly half the desktop workspace, with a category-coloured border, readable verdict, layered summary, score and confidence cards, numbered evidence and a distinct action checklist. Container queries adapt the summary and metadata to their actual available width, including history. Long IDs, hosts and snippets wrap. A View assessment anchor moves focus to the result heading, useful below the mobile form. History shows stored categorical risk. Loading placeholders reflect only actual pending work; validation uses an explicit border and text rather than colour alone.

The global theme uses restrained paper gradients, subtle card elevation, refined sidebar selection, stronger section headers and metric accents. Existing serif/system typography and brand palette remain. No external fonts, images, animation library or new dependency is required.

Existing page, tab, card, hover and press motion is retained. New score reveal uses transform (240ms), disclosure content fades in (180ms), chips and validation fade (150ms), and disclosure icons have a short state transition. Closing details is immediate; no layout-height animation or delayed focus. The score value is present immediately, with no animated counting or progress implying extra analysis. Repeating shimmer exists only during pending work. Every nonessential animation/transition is disabled live under prefers-reduced-motion, with hover/press movement opt-in under no-preference. Semantic native disclosures continue to work without animation support.

## Verification record

See PROGRESS.md for final executed checks and docs/TESTING.md for reproduction. Browser assertions use real local Message/URL assessments in the dedicated PostgreSQL *_e2e database. The delayed-response case holds a real response to inspect pending UI; it does not manufacture results. UI unit fixtures are test-only. Screenshots are labelled controlled test evidence, never production analytics. This is browser-assisted verification, not a human usability study or comprehensive accessibility audit.

Verification completed on 2026-09-07: typecheck and zero-warning lint passed; 73 Vitest tests, 18 foundation/motion/visual Playwright cases, six built offline-preview cases and six real PostgreSQL browser cases passed. Backend tests were not rerun because no backend code/API fields changed. Implementation and regression coverage: `c4bcd5e` (`feat: refine forensic UI and explainable result presentation`). Existing non-failing Zod build and Playwright colour-environment warnings remain. Main was not merged or pushed by this task.

### Controlled visual evidence

These screenshots show synthetic, non-sensitive submissions processed by the real local application using the disposable *_e2e database. Displayed Overview counts are actual accumulated **test** records, not production activity. Browser-assisted inspection found no clipping at 320px, console/page errors or off-origin requests. Full-page mobile captures include the fixed bottom navigation at the capture viewport's bottom; it remains fixed while scrolling. Hero close-ups provide readable mobile evidence.

| View | Desktop | Mobile |
| --- | --- | --- |
| Message result | [Full result](screenshots/ui-refinement-message-desktop.png) | [320px page](screenshots/ui-refinement-message-320.png), [hero](screenshots/ui-refinement-message-320-hero.png) |
| URL result | [Full result](screenshots/ui-refinement-url-desktop.png) | [320px page](screenshots/ui-refinement-url-320.png), [hero](screenshots/ui-refinement-url-320-hero.png) |
| Overview | [Overview](screenshots/ui-refinement-overview-desktop.png) | [320px](screenshots/ui-refinement-overview-320.png) |
| Help | [Score guidance](screenshots/ui-refinement-help-desktop.png) | [Feedback validation](screenshots/ui-refinement-help-validation-320.png) |
| Pending / invalid input | [Held real response](screenshots/ui-refinement-loading.png) | [URL validation](screenshots/ui-refinement-validation-320.png) |
