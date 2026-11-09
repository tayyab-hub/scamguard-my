# Message Challenge Set v3 (`message_challenge_v3.csv`)

## Purpose

An independent, labelled set of short SMS/WhatsApp-style messages for the **final evaluation** of the Malaysian scam-message detector.

**EVALUATION ONLY.** This set must never be used for training, for writing or adjusting rules, for choosing thresholds, or for any other tuning. Treat it as sealed until the final measurement: run it once, report the result, and do not iterate on the detector against it. Once its contents have influenced the detector, it is no longer a held-out test.

## How it was written

- Written by an AI assistant (Claude) in one pass, on 2026-11-09.
- The author had **no access** to the detector's code, rules, keyword lists, models, training data, documentation, earlier challenge sets or any error analysis. No repository file was opened, listed or searched, and the detector was never run.
- Scam messages draw on general knowledge of publicly documented scam patterns (Malaysian PDRM/CCID and Bank Negara Malaysia alerts, Singapore ScamShield, Australia Scamwatch, US FTC, UK Action Fraud). Scenarios and wording are the author's own.
- Legitimate messages imitate everyday Malaysian work, family, friends, school, clinic, government, utility, bank, e-commerce and delivery messages.
- Deliberate design features:
  - At least 35% Malay (`ms`) or code-switched Manglish (`mixed`) within every label.
  - Most scams avoid the classic trigger words (urgent, winner, prize, password, OTP, verify, click, account suspended, free).
  - Scams whose main clue is a lookalike or deceptive link (invented domains, free hosting, URL shorteners), and scams whose main clue is a phone/WhatsApp number to contact.
  - Legitimate messages that link to genuine official domains.
  - Hard negatives: legitimate messages that share surface words with scams (real TAC/OTP notices that say do not share, genuine new-number messages, family transfers agreed in advance, real deadline reminders, real recruiters, a genuine company lucky draw, genuine bank and delivery notices, and ordinary uses of words such as urgent, free, verify, click, password and suspended).
- Safety: all phone numbers are obvious placeholders (sequential digits such as 012-345 6789, +1 800-555-0199). All scam domains are invented. Account numbers are masked or made up. Names are fictional; no real public figures appear. Real brand and agency names appear only as the entity being impersonated (scams) or as the genuine sender (legitimate).

## Columns

| Column | Description |
|---|---|
| `id` | Row id, `w001` onwards. |
| `label` | `SCAM` (deception aimed at money, credentials, personal data or account control), `SPAM` (unwanted marketing, no deception) or `LEGITIMATE` (genuine personal, work, institutional or transactional message). |
| `category` | Short snake_case subtype, e.g. `bank_phishing`, `police_impersonation`, `genuine_otp_notice`, `work_chat`. |
| `ambiguous` | `true` only when the text alone cannot reveal whether it is a scam (e.g. bare wrong-number openers, a bare new-number note, ticket resales). The label is the author's best guess for these rows; consider reporting results with and without them. |
| `language` | `en`, `ms` or `mixed` (code-switched). |
| `contains_link` | `true` if the text contains a domain or URL. |
| `contains_phone` | `true` if the text contains a phone-formatted number (4-6 digit codes and masked account numbers do not count). |
| `text` | The message. |

File format: UTF-8, LF line endings, RFC 4180 quoting, one header row.

## Counts

Total rows: **237**

### Label x language

| Label | en | ms | mixed | Total | ms+mixed share |
|---|---|---|---|---|---|
| SCAM | 51 | 27 | 24 | 102 | 50% |
| SPAM | 13 | 6 | 6 | 25 | 48% |
| LEGITIMATE | 53 | 33 | 24 | 110 | 52% |
| **All** | 117 | 66 | 54 | 237 | 51% |

### Flags by label

| Label | contains_link | contains_phone | ambiguous | no classic trigger word |
|---|---|---|---|---|
| SCAM | 27 | 15 | 2 | 99 |
| SPAM | 2 | 0 | 0 | 21 |
| LEGITIMATE | 21 | 0 | 3 | 100 |
| All | 50 | 15 | 5 | 220 |

"No classic trigger word" counts rows that contain none of: urgent, winner, prize, password, OTP, verify (and variants), click, suspended, free (whole-word, case-insensitive; Malay equivalents not counted).

### Per-category counts

**SCAM** (102 rows, 84 categories)

| Category | Rows |
|---|---|
| `bank_phishing` | 4 |
| `task_scam` | 4 |
| `account_code_hijack` | 3 |
| `mule_recruitment` | 3 |
| `advance_fee_loan` | 2 |
| `court_impersonation` | 2 |
| `family_emergency_impersonation` | 2 |
| `immigration_impersonation` | 2 |
| `parcel_phishing` | 2 |
| `police_impersonation` | 2 |
| `rental_scam` | 2 |
| `romance_scam` | 2 |
| `accidental_transfer_scam` | 1 |
| `account_takeover` | 1 |
| `airline_refund_phishing` | 1 |
| `bank_vishing_followup` | 1 |
| `central_bank_impersonation` | 1 |
| `ceo_gift_card_scam` | 1 |
| `ceo_impersonation` | 1 |
| `courier_police_transfer` | 1 |
| `crypto_airdrop_scam` | 1 |
| `crypto_investment_scam` | 1 |
| `crypto_phishing` | 1 |
| `customs_impersonation` | 1 |
| `ewallet_phishing` | 1 |
| `fake_charity` | 1 |
| `fake_charity_link` | 1 |
| `fake_debt_collector` | 1 |
| `fake_grant` | 1 |
| `fake_job_offer` | 1 |
| `fake_tender` | 1 |
| `friend_impersonation` | 1 |
| `gift_card_scam` | 1 |
| `government_aid_phishing` | 1 |
| `hotel_booking_scam` | 1 |
| `inheritance_advance_fee` | 1 |
| `insurance_refund_scam` | 1 |
| `investment_group_scam` | 1 |
| `investment_scam` | 1 |
| `investment_scam_link` | 1 |
| `job_scam_link` | 1 |
| `loan_scam_link` | 1 |
| `loan_shark_scam` | 1 |
| `lottery_scam` | 1 |
| `lucky_draw_fee_scam` | 1 |
| `marketplace_buyer_scam` | 1 |
| `marketplace_courier_fee` | 1 |
| `marketplace_payment_phishing` | 1 |
| `marketplace_seller_scam` | 1 |
| `new_number_family_scam` | 1 |
| `overseas_job_trafficking` | 1 |
| `personal_data_harvest` | 1 |
| `pet_scam` | 1 |
| `pilgrimage_package_scam` | 1 |
| `ponzi_investment` | 1 |
| `prize_scam` | 1 |
| `property_investment_scam` | 1 |
| `reconnect_opener` | 1 |
| `recovery_scam` | 1 |
| `refund_scam` | 1 |
| `retirement_fund_phishing` | 1 |
| `romance_investment` | 1 |
| `romance_military` | 1 |
| `scholarship_fee_scam` | 1 |
| `sextortion` | 1 |
| `shopping_voucher_phishing` | 1 |
| `social_account_hijack` | 1 |
| `subscription_phishing` | 1 |
| `survey_phishing` | 1 |
| `task_job_scam` | 1 |
| `tax_impersonation` | 1 |
| `tax_refund_phishing` | 1 |
| `tech_support_scam` | 1 |
| `telco_ekyc_scam` | 1 |
| `telco_impersonation` | 1 |
| `telco_points_phishing` | 1 |
| `ticket_scam_link` | 1 |
| `toll_phishing` | 1 |
| `traffic_fine_phishing` | 1 |
| `unclaimed_money_scam` | 1 |
| `utility_refund_phishing` | 1 |
| `vehicle_sale_scam` | 1 |
| `vote_link_hijack` | 1 |
| `wrong_number_opener` | 1 |

**SPAM** (25 rows, 24 categories)

| Category | Rows |
|---|---|
| `furniture_promo` | 2 |
| `app_push_promo` | 1 |
| `bakery_promo` | 1 |
| `car_dealer_spam` | 1 |
| `car_wash_promo` | 1 |
| `community_event_promo` | 1 |
| `course_promo` | 1 |
| `credit_card_promo` | 1 |
| `ecommerce_newsletter` | 1 |
| `electronics_promo` | 1 |
| `event_promo` | 1 |
| `food_promo` | 1 |
| `gym_promo` | 1 |
| `insurance_agent_spam` | 1 |
| `karaoke_promo` | 1 |
| `mlm_product_spam` | 1 |
| `pharmacy_promo` | 1 |
| `property_agent_spam` | 1 |
| `restaurant_promo` | 1 |
| `retail_promo` | 1 |
| `salon_promo` | 1 |
| `telco_upsell` | 1 |
| `travel_agency_promo` | 1 |
| `tuition_promo` | 1 |

**LEGITIMATE** (110 rows, 81 categories)

| Category | Rows |
|---|---|
| `family_chat` | 5 |
| `friends_chat` | 5 |
| `work_chat` | 5 |
| `genuine_otp_notice` | 4 |
| `family_transfer_agreed` | 3 |
| `school_notice` | 3 |
| `bank_transaction` | 2 |
| `clinic_reminder` | 2 |
| `company_lucky_draw` | 2 |
| `deadline_reminder` | 2 |
| `delivery_update` | 2 |
| `genuine_delivery` | 2 |
| `genuine_recruiter` | 2 |
| `neighbour_chat` | 2 |
| `university_notice` | 2 |
| `utility_outage` | 2 |
| `appointment_confirmation` | 1 |
| `bank_branch_visit` | 1 |
| `bank_card_notice` | 1 |
| `bank_estatement_link` | 1 |
| `bank_notice_link` | 1 |
| `broadband_bill` | 1 |
| `building_notice` | 1 |
| `car_insurance_renewal` | 1 |
| `carpool_chat` | 1 |
| `central_bank_awareness` | 1 |
| `community_group` | 1 |
| `condolence` | 1 |
| `cooking_chat` | 1 |
| `courier_tracking` | 1 |
| `doctor_followup` | 1 |
| `ecommerce_delivery` | 1 |
| `ecommerce_shipping` | 1 |
| `election_info` | 1 |
| `event_reminder` | 1 |
| `ewallet_reload_receipt` | 1 |
| `flight_booking` | 1 |
| `food_order` | 1 |
| `genuine_account_suspended` | 1 |
| `genuine_bank_alert` | 1 |
| `genuine_bank_callback` | 1 |
| `genuine_buyer_reply` | 1 |
| `genuine_charity_appeal` | 1 |
| `genuine_click_instruction` | 1 |
| `genuine_free_event` | 1 |
| `genuine_investment_advisor` | 1 |
| `genuine_job_offer` | 1 |
| `genuine_landlord` | 1 |
| `genuine_new_number` | 1 |
| `genuine_parking_fine` | 1 |
| `genuine_password_notice` | 1 |
| `genuine_police_contact` | 1 |
| `genuine_refund` | 1 |
| `genuine_seller_reply` | 1 |
| `genuine_temp_number` | 1 |
| `genuine_verify_request` | 1 |
| `government_database_reminder` | 1 |
| `government_notice` | 1 |
| `internship_coordinator` | 1 |
| `investment_statement` | 1 |
| `licence_renewal_reminder` | 1 |
| `lost_found` | 1 |
| `missed_call_query` | 1 |
| `new_number_bare` | 1 |
| `pharmacy_ready` | 1 |
| `religious_class_notice` | 1 |
| `retirement_fund_statement` | 1 |
| `ride_receipt` | 1 |
| `road_tax_renewal` | 1 |
| `school_results` | 1 |
| `social_security_notice` | 1 |
| `sports_club` | 1 |
| `subscription_receipt` | 1 |
| `tax_filing_reminder` | 1 |
| `thank_you` | 1 |
| `ticket_resale` | 1 |
| `tutor_chat` | 1 |
| `utility_bill` | 1 |
| `vet_reminder` | 1 |
| `wedding_invite` | 1 |
| `work_urgent` | 1 |

## Limitations

- **Synthetic.** Every message was written by an AI assistant, not collected from real inboxes. Real scams and real chats are messier (typos, forwarded chains, images, voice notes).
- **Single author, single pass.** One author's style and assumptions run through the whole set; labels were not cross-checked by a second annotator.
- **Not a prevalence sample.** The label mix (roughly 43% scam) and the share of hard negatives are chosen for testing, not to reflect how often scams occur. Precision measured here will not equal precision in the field.
- **Text only.** No sender IDs, metadata, conversation context, attachments or link destinations; contents of links were never checked because the scam domains are fictional.
- **Small.** About 230 rows; per-category and per-language results have wide confidence intervals.
- **Fixed snapshot.** Reflects scam patterns publicly documented up to late 2026; new scam types will not be represented.
- `contains_link` and `contains_phone` were derived with simple patterns and spot-checked; `ambiguous` rows have uncertain ground truth by design.
