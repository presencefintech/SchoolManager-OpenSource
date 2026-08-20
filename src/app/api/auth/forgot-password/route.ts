import { NextRequest, NextResponse } from 'next/server'
import { getBackendUrl } from '@/lib/auth/session-cookies'

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null)
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ message: 'Corps de requête invalide' }, { status: 400 })
  }

  let upstream: Response
  try {
    upstream = await fetch(`${getBackendUrl()}/api/v1/auth/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
  } catch {
    return NextResponse.json({ message: 'Backend indisponible' }, { status: 502 })
  }

  const data = await upstream.json().catch(() => ({}))
  return NextResponse.json(data, { status: upstream.status })
}
