import type {
  FinanceFraudAlert,
  FinanceKpi,
  FinanceCollectionEfficiencyLevel,
  FinanceEndOfDayClosing,
  FinanceIntegrityScan,
  FinanceIntegrityScanDetail,
} from '@/types/admin'
import { formatMoney } from '@/lib/finance/currency'

/** Contrat backend — GET /admin/finance/dashboard/strategic */
export interface EnterpriseDashboardDTO {
  performance: {
    monthlyRevenue: number
    projectedRevenue: number
    arpu: number
    digitalAdoption: number
    collectionEfficiency: number
  }
  audit: {
    pendingVerifications: number
    isBenfordValid: boolean
    suspiciousActivity: boolean
    devianceLevel: number
    daysSalesOutstanding: number
    highRiskProfiles: Array<{
      studentName: string
      debtAmount: number
      fraudAlertCount: number
      riskLevel: 'CRITICAL' | 'HIGH'
    }>
  }
  treasury: {
    totalUnpaid: number
    breakEvenRequirement: number
    badDebtEstimate: number
  }
}

export function isEnterpriseDashboardDTO(raw: unknown): raw is EnterpriseDashboardDTO {
  if (!raw || typeof raw !== 'object') return false
  const o = raw as Record<string, unknown>
  return typeof o.performance === 'object' && typeof o.audit === 'object' && typeof o.treasury === 'object'
}

/** F-01 — mappe le DTO nested backend vers FinanceKpi (cartes dashboard admin). */
export function mapEnterpriseDashboardToKpi(raw: unknown): FinanceKpi & { enterprise?: EnterpriseDashboardDTO } {
  if (!isEnterpriseDashboardDTO(raw)) {
    const legacy = raw as Record<string, unknown> | undefined
    return {
      totalRevenue: Number(legacy?.totalRevenue ?? 0),
      totalPaid: Number(legacy?.totalPaid ?? 0),
      totalDue: Number(legacy?.totalDue ?? 0),
      collectionRate: Number(legacy?.collectionRate ?? 0),
      pendingPayments: Number(legacy?.pendingPayments ?? 0),
      fraudAlerts: Number(legacy?.fraudAlerts ?? 0),
    }
  }

  const { performance, audit, treasury } = raw
  const totalPaid = performance.monthlyRevenue
  const totalDue = treasury.totalUnpaid + totalPaid

  return {
    totalRevenue: performance.projectedRevenue,
    totalPaid,
    totalDue,
    collectionRate: performance.collectionEfficiency,
    pendingPayments: audit.pendingVerifications,
    fraudAlerts: audit.highRiskProfiles.length + (audit.suspiciousActivity ? 1 : 0),
    enterprise: raw,
  }
}

/** F-02 — normalise GET /admin/finance/audit/fraud-alerts (objet ou tableau legacy). */
export function normalizeFraudAlertsResponse(raw: unknown): FinanceFraudAlert[] {
  if (Array.isArray(raw)) {
    return raw.map((item, index) => normalizeFraudAlertItem(item, index))
  }

  if (!raw || typeof raw !== 'object') return []

  const payload = raw as Record<string, unknown>
  const anomalies = Array.isArray(payload.anomalies) ? payload.anomalies : []
  const severity = String(payload.severity ?? 'LOW')
  const deviance = payload.deviance != null ? Number(payload.deviance) : undefined

  const fromAnomalies = anomalies.map((item, index) => {
    const row = item as Record<string, unknown>
    const audit = row.audit as Record<string, unknown> | undefined
    return {
      id: Number(row.id ?? index + 1),
      type: String(row.method ?? 'ANOMALIE_MONTANT'),
      severity,
      description: audit?.suspicious
        ? `Transaction suspecte — montant ${formatMoney(Number(row.amount ?? 0))}`
        : `Anomalie détectée sur le flux de paiement #${row.id ?? index + 1}`,
      amount: row.amount != null ? Number(row.amount) : undefined,
      createdAt: String(row.createdAt ?? new Date().toISOString()),
    } satisfies FinanceFraudAlert
  })

  if (fromAnomalies.length > 0) return fromAnomalies

  if (severity === 'HIGH' || payload.suspicious === true) {
    return [{
      id: 0,
      type: 'INTEGRITE_FINANCIERE',
      severity,
      description: payload.reason
        ? String(payload.reason)
        : `Alerte d'intégrité — déviance ${deviance ?? 'N/A'}${payload.benfordValid === false ? ', loi de Benford non respectée' : ''}`,
      createdAt: new Date().toISOString(),
    }]
  }

  return []
}

function normalizeFraudAlertItem(item: unknown, index: number): FinanceFraudAlert {
  const row = (item && typeof item === 'object' ? item : {}) as Record<string, unknown>
  return {
    id: Number(row.id ?? index + 1),
    type: String(row.type ?? row.method ?? 'FRAUDE'),
    severity: String(row.severity ?? 'MEDIUM'),
    description: String(row.description ?? row.message ?? 'Alerte fraude'),
    studentName: row.studentName as string | undefined,
    amount: row.amount != null ? Number(row.amount) : undefined,
    createdAt: String(row.createdAt ?? new Date().toISOString()),
  }
}

/** F-05 — GET /admin/finance/dashboard/efficiency (et comparative). */
export function normalizeCollectionEfficiencyLevels(raw: unknown): FinanceCollectionEfficiencyLevel[] {
  if (!Array.isArray(raw)) return []

  return raw.map((item) => {
    const row = (item && typeof item === 'object' ? item : {}) as Record<string, unknown>
    return {
      levelName: String(row.levelName ?? row.name ?? 'Niveau'),
      studentCount: Number(row.studentCount ?? row.count ?? 0),
      totalDue: Number(row.totalDue ?? row.due ?? 0),
      efficiency: Number(row.efficiency ?? row.rate ?? 0),
    }
  })
}

export function summarizeCollectionEfficiency(levels: FinanceCollectionEfficiencyLevel[]) {
  if (levels.length === 0) {
    return { averageEfficiency: 0, totalStudents: 0, totalDue: 0, levelCount: 0 }
  }

  const totalStudents = levels.reduce((sum, level) => sum + level.studentCount, 0)
  const totalDue = levels.reduce((sum, level) => sum + level.totalDue, 0)
  const weightedEfficiency = totalStudents > 0
    ? levels.reduce((sum, level) => sum + level.efficiency * level.studentCount, 0) / totalStudents
    : levels.reduce((sum, level) => sum + level.efficiency, 0) / levels.length

  return {
    averageEfficiency: weightedEfficiency,
    totalStudents,
    totalDue,
    levelCount: levels.length,
  }
}

/** F-05 — GET /admin/finance/closing/end-of-day. */
export function normalizeEndOfDayClosing(raw: unknown): FinanceEndOfDayClosing | null {
  if (!raw || typeof raw !== 'object') return null

  const row = raw as Record<string, unknown>
  const reconciliation = (row.reconciliation && typeof row.reconciliation === 'object'
    ? row.reconciliation
    : {}) as Record<string, unknown>
  const methods = Array.isArray(row.methods) ? row.methods : []

  return {
    date: String(row.date ?? new Date().toISOString()),
    total: Number(row.total ?? row.totalToday ?? 0),
    count: Number(row.count ?? row.transactionCount ?? 0),
    methods: methods.map((item) => {
      const method = (item && typeof item === 'object' ? item : {}) as Record<string, unknown>
      return {
        method: String(method.method ?? 'INCONNU'),
        amount: Number(method.amount ?? 0),
        count: Number(method.count ?? 0),
      }
    }),
    reconciliation: {
      status: String(reconciliation.status ?? row.status ?? 'UNKNOWN'),
      reference: String(reconciliation.reference ?? ''),
    },
  }
}

function normalizeIntegrityDetail(item: unknown): FinanceIntegrityScanDetail {
  const row = (item && typeof item === 'object' ? item : {}) as Record<string, unknown>
  return {
    id: Number(row.id ?? 0),
    firstName: row.firstName as string | null | undefined,
    lastName: row.lastName as string | null | undefined,
    totalFees: row.totalFees != null ? Number(row.totalFees) : undefined,
    feesPaid: row.feesPaid != null ? Number(row.feesPaid) : undefined,
    tuitionBalance: row.tuitionBalance != null ? Number(row.tuitionBalance) : undefined,
  }
}

/** F-05 — GET /admin/finance/audit/integrity-scan. */
export function normalizeIntegrityScan(raw: unknown): FinanceIntegrityScan {
  if (!raw || typeof raw !== 'object') {
    return { status: 'UNKNOWN', totalChecked: 0, anomaliesFound: 0, details: [] }
  }

  const row = raw as Record<string, unknown>
  const details = Array.isArray(row.details) ? row.details.map(normalizeIntegrityDetail) : []
  const anomaliesFound = row.anomaliesFound != null
    ? Number(row.anomaliesFound)
    : row.errors != null
      ? Number(row.errors)
      : row.errorCount != null
        ? Number(row.errorCount)
        : details.length

  return {
    status: String(row.status ?? (anomaliesFound > 0 ? 'WARNING' : 'SECURE')),
    totalChecked: Number(row.totalChecked ?? 0),
    anomaliesFound,
    details,
  }
}

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  CASH: 'Espèces',
  ORANGE_MONEY: 'Orange Money',
  AIRTEL_MONEY: 'Airtel Money',
  MPESA: 'M-Pesa',
  BANK_TRANSFER: 'Virement',
  CARD: 'Carte',
}

export function formatPaymentMethodLabel(method: string): string {
  return PAYMENT_METHOD_LABELS[method] ?? method.replace(/_/g, ' ')
}

export function formatEodReconciliationStatus(status: string): string {
  if (status === 'READY_FOR_DEPOSIT') return 'Prêt pour dépôt'
  if (status === 'NO_ACTIVITY') return 'Aucune activité'
  return status.replace(/_/g, ' ')
}

export interface FinanceDashboardDisplay {
  totalPaid: number
  totalDue: number
  collectionRate: number
  /** Somme des frais scolaires (collecté + restant). */
  totalFees: number
  /** Projection fin de mois (strategic) — 0 si indisponible. */
  projectedRevenue: number
}

/** @deprecated Utiliser totalFees ou projectedRevenue selon le contexte UI. */
export type FinanceDashboardDisplayLegacy = FinanceDashboardDisplay & { totalRevenue: number }

/** Harmonise les cartes KPI quand strategic et insights divergent. */
export function resolveFinanceDashboardDisplay(
  kpis: FinanceKpi | undefined,
  insights: unknown,
): FinanceDashboardDisplay {
  const strategicPaid = Number(kpis?.totalPaid ?? 0)
  const strategicDue = Number(kpis?.totalDue ?? 0)
  const strategicRate = Number(kpis?.collectionRate ?? 0)
  const strategicRevenue = Number(kpis?.totalRevenue ?? 0)

  const ins = insights && typeof insights === 'object' ? insights as Record<string, unknown> : {}
  const insightCollected = Number(ins.totalCollecte ?? 0)
  const insightRemaining = Number(ins.soldeRestant ?? 0)
  const insightRate = Number(ins.efficaciteRecouvrement ?? 0)
  const hasInsightTotals = insightCollected > 0 || insightRemaining > 0

  const strategicMonetaryEmpty = strategicPaid <= 0 && strategicDue <= 0 && strategicRevenue <= 0
  const strategicPaidMissing = strategicPaid <= 0 && hasInsightTotals

  if (hasInsightTotals && (strategicMonetaryEmpty || strategicPaidMissing)) {
    const totalPaid = insightCollected
    const totalDue = insightCollected + insightRemaining
    const collectionRate = totalDue > 0 ? (totalPaid / totalDue) * 100 : insightRate
    return {
      totalPaid,
      totalDue,
      collectionRate,
      totalFees: totalDue,
      projectedRevenue: strategicRevenue,
    }
  }

  const totalPaid = strategicPaid
  const totalDue = strategicDue > 0 ? strategicDue : insightCollected + insightRemaining
  const collectionRate = totalDue > 0 && totalPaid >= 0
    ? (totalPaid / totalDue) * 100
    : strategicRate > 0
      ? strategicRate
      : insightRate

  return {
    totalPaid,
    totalDue,
    collectionRate,
    totalFees: totalDue,
    projectedRevenue: strategicRevenue,
  }
}

const INSIGHT_LABELS: Record<string, string> = {
  totalCollecte: 'Total collecté',
  soldeRestant: 'Solde restant',
  efficaciteRecouvrement: 'Efficacité recouvrement',
  nombreEleves: 'Nombre d\'élèves',
  seuilEquilibre: 'Seuil d\'équilibre',
  etatFinancier: 'État financier',
}

export function formatInsightLabel(key: string): string {
  return INSIGHT_LABELS[key] ?? key.replace(/([A-Z])/g, ' $1').toLowerCase()
}
