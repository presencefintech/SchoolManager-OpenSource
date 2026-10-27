import { useQuery, useMutation } from '@tanstack/react-query'
import { useEmpirePollingInterval } from '@/lib/realtime/empire-realtime-provider'
import { dashboardApi } from '@/lib/admin/api'
import { getAuthToken } from '@/lib/api/auth-storage'

// ── Dashboard ──────────────────────────────────────────────────────
export function useAdminStats() {
  const refetchInterval = useEmpirePollingInterval(60_000)
  return useQuery({
    queryKey: ['admin', 'stats'],
    queryFn: dashboardApi.getStats,
    enabled: !!getAuthToken(),
    staleTime: 30_000,
    refetchInterval,
  })
}

const LIVE_FEED_DEFAULT_PARAMS = { limit: 25 }

export function useLiveFeed(params?: { classId?: number; page?: number; limit?: number }) {
  const resolved = params ?? LIVE_FEED_DEFAULT_PARAMS
  const refetchInterval = useEmpirePollingInterval(15_000, 120_000)
  return useQuery({
    queryKey: ['admin', 'live-feed', resolved],
    queryFn: () => dashboardApi.getLiveFeed(resolved),
    enabled: !!getAuthToken(),
    staleTime: 10_000,
    refetchInterval,
    refetchOnWindowFocus: false,
  })
}

export function useHeatmap(classId?: number) {
  return useQuery({
    queryKey: ['admin', 'heatmap', classId],
    queryFn: () => dashboardApi.getHeatmap(classId),
    enabled: !!getAuthToken(),
    staleTime: 300_000,
    refetchOnWindowFocus: false,
  })
}

export function useFraudAlerts() {
  return useQuery({
    queryKey: ['admin', 'fraud-alerts'],
    queryFn: dashboardApi.getFraudAlerts,
    enabled: !!getAuthToken(),
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  })
}

export function useControlStats() {
  const refetchInterval = useEmpirePollingInterval(30_000)
  return useQuery({
    queryKey: ['admin', 'control-stats'],
    queryFn: dashboardApi.getControlStats,
    enabled: !!getAuthToken(),
    staleTime: 30_000,
    refetchInterval,
    retry: 1,
  })
}

export function useAdminDevices() {
  const refetchInterval = useEmpirePollingInterval(30_000)
  return useQuery({
    queryKey: ['admin', 'devices'],
    queryFn: dashboardApi.getDevices,
    enabled: !!getAuthToken(),
    staleTime: 15_000,
    refetchInterval,
  })
}

export function useTriggerWeeklyReport() {
  return useMutation({
    mutationFn: dashboardApi.triggerWeeklyReport,
  })
}

export function useDirectionMetrics() {
  const refetchInterval = useEmpirePollingInterval(60_000)
  return useQuery({
    queryKey: ['admin', 'dashboard', 'metrics'],
    queryFn: dashboardApi.getDirectionMetrics,
    enabled: !!getAuthToken(),
    staleTime: 45_000,
    refetchInterval,
    retry: 1,
  })
}

export function useDirectionAlerts() {
  const refetchInterval = useEmpirePollingInterval(60_000)
  return useQuery({
    queryKey: ['admin', 'dashboard', 'alerts'],
    queryFn: dashboardApi.getDirectionAlerts,
    enabled: !!getAuthToken(),
    staleTime: 45_000,
    refetchInterval,
    retry: 1,
  })
}
