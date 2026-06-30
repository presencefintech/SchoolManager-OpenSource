import { apiClient } from '@/lib/api/client'

export const adminEmailApi = {
  sendTemplate: (payload: {
    templateId: string
    recipientIds: number[]
    variables?: Record<string, string>
    subject?: string
  }) =>
    apiClient
      .post<{ success: boolean; data: { sent: number; failed: number } }>('/emails/send-template', payload)
      .then((r) => r.data.data),
}
