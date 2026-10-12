'use client'

import { FormEvent, useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  teacherLessonPlansApi,
  normalizeStepItem,
  type LessonPlanSteps,
  type LessonPlanStatus,
  type LessonStepItem,
} from '@/lib/teacher/api/lesson-plans.api'
import {
  LESSON_PLAN_PHASES,
  STEP_FIELD_LABELS,
  lessonStepsSchema,
  updateLessonPlanSchema,
  type LessonStepKey,
} from '@/lib/teacher/schemas/lesson-plan.schema'
import { TERM_LABELS, type SchoolTerm } from '@/types/teacher-grades'
import { Skeleton } from '@/components/ui/skeleton'

const STATUS_LABELS: Record<LessonPlanStatus, string> = {
  DRAFT: 'Brouillon',
  SUBMITTED: 'Soumis',
  APPROVED: 'Approuvé',
  REJECTED: 'À revoir',
}

type StepsFormState = Partial<Record<LessonStepKey, LessonStepItem>> & {
  initialDuration?: number
  mainDuration?: number
  controlDuration?: number
}

function stepsToFormState(steps: LessonPlanSteps | null | undefined): StepsFormState {
  const state: StepsFormState = {
    initialDuration: steps?.initialDuration,
    mainDuration: steps?.mainDuration,
    controlDuration: steps?.controlDuration,
  }
  for (const phase of LESSON_PLAN_PHASES) {
    for (const key of phase.steps) {
      state[key] = normalizeStepItem(steps?.[key])
    }
  }
  return state
}

export default function TeacherLessonPlanDetailPage() {
  const params = useParams<{ id: string }>()
  const id = Number(params.id)
  const router = useRouter()
  const queryClient = useQueryClient()

  const planQuery = useQuery({
    queryKey: ['teacher', 'lesson-plans', id],
    queryFn: () => teacherLessonPlansApi.get(id),
    enabled: Number.isFinite(id) && id > 0,
  })

  const [title, setTitle] = useState('')
  const [subject, setSubject] = useState('')
  const [subBranch, setSubBranch] = useState('')
  const [objectives, setObjectives] = useState('')
  const [materials, setMaterials] = useState('')
  const [bibliographicReferences, setBibliographicReferences] = useState('')
  const [steps, setSteps] = useState<StepsFormState>({})
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const plan = planQuery.data
    if (!plan) return
    setTitle(plan.title ?? '')
    setSubject(plan.subject ?? '')
    setSubBranch(plan.subBranch ?? '')
    setObjectives(plan.objectives ?? '')
    setMaterials(plan.materials ?? '')
    setBibliographicReferences(plan.bibliographicReferences ?? '')
    setSteps(stepsToFormState(plan.steps))
  }, [planQuery.data])

  const editable =
    planQuery.data?.status === 'DRAFT' || planQuery.data?.status === 'REJECTED'

  function updateStepField(key: LessonStepKey, patch: Partial<LessonStepItem>) {
    setSteps((prev) => ({ ...prev, [key]: { ...prev[key], ...patch } }))
  }

  function updateDuration(
    durationKey: 'initialDuration' | 'mainDuration' | 'controlDuration',
    value: string,
  ) {
    const n = value ? Number(value) : undefined
    setSteps((prev) => ({ ...prev, [durationKey]: n != null && Number.isFinite(n) ? n : undefined }))
  }

  function buildUpdatePayload() {
    return updateLessonPlanSchema.safeParse({
      title: title.trim(),
      subject: subject.trim(),
      subBranch: subBranch.trim() || undefined,
      objectives: objectives.trim() || undefined,
      materials: materials.trim() || undefined,
      bibliographicReferences: bibliographicReferences.trim() || undefined,
      steps,
    })
  }

  const saveMutation = useMutation({
    mutationFn: () => {
      const parsed = buildUpdatePayload()
      if (!parsed.success) {
        throw new Error(parsed.error.issues[0]?.message ?? 'Données invalides.')
      }
      return teacherLessonPlansApi.update(id, parsed.data)
    },
    onSuccess: async () => {
      setMessage('Fiche enregistrée.')
      setError(null)
      await queryClient.invalidateQueries({ queryKey: ['teacher', 'lesson-plans'] })
      await planQuery.refetch()
    },
    onError: (err: unknown) => {
      const msg =
        err instanceof Error
          ? err.message
          : (err as { response?: { data?: { message?: string } } })?.response?.data
              ?.message || "Impossible d'enregistrer la fiche."
      setError(msg)
      setMessage(null)
    },
  })

  const submitMutation = useMutation({
    mutationFn: async () => {
      const parsed = buildUpdatePayload()
      if (!parsed.success) {
        throw new Error(parsed.error.issues[0]?.message ?? 'Données invalides.')
      }
      await teacherLessonPlansApi.update(id, parsed.data)
      return teacherLessonPlansApi.submit(id)
    },
    onSuccess: async () => {
      setMessage('Fiche soumise à la direction.')
      setError(null)
      await queryClient.invalidateQueries({ queryKey: ['teacher', 'lesson-plans'] })
      await planQuery.refetch()
    },
    onError: (err: unknown) => {
      const msg =
        err instanceof Error
          ? err.message
          : (err as { response?: { data?: { message?: string } } })?.response?.data
              ?.message || 'Impossible de soumettre. Complétez les huit étapes pédagogiques.'
      setError(msg)
      setMessage(null)
    },
  })

  const onSave = (e: FormEvent) => {
    e.preventDefault()
    if (!editable) return
    saveMutation.mutate()
  }

  function onSubmit() {
    setError(null)
    setMessage(null)
    const parsed = lessonStepsSchema.safeParse(steps)
    if (!parsed.success) {
      setError(
        `Avant de soumettre : ${parsed.error.issues[0]?.message ?? 'complétez les huit étapes pédagogiques (contenu requis pour chacune).'}`,
      )
      return
    }
    submitMutation.mutate()
  }

  if (planQuery.isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-10 w-1/2" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  if (planQuery.isError || !planQuery.data) {
    return (
      <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
        Fiche introuvable ou inaccessible.
        <button type="button" className="ml-3 underline" onClick={() => router.push('/teacher/preparations')}>
          Retour à la liste
        </button>
      </div>
    )
  }

  const plan = planQuery.data

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm text-slate-500">
            {TERM_LABELS[plan.term as SchoolTerm] ?? plan.term} · Semaine {plan.weekNumber}
            {plan.class?.name ? ` · ${plan.class.name}` : ''}
          </p>
          <h1 className="text-2xl font-bold">{plan.title}</h1>
          <p className="mt-1 text-sm">
            Statut :{' '}
            <span className="font-medium">
              {STATUS_LABELS[plan.status] ?? plan.status}
            </span>
          </p>
          {plan.feedback && (
            <p className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900">
              Retour direction : {plan.feedback}
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={() => router.push('/teacher/preparations')}
          className="text-sm text-slate-500 hover:underline"
        >
          ← Liste
        </button>
      </div>

      <form
        onSubmit={onSave}
        className="space-y-6 rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900"
      >
        <div className="space-y-4">
          <h2 className="font-semibold">1. Partie administrative</h2>
          <label className="block text-sm">
            <span className="mb-1 block text-slate-500">Titre (sujet de la leçon)</span>
            <input
              disabled={!editable}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 disabled:bg-slate-50 dark:border-slate-700 dark:bg-slate-950"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </label>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-sm">
              <span className="mb-1 block text-slate-500">Branche</span>
              <input
                disabled={!editable}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 disabled:bg-slate-50 dark:border-slate-700 dark:bg-slate-950"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
              />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block text-slate-500">Sous-branche (type de leçon)</span>
              <input
                disabled={!editable}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 disabled:bg-slate-50 dark:border-slate-700 dark:bg-slate-950"
                value={subBranch}
                onChange={(e) => setSubBranch(e.target.value)}
              />
            </label>
          </div>
          <label className="block text-sm">
            <span className="mb-1 block text-slate-500">
              Objectif opérationnel — « à la fin de la leçon, l&apos;élève doit être capable de… »
            </span>
            <textarea
              disabled={!editable}
              rows={3}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 disabled:bg-slate-50 dark:border-slate-700 dark:bg-slate-950"
              value={objectives}
              onChange={(e) => setObjectives(e.target.value)}
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block text-slate-500">Matériel didactique</span>
            <textarea
              disabled={!editable}
              rows={2}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 disabled:bg-slate-50 dark:border-slate-700 dark:bg-slate-950"
              value={materials}
              onChange={(e) => setMaterials(e.target.value)}
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block text-slate-500">Référence(s) bibliographique(s)</span>
            <textarea
              disabled={!editable}
              rows={2}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 disabled:bg-slate-50 dark:border-slate-700 dark:bg-slate-950"
              value={bibliographicReferences}
              onChange={(e) => setBibliographicReferences(e.target.value)}
            />
          </label>
        </div>

        <div className="space-y-5 border-t border-slate-100 pt-5 dark:border-slate-800">
          <div>
            <h2 className="font-semibold">2. Partie pédagogique</h2>
            <p className="text-xs text-slate-500">
              Les huit étapes (regroupées en 3 blocs) sont requises pour soumettre la fiche à la
              direction.
            </p>
          </div>

          {LESSON_PLAN_PHASES.map((phase) => (
            <div
              key={phase.key}
              className="space-y-3 rounded-lg border border-slate-100 p-3 dark:border-slate-800"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                  {phase.label}
                </h3>
                <label className="flex items-center gap-2 text-xs text-slate-500">
                  Durée (min)
                  <input
                    type="number"
                    min={1}
                    max={240}
                    disabled={!editable}
                    className="w-20 rounded-lg border border-slate-200 px-2 py-1 disabled:bg-slate-50 dark:border-slate-700 dark:bg-slate-950"
                    value={steps[phase.durationKey] ?? ''}
                    onChange={(e) => updateDuration(phase.durationKey, e.target.value)}
                  />
                </label>
              </div>

              {phase.steps.map((key) => (
                <div key={key} className="grid gap-2 sm:grid-cols-[1fr_minmax(0,220px)]">
                  <label className="block text-sm">
                    <span className="mb-1 block text-slate-500">{STEP_FIELD_LABELS[key]}</span>
                    <textarea
                      disabled={!editable}
                      rows={3}
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 disabled:bg-slate-50 dark:border-slate-700 dark:bg-slate-950"
                      value={steps[key]?.content ?? ''}
                      onChange={(e) => updateStepField(key, { content: e.target.value })}
                    />
                  </label>
                  <label className="block text-sm">
                    <span className="mb-1 block text-slate-500">Méthode / procédé</span>
                    <textarea
                      disabled={!editable}
                      rows={3}
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 disabled:bg-slate-50 dark:border-slate-700 dark:bg-slate-950"
                      value={steps[key]?.method ?? ''}
                      onChange={(e) => updateStepField(key, { method: e.target.value })}
                      placeholder="Ex. interrogatif, Q…"
                    />
                  </label>
                </div>
              ))}
            </div>
          ))}
        </div>

        {message && (
          <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
            {message}
          </p>
        )}
        {error && (
          <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>
        )}

        {editable && (
          <div className="flex flex-wrap justify-end gap-2">
            <button
              type="submit"
              disabled={saveMutation.isPending}
              className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium hover:bg-slate-50 disabled:opacity-60"
            >
              {saveMutation.isPending ? 'Enregistrement…' : 'Enregistrer'}
            </button>
            <button
              type="button"
              disabled={submitMutation.isPending}
              onClick={onSubmit}
              className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700 disabled:opacity-60"
            >
              {submitMutation.isPending ? 'Soumission…' : 'Soumettre à la direction'}
            </button>
          </div>
        )}
      </form>
    </div>
  )
}
