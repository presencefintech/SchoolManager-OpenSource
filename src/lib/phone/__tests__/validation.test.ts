import { formatPhoneToE164, isValidInternationalPhone } from '../validation'

describe('phone validation', () => {
  it('accepte un numéro RDC valide', () => {
    expect(isValidInternationalPhone('+243810000000')).toBe(true)
    expect(formatPhoneToE164('+243810000000')).toBe('+243810000000')
  })

  it('accepte un numéro France valide', () => {
    expect(isValidInternationalPhone('+33612345678')).toBe(true)
    expect(formatPhoneToE164('+33612345678')).toBe('+33612345678')
  })

  it('rejette un numéro trop court', () => {
    expect(isValidInternationalPhone('+24381')).toBe(false)
  })
})
