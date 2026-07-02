import { apiClient } from '@/lib/api/client'

export const adminFraudApi = {
  check: (payload: { studentId: number; amount?: number; method?: string }) =>
    apiClient
      .post<{ success: boolean; data: { riskScore: number; flags: string[] } }>('/admin/fraud/check', payload)
      .then((r) => r.data.data),
  getAlerts: () =>
    apiClient.get<{ success: boolean; data: unknown[] }>('/admin/fraud-alerts').then((r) => r.data.data),
}
