import { apiClient } from '@/lib/api/client'
import type { ClassListItem, ClassDetail, ClassStats, ClassAuditEntry, CreateClassPayload, RolloverPayload } from '@/types/admin'

// Note: ClassController utilise res.json(result) directement (sans ApiResponse wrapper).
// Seuls create/update wrappent dans { status, data }.
export const classesApi = {
  list: (params?: { search?: string; isActive?: boolean }) =>
    apiClient.get('/admin/classes', { params }).then(r => {
      const d = r.data
      return (Array.isArray(d) ? d : d?.data ?? d?.classes ?? []) as ClassListItem[]
    }),

  create: (payload: CreateClassPayload) =>
    apiClient.post('/admin/classes', payload).then(r => (r.data?.data ?? r.data) as ClassDetail),

  getById: (id: number) =>
    apiClient.get(`/admin/classes/${id}`).then(r => (r.data?.data ?? r.data) as ClassDetail),

  update: (id: number, payload: Partial<CreateClassPayload>) =>
    apiClient.put(`/admin/classes/${id}`, payload).then(r => (r.data?.data ?? r.data) as ClassDetail),

  toggleStatus: (id: number) =>
    apiClient.patch(`/admin/classes/${id}/status`).then(r => r.data?.data ?? r.data),

  assignStudents: (id: number, studentIds: number[]) =>
    apiClient.post(`/admin/classes/${id}/assign-students`, { studentIds }).then(r => r.data?.data ?? r.data),

  transfer: (id: number, payload: { studentIds: number[]; targetClassId: number }) =>
    apiClient.post(`/admin/classes/${id}/transfer`, payload).then(r => r.data?.data ?? r.data),

  getStats: (id: number) =>
    apiClient.get(`/admin/classes/${id}/stats`).then(r => {
      const d = r.data?.data ?? r.data
      // Le backend retourne { class, metrics, financial }
      const metrics = d?.metrics ?? {}
      const financial = d?.financial?.metrics ?? {}
      return {
        studentCount: financial.studentCount ?? metrics.studentCount ?? 0,
        attendanceRate: metrics.attendanceCount ?? 0,
        presentToday: metrics.attendanceCount ?? undefined,
        totalPaid: financial.totalPaid ?? metrics.totalPaid ?? 0,
        totalDue: financial.totalDebt ?? metrics.totalDebt ?? 0,
        balance: (financial.totalPaid ?? 0) - (financial.totalDebt ?? 0),
      } as ClassStats
    }),

  exportClass: (id: number) =>
    apiClient.get(`/admin/classes/${id}/export`, { responseType: 'blob' }).then(r => r.data),

  getAudit: (id: number) =>
    apiClient.get(`/admin/classes/${id}/audit`).then(r => {
      const d = r.data
      return (Array.isArray(d) ? d : d?.data ?? []) as ClassAuditEntry[]
    }),

  rollover: (payload: RolloverPayload) =>
    apiClient.post('/admin/classes/rollover', payload).then(r => r.data?.data ?? r.data),

  getConflicts: (teacherId: number) =>
    apiClient.get(`/admin/classes/conflicts/${teacherId}`).then(r => {
      const d = r.data
      return Array.isArray(d) ? d : d?.data ?? []
    }),
}
