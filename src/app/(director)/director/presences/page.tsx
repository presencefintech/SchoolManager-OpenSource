'use client'

import { useEffect, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useRouter, useSearchParams } from 'next/navigation'
import { motion } from 'framer-motion'
import { Activity, RefreshCw, Filter } from 'lucide-react'
import { cn } from '@/lib/utils'
import { directorsApi } from '@/lib/admin/api/directors.api'
import { Skeleton } from '@/components/ui/skeleton'
import {
  DirectorPageHeader,
  DirectorEmptyState,
  DirectorKpiCard,
  PresenceStatusPill,
} from '@/components/director/director-ui'
import { AttendanceHistoryPanel } from '@/components/admin/presences/AttendanceHistoryPanel'

type Tab = 'live' | 'history' | 'heatmap'

function parseTab(raw: string | null): Tab {
  if (raw === 'history' || raw === 'heatmap' || raw === 'live') return raw
  return 'live'
}

function HeatmapChart({ classId }: { classId?: number }) {
  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['director', 'presence', 'heatmap', classId ?? 'all'],
    queryFn: () =>
      directorsApi.presenceHeatmap(classId ? { classId } : undefined),
    staleTime: 30_000,
  })

  if (isLoading) {
    return (
      <div className="flex h-44 items-end gap-1">
        {[...Array(24)].map((_, i) => (
          <div
            key={i}
            className="flex-1 animate-pulse rounded-t-md bg-zinc-100"
            style={{ height: `${30 + (i % 5) * 14}%` }}
          />
        ))}
      </div>
    )
  }

  if (!data?.length) {
    return (
      <DirectorEmptyState
        icon={Activity}
        title="Pas encore de données heatmap"
        description="Les pointages de la journée alimenteront ce graphique horaire."
      />
    )
  }

  const max = Math.max(...data.map((d) => d.count), 1)
  const total = data.reduce((s, d) => s + d.count, 0)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-xs text-zinc-500">
          <span className="font-semibold text-zinc-800 tabular-nums">{total}</span>{' '}
          pointage{total !== 1 ? 's' : ''} aujourd’hui
        </p>
        <button
          type="button"
          onClick={() => refetch()}
          className="inline-flex items-center gap-1.5 text-xs text-zinc-500 hover:text-emerald-700"
        >
          <RefreshCw size={12} className={cn(isFetching && 'animate-spin')} />
          Actualiser
        </button>
      </div>
      <div className="flex h-44 items-end gap-1">
        {data.map((d) => (
          <div key={d.hour} className="group relative flex flex-1 flex-col items-center gap-1">
            {d.count > 0 && (
              <span className="pointer-events-none absolute bottom-full z-10 mb-1 whitespace-nowrap rounded bg-zinc-800 px-1.5 py-0.5 text-[10px] text-white opacity-0 transition-opacity group-hover:opacity-100">
                {d.count} · {d.hour}
              </span>
            )}
            <div
              className={cn(
                'w-full rounded-t-md transition-colors',
                d.count > 0 ? 'bg-emerald-400 group-hover:bg-emerald-500' : 'bg-zinc-100'
              )}
              style={{
                height: `${Math.max((d.count / max) * 160, d.count > 0 ? 6 : 3)}px`,
              }}
            />
            <span className="text-[9px] text-zinc-400">{d.hour.replace('h', '')}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function DirectorPresencesPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [tab, setTab] = useState<Tab>(() => parseTab(searchParams.get('tab')))
  const [classId, setClassId] = useState('')

  useEffect(() => {
    setTab(parseTab(searchParams.get('tab')))
  }, [searchParams])

  const selectTab = (next: Tab) => {
    setTab(next)
    const params = new URLSearchParams(searchParams.toString())
    if (next === 'live') params.delete('tab')
    else params.set('tab', next)
    const qs = params.toString()
    router.replace(qs ? `?${qs}` : '/director/presences', { scroll: false })
  }

  const classesQuery = useQuery({
    queryKey: ['director', 'classes'],
    queryFn: () => directorsApi.myClasses(),
    staleTime: 60_000,
  })

  const sectionsQuery = useQuery({
    queryKey: ['director', 'sections'],
    queryFn: () => directorsApi.mySections(),
    staleTime: 60_000,
  })

  const summaryQuery = useQuery({
    queryKey: ['director', 'summary'],
    queryFn: () => directorsApi.summary(),
    staleTime: 30_000,
  })

  const classFilter = classId ? Number(classId) : undefined

  const liveQuery = useQuery({
    queryKey: ['director', 'presence', 'live', classFilter ?? 'all'],
    queryFn: () =>
      directorsApi.presenceLive({
        page: 1,
        limit: 80,
        ...(classFilter ? { classId: classFilter } : {}),
      }),
    staleTime: 15_000,
    refetchInterval: tab === 'live' ? 30_000 : false,
    enabled: tab === 'live',
  })

  const entries = liveQuery.data?.data ?? []
  const classes = classesQuery.data ?? []

  const statusCounts = useMemo(() => {
    const counts = { PRESENT: 0, LATE: 0, ABSENT: 0, OTHER: 0 }
    for (const e of entries) {
      if (e.status === 'PRESENT') counts.PRESENT += 1
      else if (e.status === 'LATE') counts.LATE += 1
      else if (e.status === 'ABSENT') counts.ABSENT += 1
      else counts.OTHER += 1
    }
    return counts
  }, [entries])

  return (
    <div className="min-h-screen pb-10">
      <DirectorPageHeader
        title="Présences"
        subtitle="Consultation lecture seule — classes de vos sections"
        actions={
          <div className="inline-flex rounded-xl border border-zinc-200 p-0.5 bg-zinc-50">
            {(['live', 'history', 'heatmap'] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => selectTab(t)}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-xs font-medium transition-colors',
                  tab === t
                    ? 'bg-white text-emerald-700 shadow-sm'
                    : 'text-zinc-500 hover:text-zinc-800'
                )}
              >
                {t === 'live' ? 'Live' : t === 'history' ? 'Historique' : 'Heatmap'}
              </button>
            ))}
          </div>
        }
      />

      <div className="max-w-6xl mx-auto px-6 sm:px-8 py-8 space-y-5">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <DirectorKpiCard
            label="Aujourd’hui"
            value={summaryQuery.data?.presenceToday ?? entries.length}
            hint="Pointages dans le périmètre"
            icon={Activity}
            tone="emerald"
          />
          <DirectorKpiCard
            label="Présents (liste)"
            value={statusCounts.PRESENT}
            icon={Activity}
            tone="emerald"
          />
          <DirectorKpiCard
            label="Retards (liste)"
            value={statusCounts.LATE}
            icon={Activity}
            tone="amber"
          />
          <DirectorKpiCard
            label="Classes suivies"
            value={classes.length}
            icon={Filter}
            tone="sky"
          />
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <label className="flex items-center gap-2 text-xs font-medium text-zinc-600">
            <Filter size={13} className="text-zinc-400" />
            Filtrer par classe
          </label>
          <select
            value={classId}
            onChange={(e) => setClassId(e.target.value)}
            className="sm:max-w-xs w-full px-3 py-2 rounded-xl border border-zinc-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-200"
          >
            <option value="">Toutes mes classes</option>
            {classes.map((c) => (
              <option key={c.id} value={String(c.id)}>
                {c.name} ({c.level})
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => liveQuery.refetch()}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs rounded-xl border border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50 sm:ml-auto"
          >
            <RefreshCw
              size={12}
              className={cn(liveQuery.isFetching && 'animate-spin')}
            />
            Actualiser
          </button>
        </div>

        <div className="bg-white rounded-2xl border border-zinc-200 p-5 sm:p-6">
          {tab === 'heatmap' ? (
            <HeatmapChart classId={classFilter} />
          ) : tab === 'history' ? (
            <AttendanceHistoryPanel
              mode="director"
              classes={classes.map((c) => ({
                id: c.id,
                name: c.name,
                sectionId: c.sectionId,
              }))}
              sections={(sectionsQuery.data ?? []).map((s) => ({
                id: s.sectionId,
                name: s.section.name,
              }))}
              initialClassId={classFilter ?? ''}
            />
          ) : liveQuery.isLoading ? (
            <div className="space-y-3">
              {[...Array(6)].map((_, i) => (
                <Skeleton key={i} className="h-12" />
              ))}
            </div>
          ) : entries.length === 0 ? (
            <DirectorEmptyState
              icon={Activity}
              title="Aucun pointage dans ce filtre"
              description={
                classes.length === 0
                  ? 'Votre périmètre ne contient pas encore de classes actives.'
                  : 'Aucun scan aujourd’hui pour la sélection. Essayez « Toutes mes classes » ou revenez plus tard.'
              }
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[560px]">
                <thead>
                  <tr className="border-b border-zinc-100">
                    <th className="text-left text-xs font-semibold text-zinc-400 uppercase tracking-wide pb-3">
                      Élève
                    </th>
                    <th className="text-left text-xs font-semibold text-zinc-400 uppercase tracking-wide pb-3">
                      Classe
                    </th>
                    <th className="text-left text-xs font-semibold text-zinc-400 uppercase tracking-wide pb-3">
                      Heure
                    </th>
                    <th className="text-left text-xs font-semibold text-zinc-400 uppercase tracking-wide pb-3">
                      Méthode
                    </th>
                    <th className="text-left text-xs font-semibold text-zinc-400 uppercase tracking-wide pb-3">
                      Statut
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-50">
                  {entries.map((row, i) => (
                    <motion.tr
                      key={row.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: Math.min(i * 0.015, 0.25) }}
                      className="hover:bg-zinc-50/80"
                    >
                      <td className="py-3 pr-4">
                        <p className="text-sm font-medium text-zinc-900">{row.studentName}</p>
                        <p className="text-[11px] text-zinc-400">{row.matricule}</p>
                      </td>
                      <td className="py-3 text-sm text-zinc-600">{row.className}</td>
                      <td className="py-3 text-sm text-zinc-500 tabular-nums">
                        {row.scannedAt
                          ? new Date(row.scannedAt).toLocaleTimeString('fr-FR', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })
                          : '—'}
                      </td>
                      <td className="py-3 text-xs text-zinc-400">{row.method || '—'}</td>
                      <td className="py-3">
                        <PresenceStatusPill status={row.status} />
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
              {liveQuery.data?.pagination && (
                <p className="text-[11px] text-zinc-400 mt-4">
                  {liveQuery.data.pagination.total} résultat
                  {liveQuery.data.pagination.total !== 1 ? 's' : ''}
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
