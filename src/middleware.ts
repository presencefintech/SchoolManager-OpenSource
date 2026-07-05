import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import type { UserRole } from '@/types/auth'
import { ROLE_HOME } from '@/types/auth'
import { decodeAccessToken } from '@/lib/auth/verify-access-token'

const PUBLIC_PATHS = ['/login', '/forgot-password', '/reset-password', '/verify-email', '/activate']

const ROLE_PREFIXES: Record<UserRole, string> = {
  ADMIN: '/admin',
  SUPER_ADMIN: '/super-admin',
  FINANCE: '/finances',
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

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

  if (isPublic && pathname !== '/verify-email' && pathname !== '/activate') {
    return NextResponse.redirect(new URL(ROLE_HOME[role], request.url))
  }

  const allowedPrefix = ROLE_PREFIXES[role]
  const isInWrongSection = Object.entries(ROLE_PREFIXES).some(
    ([r, prefix]) => r !== role && pathname.startsWith(prefix),
  )
  if (isInWrongSection) {
    return NextResponse.redirect(new URL(ROLE_HOME[role], request.url))
  }
  if (pathname === '/' || pathname === allowedPrefix) {
    return NextResponse.redirect(new URL(ROLE_HOME[role], request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api).*)'],
}
