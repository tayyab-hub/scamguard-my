import type { Assessment, PhoneAssessment, URLAssessment } from './api'

export const riskCopy = {
  LOW: 'Low observed risk',
  CAUTION: 'Caution advised',
  ELEVATED: 'Elevated risk',
  HIGH: 'High risk',
  INSUFFICIENT_EVIDENCE: 'Insufficient evidence',
} as const

export const SCORE_PRESENTATION_VERSION = 'risk-presentation-v1'
const urlRanks = { LOW: 0, CAUTION: 1, ELEVATED: 2, HIGH: 3 } as const

export function isURLAssessment(assessment: Assessment): assessment is URLAssessment {
  return 'url_model' in assessment.components
}

export function isPhoneAssessment(assessment: Assessment): assessment is PhoneAssessment {
  return 'phone_metadata' in assessment.components
}

/** Display transformation only. Never changes a stored score, category or confidence. */
export function riskScorePresentation(assessment: Assessment) {
  const url = isURLAssessment(assessment)
  const phone = isPhoneAssessment(assessment)
  const available = assessment.risk_level !== 'INSUFFICIENT_EVIDENCE'
  return {
    value: !available
      ? null
      : phone
        ? null
        : url
          ? Math.round((urlRanks[assessment.risk_level as keyof typeof urlRanks] / 3) * 100)
          : assessment.risk_score === null
            ? null
            : Math.round(assessment.risk_score * 100),
    kind: phone
      ? 'No numeric phone risk score'
      : url
        ? 'URL category index'
        : 'Message fusion score',
    explanation: phone
      ? 'Phone numbering metadata has no defensible mapping to a probability or numeric fraud score. ScamGuard therefore reports an evidence-based category without inventing numerical precision.'
      : url
        ? 'The four ordered URL risk categories map to 0, 33, 67 and 100: Low, Caution, Elevated and High. This ordinal index adds no precision within a category. 0 does not mean safe; 100 does not mean certain fraud.'
        : 'The stored Message fusion score is multiplied by 100 and rounded to a whole number. It combines local model and rule signals, with bounded contextual review when available. Rounding never changes the risk level.',
  }
}

/** Structured URL/Phone evidence is ordered by documented severity; ties retain backend order.
 * Message evidence has no per-item contributions, so preserve backend order. */
export function orderedEvidence(assessment: Assessment) {
  if (!isURLAssessment(assessment) && !isPhoneAssessment(assessment))
    return [...assessment.evidence]
  const severity = { MEANINGFUL: 2, WEAK: 1, CONTEXT: 0 }
  return [...assessment.evidence].sort((a, b) => severity[b.severity] - severity[a.severity])
}

export function topSignals(assessment: Assessment) {
  const seen = new Set<string>()
  return orderedEvidence(assessment)
    .filter((item) => {
      const key = 'family' in item ? item.family : item.category
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
    .slice(0, 3)
}
