'use client'

import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { AlertTriangle, BadgePercent, CheckCircle2, Loader2, RefreshCw, Search, XCircle } from 'lucide-react'
import { useFeeWaiverRequests, useReviewFeeWaiver } from '@/lib/hooks/use-admin'
import { formatMoney, type FinanceCurrencyCode } from '@/lib/finance/currency'
import { FEE_WAIVER_KIND_LABEL, FEE_WAIVER_STATUS_LABEL } from '@/lib/finance/fee-waiver'
import { getApiErrorMessage } from '@/lib/api/client'
import { useAuth } from '@/providers/auth-provider'
import { useToast } from '@/providers/toast-provider'
import { isPromoterRole } from '@/types/auth'
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
import type { FeeWaiverRequestDto, FeeWaiverStatus } from '@/types/finance'
import { cn } from '@/lib/utils'

type StatusFilter = FeeWaiverStatus | ''

const FILTER_OPTIONS: { value: StatusFilter; label: string }[] = [
  { value: 'PENDING', label: 'En attente' },
  { value: 'APPROVED', label: 'Approuvées' },
  { value: 'REJECTED', label: 'Rejetées' },
  { value: '', label: 'Toutes' },
]

/** Le backend exige un motif d'au moins 3 caractères pour un rejet. */
const MIN_REJECT_NOTES = 3

function money(amount: number | null, currency: string | null): string {
  if (amount == null) return '—'
  return formatMoney(amount, (currency || 'USD') as FinanceCurrencyCode)
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' })
}

/**
 * Remises et exonérations exceptionnelles (EXEMPT, montant ou % réduit, bourses)
 * demandées par le guichet : le Promoteur approuve (l'attribution est créée à son nom)
 * ou rejette avec un motif. Tant que la demande attend, l'élève doit le montant plein.
 */
export default function AdminFeeWaiversPage() {
  const toast = useToast()
  const { user } = useAuth()
  const canReview = isPromoterRole(user?.role)
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('PENDING')
  const [search, setSearch] = useState('')
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [reviewNotes, setReviewNotes] = useState('')

  const query = useFeeWaiverRequests(statusFilter ? { status: statusFilter } : undefined)
  const review = useReviewFeeWaiver()
  const items = useMemo(() => query.data ?? [], [query.data])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return items
    return items.filter((w) =>
      [w.studentName, w.matricule, w.reason, w.requestedBy.name]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(q),
    )
  }, [items, search])

  const selected = items.find((w) => w.id === selectedId) ?? null

  const stats = useMemo(
    () =>
      items.reduce(
        (acc, w) => {
          acc.total += 1
          if (w.status === 'PENDING') acc.pending += 1
          if (w.status === 'APPROVED') acc.approved += 1
          if (w.status === 'REJECTED') acc.rejected += 1
          return acc
        },
        { total: 0, pending: 0, approved: 0, rejected: 0 },
      ),
    [items],
  )

  function select(id: number) {
    setSelectedId(id)
    setReviewNotes('')
  }

  async function handleReview(action: 'approve' | 'reject') {
    if (!selected) return
    const notes = reviewNotes.trim()
    if (action === 'reject' && notes.length < MIN_REJECT_NOTES) {
      toast.warning('Motif requis', 'Indiquez pourquoi la remise est refusée.')
      return
    }
    try {
      await review.mutateAsync({ id: selected.id, action, reviewNotes: notes || undefined })
      toast.success(
        action === 'approve' ? 'Remise approuvée' : 'Remise rejetée',
        action === 'approve'
          ? `${selected.studentName} : appliquée, le solde de l’élève est recalculé.`
          : `${selected.studentName} : l’élève reste au montant plein.`,
      )
      setReviewNotes('')
      const next = items.find((w) => w.status === 'PENDING' && w.id !== selected.id)
      setSelectedId(next?.id ?? null)
    } catch (err) {
      toast.error('Décision impossible', getApiErrorMessage(err))
    }
  }

  return (
    <RefundPageShell>
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold bg-gradient-to-r from-slate-800 via-indigo-800 to-violet-800 bg-clip-text text-transparent">
            Remises à valider
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            Exonérations, montants réduits et bourses demandés par le guichet. L’élève doit le montant plein
            jusqu’à votre décision.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void query.refetch()}
          disabled={query.isFetching}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200/80 bg-slate-100/60 px-3 py-2 text-sm text-slate-700 hover:bg-slate-200/50 transition-colors disabled:opacity-60"
        >
          <RefreshCw size={14} className={cn(query.isFetching && 'animate-spin')} />
          Actualiser
        </button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <RefundStat label="Demandes" value={String(stats.total)} tone="indigo" />
        <RefundStat label="En attente" value={String(stats.pending)} tone="amber" />
        <RefundStat label="Approuvées" value={String(stats.approved)} tone="sky" />
        <RefundStat label="Rejetées" value={String(stats.rejected)} tone="rose" />
      </div>

      <RefundFilterBar>
        <RefundFilterPills
          value={statusFilter}
          onChange={(v) => {
            setStatusFilter(v as StatusFilter)
            setSelectedId(null)
          }}
          options={FILTER_OPTIONS}
        />
        <label className="relative flex flex-1 max-w-md items-center">
          <Search size={14} className="absolute left-3 text-slate-400" />
          <RefundSearchInput
            value={search}
            onChange={setSearch}
            placeholder="Rechercher élève, matricule, motif, demandeur..."
          />
        </label>
      </RefundFilterBar>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <motion.div className="xl:col-span-2" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <RefundPanel accent="indigo">
            <RefundPanelHeader
              title={`Demandes (${filtered.length})`}
              icon={BadgePercent}
              badge={
                <span className="rounded-full bg-indigo-500/15 px-2.5 py-0.5 text-xs font-medium text-indigo-700">
                  {filtered.length}
                </span>
              }
            />
            {query.isLoading ? (
              <div className="flex items-center gap-2 p-5 text-sm text-slate-500">
                <Loader2 size={14} className="animate-spin" /> Chargement...
              </div>
            ) : query.isError ? (
              <div className="p-8 text-center">
                <AlertTriangle size={24} className="mx-auto text-rose-400 mb-2" />
                <p className="text-sm text-slate-700">Impossible de charger les demandes.</p>
                <p className="text-xs text-slate-500 mt-1">{getApiErrorMessage(query.error)}</p>
                <button
                  type="button"
                  onClick={() => void query.refetch()}
                  className="mt-3 text-sm font-medium text-indigo-700 hover:underline"
                >
                  Réessayer
                </button>
              </div>
            ) : filtered.length === 0 ? (
              <div className="p-10 text-center">
                <BadgePercent size={28} className="mx-auto text-slate-300 mb-2" />
                <p className="text-sm text-slate-500">
                  {statusFilter === 'PENDING' ? 'Aucune remise en attente.' : 'Aucune demande trouvée.'}
                </p>
              </div>
            ) : (
              <div className="divide-y divide-slate-200/50">
                {filtered.map((w) => (
                  <WaiverListItem key={w.id} waiver={w} active={selectedId === w.id} onSelect={() => select(w.id)} />
                ))}
              </div>
            )}
          </RefundPanel>
        </motion.div>

        <motion.aside initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <RefundPanel accent="violet" className="h-fit">
            <RefundPanelHeader title="Détail & décision" subtitle="Validation du Promoteur" />
            {!selected ? (
              <div className="p-8 text-center text-sm text-slate-500">Sélectionnez une demande.</div>
            ) : (
              <div className="space-y-3 p-5">
                <div className="grid grid-cols-2 gap-2">
                  <RefundInfoRow label="Élève" value={selected.studentName} />
                  <RefundInfoRow label="Matricule" value={selected.matricule} />
                  <RefundInfoRow label="Type" value={FEE_WAIVER_KIND_LABEL[selected.kind]} />
                  <RefundInfoRow label="Demandé par" value={selected.requestedBy.name ?? '—'} />
                  <RefundInfoRow label="Montant catalogue" value={money(selected.baseAmount, selected.currency)} />
                  <RefundInfoRow label="Montant proposé" value={money(selected.proposedAmount, selected.currency)} />
                </div>

                <div className="flex items-center justify-between rounded-lg bg-slate-100/50 px-3 py-2">
                  <span className="text-xs font-medium text-slate-500">
                    Demandée le {formatDate(selected.requestedAt)}
                  </span>
                  <RefundStatusBadge status={selected.status} label={FEE_WAIVER_STATUS_LABEL[selected.status]} />
                </div>

                <RefundDetailBlock title="Motif du guichet" tone="amber">
                  <p className="text-slate-700">{selected.reason}</p>
                </RefundDetailBlock>

                {selected.status !== 'PENDING' && (
                  <RefundDetailBlock title="Décision" tone="slate">
                    <p className="text-slate-700">
                      {selected.reviewedBy?.name ?? '—'}
                      {selected.reviewedAt ? ` · ${formatDate(selected.reviewedAt)}` : ''}
                    </p>
                    {selected.reviewNotes && <p className="mt-1 text-slate-600">{selected.reviewNotes}</p>}
                  </RefundDetailBlock>
                )}

                {selected.status === 'PENDING' && canReview && (
                  <>
                    <div>
                      <label htmlFor="fee-waiver-notes" className="block text-xs font-medium text-slate-500 mb-1">
                        Note de décision
                      </label>
                      <textarea
                        id="fee-waiver-notes"
                        value={reviewNotes}
                        onChange={(e) => setReviewNotes(e.target.value)}
                        rows={3}
                        maxLength={500}
                        className="w-full rounded-xl border border-slate-200/80 bg-slate-50/80 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400/50"
                        placeholder="Optionnelle pour approuver, obligatoire pour rejeter"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <RefundActionButton onClick={() => void handleReview('approve')} disabled={review.isPending}>
                        {review.isPending ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                        Approuver
                      </RefundActionButton>
                      <RefundActionButton
                        variant="danger"
                        onClick={() => void handleReview('reject')}
                        disabled={review.isPending}
                      >
                        <XCircle size={14} />
                        Rejeter
                      </RefundActionButton>
                    </div>
                  </>
                )}
              </div>
            )}
          </RefundPanel>
        </motion.aside>
      </div>
    </RefundPageShell>
  )
}

function WaiverListItem({
  waiver: w,
  active,
  onSelect,
}: {
  waiver: FeeWaiverRequestDto
  active: boolean
  onSelect: () => void
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        'w-full text-left px-5 py-3.5 transition-colors',
        active
          ? 'bg-gradient-to-r from-indigo-50/80 to-violet-50/50 border-l-[3px] border-l-indigo-500'
          : 'hover:bg-slate-100/50 border-l-[3px] border-l-transparent',
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-slate-800 truncate">{w.studentName}</p>
          <p className="text-xs text-slate-500 truncate">
            {FEE_WAIVER_KIND_LABEL[w.kind]} · {w.matricule} · {w.reason}
          </p>
        </div>
        <div className="text-right shrink-0">
          <p className="text-sm tabular-nums">
            <span className="text-slate-400 line-through">{money(w.baseAmount, w.currency)}</span>
            <span className="ml-1.5 font-bold text-slate-800">{money(w.proposedAmount, w.currency)}</span>
          </p>
          <div className="mt-1">
            <RefundStatusBadge status={w.status} label={FEE_WAIVER_STATUS_LABEL[w.status]} />
          </div>
        </div>
      </div>
    </button>
  )
}
