import type { ResponseCookie } from 'next/dist/compiled/@edge-runtime/cookies'

export const AUTH_COOKIE = {
  access: 'auth_token',
  refresh: 'auth_refresh',
  school: 'auth_school_id',
} as const

const isProd = process.env.NODE_ENV === 'production'

export const ACCESS_MAX_AGE = 2 * 60 * 60 // 2 h
export const REFRESH_MAX_AGE = 7 * 24 * 60 * 60 // 7 j

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
  return [
    { name: AUTH_COOKIE.access, value: '', httpOnly: true, secure: isProd, sameSite: 'lax', path: '/', maxAge: 0 },
    { name: AUTH_COOKIE.refresh, value: '', httpOnly: true, secure: isProd, sameSite: 'lax', path: '/', maxAge: 0 },
    { name: AUTH_COOKIE.school, value: '', httpOnly: false, secure: isProd, sameSite: 'lax', path: '/', maxAge: 0 },
  ]
}

export function getBackendUrl(): string {
  return process.env.API_URL ?? 'http://localhost:5000'
}
