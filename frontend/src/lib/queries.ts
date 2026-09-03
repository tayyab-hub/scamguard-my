import { useQuery } from '@tanstack/react-query'
import { capabilitiesSchema, dashboardSchema, getApi, healthSchema } from './api'

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
