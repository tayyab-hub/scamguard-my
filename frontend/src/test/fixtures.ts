/** Test-only contract fixtures. Never import this module into production code. */
export const healthFixture = { status: 'ok', service: 'scamguard-my-api', version: '0.1.0' }
export const dashboardFixture = {
  status: 'not_configured',
  total_analyses: null,
  flagged_analyses: null,
  last_analysis_at: null,
  recent_analyses: [],
}
export const capabilitiesFixture = {
  analysis_available: false,
  supported_inputs: [],
  reason: 'Analysis is not enabled in this release.',
}
