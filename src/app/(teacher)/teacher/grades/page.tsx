'use client'

import { Suspense, useMemo, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Plus } from 'lucide-react'
import { teacherGradesApi } from '@/lib/teacher/api/grades.api'
import { GradebookGrid } from '@/components/teacher/gradebook-grid'
import { GradebookSummaryPanel } from '@/components/teacher/gradebook-summary-panel'
import {
  EvaluationFormModal,
  type EvaluationFormValues,
} from '@/components/teacher/evaluation-form-modal'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { Skeleton } from '@/components/ui/skeleton'
import {
  EVAL_TYPE_LABELS,
  TERM_LABELS,
  type GradebookEvaluationColumn,
  type SchoolTerm,
} from '@/types/teacher-grades'

const TERMS = Object.keys(TERM_LABELS) as SchoolTerm[]

function currentAcademicYear(): string {
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth() + 1
  return month >= 9 ? `${year}-${year + 1}` : `${year - 1}-${year}`
}

function TeacherGradesPageInner() {
  const searchParams = useSearchParams()
  const queryClient = useQueryClient()
  const contextQuery = useQuery({
    queryKey: ['teacher', 'grades', 'context'],
    queryFn: () => teacherGradesApi.context(),
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
    () => ['teacher', 'grades', 'grid', classId, subjectId, term, academicYear],
    [classId, subjectId, term, academicYear],
  )

  const gridQuery = useQuery({
    queryKey: gridKey,
    queryFn: () =>
      teacherGradesApi.grid({
        classId: classId as number,
        subjectId: subjectId as number,
        term,
        academicYear,
      }),
    enabled: filtersReady,
  })

  const saveEvaluation = useMutation({
    mutationFn: async (values: EvaluationFormValues) => {
      if (formMode === 'edit' && editing) {
        return teacherGradesApi.updateEvaluation(editing.id, {
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
      return teacherGradesApi.createEvaluation({
        classId: classId as number,
        subjectId: subjectId as number,
        ...values,
      })
    },
    onSuccess: async () => {
      setFormError(null)
      setFormOpen(false)
      setEditing(null)
      await queryClient.invalidateQueries({ queryKey: gridKey })
    },
    onError: (err: unknown) => {
      setFormError(
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
          'Échec de l’enregistrement.',
      )
    },
  })

  const deleteEvaluation = useMutation({
    mutationFn: (id: number) => teacherGradesApi.deleteEvaluation(id),
    onSuccess: async () => {
      setDeleteTarget(null)
      await queryClient.invalidateQueries({ queryKey: gridKey })
    },
  })

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Grille de cotation</h1>
          <p className="mt-1 text-sm text-slate-500">
            Saisie TJ / examen, validation au barème, navigation clavier et enregistrement
            automatique des brouillons.
          </p>
        </div>
        <button
          type="button"
          disabled={!filtersReady || gridQuery.data?.writable === false}
          onClick={() => {
            setFormMode('create')
            setEditing(null)
            setFormError(null)
            setFormOpen(true)
          }}
          className="inline-flex items-center gap-2 rounded-lg bg-teal-600 px-3 py-2 text-sm font-semibold text-white disabled:opacity-40"
        >
          <Plus className="h-4 w-4" />
          Nouvelle évaluation
        </button>
      </header>

      <div className="grid gap-3 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900 md:grid-cols-4">
        <label className="text-sm">
          <span className="mb-1 block text-xs text-slate-500">Classe</span>
          <select
            className="w-full rounded-lg border border-slate-200 bg-white px-2 py-2 dark:border-slate-600 dark:bg-slate-950"
            value={classId}
            onChange={(e) => setClassId(e.target.value ? Number(e.target.value) : '')}
          >
            <option value="">Choisir…</option>
            {contextQuery.data?.classes.map((klass) => (
              <option key={klass.id} value={klass.id}>
                {klass.name}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-xs text-slate-500">Matière</span>
          <select
            className="w-full rounded-lg border border-slate-200 bg-white px-2 py-2 dark:border-slate-600 dark:bg-slate-950"
            value={subjectId}
            onChange={(e) => setSubjectId(e.target.value ? Number(e.target.value) : '')}
          >
            <option value="">Choisir…</option>
            {contextQuery.data?.subjects.map((subject) => (
              <option key={subject.id} value={subject.id}>
                {subject.name}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-xs text-slate-500">Période</span>
          <select
            className="w-full rounded-lg border border-slate-200 bg-white px-2 py-2 dark:border-slate-600 dark:bg-slate-950"
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
          <span className="mb-1 block text-xs text-slate-500">Année scolaire</span>
          <input
            className="w-full rounded-lg border border-slate-200 bg-white px-2 py-2 dark:border-slate-600 dark:bg-slate-950"
            value={academicYear}
            onChange={(e) => setAcademicYear(e.target.value)}
            placeholder="2025-2026"
          />
        </label>
      </div>

      {!filtersReady && (
        <p className="text-sm text-slate-500">
          Sélectionnez une classe et une matière pour afficher la grille de saisie.
        </p>
      )}

      {filtersReady && gridQuery.isLoading && <Skeleton className="h-64 w-full" />}
      {filtersReady && gridQuery.isError && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          Impossible de charger la grille de notes.
        </p>
      )}

      {gridQuery.data && (
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_280px]">
          <GradebookGrid
            grid={gridQuery.data}
            queryKey={gridKey}
            onEditEvaluation={(evaluation) => {
              setFormMode('edit')
              setEditing(evaluation)
              setFormError(null)
              setFormOpen(true)
            }}
            onDeleteEvaluation={(evaluation) => setDeleteTarget(evaluation)}
          />
          <GradebookSummaryPanel grid={gridQuery.data} queryKey={gridKey} />
        </div>
      )}

      <EvaluationFormModal
        open={formOpen}
        mode={formMode}
        busy={saveEvaluation.isPending}
        error={formError}
        defaults={{ term, academicYear }}
        initial={
          editing
            ? {
                id: editing.id,
                title: editing.title,
                type: editing.type,
                maxScore: editing.maxScore,
                coefficient: editing.coefficient,
                term,
                academicYear,
                evaluatedAt: editing.evaluatedAt,
                publish: editing.status !== 'DRAFT',
              }
            : undefined
        }
        onClose={() => {
          if (!saveEvaluation.isPending) {
            setFormOpen(false)
            setEditing(null)
          }
        }}
        onSubmit={(values) => saveEvaluation.mutate(values)}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        title="Supprimer l’évaluation ?"
        description={
          deleteTarget
            ? `${EVAL_TYPE_LABELS[deleteTarget.type]} « ${deleteTarget.title} » et toutes ses notes seront retirées.`
            : ''
        }
        impact={['Les notes associées ne seront plus visibles.', 'Action journalisée (audit).']}
        variant="danger"
        confirmLabel="Supprimer"
        loading={deleteEvaluation.isPending}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => {
          if (deleteTarget) deleteEvaluation.mutate(deleteTarget.id)
        }}
      />
    </div>
  )
}

export default function TeacherGradesPage() {
  return (
    <Suspense fallback={<Skeleton className="h-64 w-full" />}>
      <TeacherGradesPageInner />
    </Suspense>
  )
}
