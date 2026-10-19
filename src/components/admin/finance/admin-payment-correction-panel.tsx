'use client'

import { useMemo, useState } from 'react'
import { CheckCircle2, Loader2, Receipt, RefreshCw, Undo2 } from 'lucide-react'
import { StudentSearchField } from '@/components/admin/shared/student-search-field'
import { useAdminCorrectPaymentLines, useAdminStudentPaymentsDetailed } from '@/lib/hooks/use-admin'
import { getApiErrorMessage } from '@/lib/api/client'
import { formatMoney } from '@/lib/finance/currency'
import { printRectification } from '@/lib/finance/print-rectification'
import {
  activeLinesOf,
  isCorrectable,
  monthlyKey,
  toggleWithSuffixRule,
} from '@/lib/finance/payment-line-correction'
import { useToast } from '@/providers/toast-provider'
import { cn } from '@/lib/utils'

/** Aligné sur la validation backend (adminCorrectPaymentLines). */
const REASON_MIN = 8
const REASON_MAX = 500
const MAX_LINES = 24

function formatDate(iso: string | null): string {
  if (!iso) return '—'
  const d = new Date(iso)
  return Number.isNaN(d.getTime())
    ? '—'
    : d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })
}

export function AdminPaymentCorrectionPanel({ canCorrect }: { canCorrect: boolean }) {
  const toast = useToast()
  const [studentId, setStudentId] = useState(0)
  const [paymentId, setPaymentId] = useState<number | null>(null)
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [reason, setReason] = useState('')

  const paymentsQuery = useAdminStudentPaymentsDetailed(studentId, { page: 1, limit: 20 })
  const correct = useAdminCorrectPaymentLines()

  const payments = useMemo(() => paymentsQuery.data?.data ?? [], [paymentsQuery.data])
  const payment = payments.find((p) => p.id === paymentId) ?? null
  const lines = useMemo(() => (payment ? activeLinesOf(payment) : []), [payment])
  const reversedLines = payment ? payment.fees.filter((f) => f.reversedAt) : []
  const selectedTotal = lines.filter((l) => selected.has(l.id)).reduce((sum, l) => sum + l.amount, 0)
  const trimmedReason = reason.trim()
  const canSubmit =
    canCorrect &&
    !!payment &&
    selected.size > 0 &&
    selected.size <= MAX_LINES &&
    trimmedReason.length >= REASON_MIN &&
    !correct.isPending

  const selectStudent = (id: number) => {
    setStudentId(id)
    setPaymentId(null)
    setSelected(new Set())
  }

  const selectPayment = (id: number) => {
    setPaymentId(id)
    setSelected(new Set())
  }

  const handleSubmit = () => {
    if (!payment || !canSubmit) return
    correct.mutate(
      { paymentId: payment.id, paymentFeeIds: [...selected], reason: trimmedReason },
      {
        onSuccess: (result) => {
          toast.success(
            'Correction enregistrée',
            `${formatMoney(result.amountReversed, payment.currency)} contre-passé${
              result.receiptNumber ? ` · avoir ${result.receiptNumber}` : ''
            }`,
          )
          printRectification(result.pdfBase64, result.pdfFilename)
          setSelected(new Set())
          setReason('')
          void paymentsQuery.refetch()
        },
        onError: (err) => toast.error('Correction impossible', getApiErrorMessage(err)),
      },
    )
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
      <section className="rounded-xl border border-zinc-200 bg-white shadow-sm overflow-hidden">
        <div className="space-y-3 border-b border-zinc-100 px-4 py-4">
          <div>
            <h2 className="text-sm font-semibold text-zinc-800 flex items-center gap-2">
              <Undo2 size={15} className="text-rose-600" />
              Corriger un encaissement espèces
            </h2>
            <p className="mt-1 text-xs text-zinc-500">
              Contre-passation de lignes après clôture de caisse : le reçu d’origine reste archivé,
              un avoir et un reçu rectificatif sont émis. Paiements scellés ou avec remboursement en
              cours exclus.
            </p>
          </div>
          <StudentSearchField studentId={studentId} onSelect={selectStudent} required />
        </div>

        {!studentId ? (
          <p className="p-8 text-center text-sm text-zinc-400">Recherchez un élève pour voir ses encaissements.</p>
        ) : paymentsQuery.isLoading ? (
          <p className="p-8 text-center text-sm text-zinc-400">Chargement…</p>
        ) : paymentsQuery.isError ? (
          <div className="p-6 text-center">
            <p className="text-sm text-rose-600">{getApiErrorMessage(paymentsQuery.error)}</p>
            <button
              type="button"
              onClick={() => void paymentsQuery.refetch()}
              className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-zinc-100 px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-200"
            >
              <RefreshCw size={12} /> Réessayer
            </button>
          </div>
        ) : payments.length === 0 ? (
          <div className="py-12 text-center">
            <Receipt size={28} className="mx-auto text-zinc-300 mb-2" />
            <p className="text-sm text-zinc-400">Aucun encaissement pour cet élève.</p>
          </div>
        ) : (
          <ul className="divide-y divide-zinc-100 max-h-[520px] overflow-y-auto">
            {payments.map((p) => {
              const correctable = isCorrectable(p)
              return (
                <li key={p.id}>
                  <button
                    type="button"
                    disabled={!correctable}
                    onClick={() => selectPayment(p.id)}
                    className={cn(
                      'w-full text-left px-4 py-3 transition-colors',
                      correctable ? 'hover:bg-zinc-50' : 'cursor-not-allowed opacity-60',
                      paymentId === p.id && 'bg-rose-50/60',
                    )}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-zinc-900 tabular-nums">
                          {formatMoney(p.amount, p.currency)}
                          <span className="ml-2 text-xs font-normal text-zinc-500">
                            {formatDate(p.confirmedAt || p.createdAt)}
                          </span>
                        </p>
                        <p className="mt-0.5 truncate text-xs text-zinc-500">
                          {p.receiptNumber ?? `Paiement #${p.id}`} · {p.methodLabel}
                        </p>
                        <p className="mt-1 line-clamp-1 text-xs text-zinc-400">{p.feeSummary}</p>
                      </div>
                      <span
                        className={cn(
                          'shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ring-1',
                          correctable
                            ? 'bg-emerald-50 text-emerald-800 ring-emerald-200'
                            : 'bg-zinc-50 text-zinc-500 ring-zinc-200',
                        )}
                      >
                        {correctable ? 'Corrigeable' : p.method === 'CASH' ? p.status : 'Hors espèces'}
                      </span>
                    </div>
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </section>

      <aside className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm space-y-3 h-fit">
        <h3 className="text-sm font-semibold text-zinc-800">Lignes à contre-passer</h3>
        {!payment ? (
          <p className="text-sm text-zinc-400">Sélectionnez un encaissement corrigeable.</p>
        ) : (
          <>
            <ul className="space-y-1.5">
              {lines.map((line) => {
                const checked = selected.has(line.id)
                return (
                  <li key={line.id}>
                    <label
                      className={cn(
                        'flex cursor-pointer items-center justify-between gap-2 rounded-lg border px-3 py-2 text-sm transition-colors',
                        checked ? 'border-rose-300 bg-rose-50' : 'border-zinc-200 hover:bg-zinc-50',
                      )}
                    >
                      <span className="flex min-w-0 items-center gap-2">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => setSelected((prev) => toggleWithSuffixRule(lines, prev, line))}
                          className="h-4 w-4 shrink-0 rounded border-zinc-300 accent-rose-600"
                        />
                        <span className="truncate text-zinc-800">{line.feeLabel}</span>
                      </span>
                      <span className="shrink-0 tabular-nums font-medium text-zinc-700">
                        {formatMoney(line.amount, payment.currency)}
                      </span>
                    </label>
                  </li>
                )
              })}
              {reversedLines.map((line, i) => (
                <li
                  key={`rev-${line.id ?? i}`}
                  className="flex items-center justify-between gap-2 rounded-lg bg-zinc-50 px-3 py-2 text-xs text-zinc-400"
                  title={line.reversalReason ?? undefined}
                >
                  <span className="truncate line-through">{line.feeLabel}</span>
                  <span className="shrink-0">déjà corrigée</span>
                </li>
              ))}
            </ul>

            {lines.some((l) => monthlyKey(l) != null) && (
              <p className="text-[11px] text-zinc-500">
                Frais mensuels : les mois les plus récents sont annulés en premier (sélection
                ajustée automatiquement).
              </p>
            )}

            <label className="block text-xs font-medium text-zinc-600">
              Motif de correction (obligatoire, audit)
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={3}
                maxLength={REASON_MAX}
                placeholder="Ex. décembre encaissé par erreur, parent n’a payé que novembre"
                className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-400"
              />
              <span
                className={cn(
                  'mt-1 block text-[11px]',
                  trimmedReason.length >= REASON_MIN ? 'text-zinc-400' : 'text-amber-600',
                )}
              >
                {trimmedReason.length}/{REASON_MAX} — minimum {REASON_MIN} caractères
              </span>
            </label>

            {selected.size > 0 && (
              <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-900">
                Avoir de <span className="font-bold tabular-nums">{formatMoney(selectedTotal, payment.currency)}</span>{' '}
                sur {selected.size} ligne{selected.size > 1 ? 's' : ''}.
              </div>
            )}

            <button
              type="button"
              disabled={!canSubmit}
              onClick={handleSubmit}
              className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-rose-600 px-3 py-2 text-sm font-semibold text-white hover:bg-rose-700 disabled:opacity-50"
            >
              {correct.isPending ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
              {correct.isPending ? 'Correction…' : 'Corriger et émettre l’avoir'}
            </button>
            {!canCorrect && (
              <p className="text-[11px] text-amber-700">Réservé aux administrateurs de l’établissement.</p>
            )}
          </>
        )}
      </aside>
    </div>
  )
}
