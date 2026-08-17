import { apiClient } from '@/lib/api/client'
import { getAuthSchoolId } from '@/lib/api/auth-storage'

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

/**
 * Upload via fetch natif — cookies HttpOnly (credentials) ; pas de Bearer factice.
 */
export const importApi = {
  upload: async (
    type: ImportType,
    file: File,
    schoolId?: number,
  ): Promise<{ jobId: string; type: ImportType; totalRows: number; fileName: string }> => {
    const fd = new FormData()
    fd.append('file', file)

    const headers: Record<string, string> = {}
    const storageSchoolId = getAuthSchoolId()
    if (storageSchoolId) headers['x-school-id'] = storageSchoolId

    const url = schoolId
      ? `/api/v1/admin/import/${type}?schoolId=${schoolId}`
      : `/api/v1/admin/import/${type}`

    const res = await fetch(url, {
      method: 'POST',
      headers,
      body: fd,
      credentials: 'include',
    })

    if (!res.ok) {
      let msg = `Erreur ${res.status}`
      try {
        const json = await res.json()
        msg = json?.message ?? json?.error ?? msg
      } catch {
        /* ignore */
      }
      throw new Error(msg)
    }

    const json = await res.json()
    return json.data
  },

  getStatus: (jobId: string): Promise<ImportJobResult> =>
    apiClient.get(`/admin/import/${jobId}`).then((r) => r.data.data),
}
