'use client'

import { useState } from 'react'
import Link from 'next/link'
import { AlertTriangle, BadgeCheck, ChevronLeft, ChevronRight, ClipboardList, Inbox, RefreshCw } from 'lucide-react'
import { cn } from '@/lib/utils'
import { getApiErrorMessage } from '@/lib/api/client'
import { AdminModuleHero } from '@/components/admin/shared/admin-module-hero'
import { useAssignmentUsage, useClasses, useSchoolAssignments } from '@/lib/hooks/use-admin'
import type { AssignmentStatus } from '@/lib/admin/billing.utils'

const PAGE_SIZE = 25

const STATUS_META: Record<AssignmentStatus, { label: string; className: string }> = {
  DRAFT: { label: 'Brouillon', className: 'bg-zinc-100 text-zinc-600' },
  PUBLISHED: { label: 'Publié', className: 'bg-emerald-50 text-emerald-700' },
  CLOSED: { label: 'Clôturé', className: 'bg-sky-50 text-sky-700' },
  ARCHIVED: { label: 'Archivé', className: 'bg-zinc-100 text-zinc-500' },
}

function formatDate(value: string | null): string {
  if (!value) return '—'
  const d = new Date(value)
  return Number.isNaN(d.getTime())
    ? '—'
    : d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })
}

export default function AssignmentsPage() {
  const [classId, setClassId] = useState<number | undefined>()
  const [status, setStatus] = useState<AssignmentStatus | undefined>()
  const [page, setPage] = useState(1)

  const { data: classes = [] } = useClasses({ isActive: true })
  const usage = useAssignmentUsage()
  const list = useSchoolAssignments({ classId, status, page, limit: PAGE_SIZE })

  const items = list.data?.items ?? []
  const totalPages = list.data?.totalPages ?? 1
  const u = usage.data

  const selectCls =
    'w-full px-3 py-2.5 rounded-xl border border-zinc-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400/40 focus:border-emerald-400'

  return (
    <div className="min-h-full bg-[#e8ecf4]">
      <AdminModuleHero
        eyebrow="Pédagogie"
        title="Devoirs"
        subtitle="Tous les devoirs créés par les enseignants de l'établissement"
        actions={
          <button
            type="button"
            onClick={() => void list.refetch()}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-sm font-medium rounded-lg bg-white/10 text-white ring-1 ring-white/15 hover:bg-white/15 transition-colors"
          >
            <RefreshCw size={14} className={cn(list.isFetching && 'animate-spin')} />
            Actualiser
          </button>
        }
        quickLinks={[{ href: '/admin/abonnement', label: 'Mon abonnement', icon: BadgeCheck }]}
        metrics={[
          { label: 'Devoirs (filtre)', value: list.data?.total ?? '—', loading: list.isLoading, icon: ClipboardList },
          {
            label: 'Créés ce mois',
            value: u ? (u.assignmentsLimit != null ? `${u.assignmentsCreated} / ${u.assignmentsLimit}` : u.assignmentsCreated) : '—',
            loading: usage.isLoading,
            icon: BadgeCheck,
          },
          { label: 'Rendus ce mois', value: u?.submissionsThisMonth ?? '—', loading: usage.isLoading, icon: Inbox },
        ]}
      />

      <div className="max-w-7xl mx-auto px-6 lg:px-8 py-6 space-y-4">
        {u?.upsellRequired ? (
          <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <p>
              Quota mensuel atteint : les enseignants ne peuvent plus créer de devoirs ce mois-ci.{' '}
              <Link href="/admin/abonnement" className="font-semibold underline underline-offset-2">
                Voir les offres
              </Link>
            </p>
          </div>
        ) : null}

        <div className="bg-white rounded-xl border border-zinc-200 p-4 grid gap-3 sm:grid-cols-2">
          <label>
            <span className="block text-xs font-medium text-zinc-600 mb-1.5">Classe</span>
            <select
              value={classId ?? ''}
              onChange={(e) => { setClassId(Number(e.target.value) || undefined); setPage(1) }}
              className={selectCls}
            >
              <option value="">Toutes les classes</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </label>
          <label>
            <span className="block text-xs font-medium text-zinc-600 mb-1.5">Statut</span>
            <select
              value={status ?? ''}
              onChange={(e) => { setStatus((e.target.value || undefined) as AssignmentStatus | undefined); setPage(1) }}
              className={selectCls}
            >
              <option value="">Tous les statuts</option>
              {(Object.keys(STATUS_META) as AssignmentStatus[]).map((s) => (
                <option key={s} value={s}>{STATUS_META[s].label}</option>
              ))}
            </select>
          </label>
        </div>

        {list.error ? (
          <div role="alert" className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <p>Impossible de charger les devoirs : {getApiErrorMessage(list.error)}</p>
          </div>
        ) : null}

        <div className="bg-white rounded-xl border border-zinc-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-zinc-50 text-left text-xs font-medium uppercase tracking-wide text-zinc-500">
                <tr>
                  <th className="px-4 py-3">Devoir</th>
                  <th className="px-4 py-3">Classe</th>
                  <th className="px-4 py-3">Enseignant</th>
                  <th className="px-4 py-3">Statut</th>
                  <th className="px-4 py-3">Échéance</th>
                  <th className="px-4 py-3 text-right">Rendus</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {list.isLoading
                  ? Array.from({ length: 5 }).map((_, i) => (
                      <tr key={i}>
                        <td colSpan={6} className="px-4 py-3">
                          <div className="h-5 rounded bg-zinc-100 animate-pulse" />
                        </td>
                      </tr>
                    ))
                  : items.map((a) => {
                      const meta = STATUS_META[a.status as AssignmentStatus]
                      return (
                        <tr key={a.id} className="hover:bg-zinc-50/60">
                          <td className="px-4 py-3">
                            <p className="font-medium text-zinc-900">{a.title}</p>
                            {a.subject ? <p className="text-xs text-zinc-500">{a.subject}</p> : null}
                          </td>
                          <td className="px-4 py-3 text-zinc-700">{a.className ?? '—'}</td>
                          <td className="px-4 py-3 text-zinc-700">{a.teacherName ?? '—'}</td>
                          <td className="px-4 py-3">
                            <span className={cn('rounded-full px-2 py-0.5 text-xs font-medium', meta?.className ?? 'bg-zinc-100 text-zinc-600')}>
                              {meta?.label ?? a.status}
                            </span>
                          </td>
                          <td className="px-4 py-3 tabular-nums text-zinc-700">{formatDate(a.dueAt)}</td>
                          <td className="px-4 py-3 text-right tabular-nums text-zinc-700">{a.submissionsCount ?? '—'}</td>
                        </tr>
                      )
                    })}
                {!list.isLoading && !items.length ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-10 text-center text-sm text-zinc-500">
                      Aucun devoir pour ces critères.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
          {totalPages > 1 ? (
            <div className="flex items-center justify-between border-t border-zinc-100 px-4 py-3 text-sm">
              <span className="text-zinc-500 tabular-nums">Page {page} / {totalPages}</span>
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={page <= 1 || list.isFetching}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="inline-flex items-center gap-1 rounded-lg border border-zinc-200 px-3 py-1.5 hover:bg-zinc-50 disabled:opacity-50"
                >
                  <ChevronLeft size={14} /> Précédent
                </button>
                <button
                  type="button"
                  disabled={page >= totalPages || list.isFetching}
                  onClick={() => setPage((p) => p + 1)}
                  className="inline-flex items-center gap-1 rounded-lg border border-zinc-200 px-3 py-1.5 hover:bg-zinc-50 disabled:opacity-50"
                >
                  Suivant <ChevronRight size={14} />
                </button>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}
