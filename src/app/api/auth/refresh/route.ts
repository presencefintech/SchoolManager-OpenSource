import { NextRequest, NextResponse } from 'next/server'
import {
  ACCESS_MAX_AGE,
  AUTH_COOKIE,
  REFRESH_MAX_AGE,
  buildAuthCookie,
  getBackendUrl,
} from '@/lib/auth/session-cookies'

export async function POST(req: NextRequest) {
  const refreshToken = req.cookies.get(AUTH_COOKIE.refresh)?.value
  if (!refreshToken) {
    return NextResponse.json({ message: 'Session expirée' }, { status: 401 })
  }

  const upstream = await fetch(`${getBackendUrl()}/api/v1/auth/refresh-token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken }),
  })

  const data = await upstream.json()

  if (!upstream.ok || !data.token) {
    const res = NextResponse.json(data, { status: upstream.status || 401 })
    for (const name of [AUTH_COOKIE.access, AUTH_COOKIE.refresh]) {
      res.cookies.set({ name, value: '', path: '/', maxAge: 0 })
    }
    return res
  }

  const res = NextResponse.json({ status: 'success', token: data.token })
  res.cookies.set(buildAuthCookie(AUTH_COOKIE.access, data.token, ACCESS_MAX_AGE, true))
  if (data.refreshToken) {
    res.cookies.set(buildAuthCookie(AUTH_COOKIE.refresh, data.refreshToken, REFRESH_MAX_AGE, true))
  }
  return res
}
