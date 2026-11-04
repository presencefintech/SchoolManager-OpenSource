import { apiClient } from '@/lib/api/client'

export type RetentionReportItem = {
  schoolName: string
  currentActivity: number
  dropRate: string
  status: 'AT_RISK' | 'STABLE'
}

export type MasterDashboardAnalytics = {
  summary: {
    totalRevenue: number
    criticalAlerts: number
    systemStatus: string
    trends: { revenueGrowth: string; trend: string }
  }
  vips: Array<{
    id: number
    name: string
    revenue: string
    students: number
    tier: string
    color: string
  }>
  churnRisks: RetentionReportItem[]
  marketAnalysis: Array<{ province: string; activeSchools: number; penetration: string }>
  infrastructure: { total: number; errorRate: string; errors: number; score: number }
}

export const analyticsApi = {
  getMasterDashboard: () =>
    apiClient
      .get<{ success: boolean; data: MasterDashboardAnalytics }>('/superadmin/analytics/dashboard')
      .then((r) => r.data.data),

  getRetentionReport: () =>
    apiClient
      .get<{ success: boolean; data: { count: number; items: RetentionReportItem[] } }>(
        '/superadmin/analytics/retention',
      )
      .then((r) => r.data.data),

  getSystemHealth: () =>
    apiClient
      .get<{ success: boolean; data: unknown }>('/superadmin/analytics/health')
      .then((r) => r.data.data),
}
