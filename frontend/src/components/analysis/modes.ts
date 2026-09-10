import { FileText, Link2, Phone, QrCode } from 'lucide-react'

// Presentation choices only. These are not API-supported capabilities.
export const analysisModes = [
  { type: 'MESSAGE', label: 'Message', icon: FileText, planned: false },
  { type: 'URL', label: 'URL', icon: Link2, planned: false },
  { type: 'PHONE', label: 'Phone Number', icon: Phone, planned: false },
  { type: 'QR', label: 'QR Code', icon: QrCode, planned: false },
] as const

export type AnalysisMode = (typeof analysisModes)[number]['type']
export type DraftMode = Exclude<AnalysisMode, 'QR'>

export const draftFields = {
  MESSAGE: {
    label: 'Message content',
    placeholder: 'Paste a message you would like to review…',
    limit: 5000,
  },
  URL: { label: 'Website URL', placeholder: 'https://example.com', limit: 2048 },
  PHONE: { label: 'Phone number', placeholder: '+60 12-345 6789', limit: 64 },
} satisfies Record<DraftMode, { label: string; placeholder: string; limit: number }>

export const analysisActions = {
  MESSAGE: { label: 'Analyse content', reason: 'Analysis service not enabled' },
  URL: { label: 'Analyse content', reason: 'Analysis service not enabled' },
  PHONE: {
    label: 'Analyse phone number',
    reason: 'Phone intelligence is not available from the connected service.',
  },
  QR: {
    label: 'Analyse QR',
    reason: 'QR intelligence is not available from the connected service.',
  },
} satisfies Record<AnalysisMode, { label: string; reason: string }>
