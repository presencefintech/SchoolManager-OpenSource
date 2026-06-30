import { apiClient } from '@/lib/api/client'

export const adminSanctionsApi = {
  analyze: (payload: { studentId: number; absenceCount?: number; lateCount?: number }) =>
    apiClient
      .post<{ success: boolean; data: { sanctionApplied: boolean; sanctionType?: string } }>(
        '/admin/sanctions/analyze',
        payload,
      )
      .then((r) => r.data.data),
}
