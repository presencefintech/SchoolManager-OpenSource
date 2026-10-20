'use client'

import { useMemo, useState } from 'react'
import { Loader2, Plus, Tags, X } from 'lucide-react'
import {
  useAssignStudentFeeCategory,
  useRevokeStudentFeeCategory,
  useStudentFeeCategories,
  useStudentFeeCategoriesOverview,
} from '@/lib/hooks/use-admin'
import { cn } from '@/lib/utils'

const SOURCE_LABEL = {
  MANUAL: 'Attribuée',
  AUTO: 'Automatique',
  LEGACY: 'Ancienne fiche',
} as const

/**
 * Catégories tarifaires de l'élève (plusieurs possibles) : attribution après coup,
 * recalcul des frais et trace dans le journal d'audit.
 */
export function StudentFeeCategoriesCard({
  studentId,
  sessionId,
  readOnly = false,
  className,
}: {
  studentId: number
  sessionId?: number
  readOnly?: boolean
  className?: string
}) {
  const { data: overview, isLoading } = useStudentFeeCategoriesOverview(studentId, sessionId)
  const { data: catalog } = useStudentFeeCategories()
  const assign = useAssignStudentFeeCategory(studentId)
  const revoke = useRevokeStudentFeeCategory(studentId)
  const [categoryId, setCategoryId] = useState(0)
  const [reason, setReason] = useState('')

  const effectiveIds = useMemo(
    () => new Set((overview?.effective ?? []).map((c) => c.id)),
    [overview],
  )
  const assignmentByCategory = useMemo(
    () => new Map((overview?.assignments ?? []).map((a) => [a.categoryId, a])),
    [overview],
  )
  const available = (catalog?.categories ?? []).filter((c) => !effectiveIds.has(c.id))
  const busy = assign.isPending || revoke.isPending

  async function handleAssign() {
    if (!categoryId) return
    await assign.mutateAsync({
      categoryId,
      ...(sessionId ? { sessionId } : {}),
      reason: reason.trim() || undefined,
    })
    setCategoryId(0)
    setReason('')
  }

  return (
    <div className={cn('rounded-2xl border border-zinc-100 bg-white shadow-sm overflow-hidden', className)}>
      <div className="px-4 py-3 border-b border-zinc-100 flex items-center gap-2">
        <Tags size={14} className="text-emerald-600 shrink-0" />
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-zinc-900">Catégories tarifaires</h3>
          <p className="text-[11px] text-zinc-500">
            Détermine le prix et les remises de cet élève (Nouveau, Enfant d&apos;enseignant, Orphelin…).
          </p>
        </div>
      </div>

      <div className="p-4 space-y-3">
        {isLoading ? (
          <div className="flex justify-center py-4 text-zinc-400">
            <Loader2 size={16} className="animate-spin" />
          </div>
        ) : (overview?.effective ?? []).length === 0 ? (
          <p className="text-xs text-zinc-500">Aucune catégorie : tarif standard de la classe.</p>
        ) : (
          <ul className="flex flex-wrap gap-2">
            {overview!.effective.map((c) => {
              const assignment = assignmentByCategory.get(c.id)
              return (
                <li
                  key={c.id}
                  className="inline-flex items-center gap-1.5 rounded-full border border-emerald-100 bg-emerald-50 px-2.5 py-1 text-xs text-emerald-900"
                >
                  <span className="font-medium">{c.name}</span>
                  <span className="text-[10px] text-emerald-700/80">{SOURCE_LABEL[c.source]}</span>
                  {assignment && !readOnly && (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void revoke.mutateAsync({ assignmentId: assignment.id })}
                      className="rounded-full p-0.5 text-emerald-700 hover:bg-emerald-100 disabled:opacity-50"
                      aria-label={`Retirer ${c.name}`}
                      title="Retirer cette catégorie"
                    >
                      <X size={12} />
                    </button>
                  )}
                </li>
              )
            })}
          </ul>
        )}

        {!readOnly && (
          <div className="grid grid-cols-1 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] gap-2 items-end">
            <label className="text-xs text-zinc-600">
              Ajouter une catégorie
              <select
                value={categoryId || ''}
                onChange={(e) => setCategoryId(Number(e.target.value))}
                className="mt-1 w-full px-3 py-2 rounded-lg border border-zinc-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
              >
                <option value="">— Choisir —</option>
                {available.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-xs text-zinc-600">
              Motif (facultatif)
              <input
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Ex. attestation du 12/09"
                maxLength={280}
                className="mt-1 w-full px-3 py-2 rounded-lg border border-zinc-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
              />
            </label>
            <button
              type="button"
              onClick={() => void handleAssign()}
              disabled={!categoryId || busy}
              className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-600 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
            >
              {assign.isPending ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
              Attribuer
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
