import { apiClient } from '@/lib/api/client'
import type { SchoolPerformance, SchoolPaymentDashboard, SchoolAnomalies, FinanceReport } from '@/types/super-admin'

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
}
