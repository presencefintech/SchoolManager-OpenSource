'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  DollarSign, Search, RefreshCw, Filter, CheckCircle, XCircle,
  Shield, Send, Ban, Smartphone, Download, CheckCheck, Eye, FileDown,
} from 'lucide-react'
import { adminPdfApi } from '@/lib/admin/api'
import {
  usePendingVerifications, useMobilePending, useVerifyPayment,
  useConfirmMobilePayment, useConfirmBankTransaction, useResendReceipt,
  useLinkOrphanTransaction, useAdvancedSearch, useProcessManualPayment,
  useMarkVerificationProcessed, useExportPendingVerifications,
} from '@/lib/hooks/use-admin'
import type { ManualPaymentPayload, AdvancedSearchParams, PendingVerificationItem, PaymentProofType, ConfirmPaymentProofPayload } from '@/types/admin'
import { StudentSearchField } from '@/components/admin/shared/student-search-field'
import { VerificationStepper, FraudScoreBadge, fmtMoney, VerificationDetailDrawer, PaymentProofFields } from '@/components/admin/finance/verification-ui'
import { defaultProofTypeForMethod, labelPaymentProofType } from '@/lib/finance/payment-proof'
import { formatMoney } from '@/lib/finance/currency'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { useToast } from '@/providers/toast-provider'

const MOBILE_MONEY_METHODS = new Set(['MOBILE_MONEY', 'ORANGE_MONEY', 'MPESA', 'AIRTEL_MONEY'])

function isMobileMoneyMethod(method?: string) {
  return method ? MOBILE_MONEY_METHODS.has(method.toUpperCase()) : false
}


const fadeUp = { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0, transition: { duration: 0.28, ease: 'easeOut' } } }

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
  const [proofType, setProofType] = useState<PaymentProofType>('CASH_VOUCHER')
  const [manualJustification, setManualJustification] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    setProofType(defaultProofTypeForMethod(form.method))
  }, [form.method])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.studentId) {
      setError('Sélectionnez un élève dans la liste.')
      return
    }
    if (proofType === 'OTHER' && manualJustification.trim().length < 10) {
      setError('Un motif explicite (min. 10 caractères) est requis pour le type « Autre ».')
      return
    }
    setError(null)
    try {
      await mutateAsync({
        ...form,
        proofType,
        manualJustification: manualJustification.trim() || undefined,
      })
      setSuccess(true)
    }
    catch (err: any) { setError(err?.response?.data?.message ?? 'Erreur lors de l\'enregistrement') }
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
            <StudentSearchField
              studentId={form.studentId}
              onSelect={(id) => setForm((p) => ({ ...p, studentId: id }))}
            />
            <div>
              <label className="block text-xs font-medium text-zinc-500 mb-1">Montant (USD) *</label>
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
            {form.method !== 'CASH' && (
              <div>
                <label className="block text-xs font-medium text-zinc-500 mb-1">Référence opérateur</label>
                <input
                  value={form.reference ?? ''}
                  placeholder="REF-XXXX (recommandé)"
                  onChange={e => setForm(p => ({ ...p, reference: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg border border-zinc-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
                />
              </div>
            )}
            <PaymentProofFields
              method={form.method}
              proofType={proofType}
              manualJustification={manualJustification}
              onProofTypeChange={setProofType}
              onJustificationChange={setManualJustification}
            />
            <div>
              <label className="block text-xs font-medium text-zinc-500 mb-1">Note interne</label>
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

function ProviderConfirmModal({
  target,
  onClose,
  onConfirm,
  isPending,
}: {
  target: { paymentId: number; method: string; kind: 'bank' | 'mobile'; label?: string }
  onClose: () => void
  onConfirm: (proof: ConfirmPaymentProofPayload) => void
  isPending?: boolean
}) {
  const [proofType, setProofType] = useState<PaymentProofType>(defaultProofTypeForMethod(target.method))
  const [manualJustification, setManualJustification] = useState('')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setProofType(defaultProofTypeForMethod(target.method))
    setManualJustification('')
    setError(null)
  }, [target.paymentId, target.method])

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (proofType === 'OTHER' && manualJustification.trim().length < 10) {
      setError('Un motif explicite (min. 10 caractères) est requis pour le type « Autre ».')
      return
    }
    setError(null)
    onConfirm({
      proofType,
      manualJustification: manualJustification.trim() || undefined,
    })
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 mx-4">
        <h2 className="text-lg font-semibold text-zinc-900 mb-1">
          {target.kind === 'mobile' ? 'Confirmer Mobile Money' : 'Confirmer virement bancaire'}
        </h2>
        <p className="text-xs text-zinc-500 mb-5">
          {target.label ?? `Paiement #${target.paymentId}`} — indiquez le type de preuve utilisé pour la validation.
        </p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <PaymentProofFields
            method={target.method}
            proofType={proofType}
            manualJustification={manualJustification}
            onProofTypeChange={setProofType}
            onJustificationChange={setManualJustification}
          />
          {error && <p className="text-xs text-red-500 bg-red-50 rounded-lg px-3 py-2">{error}</p>}
          <div className="flex gap-2 pt-2">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-2 rounded-xl border border-zinc-200 text-sm text-zinc-600 hover:bg-zinc-50">Annuler</button>
            <button type="submit" disabled={isPending} className="flex-1 px-4 py-2 rounded-xl bg-blue-600 text-sm text-white font-medium hover:bg-blue-700 disabled:opacity-50">
              {isPending ? 'Confirmation…' : 'Confirmer'}
            </button>
          </div>
        </form>
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
    if (!form.studentId) {
      setError('Sélectionnez un élève.')
      return
    }
    setError(null)
    try { await mutateAsync(form); setSuccess(true) }
    catch (err: any) { setError(err?.response?.data?.message ?? 'Erreur') }
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
            <StudentSearchField
              studentId={form.studentId}
              onSelect={(id) => setForm((p) => ({ ...p, studentId: id }))}
            />
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
  const toast = useToast()
  const { data: pending = [], refetch: refetchPending } = usePendingVerifications()
  const { data: mobilePending = [], refetch: refetchMobile } = useMobilePending()
  const { mutate: verify, isPending: verifying } = useVerifyPayment()
  const { mutate: confirmMobile, isPending: confirming } = useConfirmMobilePayment()
  const confirmBank = useConfirmBankTransaction()
  const { mutate: resendReceipt } = useResendReceipt()
  const markProcessed = useMarkVerificationProcessed()
  const exportReport = useExportPendingVerifications()
  const [showManual, setShowManual] = useState(false)
  const [showLinkOrphan, setShowLinkOrphan] = useState(false)
  const [mobileActionError, setMobileActionError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [searchParams, setSearchParams] = useState<AdvancedSearchParams>({})
  const [searchDraft, setSearchDraft] = useState<AdvancedSearchParams>({})
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [processConfirm, setProcessConfirm] = useState<PendingVerificationItem | null>(null)
  const [detailItem, setDetailItem] = useState<PendingVerificationItem | null>(null)
  const [providerConfirm, setProviderConfirm] = useState<{
    paymentId: number
    method: string
    kind: 'bank' | 'mobile'
    label?: string
  } | null>(null)
  const [resendingId, setResendingId] = useState<number | null>(null)
  const { data: searchResults } = useAdvancedSearch(searchParams)

  const filteredPending = pending.filter((p: PendingVerificationItem) =>
    !search || p.studentName?.toLowerCase().includes(search.toLowerCase()) || p.reference?.toLowerCase().includes(search.toLowerCase())
  )

  function nextVerifyAction(p: PendingVerificationItem): 'FINANCE' | 'ADMIN' | null {
    if (!p.financeCheck) return 'FINANCE'
    if (!p.adminCheck) return 'ADMIN'
    return null
  }

  async function handleExportReport() {
    try {
      const blob = await exportReport.mutateAsync('csv')
      const url = URL.createObjectURL(blob as Blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `verifications-en-attente-${new Date().toISOString().slice(0, 10)}.csv`
      a.click()
      URL.revokeObjectURL(url)
      toast.success('Rapport exporté', 'Le fichier CSV a été téléchargé.')
    } catch {
      toast.error('Export impossible', 'Réessayez dans quelques instants.')
    }
  }

  async function confirmMarkProcessed() {
    if (!processConfirm) return
    try {
      await markProcessed.mutateAsync({ verificationId: processConfirm.verificationId })
      toast.success('Paiement traité', `${processConfirm.studentName} — dossier clôturé.`)
    } catch (err) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Action impossible'
      toast.error('Échec', msg)
    } finally {
      setProcessConfirm(null)
    }
  }

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
        {pending.length > 0 && (
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-50 border border-amber-100">
            <DollarSign size={13} className="text-amber-600" />
            <span className="text-xs font-medium text-amber-700">{pending.length} en attente</span>
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
          <button
            onClick={handleExportReport}
            disabled={exportReport.isPending || pending.length === 0}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-zinc-200 text-xs text-zinc-600 hover:bg-zinc-50 disabled:opacity-40"
          >
            <Download size={12} /> Exporter le rapport
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
            <StudentSearchField
              studentId={searchDraft.studentId ?? 0}
              onSelect={(id) => setSearchDraft(p => ({ ...p, studentId: id > 0 ? id : undefined }))}
              label="Élève"
            />
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
                        <td className="px-3 py-2 text-zinc-700 font-medium">{formatMoney(Number(r.amount))}</td>
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
          <span className="text-xs px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 font-medium">{pending.length}</span>
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
                  <th className="text-left px-5 py-3 text-xs font-semibold text-zinc-500">Workflow</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-zinc-500">Risque</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-zinc-500">Méthode</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-zinc-500">Preuve</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-zinc-500">Réf. / Reçu</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-zinc-500">Date</th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody>
                {filteredPending.map((p) => {
                  const action = nextVerifyAction(p)
                  return (
                  <tr key={p.verificationId} className="border-b border-zinc-50 hover:bg-zinc-50/50">
                    <td className="px-5 py-3.5">
                      <p className="font-medium text-zinc-900">{p.studentName}</p>
                      {p.studentClassName && <p className="text-[11px] text-zinc-400">{p.studentClassName}</p>}
                      {p.studentBalance != null && p.studentBalance > 0 && (
                        <p className="text-[10px] text-red-500 tabular-nums">Solde élève · {fmtMoney(p.studentBalance, p.currency)}</p>
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-zinc-700 font-medium tabular-nums">{fmtMoney(p.amount, p.currency)}</td>
                    <td className="px-5 py-3.5"><VerificationStepper item={p} /></td>
                    <td className="px-5 py-3.5"><FraudScoreBadge score={p.fraudScore} suspicion={p.suspicion} /></td>
                    <td className="px-5 py-3.5"><span className="text-xs px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-600">{p.method}</span></td>
                    <td className="px-5 py-3.5">
                      {p.proofType ? (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 font-medium">
                          {labelPaymentProofType(p.proofType)}
                        </span>
                      ) : (
                        <span className="text-xs text-zinc-300">—</span>
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-zinc-400 font-mono text-xs">
                      {p.receiptNumber ?? p.reference ?? p.providerRef ?? '—'}
                    </td>
                    <td className="px-5 py-3.5 text-zinc-400 text-xs">{new Date(p.createdAt).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' })}</td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => setDetailItem(p)}
                          className="p-1.5 rounded-lg text-zinc-400 hover:bg-zinc-100 transition-colors"
                          title="Voir le détail"
                        >
                          <Eye size={14} />
                        </button>
                        {action && (
                          <button
                            disabled={verifying}
                            onClick={() => verify({ verificationId: p.verificationId, action }, {
                              onSuccess: () => toast.success(
                                action === 'FINANCE' ? 'Validation finance enregistrée' : 'Validation direction enregistrée',
                              ),
                            })}
                            className="px-2 py-1 rounded-lg text-[10px] font-medium bg-emerald-50 text-emerald-700 hover:bg-emerald-100 disabled:opacity-50"
                            title={action === 'FINANCE' ? 'Validation finance' : 'Validation admin'}
                          >
                            {action === 'FINANCE' ? 'Finance ✓' : 'Admin ✓'}
                          </button>
                        )}
                        {p.financeCheck && p.adminCheck && (
                          <button
                            disabled={markProcessed.isPending}
                            onClick={() => setProcessConfirm(p)}
                            className="px-2 py-1 rounded-lg text-[10px] font-medium bg-indigo-50 text-indigo-700 hover:bg-indigo-100 disabled:opacity-50"
                            title="Marquer comme traité"
                          >
                            <CheckCheck size={12} className="inline" /> Traité
                          </button>
                        )}
                        <button disabled={verifying} onClick={() => verify({ verificationId: p.verificationId, action: 'REJECT' })}
                          className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 disabled:opacity-50 transition-colors" title="Rejeter">
                          <XCircle size={14} />
                        </button>
                        <button
                          onClick={() => setProviderConfirm({
                            paymentId: p.paymentId,
                            method: p.method,
                            kind: 'bank',
                            label: p.studentName,
                          })}
                          className="p-1.5 rounded-lg text-blue-500 hover:bg-blue-50 transition-colors" title="Confirmer banque">
                          <Shield size={14} />
                        </button>
                        {p.receiptUrl && (
                          <a href={p.receiptUrl} target="_blank" rel="noopener noreferrer"
                            className="p-1.5 rounded-lg text-zinc-400 hover:bg-zinc-100 transition-colors" title="Reçu">
                            <Send size={14} />
                          </a>
                        )}
                        <button onClick={() => resendReceipt(p.paymentId)}
                          className="p-1.5 rounded-lg text-zinc-400 hover:bg-zinc-100 transition-colors" title="Renvoyer reçu">
                          <Send size={14} />
                        </button>
                        <button
                          onClick={async () => {
                            try {
                              const blob = await adminPdfApi.getReceipt(p.paymentId)
                              const url = URL.createObjectURL(blob)
                              const a = document.createElement('a')
                              a.href = url
                              a.download = `recu-${p.paymentId}.pdf`
                              a.click()
                              URL.revokeObjectURL(url)
                            } catch {}
                          }}
                          className="p-1.5 rounded-lg text-zinc-400 hover:bg-emerald-50 hover:text-emerald-600 transition-colors" title="Télécharger reçu PDF">
                          <FileDown size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                )})}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {mobilePending.length > 0 && (
        <div className="bg-white rounded-2xl border border-zinc-100 shadow-sm">
          <div className="px-5 py-4 border-b border-zinc-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Smartphone size={14} className="text-zinc-400" />
              <h3 className="text-sm font-semibold text-zinc-900">Transactions en attente (opérateur)</h3>
            </div>
            <span className="text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 font-medium">{mobilePending.length}</span>
          </div>
          {mobileActionError && (
            <p className="mx-5 mt-3 text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{mobileActionError}</p>
          )}
          <div className="divide-y divide-zinc-50">
            {mobilePending.map((m) => {
              const mobile = isMobileMoneyMethod(m.method ?? m.operator)
              return (
              <div key={m.id} className="flex items-center justify-between px-5 py-3.5 gap-4">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-zinc-900">{m.studentName}</p>
                  <p className="text-xs text-zinc-400 truncate">
                    {m.method ?? m.operator}
                    {m.phone ? ` · ${m.phone}` : ''}
                    {m.reference ? ` · réf: ${m.reference}` : ''}
                  </p>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <span className="text-sm font-semibold text-zinc-900">{formatMoney(Number(m.amount))}</span>
                  {mobile ? (
                    <button
                      disabled={confirming}
                      onClick={() => {
                        setMobileActionError(null)
                        setProviderConfirm({
                          paymentId: m.id,
                          method: m.method ?? m.operator ?? 'MOBILE_MONEY',
                          kind: 'mobile',
                          label: m.studentName,
                        })
                      }}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 text-xs text-white font-medium hover:bg-blue-700 disabled:opacity-50"
                    >
                      <CheckCircle size={11} /> Confirmer mobile
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setProviderConfirm({
                        paymentId: m.id,
                        method: m.method ?? m.operator ?? 'BANK',
                        kind: 'bank',
                        label: m.studentName,
                      })}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-zinc-200 text-xs text-zinc-600 hover:bg-zinc-50"
                      title="Carte / virement — confirmation bancaire"
                    >
                      <Shield size={11} /> Confirmer banque
                    </button>
                  )}
                </div>
              </div>
            )})}
          </div>
        </div>
      )}

      {showManual && <ManualPaymentModal onClose={() => setShowManual(false)} />}
      {showLinkOrphan && <LinkOrphanModal onClose={() => setShowLinkOrphan(false)} />}

      {providerConfirm && (
        <ProviderConfirmModal
          target={providerConfirm}
          onClose={() => setProviderConfirm(null)}
          isPending={confirming || confirmBank.isPending}
          onConfirm={(proof) => {
            const { paymentId, kind } = providerConfirm
            const onError = (error: unknown) => {
              const err = error as { response?: { data?: { message?: string } } }
              const message = err.response?.data?.message
                ?? (kind === 'mobile'
                  ? 'Confirmation impossible — vérifiez que le paiement est bien Mobile Money.'
                  : 'Échec de confirmation bancaire.')
              if (kind === 'mobile') setMobileActionError(message)
              else toast.error(message)
            }
            const onSuccess = () => {
              toast.success(kind === 'mobile' ? 'Transaction mobile confirmée' : 'Paiement bancaire validé')
              setProviderConfirm(null)
              refetchPending()
              refetchMobile()
            }
            if (kind === 'mobile') {
              confirmMobile({ paymentId, proof }, { onSuccess, onError })
            } else {
              confirmBank.mutate({ paymentId, proof }, { onSuccess, onError })
            }
          }}
        />
      )}

      {detailItem && (
        <VerificationDetailDrawer
          item={detailItem}
          onClose={() => setDetailItem(null)}
          resending={resendingId === detailItem.paymentId}
          onResendReceipt={(paymentId) => {
            setResendingId(paymentId)
            resendReceipt(paymentId, {
              onSuccess: () => toast.success('Reçu renvoyé'),
              onSettled: () => setResendingId(null),
            })
          }}
        />
      )}

      <ConfirmDialog
        open={processConfirm != null}
        title="Marquer comme traité ?"
        description="Le paiement sera archivé comme traité et retiré de la file de vérification."
        impact={processConfirm ? [
          `Élève : ${processConfirm.studentName}`,
          `Montant : ${fmtMoney(processConfirm.amount, processConfirm.currency)}`,
        ] : []}
        confirmLabel="Marquer traité"
        loading={markProcessed.isPending}
        onConfirm={confirmMarkProcessed}
        onCancel={() => setProcessConfirm(null)}
      />
    </div>
  )
}
