export type UserRole = 'ADMIN' | 'SUPER_ADMIN' | 'FINANCE'

export interface AuthUser {
  id: number
  uuid: string
  email: string
  firstName: string
  lastName: string
  role: UserRole
  schoolId: number
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
}
