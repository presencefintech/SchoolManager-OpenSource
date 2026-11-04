import { apiClient } from '@/lib/api/client'
import { mapPresenceSecurityEventToFraudAlert } from '@/lib/admin/fraud-alert.utils'
import type { FraudAlert } from '@/types/admin'

export type FraudAnalysisResult = {
  score: number
  scorePercent: number
  reasons: string[]
  flagged: boolean
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  appliedRules: string[]
  action: 'ALLOW' | 'REVIEW' | 'BLOCK'
}

export const adminFraudApi = {
  check: (payload: { studentId: number; amount?: number; method?: string }) =>
    apiClient
      .post<{ success: boolean; analysis: FraudAnalysisResult }>('/admin/fraud/check', payload)
      .then((r) => r.data.analysis),

  getAlerts: () =>
    apiClient
      .get<{ success: boolean; data: Record<string, unknown>[] }>('/admin/fraud-alerts')
      .then((r) =>
        (Array.isArray(r.data.data) ? r.data.data : []).map((row) =>
          mapPresenceSecurityEventToFraudAlert(row),
        ) as FraudAlert[],
      ),
}
