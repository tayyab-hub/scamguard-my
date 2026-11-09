# Malay / Manglish training translations v1

`message_train_malay_v1.csv` holds 1,377 Malay (`ms`, 838) and code-switched Manglish (`mixed`, 539)
translations of messages from the **training split only** of the Mendeley SMS Phishing dataset.

## Source and licence

- Source: *SMS Phishing Dataset for Machine Learning and Pattern Recognition*, Mendeley Data,
  <https://doi.org/10.17632/f45bkkt8pr.1>, licensed **CC BY 4.0**. These files are a translated
  derivative; the original authors are credited here and in `docs/DATASETS.md`.
- Rows: all 316 SCAM and all 261 SPAM rows of the training split, plus 800 LEGITIMATE rows drawn at
  random (seed 20261109) from the 2,900 in that split. `source_row` points to the original CSV row.
- The validation and test splits, and every challenge set (v1, v2, v3), were **not** translated or
  used, so they stay valid for measurement.

## How it was made (9 November 2026)

- Machine translation by AI assistants in seven batches (`batches/` in, `translated/` out), each
  told to keep meaning, tone and every scam or legitimate cue, add or remove nothing, and copy URLs,
  domains, emails, phone numbers, short codes and reply keywords exactly. About 60% were rendered as
  natural Malaysian Malay and 40% as Manglish. Currency symbols were sometimes changed to RM with the
  same number. Labels were copied from the source, not re-judged.
- Automatic checks: every source row appears once, labels unchanged, no empty text, and URLs and
  numbers of five or more digits survive (one exception, where a garbled source character joined a
  URL to the preceding word; the URL itself is intact). Four very short messages read the same in
  both languages.

## Limitations

- The source is largely UK SMS from around 2007–2012, so the translations describe UK-style
  services (premium short codes, UK tours, £ prices) rather than current Malaysian scam playbooks.
  They teach Malay and Manglish wording of scam and spam structures, not Malaysian context.
- Machine translation: not reviewed line by line by a native speaker; some brand names and slogans
  stay in English; idioms may read as translated.
- Garbled characters and deliberate misspellings in the source were kept.
- An AI assistant also wrote challenge set v3, so stylistic overlap is possible; this is why
  translation of real messages was preferred over generating new ones.
