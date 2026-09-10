import { QrCode } from 'lucide-react'
import type { QRAssessment } from '../../lib/api'
import {
  AnalysisMetaPanel,
  AnalysisResultHero,
  EvidencePanel,
  RecommendedActionsPanel,
} from './ResultPresentation'

export function QrResult({
  assessment,
  analysisId,
  content = '',
}: {
  assessment: QRAssessment
  analysisId?: string
  content?: string
}) {
  const qr = assessment.components.qr
  const payment = assessment.components.payment
  const paymentRows = payment
    ? [
        ['Standard', payment.standard],
        ['Format indicator', payment.payload_format_indicator],
        ['Initiation method', payment.point_of_initiation_method],
        ['Merchant category', payment.merchant_category_code],
        ['Currency code', payment.transaction_currency_code],
        ['Amount', payment.transaction_amount],
        ['Country code', payment.country_code],
        ['Merchant name', payment.merchant_name],
        ['Merchant city', payment.merchant_city],
      ].filter((row): row is [string, string] => typeof row[1] === 'string' && row[1].length > 0)
    : []
  const merchantAccountIds =
    payment &&
    Array.isArray(payment.merchant_account_information_ids) &&
    payment.merchant_account_information_ids.every((value) => typeof value === 'string')
      ? payment.merchant_account_information_ids.join(', ')
      : ''
  return (
    <div
      className="analysis-result motion-fade"
      data-risk={assessment.risk_level}
      aria-label="QR assessment"
    >
      <AnalysisResultHero assessment={assessment} />
      <section className="result-section" aria-label="QR decoding result">
        <h3 className="flex items-center gap-2 text-sm font-semibold">
          <QrCode size={16} className="text-accent" aria-hidden="true" /> QR decoding
        </h3>
        <dl className="metadata-grid mt-4">
          <div>
            <dt>Decoded type</dt>
            <dd>{qr.payload_type.toLowerCase()}</dd>
          </div>
          <div>
            <dt>Security route</dt>
            <dd>{qr.routed_engine ? `${qr.routed_engine.toLowerCase()} intelligence` : 'none'}</dd>
          </div>
          <div>
            <dt>Image</dt>
            <dd>
              {qr.image_format} · {qr.image_width} × {qr.image_height}px
            </dd>
          </div>
          <div>
            <dt>Original retained</dt>
            <dd>no</dd>
          </div>
        </dl>
        <div className="mt-4 rounded-lg border border-line bg-surface-raised p-4">
          <p className="eyebrow !text-[9px]">DECODED CONTENT · UNTRUSTED DATA</p>
          {content.length > 600 ? (
            <details className="mt-3 text-xs">
              <summary className="min-h-8 cursor-pointer rounded font-semibold text-accent">
                Reveal decoded payload ({content.length.toLocaleString()} characters)
              </summary>
              <pre className="mt-3 max-h-72 overflow-auto whitespace-pre-wrap break-all font-mono text-[11px] leading-5 text-body">
                {content}
              </pre>
            </details>
          ) : (
            <pre className="mt-3 max-h-72 overflow-auto whitespace-pre-wrap break-all font-mono text-[11px] leading-5 text-body">
              {content}
            </pre>
          )}
          <p className="mt-3 text-[10px] leading-5 text-muted">
            Displayed as escaped text. It is not a link and is never opened automatically.
          </p>
        </div>
      </section>
      {payment && (
        <section className="result-section" aria-label="Payment QR structure">
          <h3 className="text-sm font-semibold">Payment QR structure</h3>
          <dl className="metadata-grid mt-4">
            <div>
              <dt>CRC integrity</dt>
              <dd>
                {payment.crc_valid === true
                  ? 'valid'
                  : payment.crc_valid === false
                    ? 'invalid'
                    : 'unavailable'}
              </dd>
            </div>
            {paymentRows.map(([label, value]) => (
              <div key={label}>
                <dt>{label}</dt>
                <dd>{value}</dd>
              </div>
            ))}
            {merchantAccountIds && (
              <div>
                <dt>Merchant account field IDs</dt>
                <dd>{merchantAccountIds}</dd>
              </div>
            )}
          </dl>
          <p className="mt-4 text-xs leading-6 text-muted">
            Structural consistency and CRC validity do not prove recipient identity, merchant
            legitimacy, or transaction safety.
          </p>
        </section>
      )}
      <EvidencePanel assessment={assessment} />
      <RecommendedActionsPanel actions={assessment.recommended_actions} />
      <AnalysisMetaPanel assessment={assessment} analysisId={analysisId}>
        <div>
          <dt>QR engine</dt>
          <dd>{qr.engine_version}</dd>
        </div>
        <div>
          <dt>Decoder</dt>
          <dd>
            {qr.decoder_library} · {qr.decoder_version}
          </dd>
        </div>
        <div>
          <dt>Payload classifier</dt>
          <dd>{qr.classifier_version}</dd>
        </div>
        <div>
          <dt>Risk fusion</dt>
          <dd>{qr.fusion_version}</dd>
        </div>
        <div>
          <dt>Image fingerprint</dt>
          <dd className="break-all font-mono">SHA-256 {qr.file_sha256}</dd>
        </div>
      </AnalysisMetaPanel>
    </div>
  )
}
