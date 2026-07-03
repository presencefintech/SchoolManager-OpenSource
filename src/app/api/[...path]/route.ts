import { NextRequest, NextResponse } from 'next/server'
import { AUTH_COOKIE } from '@/lib/auth/session-cookies'

const BACKEND = process.env.API_URL ?? 'http://localhost:5000'

const SKIP_REQUEST_HEADERS = new Set([
  'host',
  'origin',
  'referer',
  'connection',
  'transfer-encoding',
  'cookie',
  'authorization',
])

/** Ne pas relayer : fetch décompresse le corps ; ces en-têtes provoquent ERR_CONTENT_DECODING_FAILED */
const SKIP_RESPONSE_HEADERS = new Set([
  'access-control-allow-origin',
  'content-encoding',
  'content-length',
  'transfer-encoding',
])

async function proxy(req: NextRequest, path: string[]) {
  const search = req.nextUrl.search
  const target = `${BACKEND}/api/${path.join('/')}${search}`

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

  const schoolId = req.cookies.get(AUTH_COOKIE.school)?.value
  if (schoolId && !headers['x-school-id']) {
    headers['x-school-id'] = schoolId
  }

  const hasBody = !['GET', 'HEAD'].includes(req.method)
  const body = hasBody ? await req.text() : undefined

  const upstream = await fetch(target, {
    method: req.method,
    headers,
    body,
  })

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

export async function GET(req: NextRequest, { params }: { params: { path: string[] } }) {
  return proxy(req, params.path)
}
export async function POST(req: NextRequest, { params }: { params: { path: string[] } }) {
  return proxy(req, params.path)
}
export async function PUT(req: NextRequest, { params }: { params: { path: string[] } }) {
  return proxy(req, params.path)
}
export async function PATCH(req: NextRequest, { params }: { params: { path: string[] } }) {
  return proxy(req, params.path)
}
export async function DELETE(req: NextRequest, { params }: { params: { path: string[] } }) {
  return proxy(req, params.path)
}
export async function OPTIONS(req: NextRequest, { params }: { params: { path: string[] } }) {
  return proxy(req, params.path)
}
