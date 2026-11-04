'use client'

import { labelFraudScore, normalizeFraudScorePercent } from '@/lib/business-labels'
import { labelPaymentProofType } from '@/lib/finance/payment-proof'
import { cn } from '@/lib/utils'
import type { PendingVerificationItem, PaymentProofType } from '@/types/admin'
import {
  PAYMENT_PROOF_TYPE_OPTIONS,
  defaultProofTypeForMethod,
} from '@/lib/finance/payment-proof'
import { AlertTriangle, CheckCircle2, Circle, ExternalLink, FileText, X } from 'lucide-react'

import { formatMoney } from '@/lib/finance/currency'
import { verificationSteps } from '@/lib/finance/verification-steps'

export function fmtMoney(amount: number, currency = 'USD') {
  return formatMoney(amount, currency)
}

export function VerificationStepper({ item }: { item: PendingVerificationItem }) {
  const steps = verificationSteps(item)
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-1">
        {steps.map((step, i) => {
          const done = item[step.field]
          const active = !done && (i === 0 || item[steps[i - 1].field])
          const checker =
            step.key === 'finance' ? item.financeCheckerName : item.adminCheckerName
          return (
            <div key={step.key} className="flex items-center gap-1">
              {i > 0 && <div className={cn('w-3 h-px', done || active ? 'bg-emerald-300' : 'bg-zinc-200')} />}
              <div
                className={cn(
                  'flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-medium',
                  done ? 'bg-emerald-50 text-emerald-700' : active ? 'bg-amber-50 text-amber-700' : 'bg-zinc-50 text-zinc-400',
                )}
                title={checker ? `${step.label} · ${checker}` : step.label}
              >
                {done ? <CheckCircle2 size={10} /> : active ? <Circle size={10} className="fill-amber-400 text-amber-400" /> : <Circle size={10} />}
                {step.label}
                {done && checker ? ` · ${checker.split(' ')[0]}` : ''}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export function FraudScoreBadge({ score, suspicion }: { score: number | null; suspicion?: boolean }) {
  const label = labelFraudScore(score, suspicion)
  if (score == null && !suspicion) return null
  const pct = score != null ? normalizeFraudScorePercent(score) : 0
  const cls =
    suspicion || pct >= 70 ? 'bg-red-50 text-red-700'
    : pct >= 40 ? 'bg-amber-50 text-amber-700'
    : 'bg-zinc-100 text-zinc-600'
  return (
    <span className={cn('inline-flex items-center gap-0.5 text-[10px] font-semibold px-1.5 py-0.5 rounded-full', cls)}>
      {(suspicion || pct >= 40) && <AlertTriangle size={10} />}
      {label}
    </span>
  )
}

function DetailRow({ label, value, mono }: { label: string; value?: string | null; mono?: boolean }) {
  if (!value) return null
  return (
    <div className="flex items-start justify-between gap-3 py-2 border-b border-zinc-50 last:border-0">
      <span className="text-xs text-zinc-400 flex-shrink-0">{label}</span>
      <span className={cn('text-xs text-zinc-700 text-right break-all', mono && 'font-mono')}>{value}</span>
    </div>
  )
}

export function PaymentProofFields({
  method,
  proofType,
  manualJustification,
  onProofTypeChange,
  onJustificationChange,
}: {
  method: string
  proofType: PaymentProofType
  manualJustification?: string
  onProofTypeChange: (value: PaymentProofType) => void
  onJustificationChange: (value: string) => void
}) {
  return (
    <div className="space-y-3">
      <div>
        <label className="block text-xs font-medium text-zinc-500 mb-1">Type de preuve *</label>
        <select
          value={proofType}
          onChange={(e) => onProofTypeChange(e.target.value as PaymentProofType)}
          className="w-full px-3 py-2 rounded-lg border border-zinc-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
        >
          {PAYMENT_PROOF_TYPE_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
        <p className="mt-1 text-[10px] text-zinc-400">
          Suggestion pour {method}: {labelPaymentProofType(defaultProofTypeForMethod(method))}
        </p>
      </div>
      {proofType === 'OTHER' && (
        <div>
          <label className="block text-xs font-medium text-zinc-500 mb-1">Motif explicite * (min. 10 car.)</label>
          <textarea
            required
            minLength={10}
            value={manualJustification ?? ''}
            onChange={(e) => onJustificationChange(e.target.value)}
            rows={3}
            className="w-full px-3 py-2 rounded-lg border border-zinc-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 resize-none"
            placeholder="Décrivez la nature de la preuve fournie…"
          />
        </div>
      )}
    </div>
  )
}

export function VerificationDetailDrawer({
  item,
  onClose,
  onResendReceipt,
  resending,
}: {
  item: PendingVerificationItem
  onClose: () => void
  onResendReceipt?: (paymentId: number) => void
  resending?: boolean
}) {
  return (
    <div className="fixed inset-0 z-[80] flex justify-end bg-black/40 backdrop-blur-sm">
      <div className="bg-white w-full max-w-md h-full shadow-2xl flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-100">
          <div>
            <h3 className="text-sm font-semibold text-zinc-900">Détail vérification</h3>
            <p className="text-xs text-zinc-500 mt-0.5">{item.studentName}</p>
          </div>
          <button type="button" onClick={onClose} className="p-1.5 rounded-lg hover:bg-zinc-100 text-zinc-400">
            <X size={16} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
          <div>
            <p className="text-2xl font-bold text-zinc-900 tabular-nums">{fmtMoney(item.amount, item.currency)}</p>
            <div className="mt-2 flex flex-wrap gap-2">
              <VerificationStepper item={item} />
              <FraudScoreBadge score={item.fraudScore} suspicion={item.suspicion} />
            </div>
          </div>

          <div className="rounded-xl border border-zinc-100 bg-zinc-50/50 p-3">
            <DetailRow label="Méthode" value={item.method} />
            <DetailRow label="Type de preuve" value={labelPaymentProofType(item.proofType)} />
            <DetailRow label="Motif / note" value={item.reconciliationNote} />
            <DetailRow label="Référence" value={item.reference} mono />
            <DetailRow label="Réf. opérateur" value={item.providerRef} mono />
            <DetailRow label="N° reçu" value={item.receiptNumber} mono />
            <DetailRow label="Matricule" value={item.studentMatricule} mono />
            <DetailRow label="Classe" value={item.studentClassName} />
            <DetailRow
              label="Date"
              value={new Date(item.createdAt).toLocaleString('fr-FR', { dateStyle: 'medium', timeStyle: 'short' })}
            />
            {item.studentBalance != null && item.studentBalance > 0 && (
              <DetailRow label="Solde élève" value={fmtMoney(item.studentBalance, item.currency)} />
            )}
          </div>

          {item.receiptUrl && (
            <div className="rounded-xl border border-emerald-100 bg-emerald-50/50 p-4">
              <div className="flex items-center gap-2 text-emerald-800 mb-2">
                <FileText size={14} />
                <span className="text-xs font-semibold">Reçu de paiement</span>
              </div>
              {item.receiptNumber && (
                <p className="text-xs text-emerald-700 font-mono mb-2">{item.receiptNumber}</p>
              )}
              <a
                href={item.receiptUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700 hover:text-emerald-900"
              >
                Ouvrir le reçu <ExternalLink size={12} />
              </a>
            </div>
          )}
        </div>

        <div className="px-5 py-4 border-t border-zinc-100 flex gap-2">
          {onResendReceipt && (
            <button
              type="button"
              disabled={resending}
              onClick={() => onResendReceipt(item.paymentId)}
              className="flex-1 px-4 py-2.5 rounded-xl border border-zinc-200 text-sm text-zinc-600 hover:bg-zinc-50 disabled:opacity-50"
            >
              {resending ? 'Envoi…' : 'Renvoyer le reçu'}
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            className="flex-1 px-4 py-2.5 rounded-xl bg-emerald-600 text-sm text-white font-medium hover:bg-emerald-700"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  )
}
