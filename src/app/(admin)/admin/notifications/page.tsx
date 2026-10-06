'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import {
  Bell, Send, Users, User, History, RefreshCw, CheckCircle, X, AlertTriangle, RotateCcw,
} from 'lucide-react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { cn } from '@/lib/utils'
import { adminNotificationsApi, type NotificationDlqItem } from '@/lib/admin/api/notifications.api'
import { useStaff } from '@/lib/hooks/use-admin'
import { getApiErrorMessage } from '@/lib/api/client'

const fadeUp = { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0, transition: { duration: 0.25 } } }

function Sk({ className }: { className?: string }) {
  return <div className={cn('rounded-xl bg-zinc-100 animate-pulse', className)} />
}

const ROLES = [
  { value: 'PARENT',  label: 'Parents' },
  { value: 'TEACHER', label: 'Enseignants' },
  { value: 'FINANCE', label: 'Finance' },
]

const CHANNEL_LABEL: Record<string, string> = {
  WEBSOCKET: 'Application',
  SMS: 'SMS',
  EMAIL: 'Email',
  PUSH: 'Push',
}

function useBroadcastGroup() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: { title: string; message: string; roles: string[] }) =>
      adminNotificationsApi.broadcastGroup(payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'notif', 'history'] }),
  })
}

function useSendDirect() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: { targetUserId: number; title: string; message: string }) =>
      adminNotificationsApi.sendDirect(payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'notif', 'history'] }),
  })
}

function useHistory() {
  return useQuery({
    queryKey: ['admin', 'notif', 'history'],
    queryFn: () => adminNotificationsApi.getHistory({ limit: 50 }),
    staleTime: 30_000,
  })
}

function useDlq(enabled: boolean) {
  return useQuery({
    queryKey: ['admin', 'notif', 'dlq'],
    queryFn: () => adminNotificationsApi.getDlq({ limit: 100 }),
    enabled,
    staleTime: 15_000,
  })
}

function useDeliverabilitySummary() {
  return useQuery({
    queryKey: ['admin', 'notif', 'deliverability-summary'],
    queryFn: () => adminNotificationsApi.getDeliverabilitySummary(),
    staleTime: 30_000,
  })
}

function useDeliverabilityList() {
  return useQuery({
    queryKey: ['admin', 'notif', 'deliverability'],
    queryFn: () => adminNotificationsApi.getDeliverability({ limit: 20 }),
    staleTime: 30_000,
  })
}

function useRetryDlq() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (deliveryId: string) => adminNotificationsApi.retryDlq(deliveryId),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['admin', 'notif', 'dlq'] })
    },
  })
}

function DlqPanel({
  items,
  loading,
  onRetry,
  retryingId,
  refetch,
}: {
  items: NotificationDlqItem[]
  loading: boolean
  onRetry: (id: string) => void
  retryingId: string | null
  refetch: () => void
}) {
  return (
    <motion.div
      variants={fadeUp}
      initial="hidden"
      animate="show"
      className="bg-white rounded-2xl border border-zinc-200 shadow-[0_1px_4px_rgba(0,0,0,0.06)] overflow-hidden"
    >
      <div className="px-5 py-4 border-b border-zinc-100 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-amber-50 flex items-center justify-center">
            <AlertTriangle size={14} className="text-amber-600" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-zinc-900">Livraisons en échec</h2>
            <p className="text-xs text-zinc-400">Livraisons en échec définitif — relance manuelle</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => refetch()}
          className="p-2 rounded-lg border border-zinc-200 text-zinc-400 hover:bg-zinc-50"
        >
          <RefreshCw size={14} />
        </button>
      </div>

      {loading ? (
        <div className="p-5 space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Sk key={i} className="h-16" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="py-16 text-center">
          <CheckCircle size={28} className="mx-auto text-emerald-300 mb-2" />
          <p className="text-sm text-zinc-500">Aucune livraison en échec</p>
          <p className="text-xs text-zinc-400 mt-1">Aucune relance n’est en attente pour cette école</p>
        </div>
      ) : (
        <div className="divide-y divide-zinc-50">
          {items.map((item) => (
            <div key={item.deliveryId} className="px-5 py-4 flex items-start justify-between gap-4">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-medium text-zinc-900 truncate">{item.title || 'Sans titre'}</p>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-100 text-zinc-500 font-medium">
                    {CHANNEL_LABEL[item.channel] ?? item.channel}
                  </span>
                  {item.notificationType && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 font-medium">
                      {item.notificationType}
                    </span>
                  )}
                </div>
                <p className="text-xs text-zinc-500 mt-0.5 truncate">
                  {item.userName ?? `Utilisateur #${item.userId}`} · {item.message}
                </p>
                {item.lastError && (
                  <p className="text-[11px] text-red-600 mt-1 font-mono truncate">{item.lastError}</p>
                )}
                <p className="text-[10px] text-zinc-400 mt-1">
                  {item.attempts} tentative{item.attempts !== 1 ? 's' : ''} ·{' '}
                  {new Date(item.createdAt).toLocaleString('fr-FR', {
                    day: '2-digit',
                    month: 'short',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </p>
              </div>
              <button
                type="button"
                disabled={retryingId === item.deliveryId || !item.deliveryId}
                onClick={() => onRetry(item.deliveryId)}
                className="flex-shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-amber-600 text-white hover:bg-amber-700 disabled:opacity-50"
              >
                <RotateCcw size={12} className={cn(retryingId === item.deliveryId && 'animate-spin')} />
                Relancer
              </button>
            </div>
          ))}
        </div>
      )}
    </motion.div>
  )
}

function extractDeliverabilityRows(data: unknown): Array<Record<string, unknown>> {
  if (Array.isArray(data)) return data as Array<Record<string, unknown>>
  if (data && typeof data === 'object') {
    const d = data as { items?: unknown; data?: unknown }
    if (Array.isArray(d.items)) return d.items as Array<Record<string, unknown>>
    if (Array.isArray(d.data)) return d.data as Array<Record<string, unknown>>
  }
  return []
}

export default function NotificationsPage() {
  const [tab, setTab] = useState<'group' | 'direct' | 'dlq'>('group')
  const [groupForm, setGroupForm] = useState({ title: '', message: '', roles: [] as string[] })
  const [directForm, setDirectForm] = useState({ targetUserId: '', title: '', message: '' })
  const [groupErr, setGroupErr] = useState('')
  const [directErr, setDirectErr] = useState('')
  const [groupOk, setGroupOk] = useState(false)
  const [directOk, setDirectOk] = useState(false)
  const [dlqErr, setDlqErr] = useState('')
  const [dlqOk, setDlqOk] = useState('')

  const broadcastGroup = useBroadcastGroup()
  const sendDirect = useSendDirect()
  const retryDlq = useRetryDlq()
  const { data: history, isLoading: histLoading, refetch } = useHistory()
  const deliverabilitySummary = useDeliverabilitySummary()
  const deliverabilityList = useDeliverabilityList()
  const {
    data: dlqItems = [],
    isLoading: dlqLoading,
    refetch: refetchDlq,
  } = useDlq(tab === 'dlq')
  const { data: staffList = [] } = useStaff()

  const histList = (history ?? []) as any[]
  const summary = deliverabilitySummary.data
  const deliverabilityRows = extractDeliverabilityRows(deliverabilityList.data)

  function toggleRole(role: string) {
    setGroupForm(f => ({
      ...f,
      roles: f.roles.includes(role) ? f.roles.filter(r => r !== role) : [...f.roles, role],
    }))
  }

  async function submitGroup(e: React.FormEvent) {
    e.preventDefault()
    setGroupErr('')
    setGroupOk(false)
    if (!groupForm.title || !groupForm.message || groupForm.roles.length === 0) {
      setGroupErr('Titre, message et au moins un rôle sont requis')
      return
    }
    try {
      await broadcastGroup.mutateAsync(groupForm)
      setGroupOk(true)
      setGroupForm({ title: '', message: '', roles: [] })
    } catch (err) { setGroupErr(getApiErrorMessage(err)) }
  }

  async function submitDirect(e: React.FormEvent) {
    e.preventDefault()
    setDirectErr('')
    setDirectOk(false)
    if (!directForm.targetUserId || !directForm.title || !directForm.message) {
      setDirectErr('Tous les champs sont requis')
      return
    }
    try {
      await sendDirect.mutateAsync({ ...directForm, targetUserId: Number(directForm.targetUserId) })
      setDirectOk(true)
      setDirectForm({ targetUserId: '', title: '', message: '' })
    } catch (err) { setDirectErr(getApiErrorMessage(err)) }
  }

  async function handleRetry(deliveryId: string) {
    setDlqErr('')
    setDlqOk('')
    try {
      await retryDlq.mutateAsync(deliveryId)
      setDlqOk('Relance planifiée')
    } catch (err) {
      setDlqErr(getApiErrorMessage(err))
    }
  }

  const inputCls = 'w-full px-3 py-2 rounded-lg border border-zinc-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-400 bg-white'

  return (
    <div className="min-h-screen bg-[#f5f7fb]">
      <div className="bg-white border-b border-zinc-200">
        <div className="max-w-6xl mx-auto flex items-center justify-between px-8 py-5">
          <div>
            <h1 className="text-2xl font-semibold text-zinc-900">Notifications</h1>
            <p className="text-sm text-zinc-400 mt-0.5">
              Diffusion, messages directs et reprise des échecs de livraison
            </p>
          </div>
          <button
            onClick={() => {
              void refetch()
              void deliverabilitySummary.refetch()
              void deliverabilityList.refetch()
              if (tab === 'dlq') void refetchDlq()
            }}
            className="p-2.5 rounded-xl border border-zinc-200 text-zinc-400 hover:bg-zinc-50 transition-colors"
          >
            <RefreshCw size={15} />
          </button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-8 pt-6">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-2">
          <div className="rounded-xl border border-zinc-200 bg-white px-4 py-3">
            <p className="text-[10px] uppercase tracking-wide text-zinc-400">Outbox OK</p>
            <p className="text-xl font-bold tabular-nums text-zinc-900">
              {deliverabilitySummary.isLoading ? '…' : summary?.outbox.completed ?? 0}
            </p>
          </div>
          <div className="rounded-xl border border-zinc-200 bg-white px-4 py-3">
            <p className="text-[10px] uppercase tracking-wide text-zinc-400">Outbox échecs</p>
            <p className="text-xl font-bold tabular-nums text-rose-600">
              {deliverabilitySummary.isLoading ? '…' : summary?.outbox.failed ?? 0}
            </p>
          </div>
          <div className="rounded-xl border border-zinc-200 bg-white px-4 py-3">
            <p className="text-[10px] uppercase tracking-wide text-zinc-400">Livraisons envoyées</p>
            <p className="text-xl font-bold tabular-nums text-zinc-900">
              {deliverabilitySummary.isLoading ? '…' : summary?.deliveries.sent ?? 0}
            </p>
          </div>
          <div className="rounded-xl border border-zinc-200 bg-white px-4 py-3">
            <p className="text-[10px] uppercase tracking-wide text-zinc-400">Livraisons mortes</p>
            <p className="text-xl font-bold tabular-nums text-amber-700">
              {deliverabilitySummary.isLoading ? '…' : summary?.deliveries.dead ?? 0}
            </p>
          </div>
        </div>
        {deliverabilityRows.length > 0 && (
          <p className="text-[11px] text-zinc-400 mb-4">
            Dernières livraisons suivies : {deliverabilityRows.length} entrée(s)
          </p>
        )}
      </div>

      <div className="max-w-6xl mx-auto px-8 py-8 grid grid-cols-[1fr_380px] gap-6">
        <div className="space-y-5">
          <div className="bg-white rounded-2xl border border-zinc-200 shadow-[0_1px_4px_rgba(0,0,0,0.06)] p-1 flex gap-1">
            {(
              [
                ['group', 'Diffusion groupe', Users],
                ['direct', 'Message direct', User],
                ['dlq', 'Échecs de livraison', AlertTriangle],
              ] as const
            ).map(([key, label, Icon]) => (
              <button
                key={key}
                onClick={() => setTab(key)}
                className={cn(
                  'flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-sm font-medium transition-colors',
                  tab === key ? 'bg-emerald-600 text-white shadow-sm' : 'text-zinc-500 hover:bg-zinc-50',
                  key === 'dlq' && tab !== 'dlq' && 'text-amber-700',
                )}
              >
                <Icon size={14} />
                {label}
              </button>
            ))}
          </div>

          {tab === 'group' && (
            <motion.div variants={fadeUp} initial="hidden" animate="show"
              className="bg-white rounded-2xl border border-zinc-200 shadow-[0_1px_4px_rgba(0,0,0,0.06)] p-6">
              <div className="flex items-center gap-2 mb-5">
                <div className="w-8 h-8 rounded-xl bg-emerald-50 flex items-center justify-center">
                  <Users size={14} className="text-emerald-600" />
                </div>
                <h2 className="text-sm font-semibold text-zinc-900">Diffusion de groupe</h2>
              </div>

              <form onSubmit={submitGroup} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-zinc-500 mb-1.5">Destinataires</label>
                  <div className="flex gap-2">
                    {ROLES.map(({ value, label }) => (
                      <button
                        key={value}
                        type="button"
                        onClick={() => toggleRole(value)}
                        className={cn(
                          'px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors',
                          groupForm.roles.includes(value)
                            ? 'bg-emerald-600 text-white border-emerald-600'
                            : 'bg-white text-zinc-500 border-zinc-200 hover:border-emerald-300',
                        )}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-zinc-500 mb-1.5">Titre</label>
                  <input value={groupForm.title} onChange={e => setGroupForm(f => ({ ...f, title: e.target.value }))}
                    placeholder="Objet du message" className={inputCls} />
                </div>

                <div>
                  <label className="block text-xs font-medium text-zinc-500 mb-1.5">Message</label>
                  <textarea value={groupForm.message} onChange={e => setGroupForm(f => ({ ...f, message: e.target.value }))}
                    rows={5} placeholder="Contenu de la notification…" className={inputCls} />
                </div>

                {groupErr && (
                  <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-red-50 border border-red-100">
                    <X size={13} className="text-red-500 flex-shrink-0" />
                    <p className="text-xs text-red-700">{groupErr}</p>
                  </div>
                )}
                {groupOk && (
                  <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-50 border border-emerald-100">
                    <CheckCircle size={13} className="text-emerald-600 flex-shrink-0" />
                    <p className="text-xs text-emerald-700">Notification envoyée avec succès</p>
                  </div>
                )}

                <button type="submit" disabled={broadcastGroup.isPending}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold disabled:opacity-50 transition-colors">
                  <Send size={14} />
                  {broadcastGroup.isPending ? 'Envoi…' : 'Envoyer à tous'}
                </button>
              </form>
            </motion.div>
          )}

          {tab === 'direct' && (
            <motion.div variants={fadeUp} initial="hidden" animate="show"
              className="bg-white rounded-2xl border border-zinc-200 shadow-[0_1px_4px_rgba(0,0,0,0.06)] p-6">
              <div className="flex items-center gap-2 mb-5">
                <div className="w-8 h-8 rounded-xl bg-indigo-50 flex items-center justify-center">
                  <User size={14} className="text-indigo-600" />
                </div>
                <h2 className="text-sm font-semibold text-zinc-900">Message direct</h2>
              </div>

              <form onSubmit={submitDirect} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-zinc-500 mb-1.5">Destinataire</label>
                  <select
                    value={directForm.targetUserId}
                    onChange={e => setDirectForm(f => ({ ...f, targetUserId: e.target.value }))}
                    className={inputCls}
                  >
                    <option value="">— Sélectionner un membre —</option>
                    {staffList.map(s => (
                      <option key={s.id} value={String(s.id)}>
                        {[s.firstName, s.lastName].filter(Boolean).join(' ') || s.email || `#${s.id}`}
                        {s.role ? ` · ${s.role}` : ''}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-500 mb-1.5">Titre</label>
                  <input value={directForm.title} onChange={e => setDirectForm(f => ({ ...f, title: e.target.value }))}
                    placeholder="Objet du message" className={inputCls} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-500 mb-1.5">Message</label>
                  <textarea value={directForm.message} onChange={e => setDirectForm(f => ({ ...f, message: e.target.value }))}
                    rows={5} placeholder="Contenu de la notification…" className={inputCls} />
                </div>

                {directErr && (
                  <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-red-50 border border-red-100">
                    <X size={13} className="text-red-500 flex-shrink-0" />
                    <p className="text-xs text-red-700">{directErr}</p>
                  </div>
                )}
                {directOk && (
                  <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-50 border border-emerald-100">
                    <CheckCircle size={13} className="text-emerald-600 flex-shrink-0" />
                    <p className="text-xs text-emerald-700">Message envoyé</p>
                  </div>
                )}

                <button type="submit" disabled={sendDirect.isPending}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold disabled:opacity-50 transition-colors">
                  <Send size={14} />
                  {sendDirect.isPending ? 'Envoi…' : 'Envoyer'}
                </button>
              </form>
            </motion.div>
          )}

          {tab === 'dlq' && (
            <div className="space-y-3">
              {(dlqErr || dlqOk) && (
                <div
                  className={cn(
                    'flex items-center gap-2 px-3 py-2 rounded-lg border text-xs',
                    dlqErr ? 'bg-red-50 border-red-100 text-red-700' : 'bg-emerald-50 border-emerald-100 text-emerald-700',
                  )}
                >
                  {dlqErr ? <X size={13} /> : <CheckCircle size={13} />}
                  {dlqErr || dlqOk}
                </div>
              )}
              <DlqPanel
                items={dlqItems}
                loading={dlqLoading}
                onRetry={handleRetry}
                retryingId={retryDlq.isPending ? (retryDlq.variables ?? null) : null}
                refetch={() => { void refetchDlq() }}
              />
            </div>
          )}
        </div>

        <div className="bg-white rounded-2xl border border-zinc-200 shadow-[0_1px_4px_rgba(0,0,0,0.06)]">
          <div className="px-5 py-4 border-b border-zinc-100 flex items-center gap-2">
            <History size={14} className="text-zinc-400" />
            <h2 className="text-sm font-semibold text-zinc-900">Historique</h2>
          </div>

          {histLoading ? (
            <div className="p-5 space-y-3">
              {Array.from({ length: 5 }).map((_, i) => <Sk key={i} className="h-14" />)}
            </div>
          ) : histList.length === 0 ? (
            <div className="py-14 text-center">
              <Bell size={26} className="mx-auto text-zinc-200 mb-2" />
              <p className="text-xs text-zinc-400">Aucune notification envoyée</p>
            </div>
          ) : (
            <div className="divide-y divide-zinc-50">
              {histList.map((n: any, i: number) => (
                <div key={n.id ?? i} className="px-5 py-4">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-medium text-zinc-900 truncate">{n.title ?? n.subject ?? '—'}</p>
                    <span className="text-[10px] text-zinc-400 flex-shrink-0">
                      {n.createdAt ? new Date(n.createdAt).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : ''}
                    </span>
                  </div>
                  <p className="text-xs text-zinc-400 mt-0.5 truncate">{n.message ?? n.body ?? ''}</p>
                  {n.targetRoles && (
                    <div className="flex gap-1 mt-1.5">
                      {(Array.isArray(n.targetRoles) ? n.targetRoles : [n.targetRoles]).map((r: string) => (
                        <span key={r} className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-100 text-zinc-500 font-medium">{r}</span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
