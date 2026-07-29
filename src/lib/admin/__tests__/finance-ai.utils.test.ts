import { describe, expect, it } from '@jest/globals'
import { normalizeFinanceAiInsights } from '../finance-ai.utils'

describe('finance-ai.utils', () => {
  it('normalise un bundle fintech v4 complet', () => {
    const bundle = normalizeFinanceAiInsights({
      enabled: true,
      modelVersion: 'finance-intel-v4',
      generatedAt: '2026-07-24T08:00:00.000Z',
      schoolId: 1,
      headline: 'Note B · portefeuille sain',
      narrative: 'Prévision favorable.',
      confidencePct: 72,
      executive: {
        healthScore: 78,
        grade: 'B',
        monthOverMonthPct: 12,
        digitalSharePct: 45,
        cashVariance30d: 120,
        reminderCureRatePct: 28,
        benchmarks: [
          { label: 'Recouvrement', value: 72, target: 70, unit: '%', status: 'good' },
        ],
      },
      forecast: {
        horizonDays: 30,
        expectedTotal: 12000,
        lowTotal: 9000,
        highTotal: 15000,
        vsTargetGap: 2000,
        dailyAverage: 400,
        ewmaLevel: 410,
        trendPerDay: 2.5,
        volatility: 80,
        method: 'EWMA+DOW+OLS+ECL_SCENARIOS',
        points: [{ date: '2026-07-25', expectedAmount: 400, low: 300, high: 500 }],
        scenarios: { optimistic: 15000, base: 12000, pessimistic: 8500 },
      },
      portfolio: {
        dsoDays: 42,
        nplRatioPct: 12.5,
        collectionVelocityPct: 18,
        concentrationTop5Pct: 35,
        totalDebt: 50000,
        collectibleDebt: 45000,
        debtorsCount: 20,
        aging: {
          b0_30: { count: 10, amount: 10000 },
          b31_60: { count: 5, amount: 15000 },
          b61_90: { count: 3, amount: 10000 },
          b90_plus: { count: 2, amount: 15000 },
        },
        contractualAging: {
          b0_30: { count: 0, amount: 0 },
          b31_60: { count: 2, amount: 5000 },
          b61_90: { count: 0, amount: 0 },
          b90_plus: { count: 0, amount: 0 },
        },
        contractualOverdueAmount: 5000,
        rollRates: { b0_30_to_31_60: 10, b31_60_to_61_90: 5, b61_90_to_90_plus: 30 },
        agingPressure: 48,
        expectedLoss: 12000,
        coverageRatioPct: 76,
        collectedLast30d: 9000,
        pendingAmount: 1500,
        pendingCount: 4,
        stalePendingCount: 1,
        medianSettlementHours: 6.5,
        moratoriumDebt: 5000,
        moratoriumCount: 2,
        moratoriumExpiring7d: 1,
        methodMix: [{ method: 'CASH', amount: 5000, sharePct: 55 }],
        methodHhi: 4200,
        cashSharePct: 55,
        digitalSharePct: 45,
        cashVariance30d: 120,
        classHotspots: [],
      },
      anomalies: [],
      collectionActions: [],
      opportunities: [],
      provenance: {
        engine: 'fintech_v4',
        fallback: false,
        dataWindowDays: 90,
        cacheHit: false,
        techniques: ['COMPOSITE_HEALTH'],
      },
    })

    expect(bundle).not.toBeNull()
    expect(bundle!.executive.grade).toBe('B')
    expect(bundle!.forecast.scenarios.base).toBe(12000)
    expect(bundle!.portfolio.contractualOverdueAmount).toBe(5000)
    expect(bundle!.portfolio.digitalSharePct).toBe(45)
    expect(bundle!.provenance.engine).toBe('fintech_v4')
  })

  it('tolère un payload partiel', () => {
    const bundle = normalizeFinanceAiInsights({ enabled: true, schoolId: 2 })
    expect(bundle?.executive.grade).toBe('F')
    expect(bundle?.forecast.scenarios.base).toBe(0)
  })
})
