'use client'

import { motion } from 'framer-motion'
import {
  TrendingUp, DollarSign, AlertTriangle, Wallet, ClipboardList,
  BarChart3, CheckCircle, XCircle, Users, ShieldAlert, RefreshCw,
  TrendingDown, Target, Shield,
} from 'lucide-react'
import {
  useExecutiveDashboard, useDailyCashReport, useFinanceIntegrity,
  useDebtors, useHighRisk, useCollectionAnalytics,
} from '@/lib/hooks/use-finance'

const fadeUp = { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0, transition: { duration: 0.28, ease: 'easeOut' } } }
const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.07 } } }

function Sk({ className }: { className?: string }) {
  return <div className={`rounded-xl bg-zinc-100 animate-pulse ${className ?? ''}`} />
}

function KpiCard({ label, value, sub, icon: Icon, color, bg }: {
  label: string; value: string | number; sub?: string
  icon: React.ElementType; color: string; bg: string
}) {
  return (
    <div className="bg-white rounded-2xl border border-zinc-100 p-5 shadow-sm">
      <div className="flex items-center gap-3 mb-3">
        <div className={`w-9 h-9 rounded-xl ${bg} flex items-center justify-center flex-shrink-0`}>
          <Icon size={16} className={color} />
        </div>
        <p className="text-xs text-zinc-500">{label}</p>
      </div>
      <p className="text-2xl font-bold text-zinc-900">{value}</p>
      {sub && <p className="text-xs text-zinc-400 mt-1">{sub}</p>}
    </div>
  )
}

export default function FinanceDashboardPage() {
  const { data: kpis, isLoading, refetch } = useExecutiveDashboard()
  const { data: dailyCash = [] } = useDailyCashReport()
  const { data: integrity } = useFinanceIntegrity()
  const { data: debtorsData } = useDebtors(10)
  const { data: highRisk } = useHighRisk()
  const { data: collection } = useCollectionAnalytics()

  const d = kpis as any
  const perf = d?.performance
  const audit = d?.audit
  const treasury = d?.treasury
  const integ = integrity as any
  const coll = collection as any
  const debtors: any[] = (debtorsData as any)?.data ?? (Array.isArray(debtorsData) ? debtorsData : [])
  const risks: any[] = audit?.highRiskProfiles ?? (Array.isArray(highRisk) ? highRisk : (highRisk as any)?.data ?? [])
  const cash: any[] = Array.isArray(dailyCash) ? dailyCash : []

  const today = new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
  const totalCash = cash.reduce((acc, r) => acc + (Number(r._sum?.amount) || 0), 0)
  const totalTx = cash.reduce((acc, r) => acc + (r._count?.id || 0), 0)

  return (
    <div className="px-8 py-8 space-y-6">
      {/* Header */}
      <motion.div
        className="flex items-center justify-between"
        initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}
      >
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">Finance</h1>
          <p className="text-sm text-zinc-500 mt-0.5 capitalize">{today}</p>
        </div>
        <div className="flex items-center gap-2">
          {integ && (
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-medium ${
              integ.status === 'INTEGRITY_OK'
                ? 'bg-emerald-50 border-emerald-100 text-emerald-700'
                : 'bg-red-50 border-red-100 text-red-700'
            }`}>
              {integ.status === 'INTEGRITY_OK' ? <CheckCircle size={13} /> : <XCircle size={13} />}
              {integ.status === 'INTEGRITY_OK' ? 'Intégrité OK' : `${integ.anomalies?.length ?? 0} anomalie(s)`}
            </div>
          )}
          {audit?.suspiciousActivity && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-amber-100 bg-amber-50 text-xs font-medium text-amber-700">
              <ShieldAlert size={13} />
              Activité suspecte détectée
            </div>
          )}
          <button onClick={() => refetch()} className="p-2 rounded-xl border border-zinc-200 text-zinc-400 hover:bg-zinc-50 transition-colors">
            <RefreshCw size={14} />
          </button>
        </div>
      </motion.div>

      {/* KPIs Performance */}
      {isLoading ? (
        <div className="grid grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => <Sk key={i} className="h-28" />)}
        </div>
      ) : (
        <>
          <div>
            <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wide mb-3">Performance du mois</p>
            <motion.div className="grid grid-cols-3 gap-4" variants={stagger} initial="hidden" animate="show">
              <motion.div variants={fadeUp}>
                <KpiCard
                  label="Revenus du mois"
                  value={perf?.monthlyRevenue != null ? `${Number(perf.monthlyRevenue).toLocaleString('fr-FR')} F` : '—'}
                  icon={DollarSign} color="text-emerald-600" bg="bg-emerald-50"
                />
              </motion.div>
              <motion.div variants={fadeUp}>
                <KpiCard
                  label="Revenus projetés"
                  value={perf?.projectedRevenue != null ? `${Number(perf.projectedRevenue).toLocaleString('fr-FR')} F` : '—'}
                  icon={TrendingUp} color="text-blue-600" bg="bg-blue-50"
                />
              </motion.div>
              <motion.div variants={fadeUp}>
                <KpiCard
                  label="Efficacité recouvrement"
                  value={perf?.collectionEfficiency != null ? `${Number(perf.collectionEfficiency).toFixed(1)}%` : '—'}
                  icon={BarChart3} color="text-violet-600" bg="bg-violet-50"
                  sub={perf?.collectionEfficiency != null ? (Number(perf.collectionEfficiency) >= 80 ? 'Bon niveau' : 'À améliorer') : undefined}
                />
              </motion.div>
              <motion.div variants={fadeUp}>
                <KpiCard
                  label="ARPU (revenu/élève)"
                  value={perf?.arpu != null ? `${Number(perf.arpu).toLocaleString('fr-FR')} F` : '—'}
                  icon={Users} color="text-indigo-600" bg="bg-indigo-50"
                />
              </motion.div>
              <motion.div variants={fadeUp}>
                <KpiCard
                  label="Adoption digitale"
                  value={perf?.digitalAdoption != null ? `${Number(perf.digitalAdoption).toFixed(1)}%` : '—'}
                  icon={Target} color="text-cyan-600" bg="bg-cyan-50"
                />
              </motion.div>
              <motion.div variants={fadeUp}>
                <KpiCard
                  label="Vérifications en attente"
                  value={audit?.pendingVerifications ?? '—'}
                  icon={ClipboardList} color="text-orange-600" bg="bg-orange-50"
                  sub={audit?.pendingVerifications > 0 ? 'À traiter' : 'Aucune'}
                />
              </motion.div>
            </motion.div>
          </div>

          {/* Trésorerie */}
          <div>
            <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wide mb-3">Trésorerie</p>
            <motion.div className="grid grid-cols-3 gap-4" variants={stagger} initial="hidden" animate="show">
              <motion.div variants={fadeUp}>
                <KpiCard
                  label="Impayés totaux"
                  value={treasury?.totalUnpaid != null ? `${Number(treasury.totalUnpaid).toLocaleString('fr-FR')} F` : '—'}
                  icon={Wallet} color="text-red-600" bg="bg-red-50"
                />
              </motion.div>
              <motion.div variants={fadeUp}>
                <KpiCard
                  label="Estimation créances irrécouvrables"
                  value={treasury?.badDebtEstimate != null ? `${Number(treasury.badDebtEstimate).toFixed(1)}%` : '—'}
                  icon={TrendingDown} color="text-amber-600" bg="bg-amber-50"
                />
              </motion.div>
              <motion.div variants={fadeUp}>
                <KpiCard
                  label="DSO (jours)"
                  value={audit?.daysSalesOutstanding != null ? `${Number(audit.daysSalesOutstanding).toFixed(0)} j` : '—'}
                  icon={Shield} color="text-zinc-600" bg="bg-zinc-100"
                  sub="Délai moyen de recouvrement"
                />
              </motion.div>
            </motion.div>
          </div>
        </>
      )}

      {/* Rapport journalier + Top débiteurs */}
      <div className="grid grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl border border-zinc-100 shadow-sm">
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
              {cash.map((row: any, i: number) => (
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

        <div className="bg-white rounded-2xl border border-zinc-100 shadow-sm">
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
                <div key={dbtr.studentId ?? i} className="flex items-center justify-between px-5 py-3">
                  <div className="flex items-center gap-3">
                    <span className="w-5 h-5 rounded-full bg-red-50 flex items-center justify-center text-[10px] font-bold text-red-500">{i + 1}</span>
                    <div>
                      <p className="text-sm font-medium text-zinc-900">{dbtr.firstName} {dbtr.lastName}</p>
                      {dbtr.className && <p className="text-xs text-zinc-400">{dbtr.className}</p>}
                    </div>
                  </div>
                  <span className="text-sm font-semibold text-red-600">
                    {dbtr.balance != null ? `${Number(dbtr.balance).toLocaleString('fr-FR')} F` : '—'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Analytics de recouvrement */}
      {coll && Object.keys(coll).length > 0 && (
        <div className="bg-white rounded-2xl border border-zinc-100 shadow-sm">
          <div className="px-5 py-4 border-b border-zinc-100 flex items-center gap-2">
            <TrendingUp size={14} className="text-zinc-400" />
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

      {/* Profils à risque */}
      {risks.length > 0 && (
        <div className="bg-white rounded-2xl border border-zinc-100 shadow-sm">
          <div className="px-5 py-4 border-b border-zinc-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle size={14} className="text-amber-500" />
              <h3 className="text-sm font-semibold text-zinc-900">Profils à risque élevé</h3>
            </div>
            <span className="text-xs px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 font-medium">{risks.length}</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-100 bg-zinc-50/50">
                  <th className="text-left px-5 py-3 text-xs font-semibold text-zinc-500">Élève</th>
                  <th className="text-right px-5 py-3 text-xs font-semibold text-zinc-500">Impayés</th>
                  <th className="text-right px-5 py-3 text-xs font-semibold text-zinc-500">Présences suspectes</th>
                </tr>
              </thead>
              <tbody>
                {risks.map((r: any, i: number) => (
                  <tr key={i} className="border-b border-zinc-50 hover:bg-zinc-50/50">
                    <td className="px-5 py-3.5 font-medium text-zinc-900">{r.firstName} {r.lastName}</td>
                    <td className="px-5 py-3.5 text-right font-semibold text-red-600">
                      {r.tuitionBalance != null ? `${Number(r.tuitionBalance).toLocaleString('fr-FR')} F` : '—'}
                    </td>
                    <td className="px-5 py-3.5 text-right text-zinc-500">
                      {r._count?.presences ?? '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Audit Benford */}
      {audit && (
        <div className="bg-white rounded-2xl border border-zinc-100 shadow-sm p-5">
          <div className="flex items-center gap-2 mb-4">
            <Shield size={14} className="text-zinc-400" />
            <h3 className="text-sm font-semibold text-zinc-900">Audit d'intégrité financière</h3>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-zinc-50 rounded-xl p-4">
              <p className="text-xs text-zinc-500 mb-1">Loi de Benford</p>
              <div className={`flex items-center gap-1.5 ${audit.isBenfordValid ? 'text-emerald-600' : 'text-red-600'}`}>
                {audit.isBenfordValid ? <CheckCircle size={14} /> : <XCircle size={14} />}
                <span className="text-sm font-semibold">{audit.isBenfordValid ? 'Conforme' : 'Anomalie détectée'}</span>
              </div>
            </div>
            <div className="bg-zinc-50 rounded-xl p-4">
              <p className="text-xs text-zinc-500 mb-1">Activité suspecte</p>
              <div className={`flex items-center gap-1.5 ${audit.suspiciousActivity ? 'text-red-600' : 'text-emerald-600'}`}>
                {audit.suspiciousActivity ? <AlertTriangle size={14} /> : <CheckCircle size={14} />}
                <span className="text-sm font-semibold">{audit.suspiciousActivity ? 'Oui' : 'Non'}</span>
              </div>
            </div>
            <div className="bg-zinc-50 rounded-xl p-4">
              <p className="text-xs text-zinc-500 mb-1">Niveau de déviance</p>
              <p className="text-sm font-semibold text-zinc-900">
                {audit.devianceLevel != null ? `${Number(audit.devianceLevel).toFixed(2)}` : '—'}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
