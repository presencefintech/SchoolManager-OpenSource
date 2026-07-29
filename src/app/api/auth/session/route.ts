import { NextRequest, NextResponse } from 'next/server'
import { AUTH_COOKIE, getBackendUrl } from '@/lib/auth/session-cookies'
import type { AuthUser } from '@/types/auth'

async function safeJson(res: Response): Promise<Record<string, unknown>> {
  const text = await res.text()
  if (!text.trim()) return {}
  try {
    return JSON.parse(text) as Record<string, unknown>
  } catch {
    return {}
  }
}

export async function GET(req: NextRequest) {
  const token = req.cookies.get(AUTH_COOKIE.access)?.value
  if (!token) {
    return NextResponse.json({ authenticated: false }, { status: 401 })
  }

  let upstream: Response
  try {
    upstream = await fetch(`${getBackendUrl()}/api/v1/auth/profile`, {
      headers: {
        Authorization: `Bearer ${token}`,
        ...(req.cookies.get(AUTH_COOKIE.school)?.value
          ? { 'x-school-id': req.cookies.get(AUTH_COOKIE.school)!.value }
          : {}),
      },
    })
  } catch {
    return NextResponse.json({ authenticated: false }, { status: 502 })
  }

  if (!upstream.ok) {
    return NextResponse.json({ authenticated: false }, { status: 401 })
  }

  const data = await safeJson(upstream)
  const user = (data.user ?? (data.data as { user?: AuthUser } | undefined)?.user ?? data) as AuthUser

  if (!user || typeof user !== 'object' || !('id' in user)) {
    return NextResponse.json({ authenticated: false }, { status: 401 })
  }

  return NextResponse.json({
    authenticated: true,
    user,
    schoolId: req.cookies.get(AUTH_COOKIE.school)?.value ?? user?.schoolId ?? null,
  })
}
