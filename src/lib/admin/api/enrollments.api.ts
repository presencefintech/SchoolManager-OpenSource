import { apiClient } from '@/lib/api/client'
import {
  normalizeEnrollmentDetail,
  normalizeEnrollmentListItem,
} from '@/lib/admin/normalizers'
import { idempotencyHeaders, newIdempotencyKey } from '@/lib/idempotency'
import type {
  EnrollmentListItem,
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

  create: (payload: CreateEnrollmentPayload & { idempotencyKey?: string }) => {
    const { idempotencyKey, ...payloadRest } = payload
    const body = Object.fromEntries(
      Object.entries({
        ...payloadRest,
        feesPaid: payloadRest.feesPaid ?? 0,
      }).filter(([, v]) => v !== undefined && v !== '' && !(typeof v === 'number' && Number.isNaN(v))),
    )
    const key = idempotencyKey?.trim() || newIdempotencyKey('enroll')
    return apiClient
      .post<{ success: boolean; data: Record<string, unknown>; message?: string }>('/admin/enrollments', body, {
        headers: idempotencyHeaders(key),
        timeout: 30_000,
      })
      .then((r) => {
        const data = r.data.data ?? {}
        const student = (data.student as Record<string, unknown> | undefined) ?? data
        return {
          ...normalizeEnrollmentDetail(student),
          deposit: data.deposit as
            | { paymentId: number; amount: number; currency: string; reference: string | null }
            | undefined,
          depositWarning: data.depositWarning as string | undefined,
          explicitFeePack: data.explicitFeePack as
            | { assigned: number[]; skipped: Array<{ feeStructureId: number; reason: string }> }
            | undefined,
          explicitFeePackPending: data.explicitFeePackPending as boolean | undefined,
          serverMessage: r.data.message,
          idempotencyReplayed: r.headers?.['idempotency-replayed'] === 'true',
        }
      })
  },

  update: (studentId: number, payload: Partial<CreateEnrollmentPayload>) =>
    apiClient.put<{ success: boolean; data: Record<string, unknown> }>(`/admin/enrollments/${studentId}`, payload)
      .then((r) => normalizeEnrollmentDetail(r.data.data)),

  approve: (studentId: number) =>
    apiClient
      .post<{
        success: boolean
        data: {
          matricule?: string
          message?: string
          explicitFeePack?: {
            assigned: number[]
            skipped: Array<{ feeStructureId: number; reason: string }>
          }
        }
        message?: string
      }>(`/admin/enrollments/${studentId}/approve`)
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

  updateFingerprintBiometrics: (studentId: number, payload: { fingerprintVector: number[] }) =>
    apiClient.put<{ success: boolean }>(`/admin/enrollments/${studentId}/biometrics/fingerprint`, payload)
      .then((r) => r.data),

  toggleLock: (studentId: number, isLocked: boolean) =>
    apiClient.patch<{ success: boolean; data: unknown }>(`/admin/enrollments/${studentId}/toggle-lock`, { isLocked })
      .then((r) => r.data),

  promote: (studentId: number, newClassId: number) =>
    apiClient.patch<{ success: boolean }>(`/admin/enrollments/${studentId}/promote`, { newClassId })
      .then((r) => r.data),

  /** `paused: true` → suspend ~30 jours ; `false` → reprendre (until null). */
  setReminderPause: (studentId: number, paused: boolean) => {
    const until = paused
      ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
      : null
    return apiClient
      .patch<{ success: boolean }>(`/admin/enrollments/${studentId}/reminder-pause`, { until })
      .then((r) => r.data)
  },

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

  getFeePreview: (params: {
    classId: number
    sessionId?: number
    studentId?: number
    explicitFeeStructureIds?: number[]
  }) => {
    const { classId, sessionId, studentId, explicitFeeStructureIds } = params
    return apiClient
      .get<{ success: boolean; data: import('@/types/admin').EnrollmentFeePreview }>(
        '/admin/enrollments/fee-preview',
        {
          params: {
            classId,
            ...(sessionId != null ? { sessionId } : {}),
            ...(studentId != null ? { studentId } : {}),
            ...(explicitFeeStructureIds?.length
              ? { explicitFeeStructureIds: explicitFeeStructureIds.join(',') }
              : {}),
          },
        },
      )
      .then((r) => r.data.data)
  },

  getIntakeInbox: (params?: { kind?: string; page?: number; limit?: number }) =>
    apiClient
      .get<{
        success: boolean
        data: {
          items: Array<{
            kind: 'PRE_ENROLLMENT' | 'STUDENT_APPLICATION' | 'PENDING_ENROLLMENT'
            id: number
            status: string
            studentName: string
            className: string | null
            classId: number | null
            createdAt: string
            href: string
          }>
          meta: {
            total: number
            page: number
            limit: number
            totalPages: number
            byKind: Record<string, number>
          }
        }
      }>('/admin/enrollments/inbox', { params })
      .then((r) => r.data.data),

  applyRentreePack: (
    studentId: number,
    payload: {
      sessionId?: number
      classId?: number
      feesPaid?: number
      collectDeposit?: boolean
      paymentNotes?: string
      type?: string
      explicitFeeStructureIds?: number[]
      autoAssignExplicitFees?: boolean
      idempotencyKey?: string
    },
  ) => {
    const { idempotencyKey, ...body } = payload
    const key = idempotencyKey?.trim() || newIdempotencyKey('rentree')
    return apiClient
      .post<{ success: boolean; data: Record<string, unknown>; message?: string }>(
        `/admin/enrollments/${studentId}/rentree-pack`,
        body,
        { headers: idempotencyHeaders(key), timeout: 30_000 },
      )
      .then((r) => ({
        ...(r.data.data ?? {}),
        serverMessage: r.data.message,
        idempotencyReplayed: r.headers?.['idempotency-replayed'] === 'true',
      }))
  },

  enrollInSession: (
    studentId: number,
    payload: {
      sessionId: number
      classId?: number
      type?: string
      autoAssignExplicitFees?: boolean
      explicitFeeStructureIds?: number[]
    },
  ) =>
    apiClient.post<{
      success: boolean
      data: {
        explicitFeePack?: {
          assigned: number[]
          skipped?: Array<{ feeStructureId: number; reason: string }>
        }
      } & Record<string, unknown>
    }>(`/admin/enrollments/${studentId}/sessions`, payload)
      .then((r) => r.data.data),

  updateAdministrativeProfile: (studentId: number, payload: Record<string, unknown>) =>
    apiClient.patch<{ success: boolean; data: unknown }>(`/admin/enrollments/${studentId}/admin-profile`, payload)
      .then((r) => r.data.data),
}

export type { SessionEnrollment }
