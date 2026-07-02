import { describe, expect, it } from '@jest/globals'
import {
  mapEnterpriseDashboardToKpi,
  normalizeFraudAlertsResponse,
  normalizeCollectionEfficiencyLevels,
  normalizeEndOfDayClosing,
  normalizePaymentMethodsBreakdown,
  normalizeIntegrityScan,
  summarizeCollectionEfficiency,
  resolveFinanceDashboardDisplay,
} from '../finance-dashboard.utils'

describe('F-16 — smoke finance dashboard', () => {
  it('affiche des KPI non vides à partir du DTO strategic + insights', () => {
    const kpis = mapEnterpriseDashboardToKpi({
      performance: {
        monthlyRevenue: 120_000,
        projectedRevenue: 180_000,
        arpu: 12_000,
        digitalAdoption: 45,
        collectionEfficiency: 66.7,
      },
      audit: {
        pendingVerifications: 2,
        isBenfordValid: true,
        suspiciousActivity: false,
        devianceLevel: 0.5,
        daysSalesOutstanding: 7,
        highRiskProfiles: [],
      },
      treasury: {
        totalUnpaid: 60_000,
        breakEvenRequirement: 40,
        badDebtEstimate: 5_000,
      },
    })

    const display = resolveFinanceDashboardDisplay(kpis, {
      totalCollecte: 120_000,
      soldeRestant: 60_000,
      efficaciteRecouvrement: 66.7,
      nombreEleves: 42,
    })

    expect(display.totalPaid).toBeGreaterThan(0)
    expect(display.totalDue).toBeGreaterThan(0)
    expect(display.collectionRate).toBeGreaterThan(0)
    expect(display.totalFees).toBe(display.totalDue)
  })
})

describe('finance-dashboard.utils', () => {
  it('F-01 mappe EnterpriseDashboardDTO vers FinanceKpi', () => {
    const kpi = mapEnterpriseDashboardToKpi({
      performance: {
        monthlyRevenue: 500_000,
        projectedRevenue: 750_000,
        arpu: 25_000,
        digitalAdoption: 60,
        collectionEfficiency: 82.5,
      },
      audit: {
        pendingVerifications: 3,
        isBenfordValid: true,
        suspiciousActivity: true,
        devianceLevel: 2.1,
        daysSalesOutstanding: 14,
        highRiskProfiles: [{ studentName: 'Jean', debtAmount: 100, fraudAlertCount: 2, riskLevel: 'HIGH' }],
      },
      treasury: {
        totalUnpaid: 200_000,
        breakEvenRequirement: 50,
        badDebtEstimate: 10_000,
      },
    })

    expect(kpi.totalPaid).toBe(500_000)
    expect(kpi.totalDue).toBe(700_000)
    expect(kpi.collectionRate).toBe(82.5)
    expect(kpi.pendingPayments).toBe(3)
    expect(kpi.fraudAlerts).toBe(2)
    expect(kpi.totalRevenue).toBe(750_000)
  })

  it('F-02 normalise un objet fraud-alerts backend', () => {
    const alerts = normalizeFraudAlertsResponse({
      severity: 'HIGH',
      deviance: 4.2,
      benfordValid: false,
      anomalies: [
        { id: 12, amount: 15000, method: 'ORANGE_MONEY', audit: { suspicious: true } },
      ],
    })

    expect(alerts).toHaveLength(1)
    expect(alerts[0].id).toBe(12)
    expect(alerts[0].severity).toBe('HIGH')
    expect(alerts[0].amount).toBe(15000)
  })

  it('F-02 conserve un tableau legacy', () => {
    const alerts = normalizeFraudAlertsResponse([
      { id: 1, type: 'DUPLICATE', severity: 'MEDIUM', description: 'Doublon', createdAt: '2026-01-01' },
    ])
    expect(alerts[0].type).toBe('DUPLICATE')
  })

  it('F-05 normalise efficiency/comparative par niveau', () => {
    const levels = normalizeCollectionEfficiencyLevels([
      { levelName: '6ème', studentCount: 40, totalDue: 120_000, efficiency: 75 },
      { name: '5ème', count: 35, due: 90_000, rate: 62 },
    ])

    expect(levels).toHaveLength(2)
    expect(levels[0].levelName).toBe('6ème')
    expect(levels[1].efficiency).toBe(62)

    const summary = summarizeCollectionEfficiency(levels)
    expect(summary.levelCount).toBe(2)
    expect(summary.totalStudents).toBe(75)
    expect(summary.totalDue).toBe(210_000)
    expect(summary.averageEfficiency).toBeCloseTo(68.93, 1)
  })

  it('F-05 normalise end-of-day closing', () => {
    const eod = normalizeEndOfDayClosing({
      date: '2026-06-26T00:00:00.000Z',
      total: 250_000,
      count: 12,
      methods: [{ method: 'CASH', amount: 150_000, count: 8 }],
      reconciliation: { status: 'READY_FOR_DEPOSIT', reference: 'EOD-123' },
    })

    expect(eod?.total).toBe(250_000)
    expect(eod?.count).toBe(12)
    expect(eod?.methods[0].method).toBe('CASH')
    expect(eod?.reconciliation.status).toBe('READY_FOR_DEPOSIT')
  })

  it('F-06 normalise payment-methods breakdown', () => {
    const breakdown = normalizePaymentMethodsBreakdown({
      period: 'month',
      from: '2026-06-01T00:00:00.000Z',
      to: '2026-07-01T00:00:00.000Z',
      total: 300_000,
      count: 15,
      methods: [
        { method: 'CASH', amount: 180_000, count: 10, sharePct: 60 },
        { method: 'ORANGE_MONEY', amount: 120_000, count: 5, sharePct: 40 },
      ],
    })

    expect(breakdown?.period).toBe('month')
    expect(breakdown?.total).toBe(300_000)
    expect(breakdown?.methods).toHaveLength(2)
    expect(breakdown?.methods[0].sharePct).toBe(60)
  })

  it('F-05 normalise integrity-scan backend', () => {
    const scan = normalizeIntegrityScan({
      status: 'WARNING',
      totalChecked: 120,
      anomaliesFound: 2,
      details: [{ id: 7, firstName: 'Marie', lastName: 'K.', tuitionBalance: -500 }],
    })

    expect(scan.anomaliesFound).toBe(2)
    expect(scan.totalChecked).toBe(120)
    expect(scan.details[0].firstName).toBe('Marie')
  })

  it('harmonise KPI strategic/insights quand strategic renvoie 0 encaissé', () => {
    const display = resolveFinanceDashboardDisplay(
      {
        totalRevenue: 0,
        totalPaid: 0,
        totalDue: 10_230,
        collectionRate: 16.4,
        pendingPayments: 2,
        fraudAlerts: 6,
      },
      {
        totalCollecte: 330,
        soldeRestant: 11_900,
        efficaciteRecouvrement: 2.7,
        nombreEleves: 69,
      },
    )

    expect(display.totalPaid).toBe(330)
    expect(display.totalDue).toBe(12_230)
    expect(display.collectionRate).toBeCloseTo(2.7, 1)
    expect(display.totalFees).toBe(12_230)
    expect(display.projectedRevenue).toBe(0)
  })
})
