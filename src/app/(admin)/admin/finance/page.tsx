'use client'

import { motion, type Variants } from 'framer-motion'
import Link from 'next/link'
import {
  TrendingUp, DollarSign, AlertTriangle, Wallet,
  BarChart3, Clock, Users, Building2, ChevronRight,
  ShieldAlert, CheckCircle2, XCircle, Banknote,
  Receipt, FileText, ArrowRight,
} from 'lucide-react'
import {
  useFinanceDashboard, useFinanceTopPayers, useFinanceInsights,
  useFinanceEfficiency, useFinanceEndOfDay,
  usePendingVerifications, useFinanceFraudAlerts, usePaymentProfile,
  useFinanceComparativeDashboard,
} from '@/lib/hooks/use-admin'
import { KycStatusBadge } from '@/components/admin/students/student-finance-badges'
import { cn } from '@/lib/utils'

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.28, ease: 'easeOut' } },
} satisfies Variants
const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.06 } } }

const fmt = (n: number) =>
  new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'XOF', maximumFractionDigits: 0 }).format(n)

function Sk({ className }: { className?: string }) {
  return <div className={cn('rounded-xl bg-zinc-100 animate-pulse', className)} />
}

/* ── KPI card ──────────────────────────────────────────────────────────────── */
function KpiCard({
  label, value, sub, icon: Icon, color, bg, progress, trend, alert,
}: {
  label: string
  value: string | number
  sub?: string
  icon: React.ElementType
  color: string
  bg: string
  progress?: number
  trend?: { value: string; up: boolean }
  alert?: boolean
}) {
  return (
    <div className={cn(
      'bg-white rounded-2xl border shadow-sm p-5 flex flex-col gap-3',
      alert ? 'border-red-100' : 'border-zinc-100',
    )}>
      <div className="flex items-center justify-between">
        <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0', bg)}>
          <Icon size={16} className={color} />
        </div>
        {trend && (
          <span className={cn(
            'text-[11px] font-semibold px-2 py-0.5 rounded-full flex items-center gap-0.5',
            trend.up ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600',
          )}>
            {trend.up ? '↑' : '↓'} {trend.value}
          </span>
        )}
      </div>
      <div>
        <p className="text-xs text-zinc-400 mb-0.5">{label}</p>
        <p className="text-2xl font-bold text-zinc-900 tabular-nums leading-tight">{value}</p>
        {sub && <p className="text-xs text-zinc-400 mt-1">{sub}</p>}
      </div>
      {progress !== undefined && (
        <div>
          <div className="h-1.5 rounded-full bg-zinc-100 overflow-hidden">
            <div
              className={cn(
                'h-full rounded-full transition-all duration-700',
                progress >= 80 ? 'bg-emerald-500' : progress >= 50 ? 'bg-amber-400' : 'bg-red-500',
              )}
              style={{ width: `${Math.min(100, progress)}%` }}
            />
          </div>
          <div className="flex justify-between text-[10px] text-zinc-300 mt-0.5">
            <span>0%</span>
            <span className={cn(
              'font-semibold',
              progress >= 80 ? 'text-emerald-600' : progress >= 50 ? 'text-amber-500' : 'text-red-500',
            )}>
              {progress.toFixed(1)}%
            </span>
            <span>100%</span>
          </div>
        </div>
      )}
    </div>
  )
}

/* ── Quick link card ───────────────────────────────────────────────────────── */
function QuickLink({ href, icon: Icon, label, count, color }: {
  href: string; icon: React.ElementType; label: string; count?: number; color: string
}) {
  return (
    <Link
      href={href}
      className="flex items-center justify-between px-4 py-3 rounded-xl hover:bg-zinc-50 transition-colors border border-zinc-100 group"
    >
      <div className="flex items-center gap-3">
        <div className={cn('w-7 h-7 rounded-lg flex items-center justify-center', color)}>
          <Icon size={13} className="text-white" />
        </div>
        <span className="text-sm font-medium text-zinc-700 group-hover:text-zinc-900">{label}</span>
      </div>
      <div className="flex items-center gap-2">
        {count !== undefined && count > 0 && (
          <span className="text-xs font-bold bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full tabular-nums">{count}</span>
        )}
        <ArrowRight size={13} className="text-zinc-300 group-hover:text-zinc-500 transition-colors" />
      </div>
    </Link>
  )
}

/* ══════════════════════════════════════════════════════════════════════════ */

export default function FinanceDashboardPage() {
  const { data: kpis, isLoading } = useFinanceDashboard()
  const { data: topPayers = [] } = useFinanceTopPayers()
  const { data: insights } = useFinanceInsights()
  const { data: endOfDay } = useFinanceEndOfDay()
  const { data: efficiency } = useFinanceEfficiency()
  const { data: comparative } = useFinanceComparativeDashboard()
  const { data: pending = [] } = usePendingVerifications()
  const { data: alerts = [] } = useFinanceFraudAlerts()
  const { data: paymentProfile } = usePaymentProfile()

  const d = kpis as Record<string, unknown> | undefined
  const eod = endOfDay as Record<string, unknown> | undefined
  const eff = efficiency as Record<string, unknown> | undefined
  const ins = insights as Record<string, unknown> | undefined
  const comp = comparative as Record<string, unknown> | undefined

  const collectionRate = d?.collectionRate != null ? Number(d.collectionRate) : null
  const totalPaid = d?.totalPaid != null ? Number(d.totalPaid) : null
  const totalDue = d?.totalDue != null ? Number(d.totalDue) : null
  const totalRevenue = d?.totalRevenue != null ? Number(d.totalRevenue) : null
  const pendingCount = d?.pendingPayments != null ? Number(d.pendingPayments) : (pending as unknown[]).length
  const fraudCount = d?.fraudAlerts != null ? Number(d.fraudAlerts) : (alerts as unknown[]).length

  /* Trend helpers from comparative dashboard */
  const prevRate = comp?.previousCollectionRate != null ? Number(comp.previousCollectionRate) : null
  const rateTrend = collectionRate != null && prevRate != null
    ? { value: `${Math.abs(collectionRate - prevRate).toFixed(1)}%`, up: collectionRate >= prevRate }
    : undefined

  // Données sparkline simulées à partir des vraies valeurs (progression mensuelle indicative)
  const revenueSparkData = perf.monthlyRevenue
    ? Array.from({ length: 6 }, (_, i) =>
        Math.round(perf.monthlyRevenue * (0.6 + i * 0.08 + Math.random() * 0.05))
      )
    : []

  const collectionPct = perf.collectionEfficiency ?? 0

  // Mini barchart méthodes de paiement (depuis top payers si dispo, sinon placeholder)
  const methodData = [
    { method: 'Cash', pct: 45 },
    { method: 'Mobile', pct: 30 },
    { method: 'Carte', pct: 15 },
    { method: 'Virement', pct: 10 },
  ]

  return (
    <div className="space-y-6">

      {/* ── Header ── */}
      <motion.div
        className="flex items-center justify-between"
        initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}
      >
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">Finance</h1>
          <p className="text-sm text-zinc-500 mt-0.5">Tableau de bord financier de l'établissement</p>
        </div>
        <div className="flex items-center gap-2">
          {pendingCount > 0 && (
            <Link href="/admin/finance/paiements" className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-50 border border-amber-100 hover:bg-amber-100 transition-colors">
              <DollarSign size={13} className="text-amber-600" />
              <span className="text-xs font-semibold text-amber-700">{pendingCount} en attente</span>
            </Link>
          )}
          {fraudCount > 0 && (
            <Link href="/admin/finance/audit" className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-50 border border-red-100 hover:bg-red-100 transition-colors">
              <AlertTriangle size={13} className="text-red-600" />
              <span className="text-xs font-semibold text-red-700">{fraudCount} alerte{fraudCount > 1 ? 's' : ''}</span>
            </Link>
          )}
        </div>
      </motion.div>

      {/* ── Bannière KYC ── */}
      {paymentProfile && paymentProfile.kycStatus !== 'VERIFIED' && (
        <Link
          href="/admin/finance/payment-profile"
          className="flex items-center justify-between gap-4 p-4 rounded-2xl border border-amber-100 bg-amber-50/80 hover:bg-amber-50 transition-colors"
        >
          <div className="flex items-center gap-3 min-w-0">
            <Building2 size={18} className="text-amber-600 flex-shrink-0" />
            <div>
              <KycStatusBadge status={paymentProfile.kycStatus} onlineEnabled={paymentProfile.onlinePaymentsEnabled} />
              <p className="text-xs text-amber-800/80 mt-1">Configurez le profil marchand pour activer les paiements en ligne parents.</p>
            </div>
          </div>
          <ChevronRight size={16} className="text-amber-600 flex-shrink-0" />
        </Link>
      )}

      {/* ── KPI cards ── */}
      {isLoading ? (
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => <Sk key={i} className="h-32" />)}
        </div>
      ) : (
        <motion.div className="grid grid-cols-2 lg:grid-cols-3 gap-4" variants={stagger} initial="hidden" animate="show">
          <motion.div variants={fadeUp}>
            <KpiCard
              label="Total encaissé"
              value={totalPaid != null ? fmt(totalPaid) : '—'}
              icon={DollarSign}
              color="text-emerald-600"
              bg="bg-emerald-50"
              sub={totalDue != null && totalPaid != null ? `sur ${fmt(totalDue)} dû` : undefined}
            />
          </motion.div>

          <motion.div variants={fadeUp}>
            <KpiCard
              label="Taux de recouvrement"
              value={collectionRate != null ? `${collectionRate.toFixed(1)}%` : '—'}
              icon={TrendingUp}
              color="text-blue-600"
              bg="bg-blue-50"
              progress={collectionRate ?? undefined}
              trend={rateTrend}
            />
          </motion.div>

          <motion.div variants={fadeUp}>
            <KpiCard
              label="Restant dû"
              value={totalDue != null && totalPaid != null ? fmt(totalDue - totalPaid) : '—'}
              icon={Wallet}
              color="text-amber-600"
              bg="bg-amber-50"
              sub={totalDue != null && totalPaid != null && totalDue > 0
                ? `${(((totalDue - totalPaid) / totalDue) * 100).toFixed(0)}% non encaissé`
                : undefined
              }
            />
          </motion.div>

          <motion.div variants={fadeUp}>
            <KpiCard
              label="Revenus totaux"
              value={totalRevenue != null ? fmt(totalRevenue) : '—'}
              icon={BarChart3}
              color="text-violet-600"
              bg="bg-violet-50"
            />
          </motion.div>

          <motion.div variants={fadeUp}>
            <KpiCard
              label="Paiements en attente"
              value={pendingCount}
              icon={Clock}
              color="text-orange-600"
              bg="bg-orange-50"
              sub={pendingCount > 0 ? 'Nécessitent une validation' : 'Tout est à jour'}
            />
          </motion.div>

          <motion.div variants={fadeUp}>
            <KpiCard
              label="Alertes fraude"
              value={fraudCount}
              icon={AlertTriangle}
              color="text-red-600"
              bg="bg-red-50"
              sub={fraudCount > 0 ? 'Attention requise' : 'Aucune anomalie'}
              alert={fraudCount > 0}
            />
          </motion.div>
        </motion.div>
      )}

      {/* ── Contenu principal ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Col gauche — top payeurs ─────────────────────────────────────── */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-zinc-100 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-zinc-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users size={14} className="text-amber-500" />
              <h3 className="text-sm font-semibold text-zinc-900">Meilleurs payeurs</h3>
            </div>
            <span className="text-xs text-zinc-400">Score de fidélité</span>
          </div>
          {(topPayers as unknown[]).length === 0 ? (
            <div className="py-12 text-center">
              <Users size={28} className="mx-auto text-zinc-300 mb-2" />
              <p className="text-sm text-zinc-400">Aucun payeur</p>
            </div>
          ) : (
            <div className="divide-y divide-zinc-50">
              {(topPayers as unknown as Record<string, unknown>[]).slice(0, 8).map((p, i) => {
                const name = (p.studentName ?? p.fullName ?? `#${p.studentId}`) as string
                const paid = Number(p.totalPaid ?? 0)
                const score = p.score as number | undefined
                return (
                  <div key={(p.studentId as number) ?? i} className="flex items-center justify-between px-5 py-3 hover:bg-zinc-50 transition-colors">
                    <div className="flex items-center gap-3 min-w-0">
                      <span className={cn(
                        'w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0',
                        i === 0 ? 'bg-amber-100 text-amber-700'
                          : i === 1 ? 'bg-zinc-100 text-zinc-600'
                          : i === 2 ? 'bg-orange-50 text-orange-600'
                          : 'bg-zinc-50 text-zinc-400'
                      )}>
                        {i + 1}
                      </span>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-zinc-900 truncate">{name}</p>
                        {(p.className as string | undefined) && (
                          <p className="text-xs text-zinc-400">{p.className as string}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0">
                      <span className="text-sm font-semibold text-zinc-700 tabular-nums">{fmt(paid)}</span>
                      {score !== undefined && (
                        <span className={cn(
                          'text-xs font-bold px-2 py-0.5 rounded-full tabular-nums',
                          score >= 95 ? 'bg-emerald-50 text-emerald-700' : 'bg-zinc-100 text-zinc-500'
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
        </div>

        {/* Col droite — résumé + liens rapides ─────────────────────────── */}
        <div className="flex flex-col gap-4">

          {/* Résumé du jour */}
          {eod && (
            <div className="bg-white rounded-2xl border border-zinc-100 shadow-sm p-5">
              <div className="flex items-center gap-2 mb-4">
                <Clock size={14} className="text-indigo-500" />
                <h3 className="text-sm font-semibold text-zinc-900">Résumé du jour</h3>
              </div>
              <div className="space-y-2.5">
                {eod.totalToday != null && (
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-zinc-500">Encaissé aujourd'hui</span>
                    <span className="text-sm font-bold text-zinc-900 tabular-nums">{fmt(Number(eod.totalToday))}</span>
                  </div>
                )}
                {eod.transactionCount != null && (
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-zinc-500">Transactions</span>
                    <span className="text-sm font-semibold text-zinc-700 tabular-nums">{Number(eod.transactionCount)}</span>
                  </div>
                )}
                {eod.pendingCount != null && (
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-zinc-500">En attente</span>
                    <span className={cn(
                      'text-sm font-semibold tabular-nums',
                      Number(eod.pendingCount) > 0 ? 'text-amber-600' : 'text-zinc-700'
                    )}>
                      {Number(eod.pendingCount)}
                    </span>
                  </div>
                )}
                {eod.status != null && (
                  <div className="flex items-center gap-1.5 pt-1">
                    {String(eod.status).includes('READY') || String(eod.status).includes('OK')
                      ? <CheckCircle2 size={12} className="text-emerald-500" />
                      : <XCircle size={12} className="text-amber-500" />
                    }
                    <span className="text-xs text-zinc-500">{String(eod.status)}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Efficacité */}
          {eff && (
            <div className="bg-white rounded-2xl border border-zinc-100 shadow-sm p-5">
              <div className="flex items-center gap-2 mb-4">
                <TrendingUp size={14} className="text-emerald-500" />
                <h3 className="text-sm font-semibold text-zinc-900">Efficacité</h3>
              </div>
              <div className="space-y-2.5">
                {eff.rate != null && (
                  <div>
                    <div className="flex justify-between text-xs text-zinc-500 mb-1">
                      <span>Taux de collecte</span>
                      <span className="font-semibold">{Number(eff.rate).toFixed(1)}%</span>
                    </div>
                    <div className="h-2 rounded-full bg-zinc-100 overflow-hidden">
                      <div
                        className={cn(
                          'h-full rounded-full',
                          Number(eff.rate) >= 80 ? 'bg-emerald-500' : Number(eff.rate) >= 50 ? 'bg-amber-400' : 'bg-red-500'
                        )}
                        style={{ width: `${Math.min(100, Number(eff.rate))}%` }}
                      />
                    </div>
                  </div>
                )}
                {eff.onTime != null && (
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-zinc-500">Paiements à temps</span>
                    <span className="text-xs font-semibold text-zinc-700">{Number(eff.onTime).toFixed(0)}%</span>
                  </div>
                )}
                {eff.avgDaysLate != null && (
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-zinc-500">Retard moyen</span>
                    <span className="text-xs font-semibold text-zinc-700">{Number(eff.avgDaysLate).toFixed(0)} j</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Insights */}
          {ins && (
            <div className="bg-white rounded-2xl border border-zinc-100 shadow-sm p-5">
              <div className="flex items-center gap-2 mb-3">
                <BarChart3 size={14} className="text-violet-500" />
                <h3 className="text-sm font-semibold text-zinc-900">Insights</h3>
              </div>
              <div className="space-y-2">
                {Object.entries(ins)
                  .filter(([, v]) => v != null && typeof v !== 'object')
                  .slice(0, 5)
                  .map(([k, v]) => (
                    <div key={k} className="flex justify-between items-center py-1 border-b border-zinc-50 last:border-0">
                      <span className="text-xs text-zinc-500 capitalize">{k.replace(/([A-Z])/g, ' $1').toLowerCase()}</span>
                      <span className="text-xs font-semibold text-zinc-800 tabular-nums">
                        {typeof v === 'number' ? v.toLocaleString('fr-FR') : String(v)}
                      </span>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* Liens rapides */}
          <div className="bg-white rounded-2xl border border-zinc-100 shadow-sm p-4">
            <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-3">Accès rapide</p>
            <div className="space-y-1.5">
              <QuickLink href="/admin/finance/paiements" icon={DollarSign} label="Paiements" count={pendingCount > 0 ? pendingCount : undefined} color="bg-emerald-500" />
              <QuickLink href="/admin/finance/factures" icon={FileText} label="Factures" color="bg-blue-500" />
              <QuickLink href="/admin/finance/moratoriums" icon={Receipt} label="Moratoires" color="bg-violet-500" />
              <QuickLink href="/admin/finance/audit" icon={ShieldAlert} label="Audit" count={fraudCount > 0 ? fraudCount : undefined} color="bg-red-500" />
              <QuickLink href="/admin/finance/payment-profile" icon={Banknote} label="Profil paiement" color="bg-amber-500" />
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}
