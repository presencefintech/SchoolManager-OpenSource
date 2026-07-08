import { isValidPhoneNumber, parsePhoneNumberFromString } from 'libphonenumber-js'
import { z } from 'zod'

/** Convertit une saisie internationale en E.164 (+243…, +33…). */
export function formatPhoneToE164(value: string | undefined): string {
  if (!value?.trim()) return ''
  const parsed = parsePhoneNumberFromString(value)
  return parsed?.isValid() ? parsed.format('E.164') : value.trim()
}

/** Valide un numéro quel que soit le pays sélectionné. */
export function isValidInternationalPhone(value: string | undefined): boolean {
  if (!value?.trim()) return false
  return isValidPhoneNumber(value)
}

export function getPhoneValidationError(value: string | undefined): string | null {
  if (!value?.trim()) return 'Numéro de téléphone requis'
  if (!isValidInternationalPhone(value)) {
    return 'Numéro invalide pour le pays sélectionné'
  }
  return null
}

/** Schéma Zod réutilisable pour les formulaires. */
export const internationalPhoneField = z
  .string()
  .min(1, 'Numéro de téléphone requis')
  .refine(isValidInternationalPhone, 'Numéro invalide pour le pays sélectionné')
