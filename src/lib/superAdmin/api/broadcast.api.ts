import { apiClient } from '@/lib/api/client'

export type BroadcastTargetType = 'ALL_SCHOOLS' | 'ACTIVE_ONLY'

export type PlatformBroadcast = {
  id: number
  title: string
  content: string
  targetType: BroadcastTargetType
  createdAt: string
  createdBy?: { id: number; name: string | null } | null
  readCount?: number
}

export const broadcastApi = {
  list: (take = 30) =>
    apiClient
      .get<{ success: boolean; rows: PlatformBroadcast[] }>('/superadmin/broadcast', {
        params: { take },
      })
      .then((r) => r.data.rows),

  create: (body: { title: string; content: string; targetType?: BroadcastTargetType }) =>
    apiClient
      .post<{ success: boolean; broadcast: PlatformBroadcast; message: string }>(
        '/superadmin/broadcast',
        body,
      )
      .then((r) => r.data),
}

export const adminBroadcastApi = {
  unread: () =>
    apiClient
      .get<{ success: boolean; rows?: PlatformBroadcast[] }>('/admin/platform-broadcasts/unread')
      // Réponse inattendue → aucune bannière plutôt qu'un crash de tout l'espace admin
      .then((r) => (Array.isArray(r.data.rows) ? r.data.rows : [])),

  markRead: (id: number) =>
    apiClient
      .post<{ success: boolean }>(`/admin/platform-broadcasts/${id}/read`)
      .then((r) => r.data),
}
