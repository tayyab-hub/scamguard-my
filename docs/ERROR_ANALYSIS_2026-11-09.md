# Message engine error analysis — 9 November 2026

Read-only analysis of every mistake the current Message engine makes on the second challenge set
(`data/challenge_v2/message_challenge_v2.csv`, 233 messages). Nothing in the detector was changed.

- Engine: `message-tfidf-logreg-v1` model, `message-rules-v3`, `message-fusion-v3`, embedded link and
  phone checks on; the optional AI reviewer and the time-varying phishing feed off (same settings as
  `backend/scripts/evaluate_message_upgrade.py`).
- The headline numbers reproduce the published ones exactly (scams warned 64.7%, scams Elevated or
  High 39.2%, genuine messages warned 41.9%), so this analysis describes the same baseline.

> **Contamination note.** The challenge set's README asks that it never be used to tune the detector.
> Any fix motivated by the examples below must be measured on a **new, untouched set (v3)**; scores on
> v2 after such fixes are optimistic and should be reported as such, with the numbers here as the
> "before" baseline.

## 1. Where the mistakes are

| Label | Total | Low / Insufficient (missed) | Caution | Elevated | High |
|---|---|---|---|---|---|
| Scam | 102 | **36** | 26 | 20 | 20 |
| Genuine | 105 | 61 (correct) | **38** | **3** | **3** |
| Spam | 26 | 15 | 11 | 0 | 0 |

By language:

| Language | Scams Elevated/High | Scams missed (Low) | Genuine wrongly warned |
|---|---|---|---|
| English | 49.2% (29/59) | 23.7% (14/59) | **52.6%** (30/57) |
| Malay | **20.7%** (6/29) | **55.2%** (16/29) | 26.7% (8/30) |
| Mixed | 35.7% (5/14) | 42.9% (6/14) | 33.3% (6/18) |

Two different problems: **Malay scams are missed**, and **English genuine notices are over-warned**.

## 2. Why scams are missed (36 messages)

### Cause A — the text model does not know Malay

The model was trained on a mainly English historical SMS dataset. It recognises a median of
**17** vocabulary features in an English message but only **2** in a Malay one; **85%** of Malay
messages match four features or fewer. With almost nothing to go on it falls back to its majority
class, and it labelled **all 36 missed scams "LEGITIMATE"**.

Examples (all Low): KWSP officer asking for IC number and i-Akaun PIN (v087); "Bank Islam … balas
dengan No IC, nombor kad ATM dan password" (v090); Bank Negara "pindahkan semua baki ke akaun
selamat" (v065); a police "Sarjan" demanding secrecy (v094).

### Cause B — the model's guess outweighs the rules

**25** of the 36 missed scams had at least one rule hit and **9** had two or more, yet still ended
Low. The fusion calibrator was fitted on the same English data, so a confident "LEGITIMATE" from a
model that barely recognised the text can cancel explicit warning signs. v090 has three rule hits
(threat, credential request, authority) including a direct password request and is still Low.

### Cause C — scam tactics the rules do not cover (in these phrasings)

| Tactic | Examples |
|---|---|
| Forward a code you received (WhatsApp/OTP hijack) | "forward it to me" (v045), "screenshot dan hantar balik" (v046), "send me the code you'll get by SMS" (v047) |
| Pay a fee first to release money or goods | top up to unlock withdrawal (v049), stamp duty before loan (v079), crate/vaccine fee (v081), insurance before release (v102), shipping for a prize (v073), deposit with no viewing (v058) |
| "Safe account" transfers | v065 |
| Renting out a bank account (mule recruitment) | "Sewa akaun bank anda … serah kad ATM & nombor TAC" (v092) |
| Reply with IC / account number | v086 |
| Malay secrecy pressure | "Jangan beritahu sesiapa, ini siasatan sulit" (v094) |
| Wrong transfer, "please return it" | v077, v078 |

### Cause D — the clue is only a phone number or the conversation itself (expected limit)

7 missed scams rely mainly on a phone number (the number alone always gives "insufficient
evidence"), and several are conversational (romance, marketplace, investment tips from a "friend")
with no distinctive words. Text-only analysis cannot settle these; the Quick check questions are the
intended help.

## 3. Why genuine messages are wrongly warned (44 messages)

| Cause | Count* | Examples |
|---|---|---|
| E — Protective safety advice is treated as risk, including negations | **13 of 17** genuine messages containing such advice were warned | "Do not share this code" (v130, v151); "LHDN tidak meminta maklumat bank" triggers *personal details requested* (v134); "No payment … needed" triggers *money language* (v230); "we will never ask for your PIN" (v181) |
| F — Official links do not lower the risk | 14 | cimb.com.my, shopee.com.my, jpj.gov.my, lazada.com.my, docs.google.com, github.com were rated low-risk by the URL check, yet the message still ended Caution |
| G — Any bank or brand name counts as an "authority reference" | 17 | Delivery updates, bank transfer receipts, debit-card dispatch notices |
| H — The model's score alone triggers Caution | 12 had no evidence at all | "Reply 1 to confirm" appointments (v170, v203), Spotify renewal (v192), recruiter messages (v166, v168) |
| I — Keyword rules misfire on ordinary chat | several | "URGENT: prod server down" (v191), "password was changed successfully" (v190), assignment deadline flagged as an *earning offer* (v163) |
| J — Genuine "new number" messages | 4 | Inherently ambiguous; Caution is defensible |

*Causes overlap; one message can have several.

The 6 most serious false alarms (Elevated/High) are institutional notices the model scores as SCAM
(probability 0.61–0.94): a genuine Maybank login alert with the official domain (v129), a matured
fixed deposit (v187), a credited Bank Rakyat loan (v201), debit-card dispatch (v224), motor insurance
renewal (v220) and a company-dinner lucky draw (v188).

## 4. What would fix what

| Cause | Fix (engineering) | Needs from the project owner |
|---|---|---|
| A — No Malay vocabulary | Text normalisation (`0TP`→`OTP`, spaced letters, look-alike characters) and character n-grams; retrain with Malaysian data; measure a small multilingual static-embedding model within the 512 MB limit | **Labelled Malay and mixed messages**, scam and genuine (see section 5) |
| B — Model overrides rules | When the model recognises little of the text, treat it as uninformed (as the existing no-feature prior already does for zero features) so rule evidence decides; refit the calibrator on data that includes Malay | Same data |
| C — Missing tactics | New rule families: forward-a-code, fee-before-release, safe account, account rental, reply-with-IC, Malay secrecy, wrong-transfer refund | Review of the wording lists |
| D — Phone-only and conversational | Keep honest; strengthen Quick check guidance; optional server-side use of Quick check answers | A privacy decision |
| E — Protective advice | Handle negation ("never/tidak/do not … ask/share") and count protective advice as tempering evidence | — |
| F — Official links | A link the URL engine rates Low on a well-known or `.gov.my` domain becomes tempering evidence | — |
| G — Brand names | Count "authority" only when combined with a request, threat or deadline | — |
| H — Model score alone | Require at least one piece of evidence for Caution, or raise the model-only threshold after recalibration | — |
| I — Misfiring keywords | Narrow the patterns (context words, negation) | — |

## 5. What you (the project owner) can do

1. **Collect Malaysian training data** — the single biggest lever. Aim for at least 300 Malay/mixed
   scam messages and 300 genuine Malay/mixed messages, with genuine bank, OTP/TAC, delivery and
   government notices among them. Possible sources: public scam alerts from PDRM CCID, Bank Negara
   Malaysia and banks (rewritten as SMS); messages from family and friends **with their consent and
   with personal details removed**; openly licensed datasets (check each licence). Record the source
   of every row.
2. **Write or commission a sealed challenge set v3 before any change**, ideally by someone who has
   not seen this analysis or the detector, using the same columns as v2. It is the only way to show
   honest improvement afterwards.
3. **Review labels** in the new data (a second person checking a sample gives an agreement figure
   for the report).
4. **Make two decisions**: whether Quick check answers may be sent to the server to adjust a result,
   and whether domain-age lookups (which contact an outside registry) are acceptable.
5. **Report this analysis as the "before" picture** in the capstone write-up, with the
   contamination note above.

## 6. Limitations of this analysis

- Challenge set v2 is synthetic, written by one author, and small (most categories have 1–3
  examples), so per-category findings are indicative only.
- The optional AI reviewer was off; on the live site it may change some of these results.
- Counts for causes overlap and were assigned by reading each message, not by an automated
  ablation; an ablation (turning each component off in turn) would quantify each cause precisely.
