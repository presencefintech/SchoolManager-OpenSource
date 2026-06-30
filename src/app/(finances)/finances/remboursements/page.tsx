'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { RefreshCw, Plus, CheckCircle, RefreshCcw, RotateCcw } from 'lucide-react'
import {
  useRefunds, useCreateRefund, useProcessRefund, useSyncRefundGateway,
  useStudentConfirmedPayments,
} from '@/lib/hooks/use-finance'
import { FinanceStudentSearchField } from '@/components/finances/student-search-field'
import { fadeUp } from '@/lib/animations'
import { getApiErrorMessage } from '@/lib/api/client'
import { Skeleton } from '@/components/ui/skeleton'
import type { RefundRequest } from '@/types/finance'

const STATUS_CFG: Record<string, { label: string; cls: string }> = {
  PENDING:    { label: 'En attente',  cls: 'bg-amber-50 text-amber-700' },
  APPROVED:   { label: 'Approuvé',    cls: 'bg-sky-50 text-sky-700' },
  REJECTED:   { label: 'Rejeté',      cls: 'bg-red-50 text-red-700' },
  PROCESSING: { label: 'En cours',    cls: 'bg-violet-50 text-violet-700' },
  PROCESSED:  { label: 'Traité',      cls: 'bg-emerald-50 text-emerald-700' },
  FAILED:     { label: 'Échoué',      cls: 'bg-red-100 text-red-800' },
  CANCELLED:  { label: 'Annulé',      cls: 'bg-zinc-100 text-zinc-500' },
  SYNCED:     { label: 'Synchronisé', cls: 'bg-blue-50 text-blue-700' },
}

function CreateRefundModal({ onClose }: { onClose: () => void }) {
  const { mutateAsync, isPending } = useCreateRefund()
  const [studentId, setStudentId] = useState(0)
  const [form, setForm] = useState({ paymentId: 0, amount: '', reason: '' })
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const { data: payments = [], isFetching: loadingPayments } = useStudentConfirmedPayments(studentId)

  function handlePaymentSelect(e: React.ChangeEvent<HTMLSelectElement>) {
    const id = Number(e.target.value)
    const pmt = payments.find(p => p.id === id)
    setForm(prev => ({
      ...prev,
      paymentId: id,
      amount: pmt ? String(pmt.amount) : prev.amount,
    }))
  }

  function handleStudentChange(id: number) {
    setStudentId(id)
    setForm(prev => ({ ...prev, paymentId: 0, amount: '' }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!studentId) { setError('Sélectionnez un élève'); return }
    if (!form.paymentId) { setError('Sélectionnez un paiement'); return }
    setError(null)
    try {
      await mutateAsync({
        paymentId: form.paymentId,
        amount: Number(form.amount),
        reason: form.reason,
      })
      setSuccess(true)
    } catch (err) {
      setError(getApiErrorMessage(err))
    }
  }

  const selectedPayment = payments.find(p => p.id === form.paymentId)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 mx-4">
        <h2 className="text-lg font-semibold text-zinc-900 mb-5">Nouvelle demande de remboursement</h2>
        {success ? (
          <div className="text-center py-6">
            <CheckCircle size={20} className="mx-auto text-emerald-600 mb-2" />
            <p className="text-sm text-zinc-800">Demande créée avec succès</p>
            <button onClick={onClose} className="mt-4 px-4 py-2 rounded-xl bg-emerald-600 text-sm text-white">Fermer</button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <FinanceStudentSearchField
              studentId={studentId}
              onSelect={handleStudentChange}
              label="Élève *"
              required
            />

            {studentId > 0 && (
              <div>
                <label className="block text-xs font-medium text-zinc-500 mb-1">
                  Paiement à rembourser *
                </label>
                {loadingPayments ? (
                  <div className="w-full px-3 py-2 rounded-lg border border-zinc-200 text-sm text-zinc-400">
                    Chargement des paiements…
                  </div>
                ) : payments.length === 0 ? (
                  <div className="w-full px-3 py-2 rounded-lg border border-amber-200 bg-amber-50 text-sm text-amber-700">
                    Aucun paiement confirmé pour cet élève
                  </div>
                ) : (
                  <select
                    required
                    value={form.paymentId || ''}
                    onChange={handlePaymentSelect}
                    className="w-full px-3 py-2 rounded-lg border border-zinc-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 bg-white"
                  >
                    <option value="">-- Sélectionner un paiement --</option>
                    {payments.map(p => (
                      <option key={p.id} value={p.id}>
                        #{p.id} · {Number(p.amount).toLocaleString('fr-FR')} F
                        {p.method ? ` · ${p.method}` : ''}
                        {p.reference ? ` · ${p.reference}` : ''}
                        {` · ${new Date(p.createdAt).toLocaleDateString('fr-FR')}`}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            )}

            {form.paymentId > 0 && (
              <div>
                <label className="block text-xs font-medium text-zinc-500 mb-1">
                  Montant à rembourser (FCFA) *
                  {selectedPayment && (
                    <span className="ml-1 text-zinc-400">
                      (max {Number(selectedPayment.amount).toLocaleString('fr-FR')} F)
                    </span>
                  )}
                </label>
                <input
                  type="number" required min={1}
                  max={selectedPayment?.amount}
                  value={form.amount}
                  onChange={e => setForm(p => ({ ...p, amount: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg border border-zinc-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
                />
              </div>
            )}

            {(form.paymentId > 0) && (
              <div>
                <label className="block text-xs font-medium text-zinc-500 mb-1">Motif *</label>
                <textarea required value={form.reason}
                  onChange={e => setForm(p => ({ ...p, reason: e.target.value }))}
                  rows={2}
                  className="w-full px-3 py-2 rounded-lg border border-zinc-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 resize-none"
                />
              </div>
            )}

            {error && <p className="text-xs text-red-500 bg-red-50 rounded-lg px-3 py-2">{error}</p>}
            <div className="flex gap-2 pt-2">
              <button type="button" onClick={onClose}
                className="flex-1 px-4 py-2 rounded-xl border border-zinc-200 text-sm text-zinc-600 hover:bg-zinc-50">
                Annuler
              </button>
              <button type="submit" disabled={isPending || !form.paymentId}
                className="flex-1 px-4 py-2 rounded-xl bg-emerald-600 text-sm text-white font-medium disabled:opacity-50">
                {isPending ? 'Création…' : 'Créer'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}

export default function RemboursementsPage() {
  const [statusFilter, setStatusFilter] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const { data: refundsData, isLoading, refetch } = useRefunds({ status: statusFilter || undefined })
  const { mutate: process, isPending: processing } = useProcessRefund()
  const { mutate: sync, isPending: syncing } = useSyncRefundGateway()

  const refunds: RefundRequest[] = (refundsData as any)?.items ?? (Array.isArray(refundsData) ? refundsData : [])

  return (
    <div className="px-8 py-8 space-y-6">
      <motion.div
        className="flex items-center justify-between"
        initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}
      >
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">Remboursements</h1>
          <p className="text-sm text-zinc-500 mt-0.5">Gestion des demandes de remboursement</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => refetch()} className="p-2 rounded-xl border border-zinc-200 text-zinc-400 hover:bg-zinc-50">
            <RefreshCw size={14} />
          </button>
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 text-sm text-white font-medium hover:bg-emerald-700"
          >
            <Plus size={14} /> Nouveau remboursement
          </button>
        </div>
      </motion.div>

      {/* Filtres */}
      <div className="flex gap-1 bg-zinc-100 p-1 rounded-xl w-fit">
        {[['', 'Tous'], ['PENDING', 'En attente'], ['APPROVED', 'Approuvés'], ['PROCESSING', 'En cours'], ['PROCESSED', 'Traités'], ['FAILED', 'Échoués']].map(([v, l]) => (
          <button key={v} onClick={() => setStatusFilter(v)}
            className={`px-3 py-1 rounded-lg text-sm font-medium transition-all ${statusFilter === v ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-500 hover:text-zinc-700'}`}>
            {l}
          </button>
        ))}
      </div>

      {/* Table */}
      <motion.div variants={fadeUp} initial="hidden" animate="show" className="bg-white rounded-2xl border border-zinc-100 shadow-sm">
        <div className="px-5 py-4 border-b border-zinc-100 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-zinc-900">Liste des remboursements</h2>
          <span className="text-xs px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-500 font-medium">{(refundsData as any)?.total ?? refunds.length}</span>
        </div>

        {isLoading ? (
          <div className="p-5 space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12" />)}</div>
        ) : refunds.length === 0 ? (
          <div className="py-12 text-center">
            <RotateCcw size={24} className="mx-auto text-zinc-300 mb-2" />
            <p className="text-sm text-zinc-400">Aucun remboursement</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-100 bg-zinc-50/50">
                <th className="text-left px-5 py-3 text-xs font-semibold text-zinc-500">Élève</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-zinc-500">Montant</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-zinc-500">Motif</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-zinc-500">Statut</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-zinc-500">Date</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody>
              {refunds.map((r) => {
                const cfg = STATUS_CFG[r.status] ?? { label: r.status, cls: 'bg-zinc-100 text-zinc-500' }
                return (
                  <tr key={r.id} className="border-b border-zinc-50 hover:bg-zinc-50/50">
                    <td className="px-5 py-3.5 font-medium text-zinc-900">
                      <span>{r.payment?.studentName ?? '—'}</span>
                      {r.payment?.matricule && <span className="block text-xs text-zinc-400">{r.payment.matricule}</span>}
                    </td>
                    <td className="px-5 py-3.5 font-semibold text-zinc-800">{Number(r.amount).toLocaleString('fr-FR')} F</td>
                    <td className="px-5 py-3.5 text-zinc-500 text-xs max-w-[200px] truncate">{r.reason}</td>
                    <td className="px-5 py-3.5">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${cfg.cls}`}>{cfg.label}</span>
                    </td>
                    <td className="px-5 py-3.5 text-zinc-400 text-xs">{new Date(r.createdAt).toLocaleDateString('fr-FR')}</td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-1.5">
                        {r.status === 'PENDING' && (
                          <button
                            onClick={() => process({ id: r.id, payload: {} })}
                            disabled={processing}
                            className="flex items-center gap-1 text-xs px-2 py-1 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 disabled:opacity-40"
                          >
                            <CheckCircle size={11} /> Traiter
                          </button>
                        )}
                        {r.status === 'PROCESSED' && (
                          <button
                            onClick={() => sync(r.id)}
                            disabled={syncing}
                            className="flex items-center gap-1 text-xs px-2 py-1 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 disabled:opacity-40"
                          >
                            <RefreshCcw size={11} /> Sync gateway
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </motion.div>

      {showCreate && <CreateRefundModal onClose={() => setShowCreate(false)} />}
    </div>
  )
}
