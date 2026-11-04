import { apiClient } from '@/lib/api/client'

export type ProductPlanTier = 'STARTER' | 'PRO' | 'ENTERPRISE'
export type SchoolSubscriptionStatus = 'TRIAL' | 'ACTIVE' | 'PAST_DUE' | 'CANCELLED' | 'EXPIRED'

export type ProductPlan = {
  id: string
  code: ProductPlanTier
  name: string
  maxAssignmentsPerMonth: number | null
  maxHomeworkNotifsPerDay: number | null
  priceUsdMonthly: number | null
  isActive: boolean
}

export type ResolvedSchoolPlan = {
  planCode: ProductPlanTier
  planName: string
  maxAssignmentsPerMonth: number | null
  maxHomeworkNotifsPerDay: number | null
  subscriptionStatus: SchoolSubscriptionStatus | 'DEFAULT'
  source: 'subscription' | 'catalog_default' | 'tenant_limits_fallback'
}

export type SchoolSubscription = {
  id: string
  status: SchoolSubscriptionStatus
  currentPeriodStart: string
  currentPeriodEnd: string | null
  trialEndsAt: string | null
  cancelledAt: string | null
  externalRef: string | null
  metadata: unknown
  plan: ProductPlan
  createdAt: string
  updatedAt: string
}

export type SchoolBilling = {
  school: { id: number; name: string; uuid: string }
  resolved: ResolvedSchoolPlan
  subscription: SchoolSubscription | null
}

export const billingApi = {
  listPlans: () =>
    apiClient
      .get<{ success: boolean; data: ProductPlan[] }>('/superadmin/billing/plans')
      .then((r) => r.data.data),

  getSchoolBilling: (schoolId: number) =>
    apiClient
      .get<{ success: boolean; data: SchoolBilling }>(`/superadmin/billing/schools/${schoolId}`)
      .then((r) => r.data.data),

  assignSchoolPlan: (
    schoolId: number,
    body: {
      planCode: ProductPlanTier
      status?: SchoolSubscriptionStatus
      currentPeriodEnd?: string | null
      trialEndsAt?: string | null
      externalRef?: string | null
    },
  ) =>
    apiClient
      .put<{ success: boolean; data: SchoolBilling; message: string }>(
        `/superadmin/billing/schools/${schoolId}`,
        body,
      )
      .then((r) => r.data.data),

  cancelSchoolPlan: (schoolId: number, reason?: string) =>
    apiClient
      .post<{ success: boolean; data: unknown; message: string }>(
        `/superadmin/billing/schools/${schoolId}/cancel`,
        reason ? { reason } : {},
      )
      .then((r) => r.data),
}
