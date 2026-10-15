import { apiClient } from '@/lib/api/client'
import type { StudentSecurityAction } from '@/types/admin'
import { normalizeStudentListItem, normalizeStudentDetail, normalizeStudentStats } from '@/lib/admin/normalizers'
import type {
  StudentListItem,
  StudentActivity, DossierStatus, Debtor, StudentApplication, PaginatedResponse,
} from '@/types/admin'

function normalizeDossierStatus(raw: Record<string, unknown>): DossierStatus {
  const checks = (raw.checks && typeof raw.checks === 'object' ? raw.checks : {}) as Record<string, unknown>
  const rate = Number(raw.completionRate ?? 0)
  return {
    studentId: Number(raw.studentId ?? 0),
    hasPhoto: Boolean(raw.hasPhoto ?? checks.photo),
    hasBiometrics: Boolean(raw.hasBiometrics ?? checks.biometrics),
    hasParentContact: Boolean(raw.hasParentContact ?? checks.parent),
    isFinanciallyCleared: Boolean(raw.isFinanciallyCleared ?? checks.payment),
    matricule: typeof raw.matricule === 'string' ? raw.matricule : undefined,
    completionRate: Number.isFinite(rate) ? Math.round(rate <= 1 && rate > 0 ? rate * 100 : rate) : 0,
  }
}

export const studentsApi = {
  getMainDashboard: () =>
    apiClient
      .get<{ success: boolean; data: { stats: Record<string, unknown>; liveMonitoring: unknown } }>(
        '/admin/students/dashboard/main',
      )
      .then((r) => {
        const payload = r.data.data ?? { stats: {}, liveMonitoring: null }
        return {
          stats: normalizeStudentStats((payload.stats ?? {}) as Record<string, unknown>),
          liveMonitoring: payload.liveMonitoring,
        }
      }),

  list: (params?: { page?: number; limit?: number; search?: string; classId?: number; status?: string }) =>
    apiClient.get<{ success: boolean; data: unknown }>('/admin/students', { params })
      .then((r) => {
        const d = r.data.data
        let rows: Record<string, unknown>[] = []
        let total = 0
        let page = 1
        let limit = 20
        let totalPages = 1

        if (Array.isArray(d)) {
          rows = d as Record<string, unknown>[]
          total = rows.length
          limit = rows.length
        } else if (d && typeof d === 'object') {
          const meta = d as Record<string, unknown>
          const rawRows = meta.data ?? meta.items
          rows = Array.isArray(rawRows) ? (rawRows as Record<string, unknown>[]) : []
          total = Number(meta.total ?? rows.length)
          page = Number(meta.page ?? 1)
          limit = Number(meta.limit ?? rows.length)
          totalPages = Number(meta.totalPages ?? meta.lastPage ?? 1)
        }

        return {
          data: rows.map((s) => normalizeStudentListItem(s)),
          total,
          page,
          limit,
          totalPages,
        } satisfies PaginatedResponse<StudentListItem>
      }),

  getDetail: (id: number) =>
    apiClient.get<{ success: boolean; data: Record<string, unknown> }>(`/admin/students/${id}/detail`)
      .then(r => normalizeStudentDetail(r.data.data ?? {})),

  getActivity: (id: number) =>
    apiClient.get<{ success: boolean; data: StudentActivity[] }>(`/admin/students/${id}/activity`)
      .then(r => r.data.data),

  getDossierStatus: (id: number) =>
    apiClient.get<{ success: boolean; data: Record<string, unknown> }>(`/admin/students/${id}/dossier-status`)
      .then(r => normalizeDossierStatus(r.data.data ?? {})),

  getDebtors: () =>
    apiClient.get<{ success: boolean; data: unknown }>('/admin/students/reports/debtors')
      .then((r) => {
        const raw = r.data.data
        const rows = Array.isArray(raw) ? raw : []
        return rows.map((row) => {
          const d = (row && typeof row === 'object' ? row : {}) as Record<string, unknown>
          const totalDue = Number(d.totalDue ?? d.totalFees ?? 0)
          const totalPaid = Number(d.totalPaid ?? d.feesPaid ?? 0)
          const balance = Number(
            d.balance ?? d.feesBalance ?? d.tuitionBalance ?? Math.max(0, totalDue - totalPaid),
          )
          const classObj =
            d.class && typeof d.class === 'object'
              ? (d.class as Record<string, unknown>)
              : null
          return {
            studentId: Number(d.studentId ?? d.id) || 0,
            firstName: typeof d.firstName === 'string' ? d.firstName : '',
            lastName: typeof d.lastName === 'string' ? d.lastName : '',
            className:
              typeof d.className === 'string'
                ? d.className
                : typeof classObj?.name === 'string'
                  ? classObj.name
                  : undefined,
            totalDue: Number.isFinite(totalDue) ? totalDue : 0,
            totalPaid: Number.isFinite(totalPaid) ? totalPaid : 0,
            balance: Number.isFinite(balance) ? balance : 0,
            lastPaymentDate:
              typeof d.lastPaymentDate === 'string' ? d.lastPaymentDate : undefined,
          } satisfies Debtor
        }).filter((d) => d.studentId > 0)
      }),

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

  /** Archive un élève (suppression logique, restaurable depuis la corbeille). */
  archive: (id: number) =>
    apiClient.delete<{ success: boolean }>(`/admin/students/${id}`).then(r => r.data),

  restore: (id: number) =>
    apiClient.post<{ success: boolean }>(`/admin/students/${id}/restore`).then(r => r.data),

  listArchived: (params?: { page?: number; limit?: number }) =>
    apiClient
      .get<{ success: boolean; data: { items: ArchivedStudent[]; meta: { total: number; page: number; limit: number; totalPages: number } } }>(
        '/admin/students/archived',
        { params },
      )
      .then(r => r.data.data),

  findDuplicates: (threshold?: number) =>
    apiClient
      .get<{ success: boolean; data: DuplicateScan }>('/admin/students/duplicates', {
        params: threshold ? { threshold } : undefined,
      })
      .then(r => r.data.data),

  previewMerge: (targetId: number, sourceId: number) =>
    apiClient
      .get<{ success: boolean; data: MergePreview }>('/admin/students/merge/preview', {
        params: { targetId, sourceId },
      })
      .then(r => r.data.data),

  merge: (targetId: number, sourceId: number) =>
    apiClient
      .post<{ success: boolean; data: MergeResult }>('/admin/students/merge', { targetId, sourceId }, { timeout: 60_000 })
      .then(r => r.data.data),

  logPiiAccess: (id: number, reason: string) =>
    apiClient.post<{ success: boolean }>(`/admin/students/${id}/log-pii-access`, { reason })
      .then(r => r.data),

  listIncompleteDossiers: (params?: { page?: number; limit?: number; gap?: string }) =>
    apiClient
      .get<{
        success: boolean
        data: {
          page: number
          limit: number
          total: number
          totalPages: number
          counts: {
            photo: number
            parent: number
            birthCertificate: number
            emergency: number
            class: number
            pickup: number
          }
          items: Array<{
            id: number
            matricule: string
            name: string
            className: string | null
            missing: string[]
            missingLabels: string[]
          }>
        }
      }>('/admin/students/desk/incomplete', { params })
      .then((r) => r.data.data),

  listGuardians: (studentId: number) =>
    apiClient
      .get<{ success: boolean; data: StudentGuardian[] }>(`/admin/students/${studentId}/guardians`)
      .then((r) => (r.data.data ?? []) as StudentGuardian[]),

  upsertGuardian: (
    studentId: number,
    body: {
      firstName: string
      lastName: string
      phone: string
      relationship?: string
      isPrimary?: boolean
      notifyEnabled?: boolean
      hasSmartphone?: boolean
      preferredChannel?: string
      email?: string
    },
  ) =>
    apiClient
      .post<{ success: boolean; data: StudentGuardian }>(`/admin/students/${studentId}/guardians`, body)
      .then((r) => r.data.data as StudentGuardian),

  /** Transfert / réaffectation de classe (même école). */
  transferClass: (
    studentId: number,
    body: { newClassId: number; mode?: 'TRANSFER' | 'CORRECTION'; reason?: string },
  ) =>
    apiClient
      .patch<{
        success: boolean
        data: {
          id: number
          classId: number | null
          previousClassId?: number | null
          newClassId: number
          mode: string
        }
        message?: string
      }>(`/admin/students/${studentId}/transfer`, body)
      .then((r) => r.data),

  /**
   * POST /admin/students/batch-photos
   * Images et/ou ZIP nommés `{numeroCourt}.jpg` / `{matricule}.jpg`.
   */
  batchPhotos: (files: File[], options?: { enrollBiometrics?: boolean }) => {
    const fd = new FormData()
    for (const file of files) {
      fd.append('photos', file)
    }
    fd.append('enrollBiometrics', options?.enrollBiometrics === false ? 'false' : 'true')
    return apiClient
      .post<{ success: boolean; data: BatchPhotosResult; message?: string }>(
        '/admin/students/batch-photos',
        fd,
        {
          timeout: 180_000,
          transformRequest: [
            (data: unknown, headers: Record<string, unknown>) => {
              if (typeof FormData !== 'undefined' && data instanceof FormData) {
                delete headers['Content-Type']
              }
              return data
            },
          ],
        },
      )
      .then((r) => r.data.data)
  },
}

export type BatchPhotoMatchKind = 'numeroCourt' | 'matricule'

export type BatchPhotoBiometricStatus = 'READY' | 'SKIPPED' | 'FAILED' | 'UNAVAILABLE'

export type BatchPhotoFileResult = {
  fileName: string
  status: 'matched' | 'unmatched' | 'failed'
  matchKind?: BatchPhotoMatchKind
  matchKey?: string
  studentId?: number
  studentName?: string
  photoUrl?: string
  reason?: string
  biometricStatus?: BatchPhotoBiometricStatus
  biometricReason?: string
}

export type BatchPhotosResult = {
  matchedCount: number
  failedCount: number
  unmatchedCount: number
  processedCount: number
  biometricEnrolledCount?: number
  unmatchedFiles: string[]
  results: BatchPhotoFileResult[]
}

export type StudentGuardian = {
  id?: number
  firstName: string
  lastName: string
  phone: string
  relationship?: string | null
  isPrimary?: boolean
  notifyEnabled?: boolean
  email?: string | null
}

export interface DuplicateCandidate {
  id: number
  matricule: string
  lastName: string
  postnom: string | null
  firstName: string
  gender: string | null
  dateOfBirth: string | null
  classId: number | null
  emergencyContactPhone: string | null
  status: string
  createdAt: string
  class?: { name: string } | null
}

export interface DuplicatePair {
  score: number
  reason: 'EXACT_NAME' | 'SIMILAR_NAME' | 'SAME_PHONE_AND_BIRTH'
  a: DuplicateCandidate
  b: DuplicateCandidate
}

export interface DuplicateScan {
  pairs: DuplicatePair[]
  scanned: number
  threshold: number
}

export interface MergePreview {
  target: DuplicateCandidate
  source: DuplicateCandidate
  /** Nombre de lignes rattachées à la fiche secondaire, par table. */
  willMove: Record<string, number>
}

export interface MergeResult {
  targetId: number
  sourceId: number
  summary: Record<string, { moved: number; skippedConflicts: number }>
}

export interface ArchivedStudent {
  id: number
  matricule: string
  lastName: string
  postnom: string | null
  firstName: string
  gender: string | null
  dateOfBirth: string | null
  classId: number | null
  class?: { name: string } | null
  deletedAt: string
}
