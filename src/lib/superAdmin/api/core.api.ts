import { apiClient } from '@/lib/api/client'
import type { PlatformStats, School, SchoolDetail } from '@/types/super-admin'

export const coreApi = {
  getStats: () =>
    apiClient
      .get<{ success: boolean; stats: PlatformStats }>('/superadmin/core/stats')
      .then((r) => r.data.stats),

  getSchools: (params?: { q?: string; page?: number; take?: number }) =>
    apiClient
      .get<{ success: boolean; rows: School[]; total: number }>('/superadmin/core/schools', { params })
      .then((r) => r.data.rows),

  getSchool: (id: number) =>
    apiClient
      .get<{ success: boolean; school: SchoolDetail }>(`/superadmin/core/schools/${id}`)
      .then((r) => r.data.school),
}
