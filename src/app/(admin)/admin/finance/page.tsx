'use client'

import { motion } from 'framer-motion'
import {
  TrendingUp, DollarSign, AlertTriangle, Wallet, ClipboardList,
  BarChart3, Clock, Users,
} from 'lucide-react'
import {
  useFinanceDashboard, useFinanceTopPayers, useFinanceInsights,
  useFinanceEfficiency, useFinanceEndOfDay,
  usePendingVerifications, useFinanceFraudAlerts,
} from '@/lib/hooks/use-admin'

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

function DataRows({ data }: { data: object }) {
  return (
    <div className="space-y-2">
      {Object.entries(data).map(([k, v]) => (
        <div key={k} className="flex items-center justify-between py-1.5 border-b border-zinc-50 last:border-0">
          <span className="text-xs text-zinc-500 capitalize">{k.replace(/([A-Z])/g, ' $1').toLowerCase()}</span>
          <span className="text-xs font-semibold text-zinc-800">
            {typeof v === 'number' ? Number(v).toLocaleString('fr-FR') : String(v)}
          </span>
        </div>
      ))}
    </div>
  )
}

export default function FinanceDashboardPage() {
  const { data: kpis, isLoading } = useFinanceDashboard()
  const { data: topPayers = [] } = useFinanceTopPayers()
  const { data: insights } = useFinanceInsights()
  const { data: endOfDay } = useFinanceEndOfDay()
  const { data: efficiency } = useFinanceEfficiency()
  const { data: pending = [] } = usePendingVerifications()
  const { data: alerts = [] } = useFinanceFraudAlerts()

  const d = kpis as any
  const ins = insights as any
  const eod = endOfDay as any
  const eff = efficiency as any

  return (
    <div className="space-y-6">
      <motion.div
        className="flex items-center justify-between"
        initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}
      >
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">Finance</h1>
          <p className="text-sm text-zinc-500 mt-0.5">Tableau de bord financier et gestion des paiements</p>
        </div>
        <div className="flex items-center gap-3">
          {(pending as any[]).length > 0 && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-50 border border-amber-100">
              <DollarSign size={13} className="text-amber-600" />
              <span className="text-xs font-medium text-amber-700">{(pending as any[]).length} en attente</span>
            </div>
          )}
          {(alerts as any[]).length > 0 && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-50 border border-red-100">
              <AlertTriangle size={13} className="text-red-600" />
              <span className="text-xs font-medium text-red-700">{(alerts as any[]).length} alertes</span>
            </div>
          )}
        </div>
      </motion.div>

      {isLoading ? (
        <div className="grid grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => <Sk key={i} className="h-28" />)}
        </div>
      ) : (
        <motion.div className="grid grid-cols-3 gap-4" variants={stagger} initial="hidden" animate="show">
          <motion.div variants={fadeUp}><KpiCard label="Total encaissé" value={d?.totalPaid != null ? `${Number(d.totalPaid).toLocaleString('fr-FR')} F` : '—'} icon={DollarSign} color="text-emerald-600" bg="bg-emerald-50" /></motion.div>
          <motion.div variants={fadeUp}><KpiCard label="Total dû" value={d?.totalDue != null ? `${Number(d.totalDue).toLocaleString('fr-FR')} F` : '—'} icon={Wallet} color="text-amber-600" bg="bg-amber-50" /></motion.div>
          <motion.div variants={fadeUp}><KpiCard label="Taux de recouvrement" value={d?.collectionRate != null ? `${Number(d.collectionRate).toFixed(1)}%` : '—'} icon={TrendingUp} color="text-blue-600" bg="bg-blue-50" /></motion.div>
          <motion.div variants={fadeUp}><KpiCard label="Revenus totaux" value={d?.totalRevenue != null ? `${Number(d.totalRevenue).toLocaleString('fr-FR')} F` : '—'} icon={BarChart3} color="text-violet-600" bg="bg-violet-50" /></motion.div>
          <motion.div variants={fadeUp}><KpiCard label="Paiements en attente" value={d?.pendingPayments ?? '—'} icon={ClipboardList} color="text-orange-600" bg="bg-orange-50" /></motion.div>
          <motion.div variants={fadeUp}><KpiCard label="Alertes fraude" value={d?.fraudAlerts ?? 0} icon={AlertTriangle} color="text-red-600" bg="bg-red-50" sub={d?.fraudAlerts > 0 ? 'Attention requise' : 'Aucune alerte'} /></motion.div>
        </motion.div>
      )}

      <div className="grid grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl border border-zinc-100 shadow-sm">
          <div className="px-5 py-4 border-b border-zinc-100">
            <h3 className="text-sm font-semibold text-zinc-900">Top payeurs</h3>
          </div>
          {(topPayers as any[]).length === 0 ? (
            <div className="py-12 text-center">
              <Users size={28} className="mx-auto text-zinc-300 mb-2" />
              <p className="text-sm text-zinc-400">Aucun payeur</p>
            </div>
          ) : (
            <div className="divide-y divide-zinc-50">
              {(topPayers as any[]).slice(0, 10).map((p, i) => (
                <div key={p.studentId ?? i} className="flex items-center justify-between px-5 py-3">
                  <div className="flex items-center gap-3">
                    <span className="w-6 h-6 rounded-full bg-zinc-100 flex items-center justify-center text-xs font-bold text-zinc-500">{i + 1}</span>
                    <div>
                      <p className="text-sm font-medium text-zinc-900">{p.studentName ?? p.fullName}</p>
                      {p.className && <p className="text-xs text-zinc-400">{p.className}</p>}
                    </div>
                  </div>
                  <span className="text-sm font-semibold text-emerald-700">{Number(p.totalPaid).toLocaleString('fr-FR')} F</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-4">
          {ins && (
            <div className="bg-white rounded-2xl border border-zinc-100 shadow-sm p-5">
              <h3 className="text-sm font-semibold text-zinc-900 mb-4">Insights</h3>
              <DataRows data={ins} />
            </div>
          )}
          {eod && (
            <div className="bg-white rounded-2xl border border-zinc-100 shadow-sm p-5">
              <div className="flex items-center gap-2 mb-4">
                <Clock size={14} className="text-zinc-400" />
                <h3 className="text-sm font-semibold text-zinc-900">Fin de journée</h3>
              </div>
              <DataRows data={eod} />
            </div>
          )}
          {eff && (
            <div className="bg-white rounded-2xl border border-zinc-100 shadow-sm p-5">
              <div className="flex items-center gap-2 mb-4">
                <TrendingUp size={14} className="text-zinc-400" />
                <h3 className="text-sm font-semibold text-zinc-900">Efficacité</h3>
              </div>
              <DataRows data={eff} />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
