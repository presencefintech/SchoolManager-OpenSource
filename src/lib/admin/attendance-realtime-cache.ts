import type { QueryClient } from '@tanstack/react-query'
import type { DashboardStats, PresenceStats, ControlDashboardStats } from '@/types/admin'
import type { AttendanceStatisticsUpdatedPayload } from '@/lib/admin/attendance-realtime.types'
import { mapControlDashboardSnapshot } from '@/lib/admin/control-dashboard.utils'

/** Présents stricts (hors retards) — le socket envoie present = présents + retards. */
export function presentOnlyFromSocketPayload(payload: AttendanceStatisticsUpdatedPayload): number {
  return Math.max(0, payload.present - payload.late)
}

export function applyAttendanceStatisticsPatch(
  qc: QueryClient,
  payload: AttendanceStatisticsUpdatedPayload,
): void {
  const presentOnly = presentOnlyFromSocketPayload(payload)

  qc.setQueriesData<DashboardStats>({ queryKey: ['admin', 'stats'] }, (old) => {
    if (!old) return old
    return {
      ...old,
      presentToday: presentOnly,
      absentToday: payload.absent,
      lateToday: payload.late,
      attendanceRate: payload.attendancePercentage,
    }
  })

  qc.setQueriesData<PresenceStats>({ queryKey: ['admin', 'presences', 'stats'] }, (old) => {
    if (!old) return old
    return {
      ...old,
      present: presentOnly,
      absent: payload.absent,
      late: payload.late,
      attendanceRate: payload.attendancePercentage,
    }
  })
}

export function applyControlDashboardPatch(qc: QueryClient, raw: unknown): void {
  if (!raw || typeof raw !== 'object') return
  const mapped = mapControlDashboardSnapshot(raw as Record<string, unknown>)
  qc.setQueryData<ControlDashboardStats>(['admin', 'control-stats'], mapped)
}

const FEED_INVALIDATION_KEYS = [
  ['admin', 'live-feed'],
  ['admin', 'heatmap'],
  ['admin', 'fraud-alerts'],
  ['admin', 'attendance-notifications'],
  ['admin', 'schools', 'attendance-readiness'],
  ['admin', 'presences', 'live'],
  ['admin', 'presences', 'heatmap'],
  ['admin', 'presences', 'alerts'],
  ['admin', 'presences', 'sheets-pending'],
  ['admin', 'presences', 'scan-sessions'],
  ['admin', 'presences', 'sync-batches'],
] as const

const PLATFORM_INVALIDATION_KEYS = [
  ['admin', 'enrollments'],
  ['admin', 'stats'],
] as const

/** Paiement confirmé/échoué — pas toute la liste élèves (trop large pour le header search). */
const PAYMENT_PLATFORM_KEYS = [
  ['admin', 'stats'],
  ['admin', 'finance', 'pending'],
  ['admin', 'finance', 'dashboard'],
] as const

/** Invalide inscriptions / KPIs après événements enrollment. */
export function invalidatePlatformQueries(qc: QueryClient): void {
  for (const queryKey of PLATFORM_INVALIDATION_KEYS) {
    void qc.invalidateQueries({ queryKey: [...queryKey] })
  }
}

export function invalidatePaymentPlatformQueries(qc: QueryClient): void {
  for (const queryKey of PAYMENT_PLATFORM_KEYS) {
    void qc.invalidateQueries({ queryKey: [...queryKey] })
  }
}

/** Invalide flux, alertes et ops — sans toucher aux KPIs stats (patch socket). */
export function invalidateAttendanceFeedQueries(qc: QueryClient): void {
  for (const queryKey of FEED_INVALIDATION_KEYS) {
    void qc.invalidateQueries({ queryKey: [...queryKey] })
  }
}

/** Fallback polling / reconnexion — invalide tout le domaine présence. */
export function invalidateAllAttendanceQueries(qc: QueryClient): void {
  invalidateAttendanceFeedQueries(qc)
  invalidatePlatformQueries(qc)
  void qc.invalidateQueries({ queryKey: ['admin', 'stats'] })
  void qc.invalidateQueries({ queryKey: ['admin', 'presences', 'stats'] })
  void qc.invalidateQueries({ queryKey: ['admin', 'presences'] })
  void qc.invalidateQueries({ queryKey: ['admin', 'control-stats'] })
}
