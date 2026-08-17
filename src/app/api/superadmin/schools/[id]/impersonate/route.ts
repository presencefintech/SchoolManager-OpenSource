import { NextRequest, NextResponse } from 'next/server'
import {
  AUTH_COOKIE,
  IMPERSONATE_MAX_AGE,
  REFRESH_MAX_AGE,
  buildAuthCookie,
  encodeImpersonationCookie,
  getBackendUrl,
} from '@/lib/auth/session-cookies'

type Ctx = { params: Promise<{ id: string }> | { id: string } }

/**
 * GET /api/superadmin/schools/[id]/impersonate
 * Alias → même flux dual-session que POST /api/superadmin/auth/impersonate
 */
export async function GET(req: NextRequest, ctx: Ctx) {
  const token = req.cookies.get(AUTH_COOKIE.access)?.value
  if (!token) {
    return NextResponse.json(
      { success: false, message: 'Non authentifié.' },
      { status: 401 },
    )
  }

  const params = await Promise.resolve(ctx.params)
  const id = params.id
  if (!/^\d+$/.test(id)) {
    return NextResponse.json({ success: false, message: 'ID invalide.' }, { status: 400 })
  }

  try {
    const upstream = await fetch(
      `${getBackendUrl()}/api/v1/superadmin/auth/impersonate`,
      {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          'accept-encoding': 'identity',
        },
        body: JSON.stringify({ schoolId: Number(id) }),
        cache: 'no-store',
      },
    )

    const data = (await upstream.json().catch(() => null)) as {
      success?: boolean
      message?: string
      token?: string
      refreshToken?: string
      expiresInSeconds?: number
      redirectTo?: string
      user?: { schoolId?: number | null }
      school?: { id: number; name: string }
      impersonation?: { byUserId: number; schoolId: number; schoolName: string }
    } | null

    if (!upstream.ok || !data?.token || !data?.refreshToken) {
      return NextResponse.json(
        data ?? { success: false, message: 'Impersonation refusée.' },
        { status: upstream.status || 502 },
      )
    }

    const maxAge = data.expiresInSeconds ?? IMPERSONATE_MAX_AGE
    const schoolId = data.impersonation?.schoolId ?? Number(id)
    const schoolName =
      data.impersonation?.schoolName ?? data.school?.name ?? `École #${id}`

    const res = NextResponse.json({
      success: true,
      redirectTo: data.redirectTo ?? '/admin/dashboard',
      user: data.user,
      school: data.school,
      impersonation: data.impersonation,
    })

    if (!req.cookies.get(AUTH_COOKIE.saBackup)?.value) {
      res.cookies.set(buildAuthCookie(AUTH_COOKIE.saBackup, token, REFRESH_MAX_AGE, true))
      const saRefresh = req.cookies.get(AUTH_COOKIE.refresh)?.value
      if (saRefresh) {
        res.cookies.set(
          buildAuthCookie(AUTH_COOKIE.saRefreshBackup, saRefresh, REFRESH_MAX_AGE, true),
        )
      }
      const saSchool = req.cookies.get(AUTH_COOKIE.school)?.value
      if (saSchool) {
        res.cookies.set(
          buildAuthCookie(AUTH_COOKIE.saSchoolBackup, saSchool, REFRESH_MAX_AGE, false),
        )
      }
    }

    res.cookies.set(buildAuthCookie(AUTH_COOKIE.access, data.token, maxAge, true))
    res.cookies.set(buildAuthCookie(AUTH_COOKIE.refresh, data.refreshToken, maxAge, true))
    if (data.user?.schoolId != null) {
      res.cookies.set(
        buildAuthCookie(AUTH_COOKIE.school, String(data.user.schoolId), maxAge, false),
      )
    }

    res.cookies.set(
      buildAuthCookie(
        AUTH_COOKIE.impersonation,
        encodeImpersonationCookie({
          schoolId,
          schoolName,
          byUserId: data.impersonation?.byUserId ?? 0,
          startedAt: new Date().toISOString(),
        }),
        maxAge,
        false,
      ),
    )

    return res
  } catch {
    return NextResponse.json(
      { success: false, message: 'Impossible de joindre le backend.' },
      { status: 502 },
    )
  }
}
