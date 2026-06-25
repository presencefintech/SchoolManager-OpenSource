import { apiClient } from '@/lib/api/client'
import type { DashboardStats, LiveFeedEntry, HeatmapEntry, FraudAlert, ControlDashboardStats } from '@/types/admin'

export const dashboardApi = {
  getStats: () =>
    apiClient.get<{ success: boolean; data: any }>('/admin/stats')
      .then(r => {
        const d = r.data.data
        return {
          totalStudents:  d?.overview?.totalStudents ?? 0,
          presentToday:   d?.overview?.present       ?? 0,
          absentToday:    d?.overview?.absent         ?? 0,
          lateToday:      d?.overview?.late           ?? 0,
          attendanceRate: d?.attendanceRate           ?? 0,
          fraudAlerts:    d?.alerts?.criticalFraud    ?? 0,
        } satisfies DashboardStats
      }),

  getLiveFeed: (params?: { classId?: number; page?: number; limit?: number }) =>
    apiClient.get<{ success: boolean; data: any }>('/admin/live-feed', { params })
      .then(r => {
        const d = r.data.data
        const entries: LiveFeedEntry[] = (d?.data ?? []).map((p: any) => ({
          id:          p.id,
          studentId:   p.id,
          studentName: p.studentName,
          className:   p.className,
          status:      p.status,
          timestamp:   p.scannedAt,
          method:      p.method,
        }))
        return { entries, total: d?.pagination?.total ?? 0 }
      }),

  getHeatmap: (classId?: number) =>
    apiClient.get<{ success: boolean; data: HeatmapEntry[] }>('/admin/heatmap', {
      params: classId ? { classId } : undefined,
    }).then(r => r.data.data),

  getFraudAlerts: () =>
    apiClient.get<{ success: boolean; data: any }>('/admin/fraud-alerts')
      .then(r => {
        const raw = r.data.data
        if (Array.isArray(raw)) return raw as FraudAlert[]
        if (Array.isArray(raw?.alerts)) return raw.alerts as FraudAlert[]
        return [] as FraudAlert[]
      }),

  getControlStats: () =>
    apiClient.get<{ success: boolean; data: ControlDashboardStats }>('/admin/dashboard/stats')
      .then(r => r.data.data),

  triggerWeeklyReport: () =>
    apiClient.post<{ success: boolean; message: string }>('/admin/dashboard/reports/weekly')
      .then(r => r.data),
}
