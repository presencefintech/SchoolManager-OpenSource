import type { CollectionAnalyticsSummary, GuichetDashboard } from '@/types/finance'

/** Session académique courante depuis le snapshot guichet (isCurrent côté backend). */
export function resolveAcademicSessionId(
  guichet?: Pick<GuichetDashboard, 'currentAcademicSessionId'> | null,
): number | null {
  const id = guichet?.currentAcademicSessionId
  return id != null && id > 0 ? id : null
}

/** F-04 — normalise GET /finance/payments/analytics/collection */
export function normalizeCollectionAnalytics(raw: unknown): CollectionAnalyticsSummary | null {
  if (!raw || typeof raw !== 'object') return null
  const row = raw as Record<string, unknown>
  return {
    monthlyRevenue: Number(row.monthlyRevenue ?? 0),
    growth: Number(row.growth ?? 0),
    collectionEfficiency: Number(row.collectionEfficiency ?? 0),
    totalReceivables: Number(row.totalReceivables ?? 0),
  }
}
