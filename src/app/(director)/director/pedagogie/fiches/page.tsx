'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { CheckCircle2, FileText, RefreshCw, XCircle } from 'lucide-react'
import {
  adminLessonPlansApi,
  type AdminLessonPlanItem,
  type LessonPlanStatus,
} from '@/lib/admin/api/lesson-plans.api'
import { normalizeStepItem } from '@/lib/teacher/api/lesson-plans.api'
import {
  LESSON_PLAN_PHASES,
  reviewLessonPlanSchema,
  STEP_FIELD_LABELS,
} from '@/lib/teacher/schemas/lesson-plan.schema'
import { TERM_LABELS, type SchoolTerm } from '@/types/teacher-grades'
import { DirectorPageHeader, DirectorEmptyState } from '@/components/director/director-ui'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import { getApiErrorMessage } from '@/lib/api/client'

const STATUS_LABELS: Record<LessonPlanStatus, string> = {
  DRAFT: 'Brouillon',
  SUBMITTED: 'Soumis',
  APPROVED: 'Approuvé',
  REJECTED: 'À revoir',
}

function teacherName(plan: AdminLessonPlanItem) {
  const u = plan.teacher?.user
  if (!u) return `Enseignant #${plan.teacherId}`
  return `${u.firstName ?? ''} ${u.lastName ?? ''}`.trim() || `Enseignant #${plan.teacherId}`
}

export default function DirectorLessonPlansReviewPage() {
  const qc = useQueryClient()
  const [status, setStatus] = useState<LessonPlanStatus | ''>('SUBMITTED')
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [feedback, setFeedback] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [ok, setOk] = useState<string | null>(null)

  const listQuery = useQuery({
    queryKey: ['director', 'lesson-plans', status],
    queryFn: () =>
      adminLessonPlansApi.list({
        status: status || undefined,
      }),
    staleTime: 15_000,
  })

  const plans = listQuery.data ?? []
  const selected = useMemo(
    () => plans.find((p) => p.id === selectedId) ?? plans[0] ?? null,
    [plans, selectedId],
  )

  const reviewMutation = useMutation({
    mutationFn: (input: { id: number; decision: 'APPROVED' | 'REJECTED'; feedback?: string }) =>
      adminLessonPlansApi.review(input.id, {
        decision: input.decision,
        feedback: input.feedback,
      }),
    onSuccess: async (_data, vars) => {
      setOk(
        vars.decision === 'APPROVED'
          ? 'Fiche approuvée.'
          : 'Fiche renvoyée pour révision.',
      )
      setError(null)
      setFeedback('')
      await qc.invalidateQueries({ queryKey: ['director', 'lesson-plans'] })
      await qc.invalidateQueries({ queryKey: ['director', 'action-items'] })
    },
    onError: (err) => {
      setOk(null)
      setError(getApiErrorMessage(err))
    },
  })

  function onReview(decision: 'APPROVED' | 'REJECTED') {
    if (!selected) return
    setError(null)
    setOk(null)
    const parsed = reviewLessonPlanSchema.safeParse({
      decision,
      feedback: feedback.trim() || undefined,
    })
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Commentaire invalide.')
      return
    }
    reviewMutation.mutate({
      id: selected.id,
      decision: parsed.data.decision,
      feedback: parsed.data.feedback,
    })
  }

  const pendingCount = plans.filter((p) => p.status === 'SUBMITTED').length

  return (
    <div className="min-h-screen bg-zinc-50">
      <DirectorPageHeader
        title="Fiches de préparation"
        subtitle="Validez ou renvoyez les fiches soumises par les enseignants de vos sections."
        actions={
          <div className="flex items-center gap-2">
            <Link
              href="/director/pedagogie"
              className="rounded-lg border border-zinc-200 px-3 py-1.5 text-sm text-zinc-600 hover:bg-zinc-50"
            >
              Visites de classe
            </Link>
            <button
              type="button"
              onClick={() => listQuery.refetch()}
              className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-sm hover:bg-zinc-50"
            >
              <RefreshCw className={cn('h-3.5 w-3.5', listQuery.isFetching && 'animate-spin')} />
              Actualiser
            </button>
          </div>
        }
      />

      <div className="mx-auto max-w-6xl space-y-6 px-6 py-8 sm:px-8">
      <div className="flex flex-wrap items-end gap-3 rounded-xl border border-zinc-200 bg-white p-4">
        <label className="text-sm">
          <span className="mb-1 block text-zinc-500">Statut</span>
          <select
            className="rounded-lg border border-zinc-200 px-3 py-2"
            value={status}
            onChange={(e) => {
              setStatus(e.target.value as LessonPlanStatus | '')
              setSelectedId(null)
            }}
          >
            <option value="SUBMITTED">En attente ({STATUS_LABELS.SUBMITTED})</option>
            <option value="APPROVED">{STATUS_LABELS.APPROVED}</option>
            <option value="REJECTED">{STATUS_LABELS.REJECTED}</option>
            <option value="">Tous</option>
          </select>
        </label>
        <p className="pb-2 text-sm text-zinc-500">
          {listQuery.isLoading
            ? 'Chargement…'
            : `${plans.length} fiche(s)${status === 'SUBMITTED' ? ` · ${pendingCount} à traiter` : ''}`}
        </p>
      </div>

      {listQuery.isLoading ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      ) : listQuery.isError ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
          Impossible de charger les fiches.{' '}
          <button type="button" className="underline" onClick={() => listQuery.refetch()}>
            Réessayer
          </button>
        </div>
      ) : plans.length === 0 ? (
        <DirectorEmptyState
          icon={FileText}
          title="Aucune fiche"
          description={
            status === 'SUBMITTED'
              ? 'Aucune fiche soumise en attente de validation.'
              : 'Aucune fiche pour ce filtre.'
          }
        />
      ) : (
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
          <ul className="space-y-2">
            {plans.map((plan) => {
              const active = selected?.id === plan.id
              return (
                <li key={plan.id}>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedId(plan.id)
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
                        <p className="font-semibold text-zinc-900">{plan.title}</p>
                        <p className="mt-0.5 text-xs text-zinc-500">
                          {teacherName(plan)}
                          {plan.class?.name ? ` · ${plan.class.name}` : ''}
                          {' · '}
                          {plan.subject}
                        </p>
                        <p className="mt-0.5 text-xs text-zinc-400">
                          {TERM_LABELS[plan.term as SchoolTerm] ?? plan.term} · Semaine{' '}
                          {plan.weekNumber}
                        </p>
                      </div>
                      <span
                        className={cn(
                          'shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold',
                          plan.status === 'SUBMITTED' && 'bg-amber-100 text-amber-800',
                          plan.status === 'APPROVED' && 'bg-emerald-100 text-emerald-800',
                          plan.status === 'REJECTED' && 'bg-rose-100 text-rose-800',
                          plan.status === 'DRAFT' && 'bg-zinc-100 text-zinc-600',
                        )}
                      >
                        {STATUS_LABELS[plan.status]}
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
                  {teacherName(selected)}
                  {selected.class?.name ? ` · ${selected.class.name}` : ''} · {selected.subject}
                  {selected.subBranch ? ` · ${selected.subBranch}` : ''}
                </p>
              </div>

              {selected.objectives && (
                <section>
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
                    Objectif opérationnel
                  </h3>
                  <p className="mt-1 whitespace-pre-wrap text-sm text-zinc-700">
                    {selected.objectives}
                  </p>
                </section>
              )}

              {selected.materials && (
                <section>
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
                    Matériel didactique
                  </h3>
                  <p className="mt-1 whitespace-pre-wrap text-sm text-zinc-700">
                    {selected.materials}
                  </p>
                </section>
              )}

              {selected.bibliographicReferences && (
                <section>
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
                    Référence(s) bibliographique(s)
                  </h3>
                  <p className="mt-1 whitespace-pre-wrap text-sm text-zinc-700">
                    {selected.bibliographicReferences}
                  </p>
                </section>
              )}

              {selected.steps && (
                <section className="space-y-4">
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
                    Partie pédagogique
                  </h3>
                  {LESSON_PLAN_PHASES.map((phase) => {
                    const stepEntries = phase.steps
                      .map((key) => ({ key, item: normalizeStepItem(selected.steps?.[key]) }))
                      .filter(({ item }) => item.content || item.method)
                    const phaseDuration = selected.steps?.[phase.durationKey]
                    if (stepEntries.length === 0 && !phaseDuration) return null
                    return (
                      <div key={phase.key} className="rounded-lg border border-zinc-100 p-3">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-sm font-semibold text-zinc-800">{phase.label}</p>
                          {phaseDuration ? (
                            <span className="text-xs text-zinc-400">{phaseDuration} min</span>
                          ) : null}
                        </div>
                        <div className="mt-2 space-y-2">
                          {stepEntries.map(({ key, item }) => (
                            <div key={key}>
                              <p className="text-sm font-medium text-zinc-800">
                                {STEP_FIELD_LABELS[key]}
                              </p>
                              {item.content && (
                                <p className="mt-0.5 whitespace-pre-wrap text-sm text-zinc-600">
                                  {item.content}
                                </p>
                              )}
                              {item.method && (
                                <p className="mt-0.5 text-xs text-zinc-400">
                                  Méthode / procédé : {item.method}
                                </p>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )
                  })}
                </section>
              )}

              {selected.feedback && selected.status !== 'SUBMITTED' && (
                <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900">
                  Commentaire précédent : {selected.feedback}
                </p>
              )}

              {selected.status === 'SUBMITTED' && (
                <div className="space-y-3 border-t border-zinc-100 pt-4">
                  <label className="block text-sm">
                    <span className="mb-1 block font-medium text-zinc-700">
                      Commentaire de validation
                    </span>
                    <textarea
                      rows={4}
                      className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
                      placeholder="Obligatoire en cas de renvoi (À revoir) — 8 caractères min."
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
                    <button
                      type="button"
                      disabled={reviewMutation.isPending}
                      onClick={() => onReview('APPROVED')}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
                    >
                      <CheckCircle2 className="h-4 w-4" />
                      Approuver
                    </button>
                    <button
                      type="button"
                      disabled={reviewMutation.isPending}
                      onClick={() => onReview('REJECTED')}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-700 disabled:opacity-60"
                    >
                      <XCircle className="h-4 w-4" />
                      À revoir
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
