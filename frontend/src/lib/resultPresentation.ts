import type { Assessment, PhoneAssessment, QRAssessment, URLAssessment } from './api'

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
  return !isQRAssessment(assessment) && 'url_model' in assessment.components
}

export function isPhoneAssessment(assessment: Assessment): assessment is PhoneAssessment {
  return !isQRAssessment(assessment) && 'phone_metadata' in assessment.components
}

export function isQRAssessment(assessment: Assessment): assessment is QRAssessment {
  return 'qr' in assessment.components
}

/** Display transformation only. Never changes a stored score, category or confidence. */
export function riskScorePresentation(assessment: Assessment) {
  const url = isURLAssessment(assessment)
  const phone = isPhoneAssessment(assessment)
  const qr = isQRAssessment(assessment)
  const qrRoute = qr ? assessment.components.qr.routed_engine : null
  const available = assessment.risk_level !== 'INSUFFICIENT_EVIDENCE'
  return {
    value: !available
      ? null
      : phone || (qr && qrRoute === 'PHONE')
        ? null
        : url || (qr && qrRoute === 'URL')
          ? Math.round((urlRanks[assessment.risk_level as keyof typeof urlRanks] / 3) * 100)
          : assessment.risk_score === null
            ? null
            : Math.round(assessment.risk_score * 100),
    kind:
      phone || (qr && qrRoute === 'PHONE')
        ? 'No numeric phone risk score'
        : url || (qr && qrRoute === 'URL')
          ? 'URL category index'
          : qr && qrRoute !== 'MESSAGE'
            ? 'No numeric QR risk score'
            : qr
              ? 'Routed Message fusion score'
              : 'Message fusion score',
    explanation:
      phone || (qr && qrRoute === 'PHONE')
        ? 'Phone numbering metadata has no defensible mapping to a probability or numeric fraud score. ScamGuard therefore reports an evidence-based category without inventing numerical precision.'
        : url || (qr && qrRoute === 'URL')
          ? 'The four ordered URL risk categories map to 0, 33, 67 and 100: Low, Caution, Elevated and High. This ordinal index adds no precision within a category. 0 does not mean safe; 100 does not mean certain fraud.'
          : qr && qrRoute !== 'MESSAGE'
            ? 'QR decoding and structural metadata do not have a defensible numeric fraud score. The result therefore avoids invented precision.'
            : 'The stored Message fusion score is multiplied by 100 and rounded to a whole number. It combines local model and rule signals, with bounded contextual review when available. Rounding never changes the risk level.',
  }
}

/** Structured URL/Phone evidence is ordered by documented severity; ties retain backend order.
 * Message evidence has no per-item contributions, so preserve backend order. */
export function orderedEvidence(assessment: Assessment) {
  if (!isURLAssessment(assessment) && !isPhoneAssessment(assessment) && !isQRAssessment(assessment))
    return [...assessment.evidence]
  const severity = { MEANINGFUL: 2, WEAK: 1, CONTEXT: 0 }
  return [...assessment.evidence].sort(
    (a, b) =>
      severity['severity' in b ? b.severity : 'CONTEXT'] -
      severity['severity' in a ? a.severity : 'CONTEXT'],
  )
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
