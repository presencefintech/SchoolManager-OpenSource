'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import {
  DollarSign, CheckCircle, AlertCircle, RefreshCw, FileDown, AlertTriangle, Printer,
} from 'lucide-react'
import {
  useProcessPayment, useDailyCashReport,
  useDownloadReceipt, useFinanceFeeStructures, useResolvedCashSession,
} from '@/lib/hooks/use-finance'
import { financeRoleApi } from '@/lib/finance/api/finance.api'
import { FinanceStudentSearchField } from '@/components/finances/student-search-field'
import { StudentFeeScheduleLink } from '@/components/finance/student-fee-schedule-link'
import {
  FeeAttributionPanel,
  type FeeAttributionValue,
} from '@/components/finance/fee-attribution-picker'
import { buildPaymentFeeLines } from '@/lib/finance/fee-schedule.utils'
import { fadeUp } from '@/lib/animations'
import { getApiErrorMessage } from '@/lib/api/client'
import { formatMoney } from '@/lib/finance/currency'

const METHODS = [
  { value: 'CASH',         label: 'Espèces' },
  { value: 'BANK',         label: 'Virement bancaire' },
  { value: 'ORANGE_MONEY', label: 'Orange Money' },
  { value: 'MPESA',        label: 'M-Pesa' },
  { value: 'AIRTEL_MONEY', label: 'Airtel Money' },
  { value: 'CARD',         label: 'Carte bancaire' },
]

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export default function PaiementsPage() {
  const { mutateAsync: processPayment, isPending } = useProcessPayment()
  const { data: dailyCash = [], refetch: refetchCash } = useDailyCashReport()
  const {
    session: currentSession,
    hasOpenSession: hasSession,
    academicSessionId,
    isLoading: sessionLoading,
    couldNotVerify,
    refetch: refetchSession,
  } = useResolvedCashSession()
  const { data: feeStructures = [] } = useFinanceFeeStructures()
  const downloadReceipt = useDownloadReceipt()

  const [attribution, setAttribution] = useState<FeeAttributionValue | null>(null)
  const [useCatalogFallback, setUseCatalogFallback] = useState(false)
  const [form, setForm] = useState({
    studentId: 0,
    amount: '',
    method: 'CASH',
    reference: '',
    comment: '',
    feeStructureId: '',
  })
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState('')
  const [lastPaymentId, setLastPaymentId] = useState<number | null>(null)
  const [thermalPrinting, setThermalPrinting] = useState(false)

  const cash: any[] = Array.isArray(dailyCash) ? dailyCash : []
  const needsRef = form.method !== 'CASH'
  const totalCash = cash.reduce((acc, r) => acc + (Number(r._sum?.amount) || 0), 0)
  const cashBlocked = form.method === 'CASH' && !hasSession && !couldNotVerify && !sessionLoading
  const hasCatalog = (feeStructures as unknown[]).length > 0
  const attributedAmount = attribution?.totalAmount
  const catalogFee = (feeStructures as { id: number; sessionId?: number; amount?: number }[]).find(
    f => String(f.id) === form.feeStructureId,
  )

  function reset() {
    setAttribution(null)
    setUseCatalogFallback(false)
    setForm({ studentId: 0, amount: '', method: 'CASH', reference: '', comment: '', feeStructureId: '' })
    setStatus('idle')
    setLastPaymentId(null)
  }

  function handleStudentSelect(id: number) {
    setForm(p => ({ ...p, studentId: id, amount: '', feeStructureId: '' }))
    setAttribution(null)
    setUseCatalogFallback(false)
    setStatus('idle')
  }

  function handleAttributionChange(next: FeeAttributionValue | null) {
    setAttribution(next)
    setUseCatalogFallback(false)
    setForm(p => ({
      ...p,
      amount: next ? String(next.totalAmount) : '',
      feeStructureId: '',
    }))
    setStatus('idle')
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.studentId) { setErrorMsg('Sélectionnez un élève'); setStatus('error'); return }
    if (cashBlocked) {
      setErrorMsg("Aucune session de caisse ouverte — ouvrez une session dans Caisse avant d'encaisser.")
      setStatus('error')
      return
    }

    const feeLines = attribution ? buildPaymentFeeLines(attribution.lines) : undefined
    const feeStructureId = feeLines?.length === 1 ? feeLines[0].feeStructureId : undefined
    const monthYear = feeLines?.length === 1 ? feeLines[0].monthYear : undefined
    const amount = attribution?.totalAmount ?? Number(form.amount)

    if (!attribution && !useCatalogFallback) {
      setErrorMsg('Sélectionnez au moins une ligne d\'échéancier à payer.')
      setStatus('error')
      return
    }
    if (useCatalogFallback && hasCatalog && !form.feeStructureId) {
      setErrorMsg('Veuillez sélectionner une structure de frais.')
      setStatus('error')
      return
    }
    if (!amount || amount <= 0) { setErrorMsg('Montant invalide'); setStatus('error'); return }

    const sessionIdForPayment =
      attribution?.sessionId
      ?? academicSessionId
      ?? catalogFee?.sessionId

    if (!sessionIdForPayment) {
      setErrorMsg('Session académique introuvable — rechargez la page ou contactez l\'administrateur.')
      setStatus('error')
      return
    }

    if (attribution?.lines.some(({ line, amount }) => amount > (line.amountRemaining ?? line.amount) + 0.01)) {
      setErrorMsg('Un montant dépasse le solde restant sur une ligne.')
      setStatus('error')
      return
    }

    setStatus('idle')
    try {
      const result = await processPayment({
        studentId: form.studentId,
        amount,
        method: form.method as 'CASH' | 'ORANGE_MONEY' | 'MPESA' | 'AIRTEL_MONEY' | 'BANK' | 'CARD',
        sessionId: sessionIdForPayment,
        reference: form.reference || undefined,
        comment: form.comment || undefined,
        ...(feeLines && feeLines.length > 0
          ? { fees: feeLines }
          : { feeStructureId: form.feeStructureId ? Number(form.feeStructureId) : undefined }),
      })
      setLastPaymentId((result as { paymentId?: number; id?: number })?.paymentId ?? (result as { id?: number })?.id ?? null)
      setStatus('success')
      refetchCash()
      refetchSession()
    } catch (err) {
      setErrorMsg(getApiErrorMessage(err))
      setStatus('error')
    }
  }

  async function handleDownloadReceipt() {
    if (!lastPaymentId) return
    try {
      const blob = await downloadReceipt.mutateAsync(lastPaymentId)
      downloadBlob(blob, `recu-${lastPaymentId}.pdf`)
    } catch {}
  }

  async function handleThermalReceipt() {
    if (!lastPaymentId) return
    setThermalPrinting(true)
    try {
      const data = await financeRoleApi.getThermalReceipt(lastPaymentId)
      const html = (data as { html?: string })?.html ?? (typeof data === 'string' ? data : JSON.stringify(data, null, 2))
      const win = window.open('', '_blank')
      if (win) {
        win.document.write(html)
        win.document.close()
        win.print()
      }
    } catch {} finally {
      setThermalPrinting(false)
    }
  }

  return (
    <div className="px-8 py-8 space-y-6">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-zinc-900">Paiements</h1>
            <p className="text-sm text-zinc-500 mt-0.5">Encaissement avec attribution des frais</p>
          </div>
          {hasSession && currentSession && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-100">
              <div className="w-2 h-2 rounded-full bg-emerald-500" />
              <span className="text-xs font-medium text-emerald-700">Session #{currentSession.id} ouverte</span>
            </div>
          )}
        </div>
      </motion.div>

      {couldNotVerify && form.method === 'CASH' && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-sky-50 border border-sky-100">
          <AlertTriangle size={15} className="text-sky-600 flex-shrink-0" />
          <p className="text-sm text-sky-800">
            Impossible d&apos;afficher l&apos;état de la caisse (erreur réseau). Une session est peut‑être déjà ouverte côté serveur — vous pouvez tenter l&apos;encaissement CASH.
          </p>
        </div>
      )}

      {cashBlocked && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-amber-50 border border-amber-100">
          <AlertTriangle size={15} className="text-amber-500 flex-shrink-0" />
          <p className="text-sm text-amber-700">Aucune session de caisse ouverte. Rendez-vous dans <strong>Caisse</strong> pour ouvrir une session avant d&apos;encaisser en espèces.</p>
        </div>
      )}

      <div className="grid grid-cols-2 gap-6">
        <motion.div variants={fadeUp} initial="hidden" animate="show" className="bg-white rounded-2xl border border-zinc-100 shadow-sm p-6">
          <h2 className="text-sm font-semibold text-zinc-900 mb-5">Encaisser un paiement</h2>

          {status === 'success' && (
            <div className="flex items-center justify-between px-4 py-3 rounded-xl bg-emerald-50 border border-emerald-100 mb-4">
              <div className="flex items-center gap-2">
                <CheckCircle size={15} className="text-emerald-600 flex-shrink-0" />
                <p className="text-sm text-emerald-700 font-medium">Paiement enregistré avec succès</p>
              </div>
              {lastPaymentId && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleDownloadReceipt}
                    disabled={downloadReceipt.isPending}
                    className="flex items-center gap-1 text-xs text-emerald-700 hover:underline disabled:opacity-50"
                    title="Télécharger PDF"
                  >
                    <FileDown size={12} /> PDF
                  </button>
                  <button
                    onClick={handleThermalReceipt}
                    disabled={thermalPrinting}
                    className="flex items-center gap-1 text-xs text-zinc-600 hover:underline disabled:opacity-50"
                    title="Imprimer ticket thermique"
                  >
                    <Printer size={12} /> Ticket
                  </button>
                </div>
              )}
            </div>
          )}
          {status === 'error' && (
            <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-red-50 border border-red-100 mb-4">
              <AlertCircle size={15} className="text-red-600 flex-shrink-0" />
              <p className="text-sm text-red-700">{errorMsg}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <FinanceStudentSearchField
              studentId={form.studentId}
              onSelect={handleStudentSelect}
              label="Élève"
              required
            />
            {form.studentId > 0 && (
              <div className="-mt-2">
                <StudentFeeScheduleLink studentId={form.studentId} variant="inline" />
              </div>
            )}

            {form.studentId > 0 && !useCatalogFallback && (
              <FeeAttributionPanel
                studentId={form.studentId}
                sessionId={academicSessionId ?? undefined}
                value={attribution}
                onChange={handleAttributionChange}
              />
            )}

            {form.studentId > 0 && (
              <label className="flex items-center gap-2 text-xs text-zinc-500 cursor-pointer">
                <input
                  type="checkbox"
                  checked={useCatalogFallback}
                  onChange={(e) => {
                    setUseCatalogFallback(e.target.checked)
                    setAttribution(null)
                    setForm(p => ({ ...p, amount: '', feeStructureId: '' }))
                  }}
                  className="rounded border-zinc-300"
                />
                Paiement hors échéancier (catalogue / montant libre)
              </label>
            )}

            {useCatalogFallback && hasCatalog && (
              <div>
                <label className="block text-xs font-medium text-zinc-500 mb-1">
                  Structure de frais <span className="text-red-500">*</span>
                </label>
                <select
                  value={form.feeStructureId}
                  onChange={e => {
                    const id = e.target.value
                    const fs = (feeStructures as { id: number; amount?: number }[]).find(f => String(f.id) === id)
                    setForm(p => ({
                      ...p,
                      feeStructureId: id,
                      amount: fs?.amount != null ? String(fs.amount) : p.amount,
                    }))
                    setStatus('idle')
                  }}
                  className="w-full px-3 py-2 rounded-lg border border-zinc-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
                >
                  <option value="">— Sélectionner —</option>
                  {(feeStructures as { id: number; label: string; amount: number }[]).map((fs) => (
                    <option key={fs.id} value={fs.id}>{fs.label} · {formatMoney(Number(fs.amount))}</option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-zinc-500 mb-1">Montant ($) *</label>
              <input
                type="number"
                required
                min={1}
                step="0.01"
                readOnly={!!attribution || (useCatalogFallback && !!form.feeStructureId)}
                value={attribution ? String(attributedAmount) : form.amount}
                onChange={e => { setForm(p => ({ ...p, amount: e.target.value })); setStatus('idle') }}
                placeholder="50"
                className="w-full px-3 py-2 rounded-lg border border-zinc-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 read-only:bg-zinc-50 read-only:text-zinc-600"
              />
              {attribution && (
                <p className="text-xs text-emerald-600 mt-1">
                  {attribution.lines.length} ligne{attribution.lines.length > 1 ? 's' : ''} · total ventilé
                </p>
              )}
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-500 mb-1">Mode de paiement *</label>
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
                  Référence * <span className="text-zinc-400 font-normal">(obligatoire)</span>
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

            <div className="flex gap-2">
              <button
                type="submit"
                disabled={isPending || cashBlocked}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 text-sm text-white font-medium hover:bg-emerald-700 disabled:opacity-50 transition-colors"
              >
                <DollarSign size={15} />
                {isPending ? 'Encaissement...' : 'Encaisser'}
              </button>
              {status !== 'idle' && (
                <button type="button" onClick={reset}
                  className="px-4 py-2.5 rounded-xl border border-zinc-200 text-sm text-zinc-600 hover:bg-zinc-50">
                  Nouveau
                </button>
              )}
            </div>
          </form>
        </motion.div>

        <div className="bg-white rounded-2xl border border-zinc-100 shadow-sm">
          <div className="px-5 py-4 border-b border-zinc-100 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-zinc-900">Rapport du jour</h2>
            <div className="flex items-center gap-2">
              {totalCash > 0 && (
                <span className="text-xs font-semibold text-emerald-700">{formatMoney(totalCash)}</span>
              )}
              <button onClick={() => refetchCash()} className="p-1.5 rounded-lg text-zinc-400 hover:bg-zinc-100 transition-colors">
                <RefreshCw size={13} />
              </button>
            </div>
          </div>
          {cash.length === 0 ? (
            <div className="py-12 text-center">
              <DollarSign size={24} className="mx-auto text-zinc-300 mb-2" />
              <p className="text-sm text-zinc-400">Aucun encaissement aujourd&apos;hui</p>
            </div>
          ) : (
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
                  {cash.map((row: { method?: string; _count?: { id?: number }; _sum?: { amount?: number } }, i: number) => (
                    <tr key={i} className="border-b border-zinc-50 hover:bg-zinc-50/50">
                      <td className="px-5 py-3 font-medium text-zinc-900">{row.method ?? '—'}</td>
                      <td className="px-5 py-3 text-right text-zinc-500">{row._count?.id ?? 0}</td>
                      <td className="px-5 py-3 text-right font-semibold text-emerald-700">
                        {row._sum?.amount != null ? formatMoney(Number(row._sum.amount)) : '—'}
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
                      {formatMoney(totalCash)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
