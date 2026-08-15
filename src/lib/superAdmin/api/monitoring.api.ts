import { apiClient } from '@/lib/api/client'
import type {
  ReconciliationHealth,
  ProviderStat,
  SecurityAlerts,
  AnomalyDashboard,
  PendingPayment,
  FraudRadarItem,
  SmsIntegrationStatus,
  SmsTestResult,
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

  getSmsStatus: () =>
    apiClient
      .get<{ success: boolean; data: SmsIntegrationStatus }>('/superadmin/monitoring/sms')
      .then((r) => r.data.data),

  sendSmsTest: (phone: string, channel: 'sms' | 'whatsapp' = 'sms') =>
    apiClient
      .post<{ success: boolean; data: SmsTestResult }>('/superadmin/monitoring/sms/test', {
        phone,
        channel,
      })
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

  reconcilePayment: (paymentId: number, providerRef?: string) =>
    apiClient
      .post<{ success: boolean; data: { enrollmentId: number; message?: string } }>(`/superadmin/mm/reconcile/${paymentId}`, providerRef ? { providerRef } : {})
      .then((r) => r.data.data),
}
