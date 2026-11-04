'use client'

import { Suspense, useMemo, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Plus, RefreshCw } from 'lucide-react'
import { AdminModuleHero } from '@/components/admin/shared/admin-module-hero'
import { AcademicTermStatusBadge } from '@/components/admin/grades/academic-term-status-badge'
import { currentAcademicYear } from '@/components/admin/grades/grades-utils'
import { GradebookGrid } from '@/components/teacher/gradebook-grid'
import {
  EvaluationFormModal,
  type EvaluationFormValues,
} from '@/components/teacher/evaluation-form-modal'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { adminGradesApi } from '@/lib/admin/api/grades.api'
import { getApiErrorMessage } from '@/lib/api/client'
import { cn } from '@/lib/utils'
import { useToast } from '@/providers/toast-provider'
import {
  TERM_LABELS,
  type GradebookEvaluationColumn,
  type SchoolTerm,
} from '@/types/teacher-grades'

const TERMS = Object.keys(TERM_LABELS) as SchoolTerm[]
const selectCls =
  'w-full rounded-lg border border-zinc-200 bg-white px-2.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400/40'

function AdminGradebookInner() {
  const searchParams = useSearchParams()
  const toast = useToast()
  const queryClient = useQueryClient()

  const contextQuery = useQuery({
    queryKey: ['admin', 'grades', 'context'],
    queryFn: () => adminGradesApi.context(),
  })

  const [classId, setClassId] = useState<number | ''>(
    Number(searchParams.get('classId')) || '',
  )
  const [subjectId, setSubjectId] = useState<number | ''>(
    Number(searchParams.get('subjectId')) || '',
  )
  const [term, setTerm] = useState<SchoolTerm>(
    (searchParams.get('term') as SchoolTerm) || 'FIRST_TERM',
  )
  const [academicYear, setAcademicYear] = useState(
    searchParams.get('academicYear') || currentAcademicYear(),
  )

  const [formOpen, setFormOpen] = useState(false)
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create')
  const [editing, setEditing] = useState<GradebookEvaluationColumn | null>(null)
  const [formError, setFormError] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<GradebookEvaluationColumn | null>(null)

  const filtersReady =
    typeof classId === 'number' &&
    classId > 0 &&
    typeof subjectId === 'number' &&
    subjectId > 0 &&
    !!academicYear

  const gridKey = useMemo(
    () => ['admin', 'grades', 'grid', classId, subjectId, term, academicYear],
    [classId, subjectId, term, academicYear],
  )

  const gridQuery = useQuery({
    queryKey: gridKey,
    queryFn: () =>
      adminGradesApi.grid({
        classId: classId as number,
        subjectId: subjectId as number,
        term,
        academicYear,
      }),
    enabled: filtersReady,
  })

  const averagesQuery = useQuery({
    queryKey: ['admin', 'grades', 'averages', classId, subjectId, term, academicYear],
    queryFn: () =>
      adminGradesApi.averages({
        classId: classId as number,
        subjectId: subjectId as number,
        term,
        academicYear,
      }),
    enabled: filtersReady,
  })

  const summaryQuery = useQuery({
    queryKey: ['admin', 'grades', 'summary', classId, subjectId, term, academicYear],
    queryFn: () =>
      adminGradesApi.classPeriodSummary({
        classId: classId as number,
        subjectId: subjectId as number,
        periodId: term,
        academicYear,
      }),
    enabled: filtersReady,
  })

  const saveEvaluation = useMutation({
    mutationFn: async (values: EvaluationFormValues) => {
      if (formMode === 'edit' && editing) {
        return adminGradesApi.updateEvaluation(editing.id, {
          title: values.title,
          type: values.type,
          maxScore: values.maxScore,
          coefficient: values.coefficient,
          term: values.term,
          academicYear: values.academicYear,
          evaluatedAt: values.evaluatedAt,
          publish: values.publish,
        })
      }
      return adminGradesApi.createEvaluation({
        classId: classId as number,
        subjectId: subjectId as number,
        ...values,
      })
    },
    onSuccess: async () => {
      setFormError(null)
      setFormOpen(false)
      setEditing(null)
      toast.success('Évaluation enregistrée')
      await queryClient.invalidateQueries({ queryKey: gridKey })
    },
    onError: (err: unknown) => {
      setFormError(getApiErrorMessage(err) || 'Échec de l’enregistrement.')
    },
  })

  const deleteEvaluation = useMutation({
    mutationFn: (id: number) => adminGradesApi.deleteEvaluation(id),
    onSuccess: async () => {
      setDeleteTarget(null)
      toast.success('Évaluation supprimée')
      await queryClient.invalidateQueries({ queryKey: gridKey })
    },
    onError: (err) => toast.error('Suppression impossible', getApiErrorMessage(err)),
  })

  const publishEvaluation = useMutation({
    mutationFn: (id: number) => adminGradesApi.publishEvaluation(id),
    onSuccess: async () => {
      toast.success('Évaluation publiée')
      await queryClient.invalidateQueries({ queryKey: gridKey })
    },
    onError: (err) => toast.error('Publication impossible', getApiErrorMessage(err)),
  })

  const grid = gridQuery.data
  const avgPayload = averagesQuery.data as
    | {
        classAverage?: { averageOnScale?: number | null }
        evaluationCount?: number
        students?: unknown[]
      }
    | undefined

  return (
    <>
      <AdminModuleHero
        eyebrow="Notes · Cahier"
        title="Cahier de notes (supervision)"
        subtitle="Création, saisie, publication et moyennes — API /admin/grades/*"
        actions={
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={!filtersReady || grid?.writable === false}
              onClick={() => {
                setFormMode('create')
                setEditing(null)
                setFormError(null)
                setFormOpen(true)
              }}
              className="inline-flex items-center gap-2 rounded-lg bg-emerald-500 px-3.5 py-2 text-sm font-semibold text-white disabled:opacity-40"
            >
              <Plus size={14} />
              Nouvelle évaluation
            </button>
            <button
              type="button"
              onClick={() => {
                void gridQuery.refetch()
                void averagesQuery.refetch()
                void summaryQuery.refetch()
              }}
              className="inline-flex items-center gap-2 px-3.5 py-2 text-sm font-medium rounded-lg bg-white/10 text-white ring-1 ring-white/15 hover:bg-white/15"
            >
              <RefreshCw
                size={14}
                className={cn(gridQuery.isFetching && 'animate-spin')}
              />
              Actualiser
            </button>
          </div>
        }
        metrics={[
          {
            label: 'Évaluations',
            value: grid?.evaluations.length ?? '—',
            loading: gridQuery.isLoading,
            icon: Plus,
          },
          {
            label: 'Moyenne classe',
            value:
              grid?.classStats.average != null
                ? grid.classStats.average.toFixed(2)
                : avgPayload?.classAverage?.averageOnScale != null
                  ? Number(avgPayload.classAverage.averageOnScale).toFixed(2)
                  : '—',
            loading: gridQuery.isLoading || averagesQuery.isLoading,
            icon: Plus,
          },
        ]}
      />
      <div className="max-w-7xl mx-auto px-6 lg:px-8 py-6 space-y-4">
        <div className="grid gap-3 rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm md:grid-cols-4">
          <label className="text-sm">
            <span className="mb-1 block text-xs text-zinc-500">Classe</span>
            <select
              className={selectCls}
              value={classId}
              onChange={(e) => setClassId(e.target.value ? Number(e.target.value) : '')}
            >
              <option value="">Choisir…</option>
              {(contextQuery.data?.classes ?? []).map((klass) => (
                <option key={klass.id} value={klass.id}>
                  {klass.name}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-xs text-zinc-500">Matière</span>
            <select
              className={selectCls}
              value={subjectId}
              onChange={(e) => setSubjectId(e.target.value ? Number(e.target.value) : '')}
            >
              <option value="">Choisir…</option>
              {(contextQuery.data?.subjects ?? []).map((subject) => (
                <option key={subject.id} value={subject.id}>
                  {subject.name}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-xs text-zinc-500">Trimestre</span>
            <select
              className={selectCls}
              value={term}
              onChange={(e) => setTerm(e.target.value as SchoolTerm)}
            >
              {TERMS.map((t) => (
                <option key={t} value={t}>
                  {TERM_LABELS[t]}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-xs text-zinc-500">Année scolaire</span>
            <input
              className={selectCls}
              value={academicYear}
              onChange={(e) => setAcademicYear(e.target.value)}
            />
          </label>
        </div>

        {grid ? (
          <div className="grid gap-4 lg:grid-cols-[1fr_260px]">
            <GradebookGrid
              grid={grid}
              queryKey={gridKey}
              upsertGrades={adminGradesApi.upsertGrades}
              onExportBulletin={async (studentId) => {
                const html = await adminGradesApi.periodBulletinHtml(studentId, {
                  term,
                  academicYear,
                })
                const url = URL.createObjectURL(new Blob([html], { type: 'text/html;charset=utf-8' }))
                window.open(url, '_blank', 'noopener,noreferrer')
              }}
              onEditEvaluation={(evaluation) => {
                setFormMode('edit')
                setEditing(evaluation)
                setFormError(null)
                setFormOpen(true)
              }}
              onDeleteEvaluation={(evaluation) => setDeleteTarget(evaluation)}
            />
            <aside className="space-y-3">
              <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
                <div className="flex items-center justify-between gap-2">
                  <h2 className="text-sm font-semibold text-zinc-900">Période</h2>
                  <AcademicTermStatusBadge status={grid.termStatus} />
                </div>
                <p className="mt-2 text-xs text-zinc-500">
                  {grid.writable
                    ? 'Saisie autorisée (admin override si verrouillé).'
                    : 'Saisie bloquée pour ce trimestre.'}
                </p>
                <dl className="mt-3 space-y-2 text-sm">
                  <div className="flex justify-between">
                    <dt className="text-zinc-500">Notés</dt>
                    <dd className="font-semibold tabular-nums">
                      {grid.classStats.gradedCount}/{grid.classStats.studentCount}
                    </dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-zinc-500">Échelle</dt>
                    <dd className="font-semibold tabular-nums">/{grid.scale}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-zinc-500">Poids TJ / Exam</dt>
                    <dd className="font-semibold tabular-nums">
                      {grid.weights.tj}/{grid.weights.examen}
                    </dd>
                  </div>
                </dl>
              </div>

              <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
                <h2 className="text-sm font-semibold text-zinc-900">Moyennes API</h2>
                <p className="mt-1 text-xs text-zinc-500">
                  GET /admin/grades/averages · summary
                </p>
                {averagesQuery.isLoading || summaryQuery.isLoading ? (
                  <p className="mt-3 text-sm text-zinc-400">Chargement…</p>
                ) : (
                  <p className="mt-3 text-2xl font-bold tabular-nums text-zinc-900">
                    {avgPayload?.classAverage?.averageOnScale != null
                      ? Number(avgPayload.classAverage.averageOnScale).toFixed(2)
                      : summaryQuery.data?.classStats?.average != null
                        ? summaryQuery.data.classStats.average.toFixed(2)
                        : '—'}
                    <span className="text-sm font-normal text-zinc-400">
                      {' '}
                      /{grid.scale}
                    </span>
                  </p>
                )}
              </div>

              {grid.evaluations.some((e) => e.status === 'DRAFT') && (
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                  <p className="text-xs font-semibold text-amber-900 mb-2">
                    Brouillons à publier
                  </p>
                  <ul className="space-y-1.5">
                    {grid.evaluations
                      .filter((e) => e.status === 'DRAFT')
                      .map((e) => (
                        <li key={e.id} className="flex items-center justify-between gap-2">
                          <span className="text-xs text-amber-900 truncate">{e.title}</span>
                          <button
                            type="button"
                            disabled={publishEvaluation.isPending}
                            onClick={() => publishEvaluation.mutate(e.id)}
                            className="text-[11px] font-semibold text-amber-800 underline"
                          >
                            Publier
                          </button>
                        </li>
                      ))}
                  </ul>
                </div>
              )}
            </aside>
          </div>
        ) : filtersReady ? (
          <div className="rounded-2xl border border-zinc-200 bg-white p-10 text-center text-sm text-zinc-400 shadow-sm">
            {gridQuery.isLoading ? 'Chargement de la grille…' : 'Aucune donnée pour ces filtres.'}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-zinc-300 bg-white/60 p-10 text-center text-sm text-zinc-500">
            Sélectionnez une classe et une matière pour ouvrir le cahier.
          </div>
        )}
      </div>

      <EvaluationFormModal
        open={formOpen}
        mode={formMode}
        defaults={{ term, academicYear }}
        initial={
          editing
            ? {
                title: editing.title,
                type: editing.type,
                maxScore: editing.maxScore,
                coefficient: editing.coefficient,
                term,
                academicYear,
                evaluatedAt: editing.evaluatedAt.slice(0, 10),
                publish: editing.status !== 'DRAFT',
              }
            : undefined
        }
        error={formError}
        busy={saveEvaluation.isPending}
        onClose={() => {
          setFormOpen(false)
          setEditing(null)
          setFormError(null)
        }}
        onSubmit={(values) => saveEvaluation.mutate(values)}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        title="Supprimer l’évaluation ?"
        description={
          deleteTarget
            ? `« ${deleteTarget.title} » sera soft-supprimée. Les notes associées restent en audit.`
            : ''
        }
        confirmLabel="Supprimer"
        variant="danger"
        loading={deleteEvaluation.isPending}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => {
          if (deleteTarget) deleteEvaluation.mutate(deleteTarget.id)
        }}
      />
    </>
  )
}

export default function AdminGradesGradebookPage() {
  return (
    <Suspense
      fallback={
        <div className="p-10 text-center text-sm text-zinc-400">Chargement…</div>
      }
    >
      <AdminGradebookInner />
    </Suspense>
  )
}
