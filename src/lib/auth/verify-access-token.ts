import type { UserRole } from '@/types/auth'

export type VerifiedAccessToken = {
  userId: number
  role: UserRole
  schoolId?: number
  impersonatedBy?: number
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

/**
 * Décode le payload JWT (userId/role/exp) sans vérifier la signature — aucun
 * secret requis côté frontend. Le vrai rempart de sécurité est le backend :
 * chaque appel API forward ce même token en Bearer et le backend y valide
 * réellement la signature et les droits. Ce décodage ne sert qu'au routage
 * UX du middleware (éviter d'afficher la coquille d'une page hors rôle) —
 * un token forgé n'obtiendrait aucune donnée réelle, bloquée en 401/403.
 */
export function decodeAccessToken(token: string): VerifiedAccessToken | null {
  const parts = token.split('.')
  if (parts.length !== 3) return null

  try {
    const decoded = JSON.parse(new TextDecoder().decode(base64UrlDecode(parts[1]))) as {
      userId?: number
      role?: string
      schoolId?: number
      impersonatedBy?: number
      exp?: number
    }

    if (!decoded.userId || !decoded.role) return null
    if (decoded.exp && decoded.exp * 1000 < Date.now()) return null

    return {
      userId: decoded.userId,
      role: decoded.role as UserRole,
      schoolId: decoded.schoolId,
      impersonatedBy:
        decoded.impersonatedBy != null ? Number(decoded.impersonatedBy) : undefined,
    }
  } catch {
    return null
  }
}
