import {
  mapSecurityErrorCode,
  resolveApiErrorMessage,
  SECURITY_ERROR_CODES,
} from '../security-errors'

describe('security-errors', () => {
  it('mappe EMAIL_NOT_VERIFIED', () => {
    expect(mapSecurityErrorCode(SECURITY_ERROR_CODES.EMAIL_NOT_VERIFIED)).toMatch(/Confirmez votre adresse email/)
  })

  it('résout depuis un payload API avec code', () => {
    expect(
      resolveApiErrorMessage({ ok: false, code: 'ACCOUNT_LOCKED', message: 'ACCOUNT_LOCKED' }),
    ).toMatch(/verrouillé/)
  })

  it('mappe NO_ACTIVE_SESSION pour le guichet', () => {
    expect(mapSecurityErrorCode('NO_ACTIVE_SESSION')).toMatch(/année scolaire ouverte/)
  })

  it('préfère le message lisible au code brut', () => {
    expect(
      resolveApiErrorMessage({ message: 'Solde insuffisant pour cette opération.' }),
    ).toBe('Solde insuffisant pour cette opération.')
  })
})
