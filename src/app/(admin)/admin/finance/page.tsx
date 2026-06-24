'use client'

import { useState } from 'react'
import {
  TrendingUp, DollarSign, AlertTriangle, Users, CheckCircle, XCircle,
  ClipboardList, Wallet, Search, RefreshCw, Send
} from 'lucide-react'
import {
  useFinanceDashboard, useFinanceTopPayers, useFinanceFraudAlerts,
  useFinanceAuditLogs, usePendingVerifications, useMobilePending,
  useProcessManualPayment, useVerifyPayment, useConfirmMobilePayment,
  useTriggerManualAudit
} from '@/lib/hooks/use-admin'
import type { ManualPaymentPayload } from '@/types/admin'

type Tab = 'dashboard' | 'paiements' | 'audit'

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

function ManualPaymentModal({ onClose }: { onClose: () => void }) {
  const { mutateAsync, isPending } = useProcessManualPayment()
  const [form, setForm] = useState<ManualPaymentPayload>({ studentId: 0, amount: 0, method: 'CASH' })
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    try {
      await mutateAsync(form)
      setSuccess(true)
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'Erreur lors de l\'enregistrement')
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 mx-4">
        <h2 className="text-lg font-semibold text-zinc-900 mb-5">Paiement manuel</h2>
        {success ? (
          <div className="text-center py-6">
            <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-3">
              <CheckCircle size={20} className="text-emerald-600" />
            </div>
            <p className="text-sm font-medium text-zinc-800">Paiement enregistré avec succès</p>
            <button onClick={onClose} className="mt-4 px-4 py-2 rounded-xl bg-emerald-600 text-sm text-white">Fermer</button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-zinc-500 mb-1">ID Élève *</label>
              <input
                type="number" required min={1}
                value={form.studentId || ''}
                onChange={e => setForm(p => ({ ...p, studentId: Number(e.target.value) }))}
                className="w-full px-3 py-2 rounded-lg border border-zinc-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-500 mb-1">Montant (FCFA) *</label>
              <input
                type="number" required min={1}
                value={form.amount || ''}
                onChange={e => setForm(p => ({ ...p, amount: Number(e.target.value) }))}
                className="w-full px-3 py-2 rounded-lg border border-zinc-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-500 mb-1">Mode de paiement *</label>
              <select
                value={form.method}
                onChange={e => setForm(p => ({ ...p, method: e.target.value as ManualPaymentPayload['method'] }))}
                className="w-full px-3 py-2 rounded-lg border border-zinc-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
              >
                <option value="CASH">Espèces</option>
                <option value="BANK_TRANSFER">Virement bancaire</option>
                <option value="MOBILE_MONEY">Mobile Money</option>
                <option value="CHEQUE">Chèque</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-500 mb-1">Note</label>
              <input
                value={form.note ?? ''}
                onChange={e => setForm(p => ({ ...p, note: e.target.value }))}
                placeholder="Optionnel"
                className="w-full px-3 py-2 rounded-lg border border-zinc-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
              />
            </div>
            {error && <p className="text-xs text-red-500 bg-red-50 rounded-lg px-3 py-2">{error}</p>}
            <div className="flex gap-2 pt-2">
              <button type="button" onClick={onClose} className="flex-1 px-4 py-2 rounded-xl border border-zinc-200 text-sm text-zinc-600 hover:bg-zinc-50">Annuler</button>
              <button type="submit" disabled={isPending} className="flex-1 px-4 py-2 rounded-xl bg-emerald-600 text-sm text-white font-medium hover:bg-emerald-700 disabled:opacity-50">
                {isPending ? 'Enregistrement...' : 'Enregistrer'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}

function DashboardTab() {
  const { data: kpis, isLoading } = useFinanceDashboard()
  const { data: topPayers = [] } = useFinanceTopPayers()

  if (isLoading) {
    return (
      <div className="grid grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="bg-white rounded-2xl border border-zinc-100 p-5 h-28 animate-pulse" />
        ))}
      </div>
    )
  }

  const d = kpis as any

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-3 gap-4">
        <KpiCard label="Total encaissé" value={d?.totalPaid != null ? `${Number(d.totalPaid).toLocaleString('fr-FR')} F` : '—'} icon={DollarSign} color="text-emerald-600" bg="bg-emerald-50" />
        <KpiCard label="Total dû" value={d?.totalDue != null ? `${Number(d.totalDue).toLocaleString('fr-FR')} F` : '—'} icon={Wallet} color="text-amber-600" bg="bg-amber-50" />
        <KpiCard label="Taux recouvrement" value={d?.collectionRate != null ? `${Number(d.collectionRate).toFixed(1)}%` : '—'} icon={TrendingUp} color="text-blue-600" bg="bg-blue-50" />
        <KpiCard label="Revenus totaux" value={d?.totalRevenue != null ? `${Number(d.totalRevenue).toLocaleString('fr-FR')} F` : '—'} icon={DollarSign} color="text-violet-600" bg="bg-violet-50" />
        <KpiCard label="Paiements en attente" value={d?.pendingPayments ?? '—'} icon={ClipboardList} color="text-orange-600" bg="bg-orange-50" />
        <KpiCard label="Alertes fraude" value={d?.fraudAlerts ?? 0} icon={AlertTriangle} color="text-red-600" bg="bg-red-50" sub={d?.fraudAlerts > 0 ? 'Attention requise' : 'Aucune alerte'} />
      </div>

      {topPayers.length > 0 && (
        <div className="bg-white rounded-2xl border border-zinc-100 shadow-sm">
          <div className="px-5 py-4 border-b border-zinc-100">
            <h3 className="text-sm font-semibold text-zinc-900">Top payeurs</h3>
          </div>
          <div className="divide-y divide-zinc-50">
            {topPayers.slice(0, 10).map((p, i) => (
              <div key={p.studentId} className="flex items-center justify-between px-5 py-3">
                <div className="flex items-center gap-3">
                  <span className="w-6 h-6 rounded-full bg-zinc-100 flex items-center justify-center text-xs font-bold text-zinc-500">{i + 1}</span>
                  <div>
                    <p className="text-sm font-medium text-zinc-900">{p.studentName}</p>
                    {p.className && <p className="text-xs text-zinc-400">{p.className}</p>}
                  </div>
                </div>
                <span className="text-sm font-semibold text-emerald-700">{p.totalPaid.toLocaleString('fr-FR')} F</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function PaiementsTab() {
  const { data: pending = [], refetch: refetchPending } = usePendingVerifications()
  const { data: mobilePending = [], refetch: refetchMobile } = useMobilePending()
  const { mutate: verify, isPending: verifying } = useVerifyPayment()
  const { mutate: confirmMobile, isPending: confirming } = useConfirmMobilePayment()
  const [showManual, setShowManual] = useState(false)
  const [search, setSearch] = useState('')

  const filteredPending = pending.filter(p =>
    !search || p.studentName.toLowerCase().includes(search.toLowerCase()) || p.reference?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="relative flex-1 max-w-sm">
          <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Rechercher un paiement..."
            className="w-full pl-9 pr-4 py-2 bg-white border border-zinc-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
          />
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => { refetchPending(); refetchMobile() }}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-zinc-200 text-xs text-zinc-600 hover:bg-zinc-50"
          >
            <RefreshCw size={12} />
            Actualiser
          </button>
          <button
            onClick={() => setShowManual(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 text-sm text-white font-medium hover:bg-emerald-700 shadow-sm"
          >
            <DollarSign size={14} />
            Paiement manuel
          </button>
        </div>
      </div>

      {/* Verifications en attente */}
      <div className="bg-white rounded-2xl border border-zinc-100 shadow-sm">
        <div className="px-5 py-4 border-b border-zinc-100 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-zinc-900">Vérifications en attente</h3>
          <span className="text-xs px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 font-medium">{pending.length}</span>
        </div>
        {filteredPending.length === 0 ? (
          <div className="p-10 text-center">
            <CheckCircle size={28} className="mx-auto text-zinc-300 mb-2" />
            <p className="text-sm text-zinc-400">Aucun paiement en attente</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-100 bg-zinc-50/50">
                <th className="text-left px-5 py-3 text-xs font-semibold text-zinc-500">Élève</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-zinc-500">Montant</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-zinc-500">Méthode</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-zinc-500">Référence</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-zinc-500">Date</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody>
              {filteredPending.map(p => (
                <tr key={p.id} className="border-b border-zinc-50 hover:bg-zinc-50/50">
                  <td className="px-5 py-3.5 font-medium text-zinc-900">{p.studentName}</td>
                  <td className="px-5 py-3.5 text-zinc-700 font-medium">{p.amount.toLocaleString('fr-FR')} F</td>
                  <td className="px-5 py-3.5">
                    <span className="text-xs px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-600">{p.method}</span>
                  </td>
                  <td className="px-5 py-3.5 text-zinc-400 font-mono text-xs">{p.reference ?? '—'}</td>
                  <td className="px-5 py-3.5 text-zinc-400 text-xs">
                    {new Date(p.createdAt).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' })}
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-1">
                      <button
                        disabled={verifying}
                        onClick={() => verify({ paymentId: p.id, step: 'approve' })}
                        className="p-1.5 rounded-lg text-emerald-600 hover:bg-emerald-50 disabled:opacity-50 transition-colors"
                        title="Valider"
                      >
                        <CheckCircle size={14} />
                      </button>
                      <button
                        disabled={verifying}
                        onClick={() => verify({ paymentId: p.id, step: 'reject' })}
                        className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 disabled:opacity-50 transition-colors"
                        title="Rejeter"
                      >
                        <XCircle size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Mobile Money en attente */}
      {mobilePending.length > 0 && (
        <div className="bg-white rounded-2xl border border-zinc-100 shadow-sm">
          <div className="px-5 py-4 border-b border-zinc-100 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-zinc-900">Mobile Money en attente</h3>
            <span className="text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 font-medium">{mobilePending.length}</span>
          </div>
          <div className="divide-y divide-zinc-50">
            {mobilePending.map(m => (
              <div key={m.id} className="flex items-center justify-between px-5 py-3.5">
                <div>
                  <p className="text-sm font-medium text-zinc-900">{m.studentName}</p>
                  <p className="text-xs text-zinc-400">{m.operator} · {m.phone} · réf: {m.reference ?? '—'}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-semibold text-zinc-900">{m.amount.toLocaleString('fr-FR')} F</span>
                  <button
                    disabled={confirming}
                    onClick={() => confirmMobile(m.id)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 text-xs text-white font-medium hover:bg-blue-700 disabled:opacity-50"
                  >
                    <CheckCircle size={11} />
                    Confirmer
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {showManual && <ManualPaymentModal onClose={() => setShowManual(false)} />}
    </div>
  )
}

function AuditTab() {
  const { data: alerts = [] } = useFinanceFraudAlerts()
  const { data: logs = [] } = useFinanceAuditLogs()
  const { mutate: triggerAudit, isPending: auditing } = useTriggerManualAudit()

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <button
          onClick={() => triggerAudit()}
          disabled={auditing}
          className="flex items-center gap-2 px-4 py-2 rounded-xl border border-zinc-200 text-sm text-zinc-700 hover:bg-zinc-50 disabled:opacity-50"
        >
          <Send size={13} />
          {auditing ? 'Audit en cours...' : 'Déclencher audit manuel'}
        </button>
      </div>

      {/* Alertes fraude */}
      <div className="bg-white rounded-2xl border border-zinc-100 shadow-sm">
        <div className="px-5 py-4 border-b border-zinc-100 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-zinc-900">Alertes fraude</h3>
          {alerts.length > 0 && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-red-50 text-red-700 font-medium">{alerts.length}</span>
          )}
        </div>
        {alerts.length === 0 ? (
          <div className="p-10 text-center">
            <CheckCircle size={28} className="mx-auto text-emerald-300 mb-2" />
            <p className="text-sm text-zinc-400">Aucune alerte fraude</p>
          </div>
        ) : (
          <div className="divide-y divide-zinc-50">
            {alerts.map(alert => (
              <div key={alert.id} className="px-5 py-4 flex items-start gap-3">
                <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${alert.severity === 'HIGH' ? 'bg-red-500' : alert.severity === 'MEDIUM' ? 'bg-amber-500' : 'bg-zinc-400'}`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${alert.severity === 'HIGH' ? 'bg-red-50 text-red-700' : alert.severity === 'MEDIUM' ? 'bg-amber-50 text-amber-700' : 'bg-zinc-100 text-zinc-500'}`}>
                      {alert.severity}
                    </span>
                    <span className="text-xs font-medium text-zinc-700">{alert.type}</span>
                    {alert.studentName && <span className="text-xs text-zinc-500">{alert.studentName}</span>}
                  </div>
                  <p className="text-xs text-zinc-500 mt-1">{alert.description}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  {alert.amount != null && <p className="text-sm font-semibold text-zinc-900">{alert.amount.toLocaleString('fr-FR')} F</p>}
                  <p className="text-xs text-zinc-400">{new Date(alert.createdAt).toLocaleDateString('fr-FR')}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Journal d'audit */}
      <div className="bg-white rounded-2xl border border-zinc-100 shadow-sm">
        <div className="px-5 py-4 border-b border-zinc-100">
          <h3 className="text-sm font-semibold text-zinc-900">Journal d'audit</h3>
        </div>
        {logs.length === 0 ? (
          <div className="p-10 text-center">
            <ClipboardList size={28} className="mx-auto text-zinc-300 mb-2" />
            <p className="text-sm text-zinc-400">Aucun événement d'audit</p>
          </div>
        ) : (
          <div className="divide-y divide-zinc-50">
            {logs.map(log => (
              <div key={log.id} className="px-5 py-3.5 flex items-start gap-3">
                <div className="w-2 h-2 rounded-full bg-zinc-300 mt-1.5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-zinc-700 uppercase tracking-wide">{log.action}</span>
                    <span className="text-xs text-zinc-400">{log.resource}</span>
                    {log.actorEmail && <span className="text-xs text-zinc-400">· {log.actorEmail}</span>}
                  </div>
                  {log.description && <p className="text-xs text-zinc-500 mt-0.5">{log.description}</p>}
                </div>
                <span className="text-xs text-zinc-400 flex-shrink-0">
                  {new Date(log.createdAt).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' })}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default function FinancePage() {
  const [tab, setTab] = useState<Tab>('dashboard')
  const { data: pending = [] } = usePendingVerifications()
  const { data: alerts = [] } = useFinanceFraudAlerts()

  return (
    <div className="min-h-screen bg-zinc-50/50">
      <div className="max-w-6xl mx-auto px-6 py-8 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-zinc-900">Finance</h1>
            <p className="text-sm text-zinc-500 mt-0.5">Tableau de bord financier et gestion des paiements</p>
          </div>
          <div className="flex items-center gap-3">
            {pending.length > 0 && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-50 border border-amber-100">
                <DollarSign size={13} className="text-amber-600" />
                <span className="text-xs font-medium text-amber-700">{pending.length} en attente</span>
              </div>
            )}
            {alerts.length > 0 && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-50 border border-red-100">
                <AlertTriangle size={13} className="text-red-600" />
                <span className="text-xs font-medium text-red-700">{alerts.length} alertes</span>
              </div>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-zinc-100 p-1 rounded-xl w-fit">
          {([
            ['dashboard', 'Dashboard', undefined],
            ['paiements', 'Paiements', pending.length],
            ['audit', 'Audit & Fraude', alerts.length],
          ] as [Tab, string, number | undefined][]).map(([t, label, badge]) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`relative px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${tab === t ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-500 hover:text-zinc-700'}`}
            >
              {label}
              {badge != null && badge > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
                  {badge > 9 ? '9+' : badge}
                </span>
              )}
            </button>
          ))}
        </div>

        {tab === 'dashboard' && <DashboardTab />}
        {tab === 'paiements' && <PaiementsTab />}
        {tab === 'audit' && <AuditTab />}
      </div>
    </div>
  )
}
