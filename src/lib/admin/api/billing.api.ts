import { apiClient } from '@/lib/api/client'
import {
  parseAssignmentPage,
  parseAssignmentUsage,
  parsePlanCatalog,
  parseSchoolPlan,
  type AssignmentStatus,
} from '@/lib/admin/billing.utils'

export type AssignmentListParams = {
  classId?: number
  status?: AssignmentStatus
  page?: number
  limit?: number
}

/** Plan SaaS de l'école connectée (lecture seule — les changements passent par le superadmin). */
export const adminBillingApi = {
  getSubscription: () =>
    apiClient.get('/admin/billing/subscription').then((r) => parseSchoolPlan(r.data)),

  listPlans: () => apiClient.get('/admin/billing/plans').then((r) => parsePlanCatalog(r.data)),

  getAssignmentUsage: () =>
    apiClient.get('/admin/billing/assignments/usage').then((r) => parseAssignmentUsage(r.data)),

  listAssignments: (params: AssignmentListParams = {}) => {
    const page = params.page ?? 1
    const limit = params.limit ?? 25
    return apiClient
      .get('/admin/billing/assignments', { params: { ...params, page, limit } })
      .then((r) => parseAssignmentPage(r.data, page, limit))
  },
}
