'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import {
  AlertTriangle,
  BookOpen,
  ClipboardList,
  Lock,
  Percent,
  RefreshCw,
} from 'lucide-react'
import { AdminModuleHero } from '@/components/admin/shared/admin-module-hero'
import { AcademicTermStatusBadge } from '@/components/admin/grades/academic-term-status-badge'
import { currentAcademicYear } from '@/components/admin/grades/grades-utils'
import { adminGradesApi } from '@/lib/admin/api/grades.api'
import { cn } from '@/lib/utils'
import { TERM_LABELS, type AcademicTermStatus, type SchoolTerm } from '@/types/teacher-grades'

const TERMS = Object.keys(TERM_LABELS) as SchoolTerm[]

export default function AdminGradesOverviewPage() {
  const [academicYear, setAcademicYear] = useState(currentAcademicYear())

  const contextQuery = useQuery({
    queryKey: ['admin', 'grades', 'context'],
    queryFn: () => adminGradesApi.context(),
  })

  const evaluationsQuery = useQuery({
    queryKey: ['admin', 'grades', 'evaluations', academicYear],
    queryFn: () =>
      adminGradesApi.listEvaluations({ academicYear, limit: 100, page: 1 }),
  })

  const periodsQuery = useQuery({
    queryKey: ['admin', 'grades', 'periods', academicYear],
    queryFn: () => adminGradesApi.listPeriods(academicYear),
  })

  const auditQuery = useQuery({
    queryKey: ['admin', 'grades', 'audit-recent', academicYear],
    queryFn: () => {
      const from = new Date()
      from.setDate(from.getDate() - 14)
      return adminGradesApi.listAuditLogs({
        from: from.toISOString(),
        limit: 50,
        page: 1,
      })
    },
  })

  const periodByTerm = useMemo(() => {
    const map = new Map<SchoolTerm, AcademicTermStatus>()
    for (const term of TERMS) map.set(term, 'DRAFT')
    for (const row of periodsQuery.data ?? []) {
      if (row.academicYear === academicYear) {
        map.set(row.term, row.status)
      }
    }
    return map
  }, [periodsQuery.data, academicYear])

  const gradesEntered = useMemo(() => {
    return (evaluationsQuery.data?.items ?? []).reduce(
      (sum, item) => sum + (item._count?.grades ?? 0),
      0,
    )
  }, [evaluationsQuery.data])

  const submittedOrLocked = TERMS.filter((t) => {
    const s = periodByTerm.get(t)
    return s === 'SUBMITTED' || s === 'LOCKED'
  }).length
  const submissionRate = Math.round((submittedOrLocked / TERMS.length) * 100)

  const byClass = useMemo(() => {
    const map = new Map<
      number,
      { classId: number; className: string; evaluations: number; grades: number }
    >()
    for (const item of evaluationsQuery.data?.items ?? []) {
      const className = item.class?.name ?? `Classe #${item.classId}`
      const prev = map.get(item.classId) ?? {
        classId: item.classId,
        className,
        evaluations: 0,
        grades: 0,
      }
      prev.evaluations += 1
      prev.grades += item._count?.grades ?? 0
      map.set(item.classId, prev)
    }
    return [...map.values()].sort((a, b) => a.className.localeCompare(b.className))
  }, [evaluationsQuery.data])

  const loading =
    contextQuery.isLoading || evaluationsQuery.isLoading || periodsQuery.isLoading

  return (
    <>
      <AdminModuleHero
        eyebrow="Pédagogie · Notes"
        title="Supervision des notes"
        subtitle="État des trimestres, saisie enseignants et alertes de modification"
        actions={
          <div className="flex items-center gap-2 flex-wrap">
            <input
              value={academicYear}
              onChange={(e) => setAcademicYear(e.target.value)}
              className="rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-sm text-white placeholder:text-white/50 focus:outline-none focus:ring-2 focus:ring-emerald-400/40"
              placeholder="2025-2026"
            />
            <button
              type="button"
              onClick={() => {
                void contextQuery.refetch()
                void evaluationsQuery.refetch()
                void periodsQuery.refetch()
                void auditQuery.refetch()
              }}
              className="inline-flex items-center gap-2 px-3.5 py-2 text-sm font-medium rounded-lg bg-white/10 text-white ring-1 ring-white/15 hover:bg-white/15"
            >
              <RefreshCw
                size={14}
                className={cn(
                  (evaluationsQuery.isFetching || periodsQuery.isFetching) && 'animate-spin',
                )}
              />
              Actualiser
            </button>
          </div>
        }
        quickLinks={[
          { href: '/admin/grades/gradebook', label: 'Cahier de notes', icon: BookOpen },
          { href: '/admin/grades/periods', label: 'Verrouillage', icon: Lock },
          { href: '/admin/grades/audit-logs', label: 'Audit', icon: ClipboardList },
        ]}
        metrics={[
          {
            label: 'Évaluations',
            value: evaluationsQuery.data?.total ?? '—',
            loading,
            icon: ClipboardList,
          },
          {
            label: 'Notes saisies',
            value: gradesEntered,
            loading,
            icon: BookOpen,
          },
          {
            label: 'Taux soumission',
            value: `${submissionRate}%`,
            loading: periodsQuery.isLoading,
            icon: Percent,
          },
          {
            label: 'Modifs (14 j)',
            value: auditQuery.data?.total ?? '—',
            loading: auditQuery.isLoading,
            icon: AlertTriangle,
            valueClassName:
              (auditQuery.data?.total ?? 0) > 0 ? 'text-amber-300' : 'text-white',
          },
        ]}
      />

      <div className="max-w-7xl mx-auto px-6 lg:px-8 py-6 space-y-6">
        <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between gap-3 mb-4">
            <h2 className="text-sm font-semibold text-zinc-900">
              État des trimestres — {academicYear}
            </h2>
            <Link
              href="/admin/grades/periods"
              className="text-xs font-medium text-emerald-700 hover:underline"
            >
              Gérer les périodes
            </Link>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            {TERMS.map((term) => {
              const status = periodByTerm.get(term) ?? 'DRAFT'
              return (
                <div
                  key={term}
                  className="rounded-xl border border-zinc-100 bg-zinc-50/80 px-4 py-3 flex items-center justify-between gap-3"
                >
                  <div>
                    <p className="text-sm font-medium text-zinc-900">{TERM_LABELS[term]}</p>
                    <p className="text-xs text-zinc-500 mt-0.5">
                      {status === 'DRAFT'
                        ? 'Saisie ouverte'
                        : status === 'SUBMITTED'
                          ? 'En attente de verrouillage'
                          : 'Bulletin verrouillé'}
                    </p>
                  </div>
                  <AcademicTermStatusBadge status={status} />
                </div>
              )
            })}
          </div>
        </section>

        <section className="rounded-2xl border border-zinc-200 bg-white shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-zinc-100 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-zinc-900">
              Activité par classe ({academicYear})
            </h2>
            <p className="text-xs text-zinc-500">
              {contextQuery.data?.classes.length ?? 0} classes actives
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-zinc-50 text-left text-xs uppercase tracking-wide text-zinc-500">
                <tr>
                  <th className="px-5 py-3 font-semibold">Classe</th>
                  <th className="px-5 py-3 font-semibold">Évaluations</th>
                  <th className="px-5 py-3 font-semibold">Notes saisies</th>
                  <th className="px-5 py-3 font-semibold" />
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {loading ? (
                  <tr>
                    <td colSpan={4} className="px-5 py-8 text-center text-zinc-400">
                      Chargement…
                    </td>
                  </tr>
                ) : byClass.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-5 py-8 text-center text-zinc-400">
                      Aucune évaluation pour cette année scolaire.
                    </td>
                  </tr>
                ) : (
                  byClass.map((row) => (
                    <tr key={row.classId} className="hover:bg-zinc-50/80">
                      <td className="px-5 py-3 font-medium text-zinc-900">{row.className}</td>
                      <td className="px-5 py-3 tabular-nums text-zinc-700">{row.evaluations}</td>
                      <td className="px-5 py-3 tabular-nums text-zinc-700">{row.grades}</td>
                      <td className="px-5 py-3 text-right">
                        <Link
                          href={`/admin/grades/gradebook?classId=${row.classId}&academicYear=${encodeURIComponent(academicYear)}`}
                          className="text-xs font-medium text-emerald-700 hover:underline"
                        >
                          Ouvrir le cahier
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>

        {(auditQuery.data?.items.length ?? 0) > 0 && (
          <section className="rounded-2xl border border-amber-200 bg-amber-50/60 p-5">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-4 w-4 text-amber-700 mt-0.5 shrink-0" />
              <div className="min-w-0 flex-1">
                <h2 className="text-sm font-semibold text-amber-950">
                  Modifications récentes ({auditQuery.data?.total ?? 0})
                </h2>
                <ul className="mt-2 space-y-1.5 text-sm text-amber-900/90">
                  {(auditQuery.data?.items ?? []).slice(0, 5).map((log) => (
                    <li key={log.id} className="truncate">
                      <span className="font-medium">{log.student.fullName}</span>
                      {' — '}
                      {log.evaluation.subjectName} / {log.evaluation.title}
                      {' : '}
                      {log.previousScore ?? (log.previousIsAbsent ? 'Abs' : '—')}
                      {' → '}
                      {log.newScore ?? (log.newIsAbsent ? 'Abs' : '—')}
                      <span className="text-amber-700/70">
                        {' '}
                        ({log.changedBy.fullName})
                      </span>
                    </li>
                  ))}
                </ul>
                <Link
                  href="/admin/grades/audit-logs"
                  className="mt-3 inline-block text-xs font-semibold text-amber-800 underline underline-offset-2"
                >
                  Voir le journal complet
                </Link>
              </div>
            </div>
          </section>
        )}
      </div>
    </>
  )
}
