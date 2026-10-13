import { NextRequest } from 'next/server'
import { middleware } from '@/middleware'
import { AUTH_COOKIE } from '@/lib/auth/session-cookies'

function fakeJwt(payload: Record<string, unknown>): string {
  const b64 = (o: unknown) => Buffer.from(JSON.stringify(o)).toString('base64url')
  return `${b64({ alg: 'HS256', typ: 'JWT' })}.${b64(payload)}.signature`
}

function request(path: string, cookies: Record<string, string> = {}): NextRequest {
  const req = new NextRequest(new URL(path, 'http://localhost:3001'))
  for (const [name, value] of Object.entries(cookies)) req.cookies.set(name, value)
  return req
}

const exp = Math.floor(Date.now() / 1000) + 3600
const token = (role: string) => fakeJwt({ userId: 1, role, schoolId: 3, exp })

function location(res: Response): string | null {
  const loc = res.headers.get('location')
  return loc ? new URL(loc).pathname : null
}

describe('middleware', () => {
  const originalFetch = global.fetch
  afterEach(() => {
    global.fetch = originalFetch
  })

  it('redirige un visiteur anonyme vers /login', async () => {
    const res = await middleware(request('/admin/dashboard'))
    expect(location(res)).toBe('/login')
  })

  it('laisse passer les pages publiques', async () => {
    const res = await middleware(request('/login'))
    expect(location(res)).toBeNull()
  })

  it('renvoie un rôle vers sa home quand il sort de son espace', async () => {
    const res = await middleware(
      request('/admin/dashboard', { [AUTH_COOKIE.access]: token('FINANCE') }),
    )
    expect(location(res)).toBe('/finances/dashboard')
  })

  it('autorise un rôle dans son espace', async () => {
    const res = await middleware(
      request('/finances/caisse', { [AUTH_COOKIE.access]: token('FINANCE') }),
    )
    expect(location(res)).toBeNull()
  })

  it('redirige TEACHER hors de /admin vers son espace notes', async () => {
    const res = await middleware(request('/admin/dashboard', { [AUTH_COOKIE.access]: token('TEACHER') }))
    expect(location(res)).toBe('/teacher/dashboard')
  })

  it('autorise TEACHER sur /teacher/grades', async () => {
    const res = await middleware(request('/teacher/grades', { [AUTH_COOKIE.access]: token('TEACHER') }))
    expect(location(res)).toBeNull()
  })

  it('refuse PARENT (mobile uniquement)', async () => {
    const res = await middleware(request('/admin/dashboard', { [AUTH_COOKIE.access]: token('PARENT') }))
    expect(res.headers.get('location')).toContain('/login?error=role_not_supported')
  })

  it('supprime le refresh token quand le backend le refuse', async () => {
    global.fetch = jest.fn().mockResolvedValue(new Response('{}', { status: 401 }))
    const res = await middleware(request('/admin/dashboard', { [AUTH_COOKIE.refresh]: 'dead' }))
    expect(location(res)).toBe('/login')
    expect(res.headers.get('set-cookie')).toContain(`${AUTH_COOKIE.refresh}=;`)
  })

  it('garde le refresh token quand le backend est injoignable', async () => {
    global.fetch = jest.fn().mockRejectedValue(new TypeError('fetch failed'))
    const res = await middleware(request('/admin/dashboard', { [AUTH_COOKIE.refresh]: 'maybe-valid' }))
    expect(location(res)).toBe('/login')
    expect(res.headers.get('set-cookie') ?? '').not.toContain(`${AUTH_COOKIE.refresh}=`)
  })

  it('pose les nouveaux cookies après un refresh réussi', async () => {
    global.fetch = jest.fn().mockResolvedValue(
      new Response(JSON.stringify({ token: token('ADMIN'), refreshToken: 'new-refresh' }), { status: 200 }),
    )
    const res = await middleware(request('/admin/dashboard', { [AUTH_COOKIE.refresh]: 'old' }))
    expect(location(res)).toBeNull()
    expect(res.headers.get('set-cookie')).toContain(`${AUTH_COOKIE.refresh}=new-refresh`)
  })

  it('pose une CSP bloquante avec un nonce propre à chaque requête', async () => {
    const first = await middleware(request('/login'))
    const second = await middleware(request('/login'))
    const csp = first.headers.get('content-security-policy') ?? ''
    const nonce = /'nonce-([^']+)'/.exec(csp)?.[1]
    expect(nonce).toBeTruthy()
    expect(csp).toContain("'strict-dynamic'")
    expect(csp).not.toMatch(/script-src[^;]*'unsafe-inline'/)
    expect(second.headers.get('content-security-policy')).not.toContain(nonce)
  })
})
