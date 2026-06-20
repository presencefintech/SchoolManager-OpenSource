import { apiClient } from '@/lib/api/client'
import type {
  ReconciliationHealth,
  ProviderStat,
  SecurityAlerts,
  AnomalyDashboard,
  PendingPayment,
  FraudRadarItem,
  QueueStatus,
} from '@/types/super-admin'

export const monitoringApi = {
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
