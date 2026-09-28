'use client'

import dynamic from 'next/dynamic'

export type { PhoneInputProps } from './phone-input-field'

/**
 * react-phone-number-input embarque les drapeaux SVG de tous les pays et les métadonnées
 * libphonenumber (~350 kB bruts) : chargé à la demande pour ne pas alourdir les pages.
 */
export const PhoneInput = dynamic(
  () => import('./phone-input-field').then((m) => m.PhoneInputField),
  {
    ssr: false,
    loading: () => (
      <div className="h-10 w-full rounded-lg border border-zinc-200 bg-zinc-50 animate-pulse" />
    ),
  },
)
