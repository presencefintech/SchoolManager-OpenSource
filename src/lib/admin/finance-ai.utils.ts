export type FinanceAiHorizon = 7 | 30 | 90

/**
 * Deep links backend pointent souvent vers `/admin/...`.
 * Le rôle FINANCE est confiné à `/finances/*` (middleware Next).
 */
export function rewriteFinanceDeepLink(
  href: string | undefined,
  audience: 'admin' | 'finance',
): string | undefined {
  if (!href) return href
  if (audience !== 'finance') return href

  if (href.startsWith('/admin/students/')) {
    return href.replace('/admin/students/', '/finances/eleves/')
  }

  const map: Record<string, string> = {
    '/admin/finance/paiements': '/finances/paiements',
    '/admin/finance/audit': '/finances/verifications',
    '/admin/finance/caisse': '/finances/caisse',
    '/admin/finance/debiteurs': '/finances/debiteurs',
    '/admin/finance/rapports': '/finances/rapports',
    '/admin/finance/factures': '/finances/suivi-financier',
    '/admin/finance/controle': '/finances/verifications',
    '/admin/finance/remboursements': '/finances/remboursements',
  }
  if (map[href]) return map[href]

  if (href.startsWith('/admin/finance/')) {
    const rest = href.slice('/admin/finance/'.length)
    return `/finances/${rest}`
  }

  return href
}

export type FinanceAiAgingBuckets = {
  b0_30: { count: number; amount: number }
  b31_60: { count: number; amount: number }
  b61_90: { count: number; amount: number }
  b90_plus: { count: number; amount: number }
}

export type FinanceAiRollRates = {
  b0_30_to_31_60: number
  b31_60_to_61_90: number
  b61_90_to_90_plus: number
}

export type FinanceAiCollectionAction = {
  studentId: number
  studentName: string
  className: string | null
  debtAmount: number
  priority: 'HIGH' | 'MEDIUM' | 'LOW'
  riskScore: number
  recoverabilityPct: number
  expectedRecovery: number
  expectedLoss: number
  dpdBucket: string
  recommendedChannel: 'WHATSAPP' | 'SMS' | 'CALL' | 'IN_PERSON'
  recommendedAction: string
  reasonCodes: string[]
  hasActiveMoratorium: boolean
  remindersWithoutPay14d: number
  href: string
}

export type FinanceAiClassHotspot = {
  className: string
  debt: number
  efficiencyPct: number
  debtorCount: number
  studentCount: number
}

export type FinanceAiMethodShare = {
  method: string
  amount: number
  sharePct: number
}

export type FinanceAiBenchmark = {
  label: string
  value: number
  target: number
  unit: string
  status: 'good' | 'watch' | 'critical'
}

export type FinanceAiExecutiveSummary = {
  healthScore: number
  grade: 'A' | 'B' | 'C' | 'D' | 'F'
  monthOverMonthPct: number
  digitalSharePct: number
  cashVariance30d: number
  reminderCureRatePct: number
  benchmarks: FinanceAiBenchmark[]
}

export type FinanceAiPortfolio = {
  dsoDays: number
  nplRatioPct: number
  collectionVelocityPct: number
  concentrationTop5Pct: number
  totalDebt: number
  collectibleDebt: number
  debtorsCount: number
  aging: FinanceAiAgingBuckets
  contractualAging: FinanceAiAgingBuckets
  contractualOverdueAmount: number
  rollRates: FinanceAiRollRates
  agingPressure: number
  expectedLoss: number
  coverageRatioPct: number
  collectedLast30d: number
  pendingAmount: number
  pendingCount: number
  stalePendingCount: number
  medianSettlementHours: number
  moratoriumDebt: number
  moratoriumCount: number
  moratoriumExpiring7d: number
  methodMix: FinanceAiMethodShare[]
  methodHhi: number
  cashSharePct: number
  digitalSharePct: number
  cashVariance30d: number
  classHotspots: FinanceAiClassHotspot[]
}

export type FinanceAiInsightBundle = {
  enabled: boolean
  modelVersion: string
  generatedAt: string
  schoolId: number
  headline: string
  narrative: string
  confidencePct: number
  executive: FinanceAiExecutiveSummary
  forecast: {
    horizonDays: number
    expectedTotal: number
    lowTotal: number
    highTotal: number
    vsTargetGap: number
    dailyAverage: number
    ewmaLevel: number
    trendPerDay: number
    volatility: number
    method: string
    points: Array<{ date: string; expectedAmount: number; low: number; high: number }>
    scenarios: { optimistic: number; base: number; pessimistic: number }
  }
  portfolio: FinanceAiPortfolio
  anomalies: Array<{
    date: string
    amount: number
    zScore: number
    direction: 'SPIKE' | 'DROP'
  }>
  collectionActions: FinanceAiCollectionAction[]
  opportunities: Array<{
    code: string
    title: string
    impactLabel: string
    message: string
    href?: string
    severity?: 'info' | 'warning' | 'critical'
  }>
  provenance: {
    engine: 'fintech_v4' | 'fintech_v3' | 'fintech_v2' | 'heuristic_v1' | 'llm_enriched'
    fallback: boolean
    dataWindowDays: number
    cacheHit: boolean
    techniques: string[]
  }
}

const EMPTY_AGING: FinanceAiAgingBuckets = {
  b0_30: { count: 0, amount: 0 },
  b31_60: { count: 0, amount: 0 },
  b61_90: { count: 0, amount: 0 },
  b90_plus: { count: 0, amount: 0 },
}

function num(v: unknown, fallback = 0): number {
  const n = Number(v)
  return Number.isFinite(n) ? n : fallback
}

function parseAgingBucket(raw: unknown): { count: number; amount: number } {
  if (!raw || typeof raw !== 'object') return { count: 0, amount: 0 }
  const b = raw as Record<string, unknown>
  return { count: num(b.count), amount: num(b.amount) }
}

function parseAging(raw: unknown): FinanceAiAgingBuckets {
  if (!raw || typeof raw !== 'object') return { ...EMPTY_AGING }
  const a = raw as Record<string, unknown>
  return {
    b0_30: parseAgingBucket(a.b0_30),
    b31_60: parseAgingBucket(a.b31_60),
    b61_90: parseAgingBucket(a.b61_90),
    b90_plus: parseAgingBucket(a.b90_plus),
  }
}

function parseExecutive(raw: unknown): FinanceAiExecutiveSummary {
  if (!raw || typeof raw !== 'object') {
    return {
      healthScore: 0,
      grade: 'F',
      monthOverMonthPct: 0,
      digitalSharePct: 0,
      cashVariance30d: 0,
      reminderCureRatePct: 0,
      benchmarks: [],
    }
  }
  const e = raw as Record<string, unknown>
  const grade =
    e.grade === 'A' || e.grade === 'B' || e.grade === 'C' || e.grade === 'D' || e.grade === 'F'
      ? e.grade
      : 'F'
  const benchmarks = Array.isArray(e.benchmarks)
    ? e.benchmarks
        .map((row) => {
          if (!row || typeof row !== 'object') return null
          const b = row as Record<string, unknown>
          if (typeof b.label !== 'string') return null
          return {
            label: b.label,
            value: num(b.value),
            target: num(b.target),
            unit: typeof b.unit === 'string' ? b.unit : '',
            status:
              b.status === 'good' || b.status === 'watch' || b.status === 'critical'
                ? b.status
                : ('watch' as const),
          }
        })
        .filter((x): x is FinanceAiBenchmark => x != null)
    : []
  return {
    healthScore: num(e.healthScore),
    grade,
    monthOverMonthPct: num(e.monthOverMonthPct),
    digitalSharePct: num(e.digitalSharePct),
    cashVariance30d: num(e.cashVariance30d),
    reminderCureRatePct: num(e.reminderCureRatePct),
    benchmarks,
  }
}

export function normalizeFinanceAiInsights(raw: unknown): FinanceAiInsightBundle | null {
  if (!raw || typeof raw !== 'object') return null
  const r = raw as Record<string, unknown>
  const forecast =
    r.forecast && typeof r.forecast === 'object'
      ? (r.forecast as Record<string, unknown>)
      : {}
  const provenance =
    r.provenance && typeof r.provenance === 'object'
      ? (r.provenance as Record<string, unknown>)
      : {}
  const portfolioRaw =
    r.portfolio && typeof r.portfolio === 'object'
      ? (r.portfolio as Record<string, unknown>)
      : {}
  const scenariosRaw =
    forecast.scenarios && typeof forecast.scenarios === 'object'
      ? (forecast.scenarios as Record<string, unknown>)
      : {}
  const rollRaw =
    portfolioRaw.rollRates && typeof portfolioRaw.rollRates === 'object'
      ? (portfolioRaw.rollRates as Record<string, unknown>)
      : {}

  const actions = Array.isArray(r.collectionActions)
    ? r.collectionActions
        .map((row) => {
          if (!row || typeof row !== 'object') return null
          const a = row as Record<string, unknown>
          const studentId = Number(a.studentId)
          if (!Number.isFinite(studentId) || studentId <= 0) return null
          return {
            studentId,
            studentName: typeof a.studentName === 'string' ? a.studentName : `Élève #${studentId}`,
            className: typeof a.className === 'string' ? a.className : null,
            debtAmount: num(a.debtAmount),
            priority:
              a.priority === 'HIGH' || a.priority === 'MEDIUM' || a.priority === 'LOW'
                ? a.priority
                : 'MEDIUM',
            riskScore: num(a.riskScore),
            recoverabilityPct: num(a.recoverabilityPct),
            expectedRecovery: num(a.expectedRecovery),
            expectedLoss: num(a.expectedLoss),
            dpdBucket: typeof a.dpdBucket === 'string' ? a.dpdBucket : '—',
            recommendedChannel:
              a.recommendedChannel === 'WHATSAPP' ||
              a.recommendedChannel === 'SMS' ||
              a.recommendedChannel === 'CALL' ||
              a.recommendedChannel === 'IN_PERSON'
                ? a.recommendedChannel
                : 'WHATSAPP',
            recommendedAction:
              typeof a.recommendedAction === 'string' ? a.recommendedAction : 'Relancer',
            reasonCodes: Array.isArray(a.reasonCodes)
              ? a.reasonCodes.filter((x): x is string => typeof x === 'string')
              : [],
            hasActiveMoratorium: Boolean(a.hasActiveMoratorium),
            remindersWithoutPay14d: num(a.remindersWithoutPay14d),
            href: typeof a.href === 'string' ? a.href : `/admin/students/${studentId}`,
          } satisfies FinanceAiCollectionAction
        })
        .filter((x): x is FinanceAiCollectionAction => x != null)
    : []

  const opportunities = Array.isArray(r.opportunities)
    ? r.opportunities
        .map((row) => {
          if (!row || typeof row !== 'object') return null
          const o = row as Record<string, unknown>
          if (typeof o.title !== 'string' || typeof o.message !== 'string') return null
          const severity = o.severity
          return {
            code: typeof o.code === 'string' ? o.code : 'OPP',
            title: o.title,
            impactLabel: typeof o.impactLabel === 'string' ? o.impactLabel : '',
            message: o.message,
            href: typeof o.href === 'string' ? o.href : undefined,
            severity:
              severity === 'info' || severity === 'warning' || severity === 'critical'
                ? (severity as 'info' | 'warning' | 'critical')
                : undefined,
          }
        })
        .filter((x): x is NonNullable<typeof x> => x != null)
    : []

  const anomalies = Array.isArray(r.anomalies)
    ? r.anomalies
        .map((row) => {
          if (!row || typeof row !== 'object') return null
          const a = row as Record<string, unknown>
          if (typeof a.date !== 'string') return null
          return {
            date: a.date,
            amount: num(a.amount),
            zScore: num(a.zScore),
            direction: a.direction === 'DROP' ? ('DROP' as const) : ('SPIKE' as const),
          }
        })
        .filter((x): x is NonNullable<typeof x> => x != null)
    : []

  const methodMix = Array.isArray(portfolioRaw.methodMix)
    ? portfolioRaw.methodMix
        .map((row) => {
          if (!row || typeof row !== 'object') return null
          const m = row as Record<string, unknown>
          if (typeof m.method !== 'string') return null
          return { method: m.method, amount: num(m.amount), sharePct: num(m.sharePct) }
        })
        .filter((x): x is FinanceAiMethodShare => x != null)
    : []

  const classHotspots = Array.isArray(portfolioRaw.classHotspots)
    ? portfolioRaw.classHotspots
        .map((row) => {
          if (!row || typeof row !== 'object') return null
          const h = row as Record<string, unknown>
          if (typeof h.className !== 'string') return null
          return {
            className: h.className,
            debt: num(h.debt),
            efficiencyPct: num(h.efficiencyPct),
            debtorCount: num(h.debtorCount),
            studentCount: num(h.studentCount),
          }
        })
        .filter((x): x is FinanceAiClassHotspot => x != null)
    : []

  const engine =
    provenance.engine === 'fintech_v4' ||
    provenance.engine === 'fintech_v3' ||
    provenance.engine === 'fintech_v2' ||
    provenance.engine === 'llm_enriched'
      ? provenance.engine
      : provenance.engine === 'heuristic_v1'
        ? 'heuristic_v1'
        : 'fintech_v4'

  return {
    enabled: r.enabled !== false,
    modelVersion: typeof r.modelVersion === 'string' ? r.modelVersion : 'finance-intel-v4',
    generatedAt:
      typeof r.generatedAt === 'string' ? r.generatedAt : new Date().toISOString(),
    schoolId: num(r.schoolId),
    headline: typeof r.headline === 'string' ? r.headline : 'Intelligence financière',
    narrative: typeof r.narrative === 'string' ? r.narrative : '',
    confidencePct: num(r.confidencePct),
    executive: parseExecutive(r.executive),
    forecast: {
      horizonDays: num(forecast.horizonDays, 30) || 30,
      expectedTotal: num(forecast.expectedTotal),
      lowTotal: num(forecast.lowTotal),
      highTotal: num(forecast.highTotal),
      vsTargetGap: num(forecast.vsTargetGap),
      dailyAverage: num(forecast.dailyAverage),
      ewmaLevel: num(forecast.ewmaLevel),
      trendPerDay: num(forecast.trendPerDay),
      volatility: num(forecast.volatility),
      method: typeof forecast.method === 'string' ? forecast.method : 'EWMA+DOW+OLS',
      points: Array.isArray(forecast.points)
        ? forecast.points
            .map((p) => {
              if (!p || typeof p !== 'object') return null
              const pt = p as Record<string, unknown>
              if (typeof pt.date !== 'string') return null
              return {
                date: pt.date,
                expectedAmount: num(pt.expectedAmount),
                low: num(pt.low),
                high: num(pt.high),
              }
            })
            .filter((x): x is NonNullable<typeof x> => x != null)
        : [],
      scenarios: {
        optimistic: num(scenariosRaw.optimistic),
        base: num(scenariosRaw.base, num(forecast.expectedTotal)),
        pessimistic: num(scenariosRaw.pessimistic),
      },
    },
    portfolio: {
      dsoDays: num(portfolioRaw.dsoDays),
      nplRatioPct: num(portfolioRaw.nplRatioPct),
      collectionVelocityPct: num(portfolioRaw.collectionVelocityPct),
      concentrationTop5Pct: num(portfolioRaw.concentrationTop5Pct),
      totalDebt: num(portfolioRaw.totalDebt),
      collectibleDebt: num(portfolioRaw.collectibleDebt),
      debtorsCount: num(portfolioRaw.debtorsCount),
      aging: parseAging(portfolioRaw.aging),
      contractualAging: parseAging(portfolioRaw.contractualAging),
      contractualOverdueAmount: num(portfolioRaw.contractualOverdueAmount),
      rollRates: {
        b0_30_to_31_60: num(rollRaw.b0_30_to_31_60),
        b31_60_to_61_90: num(rollRaw.b31_60_to_61_90),
        b61_90_to_90_plus: num(rollRaw.b61_90_to_90_plus),
      },
      agingPressure: num(portfolioRaw.agingPressure),
      expectedLoss: num(portfolioRaw.expectedLoss),
      coverageRatioPct: num(portfolioRaw.coverageRatioPct),
      collectedLast30d: num(portfolioRaw.collectedLast30d),
      pendingAmount: num(portfolioRaw.pendingAmount),
      pendingCount: num(portfolioRaw.pendingCount),
      stalePendingCount: num(portfolioRaw.stalePendingCount),
      medianSettlementHours: num(portfolioRaw.medianSettlementHours),
      moratoriumDebt: num(portfolioRaw.moratoriumDebt),
      moratoriumCount: num(portfolioRaw.moratoriumCount),
      moratoriumExpiring7d: num(portfolioRaw.moratoriumExpiring7d),
      methodMix,
      methodHhi: num(portfolioRaw.methodHhi),
      cashSharePct: num(portfolioRaw.cashSharePct),
      digitalSharePct: num(portfolioRaw.digitalSharePct),
      cashVariance30d: num(portfolioRaw.cashVariance30d),
      classHotspots,
    },
    anomalies,
    collectionActions: actions,
    opportunities,
    provenance: {
      engine,
      fallback: Boolean(provenance.fallback),
      dataWindowDays: num(provenance.dataWindowDays),
      cacheHit: Boolean(provenance.cacheHit),
      techniques: Array.isArray(provenance.techniques)
        ? provenance.techniques.filter((x): x is string => typeof x === 'string')
        : [],
    },
  }
}
