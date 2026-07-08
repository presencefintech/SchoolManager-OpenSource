import { asFeeStructureList, normalizeFeeStructureListItem } from '@/lib/finance/fee-structure.utils'

describe('fee-structure.utils', () => {
  it('extrait items depuis une réponse paginée', () => {
    const list = asFeeStructureList({
      items: [
        { id: 1, description: 'Scolarité T1', amount: 150 },
        { id: 2, category: { name: 'Inscription' }, amount: 50 },
      ],
      total: 2,
      page: 1,
      limit: 50,
    })

    expect(list).toHaveLength(2)
    expect(list[0]).toMatchObject({ id: 1, label: 'Scolarité T1', amount: 150 })
    expect(list[1]).toMatchObject({ id: 2, label: 'Inscription', amount: 50 })
  })

  it('retourne un tableau vide si la réponse est invalide', () => {
    expect(asFeeStructureList(null)).toEqual([])
    expect(asFeeStructureList({})).toEqual([])
  })

  it('utilise label explicite ou scopeKey en secours', () => {
    expect(
      normalizeFeeStructureListItem({ id: 3, label: 'Frais bus', amount: 20 }),
    ).toMatchObject({ label: 'Frais bus' })

    expect(
      normalizeFeeStructureListItem({ id: 4, scopeKey: 'GLOBAL', amount: 10 }),
    ).toMatchObject({ label: 'GLOBAL' })
  })
})
