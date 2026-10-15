export type UserRole =
  | 'ADMIN'
  | 'SUPER_ADMIN'
  | 'FINANCE'
  | 'DIRECTOR'
  | 'IT'
  | 'TEACHER'
  | 'PARENT'
  | 'PROMOTER'
  | 'SUPER_ADMIN_NETWORK'

export interface AuthUser {
  id: number
  uuid: string
  email: string
  phone?: string | null
  pendingPhone?: string | null
  firstName: string
  lastName: string
  role: UserRole
  schoolId: number | null
  /** SchoolNetwork / SchoolGroup — promoteurs multi-campus. */
  networkId?: number | null
  isEmailConfirmed?: boolean
  mustChangePassword?: boolean
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
  TEACHER: '/teacher/dashboard',
  PARENT: '/parent/dashboard',
  PROMOTER: '/admin/network',
  SUPER_ADMIN_NETWORK: '/admin/network',
}

/**
 * Rôles autorisés sur le portail web (dont TEACHER pour le cahier de notes).
 * PARENT : PWA parents (miroir de l’app mobile).
 */
export function isWebRole(role: string): role is UserRole {
  return role in ROLE_HOME
}

/** Préfixes d’URL autorisés par rôle (IT = sous-ensemble admin guichet). */
export const ROLE_ALLOWED_PREFIXES: Record<UserRole, string[]> = {
  ADMIN: ['/admin'],
  SUPER_ADMIN: ['/super-admin'],
  FINANCE: ['/finances'],
  /** Préfet (DIRECTOR) : portail direction + délibérations admin. */
  DIRECTOR: ['/director', '/admin/deliberations'],
  TEACHER: ['/teacher'],
  PARENT: ['/parent'],
  PROMOTER: ['/admin'],
  SUPER_ADMIN_NETWORK: ['/admin'],
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

/**
 * IT = guichet ops élèves hors montants finance.
 * Photos, batch, cartes, inscriptions = autorisés ; soldes / caisse = verrouillés.
 */
export function canItManageStudentOps(role?: UserRole | null): boolean {
  return role === 'IT' || role === 'ADMIN' || role === 'SUPER_ADMIN' || role === 'DIRECTOR'
}

/** Montants / ledger / attribution frais chiffrée — fermé pour IT. */
export function isFinanceLockedForRole(role?: UserRole | null): boolean {
  return role === 'IT'
}

/** Field-level security : montants ledger = ADMIN / FINANCE / SUPER_ADMIN, ou capacité école. */
export function canSeeFinanceAmounts(
  role?: UserRole | null,
  schoolAllow?: boolean | null,
): boolean {
  if (role === 'ADMIN' || role === 'SUPER_ADMIN' || role === 'FINANCE') return true
  return schoolAllow === true
}
