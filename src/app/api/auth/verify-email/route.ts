import { NextRequest, NextResponse } from 'next/server'
import { getBackendUrl } from '@/lib/auth/session-cookies'

export async function POST(req: NextRequest) {
  const body = await req.json()

  const upstream = await fetch(`${getBackendUrl()}/api/v1/auth/verify-email`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })

  const data = await upstream.json().catch(() => ({}))
  return NextResponse.json(data, { status: upstream.status })
}
