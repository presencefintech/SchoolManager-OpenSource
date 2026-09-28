import { NextRequest, NextResponse } from 'next/server'
import { AUTH_COOKIE } from '@/lib/auth/session-cookies'

const BACKEND = process.env.API_URL ?? 'http://localhost:5000'

/** Au-delà du timeout axios côté client (60 s max) : libère un upstream bloqué sans couper plus tôt. */
const UPSTREAM_TIMEOUT_MS = 90_000

const SKIP_REQUEST_HEADERS = new Set([
  'host',
  'origin',
  'referer',
  'connection',
  'transfer-encoding',
  'cookie',
  'authorization',
  // Toujours dérivé du cookie école, jamais d'un en-tête fourni par le navigateur
  'x-school-id',
  // Content-Length recalculé par fetch selon le body (surtout multipart)
  'content-length',
])

/** Ne pas relayer : fetch décompresse le corps ; ces en-têtes provoquent ERR_CONTENT_DECODING_FAILED */
const SKIP_RESPONSE_HEADERS = new Set([
  'access-control-allow-origin',
  'content-encoding',
  'content-length',
  'transfer-encoding',
])

async function proxy(req: NextRequest, path: string[]) {
  // `..` / `.` normalisés par fetch permettraient de sortir de /api côté backend
  if (path.some((segment) => segment === '..' || segment === '.')) {
    return NextResponse.json({ message: 'Chemin invalide' }, { status: 400 })
  }
  const search = req.nextUrl.search
  // Next décode les segments (%2F → /) : on les ré-encode pour qu'un identifiant contenant
  // des « / » (ex. publicId Cloudinary « schools/3/abc ») reste un seul segment côté backend.
  let joined = path.map(encodeURIComponent).join('/')
  // `/api/auth/*` (pages login / mot de passe oublié) → backend `/api/v1/auth/*`
  if (joined === 'auth' || joined.startsWith('auth/')) {
    joined = `v1/${joined}`
  }
  const target = `${BACKEND}/api/${joined}${search}`

  const headers: Record<string, string> = {
    'accept-encoding': 'identity',
  }
  req.headers.forEach((value, key) => {
    if (!SKIP_REQUEST_HEADERS.has(key.toLowerCase())) {
      headers[key] = value
    }
  })

  const accessToken = req.cookies.get(AUTH_COOKIE.access)?.value
  if (accessToken && !headers.Authorization && !headers.authorization) {
    headers.Authorization = `Bearer ${accessToken}`
  }

  const originalPath = path.join('/')
  const isSuperAdminApi = originalPath.startsWith('v1/superadmin') || originalPath.startsWith('superadmin')
  if (!isSuperAdminApi) {
    const schoolId = req.cookies.get(AUTH_COOKIE.school)?.value
    if (schoolId && schoolId !== '0') {
      headers['x-school-id'] = schoolId
    }
  }

  const method = req.method.toUpperCase()
  const hasBody = !['GET', 'HEAD'].includes(method)
  const contentType = req.headers.get('content-type') ?? ''

  let body: BodyInit | undefined
  if (hasBody) {
    // Multipart : ne jamais passer par text() — casse le boundary / binaire → timeout axios 15s
    if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData()
      const outgoing = new FormData()
      formData.forEach((value, key) => outgoing.append(key, value))
      body = outgoing
      // Laisser fetch recalculer Content-Type + boundary
      delete headers['content-type']
      delete headers['Content-Type']
    } else {
      body = await req.arrayBuffer()
    }
  }

  let upstream: Response
  try {
    upstream = await fetch(target, {
      method: req.method,
      headers,
      body,
      signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
    })
  } catch (error) {
    const timedOut = error instanceof Error && error.name === 'TimeoutError'
    return NextResponse.json(
      { message: timedOut ? 'Le serveur met trop de temps à répondre' : 'Backend indisponible' },
      { status: timedOut ? 504 : 502 },
    )
  }

  const resHeaders = new Headers()
  upstream.headers.forEach((value, key) => {
    if (!SKIP_RESPONSE_HEADERS.has(key.toLowerCase())) {
      resHeaders.set(key, value)
    }
  })
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3001'
  resHeaders.set('access-control-allow-origin', appUrl)

  const responseBody = await upstream.arrayBuffer()
  return new NextResponse(responseBody, {
    status: upstream.status,
    statusText: upstream.statusText,
    headers: resHeaders,
  })
}

type RouteCtx = { params: Promise<{ path: string[] }> }

async function handle(req: NextRequest, { params }: RouteCtx) {
  return proxy(req, (await params).path)
}

export const GET = handle
export const POST = handle
export const PUT = handle
export const PATCH = handle
export const DELETE = handle
export const OPTIONS = handle
