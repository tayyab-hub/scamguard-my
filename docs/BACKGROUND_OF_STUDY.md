# Background of study

The review compares three real systems by the evidence they expose, the action they support and the assumptions they require. It uses publicly documented behaviour, not reverse-engineered internal designs or unperformed comparative experiments. An undocumented capability is marked NOT YET EVIDENCED rather than absent. Source details and verification locations are in [FINAL_REFERENCES.md](FINAL_REFERENCES.md) and [FINAL_SOURCE_REGISTER.md](FINAL_SOURCE_REGISTER.md).

## VirusTotal

VirusTotal supports users inspecting suspicious files or URLs, including security analysts and developers using its API. Its scope is broader than URL-string classification: the public service aggregates scanner results, characterisation information and community contributions. Deliverables include per-engine labels and reports. The public technical design documents HTTP API submissions and aggregated information from contributors (VirusTotal, n.d.-a, n.d.-c).

Its strength is access to multiple external evidence sources. However, scanner labels can disagree; an aggregated report is information to interpret rather than an identity certificate. Standard sharing also matters when the submitted object contains private information. VirusTotal separately documents organisation-private scanning with different report content and retention; it would be incorrect to claim that every VirusTotal submission must be public (VirusTotal, n.d.-b).

SCAMGUARD provides a smaller, reproducible local analysis boundary and owner-scoped saved explanations. It gives up VirusTotal's breadth of current contributor intelligence. The gap it addresses in this comparison is a consistent private workflow across message text, local URL analysis, numbering metadata and QR routing. No evidence establishes that SCAMGUARD detects more threats or is easier to use. VirusTotal's complete internal algorithms and infrastructure are NOT YET EVIDENCED by the reviewed documentation.

## Google Safe Browsing

Google Safe Browsing is intended for developers integrating URL threat checks into client applications. It exposes threat-list and lookup facilities rather than a complete four-mode case-history application. The v5 documentation describes URL canonicalisation, hash-prefix checks, local lists/cache and online modes. It distinguishes raw-URL lookup from hash-prefix lookup, and documents an optional Oblivious HTTP relay for additional IP privacy (Google, 2026a, 2026b).

The design's strength is maintained external threat information and explicit client protocols. The engineering trade-off is dependency on list freshness, lookup connectivity and integration choices. SCAMGUARD's no-fetch URL pipeline instead derives evidence solely from the submitted string and its packaged model. This removes the runtime threat-feed dependency but also forfeits the information that such a feed can provide. A structural warning and a threat-list match are different observations; neither should be substituted for the other in an evaluation.

The comparison therefore justifies SCAMGUARD's bounded offline method and clear limitation text, not a claim of superiority. Message classification, telephone metadata, camera QR and private assessment-history behaviour are NOT YET EVIDENCED within the reviewed Safe Browsing API scope. That statement does not describe every Google product.

## Truecaller

Truecaller targets people screening telephone communications. Its documented products include caller identification, spam blocking and SMS warnings. Its web Scam Checker also supports telephone-number and URL lookup and displays related community reports without requiring a login for the basic lookup. A comparison that labels Truecaller as telephone-only would be inaccurate (Truecaller, n.d.-a, n.d.-b, n.d.-c).

The public design combines a shared number/spam database, community feedback and user-facing warnings or blocking controls. Its strength is operational reputation and communication context that SCAMGUARD does not collect. Implementation details such as proprietary model training, database schema and anti-abuse weighting are NOT YET EVIDENCED and are not inferred from marketing language.

SCAMGUARD's Phone result is narrower: offline numbering metadata may justify a cost warning, but ordinary valid numbers remain Insufficient Evidence. This restraint is necessary because valid formatting cannot identify the current caller. SCAMGUARD adds inspectable QR routing and a reproducible local-model research record, while foregoing caller identity, call blocking and community reputation. Whether its explanations lead to better decisions requires a user study. QR-camera and equivalent private assessment-history capabilities are not established by the Truecaller pages reviewed; their absence from the entire product is not claimed.

## Synthesis and design implications

The systems differ in their unit of evidence: aggregated scanner observations, threat-list information and community-linked communication reputation. SCAMGUARD uses local model outputs, explicit rules, numbering metadata and decoded payload structure. This distinction explains both the integration opportunity and the loss of external intelligence. Its contribution is an auditable application of bounded methods with a common explanation and privacy workflow. It is not the invention of multi-channel scam checking.

Table 4 in [RELATED_SYSTEM_COMPARISON.md](RELATED_SYSTEM_COMPARISON.md) makes these differences explicit. They motivate the architecture and technology choices in [SOLUTION_APPROACH.md](SOLUTION_APPROACH.md). The local classifiers are supported by the labelled SMS corpus of Mishra and Soni (2022) and the URL corpus of Prasad and Chandra (2024); the project's own cleaning, split and evaluation records establish how those sources were used. Their publication dates do not establish the age of each collected example.
