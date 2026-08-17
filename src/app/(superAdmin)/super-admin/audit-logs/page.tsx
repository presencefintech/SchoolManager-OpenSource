'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import {
  Calendar,
  Filter,
  Loader2,
  RefreshCw,
  ScrollText,
  ShieldAlert,
  Search,
} from 'lucide-react'
import { auditLogsApi, type AuditLogRow } from '@/lib/superAdmin/api/audit-logs.api'
import { useSchools } from '@/lib/hooks/use-super-admin'
import { cn } from '@/lib/utils'
import { Skeleton } from '@/components/ui/skeleton'

const SEVERITY_BADGE: Record<string, string> = {
  INFO: 'bg-zinc-100 text-zinc-700 border-zinc-200',
  WARNING: 'bg-amber-50 text-amber-800 border-amber-100',
  CRITICAL: 'bg-red-50 text-red-800 border-red-100',
  SECURITY: 'bg-violet-50 text-violet-800 border-violet-100',
}

function fmtDateTime(iso: string) {
  try {
    return new Date(iso).toLocaleString('fr-FR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return iso
  }
}

function actorLabel(row: AuditLogRow) {
  const a = row.actor
  if (!a) return 'Système'
  const name = [a.firstName, a.lastName].filter(Boolean).join(' ').trim()
  return name || a.email || `User #${a.id}`
}

export default function AuditLogsPage() {
  const [tab, setTab] = useState<'all' | 'security'>('all')
  const [page, setPage] = useState(1)
  const [schoolId, setSchoolId] = useState<string>('')
  const [action, setAction] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [q, setQ] = useState('')
  const [rows, setRows] = useState<AuditLogRow[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)

  const { data: schools = [] } = useSchools()

  const take = 40
  const totalPages = Math.max(1, Math.ceil(total / take))

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await auditLogsApi.list({
        page,
        take,
        schoolId: schoolId ? Number(schoolId) : undefined,
        action: action.trim() || undefined,
        from: from || undefined,
        to: to || undefined,
        q: q.trim() || undefined,
        securityOnly: tab === 'security',
        tab,
      })
      setRows(data.rows)
      setTotal(data.total)
    } catch {
      setRows([])
      setTotal(0)
    } finally {
      setLoading(false)
    }
  }, [page, schoolId, action, from, to, q, tab])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    setPage(1)
  }, [tab, schoolId, action, from, to, q])

  const subtitle = useMemo(
    () =>
      tab === 'security'
        ? 'Tentatives d’accès refusées (SchoolGuard, modules bloqués)'
        : 'Traçabilité chronologique des actions Superadmin & métier',
    [tab],
  )

  return (
    <div className="min-h-screen bg-gradient-to-b from-zinc-50 via-white to-zinc-50/80">
      <div className="max-w-7xl mx-auto px-6 py-8 space-y-6">
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-400">
                Conformité
              </p>
              <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 mt-1 flex items-center gap-2">
                <ScrollText size={22} className="text-zinc-500" />
                Journal d’audit
              </h1>
              <p className="text-sm text-zinc-500 mt-1">{subtitle}</p>
            </div>
            <button
              type="button"
              onClick={() => void load()}
              className="inline-flex items-center gap-2 rounded-xl border border-zinc-200 bg-white px-3.5 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
            >
              <RefreshCw size={14} className={cn(loading && 'animate-spin')} />
              Actualiser
            </button>
          </div>
        </motion.div>

        <div className="flex gap-2">
          {(
            [
              ['all', 'Actions', ScrollText],
              ['security', 'Sécurité (403)', ShieldAlert],
            ] as const
          ).map(([key, label, Icon]) => (
            <button
              key={key}
              type="button"
              onClick={() => setTab(key)}
              className={cn(
                'inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-sm font-semibold border transition-colors',
                tab === key
                  ? 'bg-zinc-900 text-white border-zinc-900'
                  : 'bg-white text-zinc-600 border-zinc-200 hover:bg-zinc-50',
              )}
            >
              <Icon size={14} />
              {label}
            </button>
          ))}
        </div>

        <div className="rounded-2xl border border-zinc-200/80 bg-white p-4 shadow-sm">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-zinc-400 mb-3">
            <Filter size={12} /> Filtres
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            <label className="text-xs text-zinc-500">
              École
              <select
                value={schoolId}
                onChange={(e) => setSchoolId(e.target.value)}
                className="mt-1 w-full rounded-xl border border-zinc-200 bg-zinc-50/50 px-3 py-2 text-sm text-zinc-900"
              >
                <option value="">Toutes</option>
                {schools.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-xs text-zinc-500">
              Action
              <input
                value={action}
                onChange={(e) => setAction(e.target.value)}
                placeholder="IMPERSONATE, CASH…"
                className="mt-1 w-full rounded-xl border border-zinc-200 bg-zinc-50/50 px-3 py-2 text-sm"
              />
            </label>
            <label className="text-xs text-zinc-500">
              Du
              <input
                type="date"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
                className="mt-1 w-full rounded-xl border border-zinc-200 bg-zinc-50/50 px-3 py-2 text-sm"
              />
            </label>
            <label className="text-xs text-zinc-500">
              Au
              <input
                type="date"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                className="mt-1 w-full rounded-xl border border-zinc-200 bg-zinc-50/50 px-3 py-2 text-sm"
              />
            </label>
            <label className="text-xs text-zinc-500">
              Recherche
              <div className="relative mt-1">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="École, email, ressource…"
                  className="w-full rounded-xl border border-zinc-200 bg-zinc-50/50 pl-9 pr-3 py-2 text-sm"
                />
              </div>
            </label>
          </div>
        </div>

        <div className="rounded-2xl border border-zinc-200/80 bg-white shadow-sm overflow-hidden">
          {loading ? (
            <div className="p-6 space-y-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : rows.length === 0 ? (
            <div className="py-16 text-center text-sm text-zinc-500">
              Aucun événement pour ces filtres.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-zinc-50 text-[10px] uppercase tracking-wider text-zinc-400">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Date</th>
                    <th className="px-4 py-3 font-semibold">Action</th>
                    <th className="px-4 py-3 font-semibold">École</th>
                    <th className="px-4 py-3 font-semibold">Acteur</th>
                    <th className="px-4 py-3 font-semibold">Détail</th>
                    <th className="px-4 py-3 font-semibold">Sévérité</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {rows.map((row) => (
                    <tr key={row.id} className="hover:bg-zinc-50/80">
                      <td className="px-4 py-3 tabular-nums text-zinc-600 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1.5">
                          <Calendar size={12} className="text-zinc-300" />
                          {fmtDateTime(row.createdAt)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <code className="text-xs font-semibold text-zinc-800">{row.action}</code>
                      </td>
                      <td className="px-4 py-3 text-zinc-700">{row.school?.name ?? '—'}</td>
                      <td className="px-4 py-3 text-zinc-600">{actorLabel(row)}</td>
                      <td className="px-4 py-3 text-zinc-500 max-w-xs truncate" title={row.description ?? ''}>
                        {row.description || row.resource}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={cn(
                            'inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold',
                            SEVERITY_BADGE[row.severity] ?? SEVERITY_BADGE.INFO,
                          )}
                        >
                          {row.severity}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="flex items-center justify-between gap-3 border-t border-zinc-100 px-4 py-3 text-xs text-zinc-500">
            <span>
              {total} événement{total > 1 ? 's' : ''} · page {page}/{totalPages}
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={page <= 1 || loading}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="rounded-lg border border-zinc-200 px-3 py-1.5 disabled:opacity-40 hover:bg-zinc-50"
              >
                Précédent
              </button>
              <button
                type="button"
                disabled={page >= totalPages || loading}
                onClick={() => setPage((p) => p + 1)}
                className="rounded-lg border border-zinc-200 px-3 py-1.5 disabled:opacity-40 hover:bg-zinc-50 inline-flex items-center gap-1"
              >
                {loading && <Loader2 size={12} className="animate-spin" />}
                Suivant
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
