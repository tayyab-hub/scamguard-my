# Controlled fixture evaluation

Measured 2026-09-12T12:53:12.291018+00:00. Raw evidence: [final_evaluation.json](evidence/final_evaluation.json).
Run `backend/scripts/evaluate_final.py` with the pinned backend environment to reproduce.
These are authored expectations for selected behavior, not randomly sampled fraud labels or a
population accuracy estimate. Network connections and DNS are blocked. No destination is opened,
number contacted or payment authorized. See [methodology](EVALUATION.md).

## URL — 13/13 behavior checks

Expected rules are defined before execution in `url_cases` in the runner. `true` means the specified
rule category was present (or no categories for the conventional URL); malformed cases expect
rejection. The actual fused risk is reported separately. Even conventional example.com produced
CAUTION: a visible illustration that offline model/structural signals can flag harmless content.

| Case | Inert input | Expected / observed | Detected categories | Fused risk |
| --- | --- | --- | --- | --- |
| conventional | `https://example.com/` | true / true | — | CAUTION |
| ip_host | `http://192.0.2.10/login` | true / true | IP_ADDRESS_HOST, HTTP_ONLY, SUSPICIOUS_KEYWORDS | CAUTION |
| userinfo | `https://example.com@other.example/` | true / true | MISSING_MEANINGFUL_DOMAIN, EMBEDDED_CREDENTIALS, AT_SIGN_CONFUSION | CAUTION |
| subdomains | `https://a.b.c.d.example.com/` | true / true | EXCESSIVE_SUBDOMAINS | CAUTION |
| punycode | `https://bücher.example/` | true / true | MISSING_MEANINGFUL_DOMAIN, PUNYCODE | CAUTION |
| mixed_script | `https://аpple.example.com/` | true / true | PUNYCODE, UNICODE_HOMOGLYPH_RISK | CAUTION |
| port | `https://example.com:8088/` | true / true | UNUSUAL_PORT | CAUTION |
| encoded | `https://example.com/%252f%2540` | true / true | ENCODING_OBFUSCATION | ELEVATED |
| keywords | `https://example.com/account/settings` | true / true | SUSPICIOUS_KEYWORDS | CAUTION |
| brand_structure | `https://paypal.com.secure-login.example.net/verify` | true / true | SUSPICIOUS_SUBDOMAIN_BRANDING, SUSPICIOUS_KEYWORDS | ELEVATED |
| malformed_10 | `example.com` | true / true | — | rejected |
| malformed_11 | `javascript:alert(1)` | true / true | — | rejected |
| malformed_12 | `https://` | true / true | — | rejected |

## Phone — 10/10 behavior checks

Tuple order: E.164, region, service type, valid metadata flag, risk. Rejection cases use boolean true.
These fixtures measure agreement with pinned numbering metadata and the conservative policy;
not subscriber identity or scam detection. Some syntactically valid numbers may be allocated:
use as inert text only. Missing international context is rejected, not guessed.

| Case | Input | Expected | Observed | Result |
| --- | --- | --- | --- | --- |
| mobile | `+60 12-345 6789` | ["+60123456789","MY","MOBILE",true,"INSUFFICIENT_EVIDENCE"] | ["+60123456789","MY","MOBILE",true,"INSUFFICIENT_EVIDENCE"] | PASS |
| fixed | `+44 20 7946 0958` | ["+442079460958","GB","FIXED_LINE",true,"INSUFFICIENT_EVIDENCE"] | ["+442079460958","GB","FIXED_LINE",true,"INSUFFICIENT_EVIDENCE"] | PASS |
| foreign | `+1 (202) 555-0123` | ["+12025550123","US","FIXED_LINE_OR_MOBILE",true,"INSUFFICIENT_EVIDENCE"] | ["+12025550123","US","FIXED_LINE_OR_MOBILE",true,"INSUFFICIENT_EVIDENCE"] | PASS |
| voip | `+44 56 1234 5678` | ["+445612345678","GB","VOIP",true,"INSUFFICIENT_EVIDENCE"] | ["+445612345678","GB","VOIP",true,"INSUFFICIENT_EVIDENCE"] | PASS |
| premium | `+49 900 1 234567` | ["+499001234567","DE","PREMIUM_RATE",true,"CAUTION"] | ["+499001234567","DE","PREMIUM_RATE",true,"CAUTION"] | PASS |
| shared_cost | `+33 884 01 23 45` | ["+33884012345","FR","SHARED_COST",true,"CAUTION"] | ["+33884012345","FR","SHARED_COST",true,"CAUTION"] | PASS |
| invalid | `+44 1234567` | ["+441234567",null,"UNKNOWN",false,"INSUFFICIENT_EVIDENCE"] | ["+441234567",null,"UNKNOWN",false,"INSUFFICIENT_EVIDENCE"] | PASS |
| rejected_7 | `0123456789` | true | true | PASS |
| rejected_8 | `+12` | true | true | PASS |
| rejected_9 | `+44 20 CALL NOW` | true | true | PASS |

## QR — 15/15 behavior checks

Success tuple order: exact payload decoding, classified payload type, routed engine (null means none).
Error cases expect the shown machine error code. The generated PNGs and SHA-256 hashes are retained
in [demo fixtures](../data/demo/task9/fixtures.json) and the raw evidence. These are clean synthetic
images from the same library family as the decoder, not independent camera/image accuracy evidence.
No-auto-open and stream cleanup are verified separately by browser/API tests in FINAL_TEST_REPORT.md.

| Case | Expected | Observed | Routed assessment risk | Result |
| --- | --- | --- | --- | --- |
| url | [true,"URL","URL"] | [true,"URL","URL"] | CAUTION | PASS |
| phone | [true,"PHONE","PHONE"] | [true,"PHONE","PHONE"] | INSUFFICIENT_EVIDENCE | PASS |
| message | [true,"TEXT","MESSAGE"] | [true,"TEXT","MESSAGE"] | ELEVATED | PASS |
| plain_text | [true,"TEXT",null] | [true,"TEXT",null] | INSUFFICIENT_EVIDENCE | PASS |
| payment | [true,"PAYMENT",null] | [true,"PAYMENT",null] | INSUFFICIENT_EVIDENCE | PASS |
| invalid_crc | [true,"PAYMENT",null] | [true,"PAYMENT",null] | CAUTION | PASS |
| unknown | [true,"OTHER",null] | [true,"OTHER",null] | INSUFFICIENT_EVIDENCE | PASS |
| unsafe_scheme | [true,"OTHER",null] | [true,"OTHER",null] | INSUFFICIENT_EVIDENCE | PASS |
| wifi | [true,"WIFI",null] | [true,"WIFI",null] | INSUFFICIENT_EVIDENCE | PASS |
| sms | [true,"SMS",null] | [true,"SMS",null] | INSUFFICIENT_EVIDENCE | PASS |
| email | [true,"EMAIL",null] | [true,"EMAIL",null] | INSUFFICIENT_EVIDENCE | PASS |
| payment_url | [true,"PAYMENT","URL"] | [true,"PAYMENT","URL"] | CAUTION | PASS |
| multiple | "QR_MULTIPLE_DETECTED" | "QR_MULTIPLE_DETECTED" | rejected | PASS |
| corrupt | "QR_IMAGE_INVALID" | "QR_IMAGE_INVALID" | rejected | PASS |
| no_code | "QR_NOT_DETECTED" | "QR_NOT_DETECTED" | rejected | PASS |

## Payment — 4/4 consistency/rejection checks, plus one known limitation

Tuple order: structurally_valid, crc_valid (null means not verified).

| Case | Expected | Observed | Result |
| --- | --- | --- | --- |
| valid_subset | [true,true] | [true,true] | PASS |
| invalid_crc | [false,false] | [false,false] | PASS |
| malformed_tlv | [false,null] | [false,null] | PASS |
| missing_crc | [false,null] | [false,null] | PASS |

The separate missing-merchant-fields diagnostic observed `structurally_valid=true` for a minimal
format-indicator + valid-CRC payload. Complete mandatory-field validation is absent. It is retained
as a disclosed limitation of the generic subset parser, not counted as a successful standards test.
CRC only establishes byte consistency; it does not establish a real merchant, a valid recipient,
a safe payment or absence of fraud. No bank app or real payment is part of these fixtures.
