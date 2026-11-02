'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Calendar, Users } from 'lucide-react'
import { cn } from '@/lib/utils'
import { staffAttendanceApi, staffAttendanceKeys } from '@/lib/admin/api/staff-attendance.api'
import type { StaffDayStatus } from '@/types/staff-attendance'
import { STAFF_DAY_STATUS_LABEL, STAFF_DAY_STATUS_STYLE, formatInstantHHMM, todayDateValue } from '@/lib/admin/staff-attendance.utils'
import { Skeleton } from '@/components/ui/skeleton'
import { StaffDayStatusBadge } from './StaffDayStatusBadge'

const COUNT_TILES: StaffDayStatus[] = ['PRESENT', 'LATE', 'ABSENT', 'ON_LEAVE', 'ON_MISSION', 'REST', 'EXPECTED']

export function DayBoardPanel({ onOpenCalendar }: { onOpenCalendar: (staffId: number) => void }) {
  const [date, setDate] = useState(todayDateValue())

  const dayQuery = useQuery({
    queryKey: staffAttendanceKeys.day(date),
    queryFn: () => staffAttendanceApi.getDay(date),
    staleTime: 15_000,
  })

  const day = dayQuery.data

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-sm font-semibold text-zinc-800">Tableau du jour</h2>
          <p className="text-xs text-zinc-400 mt-0.5">Les journées sont recalculées à chaque lecture — toujours à jour.</p>
        </div>
        <div className="relative">
          <Calendar size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            max={todayDateValue()}
            className="pl-9 pr-3 py-2 rounded-xl border border-zinc-200 text-sm"
          />
        </div>
      </div>

      {dayQuery.isLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-16" />)}
        </div>
      ) : day ? (
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
          {COUNT_TILES.map((status) => (
            <div key={status} className="bg-white rounded-2xl border border-zinc-100 px-4 py-3 shadow-sm">
              <p className={cn('text-[11px] font-medium rounded-full inline-block px-2 py-0.5', STAFF_DAY_STATUS_STYLE[status])}>
                {STAFF_DAY_STATUS_LABEL[status]}
              </p>
              <p className="text-xl font-bold text-zinc-900 leading-none tabular-nums mt-2">{day.counts[status] ?? 0}</p>
            </div>
          ))}
        </div>
      ) : null}

      <div className="bg-white rounded-2xl border border-zinc-200 overflow-hidden">
        {dayQuery.isLoading ? (
          <div className="p-6 space-y-3">{[...Array(6)].map((_, i) => <Skeleton key={i} className="h-12" />)}</div>
        ) : !day || day.staff.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-2 text-sm text-zinc-400">
            <Users size={28} className="text-zinc-200" />
            Aucun employé
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-zinc-100">
                  <th className="text-left text-xs font-semibold text-zinc-400 uppercase tracking-wide px-4 py-3">Employé</th>
                  <th className="text-left text-xs font-semibold text-zinc-400 uppercase tracking-wide px-4 py-3">Fonction</th>
                  <th className="text-left text-xs font-semibold text-zinc-400 uppercase tracking-wide px-4 py-3">Arrivée</th>
                  <th className="text-left text-xs font-semibold text-zinc-400 uppercase tracking-wide px-4 py-3">Départ</th>
                  <th className="text-left text-xs font-semibold text-zinc-400 uppercase tracking-wide px-4 py-3">Statut</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-50">
                {day.staff.map((s) => (
                  <tr key={s.id} className="hover:bg-zinc-50 transition-colors">
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        onClick={() => onOpenCalendar(s.id)}
                        className="text-sm font-medium text-zinc-900 hover:text-emerald-700 hover:underline"
                      >
                        {s.firstName} {s.lastName}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-sm text-zinc-500">{s.jobTitle || '—'}</td>
                    <td className="px-4 py-3 text-sm text-zinc-700 tabular-nums">{formatInstantHHMM(s.day.arrivalAt)}</td>
                    <td className="px-4 py-3 text-sm text-zinc-700 tabular-nums">{formatInstantHHMM(s.day.departureAt)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <StaffDayStatusBadge status={s.day.status} />
                        {s.day.corrected && (
                          <span
                            title={s.day.correction?.reason}
                            className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-violet-50 text-violet-700"
                          >
                            corrigé
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
