# Message challenge set v2

`message_challenge_v2.csv` is a second, independent labelled stress test for the SCAMGUARD message detector. It has 233 short SMS/WhatsApp-style messages.

## Purpose

**Evaluation only.** Do not use this set for training, for writing or adjusting detection rules, for choosing thresholds, or for any other tuning. Once it influences the detector, it no longer measures how the detector handles messages it has never seen. If the detector is changed because of failures found here, report the results from before the change, and treat later scores on this set as optimistic.

## How it was written

An AI assistant (Claude) wrote it in one pass, working only from general knowledge of publicly documented scam patterns: Malaysian PDRM/CCID and Bank Negara Malaysia alerts, Singapore ScamShield, Australia Scamwatch, the US FTC and UK Action Fraud. While writing, the author had **no access** to the detector's code, its rules, its training data, its documentation or the first challenge set (`data/challenge/`). The aim was to avoid copying the earlier set's wording or the detector's trigger lists.

Design targets:
- About 100 SCAM, 25 SPAM and 100 LEGITIMATE messages.
- At least 35% Malay (`ms`) or code-switched (`mixed`) messages in every label.
- At least 40% of SCAM rows avoid the classic trigger words (urgent, winner, prize, password, OTP, verify, click, account suspended, free). 89 of 102 SCAM rows avoid all of them.
- About 25 scams where the main clue is a lookalike or deceptive link. These use invented domains, free hosting (weebly, github.io, 000webhostapp, blogspot, vercel.app, web.app) and shorteners (bit.ly, tinyurl).
- About 15 scams where the main clue is a phone or WhatsApp number to contact.
- About 20 legitimate messages with links to genuine official domains.
- Hard negatives: legitimate messages that share surface words with scams. These include real OTP/TAC notices that say "do not share", genuine new-number messages, family money transfers that were agreed in advance, real deadline reminders, real recruiters, and a genuine lucky-draw message from a company dinner.

All phone numbers are obviously fake placeholders, such as +60 3-1234 5678, +60 11-2345 6789, +855 12 345 678, +882 1612 3456 and +1 800-555-0199. All scam domains are invented. Account numbers are masked or made up. People's names are fictional, and no real public figures appear.

## Columns

`id,label,category,ambiguous,language,contains_link,contains_phone,text`

- `id`: v001 to v233. Rows are grouped by label and scenario, so shuffle them before any order-sensitive use.
- `label`:
  - `SCAM`: deception aimed at getting money, credentials, personal data or control of an account. Impersonation, fake links, advance fees, task or investment fraud and mule recruitment all count.
  - `SPAM`: unwanted marketing or promotion with no deception (sales, promos, cold sales).
  - `LEGITIMATE`: genuine personal, work, institutional or transactional messages.
- `category`: a short snake_case subtype.
- `ambiguous`: `true` only when the text alone cannot reveal whether the message is a scam. Examples are wrong-number openers used in "pig-butchering" scams, ticket or game-account resales, and a bare "new number, save ya". Consider reporting metrics both with and without these rows.
- `language`: `en`, `ms` (Malay) or `mixed` (Manglish / code-switching).
- `contains_link`, `contains_phone`: set by a regex over the text. A domain or URL counts as a link. A phone-formatted number counts as a phone; 4–6 digit codes and masked account numbers do not.
- `text`: the message.

The file is UTF-8 with LF line endings, uses RFC 4180 quoting, and parses with Python's `csv` module.

## Counts

| Label | en | ms | mixed | Total | contains_link | contains_phone | ambiguous |
|---|---|---|---|---|---|---|---|
| SCAM | 59 | 29 | 14 | 102 | 26 | 16 | 4 |
| SPAM | 13 | 7 | 6 | 26 | 0 | 0 | 0 |
| LEGITIMATE | 57 | 30 | 18 | 105 | 22 | 0 | 1 |
| **All** | 129 | 66 | 38 | 233 | 48 | 16 | 5 |

### Per category

**SCAM** (70 categories): `macau_scam` 6, `bank_phishing` 4, `investment_scam` 4, `courier_phishing` 3, `friend_new_number_scam` 3, `job_scam` 3, `whatsapp_code_hijack` 3, `accidental_transfer_scam` 2, `account_phishing` 2, `bank_impersonation` 2, `charity_scam` 2, `ewallet_phishing` 2, `marketplace_seller_scam` 2, `money_mule_recruitment` 2, `pig_butchering_opener` 2, `refund_scam` 2, `rental_scam` 2, `romance_scam` 2, `shopping_phishing` 2, `tax_impersonation` 2, `account_takeover_link` 1, `advance_fee_scam` 1, `airline_impersonation` 1, `business_email_compromise` 1, `ceo_fraud` 1, `ceo_gift_card_scam` 1, `crypto_phishing` 1, `crypto_romance_scam` 1, `customs_impersonation` 1, `debt_collection_scam` 1, `document_phishing` 1, `email_phishing` 1, `epf_impersonation` 1, `epf_phishing` 1, `ewallet_impersonation` 1, `extortion_scam` 1, `fake_courier_cod` 1, `family_emergency_scam` 1, `gaming_account_scam` 1, `giveaway_scam` 1, `government_phishing` 1, `govt_aid_phishing` 1, `govt_aid_scam` 1, `hotel_booking_scam` 1, `insurance_phishing` 1, `insurance_scam` 1, `investment_group_scam` 1, `loan_fee_scam` 1, `loan_scam` 1, `lottery_scam` 1, `lucky_draw_scam` 1, `marketplace_buyer_scam` 1, `paid_survey_scam` 1, `parcel_fee_scam` 1, `parcel_link_scam` 1, `pet_scam` 1, `refund_code_scam` 1, `scholarship_scam` 1, `sim_swap_scam` 1, `subscription_phishing` 1, `subscription_refund_scam` 1, `task_scam` 1, `tax_refund_phishing` 1, `tech_support_scam` 1, `telco_impersonation` 1, `ticket_resale_scam` 1, `traffic_fine_phishing` 1, `travel_package_scam` 1, `utility_impersonation` 1, `utility_phishing` 1

**SPAM** (23 categories): `food_promo` 3, `telco_promo` 2, `agent_recruitment_promo` 1, `beauty_promo` 1, `car_trade_in_promo` 1, `car_wash_promo` 1, `cold_sales_property` 1, `course_promo` 1, `credit_card_promo` 1, `electronics_promo` 1, `fashion_promo` 1, `food_delivery_promo` 1, `furniture_promo` 1, `gym_promo` 1, `insurance_promo` 1, `loyalty_promo` 1, `property_promo` 1, `retail_promo` 1, `ride_promo` 1, `solar_promo` 1, `tuition_promo` 1, `wedding_promo` 1, `workshop_promo` 1

**LEGITIMATE** (26 categories): `work_chat` 11, `friend_chat` 9, `genuine_delivery_update` 9, `family_chat` 8, `genuine_bank_notice` 8, `genuine_otp_notice` 7, `government_notice` 7, `family_money_agreed` 5, `genuine_job_recruiter` 5, `friend_new_number_genuine` 4, `marketplace_genuine` 4, `school_notice` 4, `appointment_reminder` 3, `deadline_reminder` 3, `study_chat` 3, `utility_bill_genuine` 3, `genuine_security_alert` 2, `landlord_chat` 2, `building_notice` 1, `clinic_result_notice` 1, `community_notice` 1, `genuine_ride_notice` 1, `insurance_genuine` 1, `neighbour_chat` 1, `religious_group_notice` 1, `subscription_notice` 1

## Limitations

- **Synthetic.** These messages are not real SMS or WhatsApp traffic. Real scam messages often have messier formatting, sender IDs, carrier truncation and current campaign wording that this set does not capture.
- **Single author.** One model wrote every row and labelled every row in a single pass. No second annotator checked the labels and no inter-annotator agreement was measured. The phrasing may share that author's stylistic habits.
- **Not a prevalence sample.** The class balance and the mix of categories were chosen for stress testing and do not reflect real-world frequencies. Do not read precision on this set as real-world precision.
- **Text only.** Sender ID, thread history, link reputation and a phone number's history are unavailable. Many real-world decisions depend on that context.
- **Small.** Most categories have only 1–3 examples, so per-category scores are anecdotal.
- **Fixed snapshot.** Scam wording changes quickly, and the set will drift out of date.
