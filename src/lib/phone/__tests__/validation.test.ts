import { formatPhoneToE164, isValidInternationalPhone } from '../validation'

describe('phone validation', () => {
  it('accepte un mobile RDC valide', () => {
    expect(isValidInternationalPhone('+243810000000')).toBe(true)
    expect(formatPhoneToE164('+243810000000')).toBe('+243810000000')
  })

  it('accepte un mobile France valide', () => {
    expect(isValidInternationalPhone('+33612345678')).toBe(true)
    expect(formatPhoneToE164('+33612345678')).toBe('+33612345678')
  })

  it('rejette une ligne fixe France (non SMS)', () => {
    expect(isValidInternationalPhone('+33142681234')).toBe(false)
  })

  it('rejette un numéro trop court', () => {
    expect(isValidInternationalPhone('+24381')).toBe(false)
  })
})
