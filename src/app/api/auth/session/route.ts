import { NextRequest, NextResponse } from 'next/server'
import { AUTH_COOKIE, getBackendUrl } from '@/lib/auth/session-cookies'
import type { AuthUser } from '@/types/auth'

export async function GET(req: NextRequest) {
  const token = req.cookies.get(AUTH_COOKIE.access)?.value
  if (!token) {
    return NextResponse.json({ authenticated: false }, { status: 401 })
  }

  const upstream = await fetch(`${getBackendUrl()}/api/v1/auth/profile`, {
    headers: {
      Authorization: `Bearer ${token}`,
      ...(req.cookies.get(AUTH_COOKIE.school)?.value
        ? { 'x-school-id': req.cookies.get(AUTH_COOKIE.school)!.value }
        : {}),
    },
  })

  if (!upstream.ok) {
    return NextResponse.json({ authenticated: false }, { status: 401 })
  }

  const data = await upstream.json()
  const user = (data.user ?? data.data?.user ?? data) as AuthUser

  return NextResponse.json({
    authenticated: true,
    user,
    schoolId: req.cookies.get(AUTH_COOKIE.school)?.value ?? user?.schoolId ?? null,
  })
}
