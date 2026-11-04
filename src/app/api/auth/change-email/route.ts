import { NextRequest, NextResponse } from 'next/server'
import { AUTH_COOKIE, getBackendUrl } from '@/lib/auth/session-cookies'

export async function POST(req: NextRequest) {
  const token = req.cookies.get(AUTH_COOKIE.access)?.value
  if (!token) {
    return NextResponse.json({ message: 'Non authentifié' }, { status: 401 })
  }

  const body = await req.json()

  const upstream = await fetch(`${getBackendUrl()}/api/v1/auth/change-email`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...(req.cookies.get(AUTH_COOKIE.school)?.value
        ? { 'x-school-id': req.cookies.get(AUTH_COOKIE.school)!.value }
        : {}),
    },
    body: JSON.stringify(body),
  })

  const data = await upstream.json().catch(() => ({}))
  return NextResponse.json(data, { status: upstream.status })
}
