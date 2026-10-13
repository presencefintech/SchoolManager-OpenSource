'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { RefreshCw, Plus, CheckCircle, RefreshCcw, RotateCcw, Search, FileText, AlertTriangle } from 'lucide-react'
import {
  useRefunds, useCreateRefund, useProcessRefund, useSyncRefundGateway,
  useStudentPaymentsDetailed, useFinanceStudentSearch, useStudentFinanceProfile, useFinanceClassDetail,
  useRefund,
} from '@/lib/hooks/use-finance'
import { RefundAccountingImpact } from '@/components/finance/refund-accounting-impact'
import { RefundDecisionHistory } from '@/components/finance/refund-decision-history'
import { RefundSchoolContext } from '@/components/finance/refund-school-context'
import {
  RefundActionButton,
  RefundDetailBlock,
  RefundFilterBar,
  RefundFilterPills,
  RefundInfoRow,
  RefundPageShell,
  RefundPanel,
  RefundPanelHeader,
  RefundSearchInput,
  RefundStat,
  RefundStatusBadge,
} from '@/components/finance/refund-page-ui'
import { FinanceStudentSearchField } from '@/components/finance/student-search-field'
import { fadeUp } from '@/lib/animations'
import { getApiErrorMessage } from '@/lib/api/client'
import { Skeleton } from '@/components/ui/skeleton'
import type { RefundRequest } from '@/types/finance'
import { useSchoolMoney } from '@/lib/finance/use-school-money'
import { useToast } from '@/providers/toast-provider'
import { cn } from '@/lib/utils'

const FILTER_OPTIONS = [
  { value: '', label: 'Tous' },
  { value: 'PENDING', label: 'En attente' },
  { value: 'APPROVED', label: 'Approuvés' },
  { value: 'PROCESSING', label: 'En cours' },
  { value: 'PROCESSED', label: 'Traités' },
  { value: 'FAILED', label: 'Échoués' },
]

function CreateRefundModal({ onClose }: { onClose: () => void }) {
  const { format: formatMoney } = useSchoolMoney()
  const { mutateAsync, isPending } = useCreateRefund()
  const [studentId, setStudentId] = useState(0)
  const [form, setForm] = useState({ paymentId: 0, amount: '', reason: '' })
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const { data: paymentsPage, isFetching: loadingPayments } = useStudentPaymentsDetailed(studentId)
  const payments = (paymentsPage?.data ?? []).filter(p => p.status === 'CONFIRMED')

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
  const inputCls = 'w-full rounded-xl border border-slate-200/80 bg-slate-50/80 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400/50'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm">
      <div className="w-full max-w-md mx-4 overflow-hidden rounded-2xl border border-slate-200/70 bg-gradient-to-br from-slate-50 via-white/90 to-emerald-50/60 shadow-2xl shadow-slate-900/20">
        <div className="h-1 bg-gradient-to-r from-emerald-400 via-teal-400 to-cyan-400" />
        <div className="p-6">
          <h2 className="text-lg font-semibold bg-gradient-to-r from-slate-800 to-emerald-800 bg-clip-text text-transparent mb-5">
            Nouvelle demande de remboursement
          </h2>
          {success ? (
            <div className="text-center py-6">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/15">
                <CheckCircle size={22} className="text-emerald-600" />
              </div>
              <p className="text-sm text-slate-700">Demande créée avec succès</p>
              <button onClick={onClose} className="mt-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 px-4 py-2 text-sm text-white shadow-md">
                Fermer
              </button>
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
                  <label className="block text-xs font-medium text-slate-500 mb-1">
                    Paiement à rembourser *
                  </label>
                  {loadingPayments ? (
                    <div className={cn(inputCls, 'text-slate-400')}>Chargement des paiements…</div>
                  ) : payments.length === 0 ? (
                    <div className="w-full rounded-xl border border-amber-200/80 bg-amber-50/80 px-3 py-2 text-sm text-amber-800">
                      Aucun paiement confirmé pour cet élève
                    </div>
                  ) : (
                    <select
                      required
                      value={form.paymentId || ''}
                      onChange={handlePaymentSelect}
                      className={inputCls}
                    >
                      <option value="">-- Sélectionner un paiement --</option>
                      {payments.map(p => (
                        <option key={p.id} value={p.id}>
                          #{p.id} · {formatMoney(Number(p.amount))}
                          {p.methodLabel ? ` · ${p.methodLabel}` : ''}
                          {p.feeSummary ? ` · ${p.feeSummary}` : ''}
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
                  <label className="block text-xs font-medium text-slate-500 mb-1">
                    Montant à rembourser *
                    {selectedPayment && (
                      <span className="ml-1 text-slate-400">
                        (max {formatMoney(Number(selectedPayment.amount))})
                      </span>
                    )}
                  </label>
                  <input
                    type="number" required min={1}
                    max={selectedPayment?.amount}
                    value={form.amount}
                    onChange={e => setForm(p => ({ ...p, amount: e.target.value }))}
                    className={inputCls}
                  />
                </div>
              )}

              {(form.paymentId > 0) && (
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Motif *</label>
                  <textarea required value={form.reason}
                    onChange={e => setForm(p => ({ ...p, reason: e.target.value }))}
                    rows={2}
                    className={cn(inputCls, 'resize-none')}
                  />
                </div>
              )}

              {error && <p className="text-xs text-rose-700 bg-rose-50/80 rounded-xl px-3 py-2 ring-1 ring-rose-200/60">{error}</p>}
              <div className="flex gap-2 pt-2">
                <button type="button" onClick={onClose}
                  className="flex-1 rounded-xl border border-slate-200/80 bg-slate-100/60 px-4 py-2 text-sm text-slate-600 hover:bg-slate-200/50">
                  Annuler
                </button>
                <button type="submit" disabled={isPending || !form.paymentId}
                  className="flex-1 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 px-4 py-2 text-sm font-medium text-white shadow-md disabled:opacity-50">
                  {isPending ? 'Création…' : 'Créer'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}

export default function RemboursementsPage() {
  const { format: formatMoney } = useSchoolMoney()
  const toast = useToast()
  const [statusFilter, setStatusFilter] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedRefundId, setSelectedRefundId] = useState<number | null>(null)
  const [processNote, setProcessNote] = useState('')
  const { data: refundsData, isLoading, refetch } = useRefunds({ status: statusFilter || undefined })
  const { mutateAsync: process, isPending: processing } = useProcessRefund()
  const { mutateAsync: sync, isPending: syncing } = useSyncRefundGateway()

  const refunds: RefundRequest[] = (refundsData as any)?.items ?? (Array.isArray(refundsData) ? refundsData : [])
  const visibleRefunds = refunds.filter((r) => {
    const q = searchTerm.trim().toLowerCase()
    if (!q) return true
    const haystack = [
      r.payment?.studentName,
      r.payment?.matricule,
      r.payment?.reference,
      r.reason,
      r.gateway?.refundRef,
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase()
    return haystack.includes(q)
  })
  const { data: selectedRefundDetail } = useRefund(selectedRefundId ?? 0)
  const selectedRefund =
    (selectedRefundDetail as RefundRequest | undefined)
    ?? visibleRefunds.find((r) => r.id === selectedRefundId)
    ?? refunds.find((r) => r.id === selectedRefundId)
    ?? null
  const selectedLookupKey = selectedRefund?.payment?.matricule ?? selectedRefund?.payment?.studentName ?? ''
  const { data: selectedHits = [] } = useFinanceStudentSearch(selectedLookupKey)
  const matchedStudent = selectedHits.find((s) =>
    selectedRefund?.payment?.matricule
      ? s.matricule?.toLowerCase() === selectedRefund.payment.matricule?.toLowerCase()
      : s.name?.toLowerCase() === selectedRefund?.payment?.studentName?.toLowerCase(),
  )
  const { data: selectedProfileData } = useStudentFinanceProfile(matchedStudent?.id ?? 0)
  const selectedProfile = (selectedProfileData as { profile?: Record<string, unknown> } | undefined)?.profile
  const selectedClassId = Number((selectedProfile?.classId as number | undefined) ?? 0)
  const { data: selectedClass } = useFinanceClassDetail(selectedClassId)
  const summary = refunds.reduce(
    (acc, r) => {
      acc.total += 1
      acc.amount += Number(r.amount || 0)
      if (r.status === 'PENDING') acc.pending += 1
      if (r.status === 'APPROVED') acc.approved += 1
      if (r.status === 'PROCESSED' || r.status === 'SYNCED') acc.processed += 1
      if (r.status === 'FAILED') acc.failed += 1
      return acc
    },
    { total: 0, amount: 0, pending: 0, approved: 0, processed: 0, failed: 0 },
  )

  function handleSelectRefund(id: number) {
    setSelectedRefundId(id)
    setProcessNote('')
  }

  async function handleProcessRefund(id: number) {
    try {
      await process({ id, payload: { notes: processNote || undefined } })
      toast.success('Remboursement traité', 'La demande est passée au statut traité.')
      setProcessNote('')
    } catch (err) {
      toast.error('Traitement impossible', getApiErrorMessage(err))
    }
  }

  async function handleSyncRefund(id: number) {
    try {
      await sync(id)
      toast.success('Synchronisation envoyée', 'Le statut gateway a été demandé.')
    } catch (err) {
      toast.error('Synchronisation impossible', getApiErrorMessage(err))
    }
  }

  return (
    <div className="min-h-full bg-gradient-to-br from-slate-100 via-[#eef2f8] to-emerald-50/40 px-8 py-8">
      <RefundPageShell>
        <motion.div
          className="flex items-center justify-between"
          initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}
        >
          <div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-slate-800 via-emerald-800 to-teal-700 bg-clip-text text-transparent">
              Remboursements
            </h1>
            <p className="text-sm text-slate-600 mt-0.5">Gestion des demandes de remboursement</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => refetch()}
              className="rounded-xl border border-slate-200/80 bg-slate-100/60 p-2 text-slate-500 hover:bg-slate-200/50 transition-colors"
            >
              <RefreshCw size={14} />
            </button>
            <button
              onClick={() => setShowCreate(true)}
              className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 px-4 py-2 text-sm font-medium text-white shadow-md shadow-emerald-500/25 hover:from-emerald-600 hover:to-teal-600"
            >
              <Plus size={14} /> Nouveau remboursement
            </button>
          </div>
        </motion.div>

        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
          <RefundStat label="Total demandes" value={String(summary.total)} tone="indigo" />
          <RefundStat label="Montant cumulé" value={formatMoney(summary.amount)} tone="slate" />
          <RefundStat label="En attente" value={String(summary.pending)} tone="amber" />
          <RefundStat label="Approuvés" value={String(summary.approved)} tone="sky" />
          <RefundStat label="Traités/sync" value={String(summary.processed)} tone="emerald" />
          <RefundStat label="Échoués" value={String(summary.failed)} tone="rose" />
        </div>

        <RefundFilterBar>
          <RefundFilterPills value={statusFilter} onChange={setStatusFilter} options={FILTER_OPTIONS} />
          <label className="relative flex flex-1 max-w-sm items-center">
            <Search size={14} className="absolute left-3 text-slate-400" />
            <RefundSearchInput
              value={searchTerm}
              onChange={setSearchTerm}
              placeholder="Rechercher élève, matricule, référence..."
            />
          </label>
        </RefundFilterBar>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
          <motion.div variants={fadeUp} initial="hidden" animate="show" className="xl:col-span-2">
            <RefundPanel accent="emerald">
              <RefundPanelHeader
                title="Liste des remboursements"
                icon={RotateCcw}
                badge={
                  <span className="rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-xs font-medium text-emerald-700">
                    {visibleRefunds.length}
                  </span>
                }
              />

              {isLoading ? (
                <div className="p-5 space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 bg-slate-200/50" />)}</div>
              ) : visibleRefunds.length === 0 ? (
                <div className="py-14 text-center">
                  <RotateCcw size={28} className="mx-auto text-slate-300 mb-2" />
                  <p className="text-sm text-slate-500">Aucun remboursement</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-200/60 bg-slate-100/50">
                        <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500">Élève</th>
                        <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500">Montant</th>
                        <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500">Statut</th>
                        <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500">Date</th>
                        <th className="px-5 py-3" />
                      </tr>
                    </thead>
                    <tbody>
                      {visibleRefunds.map((r) => {
                        const isActive = selectedRefundId === r.id
                        return (
                          <tr
                            key={r.id}
                            className={cn(
                              'border-b border-slate-100/80 transition-colors',
                              isActive
                                ? 'bg-gradient-to-r from-emerald-50/70 to-teal-50/40'
                                : 'hover:bg-slate-100/40',
                            )}
                          >
                            <td className="px-5 py-3.5 font-medium text-slate-800">
                              <span>{r.payment?.studentName ?? '—'}</span>
                              {r.payment?.matricule && <span className="block text-xs text-slate-500">{r.payment.matricule}</span>}
                            </td>
                            <td className="px-5 py-3.5 font-bold text-slate-800 tabular-nums">{formatMoney(Number(r.amount))}</td>
                            <td className="px-5 py-3.5">
                              <RefundStatusBadge status={r.status} />
                            </td>
                            <td className="px-5 py-3.5 text-slate-500 text-xs">{new Date(r.createdAt).toLocaleDateString('fr-FR')}</td>
                            <td className="px-5 py-3.5 text-right">
                              <button
                                onClick={() => handleSelectRefund(r.id)}
                                className={cn(
                                  'text-xs px-2.5 py-1 rounded-lg font-medium transition-colors',
                                  isActive
                                    ? 'bg-emerald-500/15 text-emerald-800 ring-1 ring-emerald-500/25'
                                    : 'border border-slate-200/80 bg-slate-100/50 text-slate-600 hover:bg-slate-200/50',
                                )}
                              >
                                Détail
                              </button>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </RefundPanel>
          </motion.div>

          <motion.aside variants={fadeUp} initial="hidden" animate="show">
            <RefundPanel accent="violet" className="h-fit">
              <RefundPanelHeader title="Détail remboursement" icon={FileText} subtitle="Actions guichet" />
              {!selectedRefund ? (
                <div className="px-5 py-10 text-center text-sm text-slate-500">
                  Sélectionnez une ligne pour afficher le détail et exécuter les actions.
                </div>
              ) : (
                <div className="space-y-3 px-5 py-4">
                  <RefundDetailBlock tone="slate">
                    <p className="font-semibold text-slate-800">{selectedRefund.payment?.studentName ?? '—'}</p>
                    {selectedRefund.payment?.matricule && (
                      <p className="text-slate-500">{selectedRefund.payment.matricule}</p>
                    )}
                  </RefundDetailBlock>

                  <div className="grid grid-cols-2 gap-2">
                    <RefundInfoRow label="Montant" value={formatMoney(Number(selectedRefund.amount))} />
                    <div className="rounded-lg bg-slate-100/40 px-3 py-2">
                      <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500">Statut</p>
                      <div className="mt-1">
                        <RefundStatusBadge status={selectedRefund.status} />
                      </div>
                    </div>
                  </div>

                  <RefundDetailBlock title="Motif" tone="amber">
                    <p className="text-slate-700">{selectedRefund.reason || '—'}</p>
                  </RefundDetailBlock>

                  <RefundDecisionHistory refund={selectedRefund} />

                  <RefundAccountingImpact
                    studentId={matchedStudent?.id ?? 0}
                    amount={Number(selectedRefund.amount)}
                    status={selectedRefund.status}
                  />

                  <div className="grid grid-cols-2 gap-2">
                    <RefundInfoRow label="Réf. paiement" value={selectedRefund.payment?.reference ?? '—'} />
                    <RefundInfoRow label="Méthode" value={selectedRefund.payment?.method ?? '—'} />
                  </div>

                  <RefundSchoolContext
                    profile={selectedProfile as { class?: { name?: string } }}
                    classDetail={selectedClass as { name?: string; section?: { name?: string }; option?: { name?: string } }}
                    classNameFallback={matchedStudent?.className}
                  />

                  {selectedRefund.status === 'FAILED' && (
                    <div className="rounded-xl border border-rose-200/80 bg-gradient-to-br from-rose-50/90 to-red-50/60 px-3 py-3 text-xs">
                      <p className="flex items-center gap-1.5 font-semibold text-rose-800">
                        <AlertTriangle size={14} />
                        Échec gateway
                      </p>
                      <p className="mt-1 text-rose-700/90">
                        Le remboursement Flutterwave a échoué (HTTP 400). Vérifiez que le paiement est remboursable côté opérateur, puis réessayez.
                      </p>
                    </div>
                  )}

                  {selectedRefund.gateway && selectedRefund.status !== 'FAILED' && (
                    <RefundDetailBlock title="Gateway" tone="violet">
                      <p className="text-slate-600">Provider: {selectedRefund.gateway.provider ?? '—'}</p>
                      <p className="text-slate-600">RefundRef: {selectedRefund.gateway.refundRef ?? '—'}</p>
                      <p className="text-slate-600">Status: {selectedRefund.gateway.status ?? '—'}</p>
                    </RefundDetailBlock>
                  )}

                  {(selectedRefund.status === 'APPROVED' || selectedRefund.status === 'PROCESSED' || selectedRefund.status === 'FAILED') && (
                    <div>
                      <label className="block text-xs font-medium text-slate-500 mb-1">Note opérationnelle</label>
                      <textarea
                        value={processNote}
                        onChange={(e) => setProcessNote(e.target.value)}
                        rows={2}
                        placeholder="Optionnel"
                        className="w-full rounded-xl border border-slate-200/80 bg-slate-50/80 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400/50"
                      />
                    </div>
                  )}

                  <div className="flex gap-2 pt-1">
                    {(selectedRefund.status === 'APPROVED' || selectedRefund.status === 'FAILED') && (
                      <RefundActionButton
                        className="flex-1"
                        onClick={() => handleProcessRefund(selectedRefund.id)}
                        disabled={processing}
                      >
                        <CheckCircle size={13} />
                        {processing
                          ? 'Traitement...'
                          : selectedRefund.status === 'FAILED'
                            ? 'Réessayer'
                            : 'Traiter'}
                      </RefundActionButton>
                    )}
                    {selectedRefund.status === 'PROCESSED' && (
                      <RefundActionButton
                        className="flex-1"
                        variant="sky"
                        onClick={() => handleSyncRefund(selectedRefund.id)}
                        disabled={syncing}
                      >
                        <RefreshCcw size={13} /> {syncing ? 'Sync...' : 'Sync gateway'}
                      </RefundActionButton>
                    )}
                  </div>
                </div>
              )}
            </RefundPanel>
          </motion.aside>
        </div>

        {showCreate && <CreateRefundModal onClose={() => setShowCreate(false)} />}
      </RefundPageShell>
    </div>
  )
}
