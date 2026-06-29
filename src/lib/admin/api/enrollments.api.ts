import { apiClient } from '@/lib/api/client'
import {
  normalizeEnrollmentDetail,
  normalizeEnrollmentListItem,
  normalizeSessionEnrollment,
} from '@/lib/admin/normalizers'
import type {
  EnrollmentListItem,
  EnrollmentDetail,
  CreateEnrollmentPayload,
  PaginatedResponse,
  SessionEnrollment,
} from '@/types/admin'

export const enrollmentsApi = {
  list: (params?: { page?: number; limit?: number; search?: string; status?: string }) =>
    apiClient.get<{ success: boolean; data: { data?: unknown[]; meta?: Record<string, unknown> } }>('/admin/enrollments', { params })
      .then((r) => {
        const raw = r.data.data
        const items = (raw?.data ?? []).map((s) => normalizeEnrollmentListItem(s as Record<string, unknown>))
        return {
          data: items,
          total: Number(raw?.meta?.total ?? 0),
          totalPages: Number(raw?.meta?.totalPages ?? 1),
          page: Number(raw?.meta?.page ?? 1),
          limit: Number(raw?.meta?.limit ?? params?.limit ?? 25),
        } satisfies PaginatedResponse<EnrollmentListItem>
      }),

  listByClass: (classId: number) =>
    apiClient.get<{ success: boolean; data: unknown[] }>(`/admin/enrollments/class/${classId}`)
      .then((r) => (r.data.data ?? []).map((s) => normalizeEnrollmentListItem(s as Record<string, unknown>))),

  getDetail: (studentId: number) =>
    apiClient.get<{ success: boolean; data: Record<string, unknown> }>(`/admin/enrollments/${studentId}`)
      .then((r) => normalizeEnrollmentDetail(r.data.data)),

  create: (payload: CreateEnrollmentPayload) => {
    const body = Object.fromEntries(
      Object.entries({
        ...payload,
        feesPaid: payload.feesPaid ?? 0,
      }).filter(([, v]) => v !== undefined && v !== '' && !(typeof v === 'number' && Number.isNaN(v))),
    )
    return apiClient.post<{ success: boolean; data: Record<string, unknown> }>('/admin/enrollments', body)
      .then((r) => normalizeEnrollmentDetail(r.data.data))
  },

  update: (studentId: number, payload: Partial<CreateEnrollmentPayload>) =>
    apiClient.put<{ success: boolean; data: Record<string, unknown> }>(`/admin/enrollments/${studentId}`, payload)
      .then((r) => normalizeEnrollmentDetail(r.data.data)),

  approve: (studentId: number) =>
    apiClient.post<{ success: boolean; data: unknown }>(`/admin/enrollments/${studentId}/approve`)
      .then((r) => r.data),

  finalize: (studentId: number) =>
    apiClient.patch<{ success: boolean; data: unknown }>(`/admin/enrollments/${studentId}/finalize`)
      .then((r) => r.data),

  transfer: (studentId: number, targetSchoolId: number, newClassId?: number) =>
    apiClient.post<{ success: boolean }>(`/admin/enrollments/${studentId}/transfer`, { targetSchoolId, newClassId })
      .then((r) => r.data),

  updateBiometrics: (studentId: number, formData: FormData) =>
    apiClient.put<{ success: boolean }>(`/admin/enrollments/${studentId}/biometrics`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then((r) => r.data),

  toggleLock: (studentId: number) =>
    apiClient.patch<{ success: boolean; data: unknown }>(`/admin/enrollments/${studentId}/toggle-lock`)
      .then((r) => r.data),

  promote: (studentId: number, newClassId: number) =>
    apiClient.patch<{ success: boolean }>(`/admin/enrollments/${studentId}/promote`, { newClassId })
      .then((r) => r.data),

  setReminderPause: (studentId: number, paused: boolean) =>
    apiClient.patch<{ success: boolean }>(`/admin/enrollments/${studentId}/reminder-pause`, { paused })
      .then((r) => r.data),

  purge: (studentId: number, confirmationToken: string) =>
    apiClient.delete<{ success: boolean }>(`/admin/enrollments/${studentId}/purge`, {
      data: { confirmationToken },
    }).then((r) => r.data),

  faceSearch: (imageBase64: string) =>
    apiClient.post<{ success: boolean; data: unknown }>('/admin/enrollments/face-search', { image: imageBase64 })
      .then((r) => r.data.data),

  listSessions: () =>
    apiClient.get<{ success: boolean; data: Array<{ id: number; label: string; isCurrent: boolean; status: string }> }>('/admin/enrollments/sessions')
      .then((r) => r.data.data ?? []),

  enrollInSession: (studentId: number, payload: { sessionId: number; classId?: number; type?: string }) =>
    apiClient.post<{ success: boolean; data: unknown }>(`/admin/enrollments/${studentId}/sessions`, payload)
      .then((r) => r.data.data),

  updateAdministrativeProfile: (studentId: number, payload: Record<string, unknown>) =>
    apiClient.patch<{ success: boolean; data: unknown }>(`/admin/enrollments/${studentId}/admin-profile`, payload)
      .then((r) => r.data.data),
}

export type { SessionEnrollment }
