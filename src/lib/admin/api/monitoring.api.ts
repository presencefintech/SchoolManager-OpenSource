import { apiClient } from '@/lib/api/client'

export const adminMonitoringApi = {
  getHealth: () =>
    apiClient
      .get<{ success: boolean; data: Record<string, unknown> }>('/admin/monitoring/health')
      .then((r) => r.data.data),

  getStats: () =>
    apiClient
      .get<{ success: boolean; data: { cpu: number; memory: number; uptime: number } }>('/admin/monitoring/stats')
      .then((r) => r.data.data),
}
