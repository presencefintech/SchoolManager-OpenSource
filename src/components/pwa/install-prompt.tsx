'use client'

import { useEffect, useState } from 'react'
import { Download } from 'lucide-react'

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

/**
 * Bouton « Installer » (Chrome / Edge / tablette) — le manifest Serwist
 * rend déjà le guichet installable ; ce CTA surface l’action native.
 */
export function PwaInstallPrompt() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null)
  const [hidden, setHidden] = useState(false)

  useEffect(() => {
    const onPrompt = (e: Event) => {
      e.preventDefault()
      setDeferred(e as BeforeInstallPromptEvent)
    }
    window.addEventListener('beforeinstallprompt', onPrompt)
    return () => window.removeEventListener('beforeinstallprompt', onPrompt)
  }, [])

  if (!deferred || hidden) return null

  return (
    <button
      type="button"
      onClick={async () => {
        await deferred.prompt()
        const { outcome } = await deferred.userChoice
        setDeferred(null)
        if (outcome === 'accepted') setHidden(true)
      }}
      className="inline-flex items-center gap-1.5 rounded-lg border border-teal-200 bg-teal-50 px-2.5 py-1 text-xs font-medium text-teal-800 hover:bg-teal-100 dark:border-teal-900 dark:bg-teal-950/40 dark:text-teal-200"
    >
      <Download className="h-3.5 w-3.5" />
      Installer le guichet
    </button>
  )
}
