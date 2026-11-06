# Human-authored Message indicators complement the frozen model. Regex matches, clause-local
# protective wording and combination weights form an inspectable policy, not another trained AI.
# Rules-only normalization maps evidence back to the original submitted text.

from __future__ import annotations

import re
import unicodedata
from dataclasses import dataclass

RULES_VERSION = "message-rules-v3"
URGENCY_COMBINATION_WEIGHT = 0.16
AUTHORITY_COMBINATION_WEIGHT = 0.14
PRIZE_COMBINATION_WEIGHT = 0.12
# v3 tactic combinations: documented social-engineering playbooks that need no trigger words.
IDENTITY_MONEY_COMBINATION_WEIGHT = 0.30
DISCREET_PAYMENT_COMBINATION_WEIGHT = 0.26
CONTACT_SHIFT_COMBINATION_WEIGHT = 0.20
OFFER_PAYMENT_COMBINATION_WEIGHT = 0.18

# Conversational tactics added in v3. They describe *how* a scam operates (a claimed new number,
# an unsolicited contact, a move to another app, a discreet favour, a hard-to-reverse payment)
# rather than particular alarm words, so scams written as friendly chat are no longer invisible.
TACTIC_CATEGORIES = frozenset(
    {
        "IDENTITY_CHANGE",
        "UNSOLICITED_CONTACT",
        "PLATFORM_SHIFT",
        "DISCREET_REQUEST",
        "IRREVERSIBLE_PAYMENT",
        "MONEY_REQUEST",
        "UNSOLICITED_OFFER",
        "PERSONAL_DATA",
        "ADVANCE_FEE",
    }
)


# One reviewed regex category and its policy weight. This is a detector definition, not a match
# in a particular message.
@dataclass(frozen=True)
class IndicatorDefinition:
    category: str
    label: str
    pattern: re.Pattern[str]
    weight: float


# A matched category with original-text evidence and its policy weight; repeated wording
# contributes at most once per category.
@dataclass(frozen=True)
class Indicator:
    category: str
    label: str
    snippet: str
    weight: float


# Aggregated rule score, retained evidence and suppression/normalization audit details passed to
# fusion and presentation.
@dataclass(frozen=True)
class RuleAssessment:
    score: float
    indicators: list[Indicator]
    suppressed_matches: int
    version: str = RULES_VERSION
    normalization_applied: bool = False


# Compile a case-insensitive expression and package it with a category, readable label and fixed
# weight.
def rule(category: str, label: str, expression: str, weight: float) -> IndicatorDefinition:
    return IndicatorDefinition(category, label, re.compile(expression, re.IGNORECASE), weight)


TACTIC_DEFINITIONS = (
    rule(
        "IDENTITY_CHANGE",
        "Claims a new number or lost phone",
        r"\b(new (?:phone )?(?:number|no)|changed? (?:my )?(?:phone|number)|"
        r"(?:lost|broke|broken|dropped|damaged|cracked|smashed) my phone|my phone "
        r"(?:is|was|got) (?:broken|lost|damaged|stolen|spoilt|rosak)|this is my new|"
        r"save (?:this|my new) (?:number|no)|(?:old|other) (?:phone|number) "
        r"(?:is |was )?(?:not working|dead|gone)|nombor baru|tukar nombor|"
        r"phone (?:rosak|hilang))\b",
        0.14,
    ),
    rule(
        "UNSOLICITED_CONTACT",
        "Unsolicited or wrong-number contact",
        r"(?:^|[.!?]\s*)(?:hi|hey|hello|helo)?[ ,]*is (?:this|that) (?:still )?"
        r"(?!(?:ok|okay|true|right|correct|possible|real|yours|you|it|fine|free|done|new|"
        r"mine|correct|available)\b)[a-z]+ ?\?|"
        r"\b(wrong number|sorry,? who is this|we met (?:at|on|last|during)|"
        r"(?:found|got|saw) your (?:number|contact|profile|resume|cv)|"
        r"your (?:number|contact) (?:was|is) (?:in|on|from) (?:my|our|the))\b",
        0.10,
    ),
    rule(
        "PLATFORM_SHIFT",
        "Moves the conversation to another app",
        r"\b(?:add|text|message|chat with|contact|reach|dm) (?:me|us) (?:on|via|through|at) "
        r"(?:whatsapp|telegram|line|wechat|signal|kakaotalk|instagram|ig)\b|"
        r"\b(?:we |let'?s )?(?:chat|talk|continue|move) (?:on|via|over|to) "
        r"(?:whatsapp|telegram|line|wechat|signal|kakaotalk)\b|"
        r"\b(?:not|without) (?:using|going through|through|via) (?:shopee|lazada|carousell|"
        r"mudah|grab|the platform|the app)\b|check your email to (?:receive|claim|release)|"
        r"\b(?:move|continue|switch) (?:this|our|the) (?:chat|conversation) to\b|"
        r"\b(?:telegram|whatsapp) (?:id|group|me)\b|\bt\.me/|\bwa\.me/",
        0.14,
    ),
    rule(
        "DISCREET_REQUEST",
        "Discreet or out-of-hours favour",
        r"\b(are you (?:at your desk|free now)|"
        r"(?:do me|need) a (?:quick |small )?favou?r|(?:handle|settle|sort out) "
        r"(?:something|a task|this|a payment) (?:for me|quickly|quietly|discreetly)|"
        r"quietly|discreetly|between (?:you and me|us))\b",
        0.10,
    ),
    rule(
        "IRREVERSIBLE_PAYMENT",
        "Hard-to-reverse payment method",
        r"\b(gift ?cards?|google play (?:cards?|codes?|gifts?)|itunes (?:cards?|codes?)|"
        r"apple (?:gift )?cards?|steam (?:cards?|wallet codes?)|razer gold|usdt|bitcoin|btc|"
        r"ethereum|crypto(?:currency)?|reload (?:pin|card|code)|top[- ]?up (?:pin|card|code))\b",
        0.18,
    ),
    rule(
        "MONEY_REQUEST",
        "Personal money request",
        r"\b(lend me (?:some )?(?:money|cash|rm|\$|\d)|can i borrow (?:some )?(?:money|cash|rm|"
        r"\$|\d)|borrow (?:some|rm|\$)|pinjam (?:duit|wang|rm)|short (?:of|on) "
        r"(?:cash|money)|receive (?:rm|\$) ?\d[\d,.]* (?:then|and) (?:transfer|send)|"
        r"bank in (?:the )?(?:full )?(?:rm|\$|amount|deposit|balance)|"
        r"(?:send|transfer) (?:it|the money|them) to (?:my )?(?:friend'?s?|this|another) "
        r"(?:account|number)|akaun peribadi|personal account|"
        r"help me (?:pay|cover|settle)|(?:can|could) you (?:pay|transfer|"
        r"bank in|top up|settle) (?:for|to|this|the|my|rm|\$)|(?:send|transfer|bank in) "
        r"(?:me )?(?:rm|\$|usd) ?\d|(?:rm|\$) ?\d[\d,.]* (?:to|into) (?:this|my|the|a) "
        r"(?:account|number)|new (?:bank )?account (?:number|details)|"
        r"pay (?:it|you) back (?:tomorrow|later|next))\b",
        0.16,
    ),
    rule(
        "UNSOLICITED_OFFER",
        "Unsolicited earning or investment offer",
        r"\b(daily (?:pay|salary|income|commission|earnings?)|earn (?:rm|\$|up to|extra)|"
        r"(?:rm|\$) ?\d[\d,]* ?(?:-|to) ?(?:rm|\$)? ?\d[\d,]* ?(?:per|a|/) ?(?:day|hour)|"
        r"(?:per|a) day|flexible (?:hours|working|time)|remote (?:role|job|position|work)|"
        r"no experience (?:needed|required)|(?:like|rate|review) (?:videos|posts|products|"
        r"hotels) (?:and|to) earn|trading (?:signals?|mentor|platform|group)|"
        r"investment (?:platform|group|plan|mentor)|profit (?:of|up to)|passive income|"
        r"(?:guide|teach|coach) you (?:step by step|how to (?:invest|trade|earn))|"
        r"withdr[ae]wn? (?:rm|\$) ?\d|referral (?:code|link)|(?:will|going to) (?:pump|moon)|"
        r"kerja (?:sambilan|dari rumah))\b",
        0.15,
    ),
    rule(
        "ADVANCE_FEE",
        "Upfront fee or deposit demanded",
        r"\b((?:clearance|release|processing|booking|admin(?:istration)?|legal|guaman|"
        r"insurance|customs|shipping|delivery|activation|unlock(?:ing)?|withdrawal|tax) "
        r"(?:fee|fi|charge|deposit)s?|(?:pay|bayar|transfer|bank in) (?:the |a )?(?:\w+ )?"
        r"(?:fee|fi|deposit) (?:first|dahulu|dulu)|(?:fee|fi|deposit) (?:first|dahulu|dulu)|"
        r"before (?:we|i|they) (?:release|approve|pay|send|courier|ship)|"
        r"(?:cuma|hanya) bayar)\b",
        0.16,
    ),
    rule(
        "PERSONAL_DATA",
        "Personal or account details requested",
        r"\b(full (?:name and )?address|ic (?:number|no)|mykad|nric|identity card|"
        r"date of birth|bank (?:account )?(?:number|statement|details)|account (?:number|no)|"
        r"card number|cvv|tac (?:number|code)|selfie (?:with|holding) (?:your |it|the )?(?:ic)?|"
        r"copy of (?:your )?ic|maklumat (?:bank|akaun|peribadi))\b",
        0.14,
    ),
)

DEFINITIONS = (
    rule(
        "URGENCY",
        "Urgent deadline",
        r"\b(urgent|immediately|act now|within \d+ (?:hour|minute)s?|last chance|"
        r"expires? (?:today|tonight|in \d+)|before (?:midnight|today ends)|segera|"
        r"sekarang juga)\b",
        0.14,
    ),
    rule(
        "THREAT",
        "Threat or fear",
        r"\b(account (?:will be )?(?:blocked|suspended|closed)|legal action|arrest|"
        r"penalty|unauthori[sz]ed activity|warrant|money laundering|(?:account|card) "
        r"(?:has been |is |will be )?frozen|dibekukan|disekat|summons|saman|case number|"
        r"blacklist(?:ed)?|senarai hitam)\b",
        0.18,
    ),
    rule(
        "CREDENTIAL",
        "Credential language",
        r"\b(otp|one[- ]time pass(?:word|code)|password|pin|security code|login details)\b",
        0.21,
    ),
    rule(
        "FINANCIAL",
        "Money or payment language",
        r"\b(transfer|send|pay|payment|bank account|card details|crypto|wallet|deposit|fee)\b",
        0.13,
    ),
    rule(
        "IMPERSONATION",
        "Authority reference",
        r"\b(bank|police|tax department|government|courier|support team|security team|"
        r"lhdn|pdrm|polis|mahkamah|court|bank negara|bnm|customs|kastam|immigration|"
        r"imigresen|pos ?laju|j&t|ninja ?van|shopee|lazada|maybank|cimb|public bank|rhb|"
        r"touch ?'?n ?'?go|tng)\b",
        0.09,
    ),
    rule(
        "PRIZE",
        "Prize or reward",
        r"\b(won|winner|prize|reward|claim (?:your|now)|free gift|lottery|bonus)\b",
        0.16,
    ),
    rule(
        "INVESTMENT",
        "Investment promise",
        r"\b(guaranteed return|double your money|investment opportunity|high return|"
        r"risk[- ]free profit)\b",
        0.20,
    ),
    rule(
        "JOB_TASK",
        "Job or task offer",
        r"\b(easy task|part[- ]time job|earn (?:daily|weekly)|commission task|work from home)\b",
        0.13,
    ),
    rule(
        "DELIVERY_ACCOUNT",
        "Delivery or account issue",
        r"\b(parcel|delivery failed|customs fee|verify your account|account verification)\b",
        0.12,
    ),
    rule(
        "SECRECY",
        "Secrecy pressure",
        r"\b(don't tell|do not tell|keep (?:this|it) secret|confidential between us)\b",
        0.19,
    ),
    rule(
        "REDIRECTION",
        "External redirection",
        r"\b(click(?:ing)?|tap|open|visit|follow)\b.{0,45}\b(links?|urls?|websites?)\b|"
        r"https?://|\bwww\.|\b[a-z0-9]+(?:-[a-z0-9]+)+(?:\.[a-z0-9-]+)*\.(?:com|my|net|org|"
        r"info|xyz|top|site|online|link|app|click|shop|vip|cc)\b|"
        r"\b[a-z0-9-]+\.(?:xyz|top|icu|click|vip|cc|site|online|link)\b",
        0.15,
    ),
    rule(
        "SUSPICIOUS_ACTION",
        "Requested risky action",
        r"\b(reply|call|download|install|scan|confirm|verify|share|provide)\b.{0,55}\b(code|details|identity|account|app|number)\b",
        0.16,
    ),
    *TACTIC_DEFINITIONS,
)

# Negation must describe a protective action in the same clause. Generic words like
# 'warning' also appear in account-threat scams and must never disable detection.
SAFETY_CONTEXT = re.compile(
    r"\b(?:never|do not|don't|avoid|should not|must not|will not|won't)\s+"
    r"(?:ever\s+)?(?:share|send|provide|give|disclose|enter|click(?:ing)?|open(?:ing)?|"
    r"follow(?:ing)?|pay(?:ing)?|transfer(?:ring)?|reply(?:ing)?|ask)\b",
    re.IGNORECASE,
)
CLAUSE_BREAK = re.compile(r"[.!?;\n]|\b(?:but|however|instead)\b", re.IGNORECASE)
SPACED_WORD = re.compile(r"(?<!\w)(?:[a-z][ ._-]){2,}[a-z](?!\w)", re.IGNORECASE)
# This small substitution table handles some mixed letter/digit spellings. It is a heuristic
# with limited language coverage, not general deobfuscation.
LEET = str.maketrans("013457", "oieast")


def rule_text(text: str) -> tuple[str, list[int]]:
    """Rules-only normalization with offsets back to original evidence.

    Do not feed this representation to the frozen ML model: its preprocessing is versioned
    independently. Compatibility glyphs, invisible separators and simple mixed alphanumeric
    substitutions are treated as spelling variants, never as independent evidence of fraud.
    """
    characters: list[str] = []
    offsets: list[int] = []
    for index, character in enumerate(text):
        if character in "\u200b\u200c\u200d\u2060\ufeff":
            continue
        normalized = unicodedata.normalize("NFKC", character).casefold().replace("’", "'")
        characters.extend(normalized)
        offsets.extend([index] * len(normalized))
    normalized = "".join(characters)
    for token in re.finditer(r"\b[a-z0-9]+\b", normalized):
        if any(c.isalpha() for c in token.group()) and any(c.isdigit() for c in token.group()):
            characters[token.start() : token.end()] = token.group().translate(LEET)
    normalized = "".join(characters)
    removed = {
        index
        for match in SPACED_WORD.finditer(normalized)
        for index in range(match.start(), match.end())
        if not normalized[index].isalpha()
    }
    return (
        "".join(c for i, c in enumerate(normalized) if i not in removed),
        [offset for i, offset in enumerate(offsets) if i not in removed],
    )


# Find the clause surrounding a regex match and check for a protective action there. Clause
# breaks stop a warning elsewhere in the message from suppressing every suspicious request.
def protective_context(text: str, start: int, end: int) -> bool:
    left = 0
    right = len(text)
    for separator in CLAUSE_BREAK.finditer(text):
        if separator.end() <= start:
            left = separator.end()
        elif separator.start() >= end:
            right = separator.start()
            break
    return bool(SAFETY_CONTEXT.search(text[left:right]))


# Return a short original-text context window around a match, flattening whitespace and adding
# ellipses when cropped. Snippets are evidence for readers, not additional model input.
def _snippet(text: str, start: int, end: int) -> str:
    left = max(0, start - 36)
    right = min(len(text), end + 50)
    value = " ".join(text[left:right].split())
    if left:
        value = "…" + value
    if right < len(text):
        value += "…"
    return value[:180]


# Scan normalized text, suppress protective-clause matches and keep one indicator per category.
# Add only the named combination bonuses, cap the score at one and return audit details with
# original-text snippets.
def assess_rules(text: str) -> RuleAssessment:
    indicators: list[Indicator] = []
    suppressed = 0
    normalized, offsets = rule_text(text)
    for definition in DEFINITIONS:
        for match in definition.pattern.finditer(normalized):
            if protective_context(normalized, match.start(), match.end()):
                suppressed += 1
                continue
            indicators.append(
                Indicator(
                    category=definition.category,
                    label=definition.label,
                    snippet=_snippet(text, offsets[match.start()], offsets[match.end() - 1] + 1),
                    weight=definition.weight,
                )
            )
            break  # Repeated wording cannot inflate a category's contribution.

    # Combinations encode why a pattern is more concerning in context: urgency plus a requested
    # action, authority plus threat/money, or a prize plus a demand. These weights were
    # authored, not learned.
    categories = {indicator.category for indicator in indicators}
    score = sum(indicator.weight for indicator in indicators)
    if "URGENCY" in categories and categories & {"CREDENTIAL", "FINANCIAL", "REDIRECTION"}:
        score += URGENCY_COMBINATION_WEIGHT
    if "IMPERSONATION" in categories and categories & {"THREAT", "CREDENTIAL", "FINANCIAL"}:
        score += AUTHORITY_COMBINATION_WEIGHT
    if "PRIZE" in categories and categories & {"FINANCIAL", "REDIRECTION", "SUSPICIOUS_ACTION"}:
        score += PRIZE_COMBINATION_WEIGHT
    # Generic money words ("send", "pay") are too common in ordinary chat to complete these
    # playbooks; only explicit money, payment-method, data or credential requests do.
    payment = {"MONEY_REQUEST", "IRREVERSIBLE_PAYMENT", "PERSONAL_DATA", "CREDENTIAL"}
    # "Hi mum, new number" followed by a money or code request is a well-documented playbook.
    if "IDENTITY_CHANGE" in categories and categories & payment:
        score += IDENTITY_MONEY_COMBINATION_WEIGHT
    # Family-emergency playbook: "don't tell Mum" plus money.
    if "SECRECY" in categories and categories & (payment | {"FINANCIAL"}):
        score += DISCREET_PAYMENT_COMBINATION_WEIGHT
    # Advance-fee playbook: a fee before a loan, parcel, prize, job or release.
    if "ADVANCE_FEE" in categories and categories & (payment | {"FINANCIAL", "IMPERSONATION"}):
        score += OFFER_PAYMENT_COMBINATION_WEIGHT
    # Boss/colleague impersonation: a discreet favour paid in gift cards or transfers.
    if "DISCREET_REQUEST" in categories and categories & payment:
        score += DISCREET_PAYMENT_COMBINATION_WEIGHT
    # Wrong-number and romance openers that move to another app or to an offer.
    if "UNSOLICITED_CONTACT" in categories and categories & {
        "PLATFORM_SHIFT",
        "UNSOLICITED_OFFER",
        "IRREVERSIBLE_PAYMENT",
    }:
        score += CONTACT_SHIFT_COMBINATION_WEIGHT
    # Job/task and investment scams: an unsolicited offer plus app move or payment method.
    if "UNSOLICITED_OFFER" in categories and categories & {
        "PLATFORM_SHIFT",
        "IRREVERSIBLE_PAYMENT",
        "FINANCIAL",
        "MONEY_REQUEST",
    }:
        score += OFFER_PAYMENT_COMBINATION_WEIGHT
    return RuleAssessment(
        score=min(score, 1.0),
        indicators=indicators,
        suppressed_matches=suppressed,
        normalization_applied=normalized != text.casefold(),
    )
