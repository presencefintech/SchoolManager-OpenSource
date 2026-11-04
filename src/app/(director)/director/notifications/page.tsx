'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { RefreshCw, Bell, CalendarClock, ShieldAlert, Handshake, ClipboardList } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { cn } from '@/lib/utils'
import { directorActionItemsApi, type DirectorActionItemType } from '@/lib/admin/api/director-action-items.api'
import { DirectorPageHeader, DirectorEmptyState, DirectorKpiCard } from '@/components/director/director-ui'

const TYPE_META: Record<DirectorActionItemType, { label: string; icon: typeof Bell; tone: string }> = {
  leave: { label: 'Congé à traiter', icon: CalendarClock, tone: 'bg-sky-50 text-sky-700' },
  discipline: { label: 'Discipline à délibérer', icon: ShieldAlert, tone: 'bg-amber-50 text-amber-800' },
  meeting: { label: 'Compte-rendu à saisir', icon: Handshake, tone: 'bg-indigo-50 text-indigo-700' },
  report: { label: 'Rapport à finaliser', icon: ClipboardList, tone: 'bg-violet-50 text-violet-700' },
}

export default function DirectorNotificationsPage() {
  const query = useQuery({
    queryKey: ['director', 'action-items'],
    queryFn: () => directorActionItemsApi.list(),
    staleTime: 30_000,
    refetchInterval: 60_000,
  })

  const data = query.data
  const items = data?.items ?? []

  return (
    <div className="min-h-screen bg-zinc-50">
      <DirectorPageHeader
        title="Notifications"
        subtitle="Tâches en attente sur votre périmètre — congés, discipline, réunions, rapports"
        actions={
          <button
            type="button"
            onClick={() => query.refetch()}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-sm rounded-xl border border-zinc-200 bg-white hover:bg-zinc-50"
          >
            <RefreshCw size={14} className={cn(query.isFetching && 'animate-spin')} />
            Actualiser
          </button>
        }
      />

      <div className="max-w-4xl mx-auto px-6 sm:px-8 py-8 space-y-6">
        {data && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <DirectorKpiCard label="Congés" value={data.counts.leaves} icon={CalendarClock} tone="sky" />
            <DirectorKpiCard label="Discipline" value={data.counts.discipline} icon={ShieldAlert} tone="amber" />
            <DirectorKpiCard label="Réunions" value={data.counts.meetings} icon={Handshake} tone="indigo" />
            <DirectorKpiCard label="Rapports" value={data.counts.reports} icon={ClipboardList} tone="emerald" />
          </div>
        )}

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl border border-zinc-200 bg-white overflow-hidden"
        >
          {query.isLoading ? (
            <div className="p-8 text-center text-sm text-zinc-400">Chargement…</div>
          ) : items.length === 0 ? (
            <DirectorEmptyState
              icon={Bell}
              title="Rien en attente"
              description="Toutes vos tâches sont à jour."
            />
          ) : (
            <ul className="divide-y divide-zinc-100">
              {items.map((item) => {
                const meta = TYPE_META[item.type]
                const Icon = meta.icon
                return (
                  <li key={`${item.type}-${item.id}`}>
                    <Link
                      href={item.href}
                      className="flex items-center gap-3 px-4 py-3 hover:bg-zinc-50/80 transition-colors"
                    >
                      <span className={cn('w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0', meta.tone)}>
                        <Icon size={15} />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-zinc-900 truncate">{item.label}</p>
                        <p className="text-[11px] text-zinc-400">
                          {meta.label} · {new Date(item.date).toLocaleDateString('fr-FR')}
                        </p>
                      </div>
                    </Link>
                  </li>
                )
              })}
            </ul>
          )}
        </motion.div>
      </div>
    </div>
  )
}
