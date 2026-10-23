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
  /** Gérant / Secrétaire général : FINANCE + IT + DIRECTOR, jamais ADMIN. */
  | 'MANAGER'

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
  /** La caisse est le cœur de l'exploitation quotidienne du Gérant. */
  MANAGER: '/finances/dashboard',
}

/** Métiers de base cumulés par un rôle composite (cf. rbac/effective-roles côté backend). */
export type BaseWebRole = 'FINANCE' | 'IT' | 'DIRECTOR'

const ROLE_COMPOSITION: Partial<Record<UserRole, readonly BaseWebRole[]>> = {
  MANAGER: ['FINANCE', 'IT', 'DIRECTOR'],
}

/** Le rôle exerce-t-il ce métier (directement ou par composition) ? */
export function hasWebRole(role: UserRole | null | undefined, base: BaseWebRole): boolean {
  if (!role) return false
  return role === base || (ROLE_COMPOSITION[role]?.includes(base) ?? false)
}

export function isManagerRole(role?: UserRole | null): boolean {
  return role === 'MANAGER'
}

/**
 * Rôles autorisés sur le portail web (dont TEACHER pour le cahier de notes).
 * PARENT : PWA parents (miroir de l’app mobile).
 */
export function isWebRole(role: string): role is UserRole {
  return role in ROLE_HOME
}

const IT_ALLOWED_PREFIXES = [
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
]
const FINANCE_ALLOWED_PREFIXES = ['/finances']
/** Préfet (DIRECTOR) : portail direction + délibérations admin. */
const DIRECTOR_ALLOWED_PREFIXES = ['/director', '/admin/deliberations']

/** Préfixes d’URL autorisés par rôle (IT = sous-ensemble admin guichet). */
export const ROLE_ALLOWED_PREFIXES: Record<UserRole, string[]> = {
  ADMIN: ['/admin'],
  SUPER_ADMIN: ['/super-admin'],
  FINANCE: FINANCE_ALLOWED_PREFIXES,
  DIRECTOR: DIRECTOR_ALLOWED_PREFIXES,
  TEACHER: ['/teacher'],
  PARENT: ['/parent'],
  PROMOTER: ['/admin'],
  SUPER_ADMIN_NETWORK: ['/admin'],
  IT: IT_ALLOWED_PREFIXES,
  /**
   * Union exacte des trois métiers : chaque espace (caisse, guichet, direction) tel quel.
   * Jamais /admin entier : ni barèmes, ni paramétrage, ni validations du Promoteur.
   */
  MANAGER: [...new Set([...FINANCE_ALLOWED_PREFIXES, ...IT_ALLOWED_PREFIXES, ...DIRECTOR_ALLOWED_PREFIXES])],
}

export function pathAllowedForRole(role: UserRole, pathname: string): boolean {
  return ROLE_ALLOWED_PREFIXES[role].some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  )
}

/**
 * Mode guichet de l'espace /admin (pages ouvertes à IT) : actions d'administration masquées.
 * Le Gérant y exerce sa casquette IT ; il a la vue chiffrée complète dans /finances.
 */
export function isItDesk(role?: UserRole | null): boolean {
  return hasWebRole(role, 'IT')
}

/**
 * Promoteur : applique directement remises et exonérations, valide les paiements
 * au-dessus du seuil. Même liste que SCHOOL_ADMIN_ROLES (isSchoolAdminRole) côté backend.
 */
export function isPromoterRole(role?: UserRole | null): boolean {
  return (
    role === 'ADMIN' || role === 'SUPER_ADMIN' || role === 'PROMOTER' || role === 'SUPER_ADMIN_NETWORK'
  )
}

/**
 * IT = guichet ops élèves hors montants finance.
 * Photos, batch, cartes, inscriptions = autorisés ; soldes / caisse = verrouillés.
 */
export function canItManageStudentOps(role?: UserRole | null): boolean {
  return role === 'ADMIN' || role === 'SUPER_ADMIN' || hasWebRole(role, 'IT') || hasWebRole(role, 'DIRECTOR')
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
  if (role === 'ADMIN' || role === 'SUPER_ADMIN' || hasWebRole(role, 'FINANCE')) return true
  return schoolAllow === true
}
