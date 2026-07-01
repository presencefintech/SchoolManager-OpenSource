import { NextRequest, NextResponse } from 'next/server'
import { AUTH_COOKIE, clearAuthCookies, getBackendUrl } from '@/lib/auth/session-cookies'

export async function POST(req: NextRequest) {
  const refreshToken = req.cookies.get(AUTH_COOKIE.refresh)?.value

  if (refreshToken) {
    try {
      const accessToken = req.cookies.get(AUTH_COOKIE.access)?.value
      await fetch(`${getBackendUrl()}/api/v1/auth/logout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
        body: JSON.stringify({ refreshToken }),
      })
    } catch {
      // ignore — cookies cleared client-side anyway
    }
  }

  const res = NextResponse.json({ status: 'success' })
  for (const cookie of clearAuthCookies()) {
    res.cookies.set(cookie)
  }
  return res
}
