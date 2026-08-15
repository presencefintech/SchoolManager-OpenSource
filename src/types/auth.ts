export type UserRole = 'ADMIN' | 'SUPER_ADMIN' | 'FINANCE' | 'DIRECTOR' | 'IT'

export interface AuthUser {
  id: number
  uuid: string
  email: string
  firstName: string
  lastName: string
  role: UserRole
  schoolId: number | null
  isEmailConfirmed?: boolean
}

export interface LoginPayload {
  identifier: string
  password: string
}

export interface LoginResponse {
  token: string
  refreshToken: string
  user: AuthUser
}

export const ROLE_HOME: Record<UserRole, string> = {
  ADMIN: '/admin/dashboard',
  SUPER_ADMIN: '/super-admin/dashboard',
  FINANCE: '/finances/dashboard',
  DIRECTOR: '/director/dashboard',
  IT: '/admin/desk',
}

/**
 * Le backend accepte aussi TEACHER/PARENT (app mobile) sur /auth/login — ce
 * portail web ne leur propose aucune destination. Vérifie l'appartenance
 * avant tout `ROLE_HOME[role]` pour éviter une redirection vers "/undefined".
 */
export function isWebRole(role: string): role is UserRole {
  return role in ROLE_HOME
}

/** Préfixes d’URL autorisés par rôle (IT = sous-ensemble admin guichet). */
export const ROLE_ALLOWED_PREFIXES: Record<UserRole, string[]> = {
  ADMIN: ['/admin'],
  SUPER_ADMIN: ['/super-admin'],
  FINANCE: ['/finances'],
  DIRECTOR: ['/director'],
  IT: [
    '/admin/inbox',
    '/admin/desk',
    '/admin/enrollments',
    '/admin/pre-enrollments',
    '/admin/students',
    '/admin/cards',
    '/admin/classes',
    '/admin/import',
    '/admin/schedule',
    '/admin/presences',
    '/admin/invitations',
    '/admin/announcements',
    '/admin/teachers',
    '/admin/files',
    '/admin/finance/controle',
    '/admin/profil-securite',
    '/verify',
  ],
}

export function pathAllowedForRole(role: UserRole, pathname: string): boolean {
  return ROLE_ALLOWED_PREFIXES[role].some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  )
}

export function isItDesk(role?: UserRole | null): boolean {
  return role === 'IT'
}

/** Field-level security : montants ledger = ADMIN / FINANCE / SUPER_ADMIN uniquement. */
export function canSeeFinanceAmounts(role?: UserRole | null): boolean {
  return role === 'ADMIN' || role === 'SUPER_ADMIN' || role === 'FINANCE'
}
