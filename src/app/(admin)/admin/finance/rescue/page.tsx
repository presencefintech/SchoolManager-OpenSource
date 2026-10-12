'use client'

import { useMemo, useState } from 'react'
import {
  AlertTriangle,
  CheckCircle2,
  LifeBuoy,
  RefreshCw,
  ShieldAlert,
  Wrench,
  XCircle,
} from 'lucide-react'
import {
  usePaymentVoidRequests,
  useRepairSchoolLedgers,
  useReviewPaymentVoid,
  useSyncStudentLedger,
} from '@/lib/hooks/use-admin'
import { StudentSearchField } from '@/components/admin/shared/student-search-field'
import { useSchoolMoney } from '@/lib/finance/use-school-money'
import { getApiErrorMessage } from '@/lib/api/client'
import { useToast } from '@/providers/toast-provider'
import { useAuth } from '@/providers/auth-provider'
import { cn } from '@/lib/utils'
import type { PaymentVoidRequestRow, PaymentVoidStatus } from '@/lib/admin/api/finance.api'

type Tab = 'voids' | 'sync' | 'repair'

const VOID_FILTERS: Array<{ value: '' | PaymentVoidStatus; label: string }> = [
  { value: 'PENDING', label: 'En attente' },
  { value: '', label: 'Tous' },
  { value: 'APPROVED', label: 'Approuvés' },
  { value: 'REJECTED', label: 'Rejetés' },
]

const STATUS_BADGE: Record<PaymentVoidStatus, string> = {
  PENDING: 'bg-amber-50 text-amber-800 ring-amber-200',
  APPROVED: 'bg-emerald-50 text-emerald-800 ring-emerald-200',
  REJECTED: 'bg-rose-50 text-rose-800 ring-rose-200',
}

function personName(p?: { firstName?: string | null; lastName?: string | null } | null) {
  if (!p) return '—'
  return [p.firstName, p.lastName].filter(Boolean).join(' ').trim() || '—'
}

function amountOf(
  value: number | string | undefined | null,
  formatMoney: (n: number) => string,
) {
  const n = typeof value === 'string' ? Number(value) : value
  return Number.isFinite(n) ? formatMoney(Number(n)) : '—'
}

export default function FinanceRescuePage() {
  const { format: formatMoney } = useSchoolMoney()
  const toast = useToast()
  const { user } = useAuth()
  const [tab, setTab] = useState<Tab>('voids')
  const [voidStatus, setVoidStatus] = useState<'' | PaymentVoidStatus>('PENDING')
  const [selectedVoidId, setSelectedVoidId] = useState<number | null>(null)
  const [reviewNotes, setReviewNotes] = useState('')
  const [studentId, setStudentId] = useState(0)
  const [sessionId, setSessionId] = useState('')
  const [repairSessionId, setRepairSessionId] = useState('')
  const [repairConfirm, setRepairConfirm] = useState('')
  const [syncReason, setSyncReason] = useState('')

  const voidsQuery = usePaymentVoidRequests(voidStatus || undefined)
  const reviewVoid = useReviewPaymentVoid()
  const syncLedger = useSyncStudentLedger()
  const repairLedgers = useRepairSchoolLedgers()

  const voids = useMemo(
    () => (voidsQuery.data ?? []) as PaymentVoidRequestRow[],
    [voidsQuery.data],
  )
  const selected = voids.find((v) => v.id === selectedVoidId) ?? null
  const pendingCount = voids.filter((v) => v.status === 'PENDING').length

  const canAdmin =
    user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN' || user?.role === 'DIRECTOR'

  const handleReview = (action: 'approve' | 'reject') => {
    if (!selected) return
    const notes = reviewNotes.trim()
    if (notes.length < 8) {
      toast.error('Motif requis', 'Indiquez au moins 8 caractères (audit trail).')
      return
    }
    reviewVoid.mutate(
      { id: selected.id, action, notes },
      {
        onSuccess: () => {
          toast.success(
            action === 'approve' ? 'Annulation approuvée' : 'Demande rejetée',
            `Reçu #${selected.paymentId}`,
          )
          setReviewNotes('')
          setSelectedVoidId(null)
        },
        onError: (err) => toast.error('Échec', getApiErrorMessage(err)),
      },
    )
  }

  const handleSync = () => {
    if (!studentId) {
      toast.error('Élève requis', 'Sélectionnez un élève.')
      return
    }
    if (syncReason.trim().length < 8) {
      toast.error('Motif requis', 'Documentez pourquoi vous synchronisez (min. 8 caractères).')
      return
    }
    const sid = sessionId.trim() ? Number(sessionId) : undefined
    syncLedger.mutate(
      { studentId, sessionId: Number.isFinite(sid) ? sid : undefined },
      {
        onSuccess: (data) => {
          toast.success(
            'Ledger synchronisé',
            `Dû ${formatMoney(data.totalFees)} · Payé ${formatMoney(data.feesPaid)} · Solde ${formatMoney(data.feesBalance)}`,
          )
        },
        onError: (err) => toast.error('Sync impossible', getApiErrorMessage(err)),
      },
    )
  }

  const handleRepair = () => {
    if (repairConfirm.trim().toUpperCase() !== 'REPARER') {
      toast.error('Confirmation requise', 'Tapez REPARER pour confirmer l’opération de masse.')
      return
    }
    const sid = repairSessionId.trim() ? Number(repairSessionId) : undefined
    repairLedgers.mutate(
      { sessionId: Number.isFinite(sid) ? sid : undefined },
      {
        onSuccess: (data) => {
          toast.success(
            'Réparation terminée',
            `${data.repaired} réparé(s) / ${data.drifted} dérive(s) sur ${data.scanned} scanné(s)`,
          )
          setRepairConfirm('')
        },
        onError: (err) => toast.error('Réparation impossible', getApiErrorMessage(err)),
      },
    )
  }

  return (
    <div className="space-y-5">
      <header className="rounded-2xl border border-rose-200/70 bg-gradient-to-br from-rose-50 via-white to-amber-50 p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-rose-700/80">
              Finance · Secours
            </p>
            <h1 className="mt-1 text-xl font-bold text-zinc-900 flex items-center gap-2">
              <LifeBuoy size={20} className="text-rose-600" />
              Opérations de secours
            </h1>
            <p className="mt-1 text-sm text-zinc-600 max-w-2xl">
              Annulation de reçus , synchronisation de ledger élève et réparation des
              soldes dérivés. Réservé à l’administration — chaque action est journalisée.
            </p>
          </div>
          {!canAdmin && (
            <span className="inline-flex items-center gap-1.5 rounded-lg bg-amber-100 px-3 py-1.5 text-xs font-semibold text-amber-900">
              <ShieldAlert size={13} /> Accès restreint
            </span>
          )}
        </div>
      </header>

      <div className="flex flex-wrap gap-1 rounded-xl border border-zinc-200 bg-white p-1 shadow-sm">
        {(
          [
            { id: 'voids' as const, label: 'Annulations (voids)', icon: XCircle },
            { id: 'sync' as const, label: 'Sync ledger', icon: RefreshCw },
            { id: 'repair' as const, label: 'Réparer soldes', icon: Wrench },
          ] as const
        ).map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
              tab === id
                ? 'bg-rose-600 text-white shadow-sm'
                : 'text-zinc-600 hover:bg-zinc-50',
            )}
          >
            <Icon size={14} />
            {label}
            {id === 'voids' && pendingCount > 0 && tab !== 'voids' && (
              <span className="rounded-full bg-amber-500 px-1.5 text-[10px] font-bold text-white">
                {pendingCount}
              </span>
            )}
          </button>
        ))}
      </div>

      {tab === 'voids' && (
        <div className="grid gap-4 lg:grid-cols-[1fr_340px]">
          <section className="rounded-xl border border-zinc-200 bg-white shadow-sm overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-100 px-4 py-3">
              <h2 className="text-sm font-semibold text-zinc-800">Demandes d’annulation</h2>
              <div className="flex items-center gap-2">
                <div className="flex gap-1">
                  {VOID_FILTERS.map((f) => (
                    <button
                      key={f.label}
                      type="button"
                      onClick={() => {
                        setVoidStatus(f.value)
                        setSelectedVoidId(null)
                      }}
                      className={cn(
                        'rounded-lg px-2.5 py-1 text-[11px] font-semibold',
                        voidStatus === f.value
                          ? 'bg-zinc-900 text-white'
                          : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200',
                      )}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => void voidsQuery.refetch()}
                  className="p-1.5 rounded-lg text-zinc-400 hover:bg-zinc-50"
                >
                  <RefreshCw
                    size={14}
                    className={voidsQuery.isFetching ? 'animate-spin' : ''}
                  />
                </button>
              </div>
            </div>

            {voidsQuery.isLoading ? (
              <p className="p-8 text-center text-sm text-zinc-400">Chargement…</p>
            ) : voids.length === 0 ? (
              <div className="py-12 text-center">
                <CheckCircle2 size={28} className="mx-auto text-zinc-300 mb-2" />
                <p className="text-sm text-zinc-400">Aucune demande pour ce filtre.</p>
              </div>
            ) : (
              <ul className="divide-y divide-zinc-100 max-h-[520px] overflow-y-auto">
                {voids.map((row) => (
                  <li key={row.id}>
                    <button
                      type="button"
                      onClick={() => setSelectedVoidId(row.id)}
                      className={cn(
                        'w-full text-left px-4 py-3 hover:bg-zinc-50 transition-colors',
                        selectedVoidId === row.id && 'bg-rose-50/60',
                      )}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-zinc-900 truncate">
                            {personName(row.payment?.student)} ·{' '}
                            {amountOf(row.payment?.amount, formatMoney)}
                          </p>
                          <p className="text-xs text-zinc-500 mt-0.5 truncate">
                            Reçu #{row.paymentId}
                            {row.payment?.receiptNumber
                              ? ` · ${row.payment.receiptNumber}`
                              : ''}
                            {row.cashDesk?.code ? ` · ${row.cashDesk.code}` : ''}
                          </p>
                          <p className="text-xs text-zinc-400 mt-1 line-clamp-1">{row.reason}</p>
                        </div>
                        <span
                          className={cn(
                            'shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ring-1',
                            STATUS_BADGE[row.status],
                          )}
                        >
                          {row.status}
                        </span>
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <aside className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm space-y-3 h-fit">
            <h3 className="text-sm font-semibold text-zinc-800">Décision admin</h3>
            {!selected ? (
              <p className="text-sm text-zinc-400">Sélectionnez une demande.</p>
            ) : (
              <>
                <dl className="space-y-2 text-sm">
                  <div className="flex justify-between gap-2">
                    <dt className="text-zinc-500">Élève</dt>
                    <dd className="font-medium text-right">
                      {personName(selected.payment?.student)}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-2">
                    <dt className="text-zinc-500">Montant</dt>
                    <dd className="font-semibold tabular-nums">
                      {amountOf(selected.payment?.amount, formatMoney)}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-2">
                    <dt className="text-zinc-500">Demandé par</dt>
                    <dd className="text-right">{personName(selected.requestedBy)}</dd>
                  </div>
                  <div>
                    <dt className="text-zinc-500 mb-1">Motif caissier</dt>
                    <dd className="rounded-lg bg-zinc-50 px-2.5 py-2 text-xs text-zinc-700">
                      {selected.reason}
                    </dd>
                  </div>
                </dl>

                {selected.status === 'PENDING' ? (
                  <>
                    <label className="block text-xs font-medium text-zinc-600">
                      Motif de décision (obligatoire, audit)
                      <textarea
                        value={reviewNotes}
                        onChange={(e) => setReviewNotes(e.target.value)}
                        rows={3}
                        placeholder="Ex. reçu en double confirmé sur caisse A — annulation OK"
                        className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-400"
                      />
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        disabled={reviewVoid.isPending || !canAdmin}
                        onClick={() => handleReview('approve')}
                        className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
                      >
                        <CheckCircle2 size={14} /> Approuver
                      </button>
                      <button
                        type="button"
                        disabled={reviewVoid.isPending || !canAdmin}
                        onClick={() => handleReview('reject')}
                        className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-zinc-900 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
                      >
                        <XCircle size={14} /> Rejeter
                      </button>
                    </div>
                  </>
                ) : (
                  <p className="rounded-lg bg-zinc-50 px-3 py-2 text-xs text-zinc-600">
                    Déjà traité
                    {selected.reviewNotes ? ` — ${selected.reviewNotes}` : ''}.
                  </p>
                )}
              </>
            )}
          </aside>
        </div>
      )}

      {tab === 'sync' && (
        <section className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm space-y-4 max-w-xl">
          <div>
            <h2 className="text-sm font-semibold text-zinc-800 flex items-center gap-2">
              <RefreshCw size={15} className="text-teal-600" />
              Synchroniser le ledger élève
            </h2>
            <p className="mt-1 text-xs text-zinc-500">
              Recalcule totalFees / feesPaid / solde depuis les barèmes effectifs (reprise offline,
              coupure réseau, écart de quittance).
            </p>
          </div>

          <StudentSearchField studentId={studentId} onSelect={setStudentId} required />

          <label className="block text-xs font-medium text-zinc-600">
            Session scolaire (optionnel)
            <input
              value={sessionId}
              onChange={(e) => setSessionId(e.target.value)}
              placeholder="ID session"
              inputMode="numeric"
              className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
            />
          </label>

          <label className="block text-xs font-medium text-zinc-600">
            Motif d’intervention (obligatoire)
            <textarea
              value={syncReason}
              onChange={(e) => setSyncReason(e.target.value)}
              rows={2}
              placeholder="Ex. écart après reprise caisse du 05/10"
              className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
            />
          </label>

          <button
            type="button"
            disabled={syncLedger.isPending || !canAdmin || !studentId}
            onClick={handleSync}
            className="inline-flex items-center gap-2 rounded-lg bg-teal-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
          >
            <RefreshCw size={14} className={syncLedger.isPending ? 'animate-spin' : ''} />
            {syncLedger.isPending ? 'Synchronisation…' : 'Synchroniser'}
          </button>

          {syncLedger.isSuccess && syncLedger.data && (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
              Lignes : {syncLedger.data.lineCount} · Solde {formatMoney(syncLedger.data.feesBalance)}
            </div>
          )}
        </section>
      )}

      {tab === 'repair' && (
        <section className="rounded-xl border border-amber-200 bg-white p-5 shadow-sm space-y-4 max-w-xl">
          <div className="flex items-start gap-2">
            <AlertTriangle size={18} className="text-amber-600 mt-0.5 shrink-0" />
            <div>
              <h2 className="text-sm font-semibold text-zinc-800">Réparer les ledgers dérivés</h2>
              <p className="mt-1 text-xs text-zinc-500">
                Scan école : élèves dont solde ≠ totalFees − feesPaid (ou barèmes désync). Opération
                de masse — confirmez explicitement.
              </p>
            </div>
          </div>

          <label className="block text-xs font-medium text-zinc-600">
            Session scolaire (optionnel)
            <input
              value={repairSessionId}
              onChange={(e) => setRepairSessionId(e.target.value)}
              placeholder="ID session"
              inputMode="numeric"
              className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
            />
          </label>

          <label className="block text-xs font-medium text-zinc-600">
            Confirmation — tapez <span className="font-mono font-bold">REPARER</span>
            <input
              value={repairConfirm}
              onChange={(e) => setRepairConfirm(e.target.value)}
              className="mt-1 w-full rounded-lg border border-amber-200 px-3 py-2 text-sm font-mono"
            />
          </label>

          <button
            type="button"
            disabled={repairLedgers.isPending || !canAdmin}
            onClick={handleRepair}
            className="inline-flex items-center gap-2 rounded-lg bg-amber-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
          >
            <Wrench size={14} />
            {repairLedgers.isPending ? 'Réparation en cours…' : 'Lancer la réparation'}
          </button>

          {repairLedgers.isSuccess && repairLedgers.data && (
            <div className="space-y-2">
              <div className="grid grid-cols-4 gap-2 text-center text-sm">
                <div className="rounded-lg bg-zinc-50 p-2">
                  <p className="text-[10px] uppercase text-zinc-400">Scannés</p>
                  <p className="font-bold tabular-nums">{repairLedgers.data.scanned}</p>
                </div>
                <div className="rounded-lg bg-amber-50 p-2">
                  <p className="text-[10px] uppercase text-amber-700">Dérives</p>
                  <p className="font-bold tabular-nums">{repairLedgers.data.drifted}</p>
                </div>
                <div className="rounded-lg bg-emerald-50 p-2">
                  <p className="text-[10px] uppercase text-emerald-700">Réparés</p>
                  <p className="font-bold tabular-nums">{repairLedgers.data.repaired}</p>
                </div>
                <div className="rounded-lg bg-rose-50 p-2">
                  <p className="text-[10px] uppercase text-rose-700">Échecs</p>
                  <p className="font-bold tabular-nums">{repairLedgers.data.failed}</p>
                </div>
              </div>
              {(repairLedgers.data.samples?.length ?? 0) > 0 && (
                <ul className="max-h-40 overflow-y-auto rounded-lg border border-zinc-100 text-xs divide-y">
                  {repairLedgers.data.samples.slice(0, 12).map((s) => (
                    <li key={s.studentId} className="px-3 py-2 flex justify-between gap-2">
                      <span>Élève #{s.studentId}</span>
                      <span className="tabular-nums text-zinc-500">
                        {s.error
                          ? s.error
                          : `${formatMoney(s.before.tuitionBalance)} → ${
                              s.after ? formatMoney(s.after.feesBalance) : '—'
                            }`}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </section>
      )}
    </div>
  )
}
