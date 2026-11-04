'use client'

import { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { Plus, Calendar, TrendingUp, RefreshCw, Search, CheckCircle } from 'lucide-react'
import {
  useMoratoriums,
  useCreateMoratorium,
  useCreateBulkMoratoriums,
  useRevokeMoratorium,
  useMoratoriumRecoveryRate,
  useAllowedMoratoriumTypes,
  useMoratoriumPolicy,
  useUpdateMoratoriumPolicy,
  useApproveMoratorium,
  useRejectMoratorium,
  useGetMoratorium,
  useUpdateMoratorium,
} from '@/lib/hooks/use-admin'
import { MoratoriumTypeSelect } from '@/components/admin/finance/moratorium-type-select'
import { StudentSearchField } from '@/components/admin/shared/student-search-field'
import { StudentMultiSelect } from '@/components/admin/shared/student-multi-select'
import {
  MoratoriumDetailPanel,
  MoratoriumPolicyPanel,
  MoratoriumStatusBadge,
  MORATORIUM_FILTER_OPTIONS,
  moratoriumStudentLabel,
} from '@/components/admin/finance/moratorium-admin-ui'
import { RefundFilterBar, RefundFilterPills, RefundPageShell, RefundPanel, RefundPanelHeader, RefundSearchInput, RefundStat } from '@/components/finance/refund-page-ui'
import type { CreateMoratoriumPayload, BulkMoratoriumPayload, Moratorium } from '@/types/admin'
import { labelMoratoriumType } from '@/lib/business-labels'
import { getApiErrorMessage } from '@/lib/api/client'
import { useToast } from '@/providers/toast-provider'
import { useAuth } from '@/providers/auth-provider'
import { cn } from '@/lib/utils'

function MoratoriumModal({
  onClose,
  allowedTypes,
  defaultType,
  policyLoading,
}: {
  onClose: () => void
  allowedTypes: import('@/types/admin').MoratoriumType[]
  defaultType: import('@/types/admin').MoratoriumType
  policyLoading: boolean
}) {
  const { mutateAsync, isPending } = useCreateMoratorium()
  const [form, setForm] = useState<CreateMoratoriumPayload>({
    studentId: 0, type: defaultType, startDate: '', endDate: '', reason: '',
  })
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    setForm((p) => ({ ...p, type: defaultType }))
  }, [defaultType])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    try {
      await mutateAsync(form)
      setSuccess(true)
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } })?.response?.status
      setError(
        status === 429
          ? 'Trop de requêtes — patientez quelques instants puis réessayez.'
          : getApiErrorMessage(err),
      )
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 mx-4">
        <h2 className="text-lg font-semibold text-zinc-900 mb-5">Nouveau moratoire</h2>
        {success ? (
          <div className="text-center py-6">
            <CheckCircle size={20} className="mx-auto text-emerald-600 mb-2" />
            <p className="text-sm text-zinc-800">Moratoire créé</p>
            <button onClick={onClose} className="mt-4 px-4 py-2 rounded-xl bg-emerald-600 text-sm text-white">Fermer</button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <StudentSearchField
              studentId={form.studentId}
              onSelect={(id) => setForm((p) => ({ ...p, studentId: id }))}
              label="Élève"
              required
            />
            <div>
              <label className="block text-xs font-medium text-zinc-500 mb-1">Type *</label>
              <MoratoriumTypeSelect
                value={form.type}
                onChange={(type) => setForm((p) => ({ ...p, type }))}
                allowedTypes={allowedTypes}
                defaultType={defaultType}
                isLoading={policyLoading}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-zinc-500 mb-1">Date début *</label>
                <input type="date" required value={form.startDate} onChange={e => setForm(p => ({ ...p, startDate: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg border border-zinc-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400" />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-500 mb-1">Date fin *</label>
                <input type="date" required value={form.endDate} onChange={e => setForm(p => ({ ...p, endDate: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg border border-zinc-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-500 mb-1">Motif *</label>
              <textarea required minLength={10} value={form.reason} onChange={e => setForm(p => ({ ...p, reason: e.target.value }))}
                rows={3} className="w-full px-3 py-2 rounded-lg border border-zinc-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 resize-none" />
            </div>
            {error && <p className="text-xs text-red-500 bg-red-50 rounded-lg px-3 py-2">{error}</p>}
            <div className="flex gap-2 pt-2">
              <button type="button" onClick={onClose} className="flex-1 px-4 py-2 rounded-xl border border-zinc-200 text-sm text-zinc-600 hover:bg-zinc-50">Annuler</button>
              <button type="submit" disabled={isPending} className="flex-1 px-4 py-2 rounded-xl bg-emerald-600 text-sm text-white font-medium disabled:opacity-50">
                {isPending ? 'Création...' : 'Créer'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}

function BulkMoratoriumModal({
  onClose,
  allowedTypes,
  defaultType,
  policyLoading,
}: {
  onClose: () => void
  allowedTypes: import('@/types/admin').MoratoriumType[]
  defaultType: import('@/types/admin').MoratoriumType
  policyLoading: boolean
}) {
  const { mutateAsync, isPending } = useCreateBulkMoratoriums()
  const [form, setForm] = useState<BulkMoratoriumPayload>({
    studentIds: [], type: defaultType, startDate: '', endDate: '', reason: '',
  })
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    setForm((p) => ({ ...p, type: defaultType }))
  }, [defaultType])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (form.studentIds.length === 0) {
      setError('Sélectionnez au moins un élève')
      return
    }
    try {
      await mutateAsync(form)
      setSuccess(true)
    } catch (err: unknown) {
      setError(getApiErrorMessage(err))
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6 mx-4">
        <h2 className="text-lg font-semibold text-zinc-900 mb-5">Créer des moratoires en masse</h2>
        {success ? (
          <div className="text-center py-6">
            <CheckCircle size={20} className="mx-auto text-emerald-600 mb-2" />
            <p className="text-sm text-zinc-800">Moratoires créés</p>
            <button onClick={onClose} className="mt-4 px-4 py-2 rounded-xl bg-emerald-600 text-sm text-white">Fermer</button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <StudentMultiSelect
              studentIds={form.studentIds}
              onSelect={(ids) => setForm((p) => ({ ...p, studentIds: ids }))}
              label="Élèves"
              required
            />
            <MoratoriumTypeSelect
              value={form.type}
              onChange={(type) => setForm((p) => ({ ...p, type }))}
              allowedTypes={allowedTypes}
              defaultType={defaultType}
              isLoading={policyLoading}
            />
            <div className="grid grid-cols-2 gap-3">
              <input type="date" required value={form.startDate} onChange={e => setForm(p => ({ ...p, startDate: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg border border-zinc-200 text-sm" />
              <input type="date" required value={form.endDate} onChange={e => setForm(p => ({ ...p, endDate: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg border border-zinc-200 text-sm" />
            </div>
            <textarea required minLength={10} value={form.reason} onChange={e => setForm(p => ({ ...p, reason: e.target.value }))} rows={2}
              className="w-full px-3 py-2 rounded-lg border border-zinc-200 text-sm resize-none" placeholder="Motif *" />
            {error && <p className="text-xs text-red-500 bg-red-50 rounded-lg px-3 py-2">{error}</p>}
            <div className="flex gap-2 pt-2">
              <button type="button" onClick={onClose} className="flex-1 px-4 py-2 rounded-xl border border-zinc-200 text-sm">Annuler</button>
              <button type="submit" disabled={isPending} className="flex-1 px-4 py-2 rounded-xl bg-emerald-600 text-sm text-white font-medium disabled:opacity-50">Créer en masse</button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}

function EditMoratoriumModal({ id, onClose }: { id: number; onClose: () => void }) {
  const toast = useToast()
  const { data: detail, isLoading } = useGetMoratorium(id)
  const { mutate, isPending } = useUpdateMoratorium()
  const [endDate, setEndDate] = useState('')
  const [reason, setReason] = useState('')

  useEffect(() => {
    if (detail) {
      setEndDate(detail.endDate?.slice(0, 10) ?? '')
      setReason(detail.reason ?? '')
    }
  }, [detail])

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    mutate({ id, payload: { endDate, reason } }, {
      onSuccess: () => { toast.success('Moratoire modifié'); onClose() },
      onError: (err) => toast.error('Modification impossible', getApiErrorMessage(err)),
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 mx-4">
        <h2 className="text-lg font-semibold text-zinc-900 mb-5">Modifier le moratoire</h2>
        {isLoading ? (
          <p className="text-sm text-zinc-400">Chargement…</p>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-zinc-500 mb-1">Date fin</label>
              <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-zinc-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400" />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-500 mb-1">Motif</label>
              <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={3}
                className="w-full px-3 py-2 rounded-lg border border-zinc-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 resize-none" />
            </div>
            <div className="flex gap-2 pt-2">
              <button type="button" onClick={onClose} className="flex-1 px-4 py-2 rounded-xl border border-zinc-200 text-sm text-zinc-600 hover:bg-zinc-50">Annuler</button>
              <button type="submit" disabled={isPending} className="flex-1 px-4 py-2 rounded-xl bg-emerald-600 text-sm text-white font-medium disabled:opacity-50">
                {isPending ? 'Enregistrement...' : 'Enregistrer'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}

export default function MoratoriumsPage() {
  const toast = useToast()
  const { user } = useAuth()
  const canManage = user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN'

  const [statusFilter, setStatusFilter] = useState('PENDING_APPROVAL')
  const [search, setSearch] = useState('')
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [reviewNote, setReviewNote] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [showBulk, setShowBulk] = useState(false)
  const [editId, setEditId] = useState<number | null>(null)

  const { data: policy } = useMoratoriumPolicy()
  const updatePolicy = useUpdateMoratoriumPolicy()
  const { allowedTypes, defaultType, isLoading: policyLoading } = useAllowedMoratoriumTypes()
  const { data: moratoriums = [], isLoading, refetch } = useMoratoriums({
    status: statusFilter || undefined,
    limit: 100,
  })
  const { data: pendingQueue = [] } = useMoratoriums({ status: 'PENDING_APPROVAL', limit: 100 })
  const { data: recoveryRate } = useMoratoriumRecoveryRate()
  const approve = useApproveMoratorium()
  const reject = useRejectMoratorium()
  const revokeMoratorium = useRevokeMoratorium()

  const pendingCount = pendingQueue.length

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return moratoriums
    return moratoriums.filter((m) => {
      const haystack = [
        moratoriumStudentLabel(m),
        m.reason,
        labelMoratoriumType(m.type),
      ].join(' ').toLowerCase()
      return haystack.includes(q)
    })
  }, [moratoriums, search])

  const selected: Moratorium | null =
    filtered.find((m) => m.id === selectedId)
    ?? moratoriums.find((m) => m.id === selectedId)
    ?? null

  async function handleSavePolicy(payload: Parameters<typeof updatePolicy.mutateAsync>[0]) {
    try {
      await updatePolicy.mutateAsync(payload)
      toast.success('Politique enregistrée', 'Les règles moratoires de l\'école sont à jour.')
    } catch (err) {
      toast.error('Enregistrement impossible', getApiErrorMessage(err))
      throw err
    }
  }

  async function handleApprove() {
    if (!selected) return
    try {
      await approve.mutateAsync({ id: selected.id, internalNote: reviewNote || undefined })
      toast.success('Moratoire approuvé', moratoriumStudentLabel(selected))
      setReviewNote('')
      const { data } = await refetch()
      const next = pendingQueue.find((m) => m.id !== selected.id && m.status === 'PENDING_APPROVAL')
        ?? (data ?? []).find((m) => m.status === 'PENDING_APPROVAL')
      setSelectedId(next?.id ?? null)
    } catch (err) {
      toast.error('Approbation impossible', getApiErrorMessage(err))
    }
  }

  async function handleReject() {
    if (!selected) return
    if (!reviewNote.trim()) {
      toast.warning('Motif requis', 'Indiquez une raison de rejet dans la note.')
      return
    }
    try {
      await reject.mutateAsync({ id: selected.id, reason: reviewNote.trim() })
      toast.success('Demande rejetée', moratoriumStudentLabel(selected))
      setReviewNote('')
      const { data } = await refetch()
      const next = pendingQueue.find((m) => m.id !== selected.id && m.status === 'PENDING_APPROVAL')
        ?? (data ?? []).find((m) => m.status === 'PENDING_APPROVAL')
      setSelectedId(next?.id ?? null)
    } catch (err) {
      toast.error('Rejet impossible', getApiErrorMessage(err))
    }
  }

  function handleRevoke() {
    if (!selected) return
    revokeMoratorium.mutate(selected.id, {
      onSuccess: () => {
        toast.success('Moratoire révoqué')
        refetch()
        setSelectedId(null)
      },
      onError: (err: Error) => toast.error('Révocation impossible', getApiErrorMessage(err)),
    })
  }

  return (
    <RefundPageShell>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold bg-gradient-to-r from-slate-800 via-violet-800 to-indigo-800 bg-clip-text text-transparent">
            Moratoires
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            Plans de paiement, demandes parent et politique d&apos;école.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => refetch()}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
          >
            <RefreshCw size={14} />
            Actualiser
          </button>
          {canManage && (
            <>
              <button
                type="button"
                onClick={() => setShowBulk(true)}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 text-sm text-slate-700 hover:bg-slate-50"
              >
                <Calendar size={13} />
                En masse
              </button>
              <button
                type="button"
                onClick={() => setShowCreate(true)}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-violet-600 text-sm text-white font-medium hover:bg-violet-700 shadow-sm"
              >
                <Plus size={14} />
                Nouveau moratoire
              </button>
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <RefundStat
          label="À valider"
          value={String(pendingCount)}
          tone={pendingCount > 0 ? 'amber' : 'slate'}
        />
        {recoveryRate && (
          <>
            <RefundStat
              label="Taux recouvrement"
              value={`${recoveryRate.recoveryRateGlobal.toFixed(1)}%`}
              tone="emerald"
            />
            <RefundStat
              label="Élèves sous moratoire"
              value={String(recoveryRate.studentsUnderMoratorium)}
              tone="indigo"
            />
          </>
        )}
        <RefundStat label="Affichés" value={String(filtered.length)} tone="slate" />
      </div>

      <MoratoriumPolicyPanel
        policy={policy}
        canEdit={canManage}
        isSaving={updatePolicy.isPending}
        onSave={handleSavePolicy}
      />

      <RefundFilterBar>
        <RefundFilterPills
          value={statusFilter}
          onChange={setStatusFilter}
          options={[...MORATORIUM_FILTER_OPTIONS]}
        />
        <label className="relative flex flex-1 max-w-md items-center">
          <Search size={14} className="absolute left-3 text-slate-400" />
          <RefundSearchInput
            value={search}
            onChange={setSearch}
            placeholder="Rechercher élève, type, motif…"
          />
        </label>
      </RefundFilterBar>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <motion.div className="xl:col-span-2" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <RefundPanel accent="violet">
            <RefundPanelHeader
              title={`Moratoires (${filtered.length})`}
              icon={Calendar}
              badge={
                pendingCount > 0 ? (
                  <span className="rounded-full bg-amber-500/15 px-2.5 py-0.5 text-xs font-medium text-amber-800">
                    {pendingCount} à valider
                  </span>
                ) : undefined
              }
            />
            {isLoading ? (
              <div className="p-6 text-sm text-slate-500">Chargement…</div>
            ) : filtered.length === 0 ? (
              <div className="py-12 text-center">
                <Calendar size={28} className="mx-auto text-slate-300 mb-2" />
                <p className="text-sm text-slate-500">Aucun moratoire pour ce filtre.</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-200/50 max-h-[520px] overflow-y-auto">
                {filtered.map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setSelectedId(m.id)}
                    className={cn(
                      'w-full text-left px-5 py-3.5 transition-colors',
                      selectedId === m.id
                        ? 'bg-gradient-to-r from-violet-50/90 to-indigo-50/50 border-l-[3px] border-l-violet-500'
                        : 'hover:bg-slate-50/80 border-l-[3px] border-l-transparent',
                    )}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-slate-800 truncate">
                          {moratoriumStudentLabel(m)}
                        </p>
                        <p className="text-xs text-slate-500 truncate">
                          {labelMoratoriumType(m.type)} ·{' '}
                          {new Date(m.startDate).toLocaleDateString('fr-FR')} →{' '}
                          {new Date(m.endDate).toLocaleDateString('fr-FR')}
                        </p>
                      </div>
                      <MoratoriumStatusBadge status={m.status} />
                    </div>
                  </button>
                ))}
              </div>
            )}
          </RefundPanel>
        </motion.div>

        <motion.aside initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-2">
          {selected && canManage && (
            <button
              type="button"
              onClick={() => setEditId(selected.id)}
              className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 text-sm text-slate-700 hover:bg-slate-50"
            >
              Modifier le moratoire
            </button>
          )}
          <MoratoriumDetailPanel
            item={selected}
            canReview={canManage}
            reviewNote={reviewNote}
            onReviewNoteChange={setReviewNote}
            onApprove={handleApprove}
            onReject={handleReject}
            onRevoke={handleRevoke}
            isApproving={approve.isPending}
            isRejecting={reject.isPending}
            isRevoking={revokeMoratorium.isPending}
          />
        </motion.aside>
      </div>

      {recoveryRate && (
        <div className="flex items-center gap-2 text-xs text-slate-500 px-1">
          <TrendingUp size={12} className="text-emerald-600" />
          Recouvrement hors moratoires : {recoveryRate.recoveryRateExcludingMoratorium.toFixed(1)}%
        </div>
      )}

      {showCreate && (
        <MoratoriumModal
          onClose={() => { setShowCreate(false); refetch() }}
          allowedTypes={allowedTypes}
          defaultType={defaultType}
          policyLoading={policyLoading}
        />
      )}
      {showBulk && (
        <BulkMoratoriumModal
          onClose={() => { setShowBulk(false); refetch() }}
          allowedTypes={allowedTypes}
          defaultType={defaultType}
          policyLoading={policyLoading}
        />
      )}
      {editId != null && (
        <EditMoratoriumModal id={editId} onClose={() => { setEditId(null); refetch() }} />
      )}
    </RefundPageShell>
  )
}
