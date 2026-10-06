'use client'

import { FormEvent, useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  teacherLessonPlansApi,
  type LessonPlanSteps,
  type LessonPlanStatus,
} from '@/lib/teacher/api/lesson-plans.api'
import { TERM_LABELS, type SchoolTerm } from '@/types/teacher-grades'
import { Skeleton } from '@/components/ui/skeleton'

const STATUS_LABELS: Record<LessonPlanStatus, string> = {
  DRAFT: 'Brouillon',
  SUBMITTED: 'Soumise',
  APPROVED: 'Approuvée',
  REJECTED: 'À corriger',
}

const STEP_FIELDS: Array<{ key: keyof LessonPlanSteps; label: string }> = [
  { key: 'revision', label: 'Révision' },
  { key: 'motivation', label: 'Motivation' },
  { key: 'development', label: 'Développement' },
  { key: 'synthesis', label: 'Synthèse' },
  { key: 'application', label: 'Application' },
]

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
  const [objectives, setObjectives] = useState('')
  const [materials, setMaterials] = useState('')
  const [steps, setSteps] = useState<LessonPlanSteps>({})
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const plan = planQuery.data
    if (!plan) return
    setTitle(plan.title ?? '')
    setSubject(plan.subject ?? '')
    setObjectives(plan.objectives ?? '')
    setMaterials(plan.materials ?? '')
    setSteps(plan.steps ?? {})
  }, [planQuery.data])

  const editable =
    planQuery.data?.status === 'DRAFT' || planQuery.data?.status === 'REJECTED'

  const saveMutation = useMutation({
    mutationFn: () =>
      teacherLessonPlansApi.update(id, {
        title: title.trim(),
        subject: subject.trim(),
        objectives: objectives.trim() || undefined,
        materials: materials.trim() || undefined,
        steps,
      }),
    onSuccess: async () => {
      setMessage('Fiche enregistrée.')
      setError(null)
      await queryClient.invalidateQueries({ queryKey: ['teacher', 'lesson-plans'] })
      await planQuery.refetch()
    },
    onError: (err: unknown) => {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message || 'Impossible d\'enregistrer la fiche.'
      setError(msg)
      setMessage(null)
    },
  })

  const submitMutation = useMutation({
    mutationFn: () => teacherLessonPlansApi.submit(id),
    onSuccess: async () => {
      setMessage('Fiche soumise à la direction.')
      setError(null)
      await queryClient.invalidateQueries({ queryKey: ['teacher', 'lesson-plans'] })
      await planQuery.refetch()
    },
    onError: (err: unknown) => {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ||
        'Impossible de soumettre. Complétez les cinq étapes pédagogiques.'
      setError(msg)
      setMessage(null)
    },
  })

  const onSave = (e: FormEvent) => {
    e.preventDefault()
    if (!editable) return
    saveMutation.mutate()
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
        <button type="button" className="ml-3 underline" onClick={() => router.push('/teacher/lesson-plans')}>
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
          onClick={() => router.push('/teacher/lesson-plans')}
          className="text-sm text-slate-500 hover:underline"
        >
          ← Liste
        </button>
      </div>

      <form
        onSubmit={onSave}
        className="space-y-4 rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900"
      >
        <label className="block text-sm">
          <span className="mb-1 block text-slate-500">Titre</span>
          <input
            disabled={!editable}
            className="w-full rounded-lg border border-slate-200 px-3 py-2 disabled:bg-slate-50 dark:border-slate-700 dark:bg-slate-950"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block text-slate-500">Matière</span>
          <input
            disabled={!editable}
            className="w-full rounded-lg border border-slate-200 px-3 py-2 disabled:bg-slate-50 dark:border-slate-700 dark:bg-slate-950"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
          />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block text-slate-500">Objectifs</span>
          <textarea
            disabled={!editable}
            rows={3}
            className="w-full rounded-lg border border-slate-200 px-3 py-2 disabled:bg-slate-50 dark:border-slate-700 dark:bg-slate-950"
            value={objectives}
            onChange={(e) => setObjectives(e.target.value)}
          />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block text-slate-500">Matériel</span>
          <textarea
            disabled={!editable}
            rows={2}
            className="w-full rounded-lg border border-slate-200 px-3 py-2 disabled:bg-slate-50 dark:border-slate-700 dark:bg-slate-950"
            value={materials}
            onChange={(e) => setMaterials(e.target.value)}
          />
        </label>

        <div className="space-y-3 border-t border-slate-100 pt-4 dark:border-slate-800">
          <h2 className="font-semibold">Étapes pédagogiques</h2>
          <p className="text-xs text-slate-500">
            Les cinq étapes sont requises pour soumettre la fiche à la direction.
          </p>
          {STEP_FIELDS.map(({ key, label }) => (
            <label key={key} className="block text-sm">
              <span className="mb-1 block text-slate-500">{label}</span>
              <textarea
                disabled={!editable}
                rows={3}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 disabled:bg-slate-50 dark:border-slate-700 dark:bg-slate-950"
                value={steps[key] ?? ''}
                onChange={(e) =>
                  setSteps((prev) => ({ ...prev, [key]: e.target.value }))
                }
              />
            </label>
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
              onClick={() => submitMutation.mutate()}
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
