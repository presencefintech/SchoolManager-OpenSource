import { apiClient } from '@/lib/api/client'
import type { StudentSecurityAction } from '@/types/admin'
import { normalizeStudentListItem, normalizeStudentDetail } from '@/lib/admin/normalizers'
import type {
  StudentStats, StudentListItem, StudentDetail,
  StudentActivity, DossierStatus, Debtor, StudentApplication, PaginatedResponse,
} from '@/types/admin'

export const studentsApi = {
  getMainDashboard: () =>
    apiClient.get<{ success: boolean; data: { stats: StudentStats; liveMonitoring: unknown } }>('/admin/students/dashboard/main')
      .then(r => r.data.data),

  list: (params?: { page?: number; limit?: number; search?: string; classId?: number; status?: string }) =>
    apiClient.get<{ success: boolean; data: PaginatedResponse<Record<string, unknown>> }>('/admin/students', { params })
      .then((r) => {
        const d = r.data.data
        return {
          ...d,
          data: (d?.data ?? []).map((s) => normalizeStudentListItem(s)),
        } as PaginatedResponse<StudentListItem>
      }),

  getDetail: (id: number) =>
    apiClient.get<{ success: boolean; data: Record<string, unknown> }>(`/admin/students/${id}/detail`)
      .then(r => normalizeStudentDetail(r.data.data ?? {})),

  getActivity: (id: number) =>
    apiClient.get<{ success: boolean; data: StudentActivity[] }>(`/admin/students/${id}/activity`)
      .then(r => r.data.data),

  getDossierStatus: (id: number) =>
    apiClient.get<{ success: boolean; data: DossierStatus }>(`/admin/students/${id}/dossier-status`)
      .then(r => r.data.data),

  getDebtors: () =>
    apiClient.get<{ success: boolean; data: Debtor[] }>('/admin/students/reports/debtors')
      .then(r => r.data.data),

  listApplications: (params?: { status?: string; page?: number; limit?: number }) =>
    apiClient.get<{ success: boolean; data: PaginatedResponse<StudentApplication> }>('/admin/students/applications', { params })
      .then(r => r.data.data),

  approveApplication: (id: number) =>
    apiClient.post<{ success: boolean; data: unknown }>(`/admin/students/applications/${id}/approve`)
      .then(r => r.data),

  rejectApplication: (id: number, reason?: string) =>
    apiClient.post<{ success: boolean }>(`/admin/students/applications/${id}/reject`, { reason })
      .then(r => r.data),

  securityAction: (id: number, action: StudentSecurityAction, reason?: string) =>
    apiClient.post<{ success: boolean }>(`/admin/students/${id}/security-action`, { action, reason })
      .then(r => r.data),

  logPiiAccess: (id: number, reason: string) =>
    apiClient.post<{ success: boolean }>(`/admin/students/${id}/log-pii-access`, { reason })
      .then(r => r.data),
}
