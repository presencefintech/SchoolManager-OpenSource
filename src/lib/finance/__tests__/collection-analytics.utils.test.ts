import { describe, expect, it } from '@jest/globals'
import {
  normalizeCollectionAnalytics,
  resolveAcademicSessionId,
} from '../collection-analytics.utils'

describe('collection-analytics.utils — F-04', () => {
  it('resolveAcademicSessionId extrait la session courante du guichet', () => {
    expect(resolveAcademicSessionId({ currentAcademicSessionId: 12 })).toBe(12)
    expect(resolveAcademicSessionId({ currentAcademicSessionId: null })).toBeNull()
    expect(resolveAcademicSessionId(undefined)).toBeNull()
  })

  it('normalizeCollectionAnalytics mappe le résumé backend', () => {
    const summary = normalizeCollectionAnalytics({
      monthlyRevenue: 125_000,
      growth: 15_000,
      collectionEfficiency: 72.5,
      totalReceivables: 38_000,
    })

    expect(summary).toEqual({
      monthlyRevenue: 125_000,
      growth: 15_000,
      collectionEfficiency: 72.5,
      totalReceivables: 38_000,
    })
  })

  it('retourne null pour payload invalide', () => {
    expect(normalizeCollectionAnalytics(null)).toBeNull()
    expect(normalizeCollectionAnalytics('bad')).toBeNull()
  })
})
