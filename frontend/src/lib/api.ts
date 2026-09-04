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
  service: z.literal('scamguard-my-api'),
  version: z.string(),
})
const analysisFields = {
  id: z.uuid(),
  input_type: z.enum(['MESSAGE', 'URL']),
  status: z.literal('SUBMITTED'),
  created_at: z.iso.datetime({ offset: true }),
  updated_at: z.iso.datetime({ offset: true }),
}
export const analysisDetailSchema = z.object({ ...analysisFields, content: z.string() })
export const analysisSummarySchema = z.object({ ...analysisFields, preview: z.string().max(160) })
export const analysisListSchema = z.object({
  items: z.array(analysisSummarySchema).max(100),
  total: z.number().int().nonnegative(),
  page: z.number().int().positive(),
  page_size: z.number().int().min(1).max(100),
})
export type AnalysisSummary = z.infer<typeof analysisSummarySchema>
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
    flagged_analyses: z.null(),
    last_analysis_at: z.iso.datetime({ offset: true }).nullable(),
    recent_analyses: z.array(analysisSummarySchema).max(5),
  }),
])
export const capabilitiesSchema = z.object({
  // Older/offline previews never acquire a capability just because the UI exists.
  submission_available: z.boolean().default(false),
  submission_inputs: z.array(z.enum(['MESSAGE', 'URL'])).default([]),
  analysis_available: z.literal(false),
  supported_inputs: z.array(z.never()).length(0),
  reason: z.literal('Analysis is not enabled in this release.'),
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
        response.status >= 500
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
