# Message Challenge Set v4 — dataset card

File: `message_challenge_v4.csv` (240 rows, UTF-8, LF line endings, RFC 4180 quoting)

## Purpose

**EVALUATION ONLY.** This set exists to give one independent, final measurement of a
Malaysian scam-message detector on short SMS/WhatsApp-style messages.

- Never use it for training, rule writing, threshold selection or any other tuning.
- Keep it sealed until the final measurement. Do not inspect individual rows or
  per-row errors before that measurement; once it has been used to make any design
  decision it is no longer an independent test set.

## How it was written

- Written by an AI assistant in a single pass.
- The author had **no access** to the detector's code, rules, training data,
  documentation, earlier challenge sets or any error analysis. No other file in the
  repository was opened, listed or searched, and the detector was not run.
- Content is based only on general knowledge of publicly documented scam patterns
  (PDRM/CCID and Bank Negara Malaysia alerts, Singapore ScamShield, Australia
  Scamwatch, US FTC, UK Action Fraud) and of ordinary Malaysian messages.
- All messages are synthetic. Phone numbers are obvious placeholders, scam domains
  are invented, account numbers are masked or made up, and personal names are
  fictional. Organisation names appear only as they would in genuine notices or as
  the brands scammers typically impersonate.
- Design intent: many scam types; scams that avoid classic trigger words; scams
  whose main clue is a lookalike/free-hosted/shortened link or a contact number;
  and legitimate hard negatives that share surface words with scams (real OTP/TAC
  notices, new-number messages, agreed family transfers, deadlines, recruiters,
  company lucky draws, bank/e-wallet/telco/utility/government/clinic/school/delivery
  notices) in English, Malay and code-switched Manglish.

## Columns

| column | meaning |
|---|---|
| `id` | `x001` ... `x240`, unique |
| `label` | `SCAM` (deception aimed at money, credentials, personal data or account control), `SPAM` (unwanted marketing with no deception), `LEGITIMATE` (genuine personal, work, institutional or transactional message) |
| `category` | short snake_case subtype |
| `ambiguous` | `true` only when the text alone cannot reveal whether it is a scam; the label then records the author's intended scenario |
| `language` | `en`, `ms` (Malay) or `mixed` (code-switched Manglish) |
| `contains_link` | `true` if the text contains a domain or URL |
| `contains_phone` | `true` if the text contains a phone-formatted number (4-6 digit codes, short codes and masked account numbers do not count) |
| `text` | the message |

## Counts (computed from the final CSV)

| label | total | en | ms | mixed | ms+mixed share | contains_link | contains_phone | ambiguous |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| SCAM | 100 | 51 | 30 | 19 | 49% | 36 | 18 | 4 |
| SPAM | 25 | 13 | 6 | 6 | 48% | 4 | 6 | 0 |
| LEGITIMATE | 115 | 57 | 34 | 24 | 50% | 28 | 5 | 1 |
| **Total** | **240** | **121** | **70** | **49** | **50%** | **68** | **29** | **5** |

Other properties:

- 98 of 100 SCAM rows contain none of the classic English trigger words
  (urgent, winner, prize, password, OTP, verify, click, account suspended, free).
  Some Malay rows still use Malay equivalents.
- 26 SCAM rows (x001-x026) were written with a deceptive link as the main clue;
  10 further SCAM rows also contain a link.
- 17 SCAM rows (x027-x043) were written with a contact phone/WhatsApp number as the
  main clue; 1 further SCAM row also contains a number.
- All 28 LEGITIMATE links point to genuine official domains.

### Per-category counts

**SCAM (100)**

| category | n | category | n |
|---|---:|---|---:|
| account_code_hijack | 3 | loyalty_points_phishing | 1 |
| account_hijack_vote_link | 1 | lucky_draw_scam | 2 |
| aid_identity_theft | 1 | malicious_apk | 2 |
| bank_impersonation_callback | 1 | marketplace_escrow_phishing | 1 |
| bank_impersonation_tac | 1 | marketplace_fake_buyer | 2 |
| bank_phishing_link | 4 | marketplace_fake_seller | 1 |
| boss_impersonation | 2 | mule_recruitment | 3 |
| central_bank_impersonation | 1 | overseas_job_advance_fee | 2 |
| charity_scam | 2 | parcel_police_impersonation | 1 |
| courier_cod_callback | 1 | payroll_phishing | 1 |
| courier_phishing_link | 2 | pension_fund_phishing | 1 |
| court_impersonation | 1 | police_impersonation | 3 |
| court_impersonation_link | 1 | recruiter_impersonation | 1 |
| crypto_wallet_phishing | 1 | rental_deposit_scam | 2 |
| crypto_withdrawal_fee | 1 | romance_crypto_scam | 1 |
| customer_service_impersonation | 2 | romance_parcel_scam | 1 |
| customs_parcel_scam | 1 | romance_scam | 3 |
| ecommerce_refund_phishing | 1 | school_fee_impersonation | 1 |
| ewallet_phishing | 1 | sextortion | 1 |
| family_impersonation | 2 | social_security_phishing | 1 |
| friend_impersonation | 2 | subscription_phishing | 1 |
| gift_card_scam | 1 | task_job_opener | 1 |
| government_aid_phishing | 2 | task_job_scam | 4 |
| government_data_phishing | 1 | tax_impersonation | 1 |
| insurance_payout_advance_fee | 1 | tax_refund_phishing | 1 |
| insurance_refund_scam | 1 | tech_account_phishing | 1 |
| investment_link | 1 | tech_support_scam | 1 |
| investment_regulator_impersonation | 1 | telco_impersonation | 1 |
| investment_scam | 3 | telco_phishing | 1 |
| job_scam_link | 1 | telco_refund_phishing | 1 |
| loan_advance_fee | 2 | ticket_sale_scam | 1 |
| toll_payment_phishing | 1 | traffic_summons_phishing | 2 |
| utility_phishing | 1 | utility_rebate_scam | 1 |
| vehicle_sale_deposit | 1 | work_email_phishing | 1 |
| wrong_number_opener | 1 | wrong_transfer_scam | 1 |

**SPAM (25)**

| category | n | category | n |
|---|---:|---|---:|
| broadband_promo | 1 | mortgage_broker_ad | 1 |
| catering_ad | 1 | property_ad | 1 |
| credit_card_telemarketing | 1 | retail_promo | 5 |
| food_promo | 2 | service_ad | 4 |
| gym_promo | 1 | solar_ad | 1 |
| health_product_ad | 1 | survey_invite | 1 |
| insurance_ad | 1 | telco_promo | 1 |
| travel_promo | 1 | tuition_ad | 2 |

**LEGITIMATE (115)**

| category | n | category | n |
|---|---:|---|---:|
| bank_fraud_alert | 1 | new_number_notice | 3 |
| bank_notice | 7 | otp_notice | 5 |
| bank_tac_notice | 2 | property_management_notice | 2 |
| clinic_appointment | 3 | recruiter_message | 4 |
| clinic_notice | 2 | retail_pickup_notice | 1 |
| company_lucky_draw | 2 | ride_receipt | 1 |
| council_compound_notice | 1 | scam_awareness_notice | 1 |
| council_deadline | 1 | school_deadline | 2 |
| delivery_notice | 2 | school_fee_notice | 1 |
| delivery_rider | 3 | school_notice | 3 |
| donation_receipt | 3 | school_parent_message | 1 |
| ecommerce_notice | 2 | security_alert | 1 |
| ewallet_notice | 2 | service_centre_reminder | 1 |
| family_chat | 7 | subscription_receipt | 2 |
| family_transfer | 3 | telco_bill | 2 |
| food_delivery_notice | 1 | telco_notice | 2 |
| friend_chat | 8 | tenant_message | 1 |
| friend_payment | 2 | ticket_booking | 1 |
| government_notice | 9 | travel_booking | 2 |
| insurance_renewal_reminder | 1 | utility_bill | 2 |
| landlord_message | 1 | utility_notice | 2 |
| marketplace_seller | 1 | work_message | 9 |
| workshop_notice | 1 | wrong_transfer_notice | 1 |

## Limitations

- **Synthetic.** Every message was invented; none is a real collected message, so
  wording, spelling noise and formatting only approximate real traffic.
- **Single author.** One AI author in one pass: style, vocabulary and the author's
  idea of what is "hard" are narrower than reality, and labels were not reviewed by
  a second annotator.
- **Not a prevalence sample.** The label, language and scam-type mix was chosen for
  coverage, not to mirror how often each kind of message occurs. Accuracy here does
  not translate directly into real-world rates.
- **Text only.** No sender ID, sender history, timestamps, conversation context,
  images, QR codes or attachments; links were not resolved.
- **Small.** 240 rows (25 SPAM): confidence intervals are wide, especially per
  language or per category, where most cells have 1-5 rows.
- **Fixed snapshot.** Reflects scam patterns known up to late 2026; scam tactics,
  brand names and official domains change over time.
- **Label judgement.** A few borderline rows (flagged `ambiguous`) carry the
  author's intended scenario as the label; consider reporting results with and
  without them.

## Use record

Evaluated once on 10 November 2026 against three detector builds (live v1/v3/v3, round 1 v2/v4/v4,
round 2 v3/v4/v5); see `result_*.json` and `docs/IMPROVEMENTS_2026-11-10.md`. Two rows share at
least 70% of their words with a training notice (none identical). The set is no longer unseen for
later detector versions.
