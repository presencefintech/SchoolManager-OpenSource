'use client'

import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { AlertTriangle, CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react'
import { teacherMobileApi, apiErrorMessage } from '@/lib/teacher/api/mobile.api'
import { Badge, Card, DAY_LABELS, EmptyState, ErrorState, ListSkeleton, PageHeader, btnGhost } from '@/components/teacher/ui'

function startOfWeek(d: Date): Date {
  const x = new Date(d)
  const day = x.getDay() === 0 ? 7 : x.getDay()
  x.setDate(x.getDate() - (day - 1))
  x.setHours(0, 0, 0, 0)
  return x
}

function iso(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export default function TeacherSchedulePage() {
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()))
  const weekEnd = useMemo(
    () => new Date(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate() + 5),
    [weekStart],
  )
  const from = iso(weekStart)
  const to = iso(weekEnd)
  const todayIso = iso(new Date())

  const q = useQuery({
    queryKey: ['teacher', 'mobile', 'schedule', from, to],
    queryFn: () => teacherMobileApi.scheduleRange(from, to),
  })

  const label = `${weekStart.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })} – ${weekEnd.toLocaleDateString(
    'fr-FR',
    { day: 'numeric', month: 'short', year: 'numeric' },
  )}`

  const shift = (weeks: number) =>
    setWeekStart((d) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + weeks * 7))

  return (
    <div className="space-y-6">
      <PageHeader
        icon={<CalendarDays className="h-6 w-6 text-teal-600" />}
        title="Emploi du temps"
        subtitle="Vos créneaux de la semaine."
        actions={
          <>
            <button type="button" className={btnGhost} onClick={() => shift(-1)} aria-label="Semaine précédente">
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="text-sm font-medium">{label}</span>
            <button type="button" className={btnGhost} onClick={() => shift(1)} aria-label="Semaine suivante">
              <ChevronRight className="h-4 w-4" />
            </button>
            <button type="button" className={btnGhost} onClick={() => setWeekStart(startOfWeek(new Date()))}>
              Aujourd’hui
            </button>
          </>
        }
      />
      {q.isLoading ? (
        <ListSkeleton rows={5} />
      ) : q.isError ? (
        <ErrorState message={apiErrorMessage(q.error, "Impossible de charger l'emploi du temps.")} onRetry={() => q.refetch()} />
      ) : (q.data?.days.length ?? 0) === 0 ? (
        <EmptyState>Aucun créneau cette semaine.</EmptyState>
      ) : (
        <div className="space-y-4">
          {q.data!.days.map((day) => (
            <Card key={day.date || day.dayOfWeek} className={day.date === todayIso ? 'border-teal-400' : ''}>
              <div className="mb-2 flex items-center justify-between">
                <h2 className="font-semibold">
                  {DAY_LABELS[day.dayOfWeek % 7]}
                  {day.date && (
                    <span className="ml-2 text-sm font-normal text-slate-500">
                      {new Date(day.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}
                    </span>
                  )}
                </h2>
                {day.hasOverlap && (
                  <Badge tone="amber">
                    <AlertTriangle className="mr-1 h-3 w-3" /> Chevauchement
                  </Badge>
                )}
              </div>
              {day.slots.length === 0 ? (
                <p className="text-sm text-slate-500">Pas de cours.</p>
              ) : (
                <ul className="divide-y divide-slate-100 dark:divide-slate-800">
                  {day.slots.map((s) => (
                    <li key={s.id} className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm">
                      <span className="w-28 font-mono tabular-nums">
                        {s.start} – {s.end}
                      </span>
                      <span className="flex-1 font-medium">
                        {s.className}
                        {s.subject ? ` · ${s.subject}` : ''}
                      </span>
                      {s.room && <Badge tone="sky">Salle {s.room}</Badge>}
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
