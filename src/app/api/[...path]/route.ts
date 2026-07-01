import { NextRequest, NextResponse } from 'next/server'
import { AUTH_COOKIE } from '@/lib/auth/session-cookies'

const BACKEND = process.env.API_URL ?? 'http://localhost:5000'

const SKIP_HEADERS = new Set(['host', 'origin', 'referer', 'connection', 'transfer-encoding', 'cookie', 'authorization'])

async function proxy(req: NextRequest, path: string[]) {
  const search = req.nextUrl.search
  const target = `${BACKEND}/api/${path.join('/')}${search}`

  const headers: Record<string, string> = {}
  req.headers.forEach((value, key) => {
    if (!SKIP_HEADERS.has(key.toLowerCase())) {
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

  const upstream = await fetch(target, {
    method: req.method,
    headers,
    body: hasBody ? req.body : undefined,
    // @ts-expect-error duplex required for streaming body in Node fetch
    duplex: 'half',
  })

  const resHeaders = new Headers()
  upstream.headers.forEach((value, key) => {
    if (key.toLowerCase() !== 'access-control-allow-origin') {
      resHeaders.set(key, value)
    }
  })
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3001'
  resHeaders.set('access-control-allow-origin', appUrl)

  return new NextResponse(upstream.body, {
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
