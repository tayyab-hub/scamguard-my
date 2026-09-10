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

export function useAnalysisDetail(id: string | null) {
  const { user } = useAuth()
  return useQuery({
    queryKey: ['analysis', id, user?.id],
    enabled: id !== null,
    queryFn: ({ signal }) => getApi(`/analyses/${id}`, analysisDetailSchema, signal),
  })
}

export function useHealth() {
  return useQuery({
    queryKey: ['health'],
    queryFn: ({ signal }) => getApi('/health', healthSchema, signal),
    refetchInterval: 30_000,
  })
}

export function useDashboard() {
  const { user } = useAuth()
  return useQuery({
    queryKey: ['dashboard', user?.id],
    queryFn: ({ signal }) => getApi('/dashboard', dashboardSchema, signal),
  })
}

export function useCapabilities() {
  return useQuery({
    queryKey: ['capabilities'],
    queryFn: ({ signal }) => getApi('/capabilities', capabilitiesSchema, signal),
  })
}
