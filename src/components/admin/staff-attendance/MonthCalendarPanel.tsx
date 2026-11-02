'use client'

import { useEffect, useMemo, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { CalendarDays } from 'lucide-react'
import { cn } from '@/lib/utils'
import { staffAttendanceApi, staffAttendanceKeys } from '@/lib/admin/api/staff-attendance.api'
import type { StaffDay } from '@/types/staff-attendance'
import {
  STAFF_DAY_STATUS_LABEL,
  STAFF_DAY_STATUS_STYLE,
  currentMonthValue,
  staffFullName,
} from '@/lib/admin/staff-attendance.utils'
import { Skeleton } from '@/components/ui/skeleton'
import { CorrectionModal } from './CorrectionModal'

const WEEKDAY_HEADERS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim']

function buildWeeks(days: StaffDay[]): (StaffDay | null)[][] {
  if (days.length === 0) return []
  const firstWeekday = (new Date(`${days[0].date}T00:00:00`).getDay() + 6) % 7
  const cells: (StaffDay | null)[] = [...Array(firstWeekday).fill(null), ...days]
  const weeks: (StaffDay | null)[][] = []
  for (let i = 0; i < cells.length; i += 7) {
    weeks.push([...cells.slice(i, i + 7), ...Array(7).fill(null)].slice(0, 7))
  }
  return weeks
}

export function MonthCalendarPanel({
  staffId,
  onStaffIdChange,
}: {
  staffId: number | null
  onStaffIdChange: (id: number) => void
}) {
  const qc = useQueryClient()
  const [month, setMonth] = useState(currentMonthValue())
  const [correctionDate, setCorrectionDate] = useState<string | null>(null)

  // Tous les employés (actifs + désactivés) : le mois d'un employé désactivé reste consultable.
  const staffQuery = useQuery({
    queryKey: staffAttendanceKeys.staffList(),
    queryFn: () => staffAttendanceApi.listStaff(),
    staleTime: 30_000,
  })

  useEffect(() => {
    if (staffId == null && staffQuery.data && staffQuery.data.length > 0) {
      const firstActive = staffQuery.data.find((s) => s.active)
      onStaffIdChange((firstActive ?? staffQuery.data[0]).id)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [staffId, staffQuery.data])

  const monthQuery = useQuery({
    queryKey: staffAttendanceKeys.staffMonth(staffId ?? 0, month),
    queryFn: () => staffAttendanceApi.getStaffMonth(staffId as number, month),
    enabled: staffId != null,
    staleTime: 15_000,
  })

  const staff = staffQuery.data ?? []
  const selected = staff.find((s) => s.id === staffId)
  const weeks = useMemo(() => buildWeeks(monthQuery.data?.days ?? []), [monthQuery.data])
  const correctionDay = correctionDate ? monthQuery.data?.days.find((d) => d.date === correctionDate) : undefined

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-sm font-semibold text-zinc-800">Calendrier mensuel</h2>
          <p className="text-xs text-zinc-400 mt-0.5">Cliquez une case pour ouvrir une correction.</p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={staffId ?? ''}
            onChange={(e) => onStaffIdChange(Number(e.target.value))}
            className="px-3 py-2 rounded-xl border border-zinc-200 text-sm bg-white min-w-[12rem]"
          >
            {staff.map((s) => (
              <option key={s.id} value={s.id}>
                {s.firstName} {s.lastName}{!s.active ? ' (désactivé)' : ''}
              </option>
            ))}
          </select>
          <input
            type="month"
            value={month}
            max={currentMonthValue()}
            onChange={(e) => setMonth(e.target.value)}
            className="px-3 py-2 rounded-xl border border-zinc-200 text-sm"
          />
        </div>
      </div>

      {!staffId ? (
        <div className="flex flex-col items-center justify-center py-16 gap-2 text-sm text-zinc-400 bg-white rounded-2xl border border-zinc-100">
          <CalendarDays size={28} className="text-zinc-200" />
          Aucun employé actif
        </div>
      ) : monthQuery.isLoading ? (
        <Skeleton className="h-96" />
      ) : monthQuery.data ? (
        <div className="space-y-4">
          <div className="grid grid-cols-3 sm:grid-cols-5 lg:grid-cols-9 gap-2">
            {(
              [
                ['Jours dus', monthQuery.data.totals.present + monthQuery.data.totals.onMission],
                ['Présents', monthQuery.data.totals.present],
                ['Retards', monthQuery.data.totals.late],
                ['Min. retard', monthQuery.data.totals.lateMinutesTotal],
                ['Absents', monthQuery.data.totals.absent],
                ['Congés', monthQuery.data.totals.onLeave],
                ['Missions', monthQuery.data.totals.onMission],
                ['Départs anticipés', monthQuery.data.totals.leftEarly],
                ['Corrigés', monthQuery.data.totals.correctedDays],
              ] as const
            ).map(([label, value]) => (
              <div key={label} className="bg-white rounded-xl border border-zinc-100 px-3 py-2.5">
                <p className="text-[10px] text-zinc-400 uppercase tracking-wide">{label}</p>
                <p className="text-lg font-bold text-zinc-900 tabular-nums leading-none mt-1">{value}</p>
              </div>
            ))}
          </div>

          <div className="bg-white rounded-2xl border border-zinc-200 p-4">
            <div className="grid grid-cols-7 gap-1.5 mb-2">
              {WEEKDAY_HEADERS.map((d) => (
                <p key={d} className="text-center text-[10px] font-semibold text-zinc-400 uppercase">{d}</p>
              ))}
            </div>
            <div className="space-y-1.5">
              {weeks.map((week, wi) => (
                <div key={wi} className="grid grid-cols-7 gap-1.5">
                  {week.map((d, di) =>
                    d ? (
                      <button
                        key={d.date}
                        type="button"
                        onClick={() => setCorrectionDate(d.date)}
                        disabled={d.status === 'NOT_EMPLOYED' || d.status === 'EXPECTED'}
                        title={d.corrected && d.correction ? `Corrigé — ${d.correction.reason}` : STAFF_DAY_STATUS_LABEL[d.status]}
                        className={cn(
                          'relative aspect-square rounded-lg flex flex-col items-center justify-center gap-0.5 text-xs font-medium transition-transform hover:scale-105 disabled:hover:scale-100 disabled:cursor-default',
                          STAFF_DAY_STATUS_STYLE[d.status],
                        )}
                      >
                        <span className="tabular-nums">{Number(d.date.slice(-2))}</span>
                        {d.corrected && <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-violet-600" />}
                      </button>
                    ) : (
                      <div key={di} />
                    ),
                  )}
                </div>
              ))}
            </div>
            <div className="flex flex-wrap gap-2 mt-4 pt-3 border-t border-zinc-100">
              {(Object.keys(STAFF_DAY_STATUS_LABEL) as (keyof typeof STAFF_DAY_STATUS_LABEL)[])
                .filter((s) => s !== 'NOT_EMPLOYED')
                .map((s) => (
                  <span key={s} className={cn('text-[10px] font-medium px-2 py-0.5 rounded-full', STAFF_DAY_STATUS_STYLE[s])}>
                    {STAFF_DAY_STATUS_LABEL[s]}
                  </span>
                ))}
            </div>
          </div>
        </div>
      ) : null}

      {correctionDate && correctionDay && staffId && selected && (
        <CorrectionModal
          staffId={staffId}
          staffName={staffFullName(selected)}
          date={correctionDate}
          day={correctionDay}
          onClose={() => setCorrectionDate(null)}
          onSaved={() => {
            setCorrectionDate(null)
            qc.invalidateQueries({ queryKey: staffAttendanceKeys.staffMonth(staffId, month) })
            qc.invalidateQueries({ queryKey: staffAttendanceKeys.day() })
            qc.invalidateQueries({ queryKey: ['staff-attendance', 'corrections'] })
          }}
        />
      )}
    </div>
  )
}
