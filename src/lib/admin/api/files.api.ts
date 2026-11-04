import { apiClient } from '@/lib/api/client'
import { getAuthSchoolId } from '@/lib/api/auth-storage'

const UPLOAD_TIMEOUT_MS = 60_000

/** Axios met `application/json` par défaut — à retirer pour FormData (boundary auto). */
function multipartConfig() {
  return {
    timeout: UPLOAD_TIMEOUT_MS,
    transformRequest: [
      (data: unknown, headers: Record<string, unknown>) => {
        if (typeof FormData !== 'undefined' && data instanceof FormData) {
          delete headers['Content-Type']
        }
        return data
      },
    ],
  }
}

export const adminFilesApi = {
  upload: (file: File, metadata?: { folder?: string; studentId?: number }) => {
    const fd = new FormData()
    fd.append('file', file)
    const schoolId = getAuthSchoolId()
    if (schoolId) fd.append('schoolId', String(schoolId))
    fd.append('folder', metadata?.folder ?? 'documents')
    if (metadata?.studentId) fd.append('studentId', String(metadata.studentId))
    return apiClient
      .post<{ success: boolean; data: { fileUrl?: string; url?: string; publicId?: string } }>(
        '/admin/files/upload',
        fd,
        multipartConfig(),
      )
      .then((r) => {
        const data = r.data.data
        const url = data.url ?? data.fileUrl ?? ''
        return { url, publicId: data.publicId ?? url }
      })
  },

  delete: (fileUrl: string) =>
    apiClient
      .delete<{ success: boolean; message: string }>('/admin/files/delete', {
        data: {
          fileUrl,
          schoolId: getAuthSchoolId() ? Number(getAuthSchoolId()) : undefined,
        },
      })
      .then((r) => r.data),
}
