'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { DollarSign, CheckCircle, AlertCircle, RefreshCw } from 'lucide-react'
import { useProcessPayment, useDailyCashReport } from '@/lib/hooks/use-finance'
import { fadeUp } from '@/lib/animations'
import { getApiErrorMessage } from '@/lib/api/client'

const METHODS = [
  { value: 'CASH',         label: 'Espèces' },
  { value: 'BANK',         label: 'Virement bancaire' },
  { value: 'ORANGE_MONEY', label: 'Orange Money' },
  { value: 'MPESA',        label: 'M-Pesa' },
  { value: 'AIRTEL_MONEY', label: 'Airtel Money' },
  { value: 'CARD',         label: 'Carte bancaire' },
]

export default function PaiementsPage() {
  const { mutateAsync: processPayment, isPending } = useProcessPayment()
  const { data: dailyCash = [], refetch: refetchCash } = useDailyCashReport()

  const [form, setForm] = useState({
    studentId: '',
    amount: '',
    method: 'CASH',
    sessionId: '',
    reference: '',
    comment: '',
  })
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState('')

  const cash: any[] = Array.isArray(dailyCash) ? dailyCash : []
  const needsRef = form.method !== 'CASH'
  const totalCash = cash.reduce((acc, r) => acc + (Number(r._sum?.amount) || 0), 0)

  function reset() {
    setForm({ studentId: '', amount: '', method: 'CASH', sessionId: '', reference: '', comment: '' })
    setStatus('idle')
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setStatus('idle')
    try {
      await processPayment({
        studentId: Number(form.studentId),
        amount: Number(form.amount),
        method: form.method as any,
        sessionId: Number(form.sessionId),
        reference: form.reference || undefined,
        comment: form.comment || undefined,
      })
      setStatus('success')
      reset()
      refetchCash()
    } catch (err) {
      setErrorMsg(getApiErrorMessage(err))
      setStatus('error')
    }
  }

  return (
    <div className="px-8 py-8 space-y-6">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
        <h1 className="text-2xl font-bold text-zinc-900">Paiements</h1>
        <p className="text-sm text-zinc-500 mt-0.5">Encaissement et suivi des transactions</p>
      </motion.div>

      <div className="grid grid-cols-2 gap-6">
        {/* Formulaire encaissement */}
        <motion.div variants={fadeUp} initial="hidden" animate="show" className="bg-white rounded-2xl border border-zinc-100 shadow-sm p-6">
          <h2 className="text-sm font-semibold text-zinc-900 mb-5">Encaisser un paiement</h2>

          {status === 'success' && (
            <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-emerald-50 border border-emerald-100 mb-4">
              <CheckCircle size={15} className="text-emerald-600 flex-shrink-0" />
              <p className="text-sm text-emerald-700 font-medium">Paiement enregistré avec succès</p>
            </div>
          )}
          {status === 'error' && (
            <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-red-50 border border-red-100 mb-4">
              <AlertCircle size={15} className="text-red-600 flex-shrink-0" />
              <p className="text-sm text-red-700">{errorMsg}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-zinc-500 mb-1">ID Élève <span className="text-red-500">*</span></label>
                <input
                  type="number" required min={1}
                  value={form.studentId}
                  onChange={e => { setForm(p => ({ ...p, studentId: e.target.value })); setStatus('idle') }}
                  placeholder="123"
                  className="w-full px-3 py-2 rounded-lg border border-zinc-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-500 mb-1">
                  ID Session <span className="text-red-500">*</span>
                  <span className="text-zinc-400 font-normal ml-1">(année scolaire)</span>
                </label>
                <input
                  type="number" required min={1}
                  value={form.sessionId}
                  onChange={e => { setForm(p => ({ ...p, sessionId: e.target.value })); setStatus('idle') }}
                  placeholder="1"
                  className="w-full px-3 py-2 rounded-lg border border-zinc-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-500 mb-1">Montant (FCFA) <span className="text-red-500">*</span></label>
              <input
                type="number" required min={1}
                value={form.amount}
                onChange={e => { setForm(p => ({ ...p, amount: e.target.value })); setStatus('idle') }}
                placeholder="50000"
                className="w-full px-3 py-2 rounded-lg border border-zinc-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-500 mb-1">Mode de paiement <span className="text-red-500">*</span></label>
              <select
                value={form.method}
                onChange={e => setForm(p => ({ ...p, method: e.target.value, reference: '' }))}
                className="w-full px-3 py-2 rounded-lg border border-zinc-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
              >
                {METHODS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
              </select>
            </div>

            {needsRef && (
              <div>
                <label className="block text-xs font-medium text-zinc-500 mb-1">
                  Référence <span className="text-red-500">*</span>
                  <span className="text-zinc-400 font-normal ml-1">(obligatoire pour paiements non-espèces)</span>
                </label>
                <input
                  type="text" required={needsRef} minLength={3}
                  value={form.reference}
                  onChange={e => setForm(p => ({ ...p, reference: e.target.value }))}
                  placeholder="TXN-2026-001234"
                  className="w-full px-3 py-2 rounded-lg border border-zinc-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-zinc-500 mb-1">Commentaire</label>
              <input
                value={form.comment}
                onChange={e => setForm(p => ({ ...p, comment: e.target.value }))}
                placeholder="Optionnel"
                className="w-full px-3 py-2 rounded-lg border border-zinc-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
              />
            </div>

            <button
              type="submit" disabled={isPending}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 text-sm text-white font-medium hover:bg-emerald-700 disabled:opacity-50 transition-colors"
            >
              <DollarSign size={15} />
              {isPending ? 'Encaissement...' : 'Encaisser'}
            </button>
          </form>
        </motion.div>

        {/* Rapport du jour */}
        <div className="bg-white rounded-2xl border border-zinc-100 shadow-sm">
          <div className="px-5 py-4 border-b border-zinc-100 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-zinc-900">Rapport du jour</h2>
            <div className="flex items-center gap-2">
              {totalCash > 0 && (
                <span className="text-xs font-semibold text-emerald-700">{totalCash.toLocaleString('fr-FR')} F</span>
              )}
              <button onClick={() => refetchCash()} className="p-1.5 rounded-lg text-zinc-400 hover:bg-zinc-100 transition-colors">
                <RefreshCw size={13} />
              </button>
            </div>
          </div>
          {cash.length === 0 ? (
            <div className="py-12 text-center">
              <DollarSign size={24} className="mx-auto text-zinc-300 mb-2" />
              <p className="text-sm text-zinc-400">Aucun encaissement aujourd'hui</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-zinc-100 bg-zinc-50/50">
                      <th className="text-left px-5 py-3 text-xs font-semibold text-zinc-500">Méthode</th>
                      <th className="text-right px-5 py-3 text-xs font-semibold text-zinc-500">Transactions</th>
                      <th className="text-right px-5 py-3 text-xs font-semibold text-zinc-500">Montant</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cash.map((row: any, i: number) => (
                      <tr key={i} className="border-b border-zinc-50 hover:bg-zinc-50/50">
                        <td className="px-5 py-3 font-medium text-zinc-900">{row.method ?? '—'}</td>
                        <td className="px-5 py-3 text-right text-zinc-500">{row._count?.id ?? 0}</td>
                        <td className="px-5 py-3 text-right font-semibold text-emerald-700">
                          {row._sum?.amount != null ? `${Number(row._sum.amount).toLocaleString('fr-FR')} F` : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-zinc-50/60">
                      <td className="px-5 py-3 text-sm font-semibold text-zinc-700">Total</td>
                      <td className="px-5 py-3 text-right text-sm font-semibold text-zinc-700">
                        {cash.reduce((a, r) => a + (r._count?.id || 0), 0)} tx
                      </td>
                      <td className="px-5 py-3 text-right text-sm font-bold text-emerald-700">
                        {totalCash.toLocaleString('fr-FR')} F
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
