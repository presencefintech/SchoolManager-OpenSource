import { NextRequest, NextResponse } from 'next/server'
import { AUTH_COOKIE, getBackendUrl } from '@/lib/auth/session-cookies'

export async function GET(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const token = req.cookies.get(AUTH_COOKIE.access)?.value
  if (!token) {
    return NextResponse.json({ message: 'Non authentifié' }, { status: 401 })
  }

  const { path } = await params
  // `..` / `.` normalisés par fetch permettraient de sortir de /uploads côté backend
  if (path.some((segment) => segment === '..' || segment === '.')) {
    return NextResponse.json({ message: 'Chemin invalide' }, { status: 400 })
  }

  const search = req.nextUrl.search
  const target = `${getBackendUrl()}/uploads/${path.map(encodeURIComponent).join('/')}${search}`

  const upstream = await fetch(target, {
    headers: {
      Authorization: `Bearer ${token}`,
      ...(req.cookies.get(AUTH_COOKIE.school)?.value
        ? { 'x-school-id': req.cookies.get(AUTH_COOKIE.school)!.value }
        : {}),
    },
  })

  if (!upstream.ok) {
    return NextResponse.json({ message: 'Fichier inaccessible' }, { status: upstream.status })
  }

  const resHeaders = new Headers()
  const contentType = upstream.headers.get('content-type')
  const disposition = upstream.headers.get('content-disposition')
  if (contentType) resHeaders.set('content-type', contentType)
  if (disposition) resHeaders.set('content-disposition', disposition)
  resHeaders.set('cache-control', 'private, max-age=300')

  return new NextResponse(upstream.body, {
    status: upstream.status,
    headers: resHeaders,
  })
}
