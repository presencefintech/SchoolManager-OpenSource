import { NextRequest, NextResponse } from 'next/server'
import {
  ACCESS_MAX_AGE,
  AUTH_COOKIE,
  REFRESH_MAX_AGE,
  buildAuthCookie,
  getBackendUrl,
} from '@/lib/auth/session-cookies'

async function safeJson(res: Response): Promise<Record<string, unknown>> {
  const text = await res.text()
  if (!text.trim()) return {}
  try {
    return JSON.parse(text) as Record<string, unknown>
  } catch {
    return {}
  }
}

export async function POST(req: NextRequest) {
  const refreshToken = req.cookies.get(AUTH_COOKIE.refresh)?.value
  if (!refreshToken) {
    return NextResponse.json({ message: 'Session expirée' }, { status: 401 })
  }

  let upstream: Response
  try {
    upstream = await fetch(`${getBackendUrl()}/api/v1/auth/refresh-token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    })
  } catch {
    return NextResponse.json({ message: 'Backend indisponible' }, { status: 502 })
  }

  const data = await safeJson(upstream)
  const token = typeof data.token === 'string' ? data.token : null

  if (!upstream.ok || !token) {
    const res = NextResponse.json(
      Object.keys(data).length > 0 ? data : { message: 'Session expirée' },
      { status: upstream.status || 401 },
    )
    for (const name of [AUTH_COOKIE.access, AUTH_COOKIE.refresh]) {
      res.cookies.set({ name, value: '', path: '/', maxAge: 0 })
    }
    return res
  }

  const res = NextResponse.json({ status: 'success', token })
  res.cookies.set(buildAuthCookie(AUTH_COOKIE.access, token, ACCESS_MAX_AGE, true))
  if (typeof data.refreshToken === 'string') {
    res.cookies.set(
      buildAuthCookie(AUTH_COOKIE.refresh, data.refreshToken, REFRESH_MAX_AGE, true),
    )
  }
  return res
}
