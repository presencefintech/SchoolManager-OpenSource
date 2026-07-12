'use client'

import { useEffect, useMemo, useState } from 'react'
import { Check, Copy, Download, Fingerprint, Lock, Plus, Search, ShieldCheck, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatMoney } from '@/lib/finance/currency'
import { formatPaymentMethodLabel } from '@/lib/admin/finance-dashboard.utils'
import { formatRdcFullName, type StudentIdentityFields } from '@/lib/utils/student-name.util'
import { useFinancialSealBatchDetail, useVerifySealBatch } from '@/lib/hooks/use-admin'
import {
  RefundDetailBlock,
  RefundInfoRow,
} from '@/components/finance/refund-page-ui'
import type {
  CreateSealBatchPayload,
  FinancialSealBatch,
  FinancialSealBatchVerifyResult,
  SealablePaymentRow,
} from '@/types/admin'

export const SEAL_BATCH_STATUS_STYLES: Record<string, { label: string; cls: string }> = {
  PENDING: { label: 'En attente', cls: 'bg-amber-500/15 text-amber-800 ring-1 ring-amber-500/25' },
  SEALED: { label: 'Scellé', cls: 'bg-emerald-500/15 text-emerald-800 ring-1 ring-emerald-500/25' },
  ARCHIVED: { label: 'Archivé', cls: 'bg-slate-500/10 text-slate-600 ring-1 ring-slate-400/20' },
}

export function SealBatchStatusBadge({ status }: { status: string }) {
  const cfg = SEAL_BATCH_STATUS_STYLES[status] ?? { label: status, cls: 'bg-zinc-100 text-zinc-600' }
  return (
    <span className={cn('inline-flex text-[10px] font-semibold px-2 py-0.5 rounded-full', cfg.cls)}>
      {cfg.label}
    </span>
  )
}

function truncateSeal(value?: string | null, len = 16): string {
  if (!value) return '—'
  if (value.length <= len) return value
  return `${value.slice(0, len)}…`
}

export function SealBatchDetailPanel({
  batchId,
  onExportPdf,
  exporting,
}: {
  batchId: number | null
  onExportPdf?: (batchId: number) => void
  exporting?: boolean
}) {
  const { data: detail, isLoading } = useFinancialSealBatchDetail(batchId)
  const verify = useVerifySealBatch()
  const [copied, setCopied] = useState(false)
  const [verifyResult, setVerifyResult] = useState<FinancialSealBatchVerifyResult | null>(null)

  useEffect(() => {
    setVerifyResult(null)
  }, [batchId])

  useEffect(() => {
    if (!copied) return
    const t = setTimeout(() => setCopied(false), 2000)
    return () => clearTimeout(t)
  }, [copied])

  if (!batchId) {
    return (
      <div className="rounded-2xl border border-slate-200/90 bg-white/90 shadow-lg shadow-slate-200/40 ring-1 ring-slate-100 overflow-hidden h-full min-h-[420px] flex flex-col">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center">
            <Fingerprint size={16} className="text-slate-500" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-slate-900">Détail du lot</h2>
            <p className="text-xs text-slate-500">Sélectionnez un lot dans le registre</p>
          </div>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
          <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center mb-4">
            <Lock size={24} className="text-slate-400" />
          </div>
          <p className="text-sm font-medium text-slate-700">Aucun lot sélectionné</p>
          <p className="text-xs text-slate-500 mt-1 max-w-[220px]">
            Choisissez un lot pour consulter les paiements, le sceau HMAC et exporter l&apos;archive PDF.
          </p>
        </div>
      </div>
    )
  }

  if (isLoading || !detail) {
    return (
      <div className="rounded-2xl border border-slate-200/90 bg-white/90 shadow-lg p-10 text-center text-sm text-slate-500 min-h-[420px] flex items-center justify-center">
        Chargement du détail…
      </div>
    )
  }

  async function copyHmac() {
    if (!detail?.sealHmac) return
    try {
      await navigator.clipboard.writeText(detail.sealHmac)
      setCopied(true)
    } catch {
      /* ignore */
    }
  }

  async function handleVerify() {
    const result = await verify.mutateAsync(detail!.id)
    setVerifyResult(result)
  }

  return (
    <div className="rounded-2xl border border-slate-200/90 bg-white/90 shadow-lg shadow-slate-200/40 ring-1 ring-slate-100 overflow-hidden">
      <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-slate-100">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-emerald-500/10 flex items-center justify-center ring-1 ring-emerald-500/20 shrink-0">
            <Fingerprint size={16} className="text-emerald-600" />
          </div>
          <div className="min-w-0">
            <h2 className="text-sm font-semibold text-slate-900 truncate">{detail.batchReference}</h2>
            <div className="mt-1">
              <SealBatchStatusBadge status={detail.status} />
            </div>
          </div>
        </div>
        <div className="flex gap-1.5 shrink-0">
          <button
            type="button"
            onClick={handleVerify}
            disabled={verify.isPending}
            className="inline-flex items-center gap-1 rounded-lg border border-emerald-200 bg-white px-2.5 py-1.5 text-[10px] font-medium text-emerald-700 hover:bg-emerald-50 disabled:opacity-50"
          >
            <ShieldCheck size={12} />
            {verify.isPending ? '…' : 'Vérifier'}
          </button>
          {onExportPdf && (
            <button
              type="button"
              onClick={() => onExportPdf(detail.id)}
              disabled={exporting}
              className="inline-flex items-center gap-1 rounded-lg bg-slate-900 px-2.5 py-1.5 text-[10px] font-medium text-white hover:bg-slate-800 disabled:opacity-50"
            >
              <Download size={12} />
              {exporting ? 'Export…' : 'PDF'}
            </button>
          )}
        </div>
      </div>

      <div className="p-5 space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl bg-slate-50 border border-slate-100 px-3 py-2.5">
            <p className="text-[10px] font-medium uppercase tracking-wider text-slate-400">Total scellé</p>
            <p className="text-lg font-bold tabular-nums text-slate-900 mt-0.5">
              {formatMoney(detail.totalAmount, detail.currency)}
            </p>
          </div>
          <div className="rounded-xl bg-slate-50 border border-slate-100 px-3 py-2.5">
            <p className="text-[10px] font-medium uppercase tracking-wider text-slate-400">Paiements</p>
            <p className="text-lg font-bold tabular-nums text-slate-900 mt-0.5">
              {detail.linkedPaymentCount ?? detail.paymentCount}
            </p>
          </div>
        </div>

        <RefundDetailBlock title={`Transactions (${detail.payments.length})`}>
          {detail.payments.length === 0 ? (
            <p className="text-xs text-slate-500">Aucun paiement lié.</p>
          ) : (
            <div className="max-h-48 overflow-y-auto rounded-xl border border-slate-100 divide-y divide-slate-100">
              {detail.payments.map((payment) => (
                <div key={payment.id} className="px-3 py-2.5 text-xs">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-medium text-slate-900 truncate">{payment.studentName}</p>
                      <p className="text-[10px] text-slate-500 mt-0.5">
                        {payment.studentMatricule ? `${payment.studentMatricule} · ` : ''}
                        <span className="font-mono">{payment.reference}</span>
                        {' · '}
                        {formatPaymentMethodLabel(payment.method)}
                      </p>
                    </div>
                    <span className="shrink-0 font-semibold tabular-nums text-slate-800">
                      {formatMoney(payment.amount, payment.currency)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </RefundDetailBlock>

        <RefundDetailBlock title="Traçabilité">
          <RefundInfoRow
            label="Scellé le"
            value={
              detail.sealedAt
                ? new Date(detail.sealedAt).toLocaleString('fr-FR', { dateStyle: 'medium', timeStyle: 'short' })
                : '—'
            }
          />
          <RefundInfoRow label="Par" value={detail.sealedBy?.name ?? '—'} />
          <RefundInfoRow
            label="Créé le"
            value={new Date(detail.createdAt).toLocaleString('fr-FR', { dateStyle: 'medium', timeStyle: 'short' })}
          />
        </RefundDetailBlock>

        <RefundDetailBlock title="Sceau HMAC">
          <div className="flex items-start gap-2">
            <code className="flex-1 text-[11px] font-mono text-slate-600 bg-slate-100/80 rounded-lg px-3 py-2 break-all">
              {detail.sealHmac ?? '—'}
            </code>
            {detail.sealHmac && (
              <button
                type="button"
                onClick={copyHmac}
                className="shrink-0 p-2 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50"
                title="Copier le sceau"
              >
                {copied ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
              </button>
            )}
          </div>
          {verifyResult && (
            <p
              className={cn(
                'mt-2 text-[11px] rounded-lg px-3 py-2 font-medium',
                verifyResult.valid
                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-100'
                  : 'bg-red-50 text-red-800 border border-red-100',
              )}
            >
              {verifyResult.valid ? 'Sceau valide — intégrité confirmée' : 'Sceau invalide — données altérées'}
            </p>
          )}
        </RefundDetailBlock>
      </div>
    </div>
  )
}

function normalizeSealableRow(raw: unknown): SealablePaymentRow | null {
  if (!raw || typeof raw !== 'object') return null
  const row = raw as Record<string, unknown>
  const student = row.student as Record<string, unknown> | undefined
  const studentName = student
    ? formatRdcFullName(student as StudentIdentityFields) || '—'
    : String(row.studentName ?? '—')

  return {
    id: Number(row.id),
    amount: Number(row.amount ?? 0),
    currency: row.currency as string | undefined,
    method: String(row.method ?? ''),
    status: String(row.status ?? ''),
    reference: row.reference as string | null | undefined,
    financialSealBatchId: row.financialSealBatchId as number | null | undefined,
    createdAt: String(row.createdAt ?? ''),
    studentName,
  }
}

export function CreateSealBatchModal({
  open,
  onClose,
  candidates,
  loading,
  isPending,
  onSubmit,
}: {
  open: boolean
  onClose: () => void
  candidates: unknown[]
  loading?: boolean
  isPending?: boolean
  onSubmit: (payload: CreateSealBatchPayload) => Promise<void>
}) {
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [note, setNote] = useState('')
  const [search, setSearch] = useState('')
  const [error, setError] = useState<string | null>(null)

  const rows = useMemo(() => {
    return candidates
      .map(normalizeSealableRow)
      .filter((r): r is SealablePaymentRow =>
        r != null
        && r.status === 'CONFIRMED'
        && (r.financialSealBatchId == null || r.financialSealBatchId === 0),
      )
  }, [candidates])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return rows
    return rows.filter((r) =>
      [r.studentName, r.reference, r.method, String(r.id)]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(q),
    )
  }, [rows, search])

  const selectedRows = rows.filter((r) => selected.has(r.id))
  const selectedTotal = selectedRows.reduce((sum, r) => sum + r.amount, 0)
  const currency = selectedRows[0]?.currency ?? 'USD'

  useEffect(() => {
    if (!open) {
      setSelected(new Set())
      setNote('')
      setSearch('')
      setError(null)
    }
  }, [open])

  function toggle(id: number) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function selectAllVisible() {
    setSelected(new Set(filtered.map((r) => r.id)))
  }

  function clearSelection() {
    setSelected(new Set())
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (selected.size === 0) {
      setError('Sélectionnez au moins un paiement confirmé non scellé.')
      return
    }
    setError(null)
    try {
      await onSubmit({
        paymentIds: Array.from(selected),
        metadata: note.trim() ? { note: note.trim() } : undefined,
      })
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Création du lot impossible.')
    }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Nouveau lot scellé</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Regroupe des paiements CONFIRMED — montants verrouillés après scellé.
            </p>
          </div>
          <button type="button" onClick={onClose} className="p-2 rounded-lg text-slate-400 hover:bg-slate-100">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col min-h-0 flex-1">
          <div className="px-6 py-3 border-b border-slate-50 flex flex-wrap gap-2 items-center">
            <label className="relative flex-1 min-w-[200px]">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Filtrer élève, réf., méthode…"
                className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400/40"
              />
            </label>
            <button
              type="button"
              onClick={selectAllVisible}
              className="text-xs px-3 py-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50"
            >
              Tout sélectionner
            </button>
            <button
              type="button"
              onClick={clearSelection}
              className="text-xs px-3 py-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50"
            >
              Effacer
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-6 py-3 min-h-[200px] max-h-[340px]">
            {loading ? (
              <p className="text-sm text-slate-500 py-8 text-center">Chargement des paiements…</p>
            ) : filtered.length === 0 ? (
              <p className="text-sm text-slate-500 py-8 text-center">
                Aucun paiement confirmé éligible. Essayez d&apos;élargir la période de recherche.
              </p>
            ) : (
              <div className="space-y-1">
                {filtered.map((row) => (
                  <label
                    key={row.id}
                    className={cn(
                      'flex items-center gap-3 rounded-xl border px-3 py-2.5 cursor-pointer transition-colors',
                      selected.has(row.id)
                        ? 'border-emerald-300 bg-emerald-50/60'
                        : 'border-slate-100 hover:bg-slate-50/80',
                    )}
                  >
                    <input
                      type="checkbox"
                      checked={selected.has(row.id)}
                      onChange={() => toggle(row.id)}
                      className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-900 truncate">{row.studentName}</p>
                      <p className="text-[11px] text-slate-500">
                        #{row.id}
                        {row.reference ? ` · ${row.reference}` : ''}
                        {' · '}
                        {formatPaymentMethodLabel(row.method)}
                      </p>
                    </div>
                    <span className="text-sm font-semibold tabular-nums text-slate-800">
                      {formatMoney(row.amount, row.currency)}
                    </span>
                  </label>
                ))}
              </div>
            )}
          </div>

          <div className="px-6 py-3 border-t border-slate-100 space-y-3">
            <div className="flex flex-wrap gap-4 text-xs text-slate-600">
              <span>
                <strong className="text-slate-900">{selected.size}</strong> paiement(s) sélectionné(s)
              </span>
              <span>
                Total : <strong className="text-slate-900 tabular-nums">{formatMoney(selectedTotal, currency)}</strong>
              </span>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Note interne (optionnel)</label>
              <input
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Ex. clôture caisse du 24/06"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400/40"
              />
            </div>
            {error && (
              <p className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>
            )}
          </div>

          <div className="px-6 py-4 border-t border-slate-100 flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-600 hover:bg-slate-50"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={isPending || selected.size === 0}
              className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 text-sm text-white font-medium hover:bg-emerald-700 disabled:opacity-50"
            >
              <Plus size={16} />
              {isPending ? 'Scellage…' : 'Créer le lot'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export function SealBatchListItem({
  batch,
  selected,
  onSelect,
}: {
  batch: FinancialSealBatch
  selected: boolean
  onSelect: () => void
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        'w-full text-left px-5 py-3.5 transition-colors',
        selected
          ? 'bg-gradient-to-r from-emerald-50/80 to-teal-50/50 border-l-[3px] border-l-emerald-500'
          : 'hover:bg-slate-100/50 border-l-[3px] border-l-transparent',
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="font-mono text-sm font-semibold text-slate-900 truncate">{batch.batchReference}</p>
          <p className="text-[11px] text-slate-500 mt-0.5">
            {batch.paymentCount} tx · {truncateSeal(batch.sealHmac, 12)}
          </p>
        </div>
        <div className="text-right shrink-0">
          <p className="text-sm font-bold text-slate-900 tabular-nums">
            {formatMoney(batch.totalAmount, batch.currency)}
          </p>
          <div className="mt-1 flex justify-end">
            <SealBatchStatusBadge status={batch.status} />
          </div>
        </div>
      </div>
    </button>
  )
}
