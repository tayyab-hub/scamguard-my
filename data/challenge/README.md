# Message Challenge Set v1

File: `message_challenge_v1.csv` (UTF-8, comma-separated, RFC 4180 quoting)
Columns: `id,label,category,ambiguous,text`

## Purpose

This is a stress test for the SCAMGUARD message detector. It focuses on scams written as ordinary
conversation, with few or no keywords: "wrong number" openers, "new number" family messages, boss
impersonation, job and task scams, slow-build investment and romance chats, Macau-style
police and court calls, and requests to move to another app or keep things secret. It also includes
**hard negatives**: real messages that use the same words as scams (genuine OTP/TAC messages
that say "do not share", real "new number" texts, real recruiter follow-ups, family asking for
money they had already agreed on, real reminders with deadlines).

## How it was made (independence)

An AI assistant (Claude) wrote the set from general knowledge of publicly documented scam patterns,
such as advisories from PDRM/CCID, Bank Negara Malaysia, Singapore ScamShield, Australia Scamwatch
and the US FTC. The author did **not** read the detector's code, rules, keyword lists, training data
or docs (`backend/app/`, `backend/scripts/`, `docs/`) while writing it.

**The set is synthetic and only for evaluation.** Do not use it to train models, tune rules,
pick thresholds or add keywords. Once it has shaped the detector, it is no longer an independent
test. If you need tuning data, write a separate set.

## Label definitions

- `SCAM`: a message that deceives the reader to get money, credentials, personal data or control of an account.
- `SPAM`: unwanted marketing or promotion that does not deceive or defraud.
- `LEGITIMATE`: a normal personal, work, service or institutional message.
- `ambiguous = true`: the text alone cannot show whether the message is a scam. For example, a "hi, new
  number" text could be real or the first step of a scam. Report results with and without these rows.

## Counts

| Label | Rows | ambiguous=true |
|---|---|---|
| SCAM | 90 | 3 |
| SPAM | 20 | 0 |
| LEGITIMATE | 92 | 5 |
| **Total** | **202** | **8** |

79 of the 90 SCAM rows contain none of these trigger words (case-insensitive, whole-word match):
urgent, winner, prize, password, OTP, verify, click, "account suspended", free. Ten rows contain a
fake URL (example domains or `bit.ly/xxxx`). Messages run from 6 to 38 words. About half of the rows
use Malaysian context (RM amounts, TNG eWallet, Maybank/CIMB, LHDN, PDRM, Pos Laju/J&T/Shopee), and
some are written in Malay or Manglish.

### SCAM categories (90)
investment_crypto 10; authority_impersonation_police_tax 8; marketplace_buyer_seller 6;
wrong_number_romance 5; job_task_scam 5; boss_impersonation 5; parcel_delivery 4;
ewallet_or_bank_otp 4; family_new_number 3; romance_money_request 3; account_verification 3;
prize_lottery 3; money_mule 2; account_takeover_code 2; loan_scam 2; sextortion 2; tech_support 2;
refund_overpayment 2; friend_impersonation 2; utility_bill 2; subscription_renewal 2;
family_emergency 2; identity_theft_job 1; charity_disaster 1; rental_scam 1; bank_account_freeze 1;
recovery_scam 1; job_advance_fee 1; customer_service_impersonation 1; government_aid_phishing 1;
telco_impersonation 1; advance_fee_inheritance 1; survey_card_phishing 1.

### SPAM categories (20)
retail_promo 5; food_promo 3; education_promo 2; service_promo 2; property_promo 1; fitness_promo 1;
insurance_promo 1; telco_promo 1; newsletter 1; travel_promo 1; finance_promo 1; home_promo 1.

### LEGITIMATE categories (92)
work_chat 8; friend_chat 8; genuine_delivery_update 7; appointment_reminder 7; family_money_genuine 6;
genuine_bank_notice 6; family_chat 5; genuine_job_recruiter 5; school_community 5;
friend_new_number_genuine 4; genuine_otp_notice 4; genuine_government_notice 4; marketplace_genuine 4;
genuine_security_alert 3; genuine_utility_bill 3; genuine_subscription 2; genuine_scam_awareness 2;
genuine_refund_notice 2; booking_confirmation 2; service_provider_chat 2; genuine_wrong_number 1;
neighbour_chat 1; genuine_customer_support 1.

## Limitations

- **Synthetic:** these are not real messages. Real scam texts have typos, formatting, sender IDs and
  links that this set does not fully capture.
- **Single author:** one AI author wrote every row and assigned every label, so the style may be
  uniform and the labels carry that author's biases. No second annotator checked them.
- **Small:** 202 rows. Per-category results rest on 1 to 10 examples each, so treat them as anecdotes,
  not statistics.
- **Not a prevalence sample:** the label mix (about 45% scam) and the category mix were chosen on
  purpose. They do not match how often each type appears in real inboxes, so precision measured here
  does not carry over to real use.
- **Text only:** there is no sender number, thread history or link reputation. Some real cases can only
  be judged with that context, which is why the `ambiguous` rows are flagged.
