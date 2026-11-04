'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Plus, Trash2 } from 'lucide-react'
import { apiErrorMessage, teacherMobileApi } from '@/lib/teacher/api/mobile.api'
import { teacherQuizzesApi, type QuizQuestionInput } from '@/lib/teacher/api/school-work.api'
import { Card, ErrorState, PageHeader, btnGhost, btnPrimary, inputCls } from '@/components/teacher/ui'

const LETTERS = ['A', 'B', 'C', 'D'] as const

type Draft = { text: string; options: Record<string, string>; correctOption: string }

const emptyQuestion = (): Draft => ({ text: '', options: { A: '', B: '', C: '', D: '' }, correctOption: 'A' })

export default function NewQuizPage() {
  const router = useRouter()
  const qc = useQueryClient()
  const classes = useQuery({ queryKey: ['teacher', 'mobile', 'classes'], queryFn: teacherMobileApi.dashboard })

  const [classId, setClassId] = useState('')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [questions, setQuestions] = useState<Draft[]>([emptyQuestion()])
  const [formError, setFormError] = useState<string | null>(null)

  const patch = (i: number, fn: (q: Draft) => Draft) =>
    setQuestions((qs) => qs.map((q, idx) => (idx === i ? fn(q) : q)))

  const create = useMutation({
    mutationFn: (payload: { publish: boolean; questions: QuizQuestionInput[] }) =>
      teacherQuizzesApi.create({
        classId: Number(classId),
        title: title.trim(),
        description: description.trim() || undefined,
        dueDate: dueDate ? new Date(`${dueDate}T23:59:00`).toISOString() : undefined,
        publish: payload.publish,
        questions: payload.questions,
      }),
    onSuccess: (detail) => {
      void qc.invalidateQueries({ queryKey: ['teacher', 'quizzes'] })
      router.push(`/teacher/quizzes/${detail.id}`)
    },
    onError: (err) => setFormError(apiErrorMessage(err, 'Création impossible.')),
  })

  const submit = (publish: boolean) => {
    setFormError(null)
    if (!classId) return setFormError('Choisissez une classe.')
    if (title.trim().length < 2) return setFormError('Le titre est obligatoire.')

    const valid: QuizQuestionInput[] = []
    for (const q of questions) {
      const text = q.text.trim()
      if (text.length < 2) continue
      const options: Record<string, string> = {}
      for (const l of LETTERS) {
        const v = q.options[l]?.trim()
        if (!v) return setFormError(`La question « ${text} » doit avoir les quatre réponses A, B, C et D.`)
        options[l] = v
      }
      valid.push({ text, options, correctOption: q.correctOption })
    }
    if (valid.length === 0) return setFormError('Ajoutez au moins une question complète.')
    create.mutate({ publish, questions: valid })
  }

  return (
    <div className="space-y-6">
      <Link href="/teacher/quizzes" className="inline-flex items-center gap-1 text-sm text-slate-500 hover:underline">
        <ArrowLeft className="h-4 w-4" /> QCM
      </Link>
      <PageHeader title="Nouveau QCM" subtitle="Quatre réponses (A à D) par question, une seule bonne réponse." />

      <Card className="max-w-3xl space-y-4">
        <label className="block text-sm">
          <span className="mb-1 block text-slate-500">Classe</span>
          <select className={inputCls} value={classId} onChange={(e) => setClassId(e.target.value)}>
            <option value="">Choisir…</option>
            {classes.data?.classes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm">
          <span className="mb-1 block text-slate-500">Titre</span>
          <input className={inputCls} value={title} onChange={(e) => setTitle(e.target.value)} />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block text-slate-500">Description (facultatif)</span>
          <textarea rows={2} className={inputCls} value={description} onChange={(e) => setDescription(e.target.value)} />
        </label>
        <label className="block text-sm sm:max-w-xs">
          <span className="mb-1 block text-slate-500">Date limite (facultatif)</span>
          <input type="date" className={inputCls} value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
        </label>
      </Card>

      <div className="max-w-3xl space-y-4">
        {questions.map((q, i) => (
          <Card key={i} className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold">Question {i + 1}</h2>
              {questions.length > 1 && (
                <button
                  type="button"
                  className="text-slate-400 hover:text-rose-600"
                  aria-label="Supprimer la question"
                  onClick={() => setQuestions((qs) => qs.filter((_, idx) => idx !== i))}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </div>
            <textarea
              rows={2}
              className={inputCls}
              placeholder="Énoncé de la question"
              value={q.text}
              onChange={(e) => patch(i, (d) => ({ ...d, text: e.target.value }))}
            />
            <div className="space-y-2">
              {LETTERS.map((l) => (
                <div key={l} className="flex items-center gap-2">
                  <input
                    type="radio"
                    name={`correct-${i}`}
                    checked={q.correctOption === l}
                    onChange={() => patch(i, (d) => ({ ...d, correctOption: l }))}
                    aria-label={`Bonne réponse ${l}`}
                  />
                  <span className="w-5 font-mono text-sm text-slate-500">{l}</span>
                  <input
                    className={inputCls}
                    placeholder={`Réponse ${l}`}
                    value={q.options[l]}
                    onChange={(e) => patch(i, (d) => ({ ...d, options: { ...d.options, [l]: e.target.value } }))}
                  />
                </div>
              ))}
              <p className="text-xs text-slate-400">Cochez la bonne réponse.</p>
            </div>
          </Card>
        ))}
        <button type="button" className={btnGhost} onClick={() => setQuestions((qs) => [...qs, emptyQuestion()])}>
          <Plus className="h-4 w-4" /> Ajouter une question
        </button>
      </div>

      {formError && (
        <div className="max-w-3xl">
          <ErrorState message={formError} />
        </div>
      )}
      <div className="flex flex-wrap gap-2">
        <button type="button" className={btnPrimary} disabled={create.isPending} onClick={() => submit(true)}>
          {create.isPending ? 'Envoi…' : 'Publier maintenant'}
        </button>
        <button type="button" className={btnGhost} disabled={create.isPending} onClick={() => submit(false)}>
          Enregistrer en brouillon
        </button>
      </div>
    </div>
  )
}
