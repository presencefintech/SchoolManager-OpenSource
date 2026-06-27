'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import {
  DollarSign, Search, RefreshCw, Filter, CheckCircle, XCircle,
  Shield, Send, Ban, Smartphone,
} from 'lucide-react'
import {
  usePendingVerifications, useMobilePending, useVerifyPayment,
  useConfirmMobilePayment, useConfirmBankTransaction, useResendReceipt,
  useLinkOrphanTransaction, useAdvancedSearch, useProcessManualPayment,
} from '@/lib/hooks/use-admin'
import type { ManualPaymentPayload, AdvancedSearchParams } from '@/types/admin'
import { fadeUp } from '@/lib/animations'
import { getApiErrorMessage } from '@/lib/api/client'

function EmptyState({ icon: Icon, message }: { icon: React.ElementType; message: string }) {
  return (
    <div className="py-12 text-center">
      <Icon size={28} className="mx-auto text-zinc-300 mb-2" />
      <p className="text-sm text-zinc-400">{message}</p>
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
    try { await mutateAsync(form); setSuccess(true) }
    catch (err) { setError(getApiErrorMessage(err)) }
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
            <p className="text-sm font-medium text-zinc-800">Paiement enregistré</p>
            <button onClick={onClose} className="mt-4 px-4 py-2 rounded-xl bg-emerald-600 text-sm text-white">Fermer</button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-zinc-500 mb-1">ID Élève *</label>
              <input type="number" required min={1} value={form.studentId || ''}
                onChange={e => setForm(p => ({ ...p, studentId: Number(e.target.value) }))}
                className="w-full px-3 py-2 rounded-lg border border-zinc-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400" />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-500 mb-1">Montant (FCFA) *</label>
              <input type="number" required min={1} value={form.amount || ''}
                onChange={e => setForm(p => ({ ...p, amount: Number(e.target.value) }))}
                className="w-full px-3 py-2 rounded-lg border border-zinc-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400" />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-500 mb-1">Mode de paiement *</label>
              <select value={form.method}
                onChange={e => setForm(p => ({ ...p, method: e.target.value as ManualPaymentPayload['method'] }))}
                className="w-full px-3 py-2 rounded-lg border border-zinc-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400">
                <option value="CASH">Espèces</option>
                <option value="BANK_TRANSFER">Virement bancaire</option>
                <option value="MOBILE_MONEY">Mobile Money</option>
                <option value="CHEQUE">Chèque</option>
                <option value="ORANGE_MONEY">Orange Money</option>
                <option value="MPESA">M-Pesa</option>
                <option value="AIRTEL_MONEY">Airtel Money</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-500 mb-1">Note</label>
              <input value={form.note ?? ''} placeholder="Optionnel"
                onChange={e => setForm(p => ({ ...p, note: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg border border-zinc-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400" />
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

function LinkOrphanModal({ onClose }: { onClose: () => void }) {
  const { mutateAsync, isPending } = useLinkOrphanTransaction()
  const [form, setForm] = useState({ transactionRef: '', studentId: 0 })
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    try { await mutateAsync(form); setSuccess(true) }
    catch (err) { setError(getApiErrorMessage(err)) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 mx-4">
        <h2 className="text-lg font-semibold text-zinc-900 mb-5">Lier une transaction orpheline</h2>
        {success ? (
          <div className="text-center py-6">
            <CheckCircle size={20} className="mx-auto text-emerald-600 mb-2" />
            <p className="text-sm text-zinc-800">Transaction liée avec succès</p>
            <button onClick={onClose} className="mt-4 px-4 py-2 rounded-xl bg-emerald-600 text-sm text-white">Fermer</button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-zinc-500 mb-1">Référence transaction *</label>
              <input required value={form.transactionRef}
                onChange={e => setForm(p => ({ ...p, transactionRef: e.target.value }))}
                placeholder="REF-XXXX"
                className="w-full px-3 py-2 rounded-lg border border-zinc-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400" />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-500 mb-1">ID Élève *</label>
              <input type="number" required min={1} value={form.studentId || ''}
                onChange={e => setForm(p => ({ ...p, studentId: Number(e.target.value) }))}
                className="w-full px-3 py-2 rounded-lg border border-zinc-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400" />
            </div>
            {error && <p className="text-xs text-red-500 bg-red-50 rounded-lg px-3 py-2">{error}</p>}
            <div className="flex gap-2 pt-2">
              <button type="button" onClick={onClose} className="flex-1 px-4 py-2 rounded-xl border border-zinc-200 text-sm text-zinc-600 hover:bg-zinc-50">Annuler</button>
              <button type="submit" disabled={isPending} className="flex-1 px-4 py-2 rounded-xl bg-emerald-600 text-sm text-white font-medium disabled:opacity-50">
                {isPending ? 'Liaison...' : 'Lier'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}

export default function PaiementsPage() {
  const { data: pending = [], refetch: refetchPending } = usePendingVerifications()
  const { data: mobilePending = [], refetch: refetchMobile } = useMobilePending()
  const { mutate: verify, isPending: verifying } = useVerifyPayment()
  const { mutate: confirmMobile, isPending: confirming } = useConfirmMobilePayment()
  const { mutate: confirmBank } = useConfirmBankTransaction()
  const { mutate: resendReceipt } = useResendReceipt()
  const [showManual, setShowManual] = useState(false)
  const [showLinkOrphan, setShowLinkOrphan] = useState(false)
  const [search, setSearch] = useState('')
  const [searchParams, setSearchParams] = useState<AdvancedSearchParams>({})
  const [searchDraft, setSearchDraft] = useState<AdvancedSearchParams>({})
  const [showAdvanced, setShowAdvanced] = useState(false)
  const { data: searchResults } = useAdvancedSearch(searchParams)

  const filteredPending = (pending as any[]).filter(p =>
    !search || p.studentName?.toLowerCase().includes(search.toLowerCase()) || p.reference?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-6">
      <motion.div
        className="flex items-center justify-between"
        initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}
      >
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">Paiements</h1>
          <p className="text-sm text-zinc-500 mt-0.5">Vérification et validation des paiements</p>
        </div>
        {(pending as any[]).length > 0 && (
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-50 border border-amber-100">
            <DollarSign size={13} className="text-amber-600" />
            <span className="text-xs font-medium text-amber-700">{(pending as any[]).length} en attente</span>
          </div>
        )}
      </motion.div>

      <div className="flex items-center justify-between gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher un paiement..."
            className="w-full pl-9 pr-4 py-2 bg-white border border-zinc-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400" />
        </div>
        <div className="flex gap-2">
          <button onClick={() => { refetchPending(); refetchMobile() }}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-zinc-200 text-xs text-zinc-600 hover:bg-zinc-50">
            <RefreshCw size={12} /> Actualiser
          </button>
          <button onClick={() => setShowAdvanced(v => !v)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs transition-colors ${showAdvanced ? 'border-emerald-300 bg-emerald-50 text-emerald-700' : 'border-zinc-200 text-zinc-600 hover:bg-zinc-50'}`}>
            <Filter size={12} /> Recherche avancée
          </button>
          <button onClick={() => setShowLinkOrphan(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-zinc-200 text-xs text-zinc-600 hover:bg-zinc-50">
            <Ban size={12} /> Lier orpheline
          </button>
          <button onClick={() => setShowManual(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 text-sm text-white font-medium hover:bg-emerald-700 shadow-sm">
            <DollarSign size={14} /> Paiement manuel
          </button>
        </div>
      </div>

      {showAdvanced && (
        <div className="bg-white rounded-2xl border border-zinc-100 shadow-sm p-5">
          <h3 className="text-sm font-semibold text-zinc-900 mb-4">Recherche avancée</h3>
          <div className="grid grid-cols-4 gap-3">
            <div>
              <label className="block text-xs text-zinc-500 mb-1">ID Élève</label>
              <input type="number" min={1} value={searchDraft.studentId ?? ''}
                onChange={e => setSearchDraft(p => ({ ...p, studentId: e.target.value ? Number(e.target.value) : undefined }))}
                className="w-full px-3 py-1.5 rounded-lg border border-zinc-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400" />
            </div>
            <div>
              <label className="block text-xs text-zinc-500 mb-1">Méthode</label>
              <select value={searchDraft.method ?? ''} onChange={e => setSearchDraft(p => ({ ...p, method: e.target.value || undefined }))}
                className="w-full px-3 py-1.5 rounded-lg border border-zinc-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400">
                <option value="">Toutes</option>
                <option value="CASH">Espèces</option>
                <option value="BANK_TRANSFER">Virement</option>
                <option value="MOBILE_MONEY">Mobile Money</option>
                <option value="CHEQUE">Chèque</option>
                <option value="ORANGE_MONEY">Orange Money</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-zinc-500 mb-1">Statut</label>
              <select value={searchDraft.status ?? ''} onChange={e => setSearchDraft(p => ({ ...p, status: e.target.value || undefined }))}
                className="w-full px-3 py-1.5 rounded-lg border border-zinc-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400">
                <option value="">Tous</option>
                <option value="PENDING">En attente</option>
                <option value="VALIDATED">Validé</option>
                <option value="REJECTED">Rejeté</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-zinc-500 mb-1">Montant min</label>
              <input type="number" min={0} value={searchDraft.minAmount ?? ''}
                onChange={e => setSearchDraft(p => ({ ...p, minAmount: e.target.value ? Number(e.target.value) : undefined }))}
                className="w-full px-3 py-1.5 rounded-lg border border-zinc-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400" />
            </div>
            <div>
              <label className="block text-xs text-zinc-500 mb-1">Date début</label>
              <input type="date" value={searchDraft.startDate ?? ''}
                onChange={e => setSearchDraft(p => ({ ...p, startDate: e.target.value || undefined }))}
                className="w-full px-3 py-1.5 rounded-lg border border-zinc-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400" />
            </div>
            <div>
              <label className="block text-xs text-zinc-500 mb-1">Date fin</label>
              <input type="date" value={searchDraft.endDate ?? ''}
                onChange={e => setSearchDraft(p => ({ ...p, endDate: e.target.value || undefined }))}
                className="w-full px-3 py-1.5 rounded-lg border border-zinc-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400" />
            </div>
            <div>
              <label className="block text-xs text-zinc-500 mb-1">Montant max</label>
              <input type="number" min={0} value={searchDraft.maxAmount ?? ''}
                onChange={e => setSearchDraft(p => ({ ...p, maxAmount: e.target.value ? Number(e.target.value) : undefined }))}
                className="w-full px-3 py-1.5 rounded-lg border border-zinc-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400" />
            </div>
            <div className="flex items-end">
              <button onClick={() => setSearchParams(searchDraft)}
                className="w-full px-4 py-1.5 rounded-lg bg-emerald-600 text-sm text-white font-medium hover:bg-emerald-700">
                Rechercher
              </button>
            </div>
          </div>
          {searchResults && (
            <div className="mt-4">
              <p className="text-xs text-zinc-500 mb-2">
                {Array.isArray(searchResults) ? searchResults.length : (searchResults as any)?.data?.length ?? 0} résultat(s)
              </p>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-zinc-100 bg-zinc-50/50">
                      <th className="text-left px-3 py-2 text-xs font-semibold text-zinc-500">Élève</th>
                      <th className="text-left px-3 py-2 text-xs font-semibold text-zinc-500">Montant</th>
                      <th className="text-left px-3 py-2 text-xs font-semibold text-zinc-500">Méthode</th>
                      <th className="text-left px-3 py-2 text-xs font-semibold text-zinc-500">Statut</th>
                      <th className="text-left px-3 py-2 text-xs font-semibold text-zinc-500">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(Array.isArray(searchResults) ? searchResults : (searchResults as any)?.data ?? []).map((r: any) => (
                      <tr key={r.id} className="border-b border-zinc-50 hover:bg-zinc-50/50">
                        <td className="px-3 py-2 text-zinc-900">{r.studentName ?? '—'}</td>
                        <td className="px-3 py-2 text-zinc-700 font-medium">{Number(r.amount).toLocaleString('fr-FR')} F</td>
                        <td className="px-3 py-2"><span className="text-xs px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-600">{r.method}</span></td>
                        <td className="px-3 py-2">
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${r.status === 'VALIDATED' ? 'bg-emerald-50 text-emerald-700' : r.status === 'PENDING' ? 'bg-amber-50 text-amber-700' : 'bg-red-50 text-red-700'}`}>
                            {r.status}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-zinc-400 text-xs">{new Date(r.createdAt).toLocaleDateString('fr-FR')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="bg-white rounded-2xl border border-zinc-100 shadow-sm">
        <div className="px-5 py-4 border-b border-zinc-100 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-zinc-900">Vérifications en attente</h3>
          <span className="text-xs px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 font-medium">{(pending as any[]).length}</span>
        </div>
        {filteredPending.length === 0 ? (
          <EmptyState icon={CheckCircle} message="Aucun paiement en attente" />
        ) : (
          <div className="overflow-x-auto">
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
                {filteredPending.map((p: any) => (
                  <tr key={p.id} className="border-b border-zinc-50 hover:bg-zinc-50/50">
                    <td className="px-5 py-3.5 font-medium text-zinc-900">{p.studentName}</td>
                    <td className="px-5 py-3.5 text-zinc-700 font-medium">{Number(p.amount).toLocaleString('fr-FR')} F</td>
                    <td className="px-5 py-3.5"><span className="text-xs px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-600">{p.method}</span></td>
                    <td className="px-5 py-3.5 text-zinc-400 font-mono text-xs">{p.reference ?? '—'}</td>
                    <td className="px-5 py-3.5 text-zinc-400 text-xs">{new Date(p.createdAt).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' })}</td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-1">
                        <button disabled={verifying} onClick={() => verify({ paymentId: p.id, step: 'approve' })}
                          className="p-1.5 rounded-lg text-emerald-600 hover:bg-emerald-50 disabled:opacity-50 transition-colors" title="Valider">
                          <CheckCircle size={14} />
                        </button>
                        <button disabled={verifying} onClick={() => verify({ paymentId: p.id, step: 'reject' })}
                          className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 disabled:opacity-50 transition-colors" title="Rejeter">
                          <XCircle size={14} />
                        </button>
                        <button onClick={() => confirmBank(p.id)}
                          className="p-1.5 rounded-lg text-blue-500 hover:bg-blue-50 transition-colors" title="Confirmer banque">
                          <Shield size={14} />
                        </button>
                        <button onClick={() => resendReceipt(p.id)}
                          className="p-1.5 rounded-lg text-zinc-400 hover:bg-zinc-100 transition-colors" title="Renvoyer reçu">
                          <Send size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {(mobilePending as any[]).length > 0 && (
        <div className="bg-white rounded-2xl border border-zinc-100 shadow-sm">
          <div className="px-5 py-4 border-b border-zinc-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Smartphone size={14} className="text-zinc-400" />
              <h3 className="text-sm font-semibold text-zinc-900">Mobile Money en attente</h3>
            </div>
            <span className="text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 font-medium">{(mobilePending as any[]).length}</span>
          </div>
          <div className="divide-y divide-zinc-50">
            {(mobilePending as any[]).map((m) => (
              <div key={m.id} className="flex items-center justify-between px-5 py-3.5">
                <div>
                  <p className="text-sm font-medium text-zinc-900">{m.studentName}</p>
                  <p className="text-xs text-zinc-400">{m.operator} · {m.phone} · réf: {m.reference ?? '—'}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-semibold text-zinc-900">{Number(m.amount).toLocaleString('fr-FR')} F</span>
                  <button disabled={confirming} onClick={() => confirmMobile(m.id)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 text-xs text-white font-medium hover:bg-blue-700 disabled:opacity-50">
                    <CheckCircle size={11} /> Confirmer
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {showManual && <ManualPaymentModal onClose={() => setShowManual(false)} />}
      {showLinkOrphan && <LinkOrphanModal onClose={() => setShowLinkOrphan(false)} />}
    </div>
  )
}
