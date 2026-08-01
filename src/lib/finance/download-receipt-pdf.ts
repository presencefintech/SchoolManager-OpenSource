import axios from 'axios'
import { apiClient } from '@/lib/api/client'

/** Transforme une réponse blob d’erreur JSON en payload lisible pour getApiErrorMessage. */
export async function normalizeBlobError(error: unknown): Promise<unknown> {
  if (!axios.isAxiosError(error)) return error
  const data = error.response?.data
  if (!(data instanceof Blob)) return error
  try {
    const text = await data.text()
    const json = JSON.parse(text) as Record<string, unknown>
    if (error.response) {
      error.response.data = json
    }
  } catch {
    /* ignore */
  }
  return error
}

async function assertPdfBlob(blob: Blob): Promise<Blob> {
  const type = blob.type || ''
  if (type.includes('application/pdf') || type === 'application/octet-stream' || type === '') {
    // Certains proxys omettent le content-type ; vérifier l’en-tête %PDF
    if (type.includes('json')) {
      const text = await blob.text()
      let message = 'Erreur lors de la génération du reçu'
      try {
        const json = JSON.parse(text) as { message?: string }
        if (typeof json.message === 'string' && json.message) message = json.message
      } catch {
        /* ignore */
      }
      throw new Error(message)
    }
    const head = await blob.slice(0, 5).text()
    if (head.startsWith('%PDF') || type.includes('pdf') || type === 'application/octet-stream') {
      return blob
    }
    if (head.startsWith('{') || head.startsWith('[')) {
      const text = await blob.text()
      let message = 'Erreur lors de la génération du reçu'
      try {
        const json = JSON.parse(text) as { message?: string }
        if (typeof json.message === 'string' && json.message) message = json.message
      } catch {
        /* ignore */
      }
      throw new Error(message)
    }
    return blob
  }
  if (type.includes('json') || type.includes('text')) {
    const text = await blob.text()
    let message = 'Erreur lors de la génération du reçu'
    try {
      const json = JSON.parse(text) as { message?: string }
      if (typeof json.message === 'string' && json.message) message = json.message
    } catch {
      if (text.trim()) message = text.slice(0, 200)
    }
    throw new Error(message)
  }
  return blob
}

export async function downloadFinanceReceiptPdf(
  paymentId: number,
  format: 'A4' | 'Thermal' = 'Thermal',
): Promise<Blob> {
  try {
    const res = await apiClient.get(`/finance/payments/receipts/${paymentId}/download`, {
      params: { format },
      responseType: 'blob',
      timeout: 90_000,
    })
    return await assertPdfBlob(res.data as Blob)
  } catch (err) {
    throw await normalizeBlobError(err)
  }
}
