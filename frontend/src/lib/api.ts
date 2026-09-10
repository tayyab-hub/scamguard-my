import { z } from 'zod'
import { getApiBaseUrl } from './env'

export class ApiError extends Error {
  constructor(
    message: string,
    public status?: number,
    public requestId?: string,
    public code?: string,
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
  input_type: z.enum(['MESSAGE', 'URL', 'PHONE']),
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
const structuredEvidenceSchema = z.object({
  category: z.string(),
  label: z.string(),
  snippet: z.string(),
  severity: z.enum(['CONTEXT', 'WEAK', 'MEANINGFUL']),
  explanation: z.string(),
  family: z.string(),
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
    structuredEvidenceSchema.extend({
      source: z.enum(['DETERMINISTIC_RULE', 'REPUTATION']),
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
export const phoneAssessmentSchema = z.object({
  risk_level: z.enum(['LOW', 'CAUTION', 'ELEVATED', 'HIGH', 'INSUFFICIENT_EVIDENCE']),
  risk_score: z.null(),
  confidence_score: z.null(),
  confidence_level: z.literal('LOW'),
  summary: z.string(),
  evidence: z.array(structuredEvidenceSchema.extend({ source: z.literal('NUMBERING_METADATA') })),
  recommended_actions: z.array(z.string()),
  components: z.object({
    phone_metadata: z.object({
      engine_version: z.string(),
      parser_version: z.string(),
      library: z.literal('python-phonenumbers'),
      library_version: z.string(),
      normalized_e164: z.string().regex(/^\+[1-9]\d{6,14}$/),
      international_format: z.string(),
      country_calling_code: z.number().int().positive(),
      region_code: z.string().nullable(),
      possible: z.boolean(),
      valid: z.boolean(),
      number_type: z.enum([
        'MOBILE',
        'FIXED_LINE',
        'FIXED_LINE_OR_MOBILE',
        'TOLL_FREE',
        'PREMIUM_RATE',
        'SHARED_COST',
        'VOIP',
        'PERSONAL_NUMBER',
        'PAGER',
        'UAN',
        'VOICEMAIL',
        'UNKNOWN',
      ]),
    }),
    phone_rules: z.object({
      version: z.string(),
      high_cost_indicator: z.boolean(),
    }),
    fusion: z.object({ version: z.string() }),
  }),
  limitations: z.array(z.string()),
  completed_at: z.iso.datetime({ offset: true }),
})
export type URLAssessment = z.infer<typeof urlAssessmentSchema>
export type PhoneAssessment = z.infer<typeof phoneAssessmentSchema>
export type Assessment = MessageAssessment | URLAssessment | PhoneAssessment
export const analysisDetailSchema = z.object({
  ...analysisFields,
  content: z.string(),
  assessment: z
    .union([messageAssessmentSchema, urlAssessmentSchema, phoneAssessmentSchema])
    .nullable()
    .default(null),
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
export type SubmissionInput = { input_type: 'MESSAGE' | 'URL' | 'PHONE'; content: string }
export const userSchema = z.object({
  id: z.uuid(),
  email: z.email(),
  created_at: z.iso.datetime({ offset: true }),
})
export const authResponseSchema = z.object({ user: userSchema, csrf_token: z.string().min(32) })
export type User = z.infer<typeof userSchema>
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
  submission_inputs: z.array(z.enum(['MESSAGE', 'URL', 'PHONE'])).default([]),
  analysis_available: z.boolean(),
  supported_inputs: z.array(z.enum(['MESSAGE', 'URL', 'PHONE'])),
  reason: z.string(),
})

export async function getApi<T>(
  path: string,
  schema: z.ZodType<T>,
  signal?: AbortSignal,
): Promise<T> {
  return requestApi(path, schema, { signal })
}

export async function postSubmission(input: SubmissionInput) {
  return requestApi('/analyses', analysisDetailSchema, { method: 'POST', body: input })
}

let csrfToken: string | null = null

export function setCsrfToken(value: string | null) {
  csrfToken = value
}

type RequestOptions = {
  signal?: AbortSignal
  method?: 'GET' | 'POST' | 'DELETE'
  body?: unknown
}

const apiErrorSchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
    request_id: z.string().optional(),
  }),
})

export async function requestApi<T>(
  path: string,
  schema: z.ZodType<T>,
  options: RequestOptions = {},
): Promise<T> {
  // Validate inside the query so a bad deployment setting renders a recoverable view,
  // rather than throwing during module initialization and leaving a blank application.
  const apiBaseUrl = getApiBaseUrl()
  const controller = new AbortController()
  const abort = () => controller.abort()
  if (options.signal?.aborted) controller.abort()
  options.signal?.addEventListener('abort', abort, { once: true })
  const timeout = setTimeout(() => controller.abort(), 8_000)
  try {
    const method = options.method || 'GET'
    const response = await fetch(`${apiBaseUrl}${path}`, {
      ...(method === 'GET' ? {} : { method }),
      ...(options.body !== undefined ? { body: JSON.stringify(options.body) } : {}),
      headers: {
        Accept: 'application/json',
        ...(options.body !== undefined ? { 'Content-Type': 'application/json' } : {}),
        ...(method !== 'GET' && csrfToken ? { 'X-CSRF-Token': csrfToken } : {}),
      },
      signal: controller.signal,
      credentials: 'include',
      cache: 'no-store',
    })
    if (!response.ok) {
      const parsed = apiErrorSchema.safeParse(await response.json().catch(() => null))
      const message = parsed.success
        ? parsed.data.error.message
        : response.status === 422
          ? 'Check the highlighted fields and try again.'
          : response.status >= 500
            ? 'The service is temporarily unavailable.'
            : 'The request could not be completed.'
      const error = new ApiError(
        message,
        response.status,
        parsed.success
          ? parsed.data.error.request_id
          : response.headers.get('X-Request-ID') || undefined,
        parsed.success ? parsed.data.error.code : undefined,
      )
      if (response.status === 401 && !path.startsWith('/auth/')) {
        window.dispatchEvent(new Event('scamguard:unauthorized'))
      }
      throw error
    }
    const result = schema.safeParse(response.status === 204 ? undefined : await response.json())
    if (!result.success) throw new ApiError('The service returned an unexpected response.')
    return result.data
  } catch (error) {
    if (error instanceof ApiError) throw error
    if (options.signal?.aborted) throw error
    if (controller.signal.aborted)
      throw new ApiError('The service took too long to respond. Please try again.')
    if (error instanceof SyntaxError)
      throw new ApiError('The service returned an unexpected response.')
    throw new ApiError('We could not reach the service. Check your connection and try again.')
  } finally {
    clearTimeout(timeout)
    options.signal?.removeEventListener('abort', abort)
  }
}

export async function signup(email: string, password: string) {
  return requestApi('/auth/signup', authResponseSchema, {
    method: 'POST',
    body: { email, password },
  })
}

export async function login(email: string, password: string) {
  return requestApi('/auth/login', authResponseSchema, {
    method: 'POST',
    body: { email, password },
  })
}

export async function currentUser(signal?: AbortSignal) {
  return requestApi('/auth/me', authResponseSchema, { signal })
}

export async function logout() {
  return requestApi('/auth/logout', z.unknown(), { method: 'POST' })
}

export async function deleteAccount(password: string) {
  return requestApi('/auth/account', z.unknown(), { method: 'DELETE', body: { password } })
}

export async function deleteAnalysis(id: string) {
  return requestApi(`/analyses/${id}`, z.unknown(), { method: 'DELETE' })
}
