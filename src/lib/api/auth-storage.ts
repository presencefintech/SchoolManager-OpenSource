import type { AuthUser, LoginResponse } from '@/types/auth'

const AUTH_TOKEN_KEY = 'auth_token'
const AUTH_ROLE_KEY = 'auth_role'
const AUTH_REFRESH_TOKEN_KEY = 'auth_refresh_token'
const AUTH_USER_KEY = 'auth_user'
const AUTH_SCHOOL_ID_KEY = 'auth_school_id'

export function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null
  const match = document.cookie.match(new RegExp(`(?:^|; )${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}=([^;]*)`))
  return match ? decodeURIComponent(match[1]) : null
}

function setCookie(name: string, value: string) {
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : ''
  document.cookie = `${name}=${encodeURIComponent(value)}; path=/; SameSite=Lax${secure}`
}

function deleteCookie(name: string) {
  document.cookie = `${name}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`
}

export function getAuthToken(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem(AUTH_TOKEN_KEY) ?? getCookie(AUTH_TOKEN_KEY)
}

export function getAuthSchoolId(): string | null {
  if (typeof window === 'undefined') return null
  const schoolId = localStorage.getItem(AUTH_SCHOOL_ID_KEY)
  return schoolId && schoolId !== 'null' ? schoolId : null
}

export function clearAuthStorage(): void {
  if (typeof window === 'undefined') return
  localStorage.removeItem(AUTH_TOKEN_KEY)
  localStorage.removeItem(AUTH_REFRESH_TOKEN_KEY)
  localStorage.removeItem(AUTH_USER_KEY)
  localStorage.removeItem(AUTH_SCHOOL_ID_KEY)
  deleteCookie(AUTH_TOKEN_KEY)
  deleteCookie(AUTH_ROLE_KEY)
}

export function persistAuthSession(data: LoginResponse): void {
  localStorage.setItem(AUTH_TOKEN_KEY, data.token)
  localStorage.setItem(AUTH_REFRESH_TOKEN_KEY, data.refreshToken)
  localStorage.setItem(AUTH_USER_KEY, JSON.stringify(data.user))
  if (data.user.schoolId != null) {
    localStorage.setItem(AUTH_SCHOOL_ID_KEY, String(data.user.schoolId))
  } else {
    localStorage.removeItem(AUTH_SCHOOL_ID_KEY)
  }
  setCookie(AUTH_TOKEN_KEY, data.token)
  setCookie(AUTH_ROLE_KEY, data.user.role)
}

export function resyncAuthFromCookies(): { token: string | null; user: AuthUser | null } {
  if (typeof window === 'undefined') return { token: null, user: null }

  const cookieToken = getCookie(AUTH_TOKEN_KEY)
  if (cookieToken && !localStorage.getItem(AUTH_TOKEN_KEY)) {
    localStorage.setItem(AUTH_TOKEN_KEY, cookieToken)
  }

  const token = getAuthToken()
  const storedUser = localStorage.getItem(AUTH_USER_KEY)
  if (!storedUser) return { token, user: null }

  try {
    return { token, user: JSON.parse(storedUser) as AuthUser }
  } catch {
    localStorage.removeItem(AUTH_USER_KEY)
    return { token, user: null }
  }
}
