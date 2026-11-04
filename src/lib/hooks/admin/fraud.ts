import { useQuery, useMutation } from '@tanstack/react-query'
import { adminFraudApi } from '@/lib/admin/api'
import { getAuthToken } from '@/lib/api/auth-storage'

// ── Fraud ───────────────────────────────────────────────────────────

export function useFraudAlertsTop() {
  return useQuery({
    queryKey: ['admin', 'fraud-alerts-list'],
    queryFn: adminFraudApi.getAlerts,
    enabled: !!getAuthToken(),
    staleTime: 60_000,
  })
}

export function useCheckFraud() {
  return useMutation({
    mutationFn: (payload: { studentId: number; amount?: number; method?: string }) => adminFraudApi.check(payload),
  })
}
