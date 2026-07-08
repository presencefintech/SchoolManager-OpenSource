import { NextRequest, NextResponse } from 'next/server'
import { AUTH_COOKIE } from '@/lib/auth/session-cookies'

/** Expose le JWT HttpOnly pour la connexion Socket.io côté client (room finance). */
export async function GET(req: NextRequest) {
  const token = req.cookies.get(AUTH_COOKIE.access)?.value
  if (!token) {
    return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
  }

  return NextResponse.json({ token })
}
