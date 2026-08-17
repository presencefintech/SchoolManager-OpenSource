import { apiClient } from '@/lib/api/client'
import { getAuthSchoolId } from '@/lib/api/auth-storage'

export const adminCloudinaryApi = {
  uploadPhoto: (studentId: number, file: File, description?: string) => {
    const fd = new FormData()
    fd.append('file', file)
    const schoolId = getAuthSchoolId()
    if (schoolId) fd.append('schoolId', String(schoolId))
    if (description) fd.append('description', description)
    return apiClient
      .post<{ success: boolean; data: { url: string; publicId: string } }>(
        `/admin/cloudinary/students/${studentId}/photo`,
        fd,
        { timeout: 60_000 },
      )
      .then((r) => r.data.data)
  },

  uploadDocument: (
    studentId: number,
    documentType: 'certificates' | 'reports',
    file: File,
    description?: string,
  ) => {
    const fd = new FormData()
    fd.append('file', file)
    const schoolId = getAuthSchoolId()
    if (schoolId) fd.append('schoolId', String(schoolId))
    if (description) fd.append('description', description)
    return apiClient
      .post<{ success: boolean; data: { url: string; publicId: string; fieldUpdated?: string } }>(
        `/admin/cloudinary/students/${studentId}/documents/${documentType}`,
        fd,
        { timeout: 60_000 },
      )
      .then((r) => r.data.data)
  },

  deleteFile: (studentId: number, publicId: string) =>
    apiClient
      .delete<{ success: boolean; message: string }>(
        `/admin/cloudinary/files/${studentId}/${encodeURIComponent(publicId)}`,
      )
      .then((r) => r.data),
}
