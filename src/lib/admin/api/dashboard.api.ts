import { apiClient } from '@/lib/api/client'
import { mapControlDashboardSnapshot } from '@/lib/admin/control-dashboard.utils'
import { mapPresenceSecurityEventToFraudAlert } from '@/lib/admin/fraud-alert.utils'
import type { DashboardStats, LiveFeedEntry, HeatmapEntry, FraudAlert, ControlDashboardStats } from '@/types/admin'

export type TabletConnectionStatus = 'ONLINE' | 'OFFLINE' | 'SYNCING'

export type SchoolTabletDevice = {
  deviceId: string
  lastSyncAt: string | null
  lastSeenAt: string | null
  pendingCount: number
  scanCount: number
  status: TabletConnectionStatus
  online?: boolean
}

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

  getDevices: () =>
    apiClient
      .get<{ success: boolean; data: { devices: SchoolTabletDevice[] } }>('/admin/devices')
      .then((r) => r.data.data?.devices ?? []),

  triggerWeeklyReport: () =>
    apiClient.post<{ success: boolean; message: string }>('/admin/dashboard/reports/weekly')
      .then(r => r.data),

  /** Indicateurs pédagogiques direction (couverture fiches, besoins, trimestres). */
  getDirectionMetrics: () =>
    apiClient
      .get<{ success: boolean; data: DirectionDashboardMetrics }>('/admin/dashboard/metrics')
      .then((r) => r.data.data),

  /** Alertes opérationnelles direction (fiches manquantes, sanctions, besoins). */
  getDirectionAlerts: () =>
    apiClient
      .get<{ success: boolean; data: DirectionDashboardAlerts }>('/admin/dashboard/alerts')
      .then((r) => r.data.data),
}

export type DirectionAlertSeverity = 'HIGH' | 'MEDIUM'

export type DirectionAlert = {
  code: string
  severity: DirectionAlertSeverity
  teacherId: number
  teacherName: string
  title: string
  detail: string
  resource: string
  resourceId: number
  occurredAt: string
}

export type DirectionDashboardPeriod = {
  academicYear: string
  inSession: boolean
  term: string
  weekNumber: number | null
  termStartsOn?: string
  termEndsOn?: string
}

export type DirectionDashboardMetrics = {
  generatedAt: string
  period: DirectionDashboardPeriod
  scope: { mode: string; sectionIds: number[] | null }
  lessonCoverage: {
    teachersExpected: number
    teachersCovered: number
    coverageRate: number | null
  }
  needsAwaitingFunding: {
    count: number
    estimatedCost: string
    statuses: string[]
  }
  plansByStatus: {
    term: string
    DRAFT: number
    SUBMITTED: number
    APPROVED: number
    REJECTED: number
  }
}

export type DirectionDashboardAlerts = {
  generatedAt: string
  period: DirectionDashboardPeriod
  scope: { mode: string; sectionIds: number[] | null }
  alerts: DirectionAlert[]
}
