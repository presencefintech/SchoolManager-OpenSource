/** Codes d'erreur auth/sécurité renvoyés par le backend (Phase A–C). */
export const SECURITY_ERROR_CODES = {
  EMAIL_NOT_VERIFIED: 'EMAIL_NOT_VERIFIED',
  ACCOUNT_LOCKED: 'ACCOUNT_LOCKED',
  TOO_MANY_OTP_VERIFY_ATTEMPTS: 'TOO_MANY_OTP_VERIFY_ATTEMPTS',
  INVALID_VERIFICATION_TOKEN: 'INVALID_VERIFICATION_TOKEN',
  EMAIL_ALREADY_VERIFIED: 'EMAIL_ALREADY_VERIFIED',
  AUTH_RATE_LIMIT: 'AUTH_RATE_LIMIT',
} as const

export type SecurityErrorCode = (typeof SECURITY_ERROR_CODES)[keyof typeof SECURITY_ERROR_CODES]

const SECURITY_ERROR_MESSAGES: Record<string, string> = {
  [SECURITY_ERROR_CODES.EMAIL_NOT_VERIFIED]:
    'Confirmez votre adresse email avant d\'effectuer cette opération financière.',
  [SECURITY_ERROR_CODES.ACCOUNT_LOCKED]:
    'Compte temporairement verrouillé après plusieurs tentatives. Réessayez dans quelques minutes.',
  [SECURITY_ERROR_CODES.TOO_MANY_OTP_VERIFY_ATTEMPTS]:
    'Trop de tentatives OTP incorrectes. Demandez un nouveau code.',
  [SECURITY_ERROR_CODES.INVALID_VERIFICATION_TOKEN]:
    'Lien de vérification invalide ou expiré. Demandez un nouvel email.',
  [SECURITY_ERROR_CODES.EMAIL_ALREADY_VERIFIED]:
    'Votre adresse email est déjà confirmée.',
  [SECURITY_ERROR_CODES.AUTH_RATE_LIMIT]:
    'Trop de tentatives. Patientez quelques minutes avant de réessayer.',
  TOKEN_EXPIRED_OR_INVALID:
    'Ce lien d\'invitation est invalide ou a expiré.',
  WEAK_PASSWORD:
    'Le mot de passe ne respecte pas la politique de sécurité.',
  INVALID_RESET_TOKEN:
    'Lien de réinitialisation invalide ou expiré.',
}

export function mapSecurityErrorCode(code: string | undefined): string | null {
  if (!code) return null
  return SECURITY_ERROR_MESSAGES[code] ?? null
}

export function extractApiErrorPayload(data: unknown): {
  message?: string
  code?: string
} {
  if (!data || typeof data !== 'object') return {}
  const record = data as Record<string, unknown>
  return {
    message: typeof record.message === 'string' ? record.message : undefined,
    code: typeof record.code === 'string' ? record.code : undefined,
  }
}

export function resolveApiErrorMessage(data: unknown, fallback?: string): string {
  const { message, code } = extractApiErrorPayload(data)
  const fromCode = mapSecurityErrorCode(code)
  if (fromCode) return fromCode
  if (message && !/^[A-Z][A-Z0-9_]+$/.test(message)) return message
  if (message) {
    const fromMsgCode = mapSecurityErrorCode(message)
    if (fromMsgCode) return fromMsgCode
  }
  return fallback ?? 'Une erreur inattendue est survenue'
}
