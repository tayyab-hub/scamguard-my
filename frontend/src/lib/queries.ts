// TanStack Query hooks connect components to api.ts. Queries represent cached server reads;
// mutations represent explicit writes. Private query keys include user identity, and successful
// writes invalidate dependent lists/counts so the UI reloads measured data.

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  analysisDetailSchema,
  analysisListSchema,
  capabilitiesSchema,
  dashboardSchema,
  deleteAnalysis,
  getApi,
  healthSchema,
  postSubmission,
  requestApi,
  type HistoryFilters,
} from './api'
import { useAuth } from '../auth/AuthContext'

// Return a submission mutation with no automatic retry; after success invalidate
// dashboard/history. A lost response may follow a server commit, so retrying blindly can create
// another record.
export function useSubmitAnalysis() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: postSubmission,
    retry: false,
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: ['dashboard'] })
      void client.invalidateQueries({ queryKey: ['analyses'] })
    },
  })
}

// Delete through the API, remove cached detail and invalidate lists/counts only after server
// success.
export function useDeleteAnalysis() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: deleteAnalysis,
    retry: false,
    onSuccess: (_data, id) => {
      client.removeQueries({ queryKey: ['analysis', id] })
      void client.invalidateQueries({ queryKey: ['dashboard'] })
      void client.invalidateQueries({ queryKey: ['analyses'] })
    },
  })
}

// Fetch the selected page for the current user. Filters use a JSON POST so sensitive search
// terms stay out of request URLs; AbortSignal cancels superseded reads.
export function useHistory(page: number, filters?: HistoryFilters) {
  const { user } = useAuth()
  return useQuery({
    queryKey: ['analyses', user?.id, page, filters],
    queryFn: ({ signal }) =>
      filters
        ? requestApi('/analyses/search', analysisListSchema, {
            method: 'POST',
            body: { ...filters, page, page_size: 10 },
            signal,
          })
        : getApi(`/analyses?page=${page}&page_size=10`, analysisListSchema, signal),
  })
}

// Fetch detail only when a row ID is selected. Including user ID in the cache key prevents
// another account reusing this cached view.
export function useAnalysisDetail(id: string | null) {
  const { user } = useAuth()
  return useQuery({
    queryKey: ['analysis', id, user?.id],
    enabled: id !== null,
    queryFn: ({ signal }) => getApi(`/analyses/${id}`, analysisDetailSchema, signal),
  })
}

// Poll liveness every 30 seconds for the small API badge; this is not readiness or engine
// capability.
export function useHealth() {
  return useQuery({
    queryKey: ['health'],
    queryFn: ({ signal }) => getApi('/health', healthSchema, signal),
    refetchInterval: 30_000,
  })
}

// Fetch measured private counts/recent summaries under an identity-specific cache key.
export function useDashboard() {
  const { user } = useAuth()
  return useQuery({
    queryKey: ['dashboard', user?.id],
    queryFn: ({ signal }) => getApi('/dashboard', dashboardSchema, signal),
  })
}

// Fetch what the current backend can store/analyse; frontend mode definitions alone do not
// enable a service.
export function useCapabilities() {
  return useQuery({
    queryKey: ['capabilities'],
    queryFn: ({ signal }) => getApi('/capabilities', capabilitiesSchema, signal),
  })
}
