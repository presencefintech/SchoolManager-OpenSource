import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import type { UserRole } from '@/types/auth'
import { ROLE_HOME } from '@/types/auth'

const PUBLIC_PATHS = ['/login']

const ROLE_PREFIXES: Record<UserRole, string> = {
  ADMIN: '/admin',
  SUPER_ADMIN: '/super-admin',
  FINANCE: '/finances',
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  const token = request.cookies.get('auth_token')?.value
  const role = request.cookies.get('auth_role')?.value as UserRole | undefined

  const isPublic = PUBLIC_PATHS.some((p) => pathname.startsWith(p))

  // Unauthenticated → login
  if (!token && !isPublic) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // Authenticated on login → redirect to role home
  if (token && role && isPublic) {
    return NextResponse.redirect(new URL(ROLE_HOME[role], request.url))
  }

  // Authenticated but wrong role section → redirect to own home
  if (token && role) {
    const allowedPrefix = ROLE_PREFIXES[role]
    const isInWrongSection = Object.entries(ROLE_PREFIXES).some(
      ([r, prefix]) => r !== role && pathname.startsWith(prefix),
    )
    if (isInWrongSection) {
      return NextResponse.redirect(new URL(ROLE_HOME[role], request.url))
    }
    // Accessing root or bare role prefix → redirect to role home
    if (pathname === '/' || pathname === allowedPrefix) {
      return NextResponse.redirect(new URL(ROLE_HOME[role], request.url))
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api).*)'],
}
