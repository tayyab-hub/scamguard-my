import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  analysisDetailSchema,
  analysisListSchema,
  capabilitiesSchema,
  dashboardSchema,
  getApi,
  healthSchema,
  postSubmission,
} from './api'

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

export function useHistory(page: number) {
  return useQuery({
    queryKey: ['analyses', page],
    queryFn: ({ signal }) =>
      getApi(`/analyses?page=${page}&page_size=10`, analysisListSchema, signal),
  })
}

export function useAnalysisDetail(id: string | null) {
  return useQuery({
    queryKey: ['analysis', id],
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
  return useQuery({
    queryKey: ['dashboard'],
    queryFn: ({ signal }) => getApi('/dashboard', dashboardSchema, signal),
  })
}

export function useCapabilities() {
  return useQuery({
    queryKey: ['capabilities'],
    queryFn: ({ signal }) => getApi('/capabilities', capabilitiesSchema, signal),
  })
}
