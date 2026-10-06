'use client'

import Link from 'next/link'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  AlertTriangle, BookOpen, CheckCircle2, ClipboardList, RefreshCw, XCircle,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { getApiErrorMessage } from '@/lib/api/client'
import { useDirectionAlerts, useDirectionMetrics } from '@/lib/hooks/use-admin'
import {
  adminLessonPlansApi,
  adminTeacherNeedsApi,
} from '@/lib/admin/api/lesson-plans.api'
import { useToast } from '@/providers/toast-provider'
import { TERM_LABELS, type SchoolTerm } from '@/types/teacher-grades'

const ALERT_CODE_LABEL: Record<string, string> = {
  LESSON_PLAN_MISSING: 'Fiche manquante',
  LESSON_PLAN_REJECTED_STALE: 'Rejet non corrigé',
  SANCTION_REPEAT: 'Sanctions répétées',
  NEED_STALE: 'Besoin en attente',
}

function termLabel(term?: string) {
  if (!term) return '—'
  return TERM_LABELS[term as SchoolTerm] ?? term
}

function Sk({ className }: { className?: string }) {
  return <div className={cn('rounded-lg bg-slate-100 animate-pulse', className)} />
}

export function DirectionPedagogyPanel() {
  const toast = useToast()
  const queryClient = useQueryClient()
  const metricsQuery = useDirectionMetrics()
  const alertsQuery = useDirectionAlerts()
  const plansQuery = useQuery({
    queryKey: ['admin', 'lesson-plans', 'SUBMITTED'],
    queryFn: () => adminLessonPlansApi.list({ status: 'SUBMITTED' }),
    staleTime: 30_000,
  })

  const reviewPlan = useMutation({
    mutationFn: (input: { id: number; decision: 'APPROVED' | 'REJECTED'; feedback?: string }) =>
      adminLessonPlansApi.review(input.id, {
        decision: input.decision,
        feedback: input.feedback,
      }),
    onSuccess: async (_, vars) => {
      toast.success(vars.decision === 'APPROVED' ? 'Fiche approuvée' : 'Fiche rejetée')
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['admin', 'lesson-plans'] }),
        queryClient.invalidateQueries({ queryKey: ['admin', 'dashboard'] }),
      ])
    },
    onError: (err) => toast.error('Revue impossible', getApiErrorMessage(err)),
  })

  const reviewNeed = useMutation({
    mutationFn: (input: { id: number; decision: 'APPROVED_BY_DIR' | 'SENT_TO_ADMIN' | 'REJECTED' }) =>
      adminTeacherNeedsApi.review(input.id, { decision: input.decision }),
    onSuccess: async () => {
      toast.success('Besoin mis à jour')
      await queryClient.invalidateQueries({ queryKey: ['admin', 'dashboard', 'alerts'] })
    },
    onError: (err) => toast.error('Décision impossible', getApiErrorMessage(err)),
  })

  const metrics = metricsQuery.data
  const alerts = alertsQuery.data?.alerts ?? []
  const plans = plansQuery.data ?? []
  const loading = metricsQuery.isPending || alertsQuery.isPending

  const coverage = metrics?.lessonCoverage.coverageRate
  const period = metrics?.period ?? alertsQuery.data?.period

  return (
    <div className="rounded-xl border border-slate-200/80 bg-white/90 shadow-[0_1px_3px_rgba(15,23,42,0.06)] overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-2 px-5 py-3.5 border-b border-slate-100 bg-slate-50/50">
        <div>
          <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-2">
            <ClipboardList size={16} className="text-teal-600" />
            Pilotage pédagogique
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            {period
              ? `${period.academicYear} · ${termLabel(period.term)}${
                  period.weekNumber != null ? ` · S${period.weekNumber}` : ''
                }`
              : 'Indicateurs direction (fiches, besoins, alertes)'}
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            void metricsQuery.refetch()
            void alertsQuery.refetch()
            void plansQuery.refetch()
          }}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 hover:text-slate-900"
        >
          <RefreshCw
            size={13}
            className={cn(
              (metricsQuery.isFetching || alertsQuery.isFetching || plansQuery.isFetching) &&
                'animate-spin',
            )}
          />
          Actualiser
        </button>
      </div>

      <div className="p-5 space-y-4">
        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Sk className="h-20" />
            <Sk className="h-20" />
            <Sk className="h-20" />
            <Sk className="h-20" />
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="rounded-lg border border-slate-100 bg-slate-50/80 px-3 py-2.5">
              <p className="text-[10px] uppercase tracking-wide text-slate-500">Couverture fiches</p>
              <p className="mt-1 text-xl font-bold tabular-nums text-slate-900">
                {coverage != null ? `${coverage}%` : '—'}
              </p>
              <p className="text-[10px] text-slate-400">
                {metrics?.lessonCoverage.teachersCovered ?? 0}/
                {metrics?.lessonCoverage.teachersExpected ?? 0} enseignants
              </p>
            </div>
            <div className="rounded-lg border border-slate-100 bg-slate-50/80 px-3 py-2.5">
              <p className="text-[10px] uppercase tracking-wide text-slate-500">À valider</p>
              <p className="mt-1 text-xl font-bold tabular-nums text-slate-900">
                {metrics?.plansByStatus.SUBMITTED ?? 0}
              </p>
              <p className="text-[10px] text-slate-400">fiches soumises</p>
            </div>
            <div className="rounded-lg border border-slate-100 bg-slate-50/80 px-3 py-2.5">
              <p className="text-[10px] uppercase tracking-wide text-slate-500">Besoins</p>
              <p className="mt-1 text-xl font-bold tabular-nums text-slate-900">
                {metrics?.needsAwaitingFunding.count ?? 0}
              </p>
              <p className="text-[10px] text-slate-400">
                {metrics?.needsAwaitingFunding.estimatedCost ?? '0.00'} estimés
              </p>
            </div>
            <div className="rounded-lg border border-slate-100 bg-slate-50/80 px-3 py-2.5">
              <p className="text-[10px] uppercase tracking-wide text-slate-500">Alertes</p>
              <p className="mt-1 text-xl font-bold tabular-nums text-slate-900">{alerts.length}</p>
              <p className="text-[10px] text-slate-400">
                {alerts.filter((a) => a.severity === 'HIGH').length} haute(s)
              </p>
            </div>
          </div>
        )}

        <div className="grid gap-4 lg:grid-cols-2">
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">
              Fiches à revoir
            </h4>
            {plansQuery.isPending ? (
              <Sk className="h-28" />
            ) : plans.length === 0 ? (
              <p className="text-sm text-slate-400 rounded-lg border border-dashed border-slate-200 px-3 py-4">
                Aucune fiche en attente de validation.
              </p>
            ) : (
              <ul className="space-y-2 max-h-56 overflow-y-auto">
                {plans.slice(0, 8).map((plan) => {
                  const teacherName = [
                    plan.teacher?.user?.firstName,
                    plan.teacher?.user?.lastName,
                  ]
                    .filter(Boolean)
                    .join(' ')
                  return (
                    <li
                      key={plan.id}
                      className="rounded-lg border border-slate-100 bg-white px-3 py-2.5 flex items-start justify-between gap-2"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-slate-800 truncate">{plan.title}</p>
                        <p className="text-[11px] text-slate-500 truncate">
                          {teacherName || `Enseignant #${plan.teacherId}`}
                          {plan.class?.name ? ` · ${plan.class.name}` : ''}
                          {` · S${plan.weekNumber}`}
                        </p>
                      </div>
                      <div className="flex shrink-0 gap-1">
                        <button
                          type="button"
                          disabled={reviewPlan.isPending}
                          onClick={() =>
                            reviewPlan.mutate({ id: plan.id, decision: 'APPROVED' })
                          }
                          className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-1 text-[11px] font-semibold text-emerald-700 hover:bg-emerald-100 disabled:opacity-50"
                        >
                          <CheckCircle2 size={12} /> OK
                        </button>
                        <button
                          type="button"
                          disabled={reviewPlan.isPending}
                          onClick={() => {
                            const feedback = window.prompt(
                              'Motif de rejet (8 caractères min.)',
                              'À corriger avant nouvelle soumission.',
                            )
                            if (!feedback || feedback.trim().length < 8) return
                            reviewPlan.mutate({
                              id: plan.id,
                              decision: 'REJECTED',
                              feedback: feedback.trim(),
                            })
                          }}
                          className="inline-flex items-center gap-1 rounded-md bg-rose-50 px-2 py-1 text-[11px] font-semibold text-rose-700 hover:bg-rose-100 disabled:opacity-50"
                        >
                          <XCircle size={12} /> Rejeter
                        </button>
                      </div>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>

          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">
              Alertes direction
            </h4>
            {alertsQuery.isPending ? (
              <Sk className="h-28" />
            ) : alerts.length === 0 ? (
              <p className="text-sm text-slate-400 rounded-lg border border-dashed border-slate-200 px-3 py-4">
                Aucune alerte pédagogique pour le moment.
              </p>
            ) : (
              <ul className="space-y-2 max-h-56 overflow-y-auto">
                {alerts.slice(0, 10).map((alert) => (
                  <li
                    key={`${alert.code}-${alert.resourceId}-${alert.occurredAt}`}
                    className="rounded-lg border border-slate-100 bg-white px-3 py-2.5"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-slate-800 flex items-center gap-1.5">
                          <AlertTriangle
                            size={13}
                            className={
                              alert.severity === 'HIGH' ? 'text-rose-500' : 'text-amber-500'
                            }
                          />
                          <span className="truncate">{alert.title}</span>
                        </p>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          {ALERT_CODE_LABEL[alert.code] ?? alert.code} · {alert.teacherName}
                        </p>
                        <p className="text-[11px] text-slate-400 mt-0.5 line-clamp-2">
                          {alert.detail}
                        </p>
                      </div>
                      {alert.resource === 'TeacherNeedRequest' && (
                        <button
                          type="button"
                          disabled={reviewNeed.isPending}
                          onClick={() =>
                            reviewNeed.mutate({
                              id: alert.resourceId,
                              decision: 'APPROVED_BY_DIR',
                            })
                          }
                          className="shrink-0 rounded-md bg-teal-50 px-2 py-1 text-[11px] font-semibold text-teal-700 hover:bg-teal-100 disabled:opacity-50"
                        >
                          Valider
                        </button>
                      )}
                      {alert.resource === 'Teacher' && (
                        <Link
                          href="/admin/teachers"
                          className="shrink-0 rounded-md bg-slate-50 px-2 py-1 text-[11px] font-semibold text-slate-600 hover:bg-slate-100"
                        >
                          Voir
                        </Link>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <div className="flex flex-wrap gap-2 pt-1">
          <Link
            href="/admin/grades/periods"
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
          >
            <BookOpen size={13} />
            Périodes scolaires
          </Link>
          <Link
            href="/admin/teachers"
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
          >
            Enseignants
          </Link>
        </div>
      </div>
    </div>
  )
}
