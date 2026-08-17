'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Activity, RefreshCw, Filter } from 'lucide-react'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { cn } from '@/lib/utils'
import { useAttendanceNotificationDeliveries } from '@/lib/hooks/use-admin'
import { useAdminRealtimeStatus } from '@/lib/admin/hooks/admin-realtime-provider'
import type { AttendanceNotificationDelivery } from '@/types/admin'

const STATUS_OPTIONS = [
  { value: '', label: 'Tous' },
  { value: 'PENDING', label: 'En attente' },
  { value: 'SENT', label: 'Envoyé' },
  { value: 'DELIVERED', label: 'Délivré' },
  { value: 'FAILED', label: 'Échec' },
  { value: 'READ', label: 'Lu' },
  { value: 'ACKNOWLEDGED', label: 'Accusé' },
] as const

const STATUS_STYLES: Record<string, string> = {
  PENDING: 'bg-zinc-100 text-zinc-600',
  SENT: 'bg-blue-50 text-blue-700',
  DELIVERED: 'bg-emerald-50 text-emerald-700',
  FAILED: 'bg-red-50 text-red-700',
  READ: 'bg-violet-50 text-violet-700',
  ACKNOWLEDGED: 'bg-indigo-50 text-indigo-700',
}

function fmtDate(iso: string | null) {
  if (!iso) return '—'
  try {
    return format(new Date(iso), 'dd MMM yyyy HH:mm', { locale: fr })
  } catch {
    return iso
  }
}

function LiveBadge({ status }: { status: ReturnType<typeof useAdminRealtimeStatus>['status'] }) {
  const cfg = {
    live: { label: 'Temps réel', dot: 'bg-emerald-500 animate-pulse' },
    connecting: { label: 'Connexion…', dot: 'bg-amber-400' },
    polling: { label: 'Actualisation', dot: 'bg-zinc-400' },
    offline: { label: 'Hors ligne', dot: 'bg-zinc-300' },
  }[status]

  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-zinc-500">
      <span className={cn('h-2 w-2 rounded-full', cfg.dot)} />
      {cfg.label}
    </span>
  )
}

function DeliveryRow({ row }: { row: AttendanceNotificationDelivery }) {
  return (
    <tr className="border-b border-zinc-50 hover:bg-zinc-50/80">
      <td className="px-4 py-3 text-sm text-zinc-800">{row.title}</td>
      <td className="px-4 py-3 text-xs text-zinc-500 max-w-xs truncate">{row.message}</td>
      <td className="px-4 py-3 text-xs text-zinc-500">#{row.studentId}</td>
      <td className="px-4 py-3 text-xs text-zinc-500">{row.channel ?? '—'}</td>
      <td className="px-4 py-3">
        <span
          className={cn(
            'inline-flex px-2 py-0.5 rounded-full text-[10px] font-medium',
            STATUS_STYLES[row.status] ?? 'bg-zinc-100 text-zinc-600',
          )}
        >
          {STATUS_OPTIONS.find((o) => o.value === row.status)?.label ?? row.status}
        </span>
      </td>
      <td className="px-4 py-3 text-xs text-zinc-400 whitespace-nowrap">{fmtDate(row.createdAt)}</td>
      <td className="px-4 py-3 text-xs text-zinc-400 whitespace-nowrap">{fmtDate(row.sentAt)}</td>
    </tr>
  )
}

export default function AttendanceNotificationsPage() {
  const [statusFilter, setStatusFilter] = useState('')
  const { status: realtimeStatus } = useAdminRealtimeStatus()
  const { data, isLoading, refetch, isFetching } = useAttendanceNotificationDeliveries({
    status: statusFilter || undefined,
    limit: 50,
  })

  const deliveries = data?.deliveries ?? []

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-wrap items-start justify-between gap-4"
      >
        <div>
          <h1 className="text-xl font-bold text-zinc-900 flex items-center gap-2">
            <Activity size={22} className="text-emerald-600" />
            Livraisons présence
          </h1>
          <p className="text-sm text-zinc-500 mt-0.5">
            Notifications envoyées aux parents après un pointage ou une absence
          </p>
        </div>
        <div className="flex items-center gap-3">
          <LiveBadge status={realtimeStatus} />
          <button
            onClick={() => void refetch()}
            disabled={isFetching}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-zinc-600 border border-zinc-200 rounded-lg hover:bg-white disabled:opacity-50"
          >
            <RefreshCw size={14} className={cn(isFetching && 'animate-spin')} />
            Actualiser
          </button>
        </div>
      </motion.div>

      <div className="flex items-center gap-2">
        <Filter size={14} className="text-zinc-400" />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="text-sm border border-zinc-200 rounded-lg px-3 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
        >
          {STATUS_OPTIONS.map((opt) => (
            <option key={opt.value || 'all'} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      <div className="bg-white rounded-xl border border-zinc-200 overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center">
            <RefreshCw size={20} className="mx-auto text-zinc-300 animate-spin mb-2" />
            <p className="text-sm text-zinc-400">Chargement…</p>
          </div>
        ) : deliveries.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-sm text-zinc-500">Aucune livraison pour ce filtre.</p>
            <p className="text-xs text-zinc-400 mt-1">
              Les notifications parents apparaîtront ici après un pointage.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-zinc-100 bg-zinc-50/80 text-xs font-medium text-zinc-500 uppercase tracking-wide">
                  <th className="px-4 py-3">Titre</th>
                  <th className="px-4 py-3">Message</th>
                  <th className="px-4 py-3">Élève</th>
                  <th className="px-4 py-3">Canal</th>
                  <th className="px-4 py-3">Statut</th>
                  <th className="px-4 py-3">Créé</th>
                  <th className="px-4 py-3">Envoyé</th>
                </tr>
              </thead>
              <tbody>
                {deliveries.map((row) => (
                  <DeliveryRow key={row.id} row={row} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
