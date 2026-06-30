'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { ClipboardCheck, CheckCircle, XCircle, RefreshCw, Smartphone, Clock, AlertTriangle } from 'lucide-react'
import {
  usePendingPayments, useVerifyPaymentStep, useVerifyExternal,
} from '@/lib/hooks/use-finance'
import { useQueryClient } from '@tanstack/react-query'
import { fadeUp } from '@/lib/animations'
import { getApiErrorMessage } from '@/lib/api/client'
import { Skeleton } from '@/components/ui/skeleton'
import type { PendingPayment } from '@/types/finance'

const METHOD_LABEL: Record<string, string> = {
  CASH: 'Espèces',
  ORANGE_MONEY: 'Orange Money',
  MPESA: 'M-Pesa',
  AIRTEL_MONEY: 'Airtel Money',
  BANK: 'Virement',
  CARD: 'Carte',
}

const MOBILE_METHODS = new Set(['ORANGE_MONEY', 'MPESA', 'AIRTEL_MONEY'])

function VerifyStepModal({
  payment,
  onClose,
}: {
  payment: PendingPayment
  onClose: () => void
}) {
  const { mutateAsync, isPending } = useVerifyPaymentStep()
  const { mutateAsync: verifyExt, isPending: verifyingExt } = useVerifyExternal()
  const qc = useQueryClient()
  const [notes, setNotes] = useState('')
  const [extRef, setExtRef] = useState(payment.reference ?? '')
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState<'FINANCE' | 'REJECT' | 'EXT' | null>(null)

  async function handleAction(action: 'FINANCE' | 'REJECT') {
    setError(null)
    try {
      await mutateAsync({ verificationId: payment.id, action, notes: notes || undefined })
      setDone(action)
      qc.invalidateQueries({ queryKey: ['finance', 'payments', 'pending'] })
      qc.invalidateQueries({ queryKey: ['finance', 'guichet-dashboard'] })
      setTimeout(onClose, 1200)
    } catch (err) {
      setError(getApiErrorMessage(err))
    }
  }

  async function handleExtVerify() {
    if (!extRef.trim()) return
    setError(null)
    try {
      await verifyExt(extRef.trim())
      setDone('EXT')
      qc.invalidateQueries({ queryKey: ['finance', 'payments', 'pending'] })
      setTimeout(onClose, 1200)
    } catch (err) {
      setError(getApiErrorMessage(err))
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 mx-4">
        <h2 className="text-base font-semibold text-zinc-900 mb-1">Traitement paiement #{payment.id}</h2>
        <p className="text-xs text-zinc-400 mb-5">
          {payment.student ? `${payment.student.firstName} ${payment.student.lastName}` : `Élève #${payment.id}`}
          {payment.student?.class?.name ? ` · ${payment.student.class.name}` : ''}
        </p>

        {done ? (
          <div className="text-center py-6">
            {done === 'REJECT' ? (
              <XCircle size={20} className="mx-auto text-red-500 mb-2" />
            ) : (
              <CheckCircle size={20} className="mx-auto text-emerald-500 mb-2" />
            )}
            <p className="text-sm text-zinc-700">
              {done === 'FINANCE' ? 'Paiement validé' : done === 'REJECT' ? 'Paiement rejeté' : 'Vérification externe effectuée'}
            </p>
          </div>
        ) : (
          <>
            <div className="bg-zinc-50 rounded-xl p-4 mb-5 space-y-1.5">
              <div className="flex justify-between text-xs">
                <span className="text-zinc-500">Montant</span>
                <span className="font-semibold text-zinc-900">{Number(payment.amount).toLocaleString('fr-FR')} F</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-zinc-500">Méthode</span>
                <span className="font-medium text-zinc-700">{METHOD_LABEL[payment.method] ?? payment.method}</span>
              </div>
              {payment.reference && (
                <div className="flex justify-between text-xs">
                  <span className="text-zinc-500">Référence</span>
                  <span className="font-mono text-zinc-600">{payment.reference}</span>
                </div>
              )}
              <div className="flex justify-between text-xs">
                <span className="text-zinc-500">Date</span>
                <span className="text-zinc-500">{new Date(payment.createdAt).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' })}</span>
              </div>
            </div>

            {/* Vérification externe pour paiements mobile */}
            {MOBILE_METHODS.has(payment.method) && (
              <div className="mb-5 p-3 rounded-xl border border-blue-100 bg-blue-50">
                <div className="flex items-center gap-1.5 mb-2">
                  <Smartphone size={12} className="text-blue-600" />
                  <p className="text-xs font-medium text-blue-700">Vérification externe opérateur</p>
                </div>
                <div className="flex gap-2">
                  <input
                    value={extRef}
                    onChange={e => setExtRef(e.target.value)}
                    placeholder="Référence opérateur"
                    className="flex-1 px-2.5 py-1.5 rounded-lg border border-blue-200 bg-white text-xs focus:outline-none focus:ring-2 focus:ring-blue-300"
                  />
                  <button
                    onClick={handleExtVerify}
                    disabled={verifyingExt || !extRef.trim()}
                    className="px-3 py-1.5 rounded-lg bg-blue-600 text-xs text-white font-medium hover:bg-blue-700 disabled:opacity-40"
                  >
                    {verifyingExt ? '…' : 'Vérifier'}
                  </button>
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-zinc-500 mb-1">Notes (optionnel)</label>
              <textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                rows={2}
                placeholder="Motif de validation ou rejet…"
                className="w-full px-3 py-2 rounded-lg border border-zinc-200 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-400 resize-none mb-4"
              />
            </div>

            {error && <p className="text-xs text-red-500 bg-red-50 rounded-lg px-3 py-2 mb-3">{error}</p>}

            <div className="flex gap-2">
              <button type="button" onClick={onClose}
                className="px-4 py-2 rounded-xl border border-zinc-200 text-sm text-zinc-600 hover:bg-zinc-50">
                Annuler
              </button>
              <button
                onClick={() => handleAction('REJECT')}
                disabled={isPending}
                className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl border border-red-200 text-sm text-red-600 hover:bg-red-50 disabled:opacity-40"
              >
                <XCircle size={14} /> Rejeter
              </button>
              <button
                onClick={() => handleAction('FINANCE')}
                disabled={isPending}
                className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 text-sm text-white font-medium hover:bg-emerald-700 disabled:opacity-40"
              >
                <CheckCircle size={14} /> Valider
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export default function VerificationsPage() {
  const { data, isLoading, refetch } = usePendingPayments()
  const [selected, setSelected] = useState<PendingPayment | null>(null)

  const payments: PendingPayment[] = (data as any)?.data ?? (Array.isArray(data) ? data : [])

  return (
    <div className="px-8 py-8 space-y-6">
      <motion.div
        className="flex items-center justify-between"
        initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}
      >
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">Vérifications</h1>
          <p className="text-sm text-zinc-500 mt-0.5">Paiements en attente de traitement</p>
        </div>
        <div className="flex items-center gap-2">
          {payments.length > 0 && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-50 border border-amber-100 text-xs font-medium text-amber-700">
              <Clock size={12} />
              {payments.length} en attente
            </div>
          )}
          <button
            onClick={() => refetch()}
            className="p-2 rounded-xl border border-zinc-200 text-zinc-400 hover:bg-zinc-50"
          >
            <RefreshCw size={14} />
          </button>
        </div>
      </motion.div>

      <motion.div variants={fadeUp} initial="hidden" animate="show" className="bg-white rounded-2xl border border-zinc-100 shadow-sm">
        <div className="px-5 py-4 border-b border-zinc-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ClipboardCheck size={14} className="text-zinc-400" />
            <h2 className="text-sm font-semibold text-zinc-900">Paiements en attente</h2>
          </div>
          <span className="text-xs px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 font-medium">{payments.length}</span>
        </div>

        {isLoading ? (
          <div className="p-5 space-y-3">
            {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-14" />)}
          </div>
        ) : payments.length === 0 ? (
          <div className="py-14 text-center">
            <CheckCircle size={28} className="mx-auto text-emerald-300 mb-2" />
            <p className="text-sm font-medium text-zinc-700">Aucun paiement en attente</p>
            <p className="text-xs text-zinc-400 mt-1">Toutes les transactions sont traitées</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-100 bg-zinc-50/50">
                  <th className="text-left px-5 py-3 text-xs font-semibold text-zinc-500">#</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-zinc-500">Élève</th>
                  <th className="text-right px-5 py-3 text-xs font-semibold text-zinc-500">Montant</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-zinc-500">Méthode</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-zinc-500">Référence</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-zinc-500">Date</th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody>
                {payments.map((p) => (
                  <tr key={p.id} className="border-b border-zinc-50 hover:bg-zinc-50/50">
                    <td className="px-5 py-3.5 text-xs text-zinc-400 font-mono">{p.id}</td>
                    <td className="px-5 py-3.5">
                      <p className="font-medium text-zinc-900">
                        {p.student ? `${p.student.firstName} ${p.student.lastName}` : '—'}
                      </p>
                      {p.student?.class?.name && (
                        <p className="text-xs text-zinc-400">{p.student.class.name}</p>
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-right font-semibold text-zinc-900">
                      {Number(p.amount).toLocaleString('fr-FR')} F
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-1.5">
                        {MOBILE_METHODS.has(p.method) && <Smartphone size={11} className="text-blue-500" />}
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                          MOBILE_METHODS.has(p.method)
                            ? 'bg-blue-50 text-blue-700'
                            : p.method === 'CASH'
                            ? 'bg-emerald-50 text-emerald-700'
                            : 'bg-zinc-100 text-zinc-600'
                        }`}>
                          {METHOD_LABEL[p.method] ?? p.method}
                        </span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-xs text-zinc-400 font-mono">
                      {p.reference ?? '—'}
                    </td>
                    <td className="px-5 py-3.5 text-xs text-zinc-400">
                      {new Date(p.createdAt).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' })}
                    </td>
                    <td className="px-5 py-3.5">
                      <button
                        onClick={() => setSelected(p)}
                        className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 font-medium transition-colors"
                      >
                        <ClipboardCheck size={12} /> Traiter
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </motion.div>

      {/* Info CASH */}
      {payments.some(p => p.method === 'CASH') && (
        <motion.div variants={fadeUp} initial="hidden" animate="show"
          className="flex items-start gap-2.5 px-4 py-3 rounded-xl bg-amber-50 border border-amber-100">
          <AlertTriangle size={14} className="text-amber-500 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-amber-700">
            Les paiements en espèces doivent être vérifiés par un <strong>Admin</strong> — vous pouvez valider les autres méthodes.
          </p>
        </motion.div>
      )}

      {selected && <VerifyStepModal payment={selected} onClose={() => setSelected(null)} />}
    </div>
  )
}
