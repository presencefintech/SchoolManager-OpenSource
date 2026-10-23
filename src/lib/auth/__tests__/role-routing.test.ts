import {
  ROLE_ALLOWED_PREFIXES,
  ROLE_HOME,
  canSeeFinanceAmounts,
  hasWebRole,
  isItDesk,
  isPromoterRole,
  isWebRole,
  pathAllowedForRole,
} from '@/types/auth'

describe('isWebRole', () => {
  it('accepte les rôles du portail web', () => {
    for (const role of Object.keys(ROLE_HOME)) expect(isWebRole(role)).toBe(true)
  })

  it('accepte TEACHER et PARENT, refuse un rôle inconnu', () => {
    expect(isWebRole('TEACHER')).toBe(true)
    expect(isWebRole('PARENT')).toBe(true)
    expect(isWebRole('STUDENT')).toBe(false)
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
    expect(pathAllowedForRole('PARENT', '/parent/finance')).toBe(true)
    expect(pathAllowedForRole('PARENT', '/teacher/grades')).toBe(false)
    expect(pathAllowedForRole('ADMIN', '/parent/dashboard')).toBe(false)
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

describe('MANAGER (Gérant) — union FINANCE + IT + DIRECTOR, jamais ADMIN', () => {
  it('peut se connecter au web et arrive sur la caisse', () => {
    expect(isWebRole('MANAGER')).toBe(true)
    expect(ROLE_HOME.MANAGER).toBe('/finances/dashboard')
  })

  it.each([
    '/finances/caisse', // casquette FINANCE
    '/finances/verifications',
    '/admin/desk', // casquette IT
    '/admin/enrollments',
    '/admin/students/12',
    '/admin/finance/controle',
    '/director/dashboard', // casquette DIRECTOR
    '/admin/deliberations',
  ])('ouvre %s', (path) => {
    expect(pathAllowedForRole('MANAGER', path)).toBe(true)
  })

  it.each([
    '/admin/dashboard', // tableau de bord du Promoteur
    '/admin/settings', // paramétrage système
    '/admin/staff',
    '/admin/finance/factures', // barèmes et catégories tarifaires
    '/admin/finance/remises', // décisions du Promoteur
    '/admin/finance/seuils',
    '/admin/finance/remboursements',
    '/admin/finance/payment-profile',
    '/super-admin/dashboard',
  ])('refuse %s', (path) => {
    expect(pathAllowedForRole('MANAGER', path)).toBe(false)
  })

  it('ses accès sont exactement l’union des trois métiers', () => {
    const union = new Set([
      ...ROLE_ALLOWED_PREFIXES.FINANCE,
      ...ROLE_ALLOWED_PREFIXES.IT,
      ...ROLE_ALLOWED_PREFIXES.DIRECTOR,
    ])
    expect(new Set(ROLE_ALLOWED_PREFIXES.MANAGER)).toEqual(union)
  })

  it('cumule les métiers, sans les pouvoirs du Promoteur', () => {
    expect(hasWebRole('MANAGER', 'FINANCE')).toBe(true)
    expect(hasWebRole('MANAGER', 'IT')).toBe(true)
    expect(hasWebRole('MANAGER', 'DIRECTOR')).toBe(true)
    expect(isItDesk('MANAGER')).toBe(true)
    expect(canSeeFinanceAmounts('MANAGER')).toBe(true)
    expect(isPromoterRole('MANAGER')).toBe(false)
  })

  it('les rôles simples gardent leur comportement', () => {
    expect(hasWebRole('FINANCE', 'IT')).toBe(false)
    expect(hasWebRole('IT', 'IT')).toBe(true)
    expect(isItDesk('FINANCE')).toBe(false)
    expect(isItDesk('DIRECTOR')).toBe(false)
    expect(canSeeFinanceAmounts('IT')).toBe(false)
  })
})
