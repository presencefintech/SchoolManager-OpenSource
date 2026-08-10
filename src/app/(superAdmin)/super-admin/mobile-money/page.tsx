'use client'

import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import {
  Smartphone, RefreshCw, Loader2, CheckCircle2,
  AlertTriangle, Clock, XCircle,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useRouter } from 'next/navigation'
import { monitoringApi } from '@/lib/superAdmin/api/monitoring.api'
import { formatMoney } from '@/lib/finance/currency'

const CARD = 'bg-white rounded-2xl border border-zinc-200 shadow-[0_2px_12px_rgba(0,0,0,0.06)] p-6'
const INPUT = 'w-full border border-zinc-200 rounded-xl px-3 py-2.5 text-sm text-zinc-700 focus:outline-none focus:ring-2 focus:ring-indigo-200 placeholder:text-zinc-300'
const LABEL = 'block text-xs font-medium text-zinc-500 mb-1.5'
const BTN = 'flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-xl disabled:opacity-40 transition-colors'
const SKELETON = 'bg-zinc-100 rounded-xl animate-pulse'

type Feedback = { type: 'success' | 'error'; message: string } | null

function CardTitle({ icon: Icon, title, desc }: { icon: React.ElementType; title: string; desc: string }) {
  return (
    <div className="flex items-start gap-3 mb-5">
      <div className="w-9 h-9 rounded-xl bg-zinc-100 flex items-center justify-center flex-shrink-0">
        <Icon size={16} className="text-zinc-500" />
      </div>
      <div>
        <h2 className="text-sm font-semibold text-zinc-900">{title}</h2>
        <p className="text-xs text-zinc-400 mt-0.5">{desc}</p>
      </div>
    </div>
  )
}

function FeedbackBanner({ state }: { state: Feedback }) {
  if (!state) return null
  return (
    <div className={cn(
      'flex items-start gap-2 rounded-xl px-4 py-3 text-sm mt-3',
      state.type === 'success' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'
    )}>
      {state.type === 'success'
        ? <CheckCircle2 size={14} className="mt-0.5 flex-shrink-0" />
        : <XCircle size={14} className="mt-0.5 flex-shrink-0" />
      }
      {state.message}
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    PENDING:   'bg-amber-50 text-amber-700 border-amber-100',
    COMPLETED: 'bg-emerald-50 text-emerald-700 border-emerald-100',
    FAILED:    'bg-red-50 text-red-600 border-red-100',
    CANCELLED: 'bg-zinc-100 text-zinc-500 border-zinc-200',
  }
  return (
    <span className={cn(
      'inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold border',
      colors[status] ?? 'bg-zinc-50 text-zinc-500 border-zinc-100'
    )}>
      {status}
    </span>
  )
}

export function MobileMoneyView({ embedded = false }: { embedded?: boolean }) {
  const [reconcileId, setReconcileId] = useState('')
  const [providerRef, setProviderRef] = useState('')
  const [reconciling, setReconciling] = useState(false)
  const [reconcileFeedback, setReconcileFeedback] = useState<Feedback>(null)

  const { data: pending = [], isLoading: loadingPending, refetch: refetchPending } = useQuery({
    queryKey: ['superadmin', 'mm', 'metrics'],
    queryFn: monitoringApi.getMobileMoneyMetrics,
    refetchInterval: 30_000,
  })

  const { data: radarItems = [], isLoading: loadingRadar } = useQuery({
    queryKey: ['superadmin', 'mm', 'fraud-radar'],
    queryFn: monitoringApi.getFraudRadar,
    refetchInterval: 60_000,
  })

  const handleReconcile = async () => {
    if (!reconcileId) return
    setReconciling(true)
    setReconcileFeedback(null)
    try {
      const r = await monitoringApi.reconcilePayment(
        Number(reconcileId),
        providerRef.trim() || undefined,
      )
      setReconcileFeedback({ type: 'success', message: r.message ?? `Paiement #${reconcileId} réconcilié (enrollment #${r.enrollmentId})` })
      setReconcileId('')
      setProviderRef('')
      refetchPending()
    } catch {
      setReconcileFeedback({ type: 'error', message: 'Erreur lors de la réconciliation' })
    } finally {
      setReconciling(false)
    }
  }

  return (
    <div className={embedded ? 'bg-transparent' : 'min-h-screen bg-zinc-50'}>
      {!embedded ? (
        <motion.div
          className="bg-white border-b border-zinc-200"
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
        >
          <div className="max-w-6xl mx-auto px-8 py-6">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-indigo-50 flex items-center justify-center">
                <Smartphone size={17} className="text-indigo-500" />
              </div>
              <div>
                <h1 className="text-3xl font-semibold text-zinc-900 tracking-tight">Mobile Money</h1>
                <p className="text-sm text-zinc-400 mt-0.5">Paiements en attente, radar fraude, réconciliation manuelle</p>
              </div>
            </div>
          </div>
        </motion.div>
      ) : null}

      <div className={cn('max-w-6xl mx-auto px-8 py-8 grid grid-cols-1 lg:grid-cols-2 gap-5', embedded && 'py-6')}>
        <div className={CARD}>
          <CardTitle icon={RefreshCw} title="Réconciliation manuelle" desc="Forcer la réconciliation d'un paiement Mobile Money" />
          <div className="space-y-3">
            <div>
              <label className={LABEL}>ID du paiement</label>
              <input
                type="number"
                placeholder="Ex: 391"
                value={reconcileId}
                onChange={(e) => setReconcileId(e.target.value)}
                className={INPUT}
              />
            </div>
            <div>
              <label className={LABEL}>Référence provider <span className="text-zinc-300 font-normal">(optionnel)</span></label>
              <input
                type="text"
                placeholder="Ex: MM_TXN_XXXX"
                value={providerRef}
                onChange={(e) => setProviderRef(e.target.value)}
                className={INPUT}
              />
            </div>
            <button
              onClick={handleReconcile}
              disabled={reconciling || !reconcileId}
              className={cn(BTN, 'bg-indigo-600 text-white hover:bg-indigo-700')}
            >
              {reconciling ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
              Réconcilier
            </button>
            <FeedbackBanner state={reconcileFeedback} />
          </div>
        </div>

        <div className={CARD}>
          <CardTitle icon={AlertTriangle} title="Radar fraude Mobile Money" desc="Transactions MM à risque — tous établissements" />
          {loadingRadar ? (
            <div className="space-y-2">
              {[...Array(4)].map((_, i) => <div key={i} className={cn(SKELETON, 'h-14')} />)}
            </div>
          ) : radarItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 gap-2 text-zinc-300">
              <CheckCircle2 size={32} />
              <p className="text-sm">Aucune transaction suspecte détectée</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
              {radarItems.map((item) => (
                <div key={item.id} className="border border-zinc-100 rounded-xl p-3 hover:bg-zinc-50 transition-colors">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-zinc-700">
                        {formatMoney(item.payment.amount)}
                        <span className="ml-1 font-mono text-zinc-400 text-[11px]">· {item.payment.method}</span>
                      </p>
                      <p className="text-[11px] text-zinc-400 truncate mt-0.5">{item.payment.school.name}</p>
                    </div>
                    <div className="flex-shrink-0 text-right">
                      <span className={cn(
                        'text-xs font-bold tabular-nums',
                        item.fraudScore >= 0.7 ? 'text-red-600' : item.fraudScore >= 0.4 ? 'text-amber-600' : 'text-emerald-600'
                      )}>
                        {(item.fraudScore * 100).toFixed(0)} %
                      </span>
                      <p className="text-[10px] text-zinc-300 flex items-center justify-end gap-0.5 mt-0.5">
                        <Clock size={9} />
                        {new Date(item.createdAt).toLocaleDateString('fr-FR')}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className={cn(CARD, 'lg:col-span-2')}>
          <CardTitle icon={Smartphone} title="Paiements Mobile Money en attente" desc="Toutes les transactions MM non finalisées" />
          {loadingPending ? (
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => <div key={i} className={cn(SKELETON, 'h-12')} />)}
            </div>
          ) : pending.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 gap-2 text-zinc-300">
              <CheckCircle2 size={32} />
              <p className="text-sm">Aucun paiement en attente</p>
            </div>
          ) : (
            <div className="border border-zinc-100 rounded-xl overflow-hidden">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-zinc-50 text-zinc-400 text-left">
                    <th className="px-4 py-2.5 font-medium">ID</th>
                    <th className="px-4 py-2.5 font-medium">Montant</th>
                    <th className="px-4 py-2.5 font-medium">Méthode</th>
                    <th className="px-4 py-2.5 font-medium">Établissement</th>
                    <th className="px-4 py-2.5 font-medium">Statut</th>
                    <th className="px-4 py-2.5 font-medium">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {pending.map((p) => (
                    <tr key={p.id} className="hover:bg-zinc-50 transition-colors">
                      <td className="px-4 py-2.5 font-mono text-zinc-500">{p.id}</td>
                      <td className="px-4 py-2.5 font-semibold text-zinc-700">
                        {formatMoney(p.amount)}
                      </td>
                      <td className="px-4 py-2.5 font-mono uppercase text-zinc-500">{p.method}</td>
                      <td className="px-4 py-2.5 text-zinc-500 truncate max-w-[180px]">{p.school.name}</td>
                      <td className="px-4 py-2.5"><StatusBadge status={p.status} /></td>
                      <td className="px-4 py-2.5 text-zinc-400">
                        <span className="flex items-center gap-1">
                          <Clock size={10} />
                          {new Date(p.createdAt).toLocaleDateString('fr-FR')}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default function MobileMoneyPage() {
  const router = useRouter()
  useEffect(() => {
    router.replace('/super-admin/operations?tab=mobile-money')
  }, [router])
  return (
    <div className="min-h-[40vh] flex items-center justify-center text-sm text-zinc-400">
      Redirection vers le centre opérations…
    </div>
  )
}
