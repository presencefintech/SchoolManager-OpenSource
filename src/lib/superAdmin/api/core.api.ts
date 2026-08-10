import { apiClient } from '@/lib/api/client'
import type { PlatformStats, School, SchoolDetail, CoreUser, CoreStudent, CorePresence, CoreAuditLog, CoreListResponse } from '@/types/super-admin'

export const coreApi = {
  getStats: () =>
    apiClient
      .get<{ success: boolean; stats: PlatformStats }>('/superadmin/core/stats')
      .then((r) => r.data.stats),

  getSchools: (params?: { q?: string; page?: number; take?: number; status?: 'all' | 'active' | 'suspended' }) =>
    apiClient
      .get<{ success: boolean; rows: School[]; total: number }>('/superadmin/core/schools', { params })
      .then((r) => r.data.rows),

  getSchool: (id: number) =>
    apiClient
      .get<{ success: boolean; school: SchoolDetail }>(`/superadmin/core/schools/${id}`)
      .then((r) => r.data.school),

  suspendSchool: (
    id: number,
    body: { reason: string; code?: 'INSOLVENCY' | 'CONTRACT_BREACH' | 'OTHER' },
  ) =>
    apiClient
      .post<{ success: boolean; school: SchoolDetail; message: string }>(
        `/superadmin/core/schools/${id}/suspend`,
        body,
      )
      .then((r) => r.data.school),

  reactivateSchool: (id: number, body?: { note?: string }) =>
    apiClient
      .post<{ success: boolean; school: SchoolDetail; message: string }>(
        `/superadmin/core/schools/${id}/reactivate`,
        body ?? {},
      )
      .then((r) => r.data.school),

  listCoreUsers: (params?: { page?: number; take?: number; role?: string; q?: string }) =>
    apiClient
      .get<CoreListResponse<CoreUser>>('/superadmin/core/users', { params })
      .then((r) => r.data),

  listCoreStudents: (params?: { page?: number; take?: number; q?: string; schoolId?: number }) =>
    apiClient
      .get<CoreListResponse<CoreStudent>>('/superadmin/core/students', { params })
      .then((r) => r.data),

  listCorePresences: (params?: { page?: number; take?: number; q?: string; schoolId?: number; from?: string; to?: string }) =>
    apiClient
      .get<CoreListResponse<CorePresence>>('/superadmin/core/presences', { params })
      .then((r) => r.data),

  getCoreAuditLogs: (params?: { page?: number; take?: number }) =>
    apiClient
      .get<CoreListResponse<CoreAuditLog>>('/superadmin/core/audit-logs', { params })
      .then((r) => r.data),

  reconcilePayment: (paymentId: number, providerRef?: string) =>
    apiClient
      .post<{ success: boolean; message: string }>(`/superadmin/core/reconcile/${paymentId}`, { providerRef })
      .then((r) => r.data),

  exportAuditCSV: () =>
    apiClient
      .get('/superadmin/core/export-audit', { responseType: 'blob' })
      .then((r) => r.data as Blob),
}
