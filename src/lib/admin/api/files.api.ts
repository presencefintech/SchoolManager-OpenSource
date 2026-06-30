import { apiClient } from '@/lib/api/client'

export const adminFilesApi = {
  upload: (file: File, metadata?: { label?: string; category?: string }) => {
    const fd = new FormData()
    fd.append('file', file)
    if (metadata?.label) fd.append('label', metadata.label)
    if (metadata?.category) fd.append('category', metadata.category)
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
