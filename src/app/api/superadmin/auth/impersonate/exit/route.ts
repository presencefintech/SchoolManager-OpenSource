import { NextRequest, NextResponse } from 'next/server'
import {
  AUTH_COOKIE,
  ACCESS_MAX_AGE,
  REFRESH_MAX_AGE,
  buildAuthCookie,
  getBackendUrl,
} from '@/lib/auth/session-cookies'

/**
 * POST /api/superadmin/auth/impersonate/exit
 * Révoque la session école côté backend, restaure les cookies Superadmin.
 */
export async function POST(req: NextRequest) {
  const token = req.cookies.get(AUTH_COOKIE.access)?.value
  const saBackup = req.cookies.get(AUTH_COOKIE.saBackup)?.value
  const saRefreshBackup = req.cookies.get(AUTH_COOKIE.saRefreshBackup)?.value
  const saSchoolBackup = req.cookies.get(AUTH_COOKIE.saSchoolBackup)?.value

  if (!token) {
    return NextResponse.json(
      { success: false, message: 'Non authentifié.' },
      { status: 401 },
    )
  }

  if (!saBackup) {
    return NextResponse.json(
      {
        success: false,
        message: 'Session Superadmin introuvable. Reconnectez-vous.',
        code: 'SA_BACKUP_MISSING',
      },
      { status: 409 },
    )
  }

  let schoolId: number | null = null
  let redirectTo = '/super-admin/schools'

  try {
    const upstream = await fetch(
      `${getBackendUrl()}/api/v1/superadmin/auth/impersonate/exit`,
      {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          Authorization: `Bearer ${token}`,
          'accept-encoding': 'identity',
        },
        cache: 'no-store',
      },
    )

    const data = (await upstream.json().catch(() => null)) as {
      success?: boolean
      message?: string
      schoolId?: number
      redirectTo?: string
    } | null

    if (!upstream.ok) {
      return NextResponse.json(
        data ?? { success: false, message: 'Impossible de quitter l’impersonation.' },
        { status: upstream.status || 502 },
      )
    }

    schoolId = data?.schoolId ?? null
    redirectTo =
      data?.redirectTo ??
      (schoolId ? `/super-admin/schools/${schoolId}` : '/super-admin/schools')
  } catch {
    return NextResponse.json(
      { success: false, message: 'Impossible de joindre le backend.' },
      { status: 502 },
    )
  }

  const res = NextResponse.json({
    success: true,
    redirectTo,
    schoolId,
  })

  // Restaure Superadmin
  res.cookies.set(buildAuthCookie(AUTH_COOKIE.access, saBackup, ACCESS_MAX_AGE, true))
  if (saRefreshBackup) {
    res.cookies.set(
      buildAuthCookie(AUTH_COOKIE.refresh, saRefreshBackup, REFRESH_MAX_AGE, true),
    )
  } else {
    res.cookies.set(buildAuthCookie(AUTH_COOKIE.refresh, '', 0, true))
  }

  if (saSchoolBackup) {
    res.cookies.set(
      buildAuthCookie(AUTH_COOKIE.school, saSchoolBackup, REFRESH_MAX_AGE, false),
    )
  } else {
    res.cookies.set(buildAuthCookie(AUTH_COOKIE.school, '', 0, false))
  }

  // Clear backup + banner
  for (const name of [
    AUTH_COOKIE.saBackup,
    AUTH_COOKIE.saRefreshBackup,
    AUTH_COOKIE.saSchoolBackup,
    AUTH_COOKIE.impersonation,
  ]) {
    res.cookies.set(
      buildAuthCookie(
        name,
        '',
        0,
        name !== AUTH_COOKIE.impersonation && name !== AUTH_COOKIE.saSchoolBackup,
      ),
    )
  }

  return res
}
