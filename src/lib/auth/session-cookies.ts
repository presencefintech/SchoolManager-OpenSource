import type { ResponseCookie } from 'next/dist/compiled/@edge-runtime/cookies'

export const AUTH_COOKIE = {
  access: 'auth_token',
  refresh: 'auth_refresh',
  school: 'auth_school_id',
  /** Backup session Superadmin pendant une impersonation (httpOnly) */
  saBackup: 'auth_sa_backup',
  saRefreshBackup: 'auth_sa_refresh_backup',
  saSchoolBackup: 'auth_sa_school_backup',
  /** Métadonnées UI bannière (non-httpOnly) */
  impersonation: 'auth_impersonation',
} as const

const isProd = process.env.NODE_ENV === 'production'

export const ACCESS_MAX_AGE = 2 * 60 * 60 // 2 h
export const REFRESH_MAX_AGE = 7 * 24 * 60 * 60 // 7 j
export const IMPERSONATE_MAX_AGE = 30 * 60 // 30 min

export type ImpersonationCookiePayload = {
  schoolId: number
  schoolName: string
  byUserId: number
  startedAt: string
}

export function buildAuthCookie(
  name: string,
  value: string,
  maxAge: number,
  httpOnly = true,
): ResponseCookie {
  return {
    name,
    value,
    httpOnly,
    secure: isProd,
    sameSite: 'lax',
    path: '/',
    maxAge,
  }
}

export function clearAuthCookies(): ResponseCookie[] {
  const names = [
    AUTH_COOKIE.access,
    AUTH_COOKIE.refresh,
    AUTH_COOKIE.school,
    AUTH_COOKIE.saBackup,
    AUTH_COOKIE.saRefreshBackup,
    AUTH_COOKIE.saSchoolBackup,
    AUTH_COOKIE.impersonation,
  ]
  return names.map((name) => ({
    name,
    value: '',
    httpOnly: name !== AUTH_COOKIE.school && name !== AUTH_COOKIE.impersonation && name !== AUTH_COOKIE.saSchoolBackup,
    secure: isProd,
    sameSite: 'lax' as const,
    path: '/',
    maxAge: 0,
  }))
}

export function encodeImpersonationCookie(payload: ImpersonationCookiePayload): string {
  return encodeURIComponent(JSON.stringify(payload))
}

export function decodeImpersonationCookie(raw: string | undefined | null): ImpersonationCookiePayload | null {
  if (!raw) return null
  try {
    const parsed = JSON.parse(decodeURIComponent(raw)) as ImpersonationCookiePayload
    if (!parsed?.schoolId || !parsed?.schoolName) return null
    return parsed
  } catch {
    try {
      const parsed = JSON.parse(raw) as ImpersonationCookiePayload
      if (!parsed?.schoolId || !parsed?.schoolName) return null
      return parsed
    } catch {
      return null
    }
  }
}

export function getBackendUrl(): string {
  return process.env.API_URL ?? 'http://localhost:5000'
}
