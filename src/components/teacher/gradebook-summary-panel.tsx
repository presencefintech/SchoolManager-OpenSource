'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Send } from 'lucide-react'
import { teacherGradesApi } from '@/lib/teacher/api/grades.api'
import type { GradebookGrid, SchoolTerm } from '@/types/teacher-grades'
import { TERM_LABELS } from '@/types/teacher-grades'

type Props = {
  grid: GradebookGrid
  queryKey: unknown[]
}

export function GradebookSummaryPanel({ grid, queryKey }: Props) {
  const queryClient = useQueryClient()
  const { classStats, weights, scale, termStatus, writable, term, academicYear } = grid

  const summaryKey = [
    'teacher',
    'grades',
    'summary',
    grid.classId,
    grid.subjectId,
    term,
    academicYear,
  ]

  const summaryQuery = useQuery({
    queryKey: summaryKey,
    queryFn: () =>
      teacherGradesApi.classPeriodSummary({
        classId: grid.classId,
        subjectId: grid.subjectId,
        periodId: term as SchoolTerm,
        academicYear,
      }),
  })

  const averagesQuery = useQuery({
    queryKey: ['teacher', 'grades', 'averages', grid.classId, grid.subjectId, term, academicYear],
    queryFn: () =>
      teacherGradesApi.averages({
        classId: grid.classId,
        subjectId: grid.subjectId,
        term: term as SchoolTerm,
        academicYear,
      }),
  })

  const submitMutation = useMutation({
    mutationFn: () =>
      teacherGradesApi.submitPeriod({
        academicYear,
        term: term as SchoolTerm,
        reason: `Soumission cahier de notes — ${grid.subjectName} / ${grid.className}`,
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey })
      await queryClient.invalidateQueries({ queryKey: summaryKey })
    },
  })

  const canSubmit = termStatus === 'DRAFT' && writable

  const avgPayload = averagesQuery.data as
    | { classAverage?: { averageOnScale?: number | null } }
    | undefined

  const publishedAverage =
    avgPayload?.classAverage?.averageOnScale != null
      ? Number(avgPayload.classAverage.averageOnScale)
      : summaryQuery.data?.classStats?.average != null
        ? summaryQuery.data.classStats.average
        : classStats.average

  const rankedStudents = [...(summaryQuery.data?.students ?? [])]
    .filter((s) => s.provisionalAverage != null)
    .sort((a, b) => (b.provisionalAverage ?? 0) - (a.provisionalAverage ?? 0))
    .slice(0, 8)

  return (
    <aside className="space-y-3">
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
          Récapitulatif
        </h2>
        <p className="mt-1 text-lg font-semibold text-slate-900 dark:text-slate-50">
          {grid.subjectName}
        </p>
        <p className="text-sm text-slate-500">{grid.className}</p>

        <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
          <div className="rounded-lg bg-slate-50 p-3 dark:bg-slate-800/60">
            <dt className="text-slate-500">Moyenne classe</dt>
            <dd className="mt-1 text-xl font-semibold tabular-nums">
              {publishedAverage != null ? publishedAverage.toFixed(2) : '—'}
              <span className="text-xs font-normal text-slate-400"> /{scale}</span>
            </dd>
          </div>
          <div className="rounded-lg bg-slate-50 p-3 dark:bg-slate-800/60">
            <dt className="text-slate-500">Notés</dt>
            <dd className="mt-1 text-xl font-semibold tabular-nums">
              {summaryQuery.data?.classStats?.gradedCount ?? classStats.gradedCount}/
              {summaryQuery.data?.classStats?.studentCount ?? classStats.studentCount}
            </dd>
          </div>
          <div className="rounded-lg bg-slate-50 p-3 dark:bg-slate-800/60">
            <dt className="text-slate-500">Min</dt>
            <dd className="mt-1 text-lg font-semibold tabular-nums">
              {(summaryQuery.data?.classStats?.min ?? classStats.min) != null
                ? Number(summaryQuery.data?.classStats?.min ?? classStats.min).toFixed(2)
                : '—'}
            </dd>
          </div>
          <div className="rounded-lg bg-slate-50 p-3 dark:bg-slate-800/60">
            <dt className="text-slate-500">Max</dt>
            <dd className="mt-1 text-lg font-semibold tabular-nums">
              {(summaryQuery.data?.classStats?.max ?? classStats.max) != null
                ? Number(summaryQuery.data?.classStats?.max ?? classStats.max).toFixed(2)
                : '—'}
            </dd>
          </div>
        </dl>

        <div className="mt-4 space-y-1 border-t border-slate-100 pt-3 text-xs text-slate-500 dark:border-slate-700">
          <p>
            Pondération : TJ × {weights.tj} + Examen × {weights.examen} (/{scale})
          </p>
          <p>
            {TERM_LABELS[term]} · statut{' '}
            <span className="font-medium text-slate-700 dark:text-slate-200">{termStatus}</span>
            {!writable && ' — saisie verrouillée'}
          </p>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">
          Moyennes publiées
        </h3>
        <p className="mt-1 text-xs text-slate-500">
          Récap période (évaluations publiées / verrouillées)
        </p>
        {summaryQuery.isLoading ? (
          <p className="mt-3 text-sm text-slate-400">Chargement…</p>
        ) : rankedStudents.length === 0 ? (
          <p className="mt-3 text-sm text-slate-400">Aucune moyenne provisoire disponible.</p>
        ) : (
          <ul className="mt-3 max-h-56 space-y-1.5 overflow-y-auto text-sm">
            {rankedStudents.map((student, index) => (
              <li
                key={student.studentId}
                className="flex items-center justify-between gap-2 rounded-lg bg-slate-50 px-2.5 py-1.5 dark:bg-slate-800/60"
              >
                <span className="truncate text-slate-700 dark:text-slate-200">
                  <span className="mr-1.5 tabular-nums text-slate-400">{index + 1}.</span>
                  {student.fullName}
                </span>
                <span className="shrink-0 font-semibold tabular-nums text-slate-900 dark:text-slate-50">
                  {student.provisionalAverage!.toFixed(2)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
        <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">
          Soumettre le trimestre
        </h3>
        <p className="mt-1 text-xs text-slate-500">
          Envoie le cahier à la direction (DRAFT → SUBMITTED). Le verrouillage final reste
          réservé à l’administration.
        </p>
        {submitMutation.isError && (
          <p className="mt-2 text-xs text-red-600">
            {(submitMutation.error as { response?: { data?: { message?: string } } })?.response
              ?.data?.message ?? 'Soumission impossible.'}
          </p>
        )}
        {submitMutation.isSuccess && (
          <p className="mt-2 text-xs text-teal-700">Trimestre soumis à la direction.</p>
        )}
        <button
          type="button"
          disabled={!canSubmit || submitMutation.isPending}
          onClick={() => {
            if (
              typeof window !== 'undefined' &&
              !window.confirm(
                `Soumettre ${TERM_LABELS[term]} (${academicYear}) à la direction ?`,
              )
            ) {
              return
            }
            submitMutation.mutate()
          }}
          className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-teal-600 px-3 py-2 text-sm font-semibold text-white disabled:opacity-40"
        >
          <Send className="h-4 w-4" />
          {submitMutation.isPending ? 'Soumission…' : 'Soumettre à la direction'}
        </button>
      </div>
    </aside>
  )
}
