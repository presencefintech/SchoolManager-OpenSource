import { NextRequest, NextResponse } from 'next/server'
import { AUTH_COOKIE } from '@/lib/auth/session-cookies'

const BACKEND = process.env.API_URL ?? 'http://localhost:5000'

/**
 * BFF God Mode — proxy idempotent vers Express.
 * GET /api/superadmin/dashboard-stats?days=30&refresh=1
 */
export async function GET(req: NextRequest) {
  const token = req.cookies.get(AUTH_COOKIE.access)?.value
  if (!token) {
    return NextResponse.json(
      { success: false, message: 'Non authentifié.' },
      { status: 401 },
    )
  }

  const days = req.nextUrl.searchParams.get('days')
  const refresh = req.nextUrl.searchParams.get('refresh')
  const qs = new URLSearchParams()
  if (days) qs.set('days', days)
  if (refresh === '1' || refresh === 'true') qs.set('refresh', '1')

  const ifNoneMatch = req.headers.get('if-none-match')

  try {
    const upstream = await fetch(
      `${BACKEND}/api/v1/superadmin/core/dashboard-stats${qs.size ? `?${qs}` : ''}`,
      {
        method: 'GET',
        headers: {
          Accept: 'application/json',
          Authorization: `Bearer ${token}`,
          'accept-encoding': 'identity',
          ...(ifNoneMatch ? { 'If-None-Match': ifNoneMatch } : {}),
        },
        cache: 'no-store',
      },
    )

    if (upstream.status === 304) {
      const res = new NextResponse(null, { status: 304 })
      const etag = upstream.headers.get('etag')
      if (etag) res.headers.set('ETag', etag)
      return res
    }

    const body = await upstream.json().catch(() => ({
      success: false,
      message: 'Réponse invalide du serveur.',
    }))

    const res = NextResponse.json(body, { status: upstream.status })
    const etag = upstream.headers.get('etag')
    const cached = upstream.headers.get('x-dashboard-cached')
    const degraded = upstream.headers.get('x-dashboard-degraded')
    if (etag) res.headers.set('ETag', etag)
    if (cached) res.headers.set('X-Dashboard-Cached', cached)
    if (degraded) res.headers.set('X-Dashboard-Degraded', degraded)
    return res
  } catch {
    return NextResponse.json(
      { success: false, message: 'Impossible de joindre le backend.' },
      { status: 502 },
    )
  }
}
