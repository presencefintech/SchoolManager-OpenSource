import { describe, expect, it } from '@jest/globals'
import { presentClassRanking } from '../class-collection-rank'

describe('presentClassRanking', () => {
  it('affiche le rang, le taux et les montants sans recalculer', () => {
    const [first, second] = presentClassRanking([
      {
        classId: 1,
        className: '6ème',
        studentCount: 30,
        expectedUsd: 1000,
        paidUsd: 800,
        collectionRatePct: 80,
      },
      {
        classId: 2,
        className: '1ère',
        studentCount: 0,
        expectedUsd: 0,
        paidUsd: 0,
        collectionRatePct: 0,
      },
    ])

    expect(first.rank).toBe(1)
    expect(first.rateLabel).toBe('80 %')
    expect(first.paidLabel).toMatch(/800/)
    expect(first.expectedLabel).toMatch(/1[\s\u202f]?000/)
    expect(first.tone).toBe('high')
    expect(first.barPct).toBe(80)
    expect(second.rank).toBe(2)
    expect(second.tone).toBe('empty')
    expect(second.studentLabel).toBe('Aucun élève')
    expect(second.rateLabel).toBe('0 %')
  })

  it('reste vide si le classement n’est pas encore chargé', () => {
    expect(presentClassRanking(null)).toEqual([])
  })
})
