import { apiClient } from '@/lib/api/client'

export const adminSanctionsApi = {
  analyze: (payload: {
    studentId: number
    fraudScore: number
    currentScan?: { deviceId?: string; location?: string; timestamp?: string }
  }) =>
    apiClient
      .post<{ success: boolean; data: Record<string, unknown> }>(
        '/admin/sanctions/analyze',
        payload,
      )
      .then((r) => r.data.data ?? {}),
}
