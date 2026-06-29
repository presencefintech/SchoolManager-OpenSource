'use client'

import { useState } from 'react'
import { motion, type Variants } from 'framer-motion'
import { ShieldAlert, Search, AlertTriangle, CheckCircle, XCircle, RefreshCw, User } from 'lucide-react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { apiClient } from '@/lib/api/client'

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.28, ease: 'easeOut' } },
} satisfies Variants
const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.07 } } }

function useAdminFraudAlerts() {
  return useQuery({
    queryKey: ['admin', 'fraud-alerts-list'],
    queryFn: () => apiClient.get('/admin/fraud-alerts').then(r => r.data.data),
    staleTime: 60_000,
  })
}

function useCheckFraud() {
  return useMutation({
    mutationFn: (payload: { studentId: number; amount?: number }) =>
      apiClient.post('/admin/fraud/check', payload).then(r => r.data.data),
  })
}

const RISK_CFG: Record<string, { label: string; cls: string; icon: React.ElementType }> = {
  HIGH:   { label: 'Risque élevé',  cls: 'bg-red-50 text-red-700 border-red-100',    icon: XCircle },
  MEDIUM: { label: 'Risque moyen',  cls: 'bg-amber-50 text-amber-700 border-amber-100', icon: AlertTriangle },
  LOW:    { label: 'Risque faible', cls: 'bg-emerald-50 text-emerald-700 border-emerald-100', icon: CheckCircle },
}

export default function FraudPage() {
  const { data: alerts, isLoading: loadingAlerts, refetch } = useAdminFraudAlerts()
  const { mutateAsync: checkFraud, isPending, data: checkResult, reset } = useCheckFraud()

  const [form, setForm] = useState({ studentId: '', amount: '' })
  const [error, setError] = useState('')

  const alertList: any[] = Array.isArray(alerts) ? alerts : (alerts as any)?.data ?? []

  async function handleCheck(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    reset()
    try {
      await checkFraud({
        studentId: Number(form.studentId),
        amount: form.amount ? Number(form.amount) : undefined,
      })
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'Erreur lors de la vérification')
    }
  }

  return (
    <div className="px-8 py-8 space-y-6">
      <motion.div
        className="flex items-center justify-between"
        initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}
      >
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">Fraude & Sécurité</h1>
          <p className="text-sm text-zinc-500 mt-0.5">Détection des risques et alertes de sécurité</p>
        </div>
        <button
          onClick={() => refetch()}
          className="flex items-center gap-2 px-3 py-2 rounded-xl border border-zinc-200 text-sm text-zinc-500 hover:bg-zinc-50 transition-colors"
        >
          <RefreshCw size={14} />
          Actualiser
        </button>
      </motion.div>

      <div className="grid grid-cols-2 gap-6">
        {/* Vérification manuelle */}
        <motion.div variants={fadeUp} initial="hidden" animate="show" className="bg-white rounded-2xl border border-zinc-100 shadow-sm p-6">
          <div className="flex items-center gap-2 mb-5">
            <div className="w-8 h-8 rounded-xl bg-red-50 flex items-center justify-center">
              <ShieldAlert size={15} className="text-red-600" />
            </div>
            <h2 className="text-sm font-semibold text-zinc-900">Vérification de sécurité</h2>
          </div>

          <form onSubmit={handleCheck} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-zinc-500 mb-1">ID Élève <span className="text-red-500">*</span></label>
              <input
                type="number" required min={1}
                value={form.studentId}
                onChange={e => setForm(p => ({ ...p, studentId: e.target.value }))}
                placeholder="123"
                className="w-full px-3 py-2 rounded-lg border border-zinc-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-500 mb-1">Montant à vérifier (optionnel)</label>
              <input
                type="number" min={0}
                value={form.amount}
                onChange={e => setForm(p => ({ ...p, amount: e.target.value }))}
                placeholder="50000"
                className="w-full px-3 py-2 rounded-lg border border-zinc-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
              />
            </div>

            {error && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-red-50 border border-red-100">
                <XCircle size={13} className="text-red-500 flex-shrink-0" />
                <p className="text-xs text-red-700">{error}</p>
              </div>
            )}

            <button
              type="submit" disabled={isPending}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 text-sm text-white font-medium hover:bg-emerald-700 disabled:opacity-50 transition-colors"
            >
              <Search size={14} />
              {isPending ? 'Analyse...' : 'Analyser'}
            </button>
          </form>

          {/* Résultat */}
          {checkResult && (
            <motion.div
              initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
              className="mt-5 space-y-3"
            >
              {(() => {
                const level = (checkResult as any)?.riskLevel ?? (checkResult as any)?.level ?? 'LOW'
                const cfg = RISK_CFG[level] ?? RISK_CFG.LOW
                const Icon = cfg.icon
                return (
                  <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border ${cfg.cls}`}>
                    <Icon size={16} className="flex-shrink-0" />
                    <div>
                      <p className="text-sm font-semibold">{cfg.label}</p>
                      {(checkResult as any)?.reason && (
                        <p className="text-xs mt-0.5 opacity-80">{(checkResult as any).reason}</p>
                      )}
                    </div>
                  </div>
                )
              })()}

              {/* Détails */}
              {Object.entries(checkResult as any)
                .filter(([k]) => !['riskLevel', 'level', 'reason'].includes(k))
                .map(([k, v]) => (
                  <div key={k} className="flex items-center justify-between px-3 py-2 bg-zinc-50 rounded-lg">
                    <span className="text-xs text-zinc-500 capitalize">{k.replace(/([A-Z])/g, ' $1').toLowerCase()}</span>
                    <span className="text-xs font-semibold text-zinc-800">
                      {typeof v === 'boolean' ? (v ? 'Oui' : 'Non') : typeof v === 'number' ? Number(v).toLocaleString('fr-FR') : String(v ?? '—')}
                    </span>
                  </div>
                ))}
            </motion.div>
          )}
        </motion.div>

        {/* Alertes fraude */}
        <div className="bg-white rounded-2xl border border-zinc-100 shadow-sm">
          <div className="px-5 py-4 border-b border-zinc-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle size={14} className="text-amber-500" />
              <h2 className="text-sm font-semibold text-zinc-900">Alertes fraude</h2>
            </div>
            {alertList.length > 0 && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-red-50 text-red-700 font-medium border border-red-100">
                {alertList.length}
              </span>
            )}
          </div>

          {loadingAlerts ? (
            <div className="p-5 space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-12 rounded-xl bg-zinc-100 animate-pulse" />
              ))}
            </div>
          ) : alertList.length === 0 ? (
            <div className="py-12 text-center">
              <CheckCircle size={28} className="mx-auto text-emerald-300 mb-2" />
              <p className="text-sm text-zinc-400">Aucune alerte active</p>
            </div>
          ) : (
            <motion.div variants={stagger} initial="hidden" animate="show" className="divide-y divide-zinc-50">
              {alertList.map((alert: any, i: number) => {
                const level = alert.severity ?? alert.riskLevel ?? alert.level ?? 'LOW'
                const cfg = RISK_CFG[level] ?? RISK_CFG.LOW
                const Icon = cfg.icon
                return (
                  <motion.div key={alert.id ?? i} variants={fadeUp} className="flex items-start gap-3 px-5 py-4">
                    <div className={`w-7 h-7 rounded-lg border flex items-center justify-center flex-shrink-0 mt-0.5 ${cfg.cls}`}>
                      <Icon size={13} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-medium text-zinc-900 truncate">
                          {alert.type ?? alert.alertType ?? 'Alerte'}
                        </p>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full border font-medium flex-shrink-0 ${cfg.cls}`}>
                          {cfg.label}
                        </span>
                      </div>
                      {alert.description && (
                        <p className="text-xs text-zinc-400 mt-0.5 truncate">{alert.description}</p>
                      )}
                      <div className="flex items-center gap-3 mt-1">
                        {(alert.studentId || alert.student) && (
                          <span className="flex items-center gap-1 text-[10px] text-zinc-400">
                            <User size={10} />
                            {alert.student ? `${alert.student.firstName} ${alert.student.lastName}` : `#${alert.studentId}`}
                          </span>
                        )}
                        {alert.createdAt && (
                          <span className="text-[10px] text-zinc-300">
                            {new Date(alert.createdAt).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' })}
                          </span>
                        )}
                      </div>
                    </div>
                  </motion.div>
                )
              })}
            </motion.div>
          )}
        </div>
      </div>
    </div>
  )
}
