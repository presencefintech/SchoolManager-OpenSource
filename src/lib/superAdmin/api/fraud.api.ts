import { apiClient } from '@/lib/api/client'
import type { FraudFlag, FraudAnalysisResult } from '@/types/super-admin'

export const fraudApi = {
  analyze: (studentId: number) =>
    apiClient
      .post<{ success: boolean; data: FraudAnalysisResult }>(`/superadmin/fraud/analyze/${studentId}`)
      .then((r) => r.data.data),

  getFlags: (params?: { schoolId?: number; page?: number; limit?: number }) =>
    apiClient
      .get<{ success: boolean; data: FraudFlag[] }>('/superadmin/fraud/flags', { params })
      .then((r) => r.data.data),
}
