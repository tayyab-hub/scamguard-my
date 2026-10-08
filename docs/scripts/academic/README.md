# Academic artifact sources

These scripts author report artifacts only. Run from the repository root. They do not alter application code, the database, production or Git. The retained Word template path and SHA are in inputs/template-contract.json; the original Downloads template must remain available. A different template requires a new structural review and contract, not a blind replacement.

The recorded generation used Python 3.12 with python-docx, matplotlib 3.11.2 and Pillow; native Microsoft Word refreshed fields and exported the internal QA PDF. Bundled Poppler generated page PNGs. The document skill's bundled LibreOffice renderer was attempted but LibreOffice was unavailable. Plotting dependencies were isolated in a temporary folder, not added to application dependencies.

1. Generate figures: `python docs/scripts/academic/make_figures.py`.
2. Generate the Word copy: `python docs/scripts/academic/build_report.py`.
3. Refresh all Word fields, including contents/figure/table lists, and save. The helper render_word.ps1 accepts InputPath, PdfPath and UpdateAndSave; run only on the generated copy.
4. Inspect every rendered page and compare template geometry/logo/footer invariants. The saved document includes refreshed field caches; regenerating it replaces those caches and requires another refresh.

Inputs snapshot the final tables, chronology and slide plan. Markdown sources remain the human-editable report content. If a source changes, keep the input snapshot and text generator consistent. Cover identity fields intentionally remain empty. Do not publish QA PDF/page images or temporary logs as report results. See ../../FINAL_DOCUMENT_QA.md for the delivered artifact validation.
