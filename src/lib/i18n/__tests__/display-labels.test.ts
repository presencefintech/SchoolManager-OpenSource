import { roleLabel } from '@/lib/i18n/display-labels'

describe('roleLabel', () => {
  it('affiche le Gérant en français, quelle que soit la casse renvoyée', () => {
    expect(roleLabel('MANAGER')).toBe('Gérant')
    expect(roleLabel('manager')).toBe('Gérant')
  })

  it('garde les libellés existants', () => {
    expect(roleLabel('DIRECTOR')).toBe('Directeur')
    expect(roleLabel('FINANCE')).toBe('Finance')
    expect(roleLabel(null)).toBe('—')
  })
})
