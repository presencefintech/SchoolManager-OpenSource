import { apiClient } from '@/lib/api/client'
import type { PresenceDashboard, PresenceRecordResult } from '@/types/super-admin'

export const presenceApi = {
  getPresenceDashboard: (schoolId: number) =>
    apiClient
      .get<{ success: boolean; data: PresenceDashboard }>(`/superadmin/presence/dashboard/${schoolId}`)
      .then((r) => r.data.data),

  recordPresence: (schoolId: number, studentId: number, body: { scanMethod?: string; note?: string }) =>
    apiClient
      .post<{ success: boolean; message?: string; data: PresenceRecordResult }>(`/superadmin/presence/record/${schoolId}/${studentId}`, body)
      .then((r) => r.data),

  validatePresence: (schoolId: number, presenceId: number) =>
    apiClient
      .patch<{ success: boolean; data: unknown; message: string }>(`/superadmin/presence/validate/${schoolId}/${presenceId}`, {})
      .then((r) => r.data),

  bulkSyncPresence: (schoolId: number, ops: Array<{ studentId: number; scanMethod?: string; scannedAt?: string }>) =>
    apiClient
      .post<{ success: boolean; data: PresenceRecordResult[] }>(`/superadmin/presence/sync/${schoolId}`, { ops })
      .then((r) => r.data),
}
