'use client'

import { WifiOff, RefreshCw } from 'lucide-react'

export default function OfflinePage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-50 px-6">
      <div className="text-center max-w-sm">
        <div className="w-14 h-14 rounded-2xl bg-zinc-100 flex items-center justify-center mx-auto mb-5">
          <WifiOff size={24} className="text-zinc-400" />
        </div>
        <h1 className="text-xl font-semibold text-zinc-900 mb-2">Vous êtes hors ligne</h1>
        <p className="text-sm text-zinc-500 mb-6">
          Cette page n&apos;a pas encore été consultée et nécessite une connexion internet.
          Vérifiez votre connexion puis réessayez.
        </p>
        <button
          onClick={() => window.location.reload()}
          className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-xl bg-zinc-900 text-white hover:bg-zinc-700 transition-colors"
        >
          <RefreshCw size={14} />
          Réessayer
        </button>
      </div>
    </div>
  )
}
