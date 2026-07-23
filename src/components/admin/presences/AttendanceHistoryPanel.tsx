'use client'

import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { History, RefreshCw } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Skeleton } from '@/components/ui/skeleton'
import { PresenceStatusBadge } from '@/components/admin/presences/PresenceStatusBadge'
import {
  presencesApi,
  type AttendanceHistoryItem,
} from '@/lib/admin/api/presences.api'
import { directorsApi } from '@/lib/admin/api/directors.api'

function defaultFrom(): string {
  const d = new Date()
  d.setDate(d.getDate() - 29)
  return d.toISOString().slice(0, 10)
}

function defaultTo(): string {
  return new Date().toISOString().slice(0, 10)
}

function formatDayFr(day: string): string {
  const [y, m, d] = day.split('-').map(Number)
  if (!y || !m || !d) return day
  return new Date(y, m - 1, d).toLocaleDateString('fr-FR', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

type Props = {
  mode: 'admin' | 'director'
  classes?: Array<{ id: number; name: string; sectionId?: number }>
  sections?: Array<{ id: number; name: string }>
  initialClassId?: number | ''
}

export function AttendanceHistoryPanel({
  mode,
  classes = [],
  sections = [],
  initialClassId = '',
}: Props) {
  const [classId, setClassId] = useState<number | ''>(initialClassId)
  const [sectionId, setSectionId] = useState<number | ''>('')
  const [status, setStatus] = useState<'' | 'PRESENT' | 'LATE' | 'ABSENT'>('')
  const [from, setFrom] = useState(defaultFrom)
  const [to, setTo] = useState(defaultTo)

  const params = useMemo(
    () => ({
      page: 1,
      limit: 80,
      from,
      to,
      ...(classId ? { classId } : {}),
      ...(sectionId ? { sectionId } : {}),
      ...(status ? { status } : {}),
    }),
    [classId, sectionId, status, from, to]
  )

  const query = useQuery({
    queryKey: [mode, 'presence', 'history', params],
    queryFn: () =>
      mode === 'director'
        ? directorsApi.presenceHistory(params)
        : presencesApi.getHistory(params),
    staleTime: 20_000,
  })

  const items: AttendanceHistoryItem[] = query.data?.data ?? []
  const total = query.data?.pagination?.total ?? items.length

  return (
    <div className="space-y-4">
      <div className="flex flex-col lg:flex-row lg:flex-wrap gap-3">
        <input
          type="date"
          value={from}
          onChange={(e) => setFrom(e.target.value)}
          className="px-3 py-2 rounded-xl border border-zinc-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-200"
        />
        <input
          type="date"
          value={to}
          onChange={(e) => setTo(e.target.value)}
          className="px-3 py-2 rounded-xl border border-zinc-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-200"
        />
        {sections.length > 0 && (
          <select
            value={sectionId}
            onChange={(e) => {
              setSectionId(e.target.value ? Number(e.target.value) : '')
              setClassId('')
            }}
            className="px-3 py-2 rounded-xl border border-zinc-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-200"
          >
            <option value="">Toutes sections</option>
            {sections.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        )}
        {classes.length > 0 && (
          <select
            value={classId}
            onChange={(e) => setClassId(e.target.value ? Number(e.target.value) : '')}
            className="px-3 py-2 rounded-xl border border-zinc-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-200"
          >
            <option value="">Toutes classes</option>
            {classes
              .filter((c) => !sectionId || (c as { sectionId?: number }).sectionId === sectionId)
              .map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
          </select>
        )}
        <select
          value={status}
          onChange={(e) =>
            setStatus(e.target.value as '' | 'PRESENT' | 'LATE' | 'ABSENT')
          }
          className="px-3 py-2 rounded-xl border border-zinc-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-200"
        >
          <option value="">Tous statuts</option>
          <option value="PRESENT">Présent</option>
          <option value="LATE">Retard</option>
          <option value="ABSENT">Absent</option>
        </select>
        <button
          type="button"
          onClick={() => query.refetch()}
          className="inline-flex items-center gap-1.5 px-3 py-2 text-xs rounded-xl border border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50 lg:ml-auto"
        >
          <RefreshCw size={12} className={cn(query.isFetching && 'animate-spin')} />
          Actualiser
        </button>
      </div>

      <p className="text-xs text-zinc-500">
        {total} pointage{total !== 1 ? 's' : ''} · élève, classe, section, option, jour et heure
      </p>

      {query.isLoading ? (
        <div className="space-y-3">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-12" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="py-12 text-center">
          <History className="mx-auto text-zinc-300 mb-2" size={28} />
          <p className="text-sm text-zinc-500">Aucun pointage sur cette période</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-zinc-100">
          <table className="w-full min-w-[760px]">
            <thead>
              <tr className="border-b border-zinc-100 bg-zinc-50/80">
                <th className="text-left text-[11px] font-semibold text-zinc-400 uppercase tracking-wide px-4 py-3">
                  Élève
                </th>
                <th className="text-left text-[11px] font-semibold text-zinc-400 uppercase tracking-wide px-4 py-3">
                  Classe / Section / Option
                </th>
                <th className="text-left text-[11px] font-semibold text-zinc-400 uppercase tracking-wide px-4 py-3">
                  Jour
                </th>
                <th className="text-left text-[11px] font-semibold text-zinc-400 uppercase tracking-wide px-4 py-3">
                  Heure
                </th>
                <th className="text-left text-[11px] font-semibold text-zinc-400 uppercase tracking-wide px-4 py-3">
                  Statut
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-50">
              {items.map((row) => (
                <tr key={row.id} className="hover:bg-zinc-50/80">
                  <td className="px-4 py-3">
                    <p className="text-sm font-medium text-zinc-900">{row.studentName}</p>
                    <p className="text-[11px] text-zinc-400">{row.matricule}</p>
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-sm text-zinc-800">{row.className}</p>
                    <p className="text-[11px] text-zinc-500">
                      {[row.sectionName, row.optionName].filter(Boolean).join(' · ') || '—'}
                    </p>
                  </td>
                  <td className="px-4 py-3 text-sm text-zinc-700 whitespace-nowrap">
                    {formatDayFr(row.day)}
                  </td>
                  <td className="px-4 py-3 text-sm tabular-nums text-zinc-700">{row.time}</td>
                  <td className="px-4 py-3">
                    <PresenceStatusBadge status={row.status} />
                    {row.lateByMinutes != null && row.lateByMinutes > 0 && (
                      <p className="text-[10px] text-amber-700 mt-0.5">+{row.lateByMinutes} min</p>
                    )}
                    {row.absenceReason && (
                      <p className="text-[10px] text-zinc-400 mt-0.5 truncate max-w-[140px]">
                        {row.absenceReason}
                      </p>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
