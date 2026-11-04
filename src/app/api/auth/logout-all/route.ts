import { NextRequest, NextResponse } from 'next/server'
import { AUTH_COOKIE, clearAuthCookies, getBackendUrl } from '@/lib/auth/session-cookies'

/** Révoque toutes les sessions du compte (tous appareils), puis vide les cookies locaux. */
export async function POST(req: NextRequest) {
  const accessToken = req.cookies.get(AUTH_COOKIE.access)?.value
  if (!accessToken) {
    return NextResponse.json({ message: 'Session expirée — reconnectez-vous' }, { status: 401 })
  }

  let upstream: Response
  try {
    upstream = await fetch(`${getBackendUrl()}/api/v1/auth/logout-all`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify({}),
    })
  } catch {
    return NextResponse.json({ message: 'Backend indisponible' }, { status: 502 })
  }

  if (!upstream.ok) {
    const data = await upstream.json().catch(() => ({}))
    return NextResponse.json(
      data?.message ? data : { message: 'Impossible de fermer les sessions' },
      { status: upstream.status },
    )
  }

  const res = NextResponse.json({ status: 'success' })
  for (const cookie of clearAuthCookies()) {
    res.cookies.set(cookie)
  }
  return res
}
