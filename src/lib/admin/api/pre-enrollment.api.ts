import { apiClient } from '@/lib/api/client'
import type {
  CreatePreEnrollmentPayload,
  PreEnrollmentListResponse,
  PreEnrollmentRecord,
  PreEnrollmentStatus,
  SchoolClassRef,
  SchoolOptionRef,
  SchoolSectionRef,
} from '@/types/pre-enrollment'

function normalizePreEnrollment(raw: unknown): PreEnrollmentRecord | null {
  if (!raw || typeof raw !== 'object') return null
  const row = raw as Record<string, unknown>
  const id = Number(row.id)
  if (!Number.isFinite(id) || id <= 0) return null

  return {
    id,
    studentInfo: (row.studentInfo ?? {}) as PreEnrollmentRecord['studentInfo'],
    schoolId: Number(row.schoolId ?? 0),
    classroomId: row.classroomId != null ? Number(row.classroomId) : row.classId != null ? Number(row.classId) : null,
    status: String(row.status ?? 'PENDING') as PreEnrollmentStatus,
    comment: (row.comment as string | null) ?? null,
    academicChoices: (row.academicChoices ?? {}) as PreEnrollmentRecord['academicChoices'],
    createdAt: String(row.createdAt ?? ''),
    updatedAt: String(row.updatedAt ?? ''),
    processedAt: (row.processedAt as string | null) ?? null,
    processedById: row.processedById != null ? Number(row.processedById) : null,
    school: row.school as PreEnrollmentRecord['school'],
    class: (row.class as PreEnrollmentRecord['class']) ?? null,
  }
}

function normalizeList(raw: unknown): PreEnrollmentListResponse {
  if (!raw || typeof raw !== 'object') {
    return { data: [], meta: { total: 0, page: 1, limit: 25, totalPages: 1 } }
  }
  const row = raw as Record<string, unknown>
  const meta = (row.meta ?? {}) as Record<string, unknown>
  const items = Array.isArray(row.data) ? row.data : []
  return {
    data: items
      .map(normalizePreEnrollment)
      .filter((item): item is PreEnrollmentRecord => item != null),
    meta: {
      total: Number(meta.total ?? items.length),
      page: Number(meta.page ?? 1),
      limit: Number(meta.limit ?? 25),
      totalPages: Number(meta.totalPages ?? 1),
    },
  }
}

export const preEnrollmentApi = {
  list: (params?: { status?: string; page?: number; limit?: number; schoolId?: number }) =>
    apiClient
      .get('/pre-enrollments', { params })
      .then((r) => normalizeList(r.data.data)),

  create: (payload: CreatePreEnrollmentPayload) =>
    apiClient
      .post('/pre-enrollments', payload)
      .then((r) => normalizePreEnrollment(r.data.data) as PreEnrollmentRecord),

  getStatus: (id: number) =>
    apiClient
      .get(`/pre-enrollments/${id}/status`)
      .then((r) => r.data.data as { id: number; status: PreEnrollmentStatus; comment: string | null }),

  updateStatus: (id: number, payload: { status: PreEnrollmentStatus; comment?: string }) =>
    apiClient
      .patch(`/pre-enrollments/${id}/status`, payload)
      .then((r) => normalizePreEnrollment(r.data.data) as PreEnrollmentRecord),
}

export const schoolAcademicApi = {
  listSections: (schoolId?: number) =>
    apiClient
      .get('/school/sections', { params: schoolId ? { schoolId } : undefined })
      .then((r) => (Array.isArray(r.data.data) ? r.data.data : []) as SchoolSectionRef[]),

  listOptions: (sectionId: number, schoolId?: number) =>
    apiClient
      .get('/school/options', { params: { sectionId, ...(schoolId ? { schoolId } : {}) } })
      .then((r) => (Array.isArray(r.data.data) ? r.data.data : []) as SchoolOptionRef[]),

  listClasses: (sectionId: number, optionId: number, academicYear?: string, schoolId?: number) =>
    apiClient
      .get('/school/classes', {
        params: {
          sectionId,
          optionId,
          ...(academicYear ? { academicYear } : {}),
          ...(schoolId ? { schoolId } : {}),
        },
      })
      .then((r) => (Array.isArray(r.data.data) ? r.data.data : []) as SchoolClassRef[]),
}
