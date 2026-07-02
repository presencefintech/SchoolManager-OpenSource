import { apiClient } from '@/lib/api/client'

export const emailsApi = {
  broadcast: (payload: { subject: string; body: string; schoolIds?: number[] }) =>
    apiClient
      .post<{ success: boolean; message: string }>('/superadmin/emails/broadcast', payload)
      .then((r) => r.data),
}
