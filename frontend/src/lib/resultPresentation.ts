// Pure presentation helpers for stored results. Type guards identify a modality from its
// components; display scaling never recomputes inference or changes persisted decisions. QR
// must be recognized first because it can also contain a routed engine's fields.

import type { Assessment, PhoneAssessment, QRAssessment, URLAssessment } from './api'

export const riskCopy = {
  LOW: 'Low observed risk',
  CAUTION: 'Caution advised',
  ELEVATED: 'Elevated risk',
  HIGH: 'High risk',
  INSUFFICIENT_EVIDENCE: 'Insufficient evidence',
} as const

export const riskGuidance = {
  LOW: 'Few meaningful risk indicators were identified. This does not confirm that the content is safe.',
  CAUTION: 'Some indicators need checking. Verify the request independently before acting.',
  ELEVATED: 'Meaningful warning signs were identified. Pause and verify through a trusted channel.',
  HIGH: 'Strong warning signs were identified. Avoid acting on this request until independently verified.',
  INSUFFICIENT_EVIDENCE:
    'Available evidence is not sufficient to determine whether this content is trustworthy or malicious. This is not a low-risk or safe result.',
} as const

export const SCORE_PRESENTATION_VERSION = 'risk-presentation-v2'
const urlRanks = { LOW: 0, CAUTION: 1, ELEVATED: 2, HIGH: 3 } as const

// Narrow the TypeScript union to a direct URL result, excluding QR wrappers with url_model
// fields.
export function isURLAssessment(assessment: Assessment): assessment is URLAssessment {
  return !isQRAssessment(assessment) && 'url_model' in assessment.components
}

// Narrow to a direct Phone result, excluding routed QR wrappers.
export function isPhoneAssessment(assessment: Assessment): assessment is PhoneAssessment {
  return !isQRAssessment(assessment) && 'phone_metadata' in assessment.components
}

// Recognize the QR provenance component; callers can then inspect its routed engine safely.
export function isQRAssessment(assessment: Assessment): assessment is QRAssessment {
  return 'qr' in assessment.components
}

/** Display transformation only. Never changes a stored score, category or confidence. */
/** message-fusion-v3 stores a calibrated score; earlier saved results keep their original
 * fusion-score wording because they were produced by a different, uncalibrated policy. */
export function isCalibratedMessageScore(assessment: Assessment) {
  if (isURLAssessment(assessment) || isPhoneAssessment(assessment)) return false
  const fusion = (assessment.components as { fusion?: { version?: unknown } }).fusion
  return fusion?.version === 'message-fusion-v3'
}

export function riskScorePresentation(assessment: Assessment) {
  const calibrated = isCalibratedMessageScore(assessment)
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
            : calibrated
              ? qr
                ? 'Routed calibrated risk score'
                : 'Calibrated risk score'
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
            : calibrated
              ? 'The score is calibrated on held-out historical SMS: among test messages that scored around this value, roughly this many in 100 were scams. Bands: Caution from 5, Elevated from 35, High from 70. A documented scam tactic can raise the score to its band minimum. It is not a guarantee for this message, and new scam styles may differ.'
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

// Select at most three observations with different family/category keys. This is a compact
// summary, not a measured ranking of causal contributions.
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
