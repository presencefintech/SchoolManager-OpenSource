import type {
  EnterpriseDashboardDTO,
  FinanceFraudAlert,
  FinanceFraudAlertsApiResponse,
  FinanceKpi,
  FinanceCollectionEfficiencyLevel,
  FinanceEndOfDayClosing,
  FinancePaymentMethodsBreakdown,
  FinanceFeeTypesBreakdown,
  FinanceIntegrityScan,
  FinanceIntegrityScanDetail,
} from '@/types/admin'
import { formatMoney } from '@/lib/finance/currency'

export type { EnterpriseDashboardDTO }

export function isEnterpriseDashboardDTO(raw: unknown): raw is EnterpriseDashboardDTO {
  if (!raw || typeof raw !== 'object') return false
  const o = raw as Record<string, unknown>
  return typeof o.performance === 'object' && typeof o.audit === 'object' && typeof o.treasury === 'object'
}

/** Volume total des frais scolaires à partir de la dette et du taux de recouvrement. */
export function deriveTotalFeesFromCollection(debt: number, collectionEfficiency: number): number {
  if (debt <= 0) return 0
  if (collectionEfficiency >= 100) return debt
  if (collectionEfficiency <= 0) return debt
  return debt / (1 - collectionEfficiency / 100)
}

/** F-01 — mappe le DTO nested backend vers FinanceKpi (cartes dashboard admin). */
export function mapEnterpriseDashboardToKpi(raw: unknown): FinanceKpi {
  if (!isEnterpriseDashboardDTO(raw)) {
    throw new Error('Réponse dashboard strategic invalide : format EnterpriseDashboardDTO attendu')
  }

  const { performance, audit, treasury } = raw
  const debt = treasury.totalUnpaid
  const totalDue = deriveTotalFeesFromCollection(debt, performance.collectionEfficiency)
  const totalPaid = Math.max(0, totalDue - debt)

  return {
    totalRevenue: performance.projectedRevenue,
    totalPaid,
    totalDue,
    collectionRate: performance.collectionEfficiency,
    pendingPayments: audit.pendingVerifications,
    fraudAlerts: audit.highRiskProfiles.length + (audit.suspiciousActivity ? 1 : 0),
    monthlyRevenue: performance.monthlyRevenue,
    enterprise: raw,
  }
}

/** F-02 — normalise GET /admin/finance/audit/fraud-alerts (objet ou tableau legacy). */
export function isFinanceFraudAlertsApiResponse(raw: unknown): raw is FinanceFraudAlertsApiResponse {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return false
  const o = raw as Record<string, unknown>
  return Array.isArray(o.anomalies) || typeof o.severity === 'string'
}

function unwrapFraudAlertsPayload(raw: unknown): unknown {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return raw
  const o = raw as Record<string, unknown>
  if (isFinanceFraudAlertsApiResponse(o)) return o
  if (o.data != null && typeof o.data === 'object') return o.data
  return raw
}

function buildIntegrityAlert(
  payload: FinanceFraudAlertsApiResponse,
  severity: string,
  deviance?: number,
): FinanceFraudAlert {
  return {
    id: 0,
    type: 'INTEGRITE_FINANCIERE',
    severity,
    description: payload.reason
      ? String(payload.reason)
      : `Alerte d'intégrité — déviance ${deviance ?? 'N/A'}${
          payload.benfordValid === false ? ', loi de Benford non respectée' : ''
        }`,
    createdAt: new Date().toISOString(),
  }
}

export function normalizeFraudAlertsResponse(raw: unknown): FinanceFraudAlert[] {
  const payload = unwrapFraudAlertsPayload(raw)

  if (Array.isArray(payload)) {
    return payload.map((item, index) => normalizeFraudAlertItem(item, index))
  }

  if (!isFinanceFraudAlertsApiResponse(payload)) return []

  const anomalies = payload.anomalies ?? []
  const severity = String(payload.severity ?? 'LOW')
  const deviance = payload.deviance != null ? Number(payload.deviance) : undefined

  const fromAnomalies = anomalies.map((item, index) => {
    const row = item as Record<string, unknown>
    const audit = row.audit as Record<string, unknown> | undefined
    const method = String(row.method ?? 'ANOMALIE_MONTANT')
    const itemSeverity =
      audit?.suspicious === true
        ? severity === 'LOW'
          ? 'MEDIUM'
          : severity
        : severity
    return {
      id: Number(row.id ?? index + 1),
      type: method,
      severity: String(itemSeverity),
      description: audit?.suspicious
        ? `Transaction ${method.replace(/_/g, ' ')} suspecte — ${formatMoney(Number(row.amount ?? 0))}`
        : `Anomalie détectée sur le flux de paiement #${row.id ?? index + 1}`,
      amount: row.amount != null ? Number(row.amount) : undefined,
      createdAt: String(row.createdAt ?? new Date().toISOString()),
    } satisfies FinanceFraudAlert
  })

  if (fromAnomalies.length > 0) return fromAnomalies

  if (severity === 'HIGH' || payload.suspicious === true) {
    return [buildIntegrityAlert(payload, severity, deviance)]
  }

  if (payload.benfordValid === false) {
    return [buildIntegrityAlert(payload, 'MEDIUM', deviance)]
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

/** F-06 — GET /admin/finance/dashboard/payment-methods. */
export function normalizePaymentMethodsBreakdown(raw: unknown): FinancePaymentMethodsBreakdown | null {
  if (!raw || typeof raw !== 'object') return null

  const row = raw as Record<string, unknown>
  const period = row.period === 'day' ? 'day' : 'month'
  const methods = Array.isArray(row.methods) ? row.methods : []

  return {
    period,
    from: String(row.from ?? ''),
    to: String(row.to ?? ''),
    total: Number(row.total ?? 0),
    count: Number(row.count ?? 0),
    methods: methods.map((item) => {
      const method = (item && typeof item === 'object' ? item : {}) as Record<string, unknown>
      return {
        method: String(method.method ?? 'INCONNU'),
        amount: Number(method.amount ?? 0),
        count: Number(method.count ?? 0),
        sharePct: Number(method.sharePct ?? 0),
      }
    }),
  }
}

/** Increment A — GET /admin/finance/dashboard/fee-types. */
export function normalizeFeeTypesBreakdown(raw: unknown): FinanceFeeTypesBreakdown | null {
  if (!raw || typeof raw !== 'object') return null

  const row = raw as Record<string, unknown>
  const period = row.period === 'day' ? 'day' : 'month'
  const feeTypes = Array.isArray(row.feeTypes) ? row.feeTypes : []
  const total = Number(row.total ?? 0)

  return {
    period,
    from: String(row.from ?? ''),
    to: String(row.to ?? ''),
    total,
    count: Number(row.count ?? 0),
    feeTypes: feeTypes.map((item) => {
      const fee = (item && typeof item === 'object' ? item : {}) as Record<string, unknown>
      const amount = Number(fee.amount ?? 0)
      return {
        feeType: String(fee.feeType ?? 'Autre'),
        amount,
        count: Number(fee.count ?? 0),
        sharePct: fee.sharePct != null
          ? Number(fee.sharePct)
          : total > 0
            ? (amount / total) * 100
            : 0,
      }
    }),
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

function normalizeIntegrityStatus(raw: unknown, anomaliesFound: number): FinanceIntegrityScan['status'] {
  const status = String(raw ?? '').toUpperCase()
  if (
    status === 'SECURE'
    || status === 'INTEGRITY_OK'
    || status === 'OK'
    || status === 'HEALTHY'
  ) {
    return 'SECURE'
  }
  if (
    status === 'WARNING'
    || status === 'ALERT_FRAUD'
    || status === 'CRITICAL'
    || status === 'FRAUD'
  ) {
    return 'WARNING'
  }
  return anomaliesFound > 0 ? 'WARNING' : 'SECURE'
}

/** F-05 — admin integrity-scan + guichet `/finance/payments/audit/integrity`. */
export function normalizeIntegrityScan(raw: unknown): FinanceIntegrityScan {
  if (!raw || typeof raw !== 'object') {
    return { status: 'UNKNOWN', totalChecked: 0, anomaliesFound: 0, details: [] }
  }

  const row = raw as Record<string, unknown>
  const rawDetails = Array.isArray(row.details)
    ? row.details
    : Array.isArray(row.anomalies)
      ? row.anomalies
      : []
  const details = rawDetails.map(normalizeIntegrityDetail)
  const anomaliesFound = row.anomaliesFound != null
    ? Number(row.anomaliesFound)
    : row.errors != null
      ? Number(row.errors)
      : row.errorCount != null
        ? Number(row.errorCount)
        : details.length

  return {
    status: normalizeIntegrityStatus(row.status, anomaliesFound),
    totalChecked: Number(row.totalChecked ?? row.checked ?? 0),
    anomaliesFound,
    details,
  }
}

export function isFinanceIntegritySecure(scan: Pick<FinanceIntegrityScan, 'status' | 'anomaliesFound'>): boolean {
  return scan.anomaliesFound === 0 && normalizeIntegrityStatus(scan.status, scan.anomaliesFound) === 'SECURE'
}

export function formatIntegrityStatusLabel(status: string): string {
  const normalized = normalizeIntegrityStatus(status, 0)
  if (normalized === 'SECURE') return 'Système sain'
  if (normalized === 'WARNING') return 'Attention requise'
  return status || 'Inconnu'
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
  nombreEleves: "Nombre d'élèves",
  seuilEquilibre: "Seuil d'équilibre (élèves)",
  seuilEquilibreEleves: "Seuil d'équilibre (élèves)",
  etatFinancier: 'État financier',
  surEncaissement: 'Sur-encaissement',
  // health-check (anglais API)
  collected: 'Encaissé',
  remaining: 'Reste dû',
  efficiency: 'Taux de recouvrement',
  studentCount: "Nombre d'élèves",
  breakEvenThreshold: "Seuil d'équilibre (élèves)",
  isHealthy: 'Établissement sain',
  overCollected: 'Sur-encaissement',
  // rapport détaillé
  reportId: 'Référence',
  generatedAt: 'Généré le',
  totalTransactions: 'Transactions',
  TOTAL: 'Total encaissé',
  CASH: 'Espèces',
  BANK: 'Banque',
  MOBILE_MONEY: 'Mobile money',
  // enrichissements
  scoreSante: 'Score de santé',
  healthScore: 'Score de santé',
  encaissementsMois: 'Encaissements du mois',
  collectedThisMonth: 'Encaissements du mois',
  variationMensuelle: 'Variation mensuelle',
  monthOverMonthPct: 'Variation mensuelle',
  debiteurs: 'Débiteurs',
  debtorsCount: 'Débiteurs',
  paiementsEnAttente: 'Paiements en attente',
  pendingPayments: 'Paiements en attente',
  ticketMoyenEleve: 'Ticket moyen / élève',
  avgPerStudent: 'Ticket moyen / élève',
}

export function formatInsightLabel(key: string): string {
  return INSIGHT_LABELS[key] ?? key.replace(/([A-Z])/g, ' $1').replace(/^./, (c) => c.toUpperCase()).trim()
}

export type FinanceHealthRecommendation = {
  code: string
  severity: 'info' | 'warning' | 'critical'
  message: string
  href?: string
}

export type FinanceHealthView = {
  collected: number
  remaining: number
  efficiency: number
  studentCount: number
  breakEvenThreshold: number
  isHealthy: boolean
  overCollected: boolean
  healthScore: number
  targetEfficiency: number
  gapToTarget: number
  avgPerStudent: number
  debtorsCount: number
  pendingPayments: number
  collectedThisMonth: number
  collectedPrevMonth: number
  monthOverMonthPct: number
  recommendations: FinanceHealthRecommendation[]
}

function asRecommendation(raw: unknown): FinanceHealthRecommendation | null {
  if (!raw || typeof raw !== 'object') return null
  const r = raw as Record<string, unknown>
  const severity =
    r.severity === 'critical' || r.severity === 'warning' || r.severity === 'info'
      ? r.severity
      : 'info'
  const message = typeof r.message === 'string' ? r.message : null
  if (!message) return null
  return {
    code: typeof r.code === 'string' ? r.code : 'NOTE',
    severity,
    message,
    href: typeof r.href === 'string' ? r.href : undefined,
  }
}

export function normalizeFinanceHealth(raw: unknown): FinanceHealthView | null {
  if (!raw || typeof raw !== 'object') return null
  const r = raw as Record<string, unknown>
  const collected = Number(r.collected ?? r.totalCollecte ?? 0)
  const remaining = Number(r.remaining ?? r.soldeRestant ?? 0)
  const rawEff = Number(r.efficiency ?? r.efficaciteRecouvrement ?? 0)
  const efficiency = Number.isFinite(rawEff) ? Math.min(100, Math.max(0, rawEff)) : 0
  const studentCount = Number(r.studentCount ?? r.nombreEleves ?? 0)
  const breakEvenThreshold = Number(r.breakEvenThreshold ?? r.seuilEquilibreEleves ?? r.seuilEquilibre ?? 0)
  const isHealthy = Boolean(r.isHealthy ?? r.etatFinancier === 'Sain')
  const overCollected = Boolean(r.overCollected ?? r.surEncaissement ?? false)
  const healthScoreRaw = Number(r.healthScore ?? r.scoreSante ?? efficiency)
  const healthScore = Number.isFinite(healthScoreRaw)
    ? Math.min(100, Math.max(0, Math.round(healthScoreRaw)))
    : Math.round(efficiency)
  const targetEfficiency = Number(r.targetEfficiency ?? 70)
  const recommendations = Array.isArray(r.recommendations)
    ? r.recommendations.map(asRecommendation).filter((x): x is FinanceHealthRecommendation => x != null)
    : []

  return {
    collected: Number.isFinite(collected) ? collected : 0,
    remaining: Number.isFinite(remaining) ? remaining : 0,
    efficiency,
    studentCount: Number.isFinite(studentCount) ? studentCount : 0,
    breakEvenThreshold: Number.isFinite(breakEvenThreshold) ? breakEvenThreshold : 0,
    isHealthy,
    overCollected,
    healthScore,
    targetEfficiency: Number.isFinite(targetEfficiency) ? targetEfficiency : 70,
    gapToTarget: Number(r.gapToTarget ?? Math.max(0, (Number.isFinite(targetEfficiency) ? targetEfficiency : 70) - efficiency)),
    avgPerStudent: Number(r.avgPerStudent ?? r.ticketMoyenEleve ?? 0) || 0,
    debtorsCount: Number(r.debtorsCount ?? r.debiteurs ?? 0) || 0,
    pendingPayments: Number(r.pendingPayments ?? r.paiementsEnAttente ?? 0) || 0,
    collectedThisMonth: Number(r.collectedThisMonth ?? r.encaissementsMois ?? 0) || 0,
    collectedPrevMonth: Number(r.collectedPrevMonth ?? 0) || 0,
    monthOverMonthPct: Number(r.monthOverMonthPct ?? r.variationMensuelle ?? 0) || 0,
    recommendations,
  }
}

export type FinanceDetailedReportView = {
  reportId: string
  generatedAt: string
  totalTransactions: number
  periodStart: string | null
  periodEnd: string | null
  averageTicket: number
  digitalSharePct: number
  topClasses: Array<{ name: string; amount: number }>
  summary: {
    total: number
    cash: number
    bank: number
    mobileMoney: number
  }
}

export function normalizeDetailedReport(raw: unknown): FinanceDetailedReportView | null {
  if (!raw || typeof raw !== 'object') return null
  const r = raw as Record<string, unknown>
  const summary =
    r.summary && typeof r.summary === 'object'
      ? (r.summary as Record<string, unknown>)
      : {}
  const period =
    r.period && typeof r.period === 'object'
      ? (r.period as Record<string, unknown>)
      : {}
  const reportId = typeof r.reportId === 'string' ? r.reportId : '—'
  const generatedAt =
    r.generatedAt instanceof Date
      ? r.generatedAt.toISOString()
      : typeof r.generatedAt === 'string'
        ? r.generatedAt
        : new Date().toISOString()
  const totalTransactions = Number(r.totalTransactions ?? 0)
  const topClasses = Array.isArray(r.topClasses)
    ? r.topClasses
        .map((row) => {
          if (!row || typeof row !== 'object') return null
          const c = row as Record<string, unknown>
          const name = typeof c.name === 'string' ? c.name : null
          const amount = Number(c.amount ?? 0)
          if (!name || !Number.isFinite(amount)) return null
          return { name, amount }
        })
        .filter((x): x is { name: string; amount: number } => x != null)
        .slice(0, 5)
    : []

  return {
    reportId,
    generatedAt,
    totalTransactions: Number.isFinite(totalTransactions) ? totalTransactions : 0,
    periodStart: typeof period.start === 'string' ? period.start : null,
    periodEnd: typeof period.end === 'string' ? period.end : null,
    averageTicket: Number(r.averageTicket ?? 0) || 0,
    digitalSharePct: Number(r.digitalSharePct ?? 0) || 0,
    topClasses,
    summary: {
      total: Number(summary.TOTAL ?? 0),
      cash: Number(summary.CASH ?? 0),
      bank: Number(summary.BANK ?? 0),
      mobileMoney: Number(summary.MOBILE_MONEY ?? 0),
    },
  }
}
