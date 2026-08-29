'use client'

import { CheckCircle, Info, Pencil, Plus, Users } from 'lucide-react'
import type {
  ClassListItem,
  CreateFeeStructurePayload,
  FeeBillingPeriod,
  FeeCategoryItem,
} from '@/types/admin'
import { formatMoney } from '@/lib/finance/currency'
import { usePreviewFeeStructure } from '@/lib/hooks/use-admin'

const BILLING_PERIOD_LABELS: Record<FeeBillingPeriod, string> = {
  ONE_TIME: 'Ponctuel',
  ANNUAL: 'Annuel',
  MONTHLY: 'Mensuel',
}

type SessionOpt = { id: number; label: string; isCurrent?: boolean }

export function FeeStructureComposer({
  sessions,
  selectedSessionId,
  onSessionChange,
  categories,
  classes,
  feeForm,
  onFeeFormChange,
  editingFeeId,
  saving,
  error,
  success,
  onSubmit,
  onCancelEdit,
  onNewCategory,
  onOpenExisting,
}: {
  sessions: SessionOpt[]
  selectedSessionId: number
  onSessionChange: (id: number) => void
  categories: FeeCategoryItem[]
  classes: ClassListItem[]
  feeForm: Omit<CreateFeeStructurePayload, 'sessionId'>
  onFeeFormChange: (next: Omit<CreateFeeStructurePayload, 'sessionId'>) => void
  editingFeeId: number | null
  saving: boolean
  error: string | null
  success: boolean
  onSubmit: (e: React.FormEvent) => void
  onCancelEdit: () => void
  onNewCategory: () => void
  onOpenExisting: (id: number) => void
}) {
  const selectedCategory = categories.find((c) => c.id === feeForm.categoryId)
  const previewPayload =
    editingFeeId == null && selectedSessionId && feeForm.categoryId && feeForm.amount > 0
      ? {
          sessionId: selectedSessionId,
          categoryId: feeForm.categoryId,
          amount: feeForm.amount,
          classId: feeForm.classId ?? null,
          assignmentMode: feeForm.assignmentMode ?? 'AUTOMATIC',
        }
      : null

  const { data: preview } = usePreviewFeeStructure(previewPayload)
  const duplicateLive = Boolean(preview?.existing && !preview.wouldRestore)
  const isMonthly = selectedCategory?.billingPeriod === 'MONTHLY'

  return (
    <div id="fee-structure-form" className="bg-white rounded-2xl border border-zinc-100 shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-zinc-100 flex items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-zinc-900">
            {editingFeeId != null ? `Modifier le barème #${editingFeeId}` : 'Nouveau barème'}
          </h3>
          <p className="text-xs text-zinc-500 mt-0.5">
            Un barème = un montant pour une catégorie, sur toute l’école ou une classe.
          </p>
        </div>
        {editingFeeId != null && (
          <button
            type="button"
            onClick={onCancelEdit}
            className="text-xs font-medium text-zinc-500 hover:text-zinc-800"
          >
            Annuler l&apos;édition
          </button>
        )}
      </div>

      {success && (
        <div className="mx-5 mt-4 flex items-center gap-2 text-sm text-emerald-700 bg-emerald-50 rounded-lg px-3 py-2">
          <CheckCircle size={14} /> Barème enregistré — il alimente le guichet et le dossier de recouvrement
        </div>
      )}

      <form onSubmit={onSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-0">
        <div className="lg:col-span-2 p-5 grid grid-cols-1 md:grid-cols-2 gap-3 items-end">
          <div>
            <label className="block text-xs font-medium text-zinc-500 mb-1">Année scolaire *</label>
            <select
              required
              value={selectedSessionId || ''}
              onChange={(e) => onSessionChange(Number(e.target.value))}
              className="w-full px-3 py-2 rounded-lg border border-zinc-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
            >
              <option value="">— Choisir —</option>
              {sessions.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}{s.isCurrent ? ' (en cours)' : ''}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-500 mb-1">Catégorie *</label>
            <div className="flex gap-2">
              <select
                required={editingFeeId == null}
                disabled={editingFeeId != null}
                value={feeForm.categoryId || ''}
                onChange={(e) => onFeeFormChange({ ...feeForm, categoryId: Number(e.target.value) })}
                className="flex-1 px-3 py-2 rounded-lg border border-zinc-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 disabled:bg-zinc-50"
              >
                <option value="">{editingFeeId != null ? '— Inchangée —' : '— Choisir —'}</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name} · {BILLING_PERIOD_LABELS[cat.billingPeriod]}
                  </option>
                ))}
              </select>
              {editingFeeId == null && (
                <button
                  type="button"
                  onClick={onNewCategory}
                  className="shrink-0 rounded-lg border border-zinc-200 px-2.5 text-zinc-500 hover:bg-zinc-50"
                  title="Nouvelle catégorie"
                >
                  <Plus size={14} />
                </button>
              )}
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-500 mb-1">
              {isMonthly ? 'Montant d’un mois (USD) *' : 'Montant (USD) *'}
            </label>
            <input
              type="number"
              required
              min={0.01}
              step="0.01"
              value={feeForm.amount || ''}
              onChange={(e) => onFeeFormChange({ ...feeForm, amount: Number(e.target.value) })}
              className="w-full px-3 py-2 rounded-lg border border-zinc-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
            />
            {isMonthly && (
              <p className="mt-1 text-[11px] text-zinc-400">
                Saisissez le mois, pas l’année — le système multiplie par les mois de scolarité.
              </p>
            )}
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-500 mb-1">Périmètre</label>
            <select
              disabled={editingFeeId != null}
              value={feeForm.classId ?? ''}
              onChange={(e) =>
                onFeeFormChange({
                  ...feeForm,
                  classId: e.target.value ? Number(e.target.value) : null,
                })
              }
              className="w-full px-3 py-2 rounded-lg border border-zinc-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 disabled:bg-zinc-50"
            >
              <option value="">Toute l’école</option>
              {classes
                .filter((c) => c.isActive !== false)
                .map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                    {c.studentCount != null ? ` · ${c.studentCount} él.` : ''}
                  </option>
                ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-500 mb-1">Attribution</label>
            <select
              value={feeForm.assignmentMode ?? 'AUTOMATIC'}
              onChange={(e) =>
                onFeeFormChange({
                  ...feeForm,
                  assignmentMode: e.target.value as 'AUTOMATIC' | 'EXPLICIT',
                })
              }
              className="w-full px-3 py-2 rounded-lg border border-zinc-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
            >
              <option value="AUTOMATIC">Automatique — tous les élèves du périmètre</option>
              <option value="EXPLICIT">Optionnel — à cocher à l’inscription</option>
            </select>
          </div>

          <div className="md:col-span-2">
            <label className="block text-xs font-medium text-zinc-500 mb-1">Libellé interne (optionnel)</label>
            <input
              value={feeForm.description ?? ''}
              onChange={(e) => onFeeFormChange({ ...feeForm, description: e.target.value })}
              placeholder="Ex. Minerval 6e A — 2025-2026"
              className="w-full px-3 py-2 rounded-lg border border-zinc-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
            />
          </div>

          <div className="md:col-span-2 flex gap-2">
            <button
              type="submit"
              disabled={
                saving ||
                (editingFeeId == null && (categories.length === 0 || duplicateLive))
              }
              className="flex-1 px-4 py-2.5 rounded-xl bg-emerald-600 text-sm text-white font-medium hover:bg-emerald-700 disabled:opacity-50 flex items-center justify-center gap-1.5"
            >
              {editingFeeId != null ? <Pencil size={13} /> : <Plus size={13} />}
              {saving
                ? 'Enregistrement…'
                : editingFeeId != null
                  ? 'Enregistrer les modifications'
                  : preview?.wouldRestore
                    ? 'Réactiver ce barème'
                    : 'Créer le barème'}
            </button>
          </div>
        </div>

        <aside className="border-t lg:border-t-0 lg:border-l border-zinc-100 bg-zinc-50/70 p-5 space-y-3">
          <p className="text-xs font-semibold text-zinc-700 flex items-center gap-1.5">
            <Info size={13} /> Aperçu
          </p>
          {preview ? (
            <>
              <p className="text-sm text-zinc-800">
                <span className="font-medium">{preview.categoryName}</span>
                <span className="text-zinc-500"> · {preview.scopeLabel}</span>
              </p>
              <div className="flex items-center gap-2 text-xs text-zinc-600">
                <Users size={13} />
                {preview.enrolledCount} élève{preview.enrolledCount > 1 ? 's' : ''} concerné
                {preview.enrolledCount > 1 ? 's' : ''}
              </div>
              <div className="rounded-xl bg-white border border-zinc-100 px-3 py-2">
                <p className="text-[11px] text-zinc-500">
                  {preview.billingPeriod === 'MONTHLY'
                    ? `Unité × ${preview.billingMonthCount} mois`
                    : 'Montant unique'}
                </p>
                <p className="text-lg font-semibold tabular-nums text-zinc-900">
                  {formatMoney(preview.yearTotal, preview.currency)}
                </p>
                <p className="text-[11px] text-zinc-400">attendu sur l’année / élève</p>
              </div>
              {preview.wouldRestore && (
                <p className="text-xs text-amber-800 bg-amber-50 rounded-lg px-3 py-2">
                  Un barème archivé existe déjà — il sera réactivé avec ce montant.
                </p>
              )}
              {duplicateLive && preview.existing && (
                <div className="text-xs text-red-800 bg-red-50 rounded-lg px-3 py-2 space-y-2">
                  <p>
                    Ce barème existe déjà ({formatMoney(preview.existing.amount, preview.currency)}).
                    Impossible d’en créer un second pour le même périmètre.
                  </p>
                  <button
                    type="button"
                    onClick={() => onOpenExisting(preview.existing!.id)}
                    className="font-medium text-red-900 underline"
                  >
                    Ouvrir le barème existant
                  </button>
                </div>
              )}
            </>
          ) : (
            <p className="text-xs text-zinc-400">
              Choisissez une catégorie et un montant pour voir l’impact (élèves, total annuel).
            </p>
          )}
        </aside>
      </form>

      {error && <p className="mx-5 mb-5 text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}
    </div>
  )
}
