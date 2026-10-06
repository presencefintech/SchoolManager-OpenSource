'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { FilePlus2, NotebookPen } from 'lucide-react'
import { teacherLessonPlansApi, type LessonPlanStatus } from '@/lib/teacher/api/lesson-plans.api'
import { teacherGradesApi } from '@/lib/teacher/api/grades.api'
import { TERM_LABELS, type SchoolTerm } from '@/types/teacher-grades'
import { Skeleton } from '@/components/ui/skeleton'

const STATUS_LABELS: Record<LessonPlanStatus, string> = {
  DRAFT: 'Brouillon',
  SUBMITTED: 'Soumise',
  APPROVED: 'Approuvée',
  REJECTED: 'À corriger',
}

const STATUS_COLORS: Record<LessonPlanStatus, string> = {
  DRAFT: 'bg-slate-100 text-slate-700',
  SUBMITTED: 'bg-amber-100 text-amber-800',
  APPROVED: 'bg-emerald-100 text-emerald-800',
  REJECTED: 'bg-rose-100 text-rose-800',
}

export default function TeacherLessonPlansPage() {
  const [status, setStatus] = useState<LessonPlanStatus | ''>('')
  const [classId, setClassId] = useState<number | ''>('')

  const contextQuery = useQuery({
    queryKey: ['teacher', 'grades', 'context'],
    queryFn: () => teacherGradesApi.context(),
  })

  const listQuery = useQuery({
    queryKey: ['teacher', 'lesson-plans', status, classId],
    queryFn: () =>
      teacherLessonPlansApi.list({
        status: status || undefined,
        classId: typeof classId === 'number' ? classId : undefined,
      }),
  })

  const classes = contextQuery.data?.classes ?? []
  const plans = listQuery.data ?? []

  const emptyHint = useMemo(
    () =>
      plans.length === 0
        ? 'Aucune fiche pour le moment. Créez votre première préparation de leçon.'
        : null,
    [plans.length],
  )

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
            <NotebookPen className="h-6 w-6 text-teal-600" />
            Fiches de préparation
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Rédigez, complétez puis soumettez vos fiches à la direction pédagogique.
          </p>
        </div>
        <Link
          href="/teacher/lesson-plans/new"
          className="inline-flex items-center gap-2 rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700"
        >
          <FilePlus2 className="h-4 w-4" />
          Nouvelle fiche
        </Link>
      </div>

      <div className="flex flex-wrap gap-3 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
        <label className="text-sm">
          <span className="mb-1 block text-slate-500">Statut</span>
          <select
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-950"
            value={status}
            onChange={(e) => setStatus(e.target.value as LessonPlanStatus | '')}
          >
            <option value="">Tous</option>
            {(Object.keys(STATUS_LABELS) as LessonPlanStatus[]).map((key) => (
              <option key={key} value={key}>
                {STATUS_LABELS[key]}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-slate-500">Classe</span>
          <select
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-950"
            value={classId}
            onChange={(e) =>
              setClassId(e.target.value ? Number(e.target.value) : '')
            }
          >
            <option value="">Toutes</option>
            {classes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
      </div>

      {listQuery.isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </div>
      ) : listQuery.isError ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
          Impossible de charger vos fiches pour le moment. Vérifiez votre connexion.
          <button
            type="button"
            className="ml-3 underline"
            onClick={() => listQuery.refetch()}
          >
            Réessayer
          </button>
        </div>
      ) : emptyHint ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-900">
          {emptyHint}
        </div>
      ) : (
        <ul className="space-y-3">
          {plans.map((plan) => (
            <li key={plan.id}>
              <Link
                href={`/teacher/lesson-plans/${plan.id}`}
                className="block rounded-xl border border-slate-200 bg-white p-4 transition hover:border-teal-300 hover:shadow-sm dark:border-slate-800 dark:bg-slate-900"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold">{plan.title}</p>
                    <p className="mt-1 text-sm text-slate-500">
                      {plan.subject}
                      {plan.class?.name ? ` · ${plan.class.name}` : ''}
                      {' · '}
                      {TERM_LABELS[plan.term as SchoolTerm] ?? plan.term}
                      {` · Semaine ${plan.weekNumber}`}
                    </p>
                  </div>
                  <span
                    className={`rounded-full px-2.5 py-1 text-xs font-medium ${STATUS_COLORS[plan.status] ?? 'bg-slate-100'}`}
                  >
                    {STATUS_LABELS[plan.status] ?? plan.status}
                  </span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
