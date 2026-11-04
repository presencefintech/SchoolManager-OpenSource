import { isAuthSessionFailure } from '../session-failure'

describe('isAuthSessionFailure', () => {
  it('reconnaît AUTH_REQUIRED', () => {
    expect(isAuthSessionFailure({ code: 'AUTH_REQUIRED', message: 'Session expirée' }, 401)).toBe(true)
  })

  it('ne traite pas une école manquante comme une déconnexion', () => {
    expect(
      isAuthSessionFailure({ success: false, message: 'Identification scolaire manquante' }, 401),
    ).toBe(false)
    expect(
      isAuthSessionFailure({ code: 'SCHOOL_CONTEXT_MISSING', message: 'École non identifiée' }, 403),
    ).toBe(false)
  })

  it('ignore un 403 mot de passe obligatoire', () => {
    expect(isAuthSessionFailure({ code: 'PASSWORD_CHANGE_REQUIRED' }, 403)).toBe(false)
  })

  it('traite un 401 sans corps comme une session à rafraîchir / potentiellement morte', () => {
    expect(isAuthSessionFailure(undefined, 401)).toBe(true)
    expect(isAuthSessionFailure({}, 401)).toBe(false)
  })
})
