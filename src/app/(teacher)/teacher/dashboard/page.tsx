'use client'

import Link from 'next/link'
import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { ArrowRight, Users } from 'lucide-react'
import { LiveGatePanel } from '@/components/teacher/live-gate-panel'
import { teacherGradesApi } from '@/lib/teacher/api/grades.api'
import { Skeleton } from '@/components/ui/skeleton'

export default function TeacherDashboardPage() {
  const contextQuery = useQuery({
    queryKey: ['teacher', 'grades', 'context'],
    queryFn: () => teacherGradesApi.context(),
  })

  const data = contextQuery.data
  const classNamesById = useMemo(() => {
    const map: Record<number, string> = {}
    for (const klass of data?.classes ?? []) {
      map[klass.id] = klass.name
    }
    return map
  }, [data?.classes])

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Tableau de bord enseignant</h1>
        <p className="mt-1 text-sm text-slate-500">
          Live Gate en temps réel, classes assignées et cahier de notes.
        </p>
      </header>

      <LiveGatePanel classNamesById={classNamesById} />

      <section className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
          <p className="text-xs uppercase text-slate-500">Classes</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums">
            {data?.stats.totalClasses ?? '—'}
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
          <p className="text-xs uppercase text-slate-500">Élèves</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums">
            {data?.stats.totalStudents ?? '—'}
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
          <p className="text-xs uppercase text-slate-500">Créneaux du jour</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums">
            {data?.stats.todaySlots ?? '—'}
          </p>
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
          Mes classes
        </h2>
        {contextQuery.isLoading && (
          <div className="grid gap-3 md:grid-cols-2">
            <Skeleton className="h-24" />
            <Skeleton className="h-24" />
          </div>
        )}
        {contextQuery.isError && (
          <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            Impossible de charger vos classes.
          </p>
        )}
        <div className="grid gap-3 md:grid-cols-2">
          {data?.classes.map((klass) => (
            <Link
              key={klass.id}
              href={`/teacher/grades?classId=${klass.id}`}
              className="group flex items-center justify-between rounded-xl border border-slate-200 bg-white p-4 transition hover:border-teal-400 dark:border-slate-700 dark:bg-slate-900"
            >
              <div>
                <p className="font-semibold">{klass.name}</p>
                <p className="mt-1 flex items-center gap-1 text-xs text-slate-500">
                  <Users className="h-3.5 w-3.5" />
                  {klass.studentCount} élèves
                </p>
              </div>
              <ArrowRight className="h-4 w-4 text-slate-400 transition group-hover:text-teal-600" />
            </Link>
          ))}
        </div>
      </section>
    </div>
  )
}
