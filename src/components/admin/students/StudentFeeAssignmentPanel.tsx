'use client'

import { useMemo, useState } from 'react'
import { Loader2, Pencil, Plus, ShieldOff, Tag, X } from 'lucide-react'
import {
  useAdminStudentFeeAssignments,
  useCreateStudentFeeAssignment,
  useRevokeStudentFeeAssignment,
  useUpdateStudentFeeAssignment,
} from '@/lib/hooks/use-admin'
import { financeApi } from '@/lib/admin/api/finance.api'
import { useQuery } from '@tanstack/react-query'
import { formatMoney, type FinanceCurrencyCode } from '@/lib/finance/currency'
import { getApiErrorMessage } from '@/lib/api/client'
import { useToast } from '@/providers/toast-provider'
import { cn } from '@/lib/utils'
import type {
  CreateStudentFeeAssignmentPayload,
  StudentFeeAssignmentDto,
  StudentFeeAssignmentType,
  UpdateStudentFeeAssignmentPayload,
} from '@/types/finance'

const TYPE_LABEL: Record<StudentFeeAssignmentType, string> = {
  ASSIGN: 'Attribution',
  OVERRIDE: 'Montant custom',
  EXEMPT: 'Exonération',
}

const TYPE_CLASS: Record<StudentFeeAssignmentType, string> = {
  ASSIGN: 'bg-sky-50 text-sky-700',
  OVERRIDE: 'bg-amber-50 text-amber-800',
  EXEMPT: 'bg-zinc-100 text-zinc-600',
}

interface StudentFeeAssignmentPanelProps {
  studentId: number
  sessionId?: number
  className?: string
  /** Guichet : attribuer un pack sans afficher ni saisir de montants. */
  hideAmounts?: boolean
}

function toDateInput(iso?: string | null): string {
  if (!iso) return ''
  return iso.slice(0, 10)
}

function fromDateInput(value: string, endOfDay = false): string | undefined {
  if (!value.trim()) return undefined
  return endOfDay ? `${value}T23:59:59.000Z` : `${value}T00:00:00.000Z`
}

/**
 * Attribution amont des frais (catalogue → compte élève).
 * Distinct du picker d’encaissement (attribution aval des lignes à payer).
 */
export function StudentFeeAssignmentPanel({
  studentId,
  sessionId,
  className,
  hideAmounts = false,
}: StudentFeeAssignmentPanelProps) {
  const { success, error } = useToast()
  const [open, setOpen] = useState(false)
  const [includeRevoked, setIncludeRevoked] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [type, setType] = useState<StudentFeeAssignmentType>('ASSIGN')
  const [feeStructureId, setFeeStructureId] = useState<number | ''>('')
  const [reason, setReason] = useState('')
  const [amountOverride, setAmountOverride] = useState('')
  const [percentOverride, setPercentOverride] = useState('')
  const [validFrom, setValidFrom] = useState('')
  const [validTo, setValidTo] = useState('')

  const assignmentsQuery = useAdminStudentFeeAssignments(studentId, {
    sessionId,
    includeRevoked,
  })
  const createMutation = useCreateStudentFeeAssignment(studentId)
  const updateMutation = useUpdateStudentFeeAssignment(studentId)
  const revokeMutation = useRevokeStudentFeeAssignment(studentId)

  const structuresQuery = useQuery({
    queryKey: ['admin', 'fee-structures', 'assignable', sessionId],
    queryFn: () => financeApi.listFeeStructures({ sessionId, isActive: true }),
    enabled: open && editingId == null,
    staleTime: 60_000,
  })

  const structures = useMemo(() => {
    const raw = structuresQuery.data
    return Array.isArray(raw) ? raw : []
  }, [structuresQuery.data])

  const rows = assignmentsQuery.data ?? []
  const active = rows.filter((a) => !a.revokedAt)
  const revoked = rows.filter((a) => a.revokedAt)
  const saving = createMutation.isPending || updateMutation.isPending

  function resetForm() {
    setEditingId(null)
    setType('ASSIGN')
    setFeeStructureId('')
    setReason('')
    setAmountOverride('')
    setPercentOverride('')
    setValidFrom('')
    setValidTo('')
  }

  function startEdit(a: StudentFeeAssignmentDto) {
    setOpen(true)
    setEditingId(a.id)
    setType(a.type)
    setFeeStructureId(a.feeStructureId ?? '')
    setReason(a.reason)
    setAmountOverride(a.amountOverride != null ? String(a.amountOverride) : '')
    setPercentOverride(a.percentOverride != null ? String(a.percentOverride) : '')
    setValidFrom(toDateInput(a.validFrom))
    setValidTo(toDateInput(a.validTo))
  }

  async function handleSubmit() {
    if (reason.trim().length < 3) {
      error('Motif requis (min. 3 caractères)')
      return
    }

    if (editingId != null) {
      const payload: UpdateStudentFeeAssignmentPayload = {
        reason: reason.trim(),
      }
      if (amountOverride !== '') payload.amountOverride = Number(amountOverride)
      else if (type !== 'EXEMPT') payload.amountOverride = null
      if (percentOverride !== '') payload.percentOverride = Number(percentOverride)
      else payload.percentOverride = null
      const from = fromDateInput(validFrom)
      const to = fromDateInput(validTo, true)
      if (from) payload.validFrom = from
      payload.validTo = to ?? null

      try {
        await updateMutation.mutateAsync({ assignmentId: editingId, payload })
        success('Attribution mise à jour')
        setOpen(false)
        resetForm()
      } catch (err) {
        error('Échec', getApiErrorMessage(err))
      }
      return
    }

    if (!feeStructureId) {
      error('Raison et barème requis')
      return
    }

    const payload: CreateStudentFeeAssignmentPayload = {
      feeStructureId: Number(feeStructureId),
      type,
      reason: reason.trim(),
    }

    if (type === 'OVERRIDE') {
      if (amountOverride) payload.amountOverride = Number(amountOverride)
      else if (percentOverride) payload.percentOverride = Number(percentOverride)
      else {
        error('Indiquez un montant ou un %')
        return
      }
    }
    if (type === 'ASSIGN' && amountOverride) {
      payload.amountOverride = Number(amountOverride)
    }
    const from = fromDateInput(validFrom)
    const to = fromDateInput(validTo, true)
    if (from) payload.validFrom = from
    if (to) payload.validTo = to

    try {
      await createMutation.mutateAsync(payload)
      success('Attribution enregistrée')
      setOpen(false)
      resetForm()
    } catch (err) {
      error('Échec', getApiErrorMessage(err))
    }
  }

  async function handleRevoke(assignmentId: number) {
    try {
      await revokeMutation.mutateAsync(assignmentId)
      success('Attribution révoquée')
      if (editingId === assignmentId) {
        setOpen(false)
        resetForm()
      }
    } catch (err) {
      error('Échec', getApiErrorMessage(err))
    }
  }

  return (
    <section className={cn('rounded-xl border border-zinc-200/80 bg-white', className)}>
      <div className="flex items-center justify-between gap-3 border-b border-zinc-100 px-4 py-3">
        <div className="flex items-center gap-2">
          <Tag size={14} className="text-zinc-400" />
          <div>
            <h3 className="text-sm font-semibold text-zinc-900">Attribution des frais</h3>
            <p className="text-[11px] text-zinc-400">
              Amont · barèmes optionnels, montants custom, exonérations
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-1.5 text-[11px] text-zinc-500 cursor-pointer">
            <input
              type="checkbox"
              className="rounded border-zinc-300"
              checked={includeRevoked}
              onChange={(e) => setIncludeRevoked(e.target.checked)}
            />
            Révoquées
          </label>
          <button
            type="button"
            onClick={() => {
              if (open) {
                setOpen(false)
                resetForm()
              } else {
                resetForm()
                setOpen(true)
              }
            }}
            className="inline-flex items-center gap-1.5 rounded-lg bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-zinc-800"
          >
            {open ? <X size={12} /> : <Plus size={12} />}
            {open ? 'Fermer' : 'Attribuer'}
          </button>
        </div>
      </div>

      {open && (
        <div className="space-y-3 border-b border-zinc-100 bg-zinc-50/60 px-4 py-4">
          {editingId != null && (
            <p className="text-[11px] font-medium text-amber-800">
              Amendment attribution #{editingId}
            </p>
          )}
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-xs text-zinc-600">
              Type
              <select
                value={type}
                disabled={editingId != null}
                onChange={(e) => setType(e.target.value as StudentFeeAssignmentType)}
                className="mt-1 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm disabled:opacity-60"
              >
                <option value="ASSIGN">Attribuer (frais optionnel / hors classe)</option>
                {!hideAmounts && <option value="OVERRIDE">Montant personnalisé</option>}
                <option value="EXEMPT">Exonérer</option>
              </select>
            </label>
            <label className="block text-xs text-zinc-600">
              Barème
              <select
                value={feeStructureId}
                disabled={editingId != null}
                onChange={(e) =>
                  setFeeStructureId(e.target.value ? Number(e.target.value) : '')
                }
                className="mt-1 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm disabled:opacity-60"
              >
                <option value="">Choisir…</option>
                {structures.map((s) => {
                  const currency = (s.currency || 'USD') as FinanceCurrencyCode
                  return (
                    <option key={s.id} value={s.id}>
                      {s.label}
                      {hideAmounts ? '' : ` · ${formatMoney(s.amount, currency)}`}
                      {s.assignmentMode === 'EXPLICIT' ? ' · optionnel' : ''}
                    </option>
                  )
                })}
              </select>
            </label>
          </div>

          {!hideAmounts && (type === 'OVERRIDE' || type === 'ASSIGN' || editingId != null) && type !== 'EXEMPT' && (
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block text-xs text-zinc-600">
                Montant custom
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  value={amountOverride}
                  onChange={(e) => setAmountOverride(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm"
                  placeholder="Laisser vide = catalogue"
                />
              </label>
              {(type === 'OVERRIDE' || editingId != null) && (
                <label className="block text-xs text-zinc-600">
                  Réduction %
                  <input
                    type="number"
                    min={0}
                    max={100}
                    step="0.01"
                    value={percentOverride}
                    onChange={(e) => setPercentOverride(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm"
                    placeholder="ex. 50"
                  />
                </label>
              )}
            </div>
          )}

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-xs text-zinc-600">
              Valide du
              <input
                type="date"
                value={validFrom}
                onChange={(e) => setValidFrom(e.target.value)}
                className="mt-1 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm"
              />
            </label>
            <label className="block text-xs text-zinc-600">
              Valide jusqu&apos;au
              <input
                type="date"
                value={validTo}
                onChange={(e) => setValidTo(e.target.value)}
                className="mt-1 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm"
              />
            </label>
          </div>

          <label className="block text-xs text-zinc-600">
            Motif (audit)
            <input
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="mt-1 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm"
              placeholder="ex. Bourse 50% — décision direction"
            />
          </label>

          <button
            type="button"
            disabled={saving}
            onClick={() => void handleSubmit()}
            className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
          >
            {saving && <Loader2 size={12} className="animate-spin" />}
            {editingId != null ? 'Enregistrer l’amendment' : 'Enregistrer l’attribution'}
          </button>
        </div>
      )}

      <div className="divide-y divide-zinc-50">
        {assignmentsQuery.isLoading ? (
          <div className="flex items-center gap-2 px-4 py-6 text-xs text-zinc-400">
            <Loader2 size={14} className="animate-spin" /> Chargement…
          </div>
        ) : active.length === 0 && (!includeRevoked || revoked.length === 0) ? (
          <p className="px-4 py-6 text-center text-xs text-zinc-400">
            Aucune attribution spécifique — barèmes automatiques de la classe uniquement.
          </p>
        ) : (
          <>
            {active.map((a) => (
              <AssignmentRow
                key={a.id}
                assignment={a}
                onEdit={() => startEdit(a)}
                onRevoke={() => void handleRevoke(a.id)}
                revoking={revokeMutation.isPending}
                hideAmounts={hideAmounts}
              />
            ))}
            {includeRevoked &&
              revoked.map((a) => (
                <AssignmentRow key={a.id} assignment={a} revoked hideAmounts={hideAmounts} />
              ))}
          </>
        )}
      </div>
    </section>
  )
}

function AssignmentRow({
  assignment: a,
  onEdit,
  onRevoke,
  revoking,
  revoked,
  hideAmounts,
}: {
  assignment: StudentFeeAssignmentDto
  onEdit?: () => void
  onRevoke?: () => void
  revoking?: boolean
  revoked?: boolean
  hideAmounts?: boolean
}) {
  return (
    <div
      className={cn(
        'flex items-start justify-between gap-3 px-4 py-3',
        revoked && 'bg-zinc-50/80 opacity-70',
      )}
    >
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={cn('rounded-full px-2 py-0.5 text-[10px] font-medium', TYPE_CLASS[a.type])}
          >
            {TYPE_LABEL[a.type]}
          </span>
          {revoked && (
            <span className="rounded-full bg-zinc-200 px-2 py-0.5 text-[10px] font-medium text-zinc-600">
              Révoquée
            </span>
          )}
          <p className="text-sm font-medium text-zinc-800 truncate">
            {a.feeStructure?.category.name ?? `Barème #${a.feeStructureId}`}
          </p>
        </div>
        <p className="mt-0.5 text-xs text-zinc-500">{a.reason}</p>
        <p className="mt-0.5 text-[11px] text-zinc-400 tabular-nums">
          {!hideAmounts && a.amountOverride != null &&
            `Montant ${a.amountOverride}${a.feeStructure?.currency ? ` ${a.feeStructure.currency}` : ''}`}
          {!hideAmounts && a.percentOverride != null && ` · −${a.percentOverride}%`}
          {(a.validFrom || a.validTo) && (
            <span className="ml-1">
              · {toDateInput(a.validFrom) || '…'}
              {a.validTo ? ` → ${toDateInput(a.validTo)}` : ''}
            </span>
          )}
        </p>
      </div>
      {!revoked && (
        <div className="flex shrink-0 items-center gap-1">
          {onEdit && (
            <button
              type="button"
              onClick={onEdit}
              className="inline-flex items-center gap-1 rounded-lg border border-zinc-200 px-2.5 py-1.5 text-[11px] font-medium text-zinc-600 hover:bg-zinc-50"
              title="Modifier"
            >
              <Pencil size={12} />
              Éditer
            </button>
          )}
          {onRevoke && (
            <button
              type="button"
              disabled={revoking}
              onClick={onRevoke}
              className="inline-flex items-center gap-1 rounded-lg border border-zinc-200 px-2.5 py-1.5 text-[11px] font-medium text-zinc-600 hover:bg-zinc-50"
              title="Révoquer"
            >
              <ShieldOff size={12} />
              Révoquer
            </button>
          )}
        </div>
      )}
    </div>
  )
}
