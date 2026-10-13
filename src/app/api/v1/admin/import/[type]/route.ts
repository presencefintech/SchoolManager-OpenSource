import { NextRequest, NextResponse } from 'next/server'
import { AUTH_COOKIE, getBackendUrl } from '@/lib/auth/session-cookies'

/**
 * Route dédiée multipart import Excel — reconstruit FormData + injecte le JWT cookie
 * (ne pas envoyer Authorization: Bearer http-only-session depuis le client).
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ type: string }> },
) {
  const resolvedParams = await params
  const { type } = resolvedParams

  let formData: FormData
  try {
    formData = await req.formData()
  } catch {
    return NextResponse.json({ success: false, message: 'FormData invalide' }, { status: 400 })
  }

  const outgoing = new FormData()
  formData.forEach((value, key) => outgoing.append(key, value))

  const forwardHeaders: Record<string, string> = {}

  const accessToken = req.cookies.get(AUTH_COOKIE.access)?.value
  if (accessToken) {
    forwardHeaders.Authorization = `Bearer ${accessToken}`
  } else {
    // Fallback : Authorization client uniquement si ce n'est pas le marqueur session
    const auth = req.headers.get('authorization')
    if (auth && !auth.includes('http-only-session')) {
      forwardHeaders.Authorization = auth
    }
  }

  const schoolFromCookie = req.cookies.get(AUTH_COOKIE.school)?.value
  const schoolFromHeader = req.headers.get('x-school-id')
  const schoolId =
    schoolFromHeader && schoolFromHeader !== '0'
      ? schoolFromHeader
      : schoolFromCookie && schoolFromCookie !== '0'
        ? schoolFromCookie
        : null
  if (schoolId) forwardHeaders['x-school-id'] = schoolId

  const lang = req.headers.get('accept-language')
  if (lang) forwardHeaders['accept-language'] = lang
  const corr = req.headers.get('x-correlation-id')
  if (corr) forwardHeaders['x-correlation-id'] = corr

  const reqUrl = new URL(req.url)
  let upstream: Response
  try {
    upstream = await fetch(
      `${getBackendUrl()}/api/v1/admin/import/${encodeURIComponent(type)}${reqUrl.search}`,
      {
        method: 'POST',
        headers: forwardHeaders,
        body: outgoing,
      },
    )
  } catch {
    return NextResponse.json({ success: false, message: 'Backend indisponible' }, { status: 502 })
  }

  const json = await upstream
    .json()
    .catch(() => ({ success: false, message: 'Réponse invalide du serveur' }))
  return NextResponse.json(json, { status: upstream.status })
}
