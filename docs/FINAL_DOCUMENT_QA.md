# Final report and presentation quality record

## October completion candidates

The [report candidate](../output/documents/SCAMGUARD_CSC1250_FINAL_CANDIDATE_2026-10-20.docx)
has **67 pages, 13 sections, 14 tables and 11 figures**. All pages were rendered and individually
inspected; changed pages were checked again after repairs. The source template's section geometry
and logo bytes are preserved. Native Word refreshed contents, figure/table lists and fields.
No unresolved reference error, clipped table or blank spill page was found. The cover label is
intentionally changed to Final Report; personal fields remain blank for the owner.

The [presentation candidate](../output/presentations/SCAMGUARD_CSC1250_FINAL_CANDIDATE_2026-10-20.pptx)
has **13 editable slides**, three native tables, an editable architecture diagram, 13 speaker-note
parts and two embedded evidence images. All slides were rendered and individually checked.
Package/layout validators found zero issues; first-party reimport passed. Source-derived
Calibri/Cambria fonts were verified in the package. Native projector/PowerPoint behaviour and
actual delivery timing are not established by these checks.

Corrections during QA included the final-report cover label, slide font property and missing
image embedding, stale risk-audit wording and explicit dates for September case/latency evidence.
The packaged DOCX renderer was unavailable because LibreOffice was missing; installed Word
and bundled Poppler provided the fallback. Exact hashes and validation scope are in
[completion-academic-qa.json](evidence/completion-academic-qa.json). Previous reports and supplied
templates/deck remain intact. The report follows the proposal's four original objectives; the
volunteer study remains pending under O4. Final institutional rules still need confirmation.

## Historical September QA

The editable deliverable is [SCAMGUARD_CSC1250_REPORT.docx](../output/documents/SCAMGUARD_CSC1250_REPORT.docx). All **69 physical pages** were visually inspected after the final native Word refresh/export. No clipping, overlapping labels, orphan captions, blank spill pages or unresolved field errors were identified. The report has **14 tables, 11 numbered figures and 19 APA references**. Three authentic local application screenshots are embedded; all nine supporting captures were visually checked. The dashboard capture was replaced after its first version caught the loading state.

The supplied institutional template is unchanged. Its SHA-256 is `28cfa5c6c0e3b2c542eb68df73f7d830524b4f1717d512dd5e6cb43fe1b299bd`. The report preserves all 13 sections' page sizes, margins and header/footer distances, and the original logo bytes. Cover identity, programme, supervisor and submission date fields are intentionally empty at the owner's request. The source's instructional/example tail has been replaced with the requested evidence appendices; it is not presented as student content.

The report follows the source's four-chapter structure, references and alphabetical appendices, uses four objectives, and applies Times New Roman 12-point, double-spaced justified body and table text. Portrait tables retain labelled fields and repeat their header rows. Native Word refreshed the contents and figure/table lists. Front matter uses Roman numbering; the report body uses Arabic numbering. All 25 table/figure captions have labels, source notes and textual callouts. Numbering and page destinations were checked in the rendered output.

The required documents-skill `render_docx.py` was attempted but could not run because its bundled LibreOffice is unavailable. The fallback used installed Microsoft Word through COM to update/save fields and export PDF, then bundled Poppler to render page PNGs for inspection. Word reserializes package metadata and several XML parts; the claim is preservation of the template's relevant structure and formatting, not byte-identical XML. Machine comparisons and output SHA are in [report-document-qa.json](evidence/report-document-qa.json). The intermediate PDF and PNGs are QA files, not additional submission deliverables.

Remaining user work: fill the cover, add substantiated original planning/deadline records, confirm the actual final-submission rules and proofread personal additions. This supplied template/rubric is labelled **Proposal**; no later final-report specification or page limit was supplied. After edits, update Word's fields and inspect pagination again. The present page count is an observed layout result, not an institutional length requirement.

Application regression results quoted in the report are the retained merged-main release run: 159 Vitest, 50 Playwright and 310 Pytest passes, one opt-in live-AI skip and two dependency warnings. They were not rerun for this documentation-only pass. New checks in this pass cover document structure/rendering, reference and claim consistency, local screenshots, links, traceability and secret hygiene. See [FINAL_RELEASE.md](FINAL_RELEASE.md), [FINAL_CLAIM_AUDIT.md](FINAL_CLAIM_AUDIT.md) and the academic scan records in `docs/evidence/`.
