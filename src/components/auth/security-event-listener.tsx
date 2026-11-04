'use client'

import { useEffect } from 'react'
import { useAuth } from '@/providers/auth-provider'
import { useToast } from '@/providers/toast-provider'
import { mapSecurityErrorCode, SECURITY_ERROR_CODES } from '@/lib/auth/security-errors'

/** Toasts globaux pour les blocages sécurité (ex. mutation finance sans email vérifié). */
export function SecurityEventListener() {
  const { warning } = useToast()
  const { refreshUser } = useAuth()

  useEffect(() => {
    function onEmailVerificationRequired() {
      warning(
        'Action bloquée',
        mapSecurityErrorCode(SECURITY_ERROR_CODES.EMAIL_NOT_VERIFIED) ??
          'Confirmez votre adresse email.',
      )
      void refreshUser()
    }

    window.addEventListener('auth:email-verification-required', onEmailVerificationRequired)
    return () =>
      window.removeEventListener('auth:email-verification-required', onEmailVerificationRequired)
  }, [warning, refreshUser])

  return null
}
