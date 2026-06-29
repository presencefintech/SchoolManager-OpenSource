import type { ControlDashboardStats } from '@/types/admin'

/** Adapte le snapshot backend (`ControlDashboardSnapshot`) au contrat UI admin. */
export function mapControlDashboardSnapshot(raw: Record<string, unknown> | null | undefined): ControlDashboardStats {
  const workers = raw?.workers as Record<string, unknown> | undefined
  const security = raw?.security as Record<string, unknown> | undefined
  const integrity = raw?.integrity as Record<string, unknown> | undefined
  const gatekeeper = security?.gatekeeperRejections as Record<string, unknown> | undefined
  const workerHealth = workers?.health as string | undefined

  const waiting = Number(workers?.waiting ?? 0)
  const delayed = Number(workers?.delayed ?? 0)
  const active = Number(workers?.active ?? 0)
  const failed = Number(workers?.failed ?? 0)

  return {
    pipeline: {
      healthy: workerHealth !== 'failed',
      queueDepth: waiting + delayed,
    },
    security: {
      alerts: Number(security?.suspiciousAuditEvents ?? 0),
      blockedIPs: Number(gatekeeper?.total ?? 0),
    },
    integrity: {
      errors: Number(integrity?.corrupted ?? 0),
    },
    workers: { active, failed },
  }
}
