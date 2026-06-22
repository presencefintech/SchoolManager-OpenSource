import { apiClient } from '@/lib/api/client'
import type { AnomalyDashboard, AnomalyThresholds, FraudAnalysisResult } from '@/types/super-admin'

export const anomaliesApi = {
  getDashboard: () =>
    apiClient
      .get<{ success: boolean; data: AnomalyDashboard }>('/superadmin/anomalies/dashboard')
      .then((r) => r.data.data),

  analyzeStudent: (studentId: number) =>
    apiClient
      .post<{ success: boolean; data: FraudAnalysisResult }>(`/superadmin/anomalies/analyze/${studentId}`)
      .then((r) => r.data.data),

  getThresholds: () =>
    apiClient
      .get<{ success: boolean; data: AnomalyThresholds }>('/superadmin/anomalies/thresholds')
      .then((r) => r.data.data),

  updateThresholds: (thresholds: AnomalyThresholds) =>
    apiClient
      .put<{ success: boolean; data: AnomalyThresholds }>('/superadmin/anomalies/thresholds', thresholds)
      .then((r) => r.data.data),
}
