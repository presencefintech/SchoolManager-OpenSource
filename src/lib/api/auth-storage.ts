import type { AuthUser, LoginResponse } from '@/types/auth'
import { clearPersistedQueryCache } from '@/lib/query/persist'

const AUTH_USER_KEY = 'auth_user'
export const AUTH_SCHOOL_ID_KEY = 'auth_school_id'

/** Session active côté client (tokens en cookies HttpOnly uniquement). */
const SESSION_MARKER = 'http-only-session'

let authHydrated = false

export function markAuthHydrated() {
  authHydrated = true
}

export function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null
  const match = document.cookie.match(new RegExp(`(?:^|; )${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}=([^;]*)`))
  return match ? decodeURIComponent(match[1]) : null
}

/** Indique qu'une session est active (pas le JWT — inaccessible en JS). */
export function getAuthToken(): string | null {
  if (typeof window === 'undefined' || !authHydrated) return null
  const user = localStorage.getItem(AUTH_USER_KEY)
  return user ? SESSION_MARKER : null
}

export function getAuthSchoolId(): string | null {
  if (typeof window === 'undefined' || !authHydrated) return null
  const fromStorage = localStorage.getItem(AUTH_SCHOOL_ID_KEY)
  if (fromStorage && fromStorage !== 'null' && fromStorage !== '0') return fromStorage
  const fromCookie = getCookie('auth_school_id')
  return fromCookie && fromCookie !== 'null' && fromCookie !== '0' ? fromCookie : null
}

/** Switch campus promoteur — pose `X-School-Id` pour le tenant actif. */
export function setAuthSchoolId(schoolId: string | number | null): void {
  if (typeof window === 'undefined') return
  if (schoolId == null || schoolId === '' || schoolId === 0 || schoolId === '0') {
    localStorage.removeItem(AUTH_SCHOOL_ID_KEY)
    return
  }
  localStorage.setItem(AUTH_SCHOOL_ID_KEY, String(schoolId))
}

export function getAuthRefreshToken(): string | null {
  return null
}

export function updateAuthTokens(_token: string, _refreshToken?: string): void {
  // Tokens gérés par cookies HttpOnly via /api/auth/*
}

export function redirectToLogin(): void {
  if (typeof window === 'undefined') return
  void fetch('/api/auth/logout', { method: 'POST', credentials: 'include' }).finally(() => {
    clearAuthStorage()
    if (!window.location.pathname.startsWith('/login')) {
      window.location.href = '/login'
    }
  })
}

export function clearAuthStorage(): void {
  if (typeof window === 'undefined') return
  localStorage.removeItem(AUTH_USER_KEY)
  localStorage.removeItem(AUTH_SCHOOL_ID_KEY)
  localStorage.removeItem('auth_token')
  localStorage.removeItem('auth_refresh_token')
  localStorage.removeItem('auth_role')
  // Next session on this device must never see the previous user's cached data.
  void clearPersistedQueryCache()
}

export function persistAuthSession(data: LoginResponse): void {
  localStorage.setItem(AUTH_USER_KEY, JSON.stringify(data.user))
  // SUPER_ADMIN / schoolId 0 : pas de cloisonnement école côté client
  if (
    data.user.role !== 'SUPER_ADMIN' &&
    data.user.schoolId != null &&
    Number(data.user.schoolId) > 0
  ) {
    localStorage.setItem(AUTH_SCHOOL_ID_KEY, String(data.user.schoolId))
  } else {
    localStorage.removeItem(AUTH_SCHOOL_ID_KEY)
  }
  markAuthHydrated()
}

export function resyncAuthFromCookies(): { token: string | null; user: AuthUser | null } {
  if (typeof window === 'undefined') return { token: null, user: null }

  const storedUser = localStorage.getItem(AUTH_USER_KEY)
  if (!storedUser) return { token: null, user: null }

  try {
    const user = JSON.parse(storedUser) as AuthUser
    return { token: SESSION_MARKER, user }
  } catch {
    localStorage.removeItem(AUTH_USER_KEY)
    return { token: null, user: null }
  }
}

export function persistUserProfile(user: AuthUser): void {
  localStorage.setItem(AUTH_USER_KEY, JSON.stringify(user))
  if (user.role !== 'SUPER_ADMIN' && user.schoolId != null && Number(user.schoolId) > 0) {
    localStorage.setItem(AUTH_SCHOOL_ID_KEY, String(user.schoolId))
  } else {
    localStorage.removeItem(AUTH_SCHOOL_ID_KEY)
  }
}
