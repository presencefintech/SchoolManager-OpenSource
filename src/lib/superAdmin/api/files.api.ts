import { apiClient } from '@/lib/api/client'
import type { FileUploadResult } from '@/types/super-admin'

export const filesApi = {
  upload: (formData: FormData) =>
    apiClient
      .post<{ success: boolean; data: FileUploadResult }>('/superadmin/files/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      .then((r) => r.data.data),

  deleteFile: (publicId: string) =>
    apiClient
      .delete<{ success: boolean; data: { message: string } }>('/superadmin/files/delete', { data: { publicId } })
      .then((r) => r.data.data),
}
