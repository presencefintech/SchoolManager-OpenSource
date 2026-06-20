import { apiClient } from '@/lib/api/client'
import type { ActiveSessionItem } from '@/types/super-admin'

export const authApi = {
  getActiveSessions: () =>
    apiClient
      .get<{ success: boolean; data: ActiveSessionItem[] }>('/superadmin/auth/sessions/active')
      .then((r) => r.data.data),
}
