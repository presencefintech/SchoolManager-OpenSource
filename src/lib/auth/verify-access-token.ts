import type { UserRole } from '@/types/auth'

export type VerifiedAccessToken = {
  userId: number
  role: UserRole
  schoolId?: number
}

function base64UrlDecode(value: string): Uint8Array {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/')
  const pad = normalized.length % 4 === 0 ? '' : '='.repeat(4 - (normalized.length % 4))
  const binary = atob(normalized + pad)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes
}

/** Vérifie signature HS256 + expiration (Edge-compatible, sans dépendance Node). */
export async function verifyAccessToken(token: string): Promise<VerifiedAccessToken | null> {
  const secret = process.env.JWT_SECRET?.trim()
  if (!secret) return null

  const parts = token.split('.')
  if (parts.length !== 3) return null

  const [header, payload, signature] = parts
  const encoder = new TextEncoder()

  try {
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify'],
    )

    const data = encoder.encode(`${header}.${payload}`)
    const sigBytes = new Uint8Array(base64UrlDecode(signature))
    const valid = await crypto.subtle.verify('HMAC', key, sigBytes, data)
    if (!valid) return null

    const decoded = JSON.parse(new TextDecoder().decode(base64UrlDecode(payload))) as {
      userId?: number
      role?: string
      schoolId?: number
      exp?: number
    }

    if (!decoded.userId || !decoded.role) return null
    if (decoded.exp && decoded.exp * 1000 < Date.now()) return null

    return {
      userId: decoded.userId,
      role: decoded.role as UserRole,
      schoolId: decoded.schoolId,
    }
  } catch {
    return null
  }
}
