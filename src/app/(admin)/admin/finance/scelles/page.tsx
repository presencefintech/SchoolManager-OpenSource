'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import {
  ChevronRight,
  Fingerprint,
  Lock,
  Plus,
  RefreshCw,
  Search,
  Shield,
  Sparkles,
} from 'lucide-react'
import {
  useFinancialSealBatches,
  useCreateSealBatch,
  useAdvancedSearch,
} from '@/lib/hooks/use-admin'
import { financeApi } from '@/lib/admin/api/finance.api'
import { useAuth } from '@/providers/auth-provider'
import { useToast } from '@/providers/toast-provider'
import { getApiErrorMessage } from '@/lib/api/client'
import { triggerBlobDownload } from '@/lib/download-blob'
import { formatMoney } from '@/lib/finance/currency'
import {
  CreateSealBatchModal,
  SealBatchDetailPanel,
  SealBatchListItem,
} from '@/components/admin/finance/seal-batch-ui'
import { cn } from '@/lib/utils'

const STATUS_OPTIONS = [
  { value: '', label: 'Tous' },
  { value: 'SEALED', label: 'Scellés' },
  { value: 'PENDING', label: 'En attente' },
  { value: 'ARCHIVED', label: 'Archivés' },
]

const PERIOD_OPTIONS = [
  { value: 'month', label: 'Ce mois' },
  { value: 'all', label: 'Toute période' },
  { value: 'custom', label: 'Personnalisé' },
]

function monthRange() {
  const now = new Date()
  const start = new Date(now.getFullYear(), now.getMonth(), 1)
  return {
    fromDate: start.toISOString().slice(0, 10),
    toDate: now.toISOString().slice(0, 10),
  }
}

function defaultSearchWindow() {
  const end = new Date()
  const start = new Date()
  start.setDate(start.getDate() - 30)
  return {
    startDate: start.toISOString().slice(0, 10),
    endDate: end.toISOString().slice(0, 10),
  }
}

function HeroMetric({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="px-5 py-4 sm:px-6 sm:py-5">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">{label}</p>
      <p className="text-xl sm:text-2xl font-bold tabular-nums tracking-tight mt-1">{value}</p>
      {sub && <p className="text-[11px] text-slate-500 mt-1">{sub}</p>}
    </div>
  )
}

export default function AdminSealBatchesPage() {
  const toast = useToast()
  const { user } = useAuth()
  const canManage = user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN'

  const [statusFilter, setStatusFilter] = useState('SEALED')
  const [periodPreset, setPeriodPreset] = useState<'month' | 'all' | 'custom'>('month')
  const [customFrom, setCustomFrom] = useState('')
  const [customTo, setCustomTo] = useState('')
  const [search, setSearch] = useState('')
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [exporting, setExporting] = useState(false)

  const periodParams = useMemo(() => {
    if (periodPreset === 'all') return {}
    if (periodPreset === 'month') return monthRange()
    if (customFrom && customTo) return { fromDate: customFrom, toDate: customTo }
    return monthRange()
  }, [periodPreset, customFrom, customTo])

  const { data, isLoading, refetch } = useFinancialSealBatches({
    status: statusFilter || undefined,
    limit: 50,
    page: 1,
    ...periodParams,
  })

  const createBatch = useCreateSealBatch()
  const searchWindow = useMemo(() => defaultSearchWindow(), [])

  const { data: paymentSearch, isLoading: loadingCandidates } = useAdvancedSearch(
    {
      status: 'CONFIRMED',
      startDate: searchWindow.startDate,
      endDate: searchWindow.endDate,
      limit: 100,
      page: 1,
    },
    { enabled: modalOpen },
  )

  const items = data?.items ?? []
  const candidates = (paymentSearch as { data?: unknown[] } | undefined)?.data ?? []

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return items
    return items.filter((batch) =>
      [batch.batchReference, batch.sealedBy?.name, batch.sealHmac, String(batch.id)]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(q),
    )
  }, [items, search])

  const stats = useMemo(() => {
    return items.reduce(
      (acc, batch) => {
        acc.total += 1
        acc.amount += batch.totalAmount
        acc.payments += batch.paymentCount
        if (batch.status === 'SEALED') acc.sealed += 1
        return acc
      },
      { total: 0, amount: 0, payments: 0, sealed: 0 },
    )
  }, [items])

  useEffect(() => {
    if (selectedId != null) return
    if (filtered.length > 0) setSelectedId(filtered[0].id)
  }, [filtered, selectedId])

  async function handleCreate(payload: Parameters<typeof createBatch.mutateAsync>[0]) {
    try {
      const result = await createBatch.mutateAsync(payload)
      toast.success(
        'Lot scellé créé',
        `${result.batchReference} — ${result.paymentCount} paiement(s) verrouillé(s).`,
      )
      setSelectedId(result.id)
      await refetch()
    } catch (err) {
      toast.error('Scellage impossible', getApiErrorMessage(err))
      throw err
    }
  }

  async function handleExportPdf(batchId: number) {
    setExporting(true)
    try {
      const { blob, filename } = await financeApi.exportSealBatchPdf(batchId)
      triggerBlobDownload(blob, filename)
      toast.success('Archive PDF', filename)
    } catch (err) {
      toast.error('Export impossible', getApiErrorMessage(err))
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className="relative min-h-screen -m-4 sm:-m-6 lg:-m-8 p-4 sm:p-6 lg:p-8 bg-[#f4f6fa]">
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-[#f4f6fa]">
        <div className="absolute -top-32 right-[-10%] h-[420px] w-[420px] rounded-full bg-emerald-200/30 blur-3xl" />
        <div className="absolute top-[20%] -left-24 h-[360px] w-[360px] rounded-full bg-teal-200/25 blur-3xl" />
        <div className="absolute bottom-[-10%] right-[20%] h-[300px] w-[300px] rounded-full bg-sky-200/30 blur-3xl" />
      </div>

      <div className="mx-auto max-w-7xl space-y-6">
        <motion.section
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-slate-900 to-teal-950 text-white shadow-2xl shadow-slate-900/20"
        >
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(20,184,166,0.18),_transparent_50%)]" />
          <div className="absolute inset-0 opacity-[0.03] bg-[linear-gradient(to_right,#fff_1px,transparent_1px),linear-gradient(to_bottom,#fff_1px,transparent_1px)] bg-[size:32px_32px]" />

          <div className="relative px-6 sm:px-8 pt-8 pb-6">
            <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-medium text-teal-200/90 backdrop-blur-sm mb-4">
                  <Sparkles size={12} className="text-teal-300" />
                  Clôture d&apos;audit · Archive comptable
                </div>
                <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">Lots scellés</h1>
                <p className="text-sm text-slate-400 mt-2 max-w-lg">
                  Registre des clôtures financières avec sceau d&apos;intégrité HMAC et export PDF pour la comptabilité.
                </p>
                <Link
                  href="/admin/finance"
                  className="inline-flex items-center gap-1 mt-3 text-xs text-slate-400 hover:text-white transition-colors"
                >
                  Retour au centre finance
                  <ChevronRight size={12} />
                </Link>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => refetch()}
                  className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-4 py-2 text-xs font-medium text-slate-200 hover:bg-white/10 transition-colors"
                >
                  <RefreshCw size={14} />
                  Actualiser
                </button>
                {canManage && (
                  <button
                    type="button"
                    onClick={() => setModalOpen(true)}
                    className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-400 transition-colors shadow-lg shadow-emerald-900/30"
                  >
                    <Plus size={14} />
                    Nouveau lot
                  </button>
                )}
              </div>
            </div>

            <div className="mt-8 grid grid-cols-2 lg:grid-cols-4 gap-px rounded-2xl overflow-hidden border border-white/10 bg-white/5 backdrop-blur-sm divide-x divide-white/10">
              <HeroMetric label="Lots" value={String(stats.total)} sub={`${stats.sealed} scellé(s)`} />
              <HeroMetric label="Montant scellé" value={formatMoney(stats.amount)} />
              <HeroMetric label="Paiements" value={String(stats.payments)} sub="transactions liées" />
              <HeroMetric
                label="Période"
                value={periodPreset === 'month' ? 'Ce mois' : periodPreset === 'all' ? 'Tout' : 'Sur mesure'}
              />
            </div>
          </div>
        </motion.section>

        {!canManage && (
          <div className="rounded-2xl border border-amber-200/80 bg-amber-50/90 px-4 py-3 text-xs text-amber-900 flex items-center gap-2">
            <Shield size={14} className="shrink-0" />
            Consultation seule — la création de lots est réservée aux administrateurs.
          </div>
        )}

        <div className="rounded-2xl border border-slate-200/90 bg-white/90 shadow-lg shadow-slate-200/40 ring-1 ring-slate-100 p-4 sm:p-5 space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            {STATUS_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setStatusFilter(opt.value)}
                className={cn(
                  'rounded-full px-3 py-1.5 text-xs font-medium transition-colors',
                  statusFilter === opt.value
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200/80',
                )}
              >
                {opt.label}
              </button>
            ))}
            <span className="hidden sm:block w-px h-5 bg-slate-200 mx-1" />
            {PERIOD_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setPeriodPreset(opt.value as typeof periodPreset)}
                className={cn(
                  'rounded-full px-3 py-1.5 text-xs font-medium transition-colors',
                  periodPreset === opt.value
                    ? 'bg-slate-800 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200/80',
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {periodPreset === 'custom' && (
            <div className="flex flex-wrap items-end gap-3 pt-1">
              <div>
                <label className="block text-[10px] font-medium text-slate-500 mb-1">Du</label>
                <input
                  type="date"
                  value={customFrom}
                  onChange={(e) => setCustomFrom(e.target.value)}
                  className="rounded-xl border border-slate-200 px-3 py-2 text-sm bg-white"
                />
              </div>
              <div>
                <label className="block text-[10px] font-medium text-slate-500 mb-1">Au</label>
                <input
                  type="date"
                  value={customTo}
                  onChange={(e) => setCustomTo(e.target.value)}
                  className="rounded-xl border border-slate-200 px-3 py-2 text-sm bg-white"
                />
              </div>
            </div>
          )}

          <label className="relative flex max-w-md items-center">
            <Search size={14} className="absolute left-3 text-slate-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Référence, sceau, auteur…"
              className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-400/40"
            />
          </label>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-5 gap-5">
          <motion.div
            className="xl:col-span-3 rounded-2xl border border-slate-200/90 bg-white/90 shadow-lg shadow-slate-200/40 ring-1 ring-slate-100 overflow-hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/10 flex items-center justify-center ring-1 ring-emerald-500/20">
                  <Lock size={16} className="text-emerald-600" />
                </div>
                <div>
                  <h2 className="text-sm font-semibold text-slate-900">Registre des lots</h2>
                  <p className="text-xs text-slate-500">{filtered.length} lot(s) affiché(s)</p>
                </div>
              </div>
            </div>

            {isLoading ? (
              <div className="p-8 text-sm text-slate-500 text-center">Chargement…</div>
            ) : filtered.length === 0 ? (
              <div className="p-12 text-center">
                <Fingerprint size={32} className="mx-auto text-slate-300 mb-3" />
                <p className="text-sm font-medium text-slate-700">Aucun lot pour ce filtre</p>
                <p className="text-xs text-slate-500 mt-1">Ajustez la période ou créez un nouveau lot.</p>
                {canManage && (
                  <button
                    type="button"
                    onClick={() => setModalOpen(true)}
                    className="mt-5 inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm text-white hover:bg-emerald-700"
                  >
                    <Plus size={14} />
                    Créer un lot
                  </button>
                )}
              </div>
            ) : (
              <div className="divide-y divide-slate-100 max-h-[min(70vh,640px)] overflow-y-auto">
                {filtered.map((batch) => (
                  <SealBatchListItem
                    key={batch.id}
                    batch={batch}
                    selected={selectedId === batch.id}
                    onSelect={() => setSelectedId(batch.id)}
                  />
                ))}
              </div>
            )}
          </motion.div>

          <motion.div
            className="xl:col-span-2"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <SealBatchDetailPanel
              batchId={selectedId}
              onExportPdf={handleExportPdf}
              exporting={exporting}
            />
          </motion.div>
        </div>
      </div>

      <CreateSealBatchModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        candidates={candidates}
        loading={loadingCandidates}
        isPending={createBatch.isPending}
        onSubmit={handleCreate}
      />
    </div>
  )
}
