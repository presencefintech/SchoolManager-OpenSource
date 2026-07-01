import { apiClient } from '@/lib/api/client'
import type {
  SchoolPerformance, SchoolPaymentDashboard, SchoolAnomalies, FinanceReport,
  FinancePerformance, FinanceEfficiencyLevel, TopPayer,
  FinanceAnomaliesResult, EndOfDaySnapshot, FinanceAuditFull,
  PaymentSecurityAuditItem, HighRiskProfile,
} from '@/types/super-admin'

export const financeApi = {
  getSchoolPerformance: (schoolId: number) =>
    apiClient
      .get<{ success: boolean; data: SchoolPerformance }>(`/superadmin/finance/performance/${schoolId}`)
      .then((r) => r.data.data),

  getSchoolPaymentDashboard: (schoolId: number) =>
    apiClient
      .get<{ success: boolean; data: SchoolPaymentDashboard }>(`/superadmin/payment-stats/dashboard/${schoolId}`)
      .then((r) => r.data.data),

  getSchoolAnomalies: (schoolId: number) =>
    apiClient
      .get<{ success: boolean; data: SchoolAnomalies }>(`/superadmin/finance/anomalies/${schoolId}`)
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

  getPaymentProfiles: () =>
    apiClient
      .get<{ success: boolean; data: unknown[] }>('/superadmin/finance/payment-profiles')
      .then((r) => r.data.data),

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
}
