import { z } from 'zod'
import { getApiBaseUrl } from './env'

export class ApiError extends Error {
  constructor(
    message: string,
    public status?: number,
    public requestId?: string,
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

export const healthSchema = z.object({
  status: z.literal('ok'),
  // Accept the previous identifier during rolling upgrades; the API now emits scamguard-api.
  service: z.enum(['scamguard-api', 'scamguard-my-api']),
  version: z.string(),
})
const analysisFields = {
  id: z.uuid(),
  input_type: z.enum(['MESSAGE', 'URL']),
  status: z.enum(['SUBMITTED', 'PROCESSING', 'COMPLETED', 'FAILED']),
  created_at: z.iso.datetime({ offset: true }),
  updated_at: z.iso.datetime({ offset: true }),
}
const evidenceSchema = z.object({
  category: z.string(),
  label: z.string(),
  snippet: z.string(),
  source: z.enum(['DETERMINISTIC_RULE', 'EXTERNAL_AI']),
})
export const messageAssessmentSchema = z.object({
  risk_level: z.enum(['LOW', 'CAUTION', 'ELEVATED', 'HIGH', 'INSUFFICIENT_EVIDENCE']),
  risk_score: z.number().min(0).max(1).nullable(),
  confidence_score: z.number().min(0).max(1),
  confidence_level: z.enum(['LOW', 'MEDIUM', 'HIGH']),
  summary: z.string(),
  evidence: z.array(evidenceSchema),
  recommended_actions: z.array(z.string()),
  components: z.object({
    local_model: z.object({
      used: z.literal(true),
      version: z.string(),
      class_estimate: z.enum(['LEGITIMATE', 'SPAM', 'SCAM']),
      class_probabilities: z.record(z.string(), z.number()),
      confidence: z.number().min(0).max(1),
    }),
    deterministic_rules: z.object({
      used: z.literal(true),
      version: z.string(),
      score: z.number().min(0).max(1),
      indicator_count: z.number().int().nonnegative(),
      contextual_suppressions: z.number().int().nonnegative(),
    }),
    external_ai: z.object({
      status: z.enum(['DISABLED', 'UNAVAILABLE', 'NOT_NEEDED', 'COMPLETED', 'ERROR', 'INVALID']),
      provider: z.string().nullable(),
      model: z.string().nullable(),
      contributed: z.boolean(),
    }),
    fusion: z.object({ version: z.string() }),
  }),
  limitations: z.array(z.string()),
  completed_at: z.iso.datetime({ offset: true }),
})
export const urlAssessmentSchema = z.object({
  risk_level: z.enum(['LOW', 'CAUTION', 'ELEVATED', 'HIGH', 'INSUFFICIENT_EVIDENCE']),
  risk_score: z.null(),
  confidence_score: z.number().min(0).max(1).nullable(),
  confidence_level: z.enum(['LOW', 'MEDIUM', 'HIGH']),
  summary: z.string(),
  evidence: z.array(
    z.object({
      category: z.string(),
      label: z.string(),
      snippet: z.string(),
      source: z.enum(['DETERMINISTIC_RULE', 'REPUTATION']),
      severity: z.enum(['CONTEXT', 'WEAK', 'MEANINGFUL']),
      explanation: z.string(),
      family: z.string(),
    }),
  ),
  recommended_actions: z.array(z.string()),
  components: z.object({
    url_model: z.object({
      status: z.enum(['COMPLETED', 'UNAVAILABLE']),
      version: z.string().nullable(),
      class_estimate: z.enum(['LEGITIMATE', 'PHISHING']).nullable(),
      confidence: z.number().min(0).max(1).nullable(),
    }),
    url_rules: z.object({
      status: z.literal('COMPLETED'),
      version: z.string(),
      indicator_count: z.number().int().nonnegative(),
    }),
    reputation: z.object({
      status: z.enum(['DISABLED', 'UNAVAILABLE', 'COMPLETED', 'ERROR', 'TIMEOUT', 'INVALID']),
      provider: z.string().nullable(),
      version: z.string().nullable(),
      verdict: z.enum(['UNKNOWN', 'NO_KNOWN_MATCH', 'MALICIOUS']),
    }),
    fusion: z.object({ version: z.string() }),
    url_structure: z.object({
      parser_version: z.string(),
      hostname: z.string(),
      registrable_domain: z.string().nullable(),
      scheme: z.enum(['http', 'https']),
      credentials_removed: z.boolean(),
      fragment_excluded: z.boolean(),
    }),
  }),
  limitations: z.array(z.string()),
  completed_at: z.iso.datetime({ offset: true }),
})
export type URLAssessment = z.infer<typeof urlAssessmentSchema>
export type Assessment = MessageAssessment | URLAssessment
export const analysisDetailSchema = z.object({
  ...analysisFields,
  content: z.string(),
  assessment: z.union([messageAssessmentSchema, urlAssessmentSchema]).nullable().default(null),
  failure_code: z.string().nullable().default(null),
})
export const analysisSummarySchema = z.object({
  ...analysisFields,
  preview: z.string().max(160),
  risk_level: z
    .enum(['LOW', 'CAUTION', 'ELEVATED', 'HIGH', 'INSUFFICIENT_EVIDENCE'])
    .nullable()
    .default(null),
})
export const analysisListSchema = z.object({
  items: z.array(analysisSummarySchema).max(100),
  total: z.number().int().nonnegative(),
  page: z.number().int().positive(),
  page_size: z.number().int().min(1).max(100),
})
export type AnalysisSummary = z.infer<typeof analysisSummarySchema>
export type MessageAssessment = z.infer<typeof messageAssessmentSchema>
export type SubmissionInput = { input_type: 'MESSAGE' | 'URL'; content: string }
export const dashboardSchema = z.discriminatedUnion('status', [
  z.object({
    status: z.literal('not_configured'),
    total_analyses: z.null(),
    flagged_analyses: z.null(),
    last_analysis_at: z.null(),
    recent_analyses: z.array(z.never()).length(0),
  }),
  z.object({
    status: z.literal('ready'),
    total_analyses: z.number().int().nonnegative(),
    flagged_analyses: z.number().int().nonnegative().nullable(),
    last_analysis_at: z.iso.datetime({ offset: true }).nullable(),
    recent_analyses: z.array(analysisSummarySchema).max(5),
  }),
])
export const capabilitiesSchema = z.object({
  // Older/offline previews never acquire a capability just because the UI exists.
  submission_available: z.boolean().default(false),
  submission_inputs: z.array(z.enum(['MESSAGE', 'URL'])).default([]),
  analysis_available: z.boolean(),
  supported_inputs: z.array(z.enum(['MESSAGE', 'URL'])),
  reason: z.string(),
})

export async function getApi<T>(
  path: string,
  schema: z.ZodType<T>,
  signal?: AbortSignal,
): Promise<T> {
  return requestApi(path, schema, signal)
}

export async function postSubmission(input: SubmissionInput) {
  return requestApi('/analyses', analysisDetailSchema, undefined, input)
}

async function requestApi<T>(
  path: string,
  schema: z.ZodType<T>,
  signal?: AbortSignal,
  input?: SubmissionInput,
): Promise<T> {
  // Validate inside the query so a bad deployment setting renders a recoverable view,
  // rather than throwing during module initialization and leaving a blank application.
  const apiBaseUrl = getApiBaseUrl()
  const controller = new AbortController()
  const abort = () => controller.abort()
  if (signal?.aborted) controller.abort()
  signal?.addEventListener('abort', abort, { once: true })
  const timeout = setTimeout(() => controller.abort(), 8_000)
  try {
    const response = await fetch(`${apiBaseUrl}${path}`, {
      ...(input ? { method: 'POST', body: JSON.stringify(input) } : {}),
      headers: {
        Accept: 'application/json',
        ...(input ? { 'Content-Type': 'application/json' } : {}),
      },
      signal: controller.signal,
      credentials: 'omit',
      cache: 'no-store',
    })
    if (!response.ok) {
      throw new ApiError(
        response.status === 422
          ? 'Check the highlighted fields and try again.'
          : response.status >= 500
            ? 'The service is temporarily unavailable.'
            : 'The request could not be completed.',
        response.status,
        response.headers.get('X-Request-ID') || undefined,
      )
    }
    const result = schema.safeParse(await response.json())
    if (!result.success) throw new ApiError('The service returned an unexpected response.')
    return result.data
  } catch (error) {
    if (error instanceof ApiError) throw error
    if (signal?.aborted) throw error
    if (controller.signal.aborted)
      throw new ApiError('The service took too long to respond. Please try again.')
    if (error instanceof SyntaxError)
      throw new ApiError('The service returned an unexpected response.')
    throw new ApiError('We could not reach the service. Check your connection and try again.')
  } finally {
    clearTimeout(timeout)
    signal?.removeEventListener('abort', abort)
  }
}
