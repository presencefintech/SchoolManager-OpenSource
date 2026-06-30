'use client'

import { motion } from 'framer-motion'
import {
  DollarSign, ClipboardList, CheckCircle, Users,
  RotateCcw, Banknote, RefreshCw, AlertTriangle, CalendarCheck, ShieldCheck, TrendingUp,
} from 'lucide-react'
import {
  useGuichetDashboard, useDailyCashReport, useDebtors, useCollectionAnalytics,
  useExecutiveDashboard, useFinanceIntegrity,
} from '@/lib/hooks/use-finance'
import { fadeUp, stagger } from '@/lib/animations'
import { Skeleton } from '@/components/ui/skeleton'
import type { DailyCashEntry, ExecutiveDashboard, IntegrityReport } from '@/types/finance'

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
  const { data: guichet, isLoading, refetch } = useGuichetDashboard()
  const { data: dailyCash = [] } = useDailyCashReport()
  const { data: debtorsData } = useDebtors(10)
  const { data: collection } = useCollectionAnalytics()
  const { data: execData } = useExecutiveDashboard()
  const { data: integrityData } = useFinanceIntegrity()

  const g = guichet as any
  const cash: DailyCashEntry[] = Array.isArray(dailyCash) ? (dailyCash as DailyCashEntry[]) : []
  const exec = execData as ExecutiveDashboard | undefined
  const integrity = integrityData as IntegrityReport | undefined

  const debtors: any[] = (debtorsData as any)?.data ?? (Array.isArray(debtorsData) ? debtorsData : [])
  const coll = collection as any

  const totalCash = cash.reduce((acc, r) => acc + (Number(r._sum?.amount) || 0), 0)
  const totalTx = cash.reduce((acc, r) => acc + (r._count?.id || 0), 0)

  const today = typeof window !== 'undefined'
    ? new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
    : ''

  return (
    <div className="min-h-full bg-[#f5f7fb] px-8 py-8 space-y-6">
      {/* Header */}
      <motion.div
        className="flex items-center justify-between"
        initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}
      >
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">Finance</h1>
          <p className="text-sm text-zinc-500 mt-0.5 capitalize" suppressHydrationWarning>{today}</p>
        </div>
        <div className="flex items-center gap-2">
          {g?.closingFinalizedToday && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-emerald-100 bg-emerald-50 text-xs font-medium text-emerald-700">
              <CalendarCheck size={13} /> Clôture finalisée
            </div>
          )}
          {g?.openCashSession && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-blue-100 bg-blue-50 text-xs font-medium text-blue-700">
              <Banknote size={13} /> Session ouverte
            </div>
          )}
          <button onClick={() => refetch()} className="p-2 rounded-xl border border-zinc-200 text-zinc-400 hover:bg-zinc-50 transition-colors">
            <RefreshCw size={14} />
          </button>
        </div>
      </motion.div>

      {/* KPIs guichet */}
      {isLoading ? (
        <div className="grid grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-28" />)}
        </div>
      ) : (
        <>
          <div>
            <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wide mb-3">Aujourd'hui</p>
            <motion.div className="grid grid-cols-3 gap-4" variants={stagger} initial="hidden" animate="show">
              <motion.div variants={fadeUp}>
                <KpiCard
                  label="Encaissements du jour"
                  value={g?.collectionsToday?.total != null ? `${Number(g.collectionsToday.total).toLocaleString('fr-FR')} F` : '—'}
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
                  sub={g?.approvedRefundsAwaitingProcess > 0 ? `${g.approvedRefundsAwaitingProcess} approuvé(s) à traiter` : undefined}
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
                  label="Top débiteurs (> 10 F)"
                  value={debtors.length}
                  sub={debtors.length > 0 ? `${debtors.reduce((a, d) => a + (Number(d.feesBalance) || 0), 0).toLocaleString('fr-FR')} F total` : 'Aucun'}
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

      {/* Encaissements par méthode + Top débiteurs */}
      <div className="grid grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl border border-zinc-200/70 shadow-[0_1px_4px_rgba(0,0,0,0.06)]">
          <div className="px-5 py-4 border-b border-zinc-100 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-zinc-900">Encaissements du jour</h3>
            {totalCash > 0 && (
              <span className="text-xs font-semibold text-emerald-700">{totalCash.toLocaleString('fr-FR')} F total</span>
            )}
          </div>
          {cash.length === 0 ? (
            <div className="py-10 text-center">
              <DollarSign size={24} className="mx-auto text-zinc-300 mb-2" />
              <p className="text-sm text-zinc-400">Aucun encaissement aujourd'hui</p>
            </div>
          ) : (
            <div className="divide-y divide-zinc-50">
              {cash.map((row, i) => (
                <div key={i} className="flex items-center justify-between px-5 py-3">
                  <div>
                    <p className="text-sm font-medium text-zinc-900">{row.method ?? '—'}</p>
                    <p className="text-xs text-zinc-400">{row._count?.id ?? 0} transaction(s)</p>
                  </div>
                  <span className="text-sm font-semibold text-emerald-700">
                    {row._sum?.amount != null ? `${Number(row._sum.amount).toLocaleString('fr-FR')} F` : '—'}
                  </span>
                </div>
              ))}
              <div className="flex items-center justify-between px-5 py-3 bg-zinc-50/60">
                <p className="text-sm font-semibold text-zinc-700">Total — {totalTx} tx</p>
                <span className="text-sm font-bold text-emerald-700">{totalCash.toLocaleString('fr-FR')} F</span>
              </div>
            </div>
          )}
        </div>

        <div className="bg-white rounded-2xl border border-zinc-200/70 shadow-[0_1px_4px_rgba(0,0,0,0.06)]">
          <div className="px-5 py-4 border-b border-zinc-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users size={14} className="text-zinc-400" />
              <h3 className="text-sm font-semibold text-zinc-900">Top débiteurs</h3>
            </div>
            {debtors.length > 0 && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-red-50 text-red-700 font-medium">{debtors.length}</span>
            )}
          </div>
          {debtors.length === 0 ? (
            <div className="py-10 text-center">
              <CheckCircle size={24} className="mx-auto text-emerald-300 mb-2" />
              <p className="text-sm text-zinc-400">Aucun débiteur</p>
            </div>
          ) : (
            <div className="divide-y divide-zinc-50">
              {debtors.slice(0, 8).map((dbtr: any, i: number) => (
                <div key={dbtr.id ?? i} className="flex items-center justify-between px-5 py-3">
                  <div className="flex items-center gap-3">
                    <span className="w-5 h-5 rounded-full bg-red-50 flex items-center justify-center text-[10px] font-bold text-red-500">{i + 1}</span>
                    <div>
                      <p className="text-sm font-medium text-zinc-900">{dbtr.firstName} {dbtr.lastName}</p>
                      {dbtr.class?.name && <p className="text-xs text-zinc-400">{dbtr.class.name}</p>}
                    </div>
                  </div>
                  <span className="text-sm font-semibold text-red-600">
                    {dbtr.feesBalance != null ? `${Number(dbtr.feesBalance).toLocaleString('fr-FR')} F` : '—'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Encaissements par méthode (guichet) */}
      {g?.collectionsToday?.byMethod?.length > 0 && (
        <div className="bg-white rounded-2xl border border-zinc-100 shadow-sm">
          <div className="px-5 py-4 border-b border-zinc-100 flex items-center gap-2">
            <Banknote size={14} className="text-zinc-400" />
            <h3 className="text-sm font-semibold text-zinc-900">Détail par méthode (aujourd'hui)</h3>
          </div>
          <div className={`grid grid-cols-${Math.min(g.collectionsToday.byMethod.length, 4)} divide-x divide-zinc-100`}>
            {g.collectionsToday.byMethod.map((m: any) => (
              <div key={m.method} className="px-5 py-4">
                <p className="text-xs text-zinc-500 mb-1">{m.method}</p>
                <p className="text-lg font-bold text-zinc-900">{Number(m.amount).toLocaleString('fr-FR')} F</p>
                <p className="text-xs text-zinc-400">{m.count} tx</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Analytics de recouvrement */}
      {coll && Object.keys(coll).length > 0 && (
        <div className="bg-white rounded-2xl border border-zinc-200/70 shadow-[0_1px_4px_rgba(0,0,0,0.06)]">
          <div className="px-5 py-4 border-b border-zinc-100 flex items-center gap-2">
            <AlertTriangle size={14} className="text-zinc-400" />
            <h3 className="text-sm font-semibold text-zinc-900">Analytics de recouvrement</h3>
          </div>
          <div className="grid grid-cols-4 gap-0 divide-x divide-zinc-100">
            {Object.entries(coll).filter(([, v]) => v !== null && v !== undefined && typeof v !== 'object').map(([k, v]) => (
              <div key={k} className="px-5 py-4">
                <p className="text-xs text-zinc-500 capitalize mb-1">{k.replace(/([A-Z])/g, ' $1').toLowerCase()}</p>
                <p className="text-lg font-bold text-zinc-900">
                  {typeof v === 'number' ? Number(v).toLocaleString('fr-FR') : String(v)}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

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
                      ['Revenus du mois', `${Number(exec.performance.monthlyRevenue).toLocaleString('fr-FR')} F`],
                      ['Revenu projeté', `${Number(exec.performance.projectedRevenue).toLocaleString('fr-FR')} F`],
                      ['Taux de recouvrement', `${Number(exec.performance.collectionEfficiency).toFixed(1)} %`],
                      ['ARPU', `${Number(exec.performance.arpu).toLocaleString('fr-FR')} F`],
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
                      <span className="font-semibold text-red-600">{Number(exec.treasury.totalUnpaid).toLocaleString('fr-FR')} F</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-zinc-500">Estimation créances douteuses</span>
                      <span className="font-semibold text-amber-600">{Number(exec.treasury.badDebtEstimate).toLocaleString('fr-FR')} F</span>
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
                  integrity.status === 'OK' || integrity.status === 'ok'
                    ? 'bg-emerald-50 border border-emerald-100'
                    : 'bg-amber-50 border border-amber-100'
                }`}>
                  <ShieldCheck size={16} className={integrity.status === 'OK' || integrity.status === 'ok' ? 'text-emerald-600' : 'text-amber-500'} />
                  <div>
                    <p className={`text-sm font-semibold ${integrity.status === 'OK' || integrity.status === 'ok' ? 'text-emerald-700' : 'text-amber-700'}`}>
                      Statut : {integrity.status}
                    </p>
                    {(!integrity.anomalies || integrity.anomalies.length === 0) && (
                      <p className="text-xs text-emerald-600">Aucune anomalie détectée</p>
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
                {integrity.anomalies && integrity.anomalies.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-zinc-100">
                    <p className="text-xs font-semibold text-red-600 mb-2">{integrity.anomalies.length} anomalie(s) détectée(s)</p>
                    <div className="space-y-1 max-h-28 overflow-y-auto">
                      {integrity.anomalies.map((a, i) => (
                        <div key={i} className="text-xs text-zinc-500 bg-red-50 rounded px-2 py-1">
                          {typeof a === 'string' ? a : JSON.stringify(a)}
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
