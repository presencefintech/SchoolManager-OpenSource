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

  it('ne montre pas un code PARENT_* ni un message Prisma', () => {
    expect(
      resolveApiErrorMessage({
        code: 'PARENT_PENDING_ACTIVATION_NOT_FOUND',
        message: 'Erreur lors du traitement en base de données',
      }),
    ).toMatch(/Aucun compte parent en attente/)
    expect(
      resolveApiErrorMessage({ message: 'Erreur base de données (P2002)' }),
    ).toMatch(/Réessayez/)
  })
})
