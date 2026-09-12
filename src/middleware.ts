import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import type { UserRole } from '@/types/auth'
import { ROLE_HOME, isWebRole, pathAllowedForRole } from '@/types/auth'
import { decodeAccessToken } from '@/lib/auth/verify-access-token'
import {
  ACCESS_MAX_AGE,
  AUTH_COOKIE,
  REFRESH_MAX_AGE,
  buildAuthCookie,
  decodeImpersonationCookie,
  getBackendUrl,
} from '@/lib/auth/session-cookies'

const PUBLIC_PATHS = ['/login', '/forgot-password', '/reset-password', '/verify-email', '/activate', '/verify', '/cgu', '/confidentialite']

const EXCLUSIVE_PREFIXES: Record<UserRole, string> = {
  ADMIN: '/admin',
  SUPER_ADMIN: '/super-admin',
  FINANCE: '/finances',
  DIRECTOR: '/director',
  IT: '/admin',
}

async function refreshAccessFromCookie(refreshToken: string): Promise<{
  token: string
  refreshToken?: string
} | null> {
  try {
    const upstream = await fetch(`${getBackendUrl()}/api/v1/auth/refresh-token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    })
    if (!upstream.ok) return null
    const data = (await upstream.json().catch(() => ({}))) as {
      token?: string
      refreshToken?: string
    }
    if (!data.token) return null
    return { token: data.token, refreshToken: data.refreshToken }
  } catch {
    return null
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (pathname.startsWith('/.well-known/')) {
    return NextResponse.next()
  }

  let token = request.cookies.get(AUTH_COOKIE.access)?.value
  const refreshToken = request.cookies.get(AUTH_COOKIE.refresh)?.value
  const isPublic = PUBLIC_PATHS.some((p) => pathname.startsWith(p))

  if (!token && !refreshToken && !isPublic) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  if (!token && !refreshToken) {
    return NextResponse.next()
  }

  let session = token ? decodeAccessToken(token) : null
  let refreshed: { token: string; refreshToken?: string } | null = null

  if (!session && refreshToken) {
    refreshed = await refreshAccessFromCookie(refreshToken)
    if (refreshed?.token) {
      token = refreshed.token
      session = decodeAccessToken(token)
    }
  }

  if (!session) {
    const res = isPublic
      ? NextResponse.next()
      : NextResponse.redirect(new URL('/login', request.url))
    res.cookies.delete(AUTH_COOKIE.access)
    // Refresh déjà tenté et mort : le garder provoquerait une boucle /login.
    if (refreshToken) res.cookies.delete(AUTH_COOKIE.refresh)
    return res
  }

  const role = session.role
  const impersonation =
    decodeImpersonationCookie(request.cookies.get(AUTH_COOKIE.impersonation)?.value) ||
    (session.impersonatedBy != null
      ? {
          schoolId: session.schoolId ?? 0,
          schoolName: '',
          byUserId: session.impersonatedBy,
          startedAt: '',
        }
      : null)

  if (impersonation && pathname.startsWith('/super-admin')) {
    return attachRefreshedCookies(
      NextResponse.redirect(new URL('/admin/dashboard', request.url)),
      refreshed,
    )
  }

  if (!isWebRole(role)) {
    const res = NextResponse.redirect(new URL('/login?error=role_not_supported', request.url))
    res.cookies.delete(AUTH_COOKIE.access)
    res.cookies.delete(AUTH_COOKIE.refresh)
    return res
  }

  if (isPublic && pathname !== '/verify-email' && pathname !== '/activate' && !pathname.startsWith('/verify')) {
    return attachRefreshedCookies(
      NextResponse.redirect(new URL(ROLE_HOME[role], request.url)),
      refreshed,
    )
  }

  const inAppSection = Object.values(EXCLUSIVE_PREFIXES).some((prefix) => pathname.startsWith(prefix))
  if (inAppSection && !pathAllowedForRole(role, pathname)) {
    return attachRefreshedCookies(
      NextResponse.redirect(new URL(ROLE_HOME[role], request.url)),
      refreshed,
    )
  }
  if (pathname === '/' || pathname === EXCLUSIVE_PREFIXES[role]) {
    return attachRefreshedCookies(
      NextResponse.redirect(new URL(ROLE_HOME[role], request.url)),
      refreshed,
    )
  }

  return attachRefreshedCookies(NextResponse.next(), refreshed)
}

function attachRefreshedCookies(
  res: NextResponse,
  refreshed: { token: string; refreshToken?: string } | null,
): NextResponse {
  if (!refreshed?.token) return res
  res.cookies.set(buildAuthCookie(AUTH_COOKIE.access, refreshed.token, ACCESS_MAX_AGE, true))
  if (refreshed.refreshToken) {
    res.cookies.set(buildAuthCookie(AUTH_COOKIE.refresh, refreshed.refreshToken, REFRESH_MAX_AGE, true))
  }
  return res
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|api|\\.well-known|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|json|txt|woff|woff2|ttf)$).*)',
  ],
}
