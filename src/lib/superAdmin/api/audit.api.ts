import { apiClient } from '@/lib/api/client'
import type { AuditSnapshotEntry, StorageStats, AuditTrailData } from '@/types/super-admin'

export const auditApi = {
  getAuditSnapshot: () =>
    apiClient
      .get<{ success: boolean; data: AuditSnapshotEntry[] }>('/superadmin/audit/snapshot')
      .then((r) => r.data.data),

  getStorageStats: () =>
    apiClient
      .get<{ success: boolean; data: StorageStats }>('/superadmin/storage/stats')
      .then((r) => r.data.data),

  getAuditTrail: (params?: { limit?: number }) =>
    apiClient
      .get<{ success: boolean; count: number; data: AuditTrailData['data'] }>('/superadmin/audit/trail', { params })
      .then((r) => ({ count: r.data.count, data: r.data.data } as AuditTrailData)),

  checkIntegrity: (schoolId: number, studentId: number) =>
    apiClient
      .get<{ success: boolean; data: unknown }>(`/superadmin/audit/integrity/${schoolId}/${studentId}`)
      .then((r) => r.data.data),

  getPaymentFlags: () =>
    apiClient
      .get<{ success: boolean; data: unknown[] }>('/superadmin/audit/payments/flags')
      .then((r) => r.data.data),

  forceStorageUpload: (formData: FormData) =>
    apiClient
      .post<{ success: boolean; data: { message: string } }>('/superadmin/storage/force-upload', formData, {
        timeout: 60_000,
      })
      .then((r) => r.data.data),
}
