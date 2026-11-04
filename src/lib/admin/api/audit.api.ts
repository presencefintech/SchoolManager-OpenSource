import { apiClient } from '@/lib/api/client'

export type AcademicAuditIntegrityStatus = 'VALID' | 'INVALID' | 'UNSIGNED'

/** Alias UI + codes natifs AcademicAuditLog.action */
export type AcademicAuditEventType =
  | 'GRADE_MODIFIED'
  | 'DELIBERATION_VALIDATED'
  | 'LESSON_PLAN_APPROVED'
  | 'BULLETIN_GENERATED'
  | string

export type AcademicAuditActor = {
  id: number | null
  fullName: string
  role: string | null
  email: string | null
}

export type AcademicAuditTarget = {
  label: string
  classId: number | null
  studentId: number | null
  subject: string | null
}

export type AcademicAuditLogItem = {
  id: string
  schoolId: number | null
  userId: number | null
  action: string
  entity: string
  entityId: string | null
  previousData: unknown
  newData: unknown
  changeSummary: string
  target: AcademicAuditTarget
  actor: AcademicAuditActor
  ipAddress: string | null
  correlationId: string | null
  integrityHash: string | null
  integrityToken: string | null
  integrityStatus: AcademicAuditIntegrityStatus
  createdAt: string
}

export type AcademicAuditListParams = {
  eventType?: AcademicAuditEventType
  action?: string
  entity?: string
  studentId?: number
  classId?: number
  userId?: number
  actorId?: number
  academicYear?: string
  from?: string
  to?: string
  page?: number
  limit?: number
  schoolId?: number
}

export type AcademicAuditListResult = {
  items: AcademicAuditLogItem[]
  total: number
  page: number
  limit: number
  pageCount: number
}

function unwrap<T>(payload: unknown): T {
  const body = payload as { data?: T }
  return (body?.data ?? payload) as T
}

export const EVENT_TYPE_LABELS: Record<string, string> = {
  GRADE_MODIFIED: 'Note modifiée',
  GRADE_UPDATE: 'Note modifiée',
  DELIBERATION_VALIDATED: 'Délibération validée',
  DELIBERATE_VALIDATE: 'Délibération validée',
  DELIBERATE_BATCH: 'Délibération (lot)',
  LESSON_PLAN_APPROVED: 'Fiche approuvée',
  LESSON_PLAN_REJECTED: 'Fiche à revoir',
  BULLETIN_GENERATED: 'Bulletin généré',
  BULLETIN_GENERATE: 'Bulletin généré',
  BULLETIN_BATCH_ENQUEUED: 'Bulletins enfilés',
  BULLETIN_BATCH_COMPLETED: 'Bulletins terminés',
  BULLETIN_BATCH_FAILED: 'Bulletins échoués',
  CERTIFICATE_ISSUE: 'Certificat émis',
  ORIENTATION_COMPUTE: 'Orientation calculée',
  RBAC_DENIED: 'Accès refusé (RBAC)',
}

export const FILTER_EVENT_TYPES: Array<{ value: AcademicAuditEventType; label: string }> = [
  { value: 'GRADE_MODIFIED', label: 'Note modifiée' },
  { value: 'DELIBERATION_VALIDATED', label: 'Délibération validée' },
  { value: 'LESSON_PLAN_APPROVED', label: 'Fiche de préparation approuvée' },
  { value: 'BULLETIN_GENERATED', label: 'Bulletin généré' },
]

export const adminAcademicAuditApi = {
  list: (params?: AcademicAuditListParams) =>
    apiClient.get('/admin/academic-audit', { params }).then((r) => {
      const data = unwrap<Partial<AcademicAuditListResult>>(r.data)
      return {
        items: data.items ?? [],
        total: data.total ?? 0,
        page: data.page ?? 1,
        limit: data.limit ?? 50,
        pageCount: data.pageCount ?? 1,
      } satisfies AcademicAuditListResult
    }),

  /** Export CSV (blob) — même filtres que list. */
  exportCsv: async (params?: AcademicAuditListParams) => {
    const response = await apiClient.get('/admin/academic-audit', {
      params: { ...params, format: 'csv', limit: params?.limit ?? 200, page: 1 },
      responseType: 'blob',
    })
    return response.data as Blob
  },
}
