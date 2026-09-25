import { useQuery, keepPreviousData } from '@tanstack/react-query'
import { adminBillingApi } from '@/lib/admin/api'
import type { AssignmentListParams } from '@/lib/admin/api/billing.api'
import { getAuthToken } from '@/lib/api/auth-storage'

// ── Abonnement SaaS & devoirs ─────────────────────────────────────────

export function useSchoolSubscription() {
  return useQuery({
    queryKey: ['admin', 'billing', 'subscription'],
    queryFn: adminBillingApi.getSubscription,
    enabled: !!getAuthToken(),
    staleTime: 5 * 60_000,
  })
}

export function useBillingPlans() {
  return useQuery({
    queryKey: ['admin', 'billing', 'plans'],
    queryFn: adminBillingApi.listPlans,
    enabled: !!getAuthToken(),
    staleTime: 30 * 60_000,
  })
}

export function useAssignmentUsage() {
  return useQuery({
    queryKey: ['admin', 'billing', 'assignments-usage'],
    queryFn: adminBillingApi.getAssignmentUsage,
    enabled: !!getAuthToken(),
    staleTime: 60_000,
  })
}

export function useSchoolAssignments(params: AssignmentListParams) {
  return useQuery({
    queryKey: ['admin', 'billing', 'assignments', params],
    queryFn: () => adminBillingApi.listAssignments(params),
    enabled: !!getAuthToken(),
    staleTime: 30_000,
    placeholderData: keepPreviousData,
  })
}
