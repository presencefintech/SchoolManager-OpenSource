'use client'

import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  ChevronLeft,
  ChevronRight,
  Download,
  Fingerprint,
  Printer,
  RefreshCw,
  ScrollText,
  ShieldCheck,
  ShieldAlert,
  ShieldQuestion,
} from 'lucide-react'
import { AdminModuleHero } from '@/components/admin/shared/admin-module-hero'
import {
  currentAcademicYear,
  formatDateTime,
} from '@/components/admin/grades/grades-utils'
import {
  adminAcademicAuditApi,
  EVENT_TYPE_LABELS,
  FILTER_EVENT_TYPES,
  type AcademicAuditEventType,
  type AcademicAuditIntegrityStatus,
  type AcademicAuditLogItem,
} from '@/lib/admin/api/audit.api'
import { adminGradesApi } from '@/lib/admin/api/grades.api'
import { triggerBlobDownload } from '@/lib/download-blob'
import { cn } from '@/lib/utils'

const PAGE_SIZE = 25
const selectCls =
  'w-full px-3 py-2.5 rounded-xl border border-zinc-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400/40 focus:border-emerald-400'

function IntegrityBadge({ status }: { status: AcademicAuditIntegrityStatus }) {
  if (status === 'VALID') {
    return (
      <span
        className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 ring-1 ring-emerald-200"
        title="Signature du document valide"
      >
        <ShieldCheck size={12} />
        Signature valide
      </span>
    )
  }
  if (status === 'INVALID') {
    return (
      <span
        className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2 py-0.5 text-[11px] font-semibold text-rose-700 ring-1 ring-rose-200"
        title="Empreinte altérée — suspicion de falsification"
      >
        <ShieldAlert size={12} />
        Signature altérée
      </span>
    )
  }
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full bg-zinc-100 px-2 py-0.5 text-[11px] font-semibold text-zinc-600 ring-1 ring-zinc-200"
      title="Entrée historique sans empreinte"
    >
      <ShieldQuestion size={12} />
      Non signé
    </span>
  )
}

function actionLabel(action: string) {
  return EVENT_TYPE_LABELS[action] ?? action
}

function academicYearOptions(): string[] {
  const current = currentAcademicYear()
  const start = Number(current.slice(0, 4))
  return [
    `${start}-${start + 1}`,
    `${start - 1}-${start}`,
    `${start - 2}-${start - 1}`,
  ]
}

export default function AdminAcademicAuditPage() {
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [academicYear, setAcademicYear] = useState('')
  const [classId, setClassId] = useState<number | ''>('')
  const [actorId, setActorId] = useState('')
  const [eventType, setEventType] = useState<AcademicAuditEventType | ''>('')
  const [page, setPage] = useState(1)
  const [exporting, setExporting] = useState(false)

  const contextQuery = useQuery({
    queryKey: ['admin', 'grades', 'context'],
    queryFn: () => adminGradesApi.context(),
  })

  const filters = useMemo(
    () => ({
      from: from || undefined,
      to: to || undefined,
      academicYear: academicYear || undefined,
      classId: typeof classId === 'number' ? classId : undefined,
      actorId: actorId.trim() ? Number(actorId) : undefined,
      eventType: eventType || undefined,
      page,
      limit: PAGE_SIZE,
    }),
    [from, to, academicYear, classId, actorId, eventType, page],
  )

  const logsQuery = useQuery({
    queryKey: ['admin', 'academic-audit', filters],
    queryFn: () =>
      adminAcademicAuditApi.list({
        ...filters,
        actorId:
          filters.actorId && Number.isFinite(filters.actorId) ? filters.actorId : undefined,
      }),
  })

  const items = logsQuery.data?.items ?? []
  const totalPages = Math.max(1, logsQuery.data?.pageCount ?? 1)
  const validCount = items.filter((i) => i.integrityStatus === 'VALID').length
  const invalidCount = items.filter((i) => i.integrityStatus === 'INVALID').length

  async function onExportCsv() {
    setExporting(true)
    try {
      const blob = await adminAcademicAuditApi.exportCsv({
        from: filters.from,
        to: filters.to,
        academicYear: filters.academicYear,
        classId: filters.classId,
        actorId:
          filters.actorId && Number.isFinite(filters.actorId) ? filters.actorId : undefined,
        eventType: filters.eventType,
        limit: 200,
      })
      triggerBlobDownload(blob, `audit-academique-${academicYear || 'export'}.csv`)
    } finally {
      setExporting(false)
    }
  }

  function onPrintPdf() {
    window.print()
  }

  return (
    <>
      <AdminModuleHero
        eyebrow="Conformité EPST · Audit"
        title="Journal d’audit académique"
        subtitle="Traçabilité des notes, délibérations, fiches pédagogiques et bulletins — documents scellés."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => void onExportCsv()}
              disabled={exporting}
              className="inline-flex items-center gap-2 px-3.5 py-2 text-sm font-medium rounded-lg bg-white/10 text-white ring-1 ring-white/15 hover:bg-white/15 disabled:opacity-50"
            >
              <Download size={14} />
              {exporting ? 'Export…' : 'CSV'}
            </button>
            <button
              type="button"
              onClick={onPrintPdf}
              className="inline-flex items-center gap-2 px-3.5 py-2 text-sm font-medium rounded-lg bg-white/10 text-white ring-1 ring-white/15 hover:bg-white/15 print:hidden"
            >
              <Printer size={14} />
              PDF / Imprimer
            </button>
            <button
              type="button"
              onClick={() => void logsQuery.refetch()}
              className="inline-flex items-center gap-2 px-3.5 py-2 text-sm font-medium rounded-lg bg-white/10 text-white ring-1 ring-white/15 hover:bg-white/15"
            >
              <RefreshCw size={14} className={cn(logsQuery.isFetching && 'animate-spin')} />
              Actualiser
            </button>
          </div>
        }
        metrics={[
          {
            label: 'Entrées (filtre)',
            value: logsQuery.data?.total ?? '—',
            loading: logsQuery.isLoading,
            icon: ScrollText,
          },
          {
            label: 'Signatures valides (page)',
            value: validCount,
            loading: logsQuery.isLoading,
            icon: Fingerprint,
          },
          {
            label: 'Alertes intégrité',
            value: invalidCount,
            loading: logsQuery.isLoading,
            icon: ShieldAlert,
            valueClassName: invalidCount > 0 ? 'text-rose-300' : undefined,
          },
        ]}
      />

      <div className="max-w-7xl mx-auto px-6 lg:px-8 py-6 space-y-4 print:max-w-none print:px-2">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm print:hidden">
          <label className="block">
            <span className="text-xs font-medium text-zinc-600">Du</span>
            <input
              type="date"
              className={cn(selectCls, 'mt-1')}
              value={from}
              onChange={(e) => {
                setPage(1)
                setFrom(e.target.value)
              }}
            />
          </label>
          <label className="block">
            <span className="text-xs font-medium text-zinc-600">Au</span>
            <input
              type="date"
              className={cn(selectCls, 'mt-1')}
              value={to}
              onChange={(e) => {
                setPage(1)
                setTo(e.target.value)
              }}
            />
          </label>
          <label className="block">
            <span className="text-xs font-medium text-zinc-600">Année scolaire</span>
            <select
              className={cn(selectCls, 'mt-1')}
              value={academicYear}
              onChange={(e) => {
                setPage(1)
                setAcademicYear(e.target.value)
              }}
            >
              <option value="">Toutes</option>
              {academicYearOptions().map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="text-xs font-medium text-zinc-600">Classe</span>
            <select
              className={cn(selectCls, 'mt-1')}
              value={classId}
              onChange={(e) => {
                setPage(1)
                setClassId(e.target.value ? Number(e.target.value) : '')
              }}
            >
              <option value="">Toutes</option>
              {(contextQuery.data?.classes ?? []).map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="text-xs font-medium text-zinc-600">Auteur (userId)</span>
            <input
              className={cn(selectCls, 'mt-1')}
              value={actorId}
              onChange={(e) => {
                setPage(1)
                setActorId(e.target.value)
              }}
              placeholder="ex. 12"
            />
          </label>
          <label className="block">
            <span className="text-xs font-medium text-zinc-600">Type d’événement</span>
            <select
              className={cn(selectCls, 'mt-1')}
              value={eventType}
              onChange={(e) => {
                setPage(1)
                setEventType(e.target.value as AcademicAuditEventType | '')
              }}
            >
              <option value="">Tous</option>
              {FILTER_EVENT_TYPES.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="rounded-2xl border border-zinc-200 bg-white shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-zinc-50 text-left text-xs uppercase tracking-wide text-zinc-500">
                <tr>
                  <th className="px-4 py-3 font-semibold">Date & heure</th>
                  <th className="px-4 py-3 font-semibold">Utilisateur & rôle</th>
                  <th className="px-4 py-3 font-semibold">Catégorie</th>
                  <th className="px-4 py-3 font-semibold">Cible</th>
                  <th className="px-4 py-3 font-semibold">Avant → Après</th>
                  <th className="px-4 py-3 font-semibold">Sceau</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {logsQuery.isLoading ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-10 text-center text-zinc-400">
                      Chargement du journal académique…
                    </td>
                  </tr>
                ) : logsQuery.isError ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-10 text-center text-rose-600">
                      Accès refusé ou erreur serveur. Réservé ADMIN / DIRECTOR / SUPER_ADMIN
                      (permission audit:read).
                    </td>
                  </tr>
                ) : items.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-10 text-center text-zinc-400">
                      Aucune entrée pour ces filtres.
                    </td>
                  </tr>
                ) : (
                  items.map((log) => <AuditRow key={log.id} log={log} />)
                )}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between gap-3 border-t border-zinc-100 px-4 py-3 print:hidden">
            <p className="text-xs text-zinc-500">
              Page {page} / {totalPages} · {logsQuery.data?.total ?? 0} entrée(s)
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="inline-flex items-center gap-1 rounded-lg border border-zinc-200 px-2.5 py-1.5 text-xs font-medium disabled:opacity-40"
              >
                <ChevronLeft size={14} /> Préc.
              </button>
              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="inline-flex items-center gap-1 rounded-lg border border-zinc-200 px-2.5 py-1.5 text-xs font-medium disabled:opacity-40"
              >
                Suiv. <ChevronRight size={14} />
              </button>
            </div>
          </div>
        </div>

        <p className="text-xs text-zinc-400 print:hidden">
          Accès restreint : ADMIN, DIRECTOR (Préfet) et SUPER_ADMIN · permission{' '}
          <code className="rounded bg-zinc-100 px-1">audit:read</code>. Les anciennes entrées
          sans empreinte apparaissent comme « Non signé ».
        </p>
      </div>
    </>
  )
}

function AuditRow({ log }: { log: AcademicAuditLogItem }) {
  return (
    <tr className="hover:bg-zinc-50/70 align-top">
      <td className="px-4 py-3 whitespace-nowrap text-zinc-600">
        {formatDateTime(log.createdAt)}
      </td>
      <td className="px-4 py-3">
        <p className="font-medium text-zinc-900">{log.actor.fullName}</p>
        <p className="text-xs text-zinc-500">
          {log.actor.role ?? '—'}
          {log.actor.id != null ? ` · #${log.actor.id}` : ''}
        </p>
      </td>
      <td className="px-4 py-3">
        <span className="inline-flex rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-700">
          {actionLabel(log.action)}
        </span>
        <p className="mt-1 text-xs text-zinc-400">{log.entity}</p>
      </td>
      <td className="px-4 py-3 text-zinc-800 max-w-[220px]">
        <p className="font-medium leading-snug">{log.target.label}</p>
      </td>
      <td className="px-4 py-3 text-zinc-700 max-w-[240px]">
        <p className="leading-snug break-words">{log.changeSummary}</p>
      </td>
      <td className="px-4 py-3">
        <IntegrityBadge status={log.integrityStatus} />
        {log.integrityHash ? (
          <p className="mt-1 font-mono text-[10px] text-zinc-400 break-all max-w-[180px]">
            {log.integrityHash}
          </p>
        ) : null}
      </td>
    </tr>
  )
}
