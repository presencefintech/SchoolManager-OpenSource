'use client'

import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Lock, RefreshCw, Unlock } from 'lucide-react'
import { AdminModuleHero } from '@/components/admin/shared/admin-module-hero'
import { AcademicTermStatusBadge } from '@/components/admin/grades/academic-term-status-badge'
import {
  currentAcademicYear,
  formatDateTime,
} from '@/components/admin/grades/grades-utils'
import { adminGradesApi } from '@/lib/admin/api/grades.api'
import { getApiErrorMessage } from '@/lib/api/client'
import { cn } from '@/lib/utils'
import { useToast } from '@/providers/toast-provider'
import {
  TERM_LABELS,
  type AcademicTermStatus,
  type SchoolTerm,
} from '@/types/teacher-grades'

const TERMS = Object.keys(TERM_LABELS) as SchoolTerm[]
const STATUS_OPTIONS: AcademicTermStatus[] = ['DRAFT', 'SUBMITTED', 'LOCKED']

const STATUS_ACTION_LABEL: Record<AcademicTermStatus, string> = {
  DRAFT: 'Rouvrir (DRAFT)',
  SUBMITTED: 'Marquer soumis',
  LOCKED: 'Verrouiller',
}

export default function AdminGradesPeriodsPage() {
  const toast = useToast()
  const queryClient = useQueryClient()
  const [academicYear, setAcademicYear] = useState(currentAcademicYear())
  const [reasonByTerm, setReasonByTerm] = useState<Partial<Record<SchoolTerm, string>>>({})
  const [pendingTerm, setPendingTerm] = useState<SchoolTerm | null>(null)

  const periodsQuery = useQuery({
    queryKey: ['admin', 'grades', 'periods', academicYear],
    queryFn: () => adminGradesApi.listPeriods(academicYear),
  })

  const periodMap = useMemo(() => {
    const map = new Map<
      SchoolTerm,
      {
        status: AcademicTermStatus
        reason?: string | null
        submittedAt?: string | null
        lockedAt?: string | null
        id?: number
      }
    >()
    for (const term of TERMS) {
      map.set(term, { status: 'DRAFT' })
    }
    for (const row of periodsQuery.data ?? []) {
      if (row.academicYear !== academicYear) continue
      map.set(row.term, {
        status: row.status,
        reason: row.reason,
        submittedAt: row.submittedAt,
        lockedAt: row.lockedAt,
        id: row.id,
      })
    }
    return map
  }, [periodsQuery.data, academicYear])

  const mutation = useMutation({
    mutationFn: (input: {
      term: SchoolTerm
      status: AcademicTermStatus
      reason?: string | null
    }) =>
      adminGradesApi.setPeriodStatus({
        academicYear,
        term: input.term,
        status: input.status,
        reason: input.reason,
      }),
    onSuccess: async (_data, vars) => {
      setPendingTerm(null)
      toast.success('Période mise à jour', `${TERM_LABELS[vars.term]} → ${STATUS_ACTION_LABEL[vars.status]}`)
      await queryClient.invalidateQueries({ queryKey: ['admin', 'grades', 'periods'] })
    },
    onError: (err) => {
      toast.error('Échec du changement de statut', getApiErrorMessage(err))
    },
  })

  function requestStatus(term: SchoolTerm, status: AcademicTermStatus) {
    const reason = reasonByTerm[term]?.trim() || null
    const needsReason = status === 'DRAFT' || status === 'LOCKED'
    if (needsReason && !reason) {
      toast.error('Motif requis', 'Indiquez un motif pour verrouiller ou rouvrir exceptionnellement.')
      return
    }
    setPendingTerm(term)
    mutation.mutate({ term, status, reason })
  }

  return (
    <>
      <AdminModuleHero
        eyebrow="Notes · Périodes"
        title="Verrouillage des trimestres"
        subtitle="DRAFT → SUBMITTED → LOCKED. Rouverture exceptionnelle avec motif obligatoire."
        actions={
          <div className="flex items-center gap-2">
            <input
              value={academicYear}
              onChange={(e) => setAcademicYear(e.target.value)}
              className="rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-400/40"
            />
            <button
              type="button"
              onClick={() => void periodsQuery.refetch()}
              className="inline-flex items-center gap-2 px-3.5 py-2 text-sm font-medium rounded-lg bg-white/10 text-white ring-1 ring-white/15 hover:bg-white/15"
            >
              <RefreshCw
                size={14}
                className={cn(periodsQuery.isFetching && 'animate-spin')}
              />
              Actualiser
            </button>
          </div>
        }
        metrics={[
          {
            label: 'Ouverts',
            value: TERMS.filter((t) => periodMap.get(t)?.status === 'DRAFT').length,
            loading: periodsQuery.isLoading,
            icon: Unlock,
          },
          {
            label: 'Soumis',
            value: TERMS.filter((t) => periodMap.get(t)?.status === 'SUBMITTED').length,
            loading: periodsQuery.isLoading,
            icon: Lock,
          },
          {
            label: 'Verrouillés',
            value: TERMS.filter((t) => periodMap.get(t)?.status === 'LOCKED').length,
            loading: periodsQuery.isLoading,
            icon: Lock,
          },
        ]}
      />

      <div className="max-w-7xl mx-auto px-6 lg:px-8 py-6 space-y-4">
        {TERMS.map((term) => {
          const row = periodMap.get(term)!
          const busy = mutation.isPending && pendingTerm === term
          return (
            <article
              key={term}
              className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm space-y-4"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-base font-semibold text-zinc-900">
                    {TERM_LABELS[term]}
                  </h2>
                  <p className="text-xs text-zinc-500 mt-1">
                    {row.submittedAt
                      ? `Soumis le ${formatDateTime(row.submittedAt)}`
                      : 'Pas encore soumis'}
                    {row.lockedAt ? ` · Verrouillé le ${formatDateTime(row.lockedAt)}` : ''}
                  </p>
                  {row.reason ? (
                    <p className="text-xs text-zinc-600 mt-1 italic">Motif actuel : {row.reason}</p>
                  ) : null}
                </div>
                <AcademicTermStatusBadge status={row.status} />
              </div>

              <label className="block">
                <span className="text-xs font-medium text-zinc-600">
                  Motif (requis pour verrouiller / rouvrir)
                </span>
                <textarea
                  value={reasonByTerm[term] ?? ''}
                  onChange={(e) =>
                    setReasonByTerm((prev) => ({ ...prev, [term]: e.target.value }))
                  }
                  rows={2}
                  className="mt-1.5 w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400/40 focus:border-emerald-400"
                  placeholder="Ex. Correction après litige parent / clôture bulletin…"
                />
              </label>

              <div className="flex flex-wrap gap-2">
                {STATUS_OPTIONS.map((status) => {
                  const isCurrent = row.status === status
                  return (
                    <button
                      key={status}
                      type="button"
                      disabled={busy || isCurrent}
                      onClick={() => requestStatus(term, status)}
                      className={cn(
                        'inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold transition-colors disabled:opacity-40',
                        status === 'LOCKED'
                          ? 'bg-zinc-900 text-white hover:bg-zinc-800'
                          : status === 'DRAFT'
                            ? 'bg-amber-100 text-amber-900 hover:bg-amber-200'
                            : 'bg-sky-100 text-sky-900 hover:bg-sky-200',
                      )}
                    >
                      {status === 'LOCKED' ? <Lock size={12} /> : <Unlock size={12} />}
                      {STATUS_ACTION_LABEL[status]}
                    </button>
                  )
                })}
              </div>
            </article>
          )
        })}
      </div>
    </>
  )
}
