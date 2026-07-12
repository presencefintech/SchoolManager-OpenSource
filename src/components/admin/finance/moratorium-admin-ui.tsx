'use client'

import { useEffect, useState } from 'react'
import { ChevronDown, ChevronUp, Settings2, Shield } from 'lucide-react'
import { cn } from '@/lib/utils'
import { labelMoratoriumType } from '@/lib/business-labels'
import { formatRdcFullName, formatStudentFullName } from '@/lib/utils/student-name.util'
import type { Moratorium, MoratoriumPolicy, MoratoriumType, UpdateMoratoriumPolicyPayload } from '@/types/admin'

export const MORATORIUM_STATUS_STYLES: Record<string, { label: string; cls: string }> = {
  PENDING_APPROVAL: {
    label: 'En attente validation',
    cls: 'bg-amber-500/15 text-amber-800 ring-1 ring-amber-500/25',
  },
  ACTIVE: { label: 'Actif', cls: 'bg-emerald-500/15 text-emerald-800 ring-1 ring-emerald-500/25' },
  EXPIRED: { label: 'Expiré', cls: 'bg-slate-500/10 text-slate-600 ring-1 ring-slate-400/20' },
  REVOKED: { label: 'Révoqué', cls: 'bg-rose-500/15 text-rose-800 ring-1 ring-rose-500/25' },
}

export function MoratoriumStatusBadge({ status }: { status: string }) {
  const cfg = MORATORIUM_STATUS_STYLES[status] ?? {
    label: status,
    cls: 'bg-zinc-100 text-zinc-600',
  }
  return (
    <span className={cn('inline-flex text-[10px] font-semibold px-2 py-0.5 rounded-full', cfg.cls)}>
      {cfg.label}
    </span>
  )
}

function PolicyField({
  label,
  hint,
  children,
}: {
  label: string
  hint?: string
  children: React.ReactNode
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-slate-600 mb-1">{label}</label>
      {children}
      {hint && <p className="mt-1 text-[10px] text-slate-400">{hint}</p>}
    </div>
  )
}

const inputCls =
  'w-full rounded-xl border border-slate-200/80 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400/40'

export function MoratoriumPolicyPanel({
  policy,
  canEdit,
  isSaving,
  onSave,
}: {
  policy: MoratoriumPolicy | undefined
  canEdit: boolean
  isSaving?: boolean
  onSave: (payload: UpdateMoratoriumPolicyPayload) => Promise<void>
}) {
  const [open, setOpen] = useState(true)
  const [form, setForm] = useState<UpdateMoratoriumPolicyPayload>({})
  const [dirty, setDirty] = useState(false)

  useEffect(() => {
    if (!policy) return
    setForm({
      maxMoratoriumDays: policy.maxDays,
      maxMoratoriumsPerYear: policy.maxPerYear,
      moratoriumBehavior: (policy.defaultNotifyBehavior as UpdateMoratoriumPolicyPayload['moratoriumBehavior']) ?? 'SKIP',
      parentRequestEnabled: policy.parentRequestEnabled ?? true,
      parentMaxRequestDays: policy.parentMaxRequestDays ?? 14,
      autoApproveMaxDays: policy.autoApproveMaxDays ?? 0,
    })
    setDirty(false)
  }, [policy])

  function update<K extends keyof UpdateMoratoriumPolicyPayload>(key: K, value: UpdateMoratoriumPolicyPayload[K]) {
    setForm((p) => ({ ...p, [key]: value }))
    setDirty(true)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!canEdit) return
    await onSave(form)
    setDirty(false)
  }

  return (
    <div className="rounded-2xl border border-violet-200/60 bg-gradient-to-br from-violet-50/80 to-white shadow-sm overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between gap-3 px-5 py-4 text-left hover:bg-violet-50/50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-violet-500/10 text-violet-700">
            <Settings2 size={16} />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-800">Politique moratoire école</p>
            <p className="text-xs text-slate-500">
              Durées max, quotas annuels et demandes parent
              {policy?.source === 'provisioned' && ' · valeurs plateforme par défaut'}
            </p>
          </div>
        </div>
        {open ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
      </button>

      {open && (
        <form onSubmit={handleSubmit} className="px-5 pb-5 border-t border-violet-100/80 pt-4 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <PolicyField label="Durée max (jours)" hint="Durée maximale d'un moratoire accordé.">
              <input
                type="number"
                min={1}
                max={365}
                disabled={!canEdit}
                value={form.maxMoratoriumDays ?? ''}
                onChange={(e) => update('maxMoratoriumDays', Number(e.target.value))}
                className={inputCls}
              />
            </PolicyField>
            <PolicyField label="Moratoires max / an / élève" hint="Quota annuel par élève.">
              <input
                type="number"
                min={1}
                max={12}
                disabled={!canEdit}
                value={form.maxMoratoriumsPerYear ?? ''}
                onChange={(e) => update('maxMoratoriumsPerYear', Number(e.target.value))}
                className={inputCls}
              />
            </PolicyField>
            <PolicyField label="Auto-approbation (jours ≤)" hint="0 = désactivé. Demandes courtes auto-validées.">
              <input
                type="number"
                min={0}
                max={30}
                disabled={!canEdit}
                value={form.autoApproveMaxDays ?? 0}
                onChange={(e) => update('autoApproveMaxDays', Number(e.target.value))}
                className={inputCls}
              />
            </PolicyField>
            <PolicyField label="Demandes parent autorisées">
              <select
                disabled={!canEdit}
                value={form.parentRequestEnabled ? 'yes' : 'no'}
                onChange={(e) => update('parentRequestEnabled', e.target.value === 'yes')}
                className={inputCls}
              >
                <option value="yes">Oui</option>
                <option value="no">Non</option>
              </select>
            </PolicyField>
            <PolicyField label="Durée max demande parent (jours)">
              <input
                type="number"
                min={1}
                max={90}
                disabled={!canEdit || !form.parentRequestEnabled}
                value={form.parentMaxRequestDays ?? ''}
                onChange={(e) => update('parentMaxRequestDays', Number(e.target.value))}
                className={inputCls}
              />
            </PolicyField>
            <PolicyField label="Notification parents">
              <select
                disabled={!canEdit}
                value={form.moratoriumBehavior ?? 'SKIP'}
                onChange={(e) =>
                  update('moratoriumBehavior', e.target.value as UpdateMoratoriumPolicyPayload['moratoriumBehavior'])
                }
                className={inputCls}
              >
                <option value="SKIP">Aucune</option>
                <option value="FRIENDLY_TEMPLATE">Message informatif</option>
              </select>
            </PolicyField>
          </div>

          {policy?.allowedTypes?.length ? (
            <div className="flex flex-wrap gap-1.5 items-center text-xs text-slate-500">
              <Shield size={12} className="text-violet-500" />
              Types autorisés :
              {policy.allowedTypes.map((t) => (
                <span key={t} className="px-2 py-0.5 rounded-full bg-white border border-slate-200 text-slate-700">
                  {labelMoratoriumType(t)}
                </span>
              ))}
            </div>
          ) : null}

          {canEdit ? (
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={isSaving || !dirty}
                className="px-4 py-2 rounded-xl bg-violet-600 text-sm text-white font-medium hover:bg-violet-700 disabled:opacity-50"
              >
                {isSaving ? 'Enregistrement…' : 'Enregistrer la politique'}
              </button>
            </div>
          ) : (
            <p className="text-xs text-slate-400">Seuls les administrateurs peuvent modifier la politique.</p>
          )}
        </form>
      )}
    </div>
  )
}

export function MoratoriumDetailPanel({
  item,
  canReview,
  reviewNote,
  onReviewNoteChange,
  onApprove,
  onReject,
  onRevoke,
  isApproving,
  isRejecting,
  isRevoking,
}: {
  item: Moratorium | null
  canReview: boolean
  reviewNote: string
  onReviewNoteChange: (value: string) => void
  onApprove: () => void
  onReject: () => void
  onRevoke: () => void
  isApproving?: boolean
  isRejecting?: boolean
  isRevoking?: boolean
}) {
  if (!item) {
    return (
      <div className="rounded-2xl border border-slate-200/80 bg-white/80 p-8 text-center text-sm text-slate-500 h-full min-h-[280px] flex items-center justify-center">
        Sélectionnez un moratoire pour voir le détail et valider les demandes parent.
      </div>
    )
  }

  const studentLabel =
    item.studentName
    ?? (item.student ? formatRdcFullName(item.student) : '')
    ?? `Élève #${item.studentId}`

  const durationDays = Math.max(
    1,
    Math.ceil((new Date(item.endDate).getTime() - new Date(item.startDate).getTime()) / 86_400_000),
  )

  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white shadow-sm overflow-hidden h-full">
      <div className="px-5 py-4 border-b border-slate-100 bg-gradient-to-r from-violet-50/80 to-white">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-slate-900">{studentLabel}</h3>
            <p className="text-xs text-slate-500 mt-0.5">{labelMoratoriumType(item.type)} · {durationDays} jours</p>
          </div>
          <MoratoriumStatusBadge status={item.status} />
        </div>
      </div>

      <div className="p-5 space-y-4 text-sm">
        <dl className="grid grid-cols-2 gap-3 text-xs">
          <div>
            <dt className="text-slate-400">Début</dt>
            <dd className="text-slate-800 font-medium">{new Date(item.startDate).toLocaleDateString('fr-FR')}</dd>
          </div>
          <div>
            <dt className="text-slate-400">Fin</dt>
            <dd className="text-slate-800 font-medium">{new Date(item.endDate).toLocaleDateString('fr-FR')}</dd>
          </div>
          <div className="col-span-2">
            <dt className="text-slate-400">Motif</dt>
            <dd className="text-slate-700 mt-0.5">{item.reason || '—'}</dd>
          </div>
          {item.internalNote && (
            <div className="col-span-2">
              <dt className="text-slate-400">Note interne</dt>
              <dd className="text-slate-600 mt-0.5">{item.internalNote}</dd>
            </div>
          )}
          <div>
            <dt className="text-slate-400">Accordé par</dt>
            <dd className="text-slate-700">{item.grantedByName ?? '—'}</dd>
          </div>
          <div>
            <dt className="text-slate-400">Créé le</dt>
            <dd className="text-slate-700">
              {new Date(item.createdAt).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' })}
            </dd>
          </div>
        </dl>

        {item.status === 'PENDING_APPROVAL' && canReview && (
          <div className="space-y-3 pt-2 border-t border-slate-100">
            <p className="text-xs font-medium text-amber-800 bg-amber-50 rounded-lg px-3 py-2">
              Demande parent en attente de validation administrative.
            </p>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Note interne (optionnel)</label>
              <textarea
                value={reviewNote}
                onChange={(e) => onReviewNoteChange(e.target.value)}
                rows={2}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-violet-400/40"
                placeholder="Commentaire visible en interne uniquement"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                disabled={isApproving || isRejecting}
                onClick={onApprove}
                className="px-3 py-2 rounded-xl bg-emerald-600 text-white text-xs font-medium hover:bg-emerald-700 disabled:opacity-50"
              >
                {isApproving ? 'Approbation…' : 'Approuver'}
              </button>
              <button
                type="button"
                disabled={isApproving || isRejecting}
                onClick={onReject}
                className="px-3 py-2 rounded-xl border border-rose-200 text-rose-700 text-xs font-medium hover:bg-rose-50 disabled:opacity-50"
              >
                {isRejecting ? 'Rejet…' : 'Rejeter'}
              </button>
            </div>
          </div>
        )}

        {item.status === 'ACTIVE' && canReview && (
          <button
            type="button"
            disabled={isRevoking}
            onClick={onRevoke}
            className="w-full px-3 py-2 rounded-xl border border-rose-200 text-rose-700 text-xs font-medium hover:bg-rose-50 disabled:opacity-50"
          >
            {isRevoking ? 'Révocation…' : 'Révoquer le moratoire'}
          </button>
        )}
      </div>
    </div>
  )
}

export function moratoriumStudentLabel(m: Moratorium): string {
  return (
    m.studentName
    ?? (m.student ? formatRdcFullName(m.student) : '')
    ?? `#${m.studentId}`
  )
}

export const MORATORIUM_FILTER_OPTIONS = [
  { value: '', label: 'Tous' },
  { value: 'PENDING_APPROVAL', label: 'À valider' },
  { value: 'ACTIVE', label: 'Actifs' },
  { value: 'EXPIRED', label: 'Expirés' },
  { value: 'REVOKED', label: 'Révoqués' },
] as const
