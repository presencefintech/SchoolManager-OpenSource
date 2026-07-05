import { z } from 'zod'

/** Aligné sur InvitationUtils.isPasswordRobust (backend). */
export const STAFF_PASSWORD_REGEX =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{12,}$/

export const staffPasswordField = z
  .string()
  .min(12, 'Minimum 12 caractères')
  .regex(/[a-z]/, 'Au moins une minuscule')
  .regex(/[A-Z]/, 'Au moins une majuscule')
  .regex(/\d/, 'Au moins un chiffre')
  .regex(/[@$!%*?&]/, 'Au moins un caractère spécial (@$!%*?&)')

export type PasswordRequirement = {
  id: string
  label: string
  met: boolean
}

export function evaluateStaffPassword(password: string): PasswordRequirement[] {
  return [
    { id: 'length', label: '12 caractères minimum', met: password.length >= 12 },
    { id: 'lower', label: 'Une lettre minuscule', met: /[a-z]/.test(password) },
    { id: 'upper', label: 'Une lettre majuscule', met: /[A-Z]/.test(password) },
    { id: 'digit', label: 'Un chiffre', met: /\d/.test(password) },
    {
      id: 'special',
      label: 'Un caractère spécial (@$!%*?&)',
      met: /[@$!%*?&]/.test(password),
    },
  ]
}

export function staffPasswordStrength(password: string): number {
  const reqs = evaluateStaffPassword(password)
  return reqs.filter((r) => r.met).length
}

export function mapActivateErrorMessage(raw: string | undefined): string {
  if (!raw) return 'Activation impossible. Réessayez ou contactez votre administrateur.'
  const code = raw.toUpperCase()
  if (code.includes('TOKEN_EXPIRED') || code.includes('INVALID')) {
    return 'Ce lien d\'invitation est invalide ou a expiré. Demandez une nouvelle invitation à votre administrateur.'
  }
  if (code.includes('WEAK_PASSWORD')) {
    return 'Le mot de passe ne respecte pas la politique de sécurité.'
  }
  return raw
}
