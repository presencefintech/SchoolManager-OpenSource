import { useQuery } from '@tanstack/react-query'
import { superAdminApi } from '@/lib/superAdmin/api'

export function usePlatformStats() {
  return useQuery({
    queryKey: ['superadmin', 'stats'],
    queryFn: superAdminApi.getStats,
    staleTime: 60_000,
  })
}

export function useSchools() {
  return useQuery({
    queryKey: ['superadmin', 'schools'],
    queryFn: () => superAdminApi.getSchools(),
    staleTime: 60_000,
  })
}

export function useSchool(id: number) {
  return useQuery({
    queryKey: ['superadmin', 'schools', id],
    queryFn: () => superAdminApi.getSchool(id),
    staleTime: 60_000,
    enabled: !!id,
  })
}

export function useSchoolPerformance(id: number) {
  return useQuery({
    queryKey: ['superadmin', 'schools', id, 'performance'],
    queryFn: () => superAdminApi.getSchoolPerformance(id),
    staleTime: 60_000,
    enabled: !!id,
  })
}

export function useSchoolPaymentDashboard(id: number) {
  return useQuery({
    queryKey: ['superadmin', 'schools', id, 'payment-dashboard'],
    queryFn: () => superAdminApi.getSchoolPaymentDashboard(id),
    staleTime: 60_000,
    enabled: !!id,
  })
}

export function useSchoolAnomalies(id: number) {
  return useQuery({
    queryKey: ['superadmin', 'schools', id, 'anomalies'],
    queryFn: () => superAdminApi.getSchoolAnomalies(id),
    staleTime: 60_000,
    enabled: !!id,
  })
}

export function useReconciliationHealth() {
  return useQuery({
    queryKey: ['superadmin', 'monitoring', 'reconciliation'],
    queryFn: () => superAdminApi.getReconciliationHealth(),
    staleTime: 30_000,
  })
}

export function useProviderStats() {
  return useQuery({
    queryKey: ['superadmin', 'monitoring', 'providers'],
    queryFn: () => superAdminApi.getProviderStats(),
    staleTime: 30_000,
  })
}

export function useSecurityAlerts() {
  return useQuery({
    queryKey: ['superadmin', 'monitoring', 'alerts'],
    queryFn: () => superAdminApi.getSecurityAlerts(),
    staleTime: 30_000,
  })
}

export function useAnomalyDashboard() {
  return useQuery({
    queryKey: ['superadmin', 'anomalies', 'dashboard'],
    queryFn: () => superAdminApi.getAnomalyDashboard(),
    staleTime: 30_000,
  })
}

export function useMobileMoneyMetrics() {
  return useQuery({
    queryKey: ['superadmin', 'mm', 'metrics'],
    queryFn: () => superAdminApi.getMobileMoneyMetrics(),
    staleTime: 30_000,
  })
}

export function useFraudRadar() {
  return useQuery({
    queryKey: ['superadmin', 'mm', 'fraud-radar'],
    queryFn: () => superAdminApi.getFraudRadar(),
    staleTime: 30_000,
  })
}

export function useQueueStatus() {
  return useQuery({
    queryKey: ['superadmin', 'notifications', 'queue-status'],
    queryFn: () => superAdminApi.getQueueStatus(),
    staleTime: 15_000,
  })
}
