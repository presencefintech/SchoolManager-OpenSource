import { apiClient } from '@/lib/api/client'
import type {
  PlatformStats,
  School,
  SchoolDetail,
  SchoolPerformance,
  SchoolPaymentDashboard,
  SchoolAnomalies,
  ReconciliationHealth,
  ProviderStat,
  SecurityAlerts,
  AnomalyDashboard,
  PendingPayment,
  FraudRadarItem,
  QueueStatus,
} from '@/types/super-admin'

export const superAdminApi = {
  getStats: () =>
    apiClient
      .get<{ success: boolean; stats: PlatformStats }>('/superadmin/core/stats')
      .then((r) => r.data.stats),

  getSchools: (params?: { q?: string; page?: number; take?: number }) =>
    apiClient
      .get<{ success: boolean; rows: School[]; total: number }>('/superadmin/core/schools', { params })
      .then((r) => r.data.rows),

  getSchool: (id: number) =>
    apiClient
      .get<{ success: boolean; school: SchoolDetail }>(`/superadmin/core/schools/${id}`)
      .then((r) => r.data.school),

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

  /* ── Dashboard global ── */
  getReconciliationHealth: () =>
    apiClient
      .get<{ success: boolean; data: ReconciliationHealth }>('/superadmin/monitoring/reconciliation')
      .then((r) => r.data.data),

  getProviderStats: () =>
    apiClient
      .get<{ success: boolean; data: ProviderStat[] }>('/superadmin/monitoring/providers')
      .then((r) => r.data.data),

  getSecurityAlerts: () =>
    apiClient
      .get<{ success: boolean; data: SecurityAlerts }>('/superadmin/monitoring/alerts')
      .then((r) => r.data.data),

  getAnomalyDashboard: () =>
    apiClient
      .get<{ success: boolean; count: number; data: AnomalyDashboard['data'] }>('/superadmin/anomalies/dashboard')
      .then((r) => ({ count: r.data.count, data: r.data.data } as AnomalyDashboard)),

  getMobileMoneyMetrics: () =>
    apiClient
      .get<{ success: boolean; data: PendingPayment[] }>('/superadmin/mm/metrics')
      .then((r) => r.data.data),

  getFraudRadar: () =>
    apiClient
      .get<{ success: boolean; data: FraudRadarItem[] }>('/superadmin/mm/fraud-radar')
      .then((r) => r.data.data),

  getQueueStatus: () =>
    apiClient
      .get<{ success: boolean; data: QueueStatus }>('/superadmin/notifications/queue-status')
      .then((r) => r.data.data),
}
