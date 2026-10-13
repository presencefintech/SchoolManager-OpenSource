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
import { NONCE_HEADER, buildContentSecurityPolicy, generateNonce } from '@/lib/security/csp'

const PUBLIC_PATHS = ['/login', '/forgot-password', '/reset-password', '/verify-email', '/activate', '/verify', '/cgu', '/confidentialite']

const EXCLUSIVE_PREFIXES: Record<UserRole, string> = {
  ADMIN: '/admin',
  SUPER_ADMIN: '/super-admin',
  FINANCE: '/finances',
  DIRECTOR: '/director',
  TEACHER: '/teacher',
  IT: '/admin',
}

const REFRESH_TIMEOUT_MS = 8_000

type RefreshResult =
  | { token: string; refreshToken?: string }
  /** Backend injoignable ou trop lent : le refresh token reste peut-être valide. */
  | 'unavailable'
  | null

async function refreshAccessFromCookie(refreshToken: string): Promise<RefreshResult> {
  try {
    const upstream = await fetch(`${getBackendUrl()}/api/v1/auth/refresh-token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
      // Exécuté à chaque navigation : ne jamais bloquer la page sur un backend lent.
      signal: AbortSignal.timeout(REFRESH_TIMEOUT_MS),
    })
    if (!upstream.ok) return null
    const data = (await upstream.json().catch(() => ({}))) as {
      token?: string
      refreshToken?: string
    }
    if (!data.token) return null
    return { token: data.token, refreshToken: data.refreshToken }
  } catch {
    return 'unavailable'
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (pathname.startsWith('/.well-known/')) {
    return NextResponse.next()
  }

  // Nonce CSP par requête : transmis au rendu (Next le pose sur ses scripts) et renvoyé au navigateur.
  const nonce = generateNonce()
  const csp = buildContentSecurityPolicy(nonce)
  const requestHeaders = new Headers(request.headers)
  requestHeaders.set(NONCE_HEADER, nonce)
  requestHeaders.set('Content-Security-Policy', csp)
  const next = () => {
    const res = NextResponse.next({ request: { headers: requestHeaders } })
    res.headers.set('Content-Security-Policy', csp)
    return res
  }

  let token = request.cookies.get(AUTH_COOKIE.access)?.value
  const refreshToken = request.cookies.get(AUTH_COOKIE.refresh)?.value
  const isPublic = PUBLIC_PATHS.some((p) => pathname.startsWith(p))

  if (!token && !refreshToken && !isPublic) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  if (!token && !refreshToken) {
    return next()
  }

  let session = token ? decodeAccessToken(token) : null
  let refreshed: { token: string; refreshToken?: string } | null = null
  let backendUnavailable = false

  if (!session && refreshToken) {
    const result = await refreshAccessFromCookie(refreshToken)
    backendUnavailable = result === 'unavailable'
    refreshed = result === 'unavailable' ? null : result
    if (refreshed?.token) {
      token = refreshed.token
      session = decodeAccessToken(token)
    }
  }

  if (!session) {
    const res = isPublic
      ? next()
      : NextResponse.redirect(new URL('/login', request.url))
    res.cookies.delete(AUTH_COOKIE.access)
    // Refresh déjà tenté et mort : le garder provoquerait une boucle /login.
    // Sauf panne réseau / timeout : on le conserve pour ne pas déconnecter sur un backend lent.
    if (refreshToken && !backendUnavailable) res.cookies.delete(AUTH_COOKIE.refresh)
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
    const stayOnAuthForm =
      pathname.startsWith('/login') ||
      pathname.startsWith('/forgot-password') ||
      pathname.startsWith('/reset-password')
    if (stayOnAuthForm) {
      return attachRefreshedCookies(next(), refreshed)
    }
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

  return attachRefreshedCookies(next(), refreshed)
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
