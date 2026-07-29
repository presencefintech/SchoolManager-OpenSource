'use client'

import { useMemo, useState } from 'react'
import { Loader2, Plus, ShieldOff, Tag, X } from 'lucide-react'
import {
  useAdminStudentFeeAssignments,
  useCreateStudentFeeAssignment,
  useRevokeStudentFeeAssignment,
} from '@/lib/hooks/use-admin'
import { financeApi } from '@/lib/admin/api/finance.api'
import { useQuery } from '@tanstack/react-query'
import { formatMoney, type FinanceCurrencyCode } from '@/lib/finance/currency'
import { getApiErrorMessage } from '@/lib/api/client'
import { useToast } from '@/providers/toast-provider'
import { cn } from '@/lib/utils'
import type {
  CreateStudentFeeAssignmentPayload,
  StudentFeeAssignmentType,
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
}

/**
 * Attribution amont des frais (catalogue → compte élève).
 * Distinct du picker d’encaissement (attribution aval des lignes à payer).
 */
export function StudentFeeAssignmentPanel({
  studentId,
  sessionId,
  className,
}: StudentFeeAssignmentPanelProps) {
  const { success, error } = useToast()
  const [open, setOpen] = useState(false)
  const [type, setType] = useState<StudentFeeAssignmentType>('ASSIGN')
  const [feeStructureId, setFeeStructureId] = useState<number | ''>('')
  const [reason, setReason] = useState('')
  const [amountOverride, setAmountOverride] = useState('')
  const [percentOverride, setPercentOverride] = useState('')

  const assignmentsQuery = useAdminStudentFeeAssignments(studentId, { sessionId })
  const createMutation = useCreateStudentFeeAssignment(studentId)
  const revokeMutation = useRevokeStudentFeeAssignment(studentId)

  const structuresQuery = useQuery({
    queryKey: ['admin', 'fee-structures', 'assignable', sessionId],
    queryFn: () => financeApi.listFeeStructures({ sessionId, isActive: true }),
    enabled: open,
    staleTime: 60_000,
  })

  const structures = useMemo(() => {
    const raw = structuresQuery.data
    return Array.isArray(raw) ? raw : []
  }, [structuresQuery.data])

  const active = (assignmentsQuery.data ?? []).filter((a) => !a.revokedAt)

  async function handleCreate() {
    if (!feeStructureId || reason.trim().length < 3) {
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

    try {
      await createMutation.mutateAsync(payload)
      success('Attribution enregistrée')
      setOpen(false)
      setReason('')
      setAmountOverride('')
      setPercentOverride('')
      setFeeStructureId('')
    } catch (err) {
      error('Échec', getApiErrorMessage(err))
    }
  }

  async function handleRevoke(assignmentId: number) {
    try {
      await revokeMutation.mutateAsync(assignmentId)
      success('Attribution révoquée')
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
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="inline-flex items-center gap-1.5 rounded-lg bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-zinc-800"
        >
          {open ? <X size={12} /> : <Plus size={12} />}
          {open ? 'Fermer' : 'Attribuer'}
        </button>
      </div>

      {open && (
        <div className="space-y-3 border-b border-zinc-100 bg-zinc-50/60 px-4 py-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-xs text-zinc-600">
              Type
              <select
                value={type}
                onChange={(e) => setType(e.target.value as StudentFeeAssignmentType)}
                className="mt-1 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm"
              >
                <option value="ASSIGN">Attribuer (frais optionnel / hors classe)</option>
                <option value="OVERRIDE">Montant personnalisé</option>
                <option value="EXEMPT">Exonérer</option>
              </select>
            </label>
            <label className="block text-xs text-zinc-600">
              Barème
              <select
                value={feeStructureId}
                onChange={(e) =>
                  setFeeStructureId(e.target.value ? Number(e.target.value) : '')
                }
                className="mt-1 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm"
              >
                <option value="">Choisir…</option>
                {structures.map((s) => {
                  const currency = (s.currency || 'USD') as FinanceCurrencyCode
                  return (
                    <option key={s.id} value={s.id}>
                      {s.label} · {formatMoney(s.amount, currency)}
                      {s.assignmentMode === 'EXPLICIT' ? ' · optionnel' : ''}
                    </option>
                  )
                })}
              </select>
            </label>
          </div>

          {(type === 'OVERRIDE' || type === 'ASSIGN') && (
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
              {type === 'OVERRIDE' && (
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
            disabled={createMutation.isPending}
            onClick={() => void handleCreate()}
            className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
          >
            {createMutation.isPending && <Loader2 size={12} className="animate-spin" />}
            Enregistrer l’attribution
          </button>
        </div>
      )}

      <div className="divide-y divide-zinc-50">
        {assignmentsQuery.isLoading ? (
          <div className="flex items-center gap-2 px-4 py-6 text-xs text-zinc-400">
            <Loader2 size={14} className="animate-spin" /> Chargement…
          </div>
        ) : active.length === 0 ? (
          <p className="px-4 py-6 text-center text-xs text-zinc-400">
            Aucune attribution spécifique — barèmes automatiques de la classe uniquement.
          </p>
        ) : (
          active.map((a) => (
            <div key={a.id} className="flex items-start justify-between gap-3 px-4 py-3">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={cn(
                      'rounded-full px-2 py-0.5 text-[10px] font-medium',
                      TYPE_CLASS[a.type],
                    )}
                  >
                    {TYPE_LABEL[a.type]}
                  </span>
                  <p className="text-sm font-medium text-zinc-800 truncate">
                    {a.feeStructure?.category.name ?? `Barème #${a.feeStructureId}`}
                  </p>
                </div>
                <p className="mt-0.5 text-xs text-zinc-500">{a.reason}</p>
                <p className="mt-0.5 text-[11px] text-zinc-400 tabular-nums">
                  {a.amountOverride != null &&
                    `Montant ${a.amountOverride}${a.feeStructure?.currency ? ` ${a.feeStructure.currency}` : ''}`}
                  {a.percentOverride != null && ` · −${a.percentOverride}%`}
                </p>
              </div>
              <button
                type="button"
                disabled={revokeMutation.isPending}
                onClick={() => void handleRevoke(a.id)}
                className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-zinc-200 px-2.5 py-1.5 text-[11px] font-medium text-zinc-600 hover:bg-zinc-50"
                title="Révoquer"
              >
                <ShieldOff size={12} />
                Révoquer
              </button>
            </div>
          ))
        )}
      </div>
    </section>
  )
}
