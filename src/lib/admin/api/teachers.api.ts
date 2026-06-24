import { apiClient } from '@/lib/api/client'
import type { TeacherDashboard, TeacherScanEntry } from '@/types/admin'

export const teachersApi = {
  getDashboard: (teacherId: number) =>
    apiClient.get(`/admin/teachers/support/${teacherId}/dashboard`).then(r => r.data.data as TeacherDashboard),

  getScans: (teacherId: number, params?: { page?: number; limit?: number }) =>
    apiClient.get(`/admin/teachers/support/${teacherId}/scans`, { params }).then(r => (r.data.data ?? []) as TeacherScanEntry[]),

  forceValidatePresence: (presenceId: number, payload: { status: string; reason?: string }) =>
    apiClient.patch(`/admin/teachers/presence/${presenceId}/force-validate`, payload).then(r => r.data.data),

  updateTeacherClasses: (teacherId: number, classIds: number[]) =>
    apiClient.put(`/admin/teachers/management/${teacherId}/classes`, { classIds }).then(r => r.data.data),
}
