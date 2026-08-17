'use client'

import { useEffect } from 'react'

/** Charge Sentry côté navigateur si NEXT_PUBLIC_SENTRY_DSN est défini. */
export function SentryClientInit() {
  useEffect(() => {
    if (!process.env.NEXT_PUBLIC_SENTRY_DSN?.trim()) return
    void import('../../../sentry.client.config')
  }, [])
  return null
}
