'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import {
  Building2, GraduationCap,
  ArrowRight, Activity, ScrollText,
  ShieldAlert, Calendar, RefreshCw,
} from 'lucide-react'
import {
  PieChart, Pie, Cell, Tooltip as RechartsTooltip, ResponsiveContainer,
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
} from 'recharts'
import {
  usePlatformStats, useSchools, useActiveSessions,
  useProviderStats, useFinanceReport, useWorkerHealth,
  useGodModeDashboardStats,
} from '@/lib/hooks/use-super-admin'
import { useQueryLoading } from '@/lib/hooks/use-auth-query'
import { useAuth } from '@/providers/auth-provider'
import { cn } from '@/lib/utils'
import { roleLabel } from '@/lib/i18n/display-labels'
import { Skeleton } from '@/components/ui/skeleton'
import { formatMoney, formatMoneyCompact } from '@/lib/finance/currency'
import { PlatformKpiStrip } from '@/components/super-admin/platform-kpi-strip'
import { OwnerActionQueue } from '@/components/super-admin/owner-action-queue'
import { MasterAnalyticsSection } from '@/components/super-admin/master-analytics-section'
import {
  EnrollmentTrendChart,
  GodModeKpiCards,
} from '@/components/super-admin/god-mode-dashboard'
import { superAdminApi } from '@/lib/superAdmin/api'

/* ── helpers ──────────────────────────────────────────────────────────────── */
const fmt = (n: number) => formatMoney(n)

function Dot({ level }: { level: 'EXCELLENT' | 'STABLE' | 'CRITICAL' }) {
  return (
    <span className={cn('inline-block w-2.5 h-2.5 rounded-full flex-shrink-0', {
      'bg-emerald-500': level === 'EXCELLENT',
      'bg-sky-400':    level === 'STABLE',
      'bg-red-500':    level === 'CRITICAL',
    })} />
  )
}

const HEALTH_LABEL = { EXCELLENT: 'Excellente', STABLE: 'Stable', CRITICAL: 'Critique' } as const

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

const fmtShort = (n: number) => formatMoneyCompact(n)

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

export default function SuperAdminDashboardPage() {
  const { isLoading: authLoading } = useAuth()
  const { data: stats, isPending: statsPending, isError, refetch } = usePlatformStats()
  const {
    data: godStats,
    isPending: godPending,
    isFetching: godFetching,
    isError: godError,
    refetch: refetchGod,
  } = useGodModeDashboardStats()
  const { data: schools, isPending: schoolsPending } = useSchools()
  const { data: sessions, isPending: sessionsPending } = useActiveSessions()

  const { data: providers, isPending: providersPending } = useProviderStats()

  // Area Chart — encaissements par école
  const today = new Date().toISOString().slice(0, 10)
  const thirtyDaysAgo = new Date(Date.now() - 30 * 86400_000).toISOString().slice(0, 10)
  const [revenueSchoolId, setRevenueSchoolId] = useState<number | null>(null)
  const [revenueFrom, setRevenueFrom] = useState(thirtyDaysAgo)
  const [revenueTo, setRevenueTo]     = useState(today)
  const [refreshing, setRefreshing] = useState(false)

  const revenueParams = revenueSchoolId
    ? { schoolId: revenueSchoolId, startDate: revenueFrom + 'T00:00:00.000Z', endDate: revenueTo + 'T23:59:59.999Z' }
    : null
  const { data: financeReport, isPending: revenuePending } = useFinanceReport(revenueParams)

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
  const { data: workerHealth, isPending: pipelinePending } = useWorkerHealth(pipelineSchoolId ?? 0)

  const loadingSchools = useQueryLoading(authLoading || schoolsPending)
  const loadingSessions = useQueryLoading(authLoading || sessionsPending)
  const loadingProviders = useQueryLoading(authLoading || providersPending)
  const loadingRevenue = useQueryLoading(authLoading || revenuePending)
  const loadingPipeline = useQueryLoading(authLoading || pipelinePending)
  const loadingStats = useQueryLoading(authLoading || statsPending)
  const loadingGod = useQueryLoading(authLoading || godPending)

  async function refreshAll() {
    setRefreshing(true)
    try {
      await Promise.all([
        refetch(),
        // Force recalcul serveur (idempotent) + bypass cache Redis
        superAdminApi.getDashboardStats({ days: 30, refresh: true }).then(() => refetchGod()),
      ])
    } finally {
      setRefreshing(false)
    }
  }

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
    <div className="min-h-screen bg-[#f5f7fb]">

      {/* ── PAGE HEADER ──────────────────────────────────────────────────────── */}
      <motion.div
        className="bg-white border-b border-zinc-200"
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
      >
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4 px-8 py-6">
          <div>
            <h1 className="text-3xl font-semibold text-zinc-900 tracking-tight">Dashboard</h1>
            <p className="text-sm text-zinc-400 mt-1 capitalize" suppressHydrationWarning>
              {new Date().toLocaleDateString('fr-FR', {
                weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
              })}
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap justify-end">
            <button
              type="button"
              onClick={() => void refreshAll()}
              disabled={refreshing || godFetching}
              className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-xl border border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50 transition-colors disabled:opacity-50"
            >
              <RefreshCw size={14} className={cn((refreshing || godFetching) && 'animate-spin')} />
              Refresh Data
            </button>
            <Link
              href="/super-admin/billing"
              className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-xl border border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50 transition-colors"
            >
              Abonnements SaaS
            </Link>
            <Link
              href="/super-admin/operations"
              className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-xl border border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50 transition-colors"
            >
              <ShieldAlert size={14} />
              Centre opérations
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
      </motion.div>

      <div
        className="max-w-7xl mx-auto px-8 py-8 space-y-6"
      >

        <div className="flex flex-wrap items-center justify-between gap-2">
          <GodModeKpiCards data={godStats} loading={loadingGod} />
        </div>
        {godStats?.meta?.degraded ? (
          <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
            Mode dégradé — certaines agrégations ont échoué (
            {godStats.meta.partialFailures.join(', ') || 'inconnu'}). Les compteurs peuvent être
            partiels.
          </p>
        ) : null}
        {godStats?.meta?.cached ? (
          <p className="text-[11px] text-zinc-400">
            Cache hit · ETag {godStats.etag?.slice(0, 8)}… · généré{' '}
            {godStats.meta.generatedAt
              ? new Date(godStats.meta.generatedAt).toLocaleTimeString('fr-FR')
              : '—'}
          </p>
        ) : null}

        {(godError || isError) && !loadingGod && !loadingStats && (
          <div className="flex items-center justify-between rounded-xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700">
            <span>Impossible de charger les statistiques God Mode.</span>
            <button
              type="button"
              onClick={() => void refreshAll()}
              className="font-medium underline underline-offset-2"
            >
              Réessayer
            </button>
          </div>
        )}

        <EnrollmentTrendChart data={godStats} loading={loadingGod} />

        <PlatformKpiStrip stats={stats} loading={loadingStats} />

        {isError && !loadingStats && !godError && (
          <div className="flex items-center justify-between rounded-xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700">
            <span>Impossible de charger les statistiques plateforme.</span>
            <button onClick={() => refetch()} className="font-medium underline underline-offset-2">Réessayer</button>
          </div>
        )}

        <OwnerActionQueue schools={schools} />

        {!loadingSchools && schools && schools.length > 0 && healthCount ? (
          <div className="grid grid-cols-3 gap-3">
            {(['EXCELLENT', 'STABLE', 'CRITICAL'] as const).map((level) => (
              <Link
                key={level}
                href="/super-admin/schools"
                className="rounded-xl border border-zinc-200 bg-white px-4 py-3 hover:border-zinc-300 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <Dot level={level} />
                  <span className="text-xs text-zinc-500">{HEALTH_LABEL[level]}</span>
                </div>
                <p className="text-2xl font-bold text-zinc-900 tabular-nums mt-1">
                  {healthCount[level] ?? 0}
                </p>
              </Link>
            ))}
          </div>
        ) : null}

        <MasterAnalyticsSection />

        {/* ══ GRAPHIQUES HERO ═════════════════════════════════════════════ */}
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
              <Skeleton className="h-48 rounded-xl" />
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
                <Skeleton className="w-40 h-40 rounded-full" />
                <div className="w-full space-y-3">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-4" />)}</div>
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
            <div className="space-y-4">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-14 rounded-xl" />)}</div>
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

        {/* ══ SESSIONS ACTIVES ════════════════════════════════════════════ */}
        <div className="bg-white rounded-xl border border-zinc-200 shadow-[0_1px_4px_rgba(0,0,0,0.06)] overflow-hidden">
          <div className="flex items-center justify-between px-6 py-5 border-b border-zinc-100">
            <div className="flex items-center gap-2.5">
              <ScrollText size={15} className="text-zinc-400" />
              <span className="text-sm font-medium text-zinc-500">Sessions actives</span>
            </div>
            <Link href="/super-admin/operations?tab=audit" className="text-xs text-indigo-600 hover:text-indigo-800 font-medium transition-colors flex items-center gap-1">
              <Activity size={11} />
              Centre opérations →
            </Link>
          </div>
          {loadingSessions ? (
            <Skeleton className="h-20 rounded-none" />
          ) : sessions?.length ? (
            <div className="divide-y divide-zinc-50">
              {sessions.slice(0, 5).map((s) => (
                <div
                  key={s.id}
                  className="flex items-center justify-between px-6 py-3.5"
                >
                  <div className="flex items-center gap-3">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    <span className="text-sm text-zinc-700">{s.user.firstName} {s.user.lastName}</span>
                  </div>
                  <span className="text-xs font-medium bg-zinc-100 text-zinc-500 px-2 py-0.5 rounded-lg">{roleLabel(s.user.role)}</span>
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

      </div>
    </div>
  )
}
