import { NextRequest, NextResponse } from 'next/server'
import {
  ACCESS_MAX_AGE,
  AUTH_COOKIE,
  REFRESH_MAX_AGE,
  buildAuthCookie,
  getBackendUrl,
} from '@/lib/auth/session-cookies'
import type { AuthUser } from '@/types/auth'

type LoginUpstream = {
  status?: string
  mfaRequired?: boolean
  userId?: number
  token?: string
  refreshToken?: string
  user?: AuthUser
  message?: string
}

export async function POST(req: NextRequest) {
  const body = await req.json()

  const upstream = await fetch(`${getBackendUrl()}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })

  const data = (await upstream.json()) as LoginUpstream

  if (!upstream.ok) {
    return NextResponse.json(data, { status: upstream.status })
  }

  if (data.mfaRequired) {
    return NextResponse.json({ status: 'success', mfaRequired: true, userId: data.userId })
  }

  if (!data.token || !data.refreshToken || !data.user) {
    return NextResponse.json({ message: 'Réponse auth invalide' }, { status: 502 })
  }

  const res = NextResponse.json({
    status: 'success',
    user: data.user,
  })

  res.cookies.set(buildAuthCookie(AUTH_COOKIE.access, data.token, ACCESS_MAX_AGE, true))
  res.cookies.set(buildAuthCookie(AUTH_COOKIE.refresh, data.refreshToken, REFRESH_MAX_AGE, true))

  if (data.user.schoolId != null) {
    res.cookies.set(
      buildAuthCookie(AUTH_COOKIE.school, String(data.user.schoolId), REFRESH_MAX_AGE, false),
    )
  }

  return res
}
