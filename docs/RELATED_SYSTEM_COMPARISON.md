# Related-system comparison

**Table 4. Related systems compared by documented scope, design and implementation.** Sources: VirusTotal (n.d.-a, n.d.-b, n.d.-c), Google (2026a, 2026b), Truecaller (n.d.-a, n.d.-b, n.d.-c), and SCAMGUARD source at final release. See [background](BACKGROUND_OF_STUDY.md) for critical interpretation and [references](FINAL_REFERENCES.md).

| System and target user | Scope and deliverables | Design and documented implementation | Strength | Limitation and difference from SCAMGUARD |
| --- | --- | --- | --- | --- |
| VirusTotal; submitters, analysts, API developers | File/URL reports, contributor labels and community context. | Aggregates contributed analysis via web and HTTP API; separate private-scanning workflow has different report content. | Multiple external evidence sources. | Standard sharing needs care with private inputs; findings require interpretation. SCAMGUARD offers bounded local methods and owned history, with less external intelligence. |
| Google Safe Browsing v5; application developers | URL threat checks and threat-list data. | Canonicalisation, hash-prefix matching, local lists/cache and online lookup modes; optional privacy relay. | Maintained threat information and documented protocols. | Integration/connectivity/freshness trade-offs. SCAMGUARD does not query these lists and cannot claim the same evidence coverage. |
| Truecaller; communication recipients and web lookup users | Caller/spam information, SMS warnings, Phone/URL Scam Checker and related community reports. | Shared database/community feedback; phone/app or web interfaces. Proprietary model internals not documented in reviewed sources. | Reputation and communication context. | Reputation is a different signal from number structure. SCAMGUARD lacks identity/blocking/reputation but makes conservative metadata and QR-routing limits explicit. |
| SCAMGUARD; individual reviewers and assessors | Message/URL/Phone/QR assessments, explanations, camera/upload, private history. | React/FastAPI/PostgreSQL; local learned Message/URL components, deterministic Phone/QR and explicit consent. | Reproducible artifacts and one inspectable private workflow. | Historical data, no live destination/reputation, no complete payment validation, unmeasured human benefit. |

**Table 5. Capability evidence within the reviewed product scope.** Y = explicitly documented; NE = NOT YET EVIDENCED in these sources, not a claim of absence. No percentage superiority or usability ranking was measured.

| System | Message | URL | Phone | QR | Explanation form | Private assessment history | Camera QR |
| --- | --- | --- | --- | --- | --- | --- | --- |
| VirusTotal | NE for message-text scam analysis | Y | NE | NE | Contributor labels and reports | Standard shared reports; separate private organisation reports | NE |
| Google Safe Browsing API | NE | Y | NE | NE | Threat-match information; integration chooses UI | NE for an end-user case history | NE |
| Truecaller documented products | Y, SMS warning feature | Y, Scam Checker | Y | NE | Spam statistics and community context | NE for the same owner-scoped case workflow | NE |
| SCAMGUARD final release | Y | Y | Y, metadata only | Y, decoding/routing | Indicators, risk, separate confidence, actions and limits | Y, authenticated ownership | Y, explicit start/Analyse; hardware evidence incomplete |

Different services may expose additional features beyond this evidence boundary. Table 5 deliberately avoids inventing a negative capability where documentation was not found. The more detailed dimensions in Table 4 are needed because a simple feature checkmark would conceal materially different methods.
