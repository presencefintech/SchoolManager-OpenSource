import { findSectionById, isRdcCycleWithoutOption, sectionRequiresOption } from '../rdc-section-cycle'

describe('rdc-section-cycle', () => {
  it('détecte maternelle / primaire par nom', () => {
    expect(isRdcCycleWithoutOption({ name: 'Maternelle' })).toBe(true)
    expect(isRdcCycleWithoutOption({ name: 'Section Primaire' })).toBe(true)
    expect(isRdcCycleWithoutOption({ name: 'Enseignement fondamental' })).toBe(true)
  })

  it('n’exige la filière qu’au secondaire', () => {
    expect(sectionRequiresOption({ name: 'Secondaire' }, 0)).toBe(true)
    expect(sectionRequiresOption({ name: 'Primaire' }, 4)).toBe(false)
    expect(sectionRequiresOption({ name: 'Maternelle' }, 2)).toBe(false)
    expect(sectionRequiresOption({ name: 'Cycle A' }, 3)).toBe(false)
    expect(sectionRequiresOption(undefined, 2)).toBe(false)
    expect(sectionRequiresOption({ name: 'Cycle 1', requiresOption: false })).toBe(false)
    expect(sectionRequiresOption({ name: 'Cycle 1', requiresOption: true })).toBe(true)
  })

  it('retrouve une section même si l’id arrive en string', () => {
    const sections = [{ id: '12' as unknown as number, name: 'Primaire' }]
    expect(findSectionById(sections, 12)?.name).toBe('Primaire')
  })
})
