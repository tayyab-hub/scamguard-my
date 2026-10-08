# CSC1250 retained template contract

Reference: C:\Users\User\Downloads\2 - CSC1250 Proposal Template.docx
SHA-256: 28cfa5c6c0e3b2c542eb68df73f7d830524b4f1717d512dd5e6cb43fe1b299bd

Purpose: populate the user's blank institutional proposal template for the authorised report/rubric pass. This is not an existing authored report. Identity, admission number, supervisor, programme and submission month remain empty at the user's explicit request.

Preserve the MCKL logo, cover furniture, source styles/numbering package, original section geometry, footer page-number fields and relationship-backed assets. Geometry is frozen in template-contract.json: 13 sections, 8.2708 × 11.6958 inches; left 1.0972 and right .9028 inches. Section-specific top/bottom/header/footer dimensions remain exact. Use TNR 12-point double-spaced justified body, source-derived black headings, repeating monochrome table headers, captions above tables/below figures, APA references and exactly four objectives. Correct duplicate 3.2 to 3.3.

Editable slots: cover title and empty identity fields; TOC; List of Figures; List of Tables; Chapters 1–4; References; four appendix/style-example sections. Replace all instructional/example text with actual report content. The source's empty example table is removable. Retain the section topology: cover, TOC, figures, tables, introduction, background, resource approach, planning, references, Appendices A–D. Content may grow to additional pages within these sections; page count is not fixed. Add source-derived paragraphs/tables/inline figures; no floating overlays, columns or layout redesign. Tables are reflowed to portrait with labelled dimensions retained; full wide matrices remain in companion Markdown. Do not shrink body/table fonts to fit.

Structural editing uses python-docx because this is a substantial slot population. Preserve unaffected source ZIP parts byte-for-byte before field refresh. Allowed changed parts: document, styles, settings, document relationships, content types, core metadata; add image parts. Native Word field refresh may update field caches and related layout metadata; compare semantic footer/section/logo invariants afterwards. No content controls were found. Leave original file untouched. All thirteen original template pages were inspected as native-Word-rendered PNGs.

Verification: attempt packaged render_docx.py (bundled LibreOffice unavailable); native Microsoft Word COM export and bundled Poppler rasterization are the available fallback. Update TOC/figure/table fields with Word, compare page geometry/numbering/source hash and inspect every final page PNG. Output only the final DOCX; QA PDF/PNGs remain temporary.
