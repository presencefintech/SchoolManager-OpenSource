import type { ControlDashboardStats } from '@/types/admin'

/** Adapte le snapshot backend (`ControlDashboardSnapshot`) au contrat UI admin. */
export function mapControlDashboardSnapshot(
  raw: Record<string, unknown> | null | undefined,
): ControlDashboardStats {
  const workers = raw?.workers as Record<string, unknown> | undefined
  const security = raw?.security as Record<string, unknown> | undefined
  const integrity = raw?.integrity as Record<string, unknown> | undefined
  const performance = raw?.performance as Record<string, unknown> | undefined
  const gatekeeper = security?.gatekeeperRejections as Record<string, unknown> | undefined
  const workerHealth = typeof workers?.health === 'string' ? workers.health : 'unavailable'

  const waiting = Number(workers?.waiting ?? 0)
  const delayed = Number(workers?.delayed ?? 0)
  const active = Number(workers?.active ?? 0)
  const failed = Number(workers?.failed ?? 0)

  const scanFlowRaw = Array.isArray(raw?.scanFlow) ? raw.scanFlow : []
  const scanFlow = scanFlowRaw.map((point) => {
    const p = point as Record<string, unknown>
    return {
      label: String(p.label ?? ''),
      timestamp: String(p.timestamp ?? ''),
      count: Number(p.count ?? 0),
    }
  })

  const integrityStatus = integrity?.status
  const validIntegrity =
    integrityStatus === 'healthy' ||
    integrityStatus === 'warning' ||
    integrityStatus === 'critical' ||
    integrityStatus === 'unavailable'
      ? integrityStatus
      : 'unavailable'

  return {
    pipeline: {
      healthy: workerHealth !== 'failed' && workerHealth !== 'unavailable',
      queueDepth: waiting + delayed,
    },
    security: {
      alerts: Number(security?.suspiciousAuditEvents ?? 0),
      blockedIPs: Number(gatekeeper?.total ?? 0),
      gatekeeper: {
        livenessFailure: Number(gatekeeper?.livenessFailure ?? 0),
        imageQuality: Number(gatekeeper?.imageQuality ?? 0),
        other: Number(gatekeeper?.other ?? 0),
      },
      fraudAlertActive: security?.fraudAlertActive === true,
    },
    integrity: {
      errors: Number(integrity?.corrupted ?? 0),
      withSeal: Number(integrity?.withSeal ?? 0),
      verified: Number(integrity?.verified ?? 0),
      unchecked: Number(integrity?.unchecked ?? 0),
      status: validIntegrity,
    },
    workers: { active, failed, waiting, health: workerHealth },
    performance: {
      apiAvgMs: Math.round(Number(performance?.apiAvgMs ?? 0)),
      workerAvgMs: Math.round(Number(performance?.workerAvgMs ?? 0)),
      scansPerMinute: Number(performance?.scansPerMinute ?? 0),
    },
    scanFlow,
    generatedAt: typeof raw?.generatedAt === 'string' ? raw.generatedAt : undefined,
  }
}
