import { apiClient } from '@/lib/api/client'

export const pdfApi = {
  getPaymentReceipt: (paymentId: number) =>
    apiClient
      .get<Blob>(`/superadmin/pdf/receipts/${paymentId}`, { responseType: 'blob' })
      .then((r) => r.data),

  getGlobalAuditPdf: () =>
    apiClient
      .get<Blob>('/superadmin/pdf/audit/global', { responseType: 'blob' })
      .then((r) => r.data),
}
