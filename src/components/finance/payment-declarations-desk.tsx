'use client'

import { useState } from 'react'
import {
  CheckCircle,
  XCircle,
  RefreshCw,
  ImageIcon,
  AlertTriangle,
  Smartphone,
} from 'lucide-react'
import { usePaymentDeclarations, useReviewPaymentDeclaration } from '@/lib/hooks/use-finance'
import { getApiErrorMessage } from '@/lib/api/client'
import { Skeleton } from '@/components/ui/skeleton'
import { formatMoney } from '@/lib/finance/currency'
import { resolveBackendUploadHref } from '@/lib/finance/download-blob'
import { FinancePageHeader, FinancePageShell, FinancePanel } from '@/components/finance/finance-page-shell'
import { StudentFeeScheduleLink } from '@/components/finance/student-fee-schedule-link'
import type { PaymentDeclarationDto } from '@/types/finance'

const STATUS_TABS = [
  { id: 'PENDING' as const, label: 'En attente' },
  { id: 'APPROVED' as const, label: 'Validées' },
  { id: 'REJECTED' as const, label: 'Rejetées' },
  { id: undefined, label: 'Toutes' },
]

function proofHref(url: string | null | undefined): string | null {
  if (!url?.trim()) return null
  if (url.startsWith('/uploads/')) return resolveBackendUploadHref(url)
  if (url.startsWith('/api/')) return url
  if (url.startsWith('/')) return `/api/v1${url}`
  return url
}

const REJECT_PRESETS = [
  'Justificatif illisible / flou',
  'Référence ou montant non visibles',
  'Le justificatif ne correspond pas à la déclaration',
]

type FilterStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | undefined

function statusBadge(status: PaymentDeclarationDto['status']) {
  if (status === 'APPROVED') return 'bg-emerald-50 text-emerald-700'
  if (status === 'REJECTED') return 'bg-red-50 text-red-700'
  return 'bg-amber-50 text-amber-800'
}

function statusLabel(status: PaymentDeclarationDto['status']) {
  if (status === 'APPROVED') return 'Validée'
  if (status === 'REJECTED') return 'Rejetée'
  return 'En attente'
}

export function PaymentDeclarationsDesk({ variant }: { variant: 'finance' | 'admin' }) {
  const [status, setStatus] = useState<FilterStatus>('PENDING')
  const { data, isLoading, isFetching, refetch } = usePaymentDeclarations(status)
  const [proof, setProof] = useState<PaymentDeclarationDto | null>(null)
  const [rejecting, setRejecting] = useState<PaymentDeclarationDto | null>(null)

  const items = data?.items ?? []
  const inner = (
    <>
      {variant === 'finance' ? (
        <FinancePageHeader
          title="Déclarations SMS / mobile"
          subtitle="Vérifiez la capture d’écran du SMS, puis validez ou rejetez avec un motif."
          accent="emerald"
          actions={
            <button
              type="button"
              onClick={() => void refetch()}
              className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs font-medium text-zinc-600 hover:bg-zinc-50"
            >
              <RefreshCw size={13} className={isFetching ? 'animate-spin' : ''} />
              Actualiser
            </button>
          }
        />
      ) : (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-lg font-semibold text-zinc-900">Déclarations SMS / mobile</h1>
            <p className="text-xs text-zinc-500">
              Justificatifs parents — valider ou rejeter avec motif obligatoire.
            </p>
          </div>
          <button
            type="button"
            onClick={() => void refetch()}
            className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs font-medium text-zinc-600 hover:bg-zinc-50"
          >
            <RefreshCw size={13} className={isFetching ? 'animate-spin' : ''} />
            Actualiser
          </button>
        </div>
      )}

      <div className="flex flex-wrap gap-1.5">
        {STATUS_TABS.map((tab) => {
          const active = status === tab.id
          return (
            <button
              key={tab.label}
              type="button"
              onClick={() => setStatus(tab.id)}
              className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                active
                  ? 'bg-emerald-600 text-white'
                  : 'bg-white text-zinc-600 ring-1 ring-zinc-200 hover:bg-zinc-50'
              }`}
            >
              {tab.label}
            </button>
          )
        })}
      </div>

      <FinancePanel
        title="File de déclarations"
        icon={Smartphone}
        headerRight={
          <span className="text-xs text-zinc-400">{data?.total ?? 0} déclaration(s)</span>
        }
      >
        {isLoading ? (
          <div className="space-y-2 p-4">
            <Skeleton className="h-12" />
            <Skeleton className="h-12" />
            <Skeleton className="h-12" />
          </div>
        ) : items.length === 0 ? (
          <p className="p-6 text-sm text-zinc-500">Aucune déclaration dans ce filtre.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-100 text-left text-[11px] uppercase tracking-wide text-zinc-400">
                  <th className="px-5 py-3">Élève</th>
                  <th className="px-5 py-3">Canal / réf.</th>
                  <th className="px-5 py-3 text-right">Montant</th>
                  <th className="px-5 py-3">Statut</th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody>
                {items.map((row) => (
                  <tr key={row.id} className="border-b border-zinc-50 hover:bg-zinc-50/60">
                    <td className="px-5 py-3.5">
                      <p className="font-medium text-zinc-900">{row.studentName ?? `Élève #${row.studentId}`}</p>
                      <p className="text-xs text-zinc-400">
                        {new Date(row.createdAt).toLocaleString('fr-FR', {
                          dateStyle: 'short',
                          timeStyle: 'short',
                        })}
                      </p>
                      <div className="mt-1">
                        <StudentFeeScheduleLink studentId={row.studentId} variant="inline" />
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <p className="text-xs font-medium text-zinc-800">{row.providerLabel}</p>
                      <p className="font-mono text-xs text-zinc-500">{row.transactionRef}</p>
                    </td>
                    <td className="px-5 py-3.5 text-right font-semibold text-zinc-900">
                      {formatMoney(row.amount, row.currency)}
                    </td>
                    <td className="px-5 py-3.5">
                      <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${statusBadge(row.status)}`}>
                        {statusLabel(row.status)}
                      </span>
                      {row.rejectionReason && (
                        <p className="mt-1 max-w-[220px] text-[11px] text-red-600">{row.rejectionReason}</p>
                      )}
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex flex-wrap justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => setProof(row)}
                          disabled={!row.proofImageUrl}
                          className="inline-flex items-center gap-1 rounded-lg bg-sky-50 px-2.5 py-1.5 text-xs font-medium text-sky-800 hover:bg-sky-100 disabled:opacity-40"
                        >
                          <ImageIcon size={12} /> Voir le justificatif
                        </button>
                        {row.status === 'PENDING' && (
                          <>
                            <ApproveButton row={row} />
                            <button
                              type="button"
                              onClick={() => setRejecting(row)}
                              className="inline-flex items-center gap-1 rounded-lg bg-red-50 px-2.5 py-1.5 text-xs font-medium text-red-700 hover:bg-red-100"
                            >
                              <XCircle size={12} /> Rejeter
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </FinancePanel>

      {proof && <ProofModal row={proof} onClose={() => setProof(null)} />}
      {rejecting && <RejectModal row={rejecting} onClose={() => setRejecting(null)} />}
    </>
  )

  if (variant === 'admin') return <div className="space-y-4">{inner}</div>
  return <FinancePageShell>{inner}</FinancePageShell>
}

function ApproveButton({ row }: { row: PaymentDeclarationDto }) {
  const { mutateAsync, isPending } = useReviewPaymentDeclaration()
  const [error, setError] = useState<string | null>(null)

  async function approve() {
    setError(null)
    try {
      await mutateAsync({ id: row.id, decision: 'APPROVE' })
    } catch (err) {
      setError(getApiErrorMessage(err))
    }
  }

  return (
    <span className="inline-flex flex-col items-end">
      <button
        type="button"
        onClick={() => void approve()}
        disabled={isPending}
        className="inline-flex items-center gap-1 rounded-lg bg-emerald-50 px-2.5 py-1.5 text-xs font-medium text-emerald-700 hover:bg-emerald-100 disabled:opacity-40"
      >
        <CheckCircle size={12} /> {isPending ? '…' : 'Valider'}
      </button>
      {error && <span className="mt-1 max-w-[180px] text-[10px] text-red-600">{error}</span>}
    </span>
  )
}

function ProofModal({ row, onClose }: { row: PaymentDeclarationDto; onClose: () => void }) {
  const href = proofHref(row.proofImageUrl)
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="max-h-[92vh] w-full max-w-3xl overflow-auto rounded-2xl bg-white p-5 shadow-xl">
        <div className="mb-3 flex items-start justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-zinc-900">Justificatif SMS</h2>
            <p className="text-xs text-zinc-500">
              {row.studentName ?? `Élève #${row.studentId}`} · {row.providerLabel} · {row.transactionRef} ·{' '}
              {formatMoney(row.amount, row.currency)}
            </p>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg px-2 py-1 text-sm text-zinc-500 hover:bg-zinc-100">
            Fermer
          </button>
        </div>
        {href ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={href}
            alt="Capture SMS fournie par le parent"
            className="mx-auto max-h-[75vh] w-auto max-w-full rounded-lg border border-zinc-100"
          />
        ) : (
          <p className="py-10 text-center text-sm text-zinc-500">Aucun justificatif joint.</p>
        )}
      </div>
    </div>
  )
}

function RejectModal({ row, onClose }: { row: PaymentDeclarationDto; onClose: () => void }) {
  const { mutateAsync, isPending } = useReviewPaymentDeclaration()
  const [reason, setReason] = useState(REJECT_PRESETS[0])
  const [error, setError] = useState<string | null>(null)

  async function submit() {
    if (reason.trim().length < 8) {
      setError('Indiquez un motif d’au moins 8 caractères.')
      return
    }
    setError(null)
    try {
      await mutateAsync({ id: row.id, decision: 'REJECT', rejectionReason: reason.trim() })
      onClose()
    } catch (err) {
      setError(getApiErrorMessage(err))
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        <h2 className="text-base font-semibold text-zinc-900">Rejeter la déclaration</h2>
        <p className="mt-1 text-xs text-zinc-500">
          Le parent verra ce motif et pourra corriger le justificatif.
        </p>
        <div className="mt-4 flex flex-wrap gap-1.5">
          {REJECT_PRESETS.map((preset) => (
            <button
              key={preset}
              type="button"
              onClick={() => setReason(preset)}
              className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${
                reason === preset
                  ? 'bg-red-600 text-white'
                  : 'bg-red-50 text-red-800 hover:bg-red-100'
              }`}
            >
              {preset}
            </button>
          ))}
        </div>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={3}
          className="mt-3 w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-200"
        />
        {error && (
          <p className="mt-2 flex items-start gap-1.5 text-xs text-red-600">
            <AlertTriangle size={12} className="mt-0.5 shrink-0" />
            {error}
          </p>
        )}
        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl px-3 py-2 text-xs font-medium text-zinc-500 hover:bg-zinc-50"
          >
            Annuler
          </button>
          <button
            type="button"
            onClick={() => void submit()}
            disabled={isPending}
            className="rounded-xl bg-red-600 px-3 py-2 text-xs font-medium text-white hover:bg-red-700 disabled:opacity-40"
          >
            {isPending ? 'Envoi…' : 'Confirmer le rejet'}
          </button>
        </div>
      </div>
    </div>
  )
}
