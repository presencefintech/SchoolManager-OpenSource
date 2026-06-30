import { apiClient } from '@/lib/api/client'
import { getAuthSchoolId } from '@/lib/api/auth-storage'

export const adminFilesApi = {
  upload: (file: File, metadata?: { folder?: string; studentId?: number }) => {
    const fd = new FormData()
    fd.append('file', file)
    const schoolId = getAuthSchoolId()
    if (schoolId) fd.append('schoolId', String(schoolId))
    fd.append('folder', metadata?.folder ?? 'documents')
    if (metadata?.studentId) fd.append('studentId', String(metadata.studentId))
    return apiClient
      .post<{ success: boolean; data: { url: string; publicId: string } }>('/admin/files/upload', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      .then((r) => r.data.data)
  },

  delete: (publicId: string) =>
    apiClient
      .delete<{ success: boolean; message: string }>('/admin/files/delete', { data: { publicId } })
      .then((r) => r.data),
}
