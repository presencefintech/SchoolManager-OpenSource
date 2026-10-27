import { mapControlDashboardSnapshot } from '@/lib/admin/control-dashboard.utils'

describe('mapControlDashboardSnapshot — KPI école', () => {
  it('expose totalStudents / FACIAL / PIN depuis GET /admin/dashboard/stats', () => {
    const mapped = mapControlDashboardSnapshot({
      workers: { health: 'idle', waiting: 0, delayed: 0, active: 0, failed: 0 },
      security: { suspiciousAuditEvents: 0, gatekeeperRejections: {}, fraudAlertActive: false },
      integrity: { status: 'healthy' },
      performance: {},
      scanFlow: [],
      totalEnrolled: 40,
      presentToday: 12,
      facialCount: 8,
      pinCount: 4,
      attendanceRate: 30,
    })
    expect(mapped.schoolAttendance?.facialCount).toBe(8)
    expect(mapped.schoolAttendance?.pinCount).toBe(4)
    expect(mapped.schoolAttendance?.totalEnrolled).toBe(40)
    expect(mapped.attendanceRate).toBe(30)
  })
})                                                            