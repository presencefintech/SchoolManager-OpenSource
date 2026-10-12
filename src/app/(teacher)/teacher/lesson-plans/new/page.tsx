'use client'

import { FormEvent, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { teacherLessonPlansApi } from '@/lib/teacher/api/lesson-plans.api'
import { teacherGradesApi } from '@/lib/teacher/api/grades.api'
import { createLessonPlanSchema } from '@/lib/teacher/schemas/lesson-plan.schema'
import { TERM_LABELS, type SchoolTerm } from '@/types/teacher-grades'

const TERMS = Object.keys(TERM_LABELS) as SchoolTerm[]

export default function NewTeacherLessonPlanPage() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const contextQuery = useQuery({
    queryKey: ['teacher', 'grades', 'context'],
    queryFn: () => teacherGradesApi.context(),
  })

  const [classId, setClassId] = useState<number | ''>('')
  const [subject, setSubject] = useState('')
  const [subBranch, setSubBranch] = useState('')
  const [term, setTerm] = useState<SchoolTerm>('FIRST_TERM')
  const [weekNumber, setWeekNumber] = useState(1)
  const [title, setTitle] = useState('')
  const [objectives, setObjectives] = useState('')
  const [materials, setMaterials] = useState('')
  const [bibliographicReferences, setBibliographicReferences] = useState('')
  const [error, setError] = useState<string | null>(null)

  const createMutation = useMutation({
    mutationFn: (body: {
      classId: number
      subject: string
      subBranch?: string
      term: SchoolTerm
      weekNumber: number
      title: string
      objectives?: string
      materials?: string
      bibliographicReferences?: string
    }) => teacherLessonPlansApi.create(body),
    onSuccess: async (plan) => {
      await queryClient.invalidateQueries({ queryKey: ['teacher', 'lesson-plans'] })
      router.replace(`/teacher/preparations/${plan.id}`)
    },
    onError: (err: unknown) => {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message || 'Impossible de créer la fiche. Vérifiez les champs.'
      setError(message)
    },
  })

  const onSubmit = (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    const parsed = createLessonPlanSchema.safeParse({
      classId: typeof classId === 'number' ? classId : 0,
      subject: subject.trim(),
      subBranch: subBranch.trim() || undefined,
      term,
      weekNumber,
      title: title.trim(),
      objectives: objectives.trim() || undefined,
      materials: materials.trim() || undefined,
      bibliographicReferences: bibliographicReferences.trim() || undefined,
    })
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Classe, matière et titre sont obligatoires.')
      return
    }
    createMutation.mutate(parsed.data)
  }

  const classes = contextQuery.data?.classes ?? []
  const subjects = contextQuery.data?.subjects ?? []

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Nouvelle fiche de préparation</h1>
        <p className="mt-1 text-sm text-slate-500">
          Enregistrez un brouillon, puis complétez les étapes pédagogiques avant soumission.
        </p>
      </div>

      <form
        onSubmit={onSubmit}
        className="space-y-4 rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900"
      >
        <label className="block text-sm">
          <span className="mb-1 block text-slate-500">Classe</span>
          <select
            required
            className="w-full rounded-lg border border-slate-200 px-3 py-2 dark:border-slate-700 dark:bg-slate-950"
            value={classId}
            onChange={(e) => setClassId(e.target.value ? Number(e.target.value) : '')}
          >
            <option value="">Choisir…</option>
            {classes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>

        <label className="block text-sm">
          <span className="mb-1 block text-slate-500">Matière</span>
          <input
            required
            list="teacher-subjects"
            className="w-full rounded-lg border border-slate-200 px-3 py-2 dark:border-slate-700 dark:bg-slate-950"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Ex. Mathématiques"
          />
          <datalist id="teacher-subjects">
            {subjects.map((s) => (
              <option key={s.id} value={s.name} />
            ))}
          </datalist>
        </label>

        <label className="block text-sm">
          <span className="mb-1 block text-slate-500">Sous-branche (type de leçon, optionnel)</span>
          <input
            className="w-full rounded-lg border border-slate-200 px-3 py-2 dark:border-slate-700 dark:bg-slate-950"
            value={subBranch}
            onChange={(e) => setSubBranch(e.target.value)}
            placeholder="Ex. Grammaire, Vocabulaire, Exercices…"
          />
        </label>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-sm">
            <span className="mb-1 block text-slate-500">Période</span>
            <select
              className="w-full rounded-lg border border-slate-200 px-3 py-2 dark:border-slate-700 dark:bg-slate-950"
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
          <label className="block text-sm">
            <span className="mb-1 block text-slate-500">Semaine (1–15)</span>
            <input
              type="number"
              min={1}
              max={15}
              required
              className="w-full rounded-lg border border-slate-200 px-3 py-2 dark:border-slate-700 dark:bg-slate-950"
              value={weekNumber}
              onChange={(e) => setWeekNumber(Number(e.target.value) || 1)}
            />
          </label>
        </div>

        <label className="block text-sm">
          <span className="mb-1 block text-slate-500">Titre</span>
          <input
            required
            className="w-full rounded-lg border border-slate-200 px-3 py-2 dark:border-slate-700 dark:bg-slate-950"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Titre de la leçon"
          />
        </label>

        <label className="block text-sm">
          <span className="mb-1 block text-slate-500">
            Objectif opérationnel (optionnel) — « à la fin de la leçon, l&apos;élève doit être capable de… »
          </span>
          <textarea
            rows={3}
            className="w-full rounded-lg border border-slate-200 px-3 py-2 dark:border-slate-700 dark:bg-slate-950"
            value={objectives}
            onChange={(e) => setObjectives(e.target.value)}
          />
        </label>

        <label className="block text-sm">
          <span className="mb-1 block text-slate-500">Matériel didactique (optionnel)</span>
          <textarea
            rows={2}
            className="w-full rounded-lg border border-slate-200 px-3 py-2 dark:border-slate-700 dark:bg-slate-950"
            value={materials}
            onChange={(e) => setMaterials(e.target.value)}
          />
        </label>

        <label className="block text-sm">
          <span className="mb-1 block text-slate-500">Référence(s) bibliographique(s) (optionnel)</span>
          <textarea
            rows={2}
            className="w-full rounded-lg border border-slate-200 px-3 py-2 dark:border-slate-700 dark:bg-slate-950"
            value={bibliographicReferences}
            onChange={(e) => setBibliographicReferences(e.target.value)}
            placeholder="Ex. Pédagogie générale, Ibeki, 2001, p.96"
          />
        </label>

        {error && (
          <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>
        )}

        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={() => router.back()}
            className="rounded-lg px-4 py-2 text-sm text-slate-600 hover:bg-slate-100"
          >
            Annuler
          </button>
          <button
            type="submit"
            disabled={createMutation.isPending}
            className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700 disabled:opacity-60"
          >
            {createMutation.isPending ? 'Création…' : 'Créer le brouillon'}
          </button>
        </div>
      </form>
    </div>
  )
}
