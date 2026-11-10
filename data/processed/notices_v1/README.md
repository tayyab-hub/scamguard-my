# Institutional notices v1 (training data)

`message_notices_v1.csv` (600 rows; columns `id,label,language,category,text`) combines:

| File | Rows | Label | Languages |
| --- | --- | --- | --- |
| `genuine_en.csv` | 180 | LEGITIMATE | English |
| `genuine_my.csv` | 220 | LEGITIMATE | Malay 144, Manglish 76 |
| `scam_imitation.csv` | 200 | SCAM | English 81, Malay 83, Manglish 36 |

## Why

The Mendeley SMS dataset contains personal chat, spam and smishing but almost no genuine
institutional notices (bank alerts, OTP notices, delivery updates, government reminders, bills,
appointments), so earlier models mistook notice wording for scams. No public dataset of genuine
Malaysian notices was found. Scam imitations of the same notice types are included so the model
learns the differences (a request, a lookalike link, a callback number, pressure, a fee) rather
than treating notice style as safe.

## How it was made (10 November 2026)

Three AI assistants wrote one file each from general knowledge of how Malaysian institutions
write and of publicly documented scam patterns. None could read the repository, the detector or
any challenge set. Genuine notices name real institutions and official domains from memory (not
checked against live sites); people are fictional, account numbers masked or invented, phone
numbers placeholders, and every scam domain is invented. Rows were combined, checked for
duplicates and for overlap with challenge sets v1 to v3 (none), and given ids `n0001` to `n0600`.

## Limitations

- Synthetic and AI-written: not real traffic, and stylistically closer to other AI-written text
  (including challenge sets) than real messages are. Results measured on AI-written test sets are
  therefore likely optimistic.
- Not reviewed line by line by a native speaker or by the institutions named.
- A snapshot of late-2026 wording; real notices and scams change.
- Use for training only. Replace with real, consented messages when available.
