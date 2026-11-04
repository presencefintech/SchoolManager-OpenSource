'use client'

import { ArrowRight, CheckCircle2, Circle, Scale } from 'lucide-react'
import { useStudentWallet } from '@/lib/hooks/use-finance'
import { useSchoolMoney } from '@/lib/finance/use-school-money'
import { RefundDetailBlock } from '@/components/finance/refund-page-ui'
import type { StudentWallet } from '@/types/finance'
import { cn } from '@/lib/utils'

const WORKFLOW_STEPS = [
  { key: 'request', label: 'Demande guichet', statuses: ['PENDING', 'APPROVED', 'REJECTED', 'PROCESSING', 'PROCESSED', 'SYNCED', 'FAILED', 'CANCELLED'] },
  { key: 'review', label: 'Validation admin', statuses: ['APPROVED', 'REJECTED', 'PROCESSING', 'PROCESSED', 'SYNCED', 'FAILED'] },
  { key: 'settle', label: 'Reverse comptable', statuses: ['PROCESSED', 'SYNCED'] },
] as const

function stepDone(stepKey: string, status: string) {
  if (stepKey === 'request') return true
  if (stepKey === 'review') {
    return ['APPROVED', 'PROCESSING', 'PROCESSED', 'SYNCED', 'FAILED'].includes(status)
  }
  if (stepKey === 'settle') {
    return ['PROCESSED', 'SYNCED'].includes(status)
  }
  return false
}

function stepActive(stepKey: string, status: string) {
  if (stepKey === 'review') return status === 'PENDING'
  if (stepKey === 'settle') {
    return ['APPROVED', 'PROCESSING', 'FAILED'].includes(status)
  }
  return false
}

export function RefundAccountingImpact({
  studentId,
  amount,
  status,
}: {
  studentId: number
  amount: number
  status: string
}) {
  const { format: formatMoney } = useSchoolMoney()
  const { data: walletData, isLoading } = useStudentWallet(studentId)
  const wallet = walletData as StudentWallet | undefined
  const refundAmount = Number(amount) || 0
  const currentBalance = Number(wallet?.balance ?? 0)
  const currentPaid = Number(wallet?.totalPaid ?? 0)
  const projectedBalance = currentBalance + refundAmount
  const projectedPaid = Math.max(0, currentPaid - refundAmount)
  const settled = ['PROCESSED', 'SYNCED'].includes(status)
  const pendingSettlement = ['APPROVED', 'FAILED'].includes(status)
  const rejected = status === 'REJECTED'
  const awaitingAdmin = status === 'PENDING'
  const gatewayPending = status === 'PROCESSING'

  return (
    <RefundDetailBlock title="Impact comptable" tone="violet">
      <div className="mb-3 flex items-center gap-1.5 text-violet-800">
        <Scale size={13} />
        <span className="font-semibold">Cycle professionnel</span>
      </div>

      <ol className="mb-3 space-y-1.5">
        {WORKFLOW_STEPS.map((step) => {
          const done = stepDone(step.key, status)
          const active = stepActive(step.key, status)
          return (
            <li key={step.key} className="flex items-center gap-2 text-slate-600">
              {done ? (
                <CheckCircle2 size={13} className="shrink-0 text-emerald-600" />
              ) : (
                <Circle size={13} className={cn('shrink-0', active ? 'text-amber-500 fill-amber-100' : 'text-slate-300')} />
              )}
              <span className={cn(done && 'text-slate-700', active && 'font-medium text-amber-800')}>
                {step.label}
                {step.key === 'review' && status === 'REJECTED' && ' — rejeté'}
                {step.key === 'settle' && gatewayPending && ' — en cours chez l’opérateur'}
              </span>
            </li>
          )
        })}
      </ol>

      {rejected && (
        <p className="rounded-lg bg-slate-100/70 px-2.5 py-2 text-slate-600">
          Aucun impact sur le solde élève : la demande a été rejetée avant exécution.
        </p>
      )}

      {awaitingAdmin && (
        <p className="rounded-lg bg-amber-50/80 px-2.5 py-2 text-amber-800">
          L&apos;approbation admin <strong>ne modifie pas</strong> le solde. Le reverse comptable intervient uniquement après traitement guichet réussi.
        </p>
      )}

      {(pendingSettlement || gatewayPending || settled) && studentId > 0 && (
        <div className="space-y-2">
          {isLoading ? (
            <p className="text-slate-500">Chargement du portefeuille élève…</p>
          ) : wallet ? (
            <>
              <div className="grid grid-cols-2 gap-2">
                <Metric label="Solde actuel" value={formatMoney(currentBalance)} />
                <Metric label="Total payé" value={formatMoney(currentPaid)} />
              </div>

              {!settled && !gatewayPending && (
                <div className="rounded-lg border border-violet-200/60 bg-white/50 px-2.5 py-2">
                  <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-violet-700">
                    Après exécution réussie
                  </p>
                  <div className="flex flex-wrap items-center gap-2 text-slate-700">
                    <span>Solde {formatMoney(currentBalance)}</span>
                    <ArrowRight size={12} className="text-violet-400" />
                    <span className="font-semibold text-rose-700">{formatMoney(projectedBalance)}</span>
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-slate-600">
                    <span>Payé {formatMoney(currentPaid)}</span>
                    <ArrowRight size={12} className="text-violet-400" />
                    <span className="font-medium">{formatMoney(projectedPaid)}</span>
                  </div>
                </div>
              )}

              {gatewayPending && (
                <p className="rounded-lg bg-sky-50/80 px-2.5 py-2 text-sky-800">
                  Remboursement opérateur en cours : le solde reste inchangé jusqu&apos;à confirmation.
                </p>
              )}

              {settled && (
                <p className="rounded-lg bg-emerald-50/80 px-2.5 py-2 text-emerald-800">
                  Reverse comptable appliqué : solde élève recrédité, inscription et historique mis à jour, paiement marqué remboursé si intégral.
                </p>
              )}
            </>
          ) : (
            <p className="text-slate-500">Portefeuille élève indisponible.</p>
          )}
        </div>
      )}

      <ul className="mt-3 space-y-1 text-[11px] text-slate-500 list-disc pl-4">
        <li>Montant remboursé = dette scolaire ré-augmentée (solde +{formatMoney(refundAmount)}).</li>
        <li>Total payé diminué du même montant.</li>
        <li>Écriture traçable dans l&apos;historique solde (réf. REFUND-#id).</li>
      </ul>
    </RefundDetailBlock>
  )
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-violet-50/50 px-2 py-1.5">
      <p className="text-[10px] uppercase tracking-wide text-slate-500">{label}</p>
      <p className="font-semibold text-slate-800 tabular-nums">{value}</p>
    </div>
  )
}
