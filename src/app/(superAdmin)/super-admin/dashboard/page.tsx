'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import {
  Building2, GraduationCap, Users,
  ArrowRight, Activity, ChevronRight, ChevronLeft, UserCheck, ScrollText,
  ShieldAlert, Calendar,
} from 'lucide-react'
import {
  PieChart, Pie, Cell, Tooltip as RechartsTooltip, ResponsiveContainer,
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
} from 'recharts'
import {
  usePlatformStats, useSchools, useActiveSessions,
  useProviderStats, useFinanceReport, useWorkerHealth,
} from '@/lib/hooks/use-super-admin'
import { cn } from '@/lib/utils'

/* ── helpers ──────────────────────────────────────────────────────────────── */
const fmt = (n: number) =>
  new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'XOF', maximumFractionDigits: 0 }).format(n)

function Sk({ className }: { className?: string }) {
  return <div className={cn('rounded-xl bg-zinc-100 animate-pulse', className)} />
}

function Dot({ level }: { level: 'EXCELLENT' | 'STABLE' | 'CRITICAL' }) {
  return (
    <span className={cn('inline-block w-2.5 h-2.5 rounded-full flex-shrink-0', {
      'bg-emerald-500': level === 'EXCELLENT',
      'bg-sky-400':    level === 'STABLE',
      'bg-red-500':    level === 'CRITICAL',
    })} />
  )
}

function HealthBadge({ level }: { level: 'EXCELLENT' | 'STABLE' | 'CRITICAL' }) {
  const cfg = {
    EXCELLENT: { label: 'Excellente', cls: 'bg-emerald-50 text-emerald-700 ring-emerald-100' },
    STABLE:    { label: 'Stable',     cls: 'bg-sky-50 text-sky-700 ring-sky-100' },
    CRITICAL:  { label: 'Critique',   cls: 'bg-red-50 text-red-700 ring-red-100' },
  }[level]
  return (
    <span className={cn('inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ring-1', cfg.cls)}>
      <Dot level={level} />
      {cfg.label}
    </span>
  )
}

const HEALTH_LABEL = { EXCELLENT: 'Excellente', STABLE: 'Stable', CRITICAL: 'Critique' } as const

function roleBadge(role: string) {
  const map: Record<string, string> = {
    SUPER_ADMIN: 'bg-indigo-50 text-indigo-700',
    ADMIN: 'bg-emerald-50 text-emerald-700',
    TEACHER: 'bg-amber-50 text-amber-700',
    PARENT: 'bg-zinc-100 text-zinc-500',
  }
  return map[role] ?? 'bg-zinc-100 text-zinc-500'
}

function statusBadge(status: string) {
  const map: Record<string, string> = {
    ACTIVE: 'bg-emerald-50 text-emerald-700',
    INACTIVE: 'bg-zinc-100 text-zinc-400',
    SUSPENDED: 'bg-red-50 text-red-600',
  }
  return map[status] ?? 'bg-zinc-100 text-zinc-500'
}

const METHOD_COLORS: Record<string, string> = {
  CASH: '#71717a',
  ORANGE_MONEY: '#f97316',
  MPESA: '#22c55e',
  AIRTEL_MONEY: '#ef4444',
  BANK: '#6366f1',
  CARD: '#3b82f6',
}
const METHOD_LABELS: Record<string, string> = {
  CASH: 'Espèces',
  ORANGE_MONEY: 'Orange Money',
  MPESA: 'M-Pesa',
  AIRTEL_MONEY: 'Airtel Money',
  BANK: 'Virement',
  CARD: 'Carte',
}

const STUDENT_STATUS_CFG: Record<string, { label: string; color: string; bg: string; text: string }> = {
  ACTIVE:             { label: 'Actifs',               color: '#22c55e', bg: 'bg-emerald-50', text: 'text-emerald-700' },
  INACTIVE:           { label: 'Inactifs',             color: '#71717a', bg: 'bg-zinc-100',   text: 'text-zinc-500'   },
  SUSPENDED:          { label: 'Suspendus',            color: '#ef4444', bg: 'bg-red-50',     text: 'text-red-700'    },
  PENDING_ENROLLMENT: { label: 'Inscription en cours', color: '#f97316', bg: 'bg-orange-50',  text: 'text-orange-700' },
}

/* ═══════════════════════════════════════════════════════════════════════════ */

const fmtShort = (n: number) =>
  new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'XOF', maximumFractionDigits: 0, notation: 'compact' }).format(n)

function AreaTooltip({ active, payload, label }: { active?: boolean; label?: string; payload?: Array<{ value: number }> }) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white border border-zinc-200 rounded-xl px-4 py-3 shadow-lg text-xs min-w-[140px]">
      <p className="font-semibold text-zinc-500 mb-1">{label}</p>
      <p className="font-bold text-zinc-900 tabular-nums">{fmt(payload[0].value)}</p>
    </div>
  )
}

function DonutTooltip({ active, payload }: {
  active?: boolean
  payload?: Array<{ value: number; payload: { label: string; pct: string } }>
}) {
  if (!active || !payload?.length) return null
  const d = payload[0]
  return (
    <div className="bg-white border border-zinc-200 rounded-lg px-3 py-2 shadow-md text-xs">
      <p className="font-medium text-zinc-700">{d.payload.label}</p>
      <p className="text-zinc-400 tabular-nums mt-0.5">
        {d.value.toLocaleString('fr-FR')} txns · {d.payload.pct}%
      </p>
    </div>
  )
}

const PER_PAGE = 15

function Pager({ page, total, onPrev, onNext }: { page: number; total: number; onPrev: () => void; onNext: () => void }) {
  const totalPages = Math.ceil(total / PER_PAGE)
  if (totalPages <= 1) return null
  return (
    <div className="px-5 py-2.5 border-t border-zinc-100 flex items-center justify-between">
      <span className="text-xs text-zinc-400 tabular-nums">{page} / {totalPages}</span>
      <div className="flex gap-1">
        <button onClick={onPrev} disabled={page === 1} className="p-1.5 rounded-lg border border-zinc-200 text-zinc-500 hover:bg-zinc-50 disabled:opacity-30 transition-all">
          <ChevronLeft size={12} />
        </button>
        <button onClick={onNext} disabled={page >= totalPages} className="p-1.5 rounded-lg border border-zinc-200 text-zinc-500 hover:bg-zinc-50 disabled:opacity-30 transition-all">
          <ChevronRight size={12} />
        </button>
      </div>
    </div>
  )
}

export default function SuperAdminDashboardPage() {
  const { data: stats, isLoading, isError, refetch } = usePlatformStats()
  const { data: schools, isLoading: loadingSchools } = useSchools()
  const { data: sessions, isLoading: loadingSessions } = useActiveSessions()

  const { data: providers, isLoading: loadingProviders } = useProviderStats()

  // Area Chart — encaissements par école
  const today = new Date().toISOString().slice(0, 10)
  const thirtyDaysAgo = new Date(Date.now() - 30 * 86400_000).toISOString().slice(0, 10)
  const [revenueSchoolId, setRevenueSchoolId] = useState<number | null>(null)
  const [revenueFrom, setRevenueFrom] = useState(thirtyDaysAgo)
  const [revenueTo, setRevenueTo]     = useState(today)

  const revenueParams = revenueSchoolId
    ? { schoolId: revenueSchoolId, startDate: revenueFrom + 'T00:00:00.000Z', endDate: revenueTo + 'T23:59:59.999Z' }
    : null
  const { data: financeReport, isLoading: loadingRevenue } = useFinanceReport(revenueParams)

  const dailyData = useMemo(() => {
    if (!financeReport?.details?.length) return []
    const map = new Map<string, number>()
    for (const p of financeReport.details) {
      const day = p.confirmedAt?.slice(0, 10)
      if (day) map.set(day, (map.get(day) ?? 0) + p.amount)
    }
    const result: { label: string; amount: number }[] = []
    const start = new Date(revenueFrom)
    const end   = new Date(revenueTo)
    for (const d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const k = d.toISOString().slice(0, 10)
      result.push({ label: d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }), amount: map.get(k) ?? 0 })
    }
    return result
  }, [financeReport, revenueFrom, revenueTo])

  // Pipeline — file d'inscription par école
  const [pipelineSchoolId, setPipelineSchoolId] = useState<number | null>(null)
  const { data: workerHealth, isLoading: loadingPipeline } = useWorkerHealth(pipelineSchoolId ?? 0)

  const providerTotal = (providers ?? []).reduce((s, p) => s + p.volume, 0)
  const chartData = (providers ?? []).map(p => ({
    name: p.method,
    label: METHOD_LABELS[p.method] ?? p.method,
    value: p.volume,
    color: METHOD_COLORS[p.method] ?? '#a1a1aa',
    pct: providerTotal > 0 ? ((p.volume / providerTotal) * 100).toFixed(1) : '0.0',
  }))

  const healthCount = schools?.reduce(
    (acc, s) => { acc[s.health.level] = (acc[s.health.level] ?? 0) + 1; return acc },
    {} as Record<string, number>,
  )

  return (
    <div className="min-h-screen bg-zinc-50">

      {/* ── PAGE HEADER ──────────────────────────────────────────────────────── */}
      <div className="bg-white border-b border-zinc-200">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4 px-8 py-6">
          <div>
            <h1 className="text-3xl font-semibold text-zinc-900 tracking-tight">Dashboard</h1>
            <p className="text-sm text-zinc-400 mt-1 capitalize">
              {new Date().toLocaleDateString('fr-FR', {
                weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
              })}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/super-admin/audit"
              className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-xl border border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50 transition-colors"
            >
              <ShieldAlert size={14} />
              Audit & Monitoring
            </Link>
            <Link
              href="/super-admin/schools"
              className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-xl bg-zinc-900 text-white hover:bg-zinc-700 transition-colors"
            >
              Établissements
              <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-8 py-8 space-y-6">

        {isError && (
          <div className="flex items-center justify-between rounded-xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700">
            <span>Impossible de charger les statistiques.</span>
            <button onClick={() => refetch()} className="font-medium underline underline-offset-2">Réessayer</button>
          </div>
        )}

        {/* ══ 1. GRAPHIQUES HERO ═════════════════════════════════════════════ */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

          {/* Area Chart — Encaissements par école (col-span-2) */}
          <div className="lg:col-span-2 bg-white rounded-2xl border border-zinc-200 shadow-[0_2px_12px_rgba(0,0,0,0.08)] p-7">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="text-base font-semibold text-zinc-900">Encaissements confirmés</h2>
                <p className="text-xs text-zinc-400 mt-0.5">Paiements CONFIRMED agrégés par jour</p>
              </div>
              {financeReport && (
                <div className="text-right">
                  <p className="text-xl font-bold text-zinc-900 tabular-nums">{fmt(financeReport.summary.TOTAL)}</p>
                  <p className="text-xs text-zinc-400 tabular-nums mt-0.5">{financeReport.totalTransactions} transactions</p>
                </div>
              )}
            </div>

            {/* Sélecteurs */}
            <div className="flex flex-wrap gap-2 mb-5">
              <select
                value={revenueSchoolId ?? ''}
                onChange={(e) => setRevenueSchoolId(e.target.value ? Number(e.target.value) : null)}
                className="text-xs border border-zinc-200 rounded-lg px-3 py-1.5 text-zinc-600 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-200"
              >
                <option value="">Choisir un établissement…</option>
                {schools?.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
              <div className="flex items-center gap-1.5 border border-zinc-200 rounded-lg px-3 py-1.5">
                <Calendar size={11} className="text-zinc-400" />
                <input type="date" value={revenueFrom} max={revenueTo}
                  onChange={(e) => setRevenueFrom(e.target.value)}
                  className="text-xs text-zinc-600 bg-transparent focus:outline-none" />
              </div>
              <div className="flex items-center gap-1.5 border border-zinc-200 rounded-lg px-3 py-1.5">
                <Calendar size={11} className="text-zinc-400" />
                <input type="date" value={revenueTo} min={revenueFrom} max={today}
                  onChange={(e) => setRevenueTo(e.target.value)}
                  className="text-xs text-zinc-600 bg-transparent focus:outline-none" />
              </div>
            </div>

            {!revenueSchoolId ? (
              <div className="h-48 flex flex-col items-center justify-center gap-2 text-sm text-zinc-400">
                <Building2 size={28} className="text-zinc-200" />
                Sélectionnez un établissement pour afficher la courbe
              </div>
            ) : loadingRevenue ? (
              <Sk className="h-48 rounded-xl" />
            ) : dailyData.length ? (
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={dailyData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gradRevenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#6366f1" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f4f4f5" vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#a1a1aa' }} tickLine={false} axisLine={false} interval={Math.floor(dailyData.length / 6)} />
                  <YAxis tick={{ fontSize: 10, fill: '#a1a1aa' }} tickLine={false} axisLine={false} tickFormatter={(v) => fmtShort(v)} />
                  <RechartsTooltip content={<AreaTooltip />} />
                  <Area type="monotone" dataKey="amount" stroke="#6366f1" strokeWidth={2} fill="url(#gradRevenue)" dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-48 flex items-center justify-center text-sm text-zinc-400">Aucun paiement confirmé sur cette période</div>
            )}
          </div>

          {/* Donut — Méthodes de paiement (col-span-1) */}
          <div className="bg-white rounded-2xl border border-zinc-200 shadow-[0_2px_12px_rgba(0,0,0,0.08)] p-7 flex flex-col">
            <h2 className="text-base font-semibold text-zinc-900 mb-1">Méthodes de paiement</h2>
            <p className="text-xs text-zinc-400 mb-5">Répartition par volume</p>
            {loadingProviders ? (
              <div className="flex-1 flex flex-col items-center gap-4">
                <Sk className="w-40 h-40 rounded-full" />
                <div className="w-full space-y-3">{[...Array(3)].map((_, i) => <Sk key={i} className="h-4" />)}</div>
              </div>
            ) : chartData.length ? (
              <>
                <div className="relative w-44 h-44 mx-auto flex-shrink-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={chartData} cx="50%" cy="50%" innerRadius={52} outerRadius={78} paddingAngle={2} dataKey="value" strokeWidth={0}>
                        {chartData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                      </Pie>
                      <RechartsTooltip content={<DonutTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <span className="text-lg font-bold text-zinc-900 tabular-nums leading-none">{providerTotal.toLocaleString('fr-FR')}</span>
                    <span className="text-[10px] text-zinc-400 mt-1 uppercase tracking-wide">txns</span>
                  </div>
                </div>
                <div className="flex flex-col gap-2.5 mt-5">
                  {chartData.map((entry) => (
                    <div key={entry.name} className="flex items-center justify-between">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: entry.color }} />
                        <span className="text-xs text-zinc-600 truncate">{entry.label}</span>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className="text-xs font-semibold text-zinc-900 tabular-nums">{entry.value.toLocaleString('fr-FR')}</span>
                        <span className="text-[10px] text-zinc-400 w-8 text-right tabular-nums">{entry.pct}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-sm text-zinc-400">Aucune donnée</div>
            )}
          </div>
        </div>

        {/* ══ 2. RÉPARTITION DES ÉLÈVES PAR ÉCOLE ════════════════════════════ */}
        <div className="bg-white rounded-2xl border border-zinc-200 shadow-[0_2px_12px_rgba(0,0,0,0.08)] p-7">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-base font-semibold text-zinc-900">Répartition des élèves</h2>
              <p className="text-xs text-zinc-400 mt-0.5">Statuts par établissement</p>
            </div>
            {workerHealth && (
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium bg-zinc-100 text-zinc-500 px-3 py-1.5 rounded-full tabular-nums">
                  {workerHealth.details.reduce((s, d) => s + d._count._all, 0).toLocaleString('fr-FR')} élèves
                </span>
                {workerHealth.pending > 0 && (
                  <span className="text-xs font-medium bg-orange-50 text-orange-600 px-3 py-1.5 rounded-full tabular-nums">
                    {workerHealth.pending} sans biométrie
                  </span>
                )}
              </div>
            )}
          </div>

          <div className="mb-5">
            <select
              value={pipelineSchoolId ?? ''}
              onChange={(e) => setPipelineSchoolId(e.target.value ? Number(e.target.value) : null)}
              className="text-xs border border-zinc-200 rounded-lg px-3 py-1.5 text-zinc-600 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-200"
            >
              <option value="">Choisir un établissement…</option>
              {schools?.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>

          {!pipelineSchoolId ? (
            <div className="flex flex-col items-center justify-center py-10 gap-2 text-sm text-zinc-400">
              <GraduationCap size={28} className="text-zinc-200" />
              Sélectionnez un établissement pour afficher la répartition
            </div>
          ) : loadingPipeline ? (
            <div className="space-y-4">{[...Array(4)].map((_, i) => <Sk key={i} className="h-14 rounded-xl" />)}</div>
          ) : workerHealth?.details.length ? (() => {
            const total = workerHealth.details.reduce((s, d) => s + d._count._all, 0)
            return (
              <div className="space-y-3">
                {workerHealth.details.map((entry, idx) => {
                  const cfg = STUDENT_STATUS_CFG[entry.status] ?? { label: entry.status, color: '#a1a1aa', bg: 'bg-zinc-100', text: 'text-zinc-500' }
                  const pct = total > 0 ? Math.round((entry._count._all / total) * 100) : 0
                  return (
                    <div key={entry.status} className="flex items-center gap-4">
                      <div className="w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-bold"
                        style={{ backgroundColor: cfg.color + '20', color: cfg.color }}>
                        {idx + 1}
                      </div>
                      <div className="w-36 flex-shrink-0">
                        <span className={cn('text-xs font-semibold px-2 py-1 rounded-full', cfg.bg, cfg.text)}>
                          {cfg.label}
                        </span>
                      </div>
                      <div className="flex-1 h-8 bg-zinc-50 rounded-xl overflow-hidden relative">
                        <div
                          className="h-full rounded-xl transition-all duration-700"
                          style={{ width: `${Math.max(pct, 4)}%`, backgroundColor: cfg.color + '30', borderLeft: `3px solid ${cfg.color}` }}
                        />
                        {pct > 12 && (
                          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xs font-semibold tabular-nums" style={{ color: cfg.color }}>
                            {pct}%
                          </span>
                        )}
                      </div>
                      <div className="w-16 text-right flex-shrink-0">
                        <span className="text-sm font-bold text-zinc-900 tabular-nums">{entry._count._all.toLocaleString('fr-FR')}</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            )
          })() : (
            <div className="flex items-center justify-center py-8 text-sm text-zinc-400">Aucune donnée disponible</div>
          )}
        </div>

        {/* ══ 3. SANTÉ ÉTABLISSEMENTS ════════════════════════════════════════ */}
        <div className="bg-white rounded-xl border border-zinc-200 shadow-[0_1px_4px_rgba(0,0,0,0.06)] p-6">
          <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-5">Santé des établissements</p>
          {loadingSchools
            ? <div className="space-y-3">{[...Array(3)].map((_, i) => <Sk key={i} className="h-12" />)}</div>
            : (
              <div className="flex items-center gap-8">
                {(['EXCELLENT', 'STABLE', 'CRITICAL'] as const).map((level) => (
                  <div key={level} className="flex items-center gap-3">
                    <Dot level={level} />
                    <span className="text-sm text-zinc-600">{HEALTH_LABEL[level]}</span>
                    <span className="text-2xl font-semibold text-zinc-900 tabular-nums">{healthCount?.[level] ?? 0}</span>
                  </div>
                ))}
              </div>
            )}
        </div>

        {/* ══ 4. SESSIONS ACTIVES ════════════════════════════════════════════ */}
        <div className="bg-white rounded-xl border border-zinc-200 shadow-[0_1px_4px_rgba(0,0,0,0.06)] overflow-hidden">
          <div className="flex items-center justify-between px-6 py-5 border-b border-zinc-100">
            <div className="flex items-center gap-2.5">
              <ScrollText size={15} className="text-zinc-400" />
              <span className="text-sm font-medium text-zinc-500">Sessions actives</span>
            </div>
            <Link href="/super-admin/audit" className="text-xs text-indigo-600 hover:text-indigo-800 font-medium transition-colors flex items-center gap-1">
              <Activity size={11} />
              Monitoring complet →
            </Link>
          </div>
          {loadingSessions ? (
            <Sk className="h-20 rounded-none" />
          ) : sessions?.length ? (
            <div className="divide-y divide-zinc-50">
              {sessions.slice(0, 5).map((s) => (
                <div key={s.id} className="flex items-center justify-between px-6 py-3.5">
                  <div className="flex items-center gap-3">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    <span className="text-sm text-zinc-700">{s.user.firstName} {s.user.lastName}</span>
                  </div>
                  <span className="text-xs font-medium bg-zinc-100 text-zinc-500 px-2 py-0.5 rounded-lg">{s.user.role}</span>
                </div>
              ))}
              {sessions.length > 5 && (
                <div className="px-6 py-3 text-xs text-zinc-400">+ {sessions.length - 5} autres sessions</div>
              )}
            </div>
          ) : (
            <div className="px-6 py-5 text-sm text-zinc-400">Aucune session active</div>
          )}
        </div>

        {/* ══ 7. ÉTABLISSEMENTS ══════════════════════════════════════════════ */}
        {(loadingSchools || (schools && schools.length > 0)) && (
          <div className="bg-white rounded-xl border border-zinc-200 shadow-[0_1px_4px_rgba(0,0,0,0.06)] overflow-hidden">
            <div className="flex items-center justify-between px-6 py-5 border-b border-zinc-50">
              <span className="text-sm font-medium text-zinc-500">Établissements</span>
              <Link href="/super-admin/schools" className="text-sm text-indigo-600 hover:text-indigo-800 font-medium transition-colors">
                Voir tous →
              </Link>
            </div>
            {loadingSchools ? <Sk className="h-56 rounded-none" /> : schools && (
              <div className="divide-y divide-zinc-50">
                {schools.slice(0, 6).map((school) => (
                  <Link
                    key={school.id}
                    href={`/super-admin/schools/${school.id}`}
                    className="flex items-center justify-between px-6 py-4 hover:bg-zinc-50 transition-colors group"
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      <Dot level={school.health.level} />
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-zinc-900 truncate">{school.name}</p>
                        <p className="text-xs text-zinc-400">
                          {school.city} · {school._count.students.toLocaleString('fr-FR')} élève{school._count.students !== 1 ? 's' : ''}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0 ml-4">
                      <HealthBadge level={school.health.level} />
                      <ChevronRight size={14} className="text-zinc-200 group-hover:text-zinc-500 transition-colors" />
                    </div>
                  </Link>
                ))}
                {schools.length > 6 && (
                  <div className="px-6 py-4">
                    <Link href="/super-admin/schools" className="text-sm text-zinc-400 hover:text-zinc-600 transition-colors">
                      + {schools.length - 6} autres établissements
                    </Link>
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
