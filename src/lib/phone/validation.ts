import { parsePhoneNumberFromString, type NumberType } from 'libphonenumber-js/max'
import { z } from 'zod'

/** Types pouvant recevoir SMS / OTP (hors ligne fixe pure). */
const SMS_CAPABLE_TYPES = new Set<NumberType>(['MOBILE', 'FIXED_LINE_OR_MOBILE'])

/** Convertit une saisie internationale en E.164 (+243…, +33…). */
export function formatPhoneToE164(value: string | undefined): string {
  if (!value?.trim()) return ''
  const parsed = parsePhoneNumberFromString(value)
  return parsed?.isValid() ? parsed.format('E.164') : value.trim()
}

/**
 * Valide un numéro mobile utilisable (SMS / OTP).
 * Rejette les lignes fixes pures même si le format est correct.
 */
export function isValidInternationalPhone(value: string | undefined): boolean {
  if (!value?.trim()) return false
  try {
    const parsed = parsePhoneNumberFromString(value)
    if (!parsed?.isValid()) return false
    const type = parsed.getType()
    if (!type) return false
    return SMS_CAPABLE_TYPES.has(type)
  } catch {
    return false
  }
}

export function getPhoneValidationError(value: string | undefined): string | null {
  if (!value?.trim()) return 'Numéro de téléphone requis'
  if (!isValidInternationalPhone(value)) {
    return 'Numéro mobile invalide ou non joignable (SMS)'
  }
  return null
}

/** Schéma Zod réutilisable pour les formulaires (champ requis). */
export const internationalPhoneField = z
  .string()
  .min(1, 'Numéro de téléphone requis')
  .refine(isValidInternationalPhone, 'Numéro mobile invalide ou non joignable (SMS)')

/** Champ optionnel : vide OK, sinon mobile valide. */
export const optionalInternationalPhoneField = z
  .string()
  .optional()
  .or(z.literal(''))
  .refine(
    (v) => !v?.trim() || isValidInternationalPhone(v),
    'Numéro mobile invalide ou non joignable (SMS)',
  )
