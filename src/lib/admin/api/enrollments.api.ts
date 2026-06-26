import { apiClient } from '@/lib/api/client'
import type { EnrollmentListItem, EnrollmentDetail, CreateEnrollmentPayload, PaginatedResponse } from '@/types/admin'

export const enrollmentsApi = {
  list: (params?: { page?: number; limit?: number; search?: string }) =>
    apiClient.get<{ success: boolean; data: any }>('/admin/enrollments', { params })
      .then(r => {
        const raw = r.data.data
        const items = (raw?.data ?? []).map((s: any) => ({
          ...s,
          className: s.class?.name ?? s.className,
        }))
        return {
          data: items,
          total: raw?.meta?.total ?? raw?.total ?? 0,
          totalPages: raw?.meta?.totalPages ?? raw?.totalPages ?? 1,
          page: raw?.meta?.page ?? raw?.page ?? 1,
        }
      }),

  listByClass: (classId: number) =>
    apiClient.get<{ success: boolean; data: EnrollmentListItem[] }>(`/admin/enrollments/class/${classId}`)
      .then(r => r.data.data),

  getDetail: (studentId: number) =>
    apiClient.get<{ success: boolean; data: EnrollmentDetail }>(`/admin/enrollments/${studentId}`)
      .then(r => r.data.data),

  create: (payload: CreateEnrollmentPayload) =>
    apiClient.post<{ success: boolean; data: EnrollmentDetail }>('/admin/enrollments', payload)
      .then(r => r.data.data),

  update: (studentId: number, payload: Partial<CreateEnrollmentPayload>) =>
    apiClient.put<{ success: boolean; data: EnrollmentDetail }>(`/admin/enrollments/${studentId}`, payload)
      .then(r => r.data.data),

  approve: (studentId: number) =>
    apiClient.post<{ success: boolean; data: unknown }>(`/admin/enrollments/${studentId}/approve`)
      .then(r => r.data),

  finalize: (studentId: number) =>
    apiClient.patch<{ success: boolean; data: unknown }>(`/admin/enrollments/${studentId}/finalize`)
      .then(r => r.data),

  transfer: (studentId: number, targetSchoolId: number, newClassId?: number) =>
    apiClient.post<{ success: boolean }>(`/admin/enrollments/${studentId}/transfer`, { targetSchoolId, newClassId })
      .then(r => r.data),

  updateBiometrics: (studentId: number, formData: FormData) =>
    apiClient.put<{ success: boolean }>(`/admin/enrollments/${studentId}/biometrics`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then(r => r.data),

  toggleLock: (studentId: number) =>
    apiClient.patch<{ success: boolean; data: unknown }>(`/admin/enrollments/${studentId}/toggle-lock`)
      .then(r => r.data),

  promote: (studentId: number, newClassId: number) =>
    apiClient.patch<{ success: boolean }>(`/admin/enrollments/${studentId}/promote`, { newClassId })
      .then(r => r.data),

  setReminderPause: (studentId: number, paused: boolean) =>
    apiClient.patch<{ success: boolean }>(`/admin/enrollments/${studentId}/reminder-pause`, { paused })
      .then(r => r.data),

  purge: (studentId: number, confirmationToken: string) =>
    apiClient.delete<{ success: boolean }>(`/admin/enrollments/${studentId}/purge`, {
      data: { confirmationToken },
    }).then(r => r.data),

  faceSearch: (imageBase64: string) =>
    apiClient.post<{ success: boolean; data: unknown }>('/admin/enrollments/face-search', { image: imageBase64 })
      .then(r => r.data.data),
}
