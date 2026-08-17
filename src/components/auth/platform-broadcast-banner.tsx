'use client'

import { useCallback, useEffect, useState } from 'react'
import { Megaphone, X } from 'lucide-react'
import {
  adminBroadcastApi,
  type PlatformBroadcast,
} from '@/lib/superAdmin/api/broadcast.api'
import { cn } from '@/lib/utils'

/**
 * Bannière non bloquante — messages plateforme non lus (Superadmin → école).
 */
export function PlatformBroadcastBanner() {
  const [items, setItems] = useState<PlatformBroadcast[]>([])
  const [dismissed, setDismissed] = useState<number | null>(null)
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    try {
      const rows = await adminBroadcastApi.unread()
      setItems(rows)
    } catch {
      setItems([])
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const current = items.find((i) => i.id !== dismissed) ?? items[0] ?? null
  if (!current) return null

  async function markRead() {
    setBusy(true)
    try {
      await adminBroadcastApi.markRead(current.id)
      setItems((prev) => prev.filter((p) => p.id !== current.id))
      setDismissed(null)
    } catch {
      /* ignore */
    } finally {
      setBusy(false)
    }
  }

  return (
    <div
      className={cn(
        'mx-6 mt-4 rounded-2xl border border-sky-200 bg-sky-50 px-4 py-3.5 shadow-sm',
        'flex flex-col sm:flex-row sm:items-start gap-3',
      )}
      role="status"
    >
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-sky-600 text-white">
        <Megaphone size={16} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-sky-700/80">
          Annonce plateforme
        </p>
        <p className="text-sm font-semibold text-sky-950 mt-0.5">{current.title}</p>
        <p className="text-sm text-sky-900/80 mt-1 whitespace-pre-wrap">{current.content}</p>
      </div>
      <div className="flex sm:flex-col gap-2 shrink-0">
        <button
          type="button"
          disabled={busy}
          onClick={() => void markRead()}
          className="rounded-xl bg-sky-700 px-3 py-2 text-xs font-semibold text-white hover:bg-sky-800 disabled:opacity-50"
        >
          Marquer comme lu
        </button>
        <button
          type="button"
          onClick={() => setDismissed(current.id)}
          className="inline-flex items-center justify-center gap-1 rounded-xl border border-sky-200 bg-white px-3 py-2 text-xs font-medium text-sky-800 hover:bg-sky-50"
          aria-label="Masquer temporairement"
        >
          <X size={12} /> Masquer
        </button>
      </div>
    </div>
  )
}
