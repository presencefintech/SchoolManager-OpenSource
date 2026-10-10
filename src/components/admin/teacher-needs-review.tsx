'use client'

import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { CheckCircle2, PackagePlus, RefreshCw, Send, XCircle } from 'lucide-react'
import {
  adminTeacherNeedsApi,
  type AdminTeacherNeedItem,
  type TeacherNeedStatus,
} from '@/lib/admin/api/lesson-plans.api'
import { getApiErrorMessage } from '@/lib/api/client'
import { cn } from '@/lib/utils'
import { useAuth } from '@/providers/auth-provider'

const STATUS_LABELS: Record<TeacherNeedStatus, string> = {
  PENDING: 'En attente',
  APPROVED_BY_DIR: 'Validé (direction)',
  SENT_TO_ADMIN: 'Transmis à l’admin',
  REJECTED: 'Refusé',
  FUNDED: 'Financé',
}

const STATUS_COLORS: Record<TeacherNeedStatus, string> = {
  PENDING: 'bg-amber-100 text-amber-800',
  APPROVED_BY_DIR: 'bg-sky-100 text-sky-800',
  SENT_TO_ADMIN: 'bg-indigo-100 text-indigo-800',
  REJECTED: 'bg-rose-100 text-rose-800',
  FUNDED: 'bg-emerald-100 text-emerald-800',
}

function teacherName(need: AdminTeacherNeedItem) {
  const u = need.teacher?.user
  if (!u) return `Enseignant #${need.teacherId}`
  return `${u.firstName ?? ''} ${u.lastName ?? ''}`.trim() || `Enseignant #${need.teacherId}`
}

function formatCost(value: number | string) {
  const n = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(n)) return String(value)
  return n.toLocaleString('fr-FR', { maximumFractionDigits: 2 })
}

type Props = {
  /** Variante visuelle légère (directeur) vs admin. */
  variant?: 'admin' | 'director'
}

export function TeacherNeedsReview({ variant = 'admin' }: Props) {
  const { user } = useAuth()
  const qc = useQueryClient()
  const isDirector = user?.role === 'DIRECTOR'
  const [status, setStatus] = useState<TeacherNeedStatus | ''>('PENDING')
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [feedback, setFeedback] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [ok, setOk] = useState<string | null>(null)

  const listQuery = useQuery({
    queryKey: ['admin', 'needs', status],
    queryFn: () =>
      adminTeacherNeedsApi.list({
        status: status || undefined,
      }),
    staleTime: 15_000,
  })

  const needs = listQuery.data ?? []
  const selected = useMemo(
    () => needs.find((n) => n.id === selectedId) ?? needs[0] ?? null,
    [needs, selectedId],
  )

  const reviewMutation = useMutation({
    mutationFn: (input: {
      id: number
      decision: 'APPROVED_BY_DIR' | 'SENT_TO_ADMIN' | 'REJECTED' | 'FUNDED'
      feedback?: string
    }) =>
      adminTeacherNeedsApi.review(input.id, {
        decision: input.decision,
        feedback: input.feedback,
      }),
    onSuccess: async (_d, vars) => {
      setOk(`Demande mise à jour → ${STATUS_LABELS[vars.decision]}`)
      setError(null)
      setFeedback('')
      await qc.invalidateQueries({ queryKey: ['admin', 'needs'] })
      await qc.invalidateQueries({ queryKey: ['admin', 'dashboard'] })
      await qc.invalidateQueries({ queryKey: ['director', 'action-items'] })
    },
    onError: (err) => {
      setOk(null)
      setError(getApiErrorMessage(err))
    },
  })

  function decide(decision: 'APPROVED_BY_DIR' | 'SENT_TO_ADMIN' | 'REJECTED' | 'FUNDED') {
    if (!selected) return
    setError(null)
    setOk(null)
    if (decision === 'REJECTED' && feedback.trim().length < 8) {
      setError('Un refus exige un commentaire (8 caractères min.).')
      return
    }
    reviewMutation.mutate({
      id: selected.id,
      decision,
      feedback: feedback.trim() || undefined,
    })
  }

  const shell =
    variant === 'director'
      ? 'min-h-screen bg-zinc-50'
      : 'min-h-full bg-[#e8ecf4]'

  return (
    <div className={shell}>
      <div className="mx-auto max-w-6xl space-y-6 px-6 py-8 sm:px-8">
        <header className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-semibold text-zinc-900">
              <PackagePlus className="h-6 w-6 text-teal-600" />
              Besoins matériels enseignants
            </h1>
            <p className="mt-1 text-sm text-zinc-500">
              Validez, refusez ou transmettez les demandes pédagogiques soumises par les enseignants.
            </p>
          </div>
          <button
            type="button"
            onClick={() => void listQuery.refetch()}
            className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-sm hover:bg-zinc-50"
          >
            <RefreshCw className={cn('h-3.5 w-3.5', listQuery.isFetching && 'animate-spin')} />
            Actualiser
          </button>
        </header>

        <div className="flex flex-wrap items-end gap-3 rounded-xl border border-zinc-200 bg-white p-4">
          <label className="text-sm">
            <span className="mb-1 block text-zinc-500">Statut</span>
            <select
              className="rounded-lg border border-zinc-200 px-3 py-2"
              value={status}
              onChange={(e) => {
                setStatus(e.target.value as TeacherNeedStatus | '')
                setSelectedId(null)
              }}
            >
              <option value="PENDING">En attente</option>
              <option value="APPROVED_BY_DIR">Validés direction</option>
              <option value="SENT_TO_ADMIN">Transmis admin</option>
              <option value="FUNDED">Financés</option>
              <option value="REJECTED">Refusés</option>
              <option value="">Tous</option>
            </select>
          </label>
          <p className="pb-2 text-sm text-zinc-500">
            {listQuery.isLoading ? 'Chargement…' : `${needs.length} demande(s)`}
          </p>
        </div>

        {listQuery.isError ? (
          <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
            Impossible de charger les besoins.{' '}
            <button type="button" className="underline" onClick={() => listQuery.refetch()}>
              Réessayer
            </button>
          </div>
        ) : needs.length === 0 ? (
          <div className="rounded-xl border border-dashed border-zinc-300 bg-white p-10 text-center text-sm text-zinc-500">
            Aucune demande pour ce filtre.
          </div>
        ) : (
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
            <ul className="space-y-2">
              {needs.map((need) => {
                const active = selected?.id === need.id
                return (
                  <li key={need.id}>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedId(need.id)
                        setFeedback('')
                        setError(null)
                        setOk(null)
                      }}
                      className={cn(
                        'w-full rounded-xl border px-4 py-3 text-left transition',
                        active
                          ? 'border-teal-500 bg-teal-50/60 shadow-sm'
                          : 'border-zinc-200 bg-white hover:border-zinc-300',
                      )}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="font-semibold text-zinc-900">{need.title}</p>
                          <p className="mt-0.5 text-xs text-zinc-500">
                            {teacherName(need)} · {formatCost(need.estimatedCost)}
                          </p>
                        </div>
                        <span
                          className={cn(
                            'shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold',
                            STATUS_COLORS[need.status],
                          )}
                        >
                          {STATUS_LABELS[need.status]}
                        </span>
                      </div>
                    </button>
                  </li>
                )
              })}
            </ul>

            {selected && (
              <div className="space-y-4 rounded-xl border border-zinc-200 bg-white p-5">
                <div>
                  <h2 className="text-lg font-semibold text-zinc-900">{selected.title}</h2>
                  <p className="mt-1 text-sm text-zinc-500">
                    {teacherName(selected)} · Estimation {formatCost(selected.estimatedCost)}
                  </p>
                </div>
                <p className="whitespace-pre-wrap text-sm text-zinc-700">{selected.description}</p>
                {selected.feedback ? (
                  <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900">
                    Commentaire : {selected.feedback}
                  </p>
                ) : null}

                {(selected.status === 'PENDING' ||
                  selected.status === 'APPROVED_BY_DIR' ||
                  selected.status === 'SENT_TO_ADMIN') && (
                  <div className="space-y-3 border-t border-zinc-100 pt-4">
                    <label className="block text-sm">
                      <span className="mb-1 block font-medium text-zinc-700">Commentaire</span>
                      <textarea
                        rows={3}
                        className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
                        placeholder="Obligatoire en cas de refus"
                        value={feedback}
                        onChange={(e) => setFeedback(e.target.value)}
                      />
                    </label>
                    {error && (
                      <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>
                    )}
                    {ok && (
                      <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">{ok}</p>
                    )}
                    <div className="flex flex-wrap gap-2">
                      {selected.status === 'PENDING' && (
                        <>
                          <button
                            type="button"
                            disabled={reviewMutation.isPending}
                            onClick={() => decide('APPROVED_BY_DIR')}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
                          >
                            <CheckCircle2 className="h-4 w-4" />
                            Valider (direction)
                          </button>
                          <button
                            type="button"
                            disabled={reviewMutation.isPending}
                            onClick={() => decide('SENT_TO_ADMIN')}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
                          >
                            <Send className="h-4 w-4" />
                            Transmettre à l’admin
                          </button>
                        </>
                      )}
                      {(selected.status === 'APPROVED_BY_DIR' ||
                        selected.status === 'SENT_TO_ADMIN') &&
                        !isDirector && (
                          <button
                            type="button"
                            disabled={reviewMutation.isPending}
                            onClick={() => decide('FUNDED')}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-teal-700 px-3 py-2 text-sm font-semibold text-white hover:bg-teal-800 disabled:opacity-60"
                          >
                            <CheckCircle2 className="h-4 w-4" />
                            Marquer financé
                          </button>
                        )}
                      <button
                        type="button"
                        disabled={reviewMutation.isPending}
                        onClick={() => decide('REJECTED')}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-rose-600 px-3 py-2 text-sm font-semibold text-white hover:bg-rose-700 disabled:opacity-60"
                      >
                        <XCircle className="h-4 w-4" />
                        Refuser
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
