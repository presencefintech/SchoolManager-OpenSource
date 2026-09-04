import { apiClient } from '@/lib/api/client'
import { parseContentDispositionFilename, readBlobErrorMessage } from '@/lib/download-blob'

export type ImportType = 'students' | 'parents' | 'structure' | 'fees'

export type ImportJobStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'PARTIAL' | 'FAILED'

export interface ImportJobResult {
  jobId: string
  type: ImportType
  status: ImportJobStatus
  progress: number
  totalRows: number
  imported: number
  failed: number
  errors: { row: number; field: string; message: string }[]
  fileName: string
}

export const importApi = {
  upload: async (
    type: ImportType,
    file: File,
    schoolId?: number,
  ): Promise<{ jobId: string; type: ImportType; totalRows: number; fileName: string }> => {
    const fd = new FormData()
    fd.append('file', file)
    const r = await apiClient.post(`/admin/import/${type}`, fd, {
      params: schoolId ? { schoolId } : undefined,
      timeout: 120_000,
    })
    return r.data.data
  },

  downloadTemplate: async (type: ImportType): Promise<{ blob: Blob; filename: string }> => {
    const res = await apiClient.get(`/admin/import/templates/${type}`, { responseType: 'blob' })
    const ct = String(res.headers['content-type'] ?? '')
    if (ct.includes('application/json') || ct.includes('text/plain')) {
      throw new Error(await readBlobErrorMessage(res.data as Blob))
    }
    const filename = parseContentDispositionFilename(
      res.headers['content-disposition'] as string | undefined,
      `modele-${type}.xlsx`,
    )
    return { blob: res.data as Blob, filename }
  },

  getStatus: (jobId: string): Promise<ImportJobResult> =>
    apiClient.get(`/admin/import/${jobId}`).then((r) => r.data.data),
}
