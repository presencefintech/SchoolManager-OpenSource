'use client'

import Link from 'next/link'
import { WifiOff, RefreshCw, ScanBarcode } from 'lucide-react'

export default function OfflinePage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 px-6">
      <div className="max-w-sm text-center">
        <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-zinc-100">
          <WifiOff size={24} className="text-zinc-400" />
        </div>
        <h1 className="mb-2 text-xl font-semibold text-zinc-900">Vous êtes hors ligne</h1>
        <p className="mb-6 text-sm text-zinc-500">
          Cette page n&apos;est pas encore disponible hors ligne. Le guichet de pointage reste
          utilisable s&apos;il a déjà été ouvert une fois (référentiel élèves + file de scans en
          IndexedDB).
        </p>
        <div className="flex flex-col items-stretch gap-2 sm:flex-row sm:justify-center">
          <Link
            href="/teacher/attendance"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-teal-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-teal-700"
          >
            <ScanBarcode size={14} />
            Ouvrir le guichet
          </Link>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-zinc-700"
          >
            <RefreshCw size={14} />
            Réessayer
          </button>
        </div>
      </div>
    </div>
  )
}
