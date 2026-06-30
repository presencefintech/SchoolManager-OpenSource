import { apiClient } from '@/lib/api/client'

export const adminPdfApi = {
  getReceipt: async (paymentId: number, format: 'A4' | 'THERMAL' = 'A4') => {
    const res = await apiClient.get(`/admin/pdf/receipts/${paymentId}`, {
      params: { format },
      responseType: 'blob',
    })
    return res.data as Blob
  },
}
