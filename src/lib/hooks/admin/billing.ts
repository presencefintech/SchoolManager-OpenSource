import { useQuery, keepPreviousData } from '@tanstack/react-query'
import { adminBillingApi } from '@/lib/admin/api'
import type { AssignmentListParams } from '@/lib/admin/api/billing.api'
import { useAuth } from '@/providers/auth-provider'

// ── Abonnement SaaS & devoirs ─────────────────────────────────────────

/** Attend la session : la page ne se re-rend pas seule quand l'auth s'hydrate. */
function useSessionReady() {
  const { user } = useAuth()
  return !!user
}

export function useSchoolSubscription() {
  const ready = useSessionReady()
  return useQuery({
    queryKey: ['admin', 'billing', 'subscription'],
    queryFn: adminBillingApi.getSubscription,
    enabled: ready,
    staleTime: 5 * 60_000,
  })
}

export function useBillingPlans() {
  const ready = useSessionReady()
  return useQuery({
    queryKey: ['admin', 'billing', 'plans'],
    queryFn: adminBillingApi.listPlans,
    enabled: ready,
    staleTime: 30 * 60_000,
  })
}

export function useAssignmentUsage() {
  const ready = useSessionReady()
  return useQuery({
    queryKey: ['admin', 'billing', 'assignments-usage'],
    queryFn: adminBillingApi.getAssignmentUsage,
    enabled: ready,
    staleTime: 60_000,
  })
}

export function useSchoolAssignments(params: AssignmentListParams) {
  const ready = useSessionReady()
  return useQuery({
    queryKey: ['admin', 'billing', 'assignments', params],
    queryFn: () => adminBillingApi.listAssignments(params),
    enabled: ready,
    staleTime: 30_000,
    placeholderData: keepPreviousData,
  })
}
