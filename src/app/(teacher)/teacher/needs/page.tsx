'use client'

import { FormEvent, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { PackagePlus } from 'lucide-react'
import { teacherNeedsApi, type TeacherNeedStatus } from '@/lib/teacher/api/needs.api'
import { Skeleton } from '@/components/ui/skeleton'

const STATUS_LABELS: Record<TeacherNeedStatus, string> = {
  PENDING: 'En attente',
  APPROVED_BY_DIR: 'Validée (direction)',
  SENT_TO_ADMIN: 'Transmise à l\'admin',
  REJECTED: 'Refusée',
  FUNDED: 'Financée',
}

const STATUS_COLORS: Record<TeacherNeedStatus, string> = {
  PENDING: 'bg-amber-100 text-amber-800',
  APPROVED_BY_DIR: 'bg-sky-100 text-sky-800',
  SENT_TO_ADMIN: 'bg-indigo-100 text-indigo-800',
  REJECTED: 'bg-rose-100 text-rose-800',
  FUNDED: 'bg-emerald-100 text-emerald-800',
}

export default function TeacherNeedsPage() {
  const queryClient = useQueryClient()
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [estimatedCost, setEstimatedCost] = useState('0')
  const [formError, setFormError] = useState<string | null>(null)
  const [formOk, setFormOk] = useState<string | null>(null)

  const listQuery = useQuery({
    queryKey: ['teacher', 'needs'],
    queryFn: () => teacherNeedsApi.list(),
  })

  const createMutation = useMutation({
    mutationFn: () =>
      teacherNeedsApi.create({
        title: title.trim(),
        description: description.trim(),
        estimatedCost: Number(estimatedCost) || 0,
      }),
    onSuccess: async () => {
      setTitle('')
      setDescription('')
      setEstimatedCost('0')
      setFormError(null)
      setFormOk('Demande envoyée à la direction.')
      await queryClient.invalidateQueries({ queryKey: ['teacher', 'needs'] })
    },
    onError: (err: unknown) => {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message || 'Impossible d\'envoyer la demande. Vérifiez les champs.'
      setFormError(message)
      setFormOk(null)
    },
  })

  const onSubmit = (e: FormEvent) => {
    e.preventDefault()
    setFormOk(null)
    if (title.trim().length < 3 || description.trim().length < 8) {
      setFormError('Titre (3 car. min.) et description (8 car. min.) sont obligatoires.')
      return
    }
    createMutation.mutate()
  }

  const needs = listQuery.data ?? []

  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
          <PackagePlus className="h-6 w-6 text-teal-600" />
          Besoins matériels
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Demandez du matériel pédagogique à la direction et suivez le statut.
        </p>
      </div>

      <form
        onSubmit={onSubmit}
        className="space-y-3 rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900"
      >
        <h2 className="font-semibold">Nouvelle demande</h2>
        <label className="block text-sm">
          <span className="mb-1 block text-slate-500">Titre</span>
          <input
            required
            minLength={3}
            className="w-full rounded-lg border border-slate-200 px-3 py-2 dark:border-slate-700 dark:bg-slate-950"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Ex. Cahiers d'exercices 5e"
          />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block text-slate-500">Description</span>
          <textarea
            required
            minLength={8}
            rows={3}
            className="w-full rounded-lg border border-slate-200 px-3 py-2 dark:border-slate-700 dark:bg-slate-950"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Précisez la quantité, l'usage et l'urgence."
          />
        </label>
        <label className="block text-sm sm:max-w-xs">
          <span className="mb-1 block text-slate-500">Coût estimé</span>
          <input
            type="number"
            min={0}
            step="0.01"
            className="w-full rounded-lg border border-slate-200 px-3 py-2 dark:border-slate-700 dark:bg-slate-950"
            value={estimatedCost}
            onChange={(e) => setEstimatedCost(e.target.value)}
          />
        </label>
        {formError && (
          <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{formError}</p>
        )}
        {formOk && (
          <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">{formOk}</p>
        )}
        <button
          type="submit"
          disabled={createMutation.isPending}
          className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700 disabled:opacity-60"
        >
          {createMutation.isPending ? 'Envoi…' : 'Envoyer la demande'}
        </button>
      </form>

      <section className="space-y-3">
        <h2 className="font-semibold">Mes demandes</h2>
        {listQuery.isLoading ? (
          <Skeleton className="h-24 w-full" />
        ) : listQuery.isError ? (
          <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
            Impossible de charger vos demandes.
            <button type="button" className="ml-3 underline" onClick={() => listQuery.refetch()}>
              Réessayer
            </button>
          </div>
        ) : needs.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-900">
            Aucune demande pour le moment.
          </div>
        ) : (
          <ul className="space-y-3">
            {needs.map((need) => (
              <li
                key={need.id}
                className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold">{need.title}</p>
                    <p className="mt-1 whitespace-pre-wrap text-sm text-slate-600 dark:text-slate-300">
                      {need.description}
                    </p>
                    <p className="mt-2 text-xs text-slate-500">
                      Coût estimé : {Number(need.estimatedCost).toLocaleString('fr-FR')}
                    </p>
                    {need.feedback && (
                      <p className="mt-2 text-sm text-amber-800">Retour : {need.feedback}</p>
                    )}
                  </div>
                  <span
                    className={`rounded-full px-2.5 py-1 text-xs font-medium ${STATUS_COLORS[need.status] ?? 'bg-slate-100'}`}
                  >
                    {STATUS_LABELS[need.status] ?? need.status}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
