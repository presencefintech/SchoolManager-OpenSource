import { apiClient } from '@/lib/api/client'
import type { FinanceReport } from '@/types/super-admin'

export type ExportPayload = FinanceReport & {
  schoolId: number
  format?: 'excel' | 'pdf' | 'csv'
  period?: { from: string; to: string }
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

const ts = () => new Date().toISOString().slice(0, 10)

export const exportApi = {
  excel: (payload: ExportPayload) =>
    apiClient
      .post('/superadmin/export/excel', payload, { responseType: 'blob', timeout: 60_000 })
      .then((r) => triggerDownload(r.data as Blob, `Rapport_Finance_${ts()}.xlsx`)),

  pdf: (payload: ExportPayload) =>
    apiClient
      .post('/superadmin/export/pdf', payload, { responseType: 'blob', timeout: 60_000 })
      .then((r) => triggerDownload(r.data as Blob, `Rapport_Finance_${ts()}.pdf`)),

  csv: (payload: ExportPayload) =>
    apiClient
      .post('/superadmin/export/csv', payload, { responseType: 'blob', timeout: 60_000 })
      .then((r) => triggerDownload(r.data as Blob, `Rapport_Finance_${ts()}.csv`)),

  secured: (payload: ExportPayload) =>
    apiClient
      .post('/superadmin/export/secured', { ...payload, format: payload.format ?? 'excel' }, { responseType: 'blob', timeout: 60_000 })
      .then((r) => triggerDownload(r.data as Blob, `ANNEXE_SECURE_${ts()}.${payload.format ?? 'xlsx'}`)),
}
