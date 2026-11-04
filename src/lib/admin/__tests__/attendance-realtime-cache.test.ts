import { describe, expect, it } from '@jest/globals'
import { QueryClient } from '@tanstack/react-query'
import type { DashboardStats, PresenceStats } from '@/types/admin'
import {
  applyAttendanceStatisticsPatch,
  applyControlDashboardPatch,
  presentOnlyFromSocketPayload,
} from '@/lib/admin/attendance-realtime-cache'
import { parseAttendanceStatisticsUpdated } from '@/lib/admin/attendance-realtime.types'
import { mapControlDashboardSnapshot } from '@/lib/admin/control-dashboard.utils'

describe('attendance realtime cache', () => {
  const payload = {
    event: 'attendance.statistics.updated' as const,
    schoolId: 1,
    present: 45,
    absent: 10,
    late: 5,
    attendancePercentage: 81.8,
    updatedAt: '2026-07-10T12:00:00.000Z',
  }

  it('derive present-only from combined socket present', () => {
    expect(presentOnlyFromSocketPayload(payload)).toBe(40)
  })

  it('parses valid statistics payload', () => {
    const parsed = parseAttendanceStatisticsUpdated(payload)
    expect(parsed?.schoolId).toBe(1)
    expect(parsed?.late).toBe(5)
  })

  it('patches dashboard and presences stats caches', () => {
    const qc = new QueryClient()
    qc.setQueryData<DashboardStats>(['admin', 'stats'], {
      totalStudents: 55,
      presentToday: 30,
      absentToday: 20,
      lateToday: 3,
      attendanceRate: 60,
      fraudAlerts: 0,
    })
    qc.setQueryData<PresenceStats>(['admin', 'presences', 'stats'], {
      present: 30,
      absent: 20,
      late: 3,
      totalStudents: 55,
      attendanceRate: 60,
      criticalFraud: 0,
    })

    applyAttendanceStatisticsPatch(qc, payload)

    expect(qc.getQueryData<DashboardStats>(['admin', 'stats'])).toMatchObject({
      presentToday: 40,
      absentToday: 10,
      lateToday: 5,
      attendanceRate: 81.8,
      totalStudents: 55,
    })
    expect(qc.getQueryData<PresenceStats>(['admin', 'presences', 'stats'])).toMatchObject({
      present: 40,
      absent: 10,
      late: 5,
      attendanceRate: 81.8,
    })
  })

  it('patches control dashboard from socket snapshot', () => {
    const qc = new QueryClient()
    applyControlDashboardPatch(qc, {
      schoolId: 1,
      generatedAt: '2026-07-10T12:00:00.000Z',
      performance: { apiAvgMs: 42, workerAvgMs: 88, scansPerMinute: 3.2, samplesApi: 10, samplesWorker: 5 },
      security: {
        gatekeeperRejections: { total: 2, livenessFailure: 1, imageQuality: 0, other: 1 },
        suspiciousAuditEvents: 0,
        fraudAlertActive: false,
      },
      integrity: { withSeal: 10, verified: 9, corrupted: 0, unchecked: 1, sampleSize: 10, status: 'healthy' },
      workers: { queueName: 'presence', health: 'active', waiting: 0, active: 1, completed: 50, failed: 0, delayed: 0 },
      scanFlow: [{ label: '12:00', timestamp: '2026-07-10T12:00:00.000Z', count: 4 }],
    })

    const control = qc.getQueryData(['admin', 'control-stats']) as ReturnType<typeof mapControlDashboardSnapshot>
    expect(control.performance.scansPerMinute).toBe(3.2)
    expect(control.scanFlow).toHaveLength(1)
    expect(control.integrity.status).toBe('healthy')
  })
})
