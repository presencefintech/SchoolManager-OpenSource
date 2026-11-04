'use client'

import { useEffect, useState } from 'react'
import { Loader2, Plus, Power, Save, Tags } from 'lucide-react'
import {
  useCreateStudentFeeCategory,
  useDeactivateStudentFeeCategory,
  useSetFeeCumulativeCap,
  useStudentFeeCategories,
  useUpdateStudentFeeCategory,
} from '@/lib/hooks/use-admin'
import type { FeeAutoRule, FeeCategoryStackMode, StudentFeeCategory } from '@/types/admin'
import { cn } from '@/lib/utils'

type AutoKind = 'NONE' | FeeAutoRule['kind']

const AUTO_LABELS: Record<AutoKind, string> = {
  NONE: 'Manuelle (choisie par le secrétariat)',
  NEW_STUDENT: 'Automatique : nouvel élève (jamais inscrit avant)',
  RETURNING_STUDENT: 'Automatique : ancien élève (déjà inscrit avant)',
  SIBLING: 'Automatique : fratrie (à partir du Nᵉ enfant)',
  STAFF_CHILD: 'Automatique : enfant d’un membre du personnel',
}

type Draft = {
  name: string
  priority: string
  stackMode: FeeCategoryStackMode
  autoKind: AutoKind
  minRank: string
  description: string
}

const EMPTY: Draft = {
  name: '',
  priority: '100',
  stackMode: 'STACKABLE',
  autoKind: 'NONE',
  minRank: '3',
  description: '',
}

function toDraft(c: StudentFeeCategory): Draft {
  return {
    name: c.name,
    priority: String(c.priority),
    stackMode: c.stackMode,
    autoKind: c.autoRule?.kind ?? 'NONE',
    minRank: c.autoRule?.kind === 'SIBLING' ? String(c.autoRule.minRank) : '3',
    description: c.description ?? '',
  }
}

function toAutoRule(d: Draft): FeeAutoRule | null {
  if (d.autoKind === 'NONE') return null
  if (d.autoKind === 'SIBLING') return { kind: 'SIBLING', minRank: Math.max(2, Number(d.minRank) || 2) }
  return { kind: d.autoKind }
}

const field =
  'mt-1 w-full px-2.5 py-1.5 rounded-lg border border-zinc-200 bg-white text-zinc-900 text-base sm:text-xs focus:outline-none focus:ring-2 focus:ring-emerald-400'

function DraftFields({ draft, onChange }: { draft: Draft; onChange: (patch: Partial<Draft>) => void }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
      <label className="text-[10px] font-medium uppercase tracking-wide text-zinc-500 sm:col-span-2">
        Nom
        <input
          value={draft.name}
          onChange={(e) => onChange({ name: e.target.value })}
          placeholder="Ex. Enfant de pasteur, Orphelin, Cas social…"
          maxLength={120}
          className={field}
        />
      </label>
      <label className="text-[10px] font-medium uppercase tracking-wide text-zinc-500">
        Priorité (petit = prioritaire)
        <input
          type="number"
          min={0}
          max={9999}
          value={draft.priority}
          onChange={(e) => onChange({ priority: e.target.value })}
          className={field}
        />
      </label>
      <label className="text-[10px] font-medium uppercase tracking-wide text-zinc-500">
        Cumul avec les autres remises
        <select
          value={draft.stackMode}
          onChange={(e) => onChange({ stackMode: e.target.value as FeeCategoryStackMode })}
          className={field}
        >
          <option value="STACKABLE">Cumulable</option>
          <option value="EXCLUSIVE">Exclusive (seule la meilleure remise du groupe s’applique)</option>
        </select>
      </label>
      <label className="text-[10px] font-medium uppercase tracking-wide text-zinc-500 sm:col-span-2">
        Attribution
        <select
          value={draft.autoKind}
          onChange={(e) => onChange({ autoKind: e.target.value as AutoKind })}
          className={field}
        >
          {(Object.keys(AUTO_LABELS) as AutoKind[]).map((k) => (
            <option key={k} value={k}>
              {AUTO_LABELS[k]}
            </option>
          ))}
        </select>
      </label>
      {draft.autoKind === 'SIBLING' && (
        <label className="text-[10px] font-medium uppercase tracking-wide text-zinc-500">
          À partir du rang (2 = 2ᵉ enfant)
          <input
            type="number"
            min={2}
            max={20}
            value={draft.minRank}
            onChange={(e) => onChange({ minRank: e.target.value })}
            className={field}
          />
        </label>
      )}
    </div>
  )
}

/**
 * Catégories tarifaires propres à l'école : aucune valeur figée dans le code.
 * Les prix (grille) et remises se rattachent ensuite à ces catégories.
 */
export function StudentFeeCategoriesManager() {
  const { data, isLoading } = useStudentFeeCategories({ includeInactive: true })
  const create = useCreateStudentFeeCategory()
  const update = useUpdateStudentFeeCategory()
  const deactivate = useDeactivateStudentFeeCategory()
  const setCap = useSetFeeCumulativeCap()

  const [newDraft, setNewDraft] = useState<Draft>(EMPTY)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editDraft, setEditDraft] = useState<Draft>(EMPTY)
  const [capText, setCapText] = useState('')

  useEffect(() => {
    const cap = data?.maxCumulativeDiscountPercent
    setCapText(cap == null ? '' : String(cap))
  }, [data?.maxCumulativeDiscountPercent])

  const categories = data?.categories ?? []

  async function handleCreate() {
    if (newDraft.name.trim().length < 2) return
    await create.mutateAsync({
      name: newDraft.name.trim(),
      description: newDraft.description.trim() || null,
      priority: Number(newDraft.priority) || 100,
      stackMode: newDraft.stackMode,
      autoRule: toAutoRule(newDraft),
    })
    setNewDraft(EMPTY)
  }

  async function handleSaveEdit(id: number) {
    await update.mutateAsync({
      id,
      payload: {
        name: editDraft.name.trim(),
        priority: Number(editDraft.priority) || 100,
        stackMode: editDraft.stackMode,
        autoRule: toAutoRule(editDraft),
      },
    })
    setEditingId(null)
  }

  return (
    <div className="bg-white rounded-2xl border border-zinc-100 shadow-sm overflow-hidden">
      <div className="px-4 py-4 sm:px-5 border-b border-zinc-100">
        <div className="flex items-center gap-2">
          <Tags size={14} className="text-emerald-600 shrink-0" />
          <h3 className="text-sm font-semibold text-zinc-900">Catégories d&apos;élèves &amp; tarification</h3>
        </div>
        <p className="text-xs text-zinc-500 mt-0.5">
          Créez les catégories de votre école (nouveaux, anciens, enfants d&apos;enseignants, orphelins…). Un élève peut en
          avoir plusieurs : la plus prioritaire fixe le prix, les remises se cumulent selon vos règles.
        </p>
      </div>

      {isLoading ? (
        <div className="p-8 flex justify-center text-zinc-400">
          <Loader2 size={20} className="animate-spin" />
        </div>
      ) : (
        <div className="p-4 sm:p-5 space-y-5">
          <ul className="space-y-2">
            {categories.map((c) => {
              const editing = editingId === c.id
              return (
                <li
                  key={c.id}
                  className={cn(
                    'rounded-xl border p-3',
                    c.isActive ? 'border-zinc-100 bg-zinc-50/50' : 'border-zinc-100 bg-zinc-50 opacity-60',
                  )}
                >
                  {editing ? (
                    <div className="space-y-2">
                      <DraftFields draft={editDraft} onChange={(p) => setEditDraft((d) => ({ ...d, ...p }))} />
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => void handleSaveEdit(c.id)}
                          disabled={update.isPending || editDraft.name.trim().length < 2}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 text-xs font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
                        >
                          {update.isPending ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
                          Enregistrer
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingId(null)}
                          className="px-3 py-1.5 rounded-lg border border-zinc-200 text-xs text-zinc-700 hover:bg-white"
                        >
                          Annuler
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-zinc-900 break-words">
                          {c.name}
                          {!c.isActive && <span className="ml-2 text-[10px] text-zinc-500">(désactivée)</span>}
                        </p>
                        <p className="text-[11px] text-zinc-500">
                          Priorité {c.priority} · {c.stackMode === 'EXCLUSIVE' ? 'Exclusive' : 'Cumulable'} ·{' '}
                          {AUTO_LABELS[c.autoRule?.kind ?? 'NONE']}
                        </p>
                      </div>
                      <div className="flex gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingId(c.id)
                            setEditDraft(toDraft(c))
                          }}
                          className="px-2.5 py-1 rounded-lg border border-zinc-200 text-xs text-zinc-700 hover:bg-white"
                        >
                          Modifier
                        </button>
                        {c.isActive ? (
                          <button
                            type="button"
                            onClick={() => void deactivate.mutateAsync(c.id)}
                            disabled={deactivate.isPending}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-red-100 text-xs text-red-600 hover:bg-red-50 disabled:opacity-50"
                            title="Désactiver (l’historique est conservé)"
                          >
                            <Power size={12} /> Désactiver
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => void update.mutateAsync({ id: c.id, payload: { isActive: true } })}
                            className="px-2.5 py-1 rounded-lg border border-emerald-100 text-xs text-emerald-700 hover:bg-emerald-50"
                          >
                            Réactiver
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </li>
              )
            })}
          </ul>

          <div className="rounded-xl border border-dashed border-zinc-200 p-3 space-y-2">
            <p className="text-xs font-medium text-zinc-700">Nouvelle catégorie</p>
            <DraftFields draft={newDraft} onChange={(p) => setNewDraft((d) => ({ ...d, ...p }))} />
            <button
              type="button"
              onClick={() => void handleCreate()}
              disabled={create.isPending || newDraft.name.trim().length < 2}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 text-xs font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
            >
              {create.isPending ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} />}
              Ajouter la catégorie
            </button>
          </div>

          <div className="rounded-xl border border-zinc-100 bg-zinc-50/50 p-3">
            <label className="text-xs font-medium text-zinc-700">
              Plafond de cumul des remises (% du prix de base)
              <div className="mt-1 flex flex-wrap items-center gap-2">
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={capText}
                  onChange={(e) => setCapText(e.target.value)}
                  placeholder="Aucun"
                  className="w-28 px-2.5 py-1.5 rounded-lg border border-zinc-200 bg-white text-zinc-900 text-base sm:text-xs focus:outline-none focus:ring-2 focus:ring-emerald-400"
                />
                <button
                  type="button"
                  onClick={() => void setCap.mutateAsync(capText.trim() === '' ? null : Number(capText))}
                  disabled={setCap.isPending}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-zinc-200 bg-white text-xs font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-50"
                >
                  {setCap.isPending ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
                  Enregistrer
                </button>
              </div>
            </label>
            <p className="text-[11px] text-zinc-500 mt-1">
              Exemple : 100 % = un élève peut être totalement exonéré, 70 % = il paie toujours au moins 30 % du prix.
              Laisser vide pour ne pas plafonner.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
