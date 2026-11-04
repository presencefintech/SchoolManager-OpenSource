'use client'

import type { ReactNode } from 'react'
import { SerwistProvider as BaseSerwistProvider } from '@serwist/next/react'

/**
 * Enregistre le Service Worker Serwist (désactivé en développement).
 * cacheOnNavigation : précache les pages visitées (dont /teacher/attendance).
 */
export function AppSerwistProvider({ children }: { children: ReactNode }) {
  return (
    <BaseSerwistProvider
      swUrl="/sw.js"
      disable={process.env.NODE_ENV === 'development'}
      register
      cacheOnNavigation
      reloadOnOnline={false}
    >
      {children}
    </BaseSerwistProvider>
  )
}
