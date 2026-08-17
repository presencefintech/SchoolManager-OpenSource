import { apiClient } from '@/lib/api/client'

export type AuditLogRow = {
  id: number
  action: string
  resource: string
  resourceId: number | null
  severity: string
  description: string | null
  payload: unknown
  createdAt: string
  schoolId: number
  actorId: number | null
  actor?: {
    id: number
    firstName: string | null
    lastName: string | null
    email: string | null
    role?: string
  } | null
  school?: { id: number; name: string } | null
}

export type AuditLogsParams = {
  page?: number
  take?: number
  schoolId?: number
  action?: string
  severity?: string
  from?: string
  to?: string
  q?: string
  securityOnly?: boolean
  tab?: 'all' | 'security'
}

export const auditLogsApi = {
  list: (params?: AuditLogsParams) =>
    apiClient
      .get<{ success: boolean; rows: AuditLogRow[]; total: number; page: number; take: number }>(
        '/superadmin/core/audit-logs',
        {
          params: {
            ...params,
            securityOnly: params?.securityOnly ? '1' : undefined,
          },
        },
      )
      .then((r) => r.data),
}
