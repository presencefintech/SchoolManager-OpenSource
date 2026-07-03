import { apiClient } from '@/lib/api/client'
import { mapControlDashboardSnapshot } from '@/lib/admin/control-dashboard.utils'
import { mapPresenceSecurityEventToFraudAlert } from '@/lib/admin/fraud-alert.utils'
import type { DashboardStats, LiveFeedEntry, HeatmapEntry, FraudAlert, ControlDashboardStats } from '@/types/admin'

export const dashboardApi = {
  getStats: () =>
    apiClient.get<{ success: boolean; data: any }>('/admin/presences/stats')
      .then(r => {
        const d = r.data.data
        return {
          totalStudents:  d?.overview?.totalStudents ?? 0,
          presentToday:   d?.overview?.present       ?? 0,
          absentToday:    d?.overview?.absent         ?? 0,
          lateToday:      d?.overview?.late           ?? 0,
          attendanceRate: d?.attendanceRate           ?? 0,
          fraudAlerts:    d?.alerts?.criticalFraud    ?? 0,
          weeklyTrend:    d?.weeklyTrend              ?? [],
        } satisfies DashboardStats
      }),

  getLiveFeed: (params?: { classId?: number; page?: number; limit?: number }) =>
    apiClient.get<{ success: boolean; data: any }>('/admin/presences/live', { params })
      .then(r => {
        const d = r.data.data
        const entries: LiveFeedEntry[] = (d?.data ?? []).map((p: any) => ({
          id:          p.id,
          studentId:   p.studentId ?? p.id,
          studentName: p.studentName,
          className:   p.className,
          status:      p.status,
          timestamp:   p.scannedAt,
          method:      p.method,
        }))
        return { entries, total: d?.pagination?.total ?? 0 }
      }),

  getHeatmap: (classId?: number) =>
    apiClient.get<{ success: boolean; data: HeatmapEntry[] }>('/admin/presences/heatmap', {
      params: classId ? { classId } : undefined,
    }).then(r => {
      const raw = r.data.data ?? []
      return raw.map((h) => ({
        hour: typeof h.hour === 'number' ? `${h.hour}h` : String(h.hour),
        count: h.count ?? 0,
      })) as HeatmapEntry[]
    }),

  getFraudAlerts: () =>
    apiClient.get<{ success: boolean; data: any[] }>('/admin/presences/alerts')
      .then(r => (r.data.data ?? []).map((row) => mapPresenceSecurityEventToFraudAlert(row))),

  getControlStats: () =>
    apiClient.get<{ success: boolean; data: Record<string, unknown> }>('/admin/dashboard/stats')
      .then(r => mapControlDashboardSnapshot(r.data.data) satisfies ControlDashboardStats),

  triggerWeeklyReport: () =>
    apiClient.post<{ success: boolean; message: string }>('/admin/dashboard/reports/weekly')
      .then(r => r.data),

  streamStats: () => new EventSource(`${apiClient.defaults.baseURL}/admin/dashboard/stream`),

  getQuickStats: () =>
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
          weeklyTrend:    d?.weeklyTrend              ?? [],
        } satisfies DashboardStats
      }),

  getLiveFeedPaginated: (params?: { classId?: number; page?: number; limit?: number }) =>
    apiClient.get<{ success: boolean; data: any }>('/admin/live-feed', { params })
      .then(r => {
        const d = r.data.data
        const entries: LiveFeedEntry[] = (d?.data ?? []).map((p: any) => ({
          id:          p.id,
          studentId:   p.studentId ?? p.id,
          studentName: p.studentName,
          className:   p.className,
          status:      p.status,
          timestamp:   p.scannedAt,
          method:      p.method,
        }))
        return { entries, total: d?.pagination?.total ?? 0 }
      }),

  getHourlyHeatmap: (classId?: number) =>
    apiClient.get<{ success: boolean; data: HeatmapEntry[] }>('/admin/heatmap', {
      params: classId ? { classId } : undefined,
    }).then(r => (r.data.data ?? []).map((h) => ({
      hour: h.hour,
      count: h.count ?? 0,
    })) as HeatmapEntry[]),
}
