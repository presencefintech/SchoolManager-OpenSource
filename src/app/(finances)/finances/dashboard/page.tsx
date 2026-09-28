'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import {
  DollarSign, ClipboardList, CheckCircle, Users,
  RotateCcw, Banknote, RefreshCw, CalendarCheck, ShieldCheck, TrendingUp,
  Radio, ClipboardCheck, BarChart3, Brain, Search, Layers3, Smartphone,
} from 'lucide-react'
import {
  useGuichetDashboard, useDailyCashReport, useDebtors, useCollectionAnalytics,
  useExecutiveDashboard, useFinanceIntegrity, useFinancePaymentProfile,
  useFinanceRoleHealthCheck,
} from '@/lib/hooks/use-finance'
import { resolveAcademicSessionId } from '@/lib/finance/collection-analytics.utils'
import {
  formatIntegrityStatusLabel,
  isFinanceIntegritySecure,
} from '@/lib/admin/finance-dashboard.utils'
import { GuichetOnlinePaymentsBanner } from '@/components/finance/guichet-online-payments-banner'
import { CashLiveTape } from '@/components/finance/cash-live-tape'
import { CashPaceStrip } from '@/components/finance/cash-pace-strip'
import { ClassCollectionRank } from '@/components/finance/class-collection-rank'
import { FinanceAiInsightsPanel } from '@/components/admin/finance/FinanceAiInsightsPanel'
import { useFinanceRealtimeStatus } from '@/lib/finance/hooks/finance-realtime-provider'
import { useSchoolMoney } from '@/lib/finance/use-school-money'
import { formatStudentFullName } from '@/lib/utils/student-name.util'
import { fadeUp, stagger } from '@/lib/animations'
import { Skeleton } from '@/components/ui/skeleton'
import type {
  DailyCashEntry,
  ExecutiveDashboard,
  GuichetDashboard,
  CollectionAnalyticsSummary,
} from '@/types/finance'
import {
  LazyPaymentCategoryDonutChart as PaymentCategoryDonutChart,
  LazyPaymentMethodBarChart as PaymentMethodBarChart,
  LazyPaymentMethodCountBarChart as PaymentMethodCountBarChart,
} from '@/components/charts/lazy'
import { StudentFeeScheduleLink } from '@/components/finance/student-fee-schedule-link'
import { StudentPaymentStatusWidget } from '@/components/finance/student-payment-status-widget'

const QUICK_LINKS = [
  { href: '/finances/intelligence', label: 'Intelligence', icon: Brain, tone: 'text-violet-600 bg-violet-50' },
  { href: '/finances/transactions', label: 'Transactions', icon: Search, tone: 'text-sky-600 bg-sky-50' },
  { href: '/finances/paiements', label: 'Paiements', icon: DollarSign, tone: 'text-emerald-600 bg-emerald-50' },
  { href: '/finances/caisse', label: 'Caisse', icon: Banknote, tone: 'text-blue-600 bg-blue-50' },
  { href: '/finances/verifications', label: 'Vérifications', icon: ClipboardCheck, tone: 'text-amber-600 bg-amber-50' },
  { href: '/finances/declarations', label: 'Déclarations SMS', icon: Smartphone, tone: 'text-sky-600 bg-sky-50' },
  { href: '/finances/suivi-financier', label: 'Suivi', icon: BarChart3, tone: 'text-violet-600 bg-violet-50' },
  { href: '/finances/frais-annuels-classes', label: 'Frais classes', icon: Layers3, tone: 'text-teal-600 bg-teal-50' },
  { href: '/finances/debiteurs', label: 'Débiteurs', icon: Users, tone: 'text-red-600 bg-red-50' },
] as const

function LiveIndicator({ status, lastUpdate }: { status: ReturnType<typeof useFinanceRealtimeStatus>['status']; lastUpdate: Date | null }) {
  const isLive = status === 'live'
  const label =
    status === 'live' ? 'Temps réel'
    : status === 'connecting' ? 'Connexion…'
    : status === 'polling' ? 'Actualisation auto'
    : 'Hors ligne'

  return (
    <div
      className={`flex items-center gap-2 rounded-xl border px-3 py-1.5 text-xs font-medium ${
        isLive
          ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
          : 'border-zinc-200 bg-white text-zinc-500'
      }`}
      title={lastUpdate ? `Dernière MAJ ${lastUpdate.toLocaleTimeString('fr-FR')}` : undefined}
    >
      <span className="relative flex h-2 w-2">
        {isLive && (
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
        )}
        <span className={`relative inline-flex h-2 w-2 rounded-full ${isLive ? 'bg-emerald-500' : 'bg-zinc-300'}`} />
      </span>
      <Radio size={12} className={isLive ? 'text-emerald-600' : 'text-zinc-400'} />
      {label}
    </div>
  )
}

const METHOD_LABEL: Record<string, string> = {
  CASH: 'Espèces',
  BANK: 'Virement',
  ORANGE_MONEY: 'Orange Money',
  MPESA: 'M-Pesa',
  AIRTEL_MONEY: 'Airtel Money',
  CARD: 'Carte',
}

const CATEGORY_COLORS = {
  cash: '#10b981',
  mobile: '#118DFF',
  bank: '#8764B8',
  card: '#f59e0b',
} as const

const MOBILE_MONEY_METHODS = new Set(['ORANGE_MONEY', 'MPESA', 'AIRTEL_MONEY'])

function Sparkline({ data, hex }: { data: number[]; hex: string }) {
  if (data.length < 2 || data.every(v => v === 0)) return null
  const min = Math.min(...data)
  const max = Math.max(...data)
  const range = max - min || 1
  const W = 72, H = 28
  const pts = data.map((v, i) => {
    const x = ((i / (data.length - 1)) * W).toFixed(1)
    const y = (H - ((v - min) / range) * H * 0.8 - H * 0.1).toFixed(1)
    return `${x},${y}`
  }).join(' ')
  const lastV = data[data.length - 1]
  const lastX = W
  const lastY = (H - ((lastV - min) / range) * H * 0.8 - H * 0.1).toFixed(1)
  return (
    <svg width={W} height={H} className="overflow-visible opacity-75">
      <polyline points={pts} fill="none" stroke={hex} strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={lastX} cy={lastY} r="2.5" fill={hex} />
    </svg>
  )
}

function MiniGauge({ value, hex }: { value: number; hex: string }) {
  const pct = Math.min(Math.max(value, 0), 100)
  return (
    <div className="mt-3 h-1 rounded-full bg-zinc-100 overflow-hidden">
      <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, backgroundColor: hex }} />
    </div>
  )
}

function KpiCard({ label, value, sub, icon: Icon, color, bg, sparkData, gaugeValue, hex = '#6366f1' }: {
  label: string; value: string | number; sub?: string
  icon: React.ElementType; color: string; bg: string
  sparkData?: number[]
  gaugeValue?: number
  hex?: string
}) {
  return (
    <div className="bg-white rounded-2xl border border-zinc-200/70 p-5 shadow-[0_1px_4px_rgba(0,0,0,0.06)]">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-2">{label}</p>
          <p className="text-3xl font-bold text-zinc-900 tabular-nums leading-none">{value}</p>
          {sub && <p className="text-xs text-zinc-400 mt-1.5">{sub}</p>}
          {gaugeValue !== undefined && <MiniGauge value={gaugeValue} hex={hex} />}
        </div>
        <div className="flex flex-col items-end gap-2 flex-shrink-0">
          <div className={`w-10 h-10 rounded-xl ${bg} flex items-center justify-center`}>
            <Icon size={18} className={color} />
          </div>
          {sparkData && <Sparkline data={sparkData} hex={hex} />}
        </div>
      </div>
    </div>
  )
}

export default function FinanceDashboardPage() {
  const { status: realtimeStatus, lastUpdate, recentCashActivity } = useFinanceRealtimeStatus()
  const { format: formatMoney } = useSchoolMoney()
  const { data: guichet, isLoading, refetch, dataUpdatedAt, isSuccess: coreReady } = useGuichetDashboard()
  const secondary = { enabled: coreReady }
  const { data: dailyCash = [] } = useDailyCashReport(secondary)
  const { data: debtorsData } = useDebtors(10, secondary)
  const sessionId = resolveAcademicSessionId(guichet)
  const hasAcademicSession = sessionId != null
  const {
    data: collection,
    isLoading: collectionLoading,
    isFetching: collectionFetching,
  } = useCollectionAnalytics(sessionId, { enabled: coreReady && hasAcademicSession })
  const { data: execData } = useExecutiveDashboard(secondary)
  const { data: integrity } = useFinanceIntegrity(secondary)
  const { data: paymentProfile } = useFinancePaymentProfile(secondary)
  const { data: health } = useFinanceRoleHealthCheck(secondary)

  const g = guichet as GuichetDashboard | undefined
  const cash: DailyCashEntry[] = Array.isArray(dailyCash) ? (dailyCash as DailyCashEntry[]) : []
  const exec = execData as ExecutiveDashboard | undefined
  const integritySecure = integrity ? isFinanceIntegritySecure(integrity) : false

  const debtors: any[] = (debtorsData as any)?.data ?? (Array.isArray(debtorsData) ? debtorsData : [])
  const coll = collection as CollectionAnalyticsSummary | null | undefined

  const byMethod: { method: string; amount: number; count: number }[] = g?.collectionsToday?.byMethod ?? []
  const todayTotal = Number(g?.collectionsToday?.total) || byMethod.reduce((acc, m) => acc + (Number(m.amount) || 0), 0)

  const categoryTotals = byMethod.reduce(
    (acc, m) => {
      const amount = Number(m.amount) || 0
      const count = Number(m.count) || 0
      let bucket: keyof typeof acc | null = null
      if (m.method === 'CASH') bucket = 'cash'
      else if (m.method === 'BANK') bucket = 'bank'
      else if (m.method === 'CARD') bucket = 'card'
      else if (MOBILE_MONEY_METHODS.has(m.method)) bucket = 'mobile'
      if (bucket) {
        acc[bucket].amount += amount
        acc[bucket].count += count
      }
      return acc
    },
    {
      cash: { amount: 0, count: 0 },
      mobile: { amount: 0, count: 0 },
      bank: { amount: 0, count: 0 },
      card: { amount: 0, count: 0 },
    },
  )

  const categoryData = [
    { name: 'Espèces', value: categoryTotals.cash.amount, count: categoryTotals.cash.count, color: CATEGORY_COLORS.cash },
    { name: 'Mobile Money', value: categoryTotals.mobile.amount, count: categoryTotals.mobile.count, color: CATEGORY_COLORS.mobile },
    { name: 'Banque', value: categoryTotals.bank.amount, count: categoryTotals.bank.count, color: CATEGORY_COLORS.bank },
    { name: 'Carte', value: categoryTotals.card.amount, count: categoryTotals.card.count, color: CATEGORY_COLORS.card },
  ]

  const methodBarData = byMethod.map((m) => ({
    name: METHOD_LABEL[m.method] ?? m.method,
    amount: Number(m.amount) || 0,
    count: Number(m.count) || 0,
  }))

  const revenueTrend = cash.map((r) => Number(r._sum?.amount) || 0)

  const today = typeof window !== 'undefined'
    ? new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
    : ''

  return (
    <div className="min-h-full bg-[#f5f7fb] px-8 py-8 space-y-6">
      {/* Hero */}
      <motion.div
        className="relative overflow-hidden rounded-2xl border border-emerald-100 bg-gradient-to-br from-emerald-600 via-emerald-700 to-teal-800 px-6 py-6 text-white shadow-lg"
        initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}
      >
        <div className="absolute -right-8 -top-8 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-emerald-100/90">Finance Premium · Guichet</p>
            <h1 className="mt-1 text-2xl font-bold">Tableau de bord</h1>
            <p className="mt-1 text-sm text-emerald-100/90 capitalize" suppressHydrationWarning>{today}</p>
            {!isLoading && g && (
              <p className="mt-3 text-sm font-medium text-white/95">
                {formatMoney(Number(g?.collectionsToday?.total) || todayTotal)} encaissés aujourd&apos;hui
                {' · '}
                {g?.collectionsToday?.count ?? 0} transaction(s)
              </p>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <LiveIndicator status={realtimeStatus} lastUpdate={lastUpdate ?? (dataUpdatedAt ? new Date(dataUpdatedAt) : null)} />
            {g?.closingFinalizedToday && (
              <div className="flex items-center gap-1.5 rounded-xl border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-medium backdrop-blur-sm">
                <CalendarCheck size={13} /> Clôture finalisée
              </div>
            )}
            {g?.openCashSession && (
              <div className="flex items-center gap-1.5 rounded-xl border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-medium backdrop-blur-sm">
                <Banknote size={13} /> Session ouverte
              </div>
            )}
            <button
              type="button"
              onClick={() => refetch()}
              className="rounded-xl border border-white/20 bg-white/10 p-2 text-white/90 backdrop-blur-sm hover:bg-white/20"
            >
              <RefreshCw size={14} />
            </button>
          </div>
        </div>
        <div className="relative mt-5 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
          {QUICK_LINKS.map(({ href, label, icon: Icon, tone }) => (
            <Link
              key={href}
              href={href}
              className="flex items-center gap-2 rounded-xl border border-white/15 bg-white/10 px-3 py-2.5 text-xs font-medium text-white backdrop-blur-sm transition-colors hover:bg-white/20"
            >
              <span className={`flex h-7 w-7 items-center justify-center rounded-lg ${tone}`}>
                <Icon size={14} />
              </span>
              {label}
            </Link>
          ))}
        </div>
      </motion.div>

      <StudentPaymentStatusWidget href="/finances/suivi-financier" />

      <GuichetOnlinePaymentsBanner profile={paymentProfile} />

      <CashLiveTape
        items={recentCashActivity}
        live={realtimeStatus === 'live'}
        emptyHint="Chaque paiement du guichet (espèces, mobile, SMS) s’affiche ici dès qu’il arrive."
      />

      {health && (
        <div className="rounded-2xl border border-zinc-200/80 bg-white px-5 py-4 shadow-[0_1px_4px_rgba(0,0,0,0.06)] flex flex-wrap items-center gap-4">
          <div
            className={`w-11 h-11 rounded-xl flex items-center justify-center text-lg font-black ${
              health.isHealthy ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
            }`}
          >
            {health.healthScore}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-zinc-900">
              Bilan opérationnel · {health.isHealthy ? 'Sain' : 'Attention'}
            </p>
            <p className="text-xs text-zinc-500 mt-0.5">
              Recouvrement {health.efficiency.toFixed(0)}% · {health.debtorsCount} débiteurs · MoM{' '}
              {health.monthOverMonthPct >= 0 ? '+' : ''}
              {health.monthOverMonthPct}% · {health.pendingPayments} pending
            </p>
          </div>
          <Link
            href="/finances/intelligence"
            className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-600 hover:bg-zinc-50"
          >
            <Brain size={13} className="text-emerald-600" />
            Intelligence
          </Link>
        </div>
      )}

      <ClassCollectionRank rows={g?.classRanking} />

      <div id="intelligence">
        <FinanceAiInsightsPanel enabled={coreReady} source="finance" />
      </div>

      {/* KPIs guichet */}
      {isLoading ? (
        <div className="grid grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-28" />)}
        </div>
      ) : (
        <>
          <div>
            <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wide mb-3">Aujourd&apos;hui</p>
            <CashPaceStrip pace={g?.cashPace} className="mb-3" />
            <motion.div className="grid grid-cols-3 gap-4" variants={stagger} initial="hidden" animate="show">
              <motion.div variants={fadeUp}>
                <KpiCard
                  label="Encaissements du jour"
                  value={g?.collectionsToday?.total != null ? formatMoney(Number(g.collectionsToday.total)) : '—'}
                  sub={`${g?.collectionsToday?.count ?? 0} transaction(s)`}
                  icon={DollarSign} color="text-emerald-600" bg="bg-emerald-50"
                  sparkData={revenueTrend} hex="#059669"
                />
              </motion.div>
              <motion.div variants={fadeUp}>
                <KpiCard
                  label="Vérifications en attente"
                  value={g?.pendingVerifications ?? '—'}
                  sub={(g?.pendingVerifications ?? 0) > 0 ? 'À traiter' : 'Aucune en attente'}
                  icon={ClipboardList} color="text-amber-600" bg="bg-amber-50"
                />
              </motion.div>
              <motion.div variants={fadeUp}>
                <KpiCard
                  label="Remboursements en attente"
                  value={g?.pendingRefunds ?? '—'}
                  sub={(g?.approvedRefundsAwaitingProcess ?? 0) > 0 ? `${g?.approvedRefundsAwaitingProcess} approuvé(s) à traiter` : undefined}
                  icon={RotateCcw} color="text-violet-600" bg="bg-violet-50"
                />
              </motion.div>
              <motion.div variants={fadeUp}>
                <KpiCard
                  label="Remboursements en cours"
                  value={g?.gatewayRefundsProcessing ?? '—'}
                  sub="Via gateway"
                  icon={RefreshCw} color="text-blue-600" bg="bg-blue-50"
                />
              </motion.div>
              <motion.div variants={fadeUp}>
                <KpiCard
                  label="Top débiteurs (seuil > 10)"
                  value={debtors.length}
                  sub={debtors.length > 0 ? `${formatMoney(debtors.reduce((a, d) => a + (Number(d.feesBalance) || 0), 0))} total` : 'Aucun'}
                  icon={Users} color="text-red-600" bg="bg-red-50"
                />
              </motion.div>
              <motion.div variants={fadeUp}>
                <KpiCard
                  label="Session de caisse"
                  value={g?.openCashSession ? 'Ouverte' : 'Fermée'}
                  sub={g?.openCashSession ? `Ouverte le ${new Date(g.openCashSession.openedAt).toLocaleDateString('fr-FR')}` : 'Ouvrir une session pour encaisser'}
                  icon={Banknote} color={g?.openCashSession ? 'text-emerald-600' : 'text-zinc-500'} bg={g?.openCashSession ? 'bg-emerald-50' : 'bg-zinc-100'}
                />
              </motion.div>
            </motion.div>
          </div>
        </>
      )}

      {/* Transactions du jour (mobile money / banque / espèces / carte) + Top débiteurs */}
      <div className="grid grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl border border-zinc-200/70 shadow-[0_1px_4px_rgba(0,0,0,0.06)]">
          <div className="px-5 py-4 border-b border-zinc-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Banknote size={14} className="text-zinc-400" />
              <h3 className="text-sm font-semibold text-zinc-900">Transactions du jour</h3>
            </div>
            {todayTotal > 0 && (
              <span className="text-xs font-semibold text-emerald-700">{formatMoney(todayTotal)} total</span>
            )}
          </div>
          <div className="p-5 grid grid-cols-2 gap-4">
            <PaymentCategoryDonutChart data={categoryData} total={todayTotal} />
            <div className="space-y-3">
              <div>
                <p className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wide mb-1">Montant par méthode</p>
                <PaymentMethodBarChart data={methodBarData} />
              </div>
              <div>
                <p className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wide mb-1">Nombre de transactions</p>
                <PaymentMethodCountBarChart data={methodBarData} />
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-zinc-200/70 shadow-[0_1px_4px_rgba(0,0,0,0.06)]">
          <div className="px-5 py-4 border-b border-zinc-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users size={14} className="text-zinc-400" />
              <h3 className="text-sm font-semibold text-zinc-900">Top débiteurs</h3>
            </div>
            <div className="flex items-center gap-2">
              {debtors.length > 0 && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-red-50 text-red-700 font-medium">{debtors.length}</span>
              )}
              <Link
                href="/finances/debiteurs"
                className="text-xs font-medium text-zinc-500 hover:text-emerald-700"
              >
                Débiteurs →
              </Link>
              <Link
                href="/finances/suivi-financier?status=DEBTOR"
                className="text-xs font-medium text-emerald-600 hover:text-emerald-700"
              >
                Suivi complet →
              </Link>
            </div>
          </div>
          {debtors.length === 0 ? (
            <div className="py-10 text-center">
              <CheckCircle size={24} className="mx-auto text-emerald-300 mb-2" />
              <p className="text-sm text-zinc-400">Aucun débiteur</p>
            </div>
          ) : (
            <div className="divide-y divide-zinc-50">
              {debtors.slice(0, 8).map((dbtr: any, i: number) => (
                <div key={dbtr.id ?? i} className="flex items-center justify-between gap-3 px-5 py-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="w-5 h-5 rounded-full bg-red-50 flex items-center justify-center text-[10px] font-bold text-red-500 flex-shrink-0">{i + 1}</span>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-zinc-900 truncate">{formatStudentFullName(dbtr)}</p>
                      {dbtr.class?.name && <p className="text-xs text-zinc-400">{dbtr.class.name}</p>}
                    </div>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <span className="text-sm font-semibold text-red-600 tabular-nums">
                      {dbtr.feesBalance != null ? formatMoney(Number(dbtr.feesBalance)) : '—'}
                    </span>
                    {dbtr.id ? <StudentFeeScheduleLink studentId={Number(dbtr.id)} /> : null}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Analytics de recouvrement (session académique) */}
      <div className="bg-white rounded-2xl border border-zinc-200/70 shadow-[0_1px_4px_rgba(0,0,0,0.06)]">
        <div className="px-5 py-4 border-b border-zinc-100 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <TrendingUp size={14} className="text-emerald-600" />
            <h3 className="text-sm font-semibold text-zinc-900">Recouvrement · session académique</h3>
          </div>
          {hasAcademicSession && (
            <span className="text-[11px] font-medium text-zinc-400 tabular-nums">Session #{sessionId}</span>
          )}
        </div>
        {!coreReady || collectionLoading || collectionFetching ? (
          <div className="px-5 py-10 text-center text-sm text-zinc-400">Chargement des analytics…</div>
        ) : !hasAcademicSession ? (
          <div className="px-5 py-10 text-center">
            <CalendarCheck size={28} className="mx-auto text-zinc-300 mb-2" />
            <p className="text-sm font-medium text-zinc-600">Aucune session académique active</p>
            <p className="text-xs text-zinc-400 mt-1 max-w-sm mx-auto">
              Définissez une année scolaire courante (admin) pour afficher encaissements du mois, croissance et créances.
            </p>
          </div>
        ) : coll ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 divide-y lg:divide-y-0 lg:divide-x divide-zinc-100">
            <div className="px-5 py-4">
              <p className="text-xs text-zinc-500 mb-1">Encaissements du mois</p>
              <p className="text-xl font-bold text-zinc-900 tabular-nums">{formatMoney(coll.monthlyRevenue)}</p>
            </div>
            <div className="px-5 py-4">
              <p className="text-xs text-zinc-500 mb-1">Croissance vs mois précédent</p>
              <p className={`text-xl font-bold tabular-nums ${coll.growth >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>
                {coll.growth >= 0 ? '+' : ''}{formatMoney(coll.growth)}
              </p>
            </div>
            <div className="px-5 py-4">
              <p className="text-xs text-zinc-500 mb-1">Taux de recouvrement</p>
              <p className="text-xl font-bold text-zinc-900 tabular-nums">{coll.collectionEfficiency.toFixed(1)}%</p>
              <MiniGauge value={coll.collectionEfficiency} hex="#059669" />
            </div>
            <div className="px-5 py-4">
              <p className="text-xs text-zinc-500 mb-1">Créances restantes</p>
              <p className="text-xl font-bold text-amber-700 tabular-nums">{formatMoney(coll.totalReceivables)}</p>
            </div>
          </div>
        ) : (
          <div className="px-5 py-10 text-center text-sm text-zinc-400">Données de recouvrement indisponibles</div>
        )}
      </div>

      {/* Performance & Intégrité */}
      {(exec || integrity) && (
        <div className="grid grid-cols-2 gap-6">
          {exec && (
            <div className="bg-white rounded-2xl border border-zinc-100 shadow-sm">
              <div className="px-5 py-4 border-b border-zinc-100 flex items-center gap-2">
                <TrendingUp size={14} className="text-zinc-400" />
                <h3 className="text-sm font-semibold text-zinc-900">Performance</h3>
              </div>
              <div className="p-5 space-y-3">
                {exec.performance && (
                  <div className="space-y-2">
                    {[
                      ['Revenus du mois', formatMoney(Number(exec.performance.monthlyRevenue))],
                      ['Revenu projeté', formatMoney(Number(exec.performance.projectedRevenue))],
                      ['Taux de recouvrement', `${Number(exec.performance.collectionEfficiency).toFixed(1)} %`],
                      ['ARPU', formatMoney(Number(exec.performance.arpu))],
                      ['Adoption digitale', `${Number(exec.performance.digitalAdoption).toFixed(1)} %`],
                    ].map(([k, v]) => (
                      <div key={k} className="flex items-center justify-between py-1.5 border-b border-zinc-50 last:border-0">
                        <span className="text-xs text-zinc-500">{k}</span>
                        <span className="text-xs font-semibold text-zinc-800">{v}</span>
                      </div>
                    ))}
                  </div>
                )}
                {exec.treasury && (
                  <div className="mt-3 pt-3 border-t border-zinc-100 space-y-2">
                    <p className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wide">Trésorerie</p>
                    <div className="flex justify-between text-xs">
                      <span className="text-zinc-500">Impayés totaux</span>
                      <span className="font-semibold text-red-600">{formatMoney(Number(exec.treasury.totalUnpaid))}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-zinc-500">Estimation créances douteuses</span>
                      <span className="font-semibold text-amber-600">{formatMoney(Number(exec.treasury.badDebtEstimate))}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {integrity && (
            <div className="bg-white rounded-2xl border border-zinc-100 shadow-sm">
              <div className="px-5 py-4 border-b border-zinc-100 flex items-center gap-2">
                <ShieldCheck size={14} className="text-zinc-400" />
                <h3 className="text-sm font-semibold text-zinc-900">Intégrité comptable</h3>
              </div>
              <div className="p-5">
                <div className={`flex items-center gap-2.5 px-4 py-3 rounded-xl mb-4 ${
                  integritySecure
                    ? 'bg-emerald-50 border border-emerald-100'
                    : 'bg-amber-50 border border-amber-100'
                }`}>
                  <ShieldCheck size={16} className={integritySecure ? 'text-emerald-600' : 'text-amber-500'} />
                  <div>
                    <p className={`text-sm font-semibold ${integritySecure ? 'text-emerald-700' : 'text-amber-700'}`}>
                      {formatIntegrityStatusLabel(integrity.status)}
                    </p>
                    {integrity.anomaliesFound === 0 && (
                      <p className="text-xs text-emerald-600">Aucune anomalie détectée</p>
                    )}
                    {integrity.totalChecked > 0 && (
                      <p className="text-xs text-zinc-500">
                        {integrity.totalChecked} profil{integrity.totalChecked > 1 ? 's' : ''} vérifié{integrity.totalChecked > 1 ? 's' : ''}
                      </p>
                    )}
                  </div>
                </div>
                {exec?.audit && (
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs py-1.5 border-b border-zinc-50">
                      <span className="text-zinc-500">Vérifications en attente</span>
                      <span className={`font-semibold ${exec.audit.pendingVerifications > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>
                        {exec.audit.pendingVerifications}
                      </span>
                    </div>
                    <div className="flex justify-between text-xs py-1.5 border-b border-zinc-50">
                      <span className="text-zinc-500">DSO (jours)</span>
                      <span className="font-semibold text-zinc-700">{exec.audit.daysSalesOutstanding}</span>
                    </div>
                    <div className="flex justify-between text-xs py-1.5 border-b border-zinc-50">
                      <span className="text-zinc-500">Activité suspecte</span>
                      <span className={`font-semibold ${exec.audit.suspiciousActivity ? 'text-red-600' : 'text-emerald-600'}`}>
                        {exec.audit.suspiciousActivity ? 'Oui' : 'Non'}
                      </span>
                    </div>
                    <div className="flex justify-between text-xs py-1.5">
                      <span className="text-zinc-500">Loi de Benford</span>
                      <span className={`font-semibold ${exec.audit.isBenfordValid ? 'text-emerald-600' : 'text-red-600'}`}>
                        {exec.audit.isBenfordValid ? 'Conforme' : 'Déviance'}
                      </span>
                    </div>
                  </div>
                )}
                {integrity.details.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-zinc-100">
                    <p className="text-xs font-semibold text-red-600 mb-2">
                      {integrity.anomaliesFound} anomalie{integrity.anomaliesFound > 1 ? 's' : ''} détectée{integrity.anomaliesFound > 1 ? 's' : ''}
                    </p>
                    <div className="space-y-1 max-h-28 overflow-y-auto">
                      {integrity.details.map((detail) => (
                        <div key={detail.id} className="text-xs text-zinc-600 bg-red-50 rounded px-2 py-1">
                          <span className="font-medium text-zinc-800">
                            {formatStudentFullName({
                              firstName: detail.firstName,
                              lastName: detail.lastName,
                            }) || `Élève #${detail.id}`}
                          </span>
                          {detail.tuitionBalance != null && (
                            <span className="text-red-600"> · solde {formatMoney(detail.tuitionBalance)}</span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
