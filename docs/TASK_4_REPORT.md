# Task 4 final verification report

Closure update (2026-09-07): **Task 4 COMPLETE and manually accepted.** The user explicitly authorized closure, a no-fast-forward merge to main and main push. This supersedes the review-only merge boundary in the historical verification record below. Closure edits documentation only; tests are not rerun. Retain the Task 4 branch; Task 5 has not started.

Verified 2026-09-07. URL Intelligence is ready for supervisor-style review on `task-4-url-intelligence`. Task 4 has not been merged. Task 5 has not started. The unauthenticated backend remains private.

## Git / start

1. Main verification: local and remote `main` both contained Task 3 merge `7625a6f54b904532d5cd0273139d429ab1aadcb6`; verified with git log and live ls-remote.
2. Branch: switched to main, completed `git pull --ff-only origin main`, created `task-4-url-intelligence`, and pushed its upstream before implementation.
3. Initial state: clean working tree; main and origin/main matched. Existing Task 1/2/3 history retained.

## Data

4. Dataset: UCI PhiUSIIL Phishing URL (Website), Arvind Prasad and Shalini Chandra, associated Computers & Security paper (2024). [Official source](https://archive.ics.uci.edu/dataset/967/phiusiil+phishing+url+dataset). Accessed 2026-09-07; exact collection dates/geography/language unknown.
5. License: CC BY 4.0; attribution, source URL and modifications documented in [URL_DATASETS.md](URL_DATASETS.md). No unlicensed dataset used.
6. Original rows: 235,795.
7. Cleaned rows: 234,674, after 13 invalid rows, 1,107 additional normalized duplicates and one conflicting group were removed.
8. Labels: originally 134,850 legitimate / 100,945 phishing; cleaned 134,849 LEGITIMATE / 99,825 PHISHING. Source 1→LEGITIMATE, 0→PHISHING.
9. Leakage: deduplicate before splitting; remove full conflicting groups; isolate all registrable-domain groups, including private PSL tenant domains. Verified 197,700 disjoint groups and unique URL hashes. Cross-domain campaign/template overlap remains possible.
10. Split: train 164,074 (94,755/69,319); validation 33,699 (20,159/13,540); test 36,901 (19,935/16,966). Counts in LEGITIMATE/PHISHING order. Fixed seed 20260907, about 70/15/15 of domain groups, not forced row ratios.

## ML

11. Features: 27 local URL-string/structure measurements: component lengths/counts, digits, escapes/delimiters, IP/IDNA/HTTPS/port flags, keywords, entropy, redirection/shortener/userinfo/alternate-host flags and token statistics. No supplied webpage, popularity, similarity or reputation columns.
12. Candidates: standardized balanced Logistic Regression; standardized balanced Linear SVM; balanced Random Forest. Validation macro F1: 0.972837, 0.971271 and 0.987783 respectively.
13. Selected: Random Forest, 120 trees, depth at most 12, minimum leaf size 10; selection by validation macro F1, no test tuning.
14. Test precision: LEGITIMATE 0.976817; PHISHING 0.994633.
15. Test recall: LEGITIMATE 0.995535; PHISHING 0.972239.
16. Test F1: LEGITIMATE 0.986088; PHISHING 0.983308. Supports 19,935 and 16,966.
17. Macro F1 0.984698; weighted F1 0.984810; accuracy 0.984824. Full precision/recall averages are in [evaluation](URL_MODEL_EVALUATION.md).
18. Confusion matrix (true rows/predicted columns, LEGITIMATE then PHISHING): `[[19846,89],[471,16495]]`. False positives 89; false negatives 471.
19. Version: `url_ml_v1`; feature version `url_features_v1`.
20. Artifact: `backend/app/url_intelligence/artifacts/url_model_v1.json`, 1,515,138 bytes. SHA-256 `87a61a0bbee6921a590b6feeeecdd00335f9dcdb2087ff412958a4d66b16f698`. Non-executable JSON; checksum verified on load. Reproduction matched exact bytes; 512 validation rows matched sklearn confidence within 1e-12; deployed inference matched the complete test confusion matrix. Committed Git blobs and wheel artifact hashes were also verified.

## Rules

21. Categories: IP_ADDRESS_HOST, EXCESSIVE_SUBDOMAINS, SUSPICIOUS_SUBDOMAIN_BRANDING, PUNYCODE, UNICODE_HOMOGLYPH_RISK, EMBEDDED_CREDENTIALS, AT_SIGN_CONFUSION, UNUSUAL_PORT, EXCESSIVE_URL_LENGTH, EXCESSIVE_PATH_DEPTH, EXCESSIVE_QUERY_PARAMETERS, ENCODING_OBFUSCATION, HIGH_ENTROPY_TOKENS, SUSPICIOUS_KEYWORDS, BRAND_LIKE_TOKEN_MISMATCH, URL_SHORTENER, REDIRECT_PARAMETER, MULTIPLE_REDIRECT_PARAMETERS, SUSPICIOUS_FILE_EXTENSION, HTTP_ONLY, NONSTANDARD_HOST_REPRESENTATION, MISSING_MEANINGFUL_DOMAIN, FRAGMENT_CONTENT; REPUTATION_MATCH only from validated injected/future provider output.
22. Thresholds: subdomains ≥4; URL length ≥256; path depth ≥8; parameters ≥12; percent escapes ≥6 or encoded delimiters ≥3 or any double encoding; token length ≥24 with entropy ≥4.2. Ports outside 80/443. Threshold rationale, token lists, extension/brand domains and limits are in [methodology](URL_INTELLIGENCE.md); review heuristics are not presented as measured population probabilities.
23. Weak-signal protection: weak/contextual evidence, even many items plus strong ML, cannot itself produce Elevated/High. Related evidence counts once by family.
24. Registrable domains: pinned tldextract 5.3.1, offline bundled PSL with private suffixes enabled; no naive last-two-label parsing or runtime download.
25. IDNA: UTS46/STD3 normalization, ASCII/punycode display, mixed Latin/Greek/Cyrillic contextual warning; no claimed exact homoglyph brand. Preserve redacted original spelling and path/query escapes; fragments retained with evidence but excluded from model input.
26. Rules version: `url_rules_v1`; parser `url_parser_v1`.

## Reputation

27. Architecture: injectable URLReputationProvider protocol plus strict validated ReputationSignal.
28. Live adapters: none. No key/configuration is required; production builder uses no provider.
29. Live API usage: none; all reputation test responses are explicit mocks. No paid provider request.
30. Disabled/failure behavior: DISABLED by default; mocked errors/timeouts/invalid output become safe statuses and preserve local risk. No-match is not proof of legitimacy. Future adapters require fixed endpoints, backend-only environment secrets, strict transport timeout and explicit privacy review.

## Fusion

31. Ordered method: confirmed attributed malicious reputation→HIGH; ≥2 meaningful families→HIGH with strong ML, otherwise ELEVATED; one meaningful family + strong ML→ELEVATED; any other evidence, PHISHING estimate or weak classifier strength→CAUTION; available classifier and no warning→LOW; no model and no warning→INSUFFICIENT_EVIDENCE.
32. Strong ML means PHISHING strength ≥0.90; strength <0.75 triggers caution. All five SCAMGUARD risk labels supported. URL risk_score is always null; no arbitrary scam percentage. These are conservative decision rules, not probability calibration.
33. Disagreement: legitimate model cannot erase evidence; ML suspicion alone is capped at Caution; reputation failure/no-match cannot lower local risk. Deterministic with provider absent.
34. Fusion version: `url_fusion_v1`.

## Security

35. No-fetch: the URL domain has no HTTP/DNS/browser/destination request path. Browser tests detected no off-origin request; local unit tests forbid socket/DNS/requests/httpx calls. Neither user URLs nor dataset URLs were opened.
36. SSRF: current prevention is absence of retrieval. Future inspection requires scheme allowlist, DNS/address/redirect revalidation, private/local/link-local/cloud-metadata blocking, timeout/size/content-type limits and isolation. No unsafe fetcher implemented.
37. Hostile inputs: unsupported schemes, invalid Unicode, controls/CRLF/NUL, length, malformed ports/escapes, userinfo, IPv4/IPv6, localhost/private/link-local/metadata/numeric/hex hosts, encoded destinations and many empty query fields passed relevant rejection/no-network/evidence tests.
38. Privacy: strip complete userinfo values before durable intake; preserve separator/credential flag as evidence. No backend key added or exposed. Query/path/fragment secrets are not generally anonymized; non-sensitive private testing only. Evidence and history render inert escaped text.

## Application

39. Database changes: no new schema required; reuse existing neutral assessment/version/component JSON fields. No historical Message row or migration altered.
40. Alembic: remains `0002_message_intelligence`. Task 4-only downgrade/re-upgrade is not applicable; full existing migration round-trip ran only in isolated *_test DB.
41. API: POST /api/v1/analyses now completes both MESSAGE and URL through separate engines. Safe persisted URL_ANALYSIS_FAILED on failure. GET history/detail reads stored results. PHONE/QR rejected.
42. Frontend: reuse established result panel/history; URL-specific risk, summary, evidence/severity/explanation, actions, component/domain details and limitations. URL percentages omitted. Loading and failure states added; post-acknowledgement field-validation state reset. No general redesign.
43. Help: full HTTP(S) input requirement, local structural analysis, no webpage fetching, HTTPS not proof of safety, advisory results and avoiding destination visits for testing. Existing FAQ search/feedback retained.
44. Persistence: stored URL assessments, versions, completion and provider status survive refresh/navigation and a real backend restart. Mock provider called once on POST, never again on historical GET.

## Testing

45. TypeScript: PASS (`npm.cmd run typecheck`).
46. ESLint: PASS, zero warnings (`npm.cmd run lint`).
47. Vitest: PASS, 57 tests in four files.
48. Build: PASS; 1,751 modules, JS 425.48 kB / gzip 127.71 kB; CSS 34.55 kB / gzip 7.12 kB.
49. Playwright: PASS, 18 foundation/motion/visual + six built offline-preview + four real PostgreSQL desktop/mobile tests. Includes 320px, keyboard and reduced-motion URL results. Existing non-failing browser color warnings remain.
50. Ruff: PASS lint and format, 48 Python files. pip check also passed. Backend wheel built and contained the correct URL artifact.
51. Pytest: PASS, 160 passed, one opt-in live AI test skipped, two existing Starlette/AnyIO deprecation warnings.
52. PostgreSQL: PASS with real isolated scamguard_test and scamguard_e2e databases on the existing local cluster. No SQLite substitute or development database downgrade.
53. Alembic: upgrade/head/current/check passed, one head at 0002, no new operations; isolated existing downgrade/re-upgrade passed.
54. Message regression: original ML/rules/fusion tests and browser persisted Message assessment passed. Message domain/artifact and historical migrations are unchanged. Overview, Help/FAQ/feedback, 404, offline states, reduced motion, Phone/QR future states passed representative regression suites. Startup scripts were unchanged.

## Browser-assisted manual results

The direct CUA tool could not initialize because of a Windows sandbox ACL error. Controlled Playwright interaction with the real local application and visual screenshot inspection supplied these manual-review observations. This is not a human-only usability study. No submitted destination was visited.

55. Synthetic `https://paypal.example.net/%252f/file.exe` → HIGH; brand-like token, double encoding, download extension, corresponding actions.
56. `https://www.example.com/` → LOW observed risk; no destination verified and no safety guarantee.
57. `http://192.0.2.10/login` → CAUTION; IP/HTTP/account-language evidence, not High from IP alone.
58. `https://paypal.com.secure-login.example.net/verify` → ELEVATED; brand-like token outside actual `example.net` domain.
59. `https://example.net/login?redirect=https%3A%2F%2Fother.example` → CAUTION; destination-parameter/encoding evidence without following it.
60. `javascript:alert(1)` → rejected, submit disabled; backend invalid-scheme tests returned validation errors.
61. Persistence → five saved assessments matched exactly after a real backend process restart; browser history/reload retained evidence. Zero console errors/off-origin requests in successful scenario capture. Desktop and 320px [screenshots](screenshots/task4-url-desktop.png) were inspected.

## Git / end

62. Implementation commits: `8e2bec1` — offline URL intelligence and reproducible local model; `85a481d` — persistence/UI and regression coverage. This report and project-memory reconciliation are closed in the subsequent `docs: close Task 4 verification handoff` commit; its exact hash is recorded in the accompanying final response.
63. Push target: only `origin/task-4-url-intelligence`; normal pushes, no force push. Remote branch verification is recorded in the final response. Main is untouched at the Task 3 merge.
64. Final branch: `task-4-url-intelligence`.
65. Final working-tree requirement: all intended changes committed; final `git status --short` verification is recorded with the handoff. Ignored local logs, test databases, builds and dependencies are not committed.

## Conclusion

66. Known limitations: major HTTPS/homepage source bias; historical non-temporal dataset; residual cross-domain campaign overlap; limited English brand/keyword coverage; uncalibrated classifier strength; no live reputation verification/webpage scanning; no general query-secret anonymization; synchronous processing; no public authentication/ownership/privacy lifecycle. High source metrics do not establish real-world performance. Existing non-failing third-party warnings are documented, and remote CI/hosted preview success is not claimed from local checks.
67. Ready for manual supervisor-style verification: **yes**, within the private-development and advisory limits above. Task 4 is not merged and Task 5 has not started. Stop here.
