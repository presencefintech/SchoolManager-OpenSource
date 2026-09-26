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
}
