'use client'

import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { CheckCircle2, RefreshCw, RotateCcw, Search, XCircle } from 'lucide-react'
import { useAdminRefundRequests, useReviewRefundRequest, useAdminStudentPaymentsDetailed, useAdminRefundRequest } from '@/lib/hooks/use-admin'
import { useFinanceStudentSearch, useStudentFinanceProfile, useFinanceClassDetail } from '@/lib/hooks/use-finance'
import { formatMoney } from '@/lib/finance/currency'
import { getApiErrorMessage } from '@/lib/api/client'
import { useToast } from '@/providers/toast-provider'
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
import type { AdminRefundRequest } from '@/types/admin'
import { cn } from '@/lib/utils'

const FILTER_OPTIONS = [
  { value: '', label: 'Tous' },
  { value: 'PENDING', label: 'En attente' },
  { value: 'APPROVED', label: 'Approuvés' },
  { value: 'REJECTED', label: 'Rejetés' },
  { value: 'PROCESSED', label: 'Traités' },
]

export default function AdminRefundsPage() {
  const toast = useToast()
  const [statusFilter, setStatusFilter] = useState('PENDING')
  const [search, setSearch] = useState('')
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [reviewNotes, setReviewNotes] = useState('')

  const { data, isLoading, refetch } = useAdminRefundRequests({
    status: statusFilter || undefined,
    limit: 50,
  })
  const { data: selectedDetail } = useAdminRefundRequest(selectedId)
  const review = useReviewRefundRequest()

  const items = (data?.items ?? []) as AdminRefundRequest[]

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return items
    return items.filter((r) => {
      const haystack = [
        r.payment?.studentName,
        r.payment?.matricule,
        r.payment?.reference,
        r.reason,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
      return haystack.includes(q)
    })
  }, [items, search])

  const selectedFromList =
    filtered.find((r) => r.id === selectedId)
    ?? items.find((r) => r.id === selectedId)
    ?? null
  const selected = selectedDetail ?? selectedFromList
  const selectedLookupKey = selected?.payment?.matricule ?? selected?.payment?.studentName ?? ''
  const { data: selectedHits = [] } = useFinanceStudentSearch(selectedLookupKey)
  const matchedStudent = selectedHits.find((s) =>
    selected?.payment?.matricule
      ? s.matricule?.toLowerCase() === selected.payment.matricule?.toLowerCase()
      : s.name?.toLowerCase() === selected?.payment?.studentName?.toLowerCase(),
  )
  const { data: selectedProfileData } = useStudentFinanceProfile(matchedStudent?.id ?? 0)
  const { data: selectedPaymentsPage } = useAdminStudentPaymentsDetailed(matchedStudent?.id ?? 0)
  const selectedProfile = (selectedProfileData as { profile?: Record<string, unknown> } | undefined)?.profile
  const selectedClassId = Number((selectedProfile?.classId as number | undefined) ?? 0)
  const { data: selectedClass } = useFinanceClassDetail(selectedClassId)

  const stats = useMemo(() => {
    return items.reduce(
      (acc, r) => {
        acc.total += 1
        acc.amount += Number(r.amount || 0)
        if (r.status === 'PENDING') acc.pending += 1
        if (r.status === 'APPROVED') acc.approved += 1
        if (r.status === 'REJECTED') acc.rejected += 1
        return acc
      },
      { total: 0, amount: 0, pending: 0, approved: 0, rejected: 0 },
    )
  }, [items])

  async function handleReview(action: 'approve' | 'reject') {
    if (!selected) return
    if (action === 'reject' && !reviewNotes.trim()) {
      toast.warning('Motif requis', 'Ajoutez une note de revue pour rejeter la demande.')
      return
    }
    try {
      await review.mutateAsync({
        id: selected.id,
        action,
        reviewNotes: reviewNotes || undefined,
      })
      toast.success(
        action === 'approve' ? 'Demande approuvée' : 'Demande rejetée',
        `Remboursement #${selected.id}`,
      )
      setReviewNotes('')
      const { data: refreshed } = await refetch()
      const nextItems = (refreshed?.items ?? []) as AdminRefundRequest[]
      const nextPending = nextItems.find((r) => r.status === 'PENDING')
      setSelectedId(nextPending?.id ?? null)
    } catch (err) {
      toast.error('Action impossible', getApiErrorMessage(err))
    }
  }

  return (
    <RefundPageShell>
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold bg-gradient-to-r from-slate-800 via-indigo-800 to-violet-800 bg-clip-text text-transparent">
            Remboursements
          </h1>
          <p className="text-sm text-slate-600 mt-1">Validation administrative des demandes avant exécution guichet.</p>
        </div>
        <button
          onClick={() => refetch()}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200/80 bg-slate-100/60 px-3 py-2 text-sm text-slate-700 hover:bg-slate-200/50 transition-colors"
        >
          <RefreshCw size={14} />
          Actualiser
        </button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <RefundStat label="Demandes" value={String(stats.total)} tone="indigo" />
        <RefundStat label="Montant cumulé" value={formatMoney(stats.amount)} tone="slate" />
        <RefundStat label="En attente" value={String(stats.pending)} tone="amber" />
        <RefundStat label="Approuvés" value={String(stats.approved)} tone="sky" />
        <RefundStat label="Rejetés" value={String(stats.rejected)} tone="rose" />
      </div>

      <RefundFilterBar>
        <RefundFilterPills value={statusFilter} onChange={setStatusFilter} options={FILTER_OPTIONS} />
        <label className="relative flex flex-1 max-w-md items-center">
          <Search size={14} className="absolute left-3 text-slate-400" />
          <RefundSearchInput
            value={search}
            onChange={setSearch}
            placeholder="Rechercher élève, matricule, référence..."
          />
        </label>
      </RefundFilterBar>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <motion.div className="xl:col-span-2" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <RefundPanel accent="indigo">
            <RefundPanelHeader
              title={`Demandes (${filtered.length})`}
              icon={RotateCcw}
              badge={
                <span className="rounded-full bg-indigo-500/15 px-2.5 py-0.5 text-xs font-medium text-indigo-700">
                  {filtered.length}
                </span>
              }
            />
            {isLoading ? (
              <div className="p-5 text-sm text-slate-500">Chargement...</div>
            ) : filtered.length === 0 ? (
              <div className="p-10 text-center">
                <RotateCcw size={28} className="mx-auto text-slate-300 mb-2" />
                <p className="text-sm text-slate-500">Aucune demande trouvée.</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-200/50">
                {filtered.map((r) => (
                  <button
                    key={r.id}
                    onClick={() => setSelectedId(r.id)}
                    className={cn(
                      'w-full text-left px-5 py-3.5 transition-colors',
                      selectedId === r.id
                        ? 'bg-gradient-to-r from-indigo-50/80 to-violet-50/50 border-l-[3px] border-l-indigo-500'
                        : 'hover:bg-slate-100/50 border-l-[3px] border-l-transparent',
                    )}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-slate-800 truncate">{r.payment?.studentName ?? '—'}</p>
                        <p className="text-xs text-slate-500 truncate">
                          {r.payment?.matricule ?? '—'} · {r.payment?.reference ?? '—'}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-sm font-bold text-slate-800 tabular-nums">{formatMoney(Number(r.amount))}</p>
                        <div className="mt-1">
                          <RefundStatusBadge status={r.status} />
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </RefundPanel>
        </motion.div>

        <motion.aside initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <RefundPanel accent="violet" className="h-fit">
            <RefundPanelHeader title="Détail & validation" subtitle="Décision administrative" />
            {!selected ? (
              <div className="p-8 text-center text-sm text-slate-500">
                Sélectionnez une demande pour la valider.
              </div>
            ) : (
              <div className="space-y-3 p-5">
                <div className="grid grid-cols-2 gap-2">
                  <RefundInfoRow label="Élève" value={selected.payment?.studentName ?? '—'} />
                  <RefundInfoRow label="Matricule" value={selected.payment?.matricule ?? '—'} />
                  <RefundInfoRow label="Montant" value={formatMoney(Number(selected.amount))} />
                  <RefundInfoRow label="Méthode" value={selected.payment?.method ?? '—'} />
                  <RefundInfoRow label="Demandé par" value={selected.requestedBy?.name ?? '—'} />
                  <RefundInfoRow
                    label="Date demande"
                    value={new Date(selected.createdAt).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' })}
                  />
                </div>

                <div className="flex items-center justify-between rounded-lg bg-slate-100/50 px-3 py-2">
                  <span className="text-xs font-medium text-slate-500">Statut</span>
                  <RefundStatusBadge status={selected.status} />
                </div>

                <RefundSchoolContext
                  profile={selectedProfile as { class?: { name?: string } }}
                  classDetail={selectedClass as { name?: string; section?: { name?: string }; option?: { name?: string } }}
                  classNameFallback={matchedStudent?.className}
                />

                <RefundDetailBlock title="Motif" tone="amber">
                  <p className="text-slate-700">{selected.reason || '—'}</p>
                </RefundDetailBlock>

                {(selectedPaymentsPage?.data?.length ?? 0) > 0 && (
                  <RefundDetailBlock title="Historique paiements élève" tone="slate">
                    <div className="space-y-1.5 max-h-36 overflow-y-auto">
                      {selectedPaymentsPage!.data.map((p) => (
                        <div key={p.id} className="flex items-center justify-between gap-2 text-xs py-1 border-b border-slate-100 last:border-0">
                          <div className="min-w-0">
                            <span className="font-medium text-slate-700">#{p.id}</span>
                            <span className="ml-1.5 text-slate-500">{p.methodLabel}</span>
                            {p.id === selected.paymentId && (
                              <span className="ml-1.5 rounded bg-violet-100 px-1 py-0.5 text-[10px] font-medium text-violet-700">cible</span>
                            )}
                            <p className="text-[10px] text-slate-400 truncate">{p.feeSummary}</p>
                          </div>
                          <div className="text-right shrink-0">
                            <p className="font-semibold text-slate-800 tabular-nums">{formatMoney(p.amount)}</p>
                            <p className="text-[10px] text-slate-400">{new Date(p.createdAt).toLocaleDateString('fr-FR')}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </RefundDetailBlock>
                )}

              <RefundDecisionHistory refund={selected} />

              <RefundAccountingImpact
                studentId={matchedStudent?.id ?? 0}
                amount={Number(selected.amount)}
                status={selected.status}
              />

              {selected.status === 'PENDING' && (
                  <>
                    <div>
                      <label className="block text-xs font-medium text-slate-500 mb-1">Note de revue</label>
                      <textarea
                        value={reviewNotes}
                        onChange={(e) => setReviewNotes(e.target.value)}
                        rows={3}
                        className="w-full rounded-xl border border-slate-200/80 bg-slate-50/80 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400/50"
                        placeholder="Optionnel pour approbation, obligatoire pour rejet"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <RefundActionButton onClick={() => handleReview('approve')} disabled={review.isPending}>
                        <CheckCircle2 size={14} />
                        Approuver
                      </RefundActionButton>
                      <RefundActionButton variant="danger" onClick={() => handleReview('reject')} disabled={review.isPending}>
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
