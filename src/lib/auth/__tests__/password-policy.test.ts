import {
  evaluateStaffPassword,
  mapActivateErrorMessage,
  staffPasswordStrength,
  STAFF_PASSWORD_REGEX,
} from '../password-policy'

describe('password-policy', () => {
  it('valide un mot de passe robuste staff', () => {
    expect(STAFF_PASSWORD_REGEX.test('Presence2026!')).toBe(true)
    expect(staffPasswordStrength('Presence2026!')).toBe(5)
  })

  it('évalue les exigences individuellement', () => {
    const reqs = evaluateStaffPassword('abc')
    expect(reqs.find((r) => r.id === 'length')?.met).toBe(false)
    expect(reqs.find((r) => r.id === 'upper')?.met).toBe(false)
  })

  it('mappe les erreurs token invitation', () => {
    expect(mapActivateErrorMessage('TOKEN_EXPIRED_OR_INVALID')).toMatch(/invalide ou a expiré/i)
  })

  it('ne confond pas une validation de formulaire avec un lien expiré', () => {
    expect(mapActivateErrorMessage('Données invalides')).toBe('Données invalides')
  })

  it('mappe un OTP WhatsApp incorrect sans le confondre avec un token invalide', () => {
    expect(mapActivateErrorMessage('INVALID_OTP')).toMatch(/SMS/i)
  })
})
