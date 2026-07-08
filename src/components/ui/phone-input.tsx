'use client'

import PhoneInputWithCountry from 'react-phone-number-input'
import fr from 'react-phone-number-input/locale/fr'
import type { Country } from 'react-phone-number-input'
import 'react-phone-number-input/style.css'
import { cn } from '@/lib/utils'
import { getPhoneValidationError } from '@/lib/phone/validation'

export type PhoneInputProps = {
  value: string
  onChange: (value: string) => void
  defaultCountry?: Country
  placeholder?: string
  disabled?: boolean
  className?: string
  id?: string
  /** Affiche le message d'erreur sous le champ */
  showError?: boolean
  error?: string | null
}

export function PhoneInput({
  value,
  onChange,
  defaultCountry = 'CD',
  placeholder = 'Numéro de téléphone',
  disabled,
  className,
  id,
  showError = true,
  error: errorProp,
}: PhoneInputProps) {
  const derivedError = errorProp ?? (value ? getPhoneValidationError(value) : null)
  const displayError = showError && value ? derivedError : null

  return (
    <div className={cn('space-y-1', className)}>
      <PhoneInputWithCountry
        id={id}
        international
        countryCallingCodeEditable={false}
        defaultCountry={defaultCountry}
        labels={fr}
        value={value || undefined}
        onChange={(next) => onChange(next ?? '')}
        disabled={disabled}
        placeholder={placeholder}
        className={cn(
          'PhoneInputField',
          displayError && 'PhoneInputField--error',
        )}
      />
      {displayError && (
        <p className="text-xs text-red-600">{displayError}</p>
      )}
    </div>
  )
}
