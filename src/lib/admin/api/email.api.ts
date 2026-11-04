import { apiClient } from '@/lib/api/client'

export const adminEmailApi = {
  sendTemplate: (payload: {
    to: string
    subject: string
    templateName: string
    templateData?: Record<string, unknown>
    category?: 'TRANSACTIONAL' | 'SYSTEM' | 'SECURITY' | 'MARKETING'
    schoolId: number
    userId?: number
  }) =>
    apiClient
      .post<{ success: boolean; data: unknown }>('/emails/send-template', payload)
      .then((r) => r.data.data),
}
