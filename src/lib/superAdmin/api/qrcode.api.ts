import { apiClient } from '@/lib/api/client'
import type { QRTestResult, QRSupportResult } from '@/types/super-admin'

export const qrcodeApi = {
  test: (qrPayload: string) =>
    apiClient
      .post<{ success: boolean; data: QRTestResult }>('/superadmin/qrcode/test', { qrPayload })
      .then((r) => r.data.data),

  generateSupport: (studentId: number) =>
    apiClient
      .post<{ success: boolean; data: QRSupportResult }>('/superadmin/qrcode/generate-support', { studentId })
      .then((r) => r.data.data),
}
