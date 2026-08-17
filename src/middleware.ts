import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import type { UserRole } from '@/types/auth'
import { ROLE_HOME, isWebRole, pathAllowedForRole } from '@/types/auth'
import { decodeAccessToken } from '@/lib/auth/verify-access-token'
import { AUTH_COOKIE, decodeImpersonationCookie } from '@/lib/auth/session-cookies'

const PUBLIC_PATHS = ['/login', '/forgot-password', '/reset-password', '/verify-email', '/activate', '/verify', '/cgu', '/confidentialite']

const EXCLUSIVE_PREFIXES: Record<UserRole, string> = {
  ADMIN: '/admin',
  SUPER_ADMIN: '/super-admin',
  FINANCE: '/finances',
  DIRECTOR: '/director',
  IT: '/admin',
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (pathname.startsWith('/.well-known/')) {
    return NextResponse.next()
  }

  const token = request.cookies.get('auth_token')?.value
  const isPublic = PUBLIC_PATHS.some((p) => pathname.startsWith(p))

  if (!token && !isPublic) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  if (!token) {
    return NextResponse.next()
  }

  const session = decodeAccessToken(token)
  if (!session) {
    const res = NextResponse.redirect(new URL('/login', request.url))
    res.cookies.delete('auth_token')
    res.cookies.delete('auth_refresh')
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
    return NextResponse.redirect(new URL('/admin/dashboard', request.url))
  }

  if (!isWebRole(role)) {
    const res = NextResponse.redirect(new URL('/login?error=role_not_supported', request.url))
    res.cookies.delete('auth_token')
    res.cookies.delete('auth_refresh')
    return res
  }

  if (isPublic && pathname !== '/verify-email' && pathname !== '/activate' && !pathname.startsWith('/verify')) {
    return NextResponse.redirect(new URL(ROLE_HOME[role], request.url))
  }

  const inAppSection = Object.values(EXCLUSIVE_PREFIXES).some((prefix) => pathname.startsWith(prefix))
  if (inAppSection && !pathAllowedForRole(role, pathname)) {
    return NextResponse.redirect(new URL(ROLE_HOME[role], request.url))
  }
  if (pathname === '/' || pathname === EXCLUSIVE_PREFIXES[role]) {
    return NextResponse.redirect(new URL(ROLE_HOME[role], request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|api|\\.well-known|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|json|txt|woff|woff2|ttf)$).*)',
  ],
}
