'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { CalendarRange, ExternalLink, Lock, RefreshCw, Unlock } from 'lucide-react'
import { adminGradesApi } from '@/lib/admin/api/grades.api'
import { currentAcademicYear } from '@/components/admin/grades/grades-utils'
import { AcademicTermStatusBadge } from '@/components/admin/grades/academic-term-status-badge'
import { getApiErrorMessage } from '@/lib/api/client'
import { useToast } from '@/providers/toast-provider'
import {
  TERM_LABELS,
  type AcademicTermStatus,
  type SchoolTerm,
} from '@/types/teacher-grades'

const TERMS = Object.keys(TERM_LABELS) as SchoolTerm[]

/**
 * Bloc paramètres : année scolaire courante + statut des trimestres (API notes).
 */
export function SchoolAcademicSettings() {
  const toast = useToast()
  const queryClient = useQueryClient()
  const [academicYear, setAcademicYear] = useState(currentAcademicYear())

  const periodsQuery = useQuery({
    queryKey: ['admin', 'grades', 'periods', academicYear, 'settings'],
    queryFn: () => adminGradesApi.listPeriods(academicYear),
  })

  const periodMap = useMemo(() => {
    const map = new Map<SchoolTerm, { status: AcademicTermStatus; reason?: string | null }>()
    for (const term of TERMS) map.set(term, { status: 'DRAFT' })
    for (const row of periodsQuery.data ?? []) {
      if (row.academicYear !== academicYear) continue
      map.set(row.term, { status: row.status, reason: row.reason })
    }
    return map
  }, [periodsQuery.data, academicYear])

  const mutation = useMutation({
    mutationFn: (input: { term: SchoolTerm; status: AcademicTermStatus }) =>
      adminGradesApi.setPeriodStatus({
        academicYear,
        term: input.term,
        status: input.status,
        reason: `Mise à jour depuis Paramètres école — ${TERM_LABELS[input.term]}`,
      }),
    onSuccess: async () => {
      toast.success('Période mise à jour')
      await queryClient.invalidateQueries({ queryKey: ['admin', 'grades', 'periods'] })
    },
    onError: (err) => toast.error('Échec', getApiErrorMessage(err)),
  })

  return (
    <div className="bg-white rounded-xl border border-zinc-200 p-5 shadow-sm space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-zinc-900 flex items-center gap-2">
            <CalendarRange size={16} className="text-emerald-600" />
            Année scolaire & trimestres
          </h2>
          <p className="text-xs text-zinc-500 mt-1">
            Définit l’année en cours et l’état des périodes (saisie notes / bulletins).
          </p>
        </div>
        <Link
          href="/admin/grades/periods"
          className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 hover:text-emerald-800"
        >
          Vue complète <ExternalLink size={12} />
        </Link>
      </div>

      <label className="block text-sm max-w-xs">
        <span className="mb-1 block text-xs text-zinc-500">Année scolaire</span>
        <input
          value={academicYear}
          onChange={(e) => setAcademicYear(e.target.value)}
          placeholder="2025-2026"
          className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
        />
      </label>

      <div className="flex items-center justify-between">
        <p className="text-xs text-zinc-400">
          {periodsQuery.isFetching ? 'Actualisation…' : `${TERMS.length} trimestres`}
        </p>
        <button
          type="button"
          onClick={() => void periodsQuery.refetch()}
          className="inline-flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-800"
        >
          <RefreshCw size={12} className={periodsQuery.isFetching ? 'animate-spin' : ''} />
          Actualiser
        </button>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        {TERMS.map((term) => {
          const row = periodMap.get(term)!
          const canLock = row.status !== 'LOCKED'
          const canReopen = row.status === 'LOCKED' || row.status === 'SUBMITTED'
          return (
            <div key={term} className="rounded-lg border border-zinc-100 bg-zinc-50/80 p-3 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-semibold text-zinc-800">{TERM_LABELS[term]}</p>
                <AcademicTermStatusBadge status={row.status} />
              </div>
              {row.reason && (
                <p className="text-[11px] text-zinc-500 line-clamp-2">{row.reason}</p>
              )}
              <div className="flex flex-wrap gap-1.5 pt-1">
                {canLock && (
                  <button
                    type="button"
                    disabled={mutation.isPending}
                    onClick={() => mutation.mutate({ term, status: 'LOCKED' })}
                    className="inline-flex items-center gap-1 rounded-md bg-zinc-900 px-2 py-1 text-[11px] font-semibold text-white disabled:opacity-50"
                  >
                    <Lock size={11} /> Verrouiller
                  </button>
                )}
                {canReopen && (
                  <button
                    type="button"
                    disabled={mutation.isPending}
                    onClick={() => mutation.mutate({ term, status: 'DRAFT' })}
                    className="inline-flex items-center gap-1 rounded-md border border-zinc-200 bg-white px-2 py-1 text-[11px] font-semibold text-zinc-700 disabled:opacity-50"
                  >
                    <Unlock size={11} /> Rouvrir
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
