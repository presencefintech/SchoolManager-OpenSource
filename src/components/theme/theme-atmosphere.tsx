'use client'

import { useTheme } from '@/providers/theme-provider'

export function ThemeAtmosphere() {
  const { atmosphere } = useTheme()
  if (atmosphere === 'none') return null

  return (
    <div className="pf-atmosphere" data-kind={atmosphere} aria-hidden>
      <span />
      <span />
      <span />
    </div>
  )
}

export function AtmosphereSwatch({ kind }: { kind: string }) {
  return (
    <div className="pf-atmosphere-preview h-16 w-full rounded-xl" data-kind={kind} aria-hidden>
      <span />
      <span />
      <span />
    </div>
  )
}
