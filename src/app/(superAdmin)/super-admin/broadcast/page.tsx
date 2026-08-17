'use client'

import { useCallback, useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Loader2, Megaphone, Send, Users } from 'lucide-react'
import {
  broadcastApi,
  type BroadcastTargetType,
  type PlatformBroadcast,
} from '@/lib/superAdmin/api/broadcast.api'
import { useToast } from '@/providers/toast-provider'
import { cn } from '@/lib/utils'

function fmtDateTime(iso: string) {
  try {
    return new Date(iso).toLocaleString('fr-FR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return iso
  }
}

export default function BroadcastPage() {
  const toast = useToast()
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [targetType, setTargetType] = useState<BroadcastTargetType>('ALL_SCHOOLS')
  const [sending, setSending] = useState(false)
  const [rows, setRows] = useState<PlatformBroadcast[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      setRows(await broadcastApi.list(40))
    } catch {
      /* toast elsewhere */
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  async function send() {
    if (title.trim().length < 3 || content.trim().length < 5) {
      toast.error('Titre et contenu requis')
      return
    }
    setSending(true)
    try {
      await broadcastApi.create({ title: title.trim(), content: content.trim(), targetType })
      toast.success('Message diffusé aux écoles ciblées')
      setTitle('')
      setContent('')
      await load()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Échec de diffusion')
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-zinc-50 via-white to-zinc-50/80">
      <div className="max-w-5xl mx-auto px-6 py-8 space-y-6">
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-400">
            Communication
          </p>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 mt-1 flex items-center gap-2">
            <Megaphone size={22} className="text-zinc-500" />
            Diffusion aux écoles
          </h1>
          <p className="text-sm text-zinc-500 mt-1">
            Envoyez une annonce globale aux directeurs / admins — affichée sur leur tableau de bord.
          </p>
        </motion.div>

        <div className="rounded-2xl border border-zinc-200/80 bg-white p-5 shadow-sm space-y-4">
          <label className="block text-xs font-semibold uppercase tracking-wide text-zinc-400">
            Titre
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={160}
              placeholder="Maintenance planifiée samedi…"
              className="mt-1.5 w-full rounded-xl border border-zinc-200 bg-zinc-50/50 px-3 py-2.5 text-sm text-zinc-900"
            />
          </label>
          <label className="block text-xs font-semibold uppercase tracking-wide text-zinc-400">
            Message
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              maxLength={4000}
              rows={5}
              placeholder="Détails pour les établissements…"
              className="mt-1.5 w-full rounded-xl border border-zinc-200 bg-zinc-50/50 px-3 py-2.5 text-sm text-zinc-900 resize-y"
            />
          </label>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex gap-2">
              {(
                [
                  ['ALL_SCHOOLS', 'Toutes les écoles'],
                  ['ACTIVE_ONLY', 'Écoles actives uniquement'],
                ] as const
              ).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setTargetType(value)}
                  className={cn(
                    'inline-flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-semibold',
                    targetType === value
                      ? 'border-zinc-900 bg-zinc-900 text-white'
                      : 'border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50',
                  )}
                >
                  <Users size={12} />
                  {label}
                </button>
              ))}
            </div>
            <button
              type="button"
              disabled={sending}
              onClick={() => void send()}
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
            >
              {sending ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
              Diffuser
            </button>
          </div>
        </div>

        <div className="rounded-2xl border border-zinc-200/80 bg-white shadow-sm overflow-hidden">
          <div className="border-b border-zinc-100 px-5 py-3">
            <h2 className="text-sm font-semibold text-zinc-900">Historique des diffusions</h2>
          </div>
          {loading ? (
            <div className="flex items-center justify-center gap-2 py-12 text-sm text-zinc-400">
              <Loader2 size={16} className="animate-spin" /> Chargement…
            </div>
          ) : rows.length === 0 ? (
            <p className="py-12 text-center text-sm text-zinc-500">Aucune diffusion pour l’instant.</p>
          ) : (
            <ul className="divide-y divide-zinc-100">
              {rows.map((r) => (
                <li key={r.id} className="px-5 py-4">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold text-zinc-900">{r.title}</p>
                      <p className="text-xs text-zinc-500 mt-1 whitespace-pre-wrap line-clamp-3">
                        {r.content}
                      </p>
                    </div>
                    <div className="text-right text-[11px] text-zinc-400 space-y-1">
                      <p>{fmtDateTime(r.createdAt)}</p>
                      <p className="font-medium text-zinc-500">
                        {r.targetType === 'ACTIVE_ONLY' ? 'Actives' : 'Toutes'} · {r.readCount ?? 0}{' '}
                        lecture{(r.readCount ?? 0) > 1 ? 's' : ''}
                      </p>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}
