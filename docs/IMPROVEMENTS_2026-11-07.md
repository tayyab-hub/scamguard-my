# Improvements — 7 November 2026

Eight improvements were evaluated; seven are implemented and one (a meaning-based multilingual
model) was measured and deliberately not deployed. Everything is free and local except the
optional Gemini reviewer, which is off by default. Evidence:
[improvements evaluation](improvements_evaluation_2026-11-07.json) and the
[second independent challenge set](../data/challenge_v2/README.md).

| # | Improvement | Status | What it does |
| --- | --- | --- | --- |
| 1 | Links and phone numbers inside messages (`message-embedded-v1`) | Implemented | Up to three links and two numbers written in a message are assessed by the existing offline URL and Phone engines. A link assessed Elevated/High, or a number assessed Caution or higher, raises the Message result to that level; it never lowers it. Evidence is labelled "Offline link check · not opened" / "Offline number check · not contacted". Emails and file names are ignored; addresses without `http(s)://` or `www.` must use a common domain ending. Local `01x`/`0[3-9]` numbers are read as Malaysian and labelled as such. |
| 2 | Well-known and registry-restricted domains (`url_rules_v4`, `url_fusion_v4`) | Implemented | A hand-reviewed list of widely used sites, plus `.gov.my`, `.edu.my` and `.mil.my`, stops the host-only model raising warnings on sites it misjudges (for example `github.com/openai` is now Low). Free-hosting pages are excluded, so `someone.github.io/maybank-login` stays High. The third-party Tranco ranking was not copied because its redistribution terms are unclear. |
| 3 | OpenPhish phishing feed (`url-blocklist-v1`) | Implemented, production only | The server downloads the OpenPhish community feed (non-commercial use) from one fixed address every 12 hours and keeps it in memory. A submitted URL is only compared with the list (exact URL, or exact host unless it is a big shared service) and is never requested. A match is High via the existing reputation slot. If the download fails, analysis continues without it. Disabled in tests/local runs unless `PHISHING_FEED_ENABLED=true`. |
| 4 | "What you know that the text cannot show" | Implemented (frontend) | Under Low, Caution and Insufficient-evidence Message results, three questions (known sender? asks for money/codes/details/app? pushes urgency/secrecy/app move?) give tailored advice. Answers stay in the browser, are not saved and never change the score. |
| 5 | Meaning-based multilingual model | Measured, not deployed | `paraphrase-multilingual-MiniLM-L12-v2` (quantized ONNX, Apache-2.0) with a logistic head trained on the same SMS train split: validation macro F1 0.866 vs 0.886 for the current model, and loading it added about 425 MB of memory (above the 512 MB free Render instance). It did not separate conversational scams better on the challenge v1 holdout. |
| 6 | Optional Gemini reviewer | Implemented, off by default | `AI_REVIEW_ENABLED=true`, `AI_REVIEW_PROVIDER=gemini`, `GEMINI_API_KEY`, optional `GEMINI_MODEL`. Uses the same redaction, grounding (quotes must appear in the message) and bounded contribution as the existing reviewer, via Google's REST API with no new dependency. Only for synthetic demo/evaluation content: Google may use free-tier prompts to improve its products. |
| 7 | Second independent challenge set | Done | 233 messages (102 scam, 26 spam, 105 legitimate; 45% Malay or mixed), written without access to the detector or the first set and evaluated once per build after all changes were final. |
| 8 | "Was this result right?" | Implemented (migration 0007) | Private per-analysis verdict (Looks right / Too worried / Not worried enough / Not sure) via `PUT /api/v1/analyses/{id}/feedback`. No free text. Never changes the saved result and never retrains anything automatically. |

## Results (AI review and the time-varying feed disabled for reproducibility)

Second challenge set (sealed until the end; before = commit `f1460f1`, after = this release):

| Slice | Scams warned | Scams Elevated or High | Genuine messages warned |
| --- | --- | --- | --- |
| All | 57.8% → **64.7%** | 27.5% → **39.2%** | 41.9% → 41.9% |
| Scams containing a link (26) | 69.2% → **96.2%** | 46.2% → **92.3%** | 63.6% → 63.6% (22 genuine messages with official links) |
| Malay or mixed language | 37.2% → **48.8%** | 7.0% → **25.6%** | 29.2% → 29.2% |
| Scams relying on a phone number (16) | 56.3% → 56.3% | 31.3% → 31.3% | — |
| No link or phone | 53.3% → 53.3% | 18.3% → 18.3% | 36.1% → 36.1% |

Historical SMS test split: unchanged (all scams warned, 92.5% Elevated or High, 1.3% of genuine
messages warned).

URL engine: the popular-domain list removed false warnings on well-known sites such as
`github.com/openai`, `docs.python.org` and `linkedin.com`, while brand look-alikes and
free-hosting phishing remain High.

## Honest reading

- The largest gain is for scams that include a link, which now reach Elevated or High in 92% of
  cases with no extra false alarms.
- Scams that rely on an ordinary Malaysian phone number did not improve: the number alone cannot
  show who is calling. The context questions are the intended help there.
- Many genuine conversational messages still receive a "verify first" Caution (about 42% on the
  second set). This is the main remaining limitation of text-only assessment.
- A meaning-based model is the principled next step but did not fit the free hosting memory and
  did not outperform the current model on the available licensed training data.

## Configuration summary

| Variable | Default | Purpose |
| --- | --- | --- |
| `PHISHING_FEED_ENABLED` | on in production, off elsewhere | OpenPhish feed |
| `PHISHING_FEED_URL` | `https://openphish.com/feed.txt` | Fixed feed endpoint |
| `PHISHING_FEED_REFRESH_HOURS` | `12` | Refresh interval |
| `AI_REVIEW_ENABLED` | `false` | Optional reviewer |
| `AI_REVIEW_PROVIDER` | `openai` | `openai` or `gemini` |
| `GEMINI_API_KEY` / `GEMINI_MODEL` | unset / `gemini-flash-latest` | Gemini reviewer |

Reproduce: `backend\.venv\Scripts\python.exe backend\scripts\evaluate_message_upgrade.py --backend backend --label current --challenge-v2`.
