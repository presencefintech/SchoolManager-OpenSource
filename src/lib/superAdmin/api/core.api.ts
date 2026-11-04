import axios from 'axios'
import { apiClient } from '@/lib/api/client'
import { readBlobErrorMessage } from '@/lib/download-blob'
import type {
  PlatformStats,
  School,
  SchoolDetail,
  SchoolPrintLog,
  SchoolSaasUpdatePayload,
  SchoolModulesBoard,
  SchoolModulesUpdatePayload,
  CoreUser,
  CoreStudent,
  CorePresence,
  CoreAuditLog,
  CoreListResponse,
} from '@/types/super-admin'

export const coreApi = {
  getStats: () =>
    apiClient
      .get<{ success: boolean; stats: PlatformStats }>('/superadmin/core/stats')
      .then((r) => r.data.stats),

  getDashboardStats: (params?: { days?: number; refresh?: boolean }) =>
    apiClient
      .get<{ success: boolean; data: import('@/types/super-admin').GodModeDashboardStats }>(
        '/superadmin/core/dashboard-stats',
        {
          params: {
            ...(params?.days != null ? { days: params.days } : {}),
            ...(params?.refresh ? { refresh: '1' } : {}),
          },
        },
      )
      .then((r) => r.data.data),

  getSchools: (params?: {
    q?: string
    page?: number
    take?: number
    status?: string
  }) =>
    apiClient
      .get<{ success: boolean; rows: School[]; total: number }>('/superadmin/core/schools', { params })
      .then((r) => ({ rows: r.data.rows, total: r.data.total })),

  getSchool: (id: number) =>
    apiClient
      .get<{ success: boolean; school: SchoolDetail }>(`/superadmin/core/schools/${id}`)
      .then((r) => r.data.school),

  updateSchoolSaas: (id: number, body: SchoolSaasUpdatePayload) =>
    apiClient
      .patch<{ success: boolean; school: SchoolDetail }>(`/superadmin/core/schools/${id}/saas`, body)
      .then((r) => r.data.school),

  getSchoolModules: (id: number) =>
    apiClient
      .get<{ success: boolean; modules: SchoolModulesBoard }>(`/superadmin/core/schools/${id}/modules`)
      .then((r) => r.data.modules),

  updateSchoolModules: (id: number, body: SchoolModulesUpdatePayload) =>
    apiClient
      .patch<{ success: boolean; school: SchoolDetail; message: string }>(
        `/superadmin/core/schools/${id}/modules`,
        body,
      )
      .then((r) => r.data.school),

  getSchoolPrintLogs: (id: number, take = 20) =>
    apiClient
      .get<{ success: boolean; logs: SchoolPrintLog[] }>(`/superadmin/core/schools/${id}/print-logs`, {
        params: { take },
      })
      .then((r) => r.data.logs),

  exportSchoolCardsZip: (id: number) =>
    apiClient
      .get<Blob>(`/superadmin/core/schools/${id}/cards/batch-zip`, {
        responseType: 'blob',
        timeout: 300_000,
      })
      .then(async (r) => {
        const contentType = String(r.headers['content-type'] ?? '')
        if (!contentType.includes('application/zip') && !contentType.includes('application/octet-stream')) {
          throw new Error(await readBlobErrorMessage(r.data))
        }
        return r.data as Blob
      })
      .catch(async (error: unknown) => {
        if (axios.isAxiosError(error) && error.response?.data instanceof Blob) {
          throw new Error(await readBlobErrorMessage(error.response.data))
        }
        if (axios.isAxiosError(error) && error.code === 'ECONNABORTED') {
          throw new Error('Export trop long — réessayez (timeout).')
        }
        throw error
      }),

  suspendSchool: (
    id: number,
    body: { reason: string; code?: 'INSOLVENCY' | 'CONTRACT_BREACH' | 'OTHER' },
  ) =>
    apiClient
      .post<{ success: boolean; school: SchoolDetail; message: string }>(
        `/superadmin/core/schools/${id}/suspend`,
        body,
      )
      .then((r) => r.data.school),

  reactivateSchool: (id: number, body?: { note?: string }) =>
    apiClient
      .post<{ success: boolean; school: SchoolDetail; message: string }>(
        `/superadmin/core/schools/${id}/reactivate`,
        body ?? {},
      )
      .then((r) => r.data.school),

  /** Créer école + inviter admin principal (parcours officiel) */
  onboardSchool: (body: {
    school: {
      name: string
      email?: string | null
      phone?: string | null
      city?: string | null
      address?: string | null
      baseCurrency?: 'USD' | 'CDF'
    }
    admin: {
      email: string
      phone: string
      firstName: string
      lastName: string
    }
    confirmInvite: true
    note?: string | null
    network?: {
      mode: 'none' | 'select' | 'create'
      networkId?: number | null
      name?: string | null
      code?: string | null
      isPaymentHub?: boolean
    } | null
  }) =>
    apiClient
      .post<{
        success: boolean
        message: string
        school: {
          id: number
          uuid: string
          name: string
          email: string | null
          city: string | null
          status: string
        }
        invitation: {
          emailSent?: boolean
          smsSent?: boolean
          emailError?: string | null
          smsError?: string | null
          whatsappDeepLink?: string | null
          whatsappReady?: boolean
          whatsappError?: string | null
          message: string
          admin: {
            id: number | null
            email: string
            firstName: string
            lastName: string
          }
        }
      }>('/superadmin/core/schools/onboard', body, { timeout: 90_000 })
      .then((r) => r.data),

  listCoreUsers: (params?: { page?: number; take?: number; role?: string; q?: string }) =>
    apiClient
      .get<CoreListResponse<CoreUser>>('/superadmin/core/users', { params })
      .then((r) => r.data),

  listCoreStudents: (params?: { page?: number; take?: number; q?: string; schoolId?: number }) =>
    apiClient
      .get<CoreListResponse<CoreStudent>>('/superadmin/core/students', { params })
      .then((r) => r.data),

  listCorePresences: (params?: {
    page?: number
    take?: number
    q?: string
    schoolId?: number
    from?: string
    to?: string
  }) =>
    apiClient
      .get<CoreListResponse<CorePresence>>('/superadmin/core/presences', { params })
      .then((r) => r.data),

  getCoreAuditLogs: (params?: { page?: number; take?: number }) =>
    apiClient
      .get<CoreListResponse<CoreAuditLog>>('/superadmin/core/audit-logs', { params })
      .then((r) => r.data),

  reconcilePayment: (paymentId: number, providerRef?: string) =>
    apiClient
      .post<{ success: boolean; message: string }>(`/superadmin/core/reconcile/${paymentId}`, {
        providerRef,
      })
      .then((r) => r.data),

  exportAuditCSV: () =>
    apiClient.get('/superadmin/core/export-audit', { responseType: 'blob' }).then((r) => r.data as Blob),
}
