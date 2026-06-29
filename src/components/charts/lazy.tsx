'use client'

import dynamic from 'next/dynamic'
import { ChartSkeleton } from './chart-skeleton'

export const LazyDashboardRevenueAreaChart = dynamic(
  () => import('./dashboard-hero-charts').then((m) => m.DashboardRevenueAreaChart),
  { ssr: false, loading: () => <ChartSkeleton height={200} /> },
)

export const LazyDashboardPaymentDonutChart = dynamic(
  () => import('./dashboard-hero-charts').then((m) => m.DashboardPaymentDonutChart),
  { ssr: false, loading: () => <ChartSkeleton variant="donut" /> },
)

export const LazyPresencePieChart = dynamic(
  () => import('./presence-analytics-charts').then((m) => m.PresencePieChart),
  { ssr: false, loading: () => <ChartSkeleton variant="donut" className="py-6" /> },
)

export const LazyPresenceClassBarChart = dynamic(
  () => import('./presence-analytics-charts').then((m) => m.PresenceClassBarChart),
  { ssr: false, loading: () => <ChartSkeleton height={180} /> },
)

export const LazyFinanceEfficiencyBarChart = dynamic(
  () => import('./finance-efficiency-chart').then((m) => m.FinanceEfficiencyBarChart),
  { ssr: false, loading: () => <ChartSkeleton height={220} /> },
)

const schoolChartLoading = () => <ChartSkeleton height={220} />

export const LazySchoolFinanceDonutChart = dynamic(
  () => import('./school-analytics-charts').then((m) => m.SchoolFinanceDonutChart),
  { ssr: false, loading: schoolChartLoading },
)
export const LazySchoolPresenceDonutChart = dynamic(
  () => import('./school-analytics-charts').then((m) => m.SchoolPresenceDonutChart),
  { ssr: false, loading: schoolChartLoading },
)
export const LazySchoolClassBarChart = dynamic(
  () => import('./school-analytics-charts').then((m) => m.SchoolClassBarChart),
  { ssr: false, loading: schoolChartLoading },
)
export const LazySchoolTreasuryBarChart = dynamic(
  () => import('./school-analytics-charts').then((m) => m.SchoolTreasuryBarChart),
  { ssr: false, loading: schoolChartLoading },
)
export const LazySchoolEfficiencyBarChart = dynamic(
  () => import('./school-analytics-charts').then((m) => m.SchoolEfficiencyBarChart),
  { ssr: false, loading: () => <ChartSkeleton height={200} /> },
)

export const LazyWeeklyAttendanceChart = dynamic(
  () => import('../admin/dashboard/admin-dashboard-charts').then((m) => m.WeeklyAttendanceChart),
  { ssr: false, loading: () => <ChartSkeleton height={240} /> },
)

export const LazyHourlyScansChart = dynamic(
  () => import('../admin/dashboard/admin-dashboard-charts').then((m) => m.HourlyScansChart),
  { ssr: false, loading: () => <ChartSkeleton height={240} /> },
)

export const LazyAttendanceDonutChart = dynamic(
  () => import('../admin/dashboard/admin-dashboard-charts').then((m) => m.AttendanceDonutChart),
  { ssr: false, loading: () => <ChartSkeleton variant="donut" className="py-8" /> },
)

export const LazyClassEnrollmentChart = dynamic(
  () => import('../admin/dashboard/admin-dashboard-charts').then((m) => m.ClassEnrollmentChart),
  { ssr: false, loading: () => <ChartSkeleton height={240} /> },
)
