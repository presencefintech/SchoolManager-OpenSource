import { apiClient } from '@/lib/api/client'
import type {
  SchoolPaymentDashboard, FinanceReport,
  FinancePerformance, FinanceEfficiencyLevel, TopPayer,
  FinanceAnomaliesResult, EndOfDaySnapshot, FinanceAuditFull,
  PaymentSecurityAuditItem, HighRiskProfile,
  GroupFinanceDashboard, CollectionBenchmark, FeeCatalogCloneResult,
} from '@/types/super-admin'

export const financeApi = {
  getSchoolPaymentDashboard: (schoolId: number) =>
    apiClient
      .get<{ success: boolean; data: SchoolPaymentDashboard }>(`/superadmin/payment-stats/dashboard/${schoolId}`)
      .then((r) => r.data.data),

  getFinanceReport: (params: { schoolId: number; startDate: string; endDate: string }) =>
    apiClient
      .get<{ success: boolean; data: FinanceReport }>('/superadmin/finance/report', { params })
      .then((r) => r.data.data),

  getFinancePerformance: (schoolId: number) =>
    apiClient
      .get<{ success: boolean; data: FinancePerformance }>(`/superadmin/finance/performance/${schoolId}`)
      .then((r) => r.data.data),

  getFinanceEfficiency: (schoolId: number) =>
    apiClient
      .get<{ success: boolean; data: FinanceEfficiencyLevel[] }>(`/superadmin/finance/efficiency/${schoolId}`)
      .then((r) => r.data.data),

  getTopPayers: (schoolId: number) =>
    apiClient
      .get<{ success: boolean; data: TopPayer[] }>(`/superadmin/finance/top-payers/${schoolId}`)
      .then((r) => r.data.data),

  getFinanceAnomalies: (schoolId: number) =>
    apiClient
      .get<{ success: boolean; data: FinanceAnomaliesResult }>(`/superadmin/finance/anomalies/${schoolId}`)
      .then((r) => r.data.data),

  getFinanceAuditFull: (schoolId: number) =>
    apiClient
      .get<{ success: boolean; data: FinanceAuditFull }>(`/superadmin/finance/audit-full/${schoolId}`)
      .then((r) => r.data.data),

  getEndOfDaySnapshot: (schoolId: number) =>
    apiClient
      .get<{ success: boolean; data: EndOfDaySnapshot }>(`/superadmin/finance/reconciliation/${schoolId}`)
      .then((r) => r.data.data),

  getPaymentSecurityAudit: (schoolId: number) =>
    apiClient
      .get<{ success: boolean; data: PaymentSecurityAuditItem[] }>(`/superadmin/payment-stats/security-audit/${schoolId}`)
      .then((r) => r.data.data),

  getHighRiskProfiles: (schoolId: number) =>
    apiClient
      .get<{ success: boolean; data: HighRiskProfile[] }>(`/superadmin/payment-stats/high-risk/${schoolId}`)
      .then((r) => r.data.data),

  getPaymentProfiles: (params?: { schoolId?: number; kycStatus?: 'PENDING' | 'VERIFIED' | 'REJECTED'; limit?: number; offset?: number }) =>
    apiClient
      .get<{ success: boolean; data: { items: unknown[]; total: number } }>('/superadmin/finance/payment-profiles', { params })
      .then((r) => r.data.data.items),

  getSchoolPaymentProfileSA: (schoolId: number) =>
    apiClient
      .get<{ success: boolean; data: unknown }>(`/superadmin/finance/payment-profiles/${schoolId}`)
      .then((r) => r.data.data),

  verifyKycProfile: (schoolId: number) =>
    apiClient
      .post<{ success: boolean; data: unknown }>(`/superadmin/finance/payment-profiles/${schoolId}/verify`)
      .then((r) => r.data.data),

  rejectKycProfile: (schoolId: number, reason?: string) =>
    apiClient
      .post<{ success: boolean; data: unknown }>(`/superadmin/finance/payment-profiles/${schoolId}/reject`, { reason })
      .then((r) => r.data.data),

  getGroupDashboard: (params?: { schoolIds?: string; startDate?: string; endDate?: string }) =>
    apiClient
      .get<{ success: boolean; data: GroupFinanceDashboard }>('/superadmin/finance/group-dashboard', { params })
      .then((r) => r.data.data),

  getBenchmarks: (schoolId: number, params?: { startDate?: string; endDate?: string }) =>
    apiClient
      .get<{ success: boolean; data: CollectionBenchmark }>(`/superadmin/finance/benchmarks/${schoolId}`, { params })
      .then((r) => r.data.data),

  cloneFeeCatalog: (payload: {
    sourceSessionId: number
    targetSessionId: number
    targetSchoolId?: number
    overwriteExisting?: boolean
  }) =>
    apiClient
      .post<{ success: boolean; data: FeeCatalogCloneResult }>('/superadmin/finance/fee-catalog/clone', payload)
      .then((r) => r.data.data),
}
