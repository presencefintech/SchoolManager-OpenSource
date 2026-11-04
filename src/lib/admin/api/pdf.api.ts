import { downloadReceiptPdf } from '@/lib/finance/download-receipt-pdf'

export const adminPdfApi = {
  getReceipt: (paymentId: number, format: 'A4' | 'Thermal' = 'A4') =>
    downloadReceiptPdf(`/admin/pdf/receipts/${paymentId}`, format),
}
