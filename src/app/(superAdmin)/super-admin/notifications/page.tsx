'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import {
  Bell, Send, List, Trash2, CheckCircle2, AlertCircle, Loader2,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useNotificationLogs, useQueueStatus } from '@/lib/hooks/use-super-admin'
import { notificationsApi } from '@/lib/superAdmin/api/notifications.api'

type Feedback = { type: 'success' | 'error'; message: string } | null

function Sk({ className }: { className?: string }) {
  return <div className={cn('rounded-xl bg-zinc-100 animate-pulse', className)} />
}

export default function NotificationsPage() {
  const { data: logs, isLoading: loadingLogs, refetch: refetchLogs } = useNotificationLogs({ limit: 50 })
  const { data: queue, isLoading: loadingQueue } = useQueueStatus()

  /* Broadcast */
  const [title, setTitle] = useState('')
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [broadcastFeedback, setBroadcastFeedback] = useState<Feedback>(null)

  /* Cleanup */
  const [cleaning, setCleaning] = useState(false)
  const [cleanupFeedback, setCleanupFeedback] = useState<Feedback>(null)

  const handleBroadcast = async () => {
    if (!title || !message) return
    setSending(true)
    setBroadcastFeedback(null)
    try {
      const res = await notificationsApi.broadcast({ title, message })
      setBroadcastFeedback({ type: 'success', message: `${res.sent} notification(s) envoyée(s)` })
      setTitle('')
      setMessage('')
      refetchLogs()
    } catch {
      setBroadcastFeedback({ type: 'error', message: 'Erreur lors de l\'envoi' })
    } finally {
      setSending(false)
    }
  }

  const handleCleanup = async () => {
    setCleaning(true)
    setCleanupFeedback(null)
    try {
      const res = await notificationsApi.cleanup()
      setCleanupFeedback({ type: 'success', message: `${res.deleted} notification(s) supprimée(s)` })
      refetchLogs()
    } catch {
      setCleanupFeedback({ type: 'error', message: 'Erreur lors du nettoyage' })
    } finally {
      setCleaning(false)
    }
  }

  return (
    <div className="min-h-screen bg-zinc-50">

      {/* Header */}
      <motion.div className="bg-white border-b border-zinc-200" initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
        <div className="max-w-5xl mx-auto px-8 py-6 flex items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold text-zinc-900 tracking-tight">Notifications</h1>
            <p className="text-sm text-zinc-400 mt-1">Diffusion globale et historique des notifications</p>
          </div>
          {!loadingQueue && queue && (
            <div className="flex items-center gap-2 text-xs text-zinc-400 bg-zinc-50 border border-zinc-200 px-3 py-2 rounded-xl">
              <span className={cn('w-2 h-2 rounded-full', queue.redisEnabled ? 'bg-emerald-400' : 'bg-red-400')} />
              Queue {queue.redisEnabled ? 'active' : 'off'} · {queue.waiting} en attente
            </div>
          )}
        </div>
      </motion.div>

      <div className="max-w-5xl mx-auto px-8 py-8 space-y-6">

        {/* ══ DIFFUSION GLOBALE ══════════════════════════════════════════════ */}
        <div className="bg-white rounded-2xl border border-zinc-200 shadow-[0_2px_12px_rgba(0,0,0,0.06)] p-7">
          <div className="flex items-center gap-2 mb-5">
            <Send size={16} className="text-indigo-500" />
            <h2 className="text-base font-semibold text-zinc-900">Diffusion globale</h2>
          </div>
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-zinc-500 mb-1">Titre</label>
              <input
                type="text"
                placeholder="Titre de la notification…"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full border border-zinc-200 rounded-xl px-3 py-2.5 text-sm text-zinc-700 focus:outline-none focus:ring-2 focus:ring-indigo-200 placeholder:text-zinc-300"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-500 mb-1">Message</label>
              <textarea
                rows={4}
                placeholder="Contenu de la notification envoyée à tous les établissements…"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="w-full border border-zinc-200 rounded-xl px-3 py-2.5 text-sm text-zinc-700 focus:outline-none focus:ring-2 focus:ring-indigo-200 placeholder:text-zinc-300 resize-none"
              />
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={handleBroadcast}
                disabled={sending || !title || !message}
                className="flex items-center gap-2 px-5 py-2.5 text-sm font-medium bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 disabled:opacity-40 transition-colors"
              >
                {sending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                Envoyer à tous
              </button>
              {broadcastFeedback && (
                <div className={cn(
                  'flex items-center gap-2 text-sm px-3 py-2 rounded-lg',
                  broadcastFeedback.type === 'success' ? 'text-emerald-700 bg-emerald-50' : 'text-red-600 bg-red-50'
                )}>
                  {broadcastFeedback.type === 'success' ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />}
                  {broadcastFeedback.message}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ══ HISTORIQUE ══════════════════════════════════════════════════════ */}
        <div className="bg-white rounded-2xl border border-zinc-200 shadow-[0_2px_12px_rgba(0,0,0,0.06)] overflow-hidden">
          <div className="flex items-center justify-between px-7 py-5 border-b border-zinc-100">
            <div className="flex items-center gap-2">
              <List size={14} className="text-zinc-400" />
              <h2 className="text-base font-semibold text-zinc-900">Historique</h2>
              {logs && <span className="text-xs text-zinc-400 tabular-nums ml-2">{logs.length} entrée(s)</span>}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleCleanup}
                disabled={cleaning}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-zinc-200 rounded-lg text-zinc-500 hover:bg-zinc-50 disabled:opacity-40 transition-colors"
              >
                {cleaning ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
                Nettoyer
              </button>
              {cleanupFeedback && (
                <span className={cn('text-xs', cleanupFeedback.type === 'success' ? 'text-emerald-600' : 'text-red-500')}>
                  {cleanupFeedback.message}
                </span>
              )}
            </div>
          </div>

          {loadingLogs ? (
            <div className="divide-y divide-zinc-100">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="px-7 py-4 flex gap-4">
                  <Sk className="h-3 w-24 flex-shrink-0" />
                  <Sk className="h-3 flex-1" />
                  <Sk className="h-3 w-16 flex-shrink-0" />
                </div>
              ))}
            </div>
          ) : logs?.length ? (
            <div className="divide-y divide-zinc-100 max-h-[480px] overflow-y-auto">
              {logs.map((log) => (
                <div key={log.id} className="flex items-start gap-4 px-7 py-4 hover:bg-zinc-50 transition-colors">
                  <div className="flex-shrink-0 pt-0.5">
                    <Bell size={13} className="text-zinc-300" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-zinc-800 truncate">{log.title ?? `#${log.id}`}</p>
                    {log.message && <p className="text-xs text-zinc-400 mt-0.5 truncate">{log.message}</p>}
                    {log.recipient && <p className="text-xs text-zinc-300 mt-0.5">→ {log.recipient}</p>}
                  </div>
                  <div className="flex-shrink-0 text-right">
                    {log.status && (
                      <span className={cn(
                        'text-[10px] font-semibold px-2 py-0.5 rounded-full',
                        log.status === 'SENT' ? 'bg-emerald-50 text-emerald-600'
                        : log.status === 'FAILED' ? 'bg-red-50 text-red-500'
                        : 'bg-zinc-100 text-zinc-500'
                      )}>
                        {log.status}
                      </span>
                    )}
                    <p className="text-[10px] text-zinc-300 mt-1 tabular-nums">
                      {new Date(log.createdAt).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="px-7 py-16 text-center">
              <Bell size={28} className="mx-auto text-zinc-200 mb-3" />
              <p className="text-sm text-zinc-400">Aucune notification enregistrée</p>
            </div>
          )}
        </div>

      </div>
    </div>
  )
}
