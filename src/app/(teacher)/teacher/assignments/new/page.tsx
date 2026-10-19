'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { FormEvent, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft } from 'lucide-react'
import { apiErrorMessage, teacherMobileApi } from '@/lib/teacher/api/mobile.api'
import { teacherAssignmentsApi } from '@/lib/teacher/api/school-work.api'
import { ErrorState, PageHeader, btnGhost, btnPrimary, inputCls } from '@/components/teacher/ui'

export default function NewAssignmentPage() {
  const router = useRouter()
  const qc = useQueryClient()
  const classes = useQuery({ queryKey: ['teacher', 'mobile', 'classes'], queryFn: teacherMobileApi.dashboard })

  const [classId, setClassId] = useState('')
  const [title, setTitle] = useState('')
  const [subject, setSubject] = useState('')
  const [description, setDescription] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [formError, setFormError] = useState<string | null>(null)

  const create = useMutation({
    mutationFn: (publish: boolean) =>
      teacherAssignmentsApi.create({
        classId: Number(classId),
        title: title.trim(),
        subject: subject.trim(),
        description: description.trim() || undefined,
        dueDate: dueDate ? new Date(`${dueDate}T23:59:00`).toISOString() : undefined,
        publish,
      }),
    onSuccess: (detail) => {
      void qc.invalidateQueries({ queryKey: ['teacher', 'assignments'] })
      router.push(`/teacher/assignments/${detail.id}`)
    },
    onError: (err) => setFormError(apiErrorMessage(err, 'Création impossible.')),
  })

  const submit = (publish: boolean) => (e?: FormEvent) => {
    e?.preventDefault()
    setFormError(null)
    if (!classId) return setFormError('Choisissez une classe.')
    if (title.trim().length < 2) return setFormError('Le titre est obligatoire.')
    if (subject.trim().length < 2) return setFormError('La matière est obligatoire.')
    create.mutate(publish)
  }

  return (
    <div className="space-y-6">
      <Link href="/teacher/assignments" className="inline-flex items-center gap-1 text-sm text-slate-500 hover:underline">
        <ArrowLeft className="h-4 w-4" /> Devoirs
      </Link>
      <PageHeader title="Nouveau devoir" subtitle="Les parents sont notifiés dès la publication." />

      <form
        onSubmit={submit(true)}
        className="max-w-2xl space-y-4 rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900"
      >
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
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-sm">
            <span className="mb-1 block text-slate-500">Titre</span>
            <input className={inputCls} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex. Exercices de fractions" />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block text-slate-500">Matière</span>
            <input className={inputCls} value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Ex. Mathématiques" />
          </label>
        </div>
        <label className="block text-sm">
          <span className="mb-1 block text-slate-500">Consignes (facultatif)</span>
          <textarea rows={4} className={inputCls} value={description} onChange={(e) => setDescription(e.target.value)} />
        </label>
        <label className="block text-sm sm:max-w-xs">
          <span className="mb-1 block text-slate-500">À rendre pour le (facultatif)</span>
          <input type="date" className={inputCls} value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
        </label>

        {formError && <ErrorState message={formError} />}

        <div className="flex flex-wrap gap-2">
          <button type="submit" className={btnPrimary} disabled={create.isPending}>
            {create.isPending ? 'Envoi…' : 'Publier maintenant'}
          </button>
          <button type="button" className={btnGhost} disabled={create.isPending} onClick={() => submit(false)()}>
            Enregistrer en brouillon
          </button>
        </div>
      </form>
    </div>
  )
}
