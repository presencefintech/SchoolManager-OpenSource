import { ROLE_HOME, isWebRole, pathAllowedForRole } from '@/types/auth'

describe('isWebRole', () => {
  it('accepte les rôles du portail web', () => {
    for (const role of Object.keys(ROLE_HOME)) expect(isWebRole(role)).toBe(true)
  })

  it('accepte TEACHER (cahier de notes web) et refuse PARENT', () => {
    expect(isWebRole('TEACHER')).toBe(true)
    expect(isWebRole('PARENT')).toBe(false)
  })
})

describe('pathAllowedForRole', () => {
  it("autorise chaque rôle sur sa page d'accueil", () => {
    for (const [role, home] of Object.entries(ROLE_HOME)) {
      expect(pathAllowedForRole(role as keyof typeof ROLE_HOME, home)).toBe(true)
    }
  })

  it('cloisonne les espaces entre rôles', () => {
    expect(pathAllowedForRole('FINANCE', '/admin/dashboard')).toBe(false)
    expect(pathAllowedForRole('ADMIN', '/super-admin/dashboard')).toBe(false)
    expect(pathAllowedForRole('DIRECTOR', '/finances/caisse')).toBe(false)
    expect(pathAllowedForRole('TEACHER', '/admin/dashboard')).toBe(false)
    expect(pathAllowedForRole('TEACHER', '/teacher/grades')).toBe(true)
  })

  it('limite IT au sous-ensemble guichet', () => {
    expect(pathAllowedForRole('IT', '/admin/students/12')).toBe(true)
    expect(pathAllowedForRole('IT', '/admin/finance/controle')).toBe(true)
    expect(pathAllowedForRole('IT', '/admin/finance/caisse')).toBe(false)
    expect(pathAllowedForRole('IT', '/admin/settings')).toBe(false)
  })

  it("ne se laisse pas tromper par un préfixe partiel", () => {
    expect(pathAllowedForRole('ADMIN', '/administration')).toBe(false)
    expect(pathAllowedForRole('IT', '/admin/desk-extra')).toBe(false)
  })
})
