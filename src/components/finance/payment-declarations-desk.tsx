'use client'

import { useState } from 'react'
import {
  CheckCircle,
  XCircle,
  RefreshCw,
  ImageIcon,
  AlertTriangle,
  Smartphone,
  Printer,
  Search,
  Hash,
  X,
} from 'lucide-react'
import {
  useLookupPaymentDeclarationStudent,
  usePaymentDeclarations,
  usePaymentDeclarationSettings,
  useReprintDeclarationReceipt,
  useReviewPaymentDeclaration,
  useUpdatePaymentDeclarationSettings,
} from '@/lib/hooks/use-finance'
import { getApiErrorMessage } from '@/lib/api/client'
import { Skeleton } from '@/components/ui/skeleton'
import { useSchoolMoney } from '@/lib/finance/use-school-money'
import { resolveBackendUploadHref } from '@/lib/finance/download-blob'
import { FinancePageHeader, FinancePageShell, FinancePanel } from '@/components/finance/finance-page-shell'
import { StudentFeeScheduleLink } from '@/components/finance/student-fee-schedule-link'
import type { PaymentDeclarationDto, PaymentDeclarationStudentLookup } from '@/types/finance'
import { useAuth } from '@/providers/auth-provider'

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
  'Justificatif falsifié / SMS recréé',
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

const CODE_ALPHABET = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ'

function compactPaymentCode(raw: string): string {
  return raw.replace(/[\s\-_.]/g, '').toUpperCase()
}

function isCompletePaymentCode(raw: string): boolean {
  const compact = compactPaymentCode(raw)
  if (compact.length !== 6) return false
  for (let i = 0; i < compact.length; i += 1) {
    if (!CODE_ALPHABET.includes(compact.charAt(i))) return false
  }
  return true
}

function CashierPaymentCodeLookup({
  identified,
  onIdentified,
  onClear,
}: {
  identified: PaymentDeclarationStudentLookup | null
  onIdentified: (hit: PaymentDeclarationStudentLookup) => void
  onClear: () => void
}) {
  const { format: formatMoney } = useSchoolMoney()
  const [code, setCode] = useState('')
  const [error, setError] = useState<string | null>(null)
  const { mutateAsync, isPending } = useLookupPaymentDeclarationStudent()

  async function identify(raw: string) {
    const compact = compactPaymentCode(raw)
    if (!isCompletePaymentCode(compact)) {
      setError('Saisissez les 6 caractères du code (carte élève).')
      return
    }
    setError(null)
    try {
      const data = await mutateAsync(compact)
      onIdentified(data)
      setCode('')
    } catch (err) {
      setError(getApiErrorMessage(err))
    }
  }

  return (
    <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 px-4 py-3">
      <form
        className="flex flex-wrap items-end gap-2"
        onSubmit={(e) => {
          e.preventDefault()
          void identify(code)
        }}
      >
        <label className="min-w-[220px] flex-1">
          <span className="mb-1 flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wide text-emerald-800">
            <Hash size={12} /> Code paiement — 6 caractères
          </span>
          <input
            value={code}
            onChange={(e) => {
              setError(null)
              setCode(compactPaymentCode(e.target.value).slice(0, 6))
            }}
            placeholder="K7R2B9"
            autoComplete="off"
            spellCheck={false}
            inputMode="text"
            className="w-full rounded-xl border border-emerald-200 bg-white px-3 py-2 font-mono text-sm font-semibold tracking-[0.2em] text-zinc-900 uppercase placeholder:tracking-normal placeholder:text-zinc-400"
            aria-label="Code paiement élève"
          />
        </label>
        <button
          type="submit"
          disabled={isPending || !isCompletePaymentCode(code)}
          className="rounded-xl bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-40"
        >
          {isPending ? 'Recherche…' : 'Identifier'}
        </button>
      </form>
      {error && <p className="mt-2 text-xs font-medium text-red-700">{error}</p>}
      {identified && (
        <div className="mt-3 flex flex-wrap items-start justify-between gap-3 rounded-xl border border-emerald-200 bg-white px-3 py-2.5">
          <div>
            <p className="text-sm font-semibold text-zinc-900">{identified.student.studentName}</p>
            <p className="font-mono text-xs text-zinc-500">
              {identified.student.paymentCode.slice(0, 3)}-{identified.student.paymentCode.slice(3)}
              {identified.student.matricule ? ` · ${identified.student.matricule}` : ''}
              {identified.student.className ? ` · ${identified.student.className}` : ''}
            </p>
            <p className="mt-0.5 text-xs text-zinc-600">
              Solde {formatMoney(identified.student.feesBalance, 'USD')}
              {identified.pendingCount > 0
                ? ` · ${identified.pendingCount} déclaration(s) en attente`
                : ' · aucune déclaration en attente'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClear}
            className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-zinc-600 hover:bg-zinc-100"
          >
            <X size={12} /> Retirer
          </button>
        </div>
      )}
    </div>
  )
}

export function PaymentDeclarationsDesk({ variant }: { variant: 'finance' | 'admin' }) {
  const { format: formatMoney } = useSchoolMoney()
  const { user } = useAuth()
  const canEditSettings = user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN'
  const [status, setStatus] = useState<FilterStatus>('PENDING')
  const [searchInput, setSearchInput] = useState('')
  const [q, setQ] = useState('')
  const [identified, setIdentified] = useState<PaymentDeclarationStudentLookup | null>(null)
  const { data, isLoading, isFetching, refetch } = usePaymentDeclarations(
    status,
    q,
    identified?.student.studentId,
  )
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

      <CashierPaymentCodeLookup
        identified={identified}
        onIdentified={(hit) => {
          setIdentified(hit)
          setQ('')
          setSearchInput('')
          setStatus('PENDING')
        }}
        onClear={() => setIdentified(null)}
      />

      <div className="flex flex-wrap items-center gap-2">
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
        <form
          className="ml-auto flex min-w-[220px] flex-1 items-center gap-1.5 sm:max-w-xs"
          onSubmit={(e) => {
            e.preventDefault()
            setQ(searchInput.trim())
          }}
        >
          <label className="relative flex-1">
            <Search size={13} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-400" />
            <input
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Nom, matricule, réf. SMS…"
              className="w-full rounded-xl border border-zinc-200 bg-white py-1.5 pl-8 pr-3 text-xs text-zinc-800 placeholder:text-zinc-400 disabled:bg-zinc-50"
              disabled={!!identified}
            />
          </label>
          <button
            type="submit"
            className="rounded-xl bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-zinc-800"
          >
            Chercher
          </button>
        </form>
      </div>

      <DeclarationValidationModeBar canEdit={canEditSettings} />

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
          <p className="p-6 text-sm text-zinc-500">
            {q
              ? `Aucune déclaration pour « ${q} ».`
              : 'Aucune déclaration dans ce filtre.'}
          </p>
        ) : (
          <div className="w-full overflow-x-auto">
            <table className="w-full min-w-[700px] text-sm">
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
                    <td className="px-5 py-3.5 max-w-[220px]">
                      <p className="font-medium text-zinc-900 truncate">
                        {row.studentName ?? `Élève #${row.studentId}`}
                      </p>
                      {row.fraudAlert && (
                        <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-red-600 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
                          <AlertTriangle size={10} />
                          {row.fraudAlert.label}
                        </span>
                      )}
                      {(row.paymentCode || row.studentMatricule) && (
                        <p className="font-mono text-[11px] text-zinc-500">
                          {row.paymentCode ? `Code ${row.paymentCode}` : null}
                          {row.paymentCode && row.studentMatricule ? ' · ' : null}
                          {row.studentMatricule}
                        </p>
                      )}
                      {(row.allocations?.length ?? 0) > 1 && (
                        <ul className="mt-1 space-y-0.5 text-[11px] text-zinc-600">
                          {row.allocations!.map((a) => (
                            <li key={a.id}>
                              {a.studentName ?? `Élève #${a.studentId}`}
                              {a.paymentCode ? ` · ${a.paymentCode}` : ''}
                              {' · '}
                              {formatMoney(a.amount, a.currency)}
                              {a.receipt.number ? ` · ${a.receipt.number}` : ''}
                              {(a.reprintCount ?? 0) > 0 ? ' · DUPLICATA' : ''}
                            </li>
                          ))}
                        </ul>
                      )}
                      {(row.surplusAmount ?? 0) > 0 && (
                        <p className="mt-1 text-[11px] font-medium text-amber-800">
                          Surplus {formatMoney(row.surplusAmount ?? 0, row.currency)}
                          {row.surplusDestination === 'WITHDRAWAL_FEE'
                            ? ' → frais de retrait'
                            : row.surplusDestination === 'RESERVE_ADVANCE'
                              ? ' → avance / réserve'
                              : ' à affecter'}
                        </p>
                      )}
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
                        {row.status === 'APPROVED' &&
                          (row.allocations?.length ? row.allocations : []).map((a) => (
                            <ReprintButton key={a.id} declarationId={row.id} allocation={a} />
                          ))}
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
  const [open, setOpen] = useState(false)
  const surplus = row.surplusAmount ?? 0

  async function approveDirect() {
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
        onClick={() => (surplus > 0 ? setOpen(true) : void approveDirect())}
        disabled={isPending}
        className="inline-flex items-center gap-1 rounded-lg bg-emerald-50 px-2.5 py-1.5 text-xs font-medium text-emerald-700 hover:bg-emerald-100 disabled:opacity-40"
      >
        <CheckCircle size={12} /> {isPending ? '…' : surplus > 0 ? 'Valider le surplus' : 'Valider'}
      </button>
      {error && <span className="mt-1 max-w-[180px] text-[10px] text-red-600">{error}</span>}
      {open && (
        <ApproveSurplusModal
          row={row}
          onClose={() => setOpen(false)}
          onError={setError}
        />
      )}
    </span>
  )
}

function ApproveSurplusModal({
  row,
  onClose,
  onError,
}: {
  row: PaymentDeclarationDto
  onClose: () => void
  onError: (msg: string | null) => void
}) {
  const { format: formatMoney } = useSchoolMoney()
  const { mutateAsync, isPending } = useReviewPaymentDeclaration()
  const allocations = row.allocations?.length ? row.allocations : []
  const [destination, setDestination] = useState<'RESERVE_ADVANCE' | 'WITHDRAWAL_FEE'>('RESERVE_ADVANCE')
  const [studentId, setStudentId] = useState(allocations[0]?.studentId ?? row.studentId)

  async function submit() {
    onError(null)
    try {
      await mutateAsync({
        id: row.id,
        decision: 'APPROVE',
        surplusDestination: destination,
        surplusStudentId: studentId,
      })
      onClose()
    } catch (err) {
      onError(getApiErrorMessage(err))
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        <h2 className="text-base font-semibold text-zinc-900">Affecter le surplus</h2>
        <p className="mt-1 text-xs text-zinc-500">
          Le SMS ({formatMoney(row.amount, row.currency)}) dépasse les frais attendus
          {row.expectedFeesTotal != null ? ` (${formatMoney(row.expectedFeesTotal, row.currency)})` : ''}.
          Surplus : <strong>{formatMoney(row.surplusAmount ?? 0, row.currency)}</strong>. La validation globale n’est pas bloquée.
        </p>
        <div className="mt-4 space-y-2">
          <label className="flex items-start gap-2 rounded-xl border border-zinc-200 p-3 text-sm">
            <input
              type="radio"
              name={`surplus-${row.id}`}
              checked={destination === 'RESERVE_ADVANCE'}
              onChange={() => setDestination('RESERVE_ADVANCE')}
            />
            <span>
              <span className="font-medium">Compte de réserve / avance</span>
              <span className="mt-0.5 block text-[11px] text-zinc-500">Imputé à l’élève pour le prochain mois.</span>
            </span>
          </label>
          <label className="flex items-start gap-2 rounded-xl border border-zinc-200 p-3 text-sm">
            <input
              type="radio"
              name={`surplus-${row.id}`}
              checked={destination === 'WITHDRAWAL_FEE'}
              onChange={() => setDestination('WITHDRAWAL_FEE')}
            />
            <span>
              <span className="font-medium">Frais de retrait</span>
              <span className="mt-0.5 block text-[11px] text-zinc-500">Couvre les frais d’opérateur déjà inclus dans le SMS.</span>
            </span>
          </label>
        </div>
        {allocations.length > 0 && (
          <label className="mt-3 block text-xs font-medium text-zinc-600">
            Élève concerné
            <select
              value={studentId}
              onChange={(e) => setStudentId(Number(e.target.value))}
              className="mt-1 w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm"
            >
              {allocations.map((a) => (
                <option key={a.studentId} value={a.studentId}>
                  {a.studentName ?? `Élève #${a.studentId}`}
                </option>
              ))}
            </select>
          </label>
        )}
        <div className="mt-4 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-xl px-3 py-2 text-xs font-medium text-zinc-500 hover:bg-zinc-50">
            Annuler
          </button>
          <button
            type="button"
            onClick={() => void submit()}
            disabled={isPending}
            className="rounded-xl bg-emerald-600 px-3 py-2 text-xs font-medium text-white hover:bg-emerald-700 disabled:opacity-40"
          >
            {isPending ? 'Validation…' : 'Valider et affecter'}
          </button>
        </div>
      </div>
    </div>
  )
}

function DeclarationValidationModeBar({ canEdit }: { canEdit: boolean }) {
  const { data, isLoading } = usePaymentDeclarationSettings()
  const { mutateAsync, isPending } = useUpdatePaymentDeclarationSettings()
  const [error, setError] = useState<string | null>(null)
  const mode = data?.paymentValidationMode ?? 'SEMI_AUTOMATIC'

  async function setMode(next: 'SEMI_AUTOMATIC' | 'INSTANT') {
    if (next === mode) return
    setError(null)
    try {
      await mutateAsync(next)
    } catch (err) {
      setError(getApiErrorMessage(err))
    }
  }

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white px-4 py-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-zinc-800">Validation des reçus SMS</p>
          <p className="text-xs text-zinc-500">
            {mode === 'INSTANT'
              ? 'Mode instantané : le reçu officiel est émis dès la déclaration du parent.'
              : 'Mode semi-automatique : la caisse vérifie le SMS avant d’émettre le reçu officiel.'}
          </p>
        </div>
        {canEdit ? (
          <div className="flex gap-1.5">
            <button
              type="button"
              disabled={isLoading || isPending}
              onClick={() => void setMode('SEMI_AUTOMATIC')}
              className={`rounded-full px-3 py-1.5 text-xs font-medium ${
                mode === 'SEMI_AUTOMATIC'
                  ? 'bg-amber-600 text-white'
                  : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
              }`}
            >
              Semi-auto
            </button>
            <button
              type="button"
              disabled={isLoading || isPending}
              onClick={() => void setMode('INSTANT')}
              className={`rounded-full px-3 py-1.5 text-xs font-medium ${
                mode === 'INSTANT'
                  ? 'bg-emerald-600 text-white'
                  : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
              }`}
            >
              Instantané
            </button>
          </div>
        ) : (
          <span className="rounded-full bg-zinc-100 px-3 py-1.5 text-xs font-medium text-zinc-600">
            {mode === 'INSTANT' ? 'Instantané' : 'Semi-automatique'}
          </span>
        )}
      </div>
      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
    </div>
  )
}

function ReprintButton({
  declarationId,
  allocation,
}: {
  declarationId: number
  allocation: NonNullable<PaymentDeclarationDto['allocations']>[number]
}) {
  const { mutateAsync, isPending } = useReprintDeclarationReceipt()
  const [error, setError] = useState<string | null>(null)

  async function reprint() {
    setError(null)
    try {
      await mutateAsync({ id: declarationId, allocationId: allocation.id })
    } catch (err) {
      setError(getApiErrorMessage(err))
    }
  }

  return (
    <span className="inline-flex flex-col items-end">
      <button
        type="button"
        onClick={() => void reprint()}
        disabled={isPending || !allocation.receipt.number}
        className="inline-flex items-center gap-1 rounded-lg bg-zinc-100 px-2.5 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-200 disabled:opacity-40"
      >
        <Printer size={12} /> {isPending ? '…' : `Rééditer${allocation.studentName ? ` (${allocation.studentName})` : ''}`}
      </button>
      {error && <span className="mt-1 max-w-[180px] text-[10px] text-red-600">{error}</span>}
    </span>
  )
}

function ProofModal({ row, onClose }: { row: PaymentDeclarationDto; onClose: () => void }) {
  const { format: formatMoney } = useSchoolMoney()
  const href = proofHref(row.proofImageUrl)
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="max-h-[92vh] w-full max-w-3xl overflow-auto rounded-2xl bg-white p-5 shadow-xl">
        <div className="mb-3 flex items-start justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-zinc-900">Justificatif SMS</h2>
            <p className="text-xs text-zinc-500">
              {row.studentName ?? `Élève #${row.studentId}`}
              {row.paymentCode ? ` · ${row.paymentCode}` : ''}
              {' · '}
              {row.providerLabel} · {row.transactionRef} ·{' '}
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
