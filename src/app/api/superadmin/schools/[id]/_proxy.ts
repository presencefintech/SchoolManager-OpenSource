import { NextRequest, NextResponse } from 'next/server'
import { AUTH_COOKIE, getBackendUrl } from '@/lib/auth/session-cookies'

type RouteCtx = { params: Promise<{ id: string }> }

async function resolveId(params: RouteCtx['params']) {
  const p = await params
  return p.id
}

function authHeaders(req: NextRequest): HeadersInit | null {
  const token = req.cookies.get(AUTH_COOKIE.access)?.value
  if (!token) return null
  return {
    Accept: 'application/json',
    Authorization: `Bearer ${token}`,
    'accept-encoding': 'identity',
  }
}

/** Proxy JSON vers Express superadmin core schools/:id/... */
export async function proxySchoolSupport(
  req: NextRequest,
  ctx: RouteCtx,
  opts: {
    method: string
    suffix: string
    body?: unknown
  },
) {
  const headers = authHeaders(req)
  if (!headers) {
    return NextResponse.json(
      { success: false, message: 'Non authentifié.' },
      { status: 401 },
    )
  }

  const id = await resolveId(ctx.params)
  if (!/^\d+$/.test(id)) {
    return NextResponse.json({ success: false, message: 'ID invalide.' }, { status: 400 })
  }

  const backend = getBackendUrl()
  const url = `${backend}/api/v1/superadmin/core/schools/${id}${opts.suffix}`

  try {
    const upstream = await fetch(url, {
      method: opts.method,
      headers: {
        ...headers,
        ...(opts.body !== undefined ? { 'Content-Type': 'application/json' } : {}),
      },
      body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
      cache: 'no-store',
    })

    const data = await upstream.json().catch(() => ({
      success: false,
      message: 'Réponse invalide du serveur.',
    }))

    return NextResponse.json(data, { status: upstream.status })
  } catch {
    return NextResponse.json(
      { success: false, message: 'Impossible de joindre le backend.' },
      { status: 502 },
    )
  }
}
