'use client'

import { motion, type Variants } from 'framer-motion'
import Link from 'next/link'
import {
  TrendingUp, DollarSign, AlertTriangle, Wallet,
  BarChart3, Clock, Users, Building2, ChevronRight,
  ShieldAlert, CheckCircle2, XCircle, Banknote,
  Receipt, FileText, ArrowRight, Sparkles, Zap,
} from 'lucide-react'
import {
  useFinanceDashboard, useFinanceTopPayers, useFinanceInsights,
  useFinanceEfficiency, useFinanceEndOfDay,
  usePendingVerifications, useFinanceFraudAlerts, usePaymentProfile,
} from '@/lib/hooks/use-admin'
import {
  summarizeCollectionEfficiency,
  formatPaymentMethodLabel,
  formatEodReconciliationStatus,
  resolveFinanceDashboardDisplay,
  formatInsightLabel,
} from '@/lib/admin/finance-dashboard.utils'
import { formatMoney, formatInsightValue } from '@/lib/finance/currency'
import { LazyFinanceEfficiencyBarChart } from '@/components/charts/lazy'
import { KycStatusBadge } from '@/components/admin/students/student-finance-badges'
import { cn } from '@/lib/utils'

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.22, 1, 0.36, 1] } },
} satisfies Variants
const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.07 } } }

function Sk({ className }: { className?: string }) {
  return <div className={cn('rounded-2xl bg-zinc-200/50 animate-pulse', className)} />
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('') || '?'
}

/* ── Glass panel ───────────────────────────────────────────────────────────── */
function Panel({
  children, className, glow,
}: { children: React.ReactNode; className?: string; glow?: 'emerald' | 'violet' | 'amber' }) {
  const glowCls = glow === 'emerald'
    ? 'shadow-emerald-500/8'
    : glow === 'violet'
      ? 'shadow-violet-500/8'
      : glow === 'amber'
        ? 'shadow-amber-500/8'
        : 'shadow-slate-200/80'
  return (
    <div className={cn(
      'rounded-2xl border border-slate-200/90 bg-white/90 text-slate-900 backdrop-blur-sm',
      'shadow-lg shadow-slate-200/50 ring-1 ring-slate-100',
      glowCls,
      className,
    )}>
      {children}
    </div>
  )
}

function PanelHeader({
  icon: Icon, title, subtitle, accent = 'text-emerald-600', accentBg = 'bg-emerald-500/10',
}: {
  icon: React.ElementType
  title: string
  subtitle?: string
  accent?: string
  accentBg?: string
}) {
  return (
    <div className="flex items-start justify-between gap-3 px-6 py-5 border-b border-slate-100">
      <div className="flex items-center gap-3 min-w-0">
        <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center ring-1 ring-slate-200/80', accentBg)}>
          <Icon size={16} className={accent} />
        </div>
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-slate-900 tracking-tight">{title}</h3>
          {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
        </div>
      </div>
    </div>
  )
}

/* ── KPI tile (secondary row) ──────────────────────────────────────────────── */
function MetricTile({
  label, value, sub, icon: Icon, tone = 'zinc', href,
}: {
  label: string
  value: string | number
  sub?: string
  icon: React.ElementType
  tone?: 'emerald' | 'blue' | 'amber' | 'violet' | 'orange' | 'rose' | 'zinc'
  href?: string
}) {
  const tones = {
    emerald: { icon: 'text-emerald-600', bg: 'bg-emerald-500/10', ring: 'hover:ring-emerald-200' },
    blue: { icon: 'text-sky-600', bg: 'bg-sky-500/10', ring: 'hover:ring-sky-200' },
    amber: { icon: 'text-amber-600', bg: 'bg-amber-500/10', ring: 'hover:ring-amber-200' },
    violet: { icon: 'text-violet-600', bg: 'bg-violet-500/10', ring: 'hover:ring-violet-200' },
    orange: { icon: 'text-orange-600', bg: 'bg-orange-500/10', ring: 'hover:ring-orange-200' },
    rose: { icon: 'text-rose-600', bg: 'bg-rose-500/10', ring: 'hover:ring-rose-200' },
    zinc: { icon: 'text-zinc-600', bg: 'bg-zinc-500/10', ring: 'hover:ring-zinc-200' },
  }[tone]

  const inner = (
    <div className={cn(
      'group relative overflow-hidden rounded-2xl border border-slate-200/90 bg-white p-5',
      'shadow-sm ring-1 ring-slate-100 transition-all duration-300 hover:shadow-md hover:-translate-y-0.5',
      tones.ring,
    )}>
      <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-gradient-to-br from-slate-100 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
      <div className="relative flex items-start justify-between gap-3">
        <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center', tones.bg)}>
          <Icon size={18} className={tones.icon} />
        </div>
        {href && <ArrowRight size={14} className="text-slate-300 group-hover:text-slate-500 transition-colors mt-1" />}
      </div>
      <div className="relative mt-4">
        <p className="text-[11px] font-medium uppercase tracking-wider text-slate-400">{label}</p>
        <p className="text-xl font-bold text-slate-900 tabular-nums tracking-tight mt-1">{value}</p>
        {sub && <p className="text-xs text-slate-500 mt-1.5">{sub}</p>}
      </div>
    </div>
  )

  return href ? <Link href={href}>{inner}</Link> : inner
}

function QuickLink({ href, icon: Icon, label, count, gradient, vibrant }: {
  href: string
  icon: React.ElementType
  label: string
  count?: number
  gradient: string
  vibrant?: boolean
}) {
  return (
    <Link
      href={href}
      className={cn(
        'group flex items-center gap-3 rounded-xl border px-4 py-3.5 transition-all hover:-translate-y-0.5',
        vibrant
          ? 'border-white/80 bg-white/70 hover:bg-white hover:shadow-md hover:shadow-emerald-100/50 hover:border-emerald-200/80'
          : 'border-slate-200 bg-slate-50/80 hover:bg-white hover:shadow-sm hover:border-slate-300',
      )}
    >
      <div className={cn(
        'w-9 h-9 rounded-xl flex items-center justify-center text-white shadow-sm transition-transform group-hover:scale-105',
        gradient,
        vibrant && 'shadow-md',
      )}>
        <Icon size={15} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-slate-700 group-hover:text-slate-900">{label}</p>
      </div>
      {count !== undefined && count > 0 && (
        <span className="text-[11px] font-bold bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full tabular-nums">
          {count}
        </span>
      )}
      <ChevronRight size={14} className={cn(
        'transition-colors',
        vibrant ? 'text-emerald-300 group-hover:text-emerald-600' : 'text-slate-300 group-hover:text-slate-500',
      )} />
    </Link>
  )
}

/* ══════════════════════════════════════════════════════════════════════════ */

export default function FinanceDashboardPage() {
  const { data: kpis, isLoading } = useFinanceDashboard()
  const { data: topPayers = [] } = useFinanceTopPayers()
  const { data: insights } = useFinanceInsights()
  const { data: endOfDay } = useFinanceEndOfDay()
  const { data: efficiencyLevels = [] } = useFinanceEfficiency()
  const { data: pending = [] } = usePendingVerifications()
  const { data: alerts = [] } = useFinanceFraudAlerts()
  const { data: paymentProfile } = usePaymentProfile()

  const pendingCount = kpis?.pendingPayments ?? (pending as unknown[]).length
  const fraudCount = kpis?.fraudAlerts ?? (alerts as unknown[]).length

  const ins = insights as Record<string, unknown> | undefined
  const display = resolveFinanceDashboardDisplay(kpis, insights)
  const efficiencySummary = summarizeCollectionEfficiency(efficiencyLevels)
  const efficiencyChartData = efficiencyLevels.map((level) => ({
    levelName: level.levelName,
    efficiency: Math.round(level.efficiency),
    studentCount: level.studentCount,
    totalDue: level.totalDue,
  }))

  const remaining = Math.max(0, display.totalDue - display.totalPaid)
  const collectedPct = display.totalDue > 0 ? (display.totalPaid / display.totalDue) * 100 : 0
  const methodBreakdown = (endOfDay?.methods ?? [])
    .map((entry) => ({
      method: formatPaymentMethodLabel(entry.method),
      amount: entry.amount,
      count: entry.count,
      pct: endOfDay && endOfDay.total > 0 ? (entry.amount / endOfDay.total) * 100 : 0,
    }))
    .sort((a, b) => b.amount - a.amount)

  return (
    <div className="relative min-h-screen -m-4 sm:-m-6 lg:-m-8 p-4 sm:p-6 lg:p-8 bg-[#f4f6fa]">
      {/* Ambient background — soft SaaS mesh */}
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-[#f4f6fa]">
        <div className="absolute -top-32 right-[-10%] h-[420px] w-[420px] rounded-full bg-emerald-200/30 blur-3xl" />
        <div className="absolute top-[20%] -left-24 h-[360px] w-[360px] rounded-full bg-violet-200/25 blur-3xl" />
        <div className="absolute bottom-[-10%] right-[20%] h-[300px] w-[300px] rounded-full bg-sky-200/30 blur-3xl" />
      </div>

      <div className="mx-auto max-w-7xl space-y-8">

        {/* ── Hero ── */}
        <motion.section
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-slate-900 to-emerald-950 text-white shadow-2xl shadow-slate-900/20"
        >
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(16,185,129,0.18),_transparent_50%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,_rgba(99,102,241,0.12),_transparent_55%)]" />
          <div className="absolute inset-0 opacity-[0.03] bg-[linear-gradient(to_right,#fff_1px,transparent_1px),linear-gradient(to_bottom,#fff_1px,transparent_1px)] bg-[size:32px_32px]" />

          <div className="relative px-6 sm:px-8 pt-8 pb-6 sm:pb-8">
            <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-medium text-emerald-200/90 backdrop-blur-sm mb-4">
                  <Sparkles size={12} className="text-emerald-300" />
                  Centre financier · Temps réel
                </div>
                <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">Finance</h1>
                <p className="text-sm text-slate-400 mt-2 max-w-md">
                  Pilotage des encaissements, recouvrement et conformité de votre établissement.
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                {pendingCount > 0 && (
                  <Link
                    href="/admin/finance/paiements"
                    className="inline-flex items-center gap-2 rounded-xl border border-amber-400/30 bg-amber-500/10 px-4 py-2 text-xs font-semibold text-amber-100 hover:bg-amber-500/20 transition-colors"
                  >
                    <Clock size={14} />
                    {pendingCount} en attente
                  </Link>
                )}
                {fraudCount > 0 && (
                  <Link
                    href="/admin/finance/audit"
                    className="inline-flex items-center gap-2 rounded-xl border border-rose-400/30 bg-rose-500/10 px-4 py-2 text-xs font-semibold text-rose-100 hover:bg-rose-500/20 transition-colors"
                  >
                    <AlertTriangle size={14} />
                    {fraudCount} alerte{fraudCount > 1 ? 's' : ''}
                  </Link>
                )}
              </div>
            </div>

            {/* Hero metrics */}
            {isLoading ? (
              <div className="mt-8 grid grid-cols-2 lg:grid-cols-4 gap-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Sk key={i} className="h-28 bg-white/10" />
                ))}
              </div>
            ) : (
              <motion.div
                className="mt-8 grid grid-cols-2 lg:grid-cols-4 gap-px rounded-2xl overflow-hidden border border-white/10 bg-white/5 backdrop-blur-sm"
                variants={stagger}
                initial="hidden"
                animate="show"
              >
                {[
                  {
                    label: 'Encaissé',
                    value: formatMoney(display.totalPaid),
                    sub: `${collectedPct.toFixed(1)}% du volume`,
                    icon: DollarSign,
                  },
                  {
                    label: 'Restant dû',
                    value: formatMoney(remaining),
                    sub: display.totalDue > 0 ? `${(100 - collectedPct).toFixed(0)}% à recouvrer` : undefined,
                    icon: Wallet,
                  },
                  {
                    label: 'Taux recouvrement',
                    value: `${display.collectionRate.toFixed(1)}%`,
                    sub: `${efficiencySummary.totalStudents} élèves suivis`,
                    icon: TrendingUp,
                  },
                  {
                    label: 'Frais scolaires totaux',
                    value: formatMoney(display.totalFees),
                    sub: display.projectedRevenue > 0
                      ? `Projection ${formatMoney(display.projectedRevenue)}`
                      : 'Volume attendu (frais)',
                    icon: BarChart3,
                  },
                ].map((m) => (
                  <motion.div
                    key={m.label}
                    variants={fadeUp}
                    className="flex flex-col gap-2 px-5 sm:px-6 py-5 min-w-0 bg-white/[0.03] hover:bg-white/[0.06] transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <m.icon size={14} className="text-emerald-300/80 flex-shrink-0" />
                      <span className="text-[11px] font-medium uppercase tracking-wider text-slate-400 truncate">
                        {m.label}
                      </span>
                    </div>
                    <p className="text-xl sm:text-2xl font-bold tabular-nums tracking-tight text-white truncate">
                      {m.value}
                    </p>
                    {m.sub && <p className="text-[11px] text-slate-500 truncate">{m.sub}</p>}
                  </motion.div>
                ))}
              </motion.div>
            )}

            {/* Progress bar */}
            {!isLoading && display.totalDue > 0 && (
              <div className="mt-6 px-1">
                <div className="flex justify-between text-[11px] text-slate-500 mb-2">
                  <span>Progression de recouvrement</span>
                  <span className="font-semibold text-emerald-300">{collectedPct.toFixed(1)}%</span>
                </div>
                <div className="h-2 rounded-full bg-white/10 overflow-hidden">
                  <motion.div
                    className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-400"
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min(100, collectedPct)}%` }}
                    transition={{ duration: 1, ease: [0.22, 1, 0.36, 1], delay: 0.2 }}
                  />
                </div>
              </div>
            )}
          </div>
        </motion.section>

        {/* KYC banner */}
        {paymentProfile && paymentProfile.kycStatus !== 'VERIFIED' && (
          <Link href="/admin/finance/payment-profile">
            <Panel className="flex items-center justify-between gap-4 p-5 hover:ring-amber-200 transition-all group" glow="amber">
              <div className="flex items-center gap-4 min-w-0">
                <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-lg shadow-amber-500/20">
                  <Building2 size={20} className="text-white" />
                </div>
                <div>
                  <KycStatusBadge status={paymentProfile.kycStatus} onlineEnabled={paymentProfile.onlinePaymentsEnabled} />
                  <p className="text-sm text-slate-600 mt-1">Activez le profil marchand pour les paiements parents en ligne.</p>
                </div>
              </div>
              <ChevronRight size={18} className="text-slate-400 group-hover:text-amber-600 transition-colors flex-shrink-0" />
            </Panel>
          </Link>
        )}

        {/* Secondary metrics */}
        {!isLoading && (
          <motion.div
            className="grid grid-cols-2 lg:grid-cols-4 gap-4"
            variants={stagger}
            initial="hidden"
            animate="show"
          >
            <motion.div variants={fadeUp}>
              <MetricTile
                label="Paiements en attente"
                value={pendingCount}
                sub={pendingCount > 0 ? 'Validation requise' : 'Tout est à jour'}
                icon={Clock}
                tone="orange"
                href="/admin/finance/paiements"
              />
            </motion.div>
            <motion.div variants={fadeUp}>
              <MetricTile
                label="Alertes fraude"
                value={fraudCount}
                sub={fraudCount > 0 ? 'À examiner' : 'Aucune anomalie'}
                icon={ShieldAlert}
                tone="rose"
                href="/admin/finance/audit"
              />
            </motion.div>
            <motion.div variants={fadeUp}>
              <MetricTile
                label="Encaissé aujourd'hui"
                value={formatMoney(endOfDay?.total ?? 0)}
                sub={endOfDay ? `${endOfDay.count} transaction${endOfDay.count !== 1 ? 's' : ''}` : '—'}
                icon={Zap}
                tone="emerald"
              />
            </motion.div>
            <motion.div variants={fadeUp}>
              <MetricTile
                label="Moyenne par niveau"
                value={`${efficiencySummary.averageEfficiency.toFixed(1)}%`}
                sub={`${efficiencySummary.levelCount} niveau${efficiencySummary.levelCount !== 1 ? 'x' : ''}`}
                icon={TrendingUp}
                tone="blue"
              />
            </motion.div>
          </motion.div>
        )}

        {/* Main grid */}
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">

          {/* Top payers */}
          <motion.div
            className="xl:col-span-7"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
          >
            <Panel glow="emerald" className="overflow-hidden">
              <PanelHeader
                icon={Users}
                title="Meilleurs payeurs"
                subtitle="Classement par montant encaissé et score de fidélité"
              />
              {(topPayers as unknown[]).length === 0 ? (
                <div className="py-16 text-center">
                  <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-3">
                    <Users size={24} className="text-slate-300" />
                  </div>
                  <p className="text-sm text-slate-500">Aucun payeur enregistré</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {(topPayers as unknown as Record<string, unknown>[]).slice(0, 8).map((p, i) => {
                    const name = (p.studentName ?? p.fullName ?? `#${p.studentId}`) as string
                    const paid = Number(p.totalPaid ?? 0)
                    const score = p.score as number | undefined
                    return (
                      <div
                        key={(p.studentId as number) ?? i}
                        className="flex items-center justify-between gap-4 px-6 py-4 hover:bg-emerald-50/60 transition-colors group"
                      >
                        <div className="flex items-center gap-4 min-w-0">
                          <div className="relative flex-shrink-0">
                            <div className={cn(
                              'w-10 h-10 rounded-xl flex items-center justify-center text-xs font-bold',
                              i === 0 ? 'bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-md shadow-amber-500/25'
                                : i === 1 ? 'bg-gradient-to-br from-slate-300 to-slate-400 text-white'
                                : i === 2 ? 'bg-gradient-to-br from-orange-300 to-amber-400 text-white'
                                : 'bg-slate-100 text-slate-600',
                            )}>
                              {i < 3 ? i + 1 : initials(name)}
                            </div>
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-slate-900 truncate group-hover:text-emerald-800 transition-colors">
                              {name}
                            </p>
                            {(p.className as string | undefined) && (
                              <p className="text-xs text-slate-500 mt-0.5">{p.className as string}</p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-3 flex-shrink-0">
                          <span className="text-sm font-bold text-slate-800 tabular-nums">{formatMoney(paid)}</span>
                          {score !== undefined && (
                            <span className={cn(
                              'text-[11px] font-bold px-2.5 py-1 rounded-full tabular-nums',
                              score >= 95 ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600',
                            )}>
                              {score}
                            </span>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </Panel>
          </motion.div>

          {/* Sidebar */}
          <div className="xl:col-span-5 flex flex-col gap-6">

            {/* EOD */}
            {endOfDay && (
              <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
                <Panel glow="violet">
                  <PanelHeader icon={Clock} title="Résumé du jour" subtitle="Flux confirmés aujourd'hui" accent="text-violet-600" accentBg="bg-violet-500/10" />
                  <div className="px-6 py-5 space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="rounded-xl bg-slate-50 p-4 ring-1 ring-slate-100">
                        <p className="text-[10px] uppercase tracking-wider text-slate-400 font-medium">Encaissé</p>
                        <p className="text-lg font-bold text-slate-900 tabular-nums mt-1">{formatMoney(endOfDay.total)}</p>
                      </div>
                      <div className="rounded-xl bg-slate-50 p-4 ring-1 ring-slate-100">
                        <p className="text-[10px] uppercase tracking-wider text-slate-400 font-medium">Transactions</p>
                        <p className="text-lg font-bold text-slate-900 tabular-nums mt-1">{endOfDay.count}</p>
                      </div>
                    </div>
                    {endOfDay.methods.length > 0 && (
                      <div className="space-y-2">
                        {endOfDay.methods.slice(0, 4).map((entry) => (
                          <div key={entry.method} className="flex justify-between items-center text-xs">
                            <span className="text-slate-500">{formatPaymentMethodLabel(entry.method)}</span>
                            <span className="font-semibold text-slate-800 tabular-nums">
                              {formatMoney(entry.amount)} · {entry.count}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                    <div className={cn(
                      'flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-medium',
                      endOfDay.reconciliation.status === 'READY_FOR_DEPOSIT'
                        ? 'bg-emerald-50 text-emerald-700'
                        : 'bg-amber-50 text-amber-700',
                    )}>
                      {endOfDay.reconciliation.status === 'READY_FOR_DEPOSIT'
                        ? <CheckCircle2 size={14} />
                        : <XCircle size={14} />
                      }
                      {formatEodReconciliationStatus(endOfDay.reconciliation.status)}
                    </div>
                  </div>
                </Panel>
              </motion.div>
            )}

            {/* Recouvrement par niveau — style Power BI */}
            {efficiencyLevels.length > 0 && (
              <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
                <div className="relative overflow-hidden rounded-2xl border border-[#EDEBE9] bg-white shadow-sm ring-1 ring-slate-100">
                  <div className="absolute top-0 left-0 right-0 h-1 bg-[#118DFF]" />

                  <div className="flex items-center gap-3 px-5 py-4 border-b border-[#EDEBE9] bg-[#FAF9F8]">
                    <div className="w-9 h-9 rounded-lg bg-[#118DFF] flex items-center justify-center shadow-sm">
                      <TrendingUp size={16} className="text-white" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="text-sm font-semibold text-[#323130] tracking-tight">Recouvrement par niveau</h3>
                      <p className="text-xs text-[#605E5C] mt-0.5">Performance pondérée par classe</p>
                    </div>
                  </div>

                  <div className="px-5 py-4">
                    {/* KPI strip */}
                    <div className="grid grid-cols-3 gap-2 mb-4">
                      <div className="rounded-lg border border-[#EDEBE9] bg-[#FAF9F8] px-3 py-2.5">
                        <p className="text-[10px] uppercase tracking-wider text-[#605E5C] font-medium">Moyenne</p>
                        <p className="text-xl font-bold text-[#118DFF] tabular-nums mt-0.5">
                          {efficiencySummary.averageEfficiency.toFixed(1)}%
                        </p>
                      </div>
                      <div className="rounded-lg border border-[#EDEBE9] bg-[#FAF9F8] px-3 py-2.5">
                        <p className="text-[10px] uppercase tracking-wider text-[#605E5C] font-medium">Élèves</p>
                        <p className="text-xl font-bold text-[#323130] tabular-nums mt-0.5">
                          {efficiencySummary.totalStudents}
                        </p>
                      </div>
                      <div className="rounded-lg border border-[#EDEBE9] bg-[#FAF9F8] px-3 py-2.5">
                        <p className="text-[10px] uppercase tracking-wider text-[#605E5C] font-medium">Solde dû</p>
                        <p className="text-sm font-bold text-[#323130] tabular-nums mt-1 leading-tight">
                          {formatMoney(efficiencySummary.totalDue)}
                        </p>
                      </div>
                    </div>

                    <LazyFinanceEfficiencyBarChart data={efficiencyChartData} target={70} />
                  </div>
                </div>
              </motion.div>
            )}

            {/* F-06 — Payment methods (real data) */}
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.28 }}>
              <Panel glow="emerald">
                <PanelHeader
                  icon={DollarSign}
                  title="Méthodes de paiement"
                  subtitle="Répartition réelle depuis les transactions confirmées du jour"
                  accent="text-emerald-600"
                  accentBg="bg-emerald-500/10"
                />
                <div className="px-6 py-5 space-y-3">
                  {methodBreakdown.length === 0 ? (
                    <p className="text-sm text-slate-500">Aucune transaction confirmée aujourd'hui.</p>
                  ) : (
                    methodBreakdown.slice(0, 6).map((item) => (
                      <div key={item.method} className="space-y-1.5">
                        <div className="flex justify-between items-center text-xs">
                          <span className="text-slate-600">{item.method}</span>
                          <span className="font-semibold text-slate-900 tabular-nums">
                            {formatMoney(item.amount)} · {item.count} tx · {item.pct.toFixed(1)}%
                          </span>
                        </div>
                        <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-cyan-500"
                            style={{ width: `${Math.min(100, item.pct)}%` }}
                          />
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </Panel>
            </motion.div>

            {/* Insights */}
            {ins && (
              <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
                <Panel glow="violet">
                  <PanelHeader icon={BarChart3} title="Insights" subtitle="Indicateurs agrégés de l'établissement" accent="text-violet-600" accentBg="bg-violet-500/10" />
                  <div className="px-6 py-4 grid gap-2">
                    {Object.entries(ins)
                      .filter(([, v]) => v != null && typeof v !== 'object')
                      .slice(0, 5)
                      .map(([k, v]) => (
                        <div key={k} className="flex justify-between items-center rounded-xl bg-slate-50 px-4 py-3 ring-1 ring-slate-100">
                          <span className="text-xs text-slate-500">{formatInsightLabel(k)}</span>
                          <span className="text-sm font-semibold text-slate-900 tabular-nums">
                            {formatInsightValue(k, v)}
                          </span>
                        </div>
                      ))}
                  </div>
                </Panel>
              </motion.div>
            )}

            {/* Quick links — accent vif */}
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}>
              <div className="relative overflow-hidden rounded-2xl border border-emerald-200/80 bg-gradient-to-br from-emerald-50/90 via-white to-violet-50/60 shadow-lg shadow-emerald-100/40 ring-1 ring-emerald-100/80">
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-400 via-teal-400 to-violet-500" />
                <div className="absolute -top-12 -right-12 h-32 w-32 rounded-full bg-emerald-300/20 blur-2xl pointer-events-none" />
                <div className="absolute -bottom-8 -left-8 h-24 w-24 rounded-full bg-violet-300/20 blur-2xl pointer-events-none" />

                <div className="relative flex items-center gap-3 px-5 py-4 border-b border-emerald-100/80">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center shadow-md shadow-emerald-500/25 ring-2 ring-white">
                    <Zap size={18} className="text-white" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-sm font-bold text-slate-900 tracking-tight">Accès rapide</h3>
                    <p className="text-xs text-emerald-700/80 mt-0.5 font-medium">Raccourcis vers les modules finance</p>
                  </div>
                </div>

                <div className="relative px-3 py-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-1">
                  <QuickLink href="/admin/finance/paiements" icon={DollarSign} label="Paiements" count={pendingCount > 0 ? pendingCount : undefined} gradient="bg-gradient-to-br from-emerald-500 to-teal-600" vibrant />
                  <QuickLink href="/admin/finance/remboursements" icon={Receipt} label="Remboursements" gradient="bg-gradient-to-br from-indigo-500 to-blue-600" vibrant />
                  <QuickLink href="/admin/finance/factures" icon={FileText} label="Factures" gradient="bg-gradient-to-br from-sky-500 to-blue-600" vibrant />
                  <QuickLink href="/admin/finance/moratoriums" icon={Receipt} label="Moratoires" gradient="bg-gradient-to-br from-violet-500 to-purple-600" vibrant />
                  <QuickLink href="/admin/finance/audit" icon={ShieldAlert} label="Audit" count={fraudCount > 0 ? fraudCount : undefined} gradient="bg-gradient-to-br from-rose-500 to-red-600" vibrant />
                  <QuickLink href="/admin/finance/payment-profile" icon={Banknote} label="Profil paiement" gradient="bg-gradient-to-br from-amber-500 to-orange-600" vibrant />
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  )
}
