'use client'

import { useEffect, useMemo, useState } from 'react'
import { Grid3X3, Loader2, Percent, Plus, Save, Trash2 } from 'lucide-react'
import {
  useBulkApplyFeeStructureV2,
  useFeeStructuresV2,
  useOptions,
  useSections,
  useUpsertFeeCatalogV2,
} from '@/lib/hooks/use-admin'
import { formatMoney } from '@/lib/finance/currency'
import { useStudentFeeCategories } from '@/lib/hooks/admin/student-fee-categories'
import {
  labelStudentCategory,
  normalizeCustomCategoryLabel,
  toMoneyNumber,
} from '@/lib/finance/student-category-labels'
import { getApiErrorMessage } from '@/lib/api/client'
import type {
  FeeDiscountType,
  FeeGridRule,
  StudentCategory,
  StudentFeeCategory,
  UpsertFeeCatalogV2Payload,
} from '@/types/admin'
import { cn } from '@/lib/utils'

type DraftCell = {
  ruleId?: number
  amount: string
  currency: string
}

type DraftPolicy = {
  key: string
  id?: number
  name: string
  discountType: FeeDiscountType
  value: string
  appliesToCategory: StudentCategory
  appliesToCustomLabel: string
  /** Catégorie élève dynamique ; null = élèves sans catégorie (standard) ou règle historique */
  studentFeeCategoryId: number | null
  feeCategoryId: number | null
  isActive: boolean
}

/** Colonne de la grille : le tarif de base + une colonne par catégorie de l'école. */
type GridColumn = {
  key: string
  label: string
  studentFeeCategoryId: number | null
  legacyCategory: StudentCategory | null
}

const STANDARD_COLUMN: GridColumn = {
  key: 'STANDARD',
  label: 'Standard (tarif de base)',
  studentFeeCategoryId: null,
  legacyCategory: null,
}

function buildColumns(categories: StudentFeeCategory[]): GridColumn[] {
  return [
    STANDARD_COLUMN,
    ...categories.map((c) => ({
      key: `cat:${c.id}`,
      label: c.name,
      studentFeeCategoryId: c.id,
      legacyCategory: c.legacyCategory,
    })),
  ]
}

/** Règle de grille correspondant à une colonne (règle liée à la catégorie, sinon ancienne règle enum). */
function ruleMatchesColumn(rule: FeeGridRule, column: GridColumn): boolean {
  if (column.studentFeeCategoryId == null) {
    return rule.studentFeeCategoryId == null && rule.studentCategory === 'STANDARD'
  }
  if (rule.studentFeeCategoryId != null) return rule.studentFeeCategoryId === column.studentFeeCategoryId
  return column.legacyCategory != null && rule.studentCategory === column.legacyCategory
}

function cellKey(optionId: number | null, columnKey: string) {
  return `${optionId ?? 'all'}::${columnKey}`
}

function ruleMatchesScope(
  rule: FeeGridRule,
  feeCategoryId: number,
  sessionId: number,
  optionId: number | null,
) {
  if (rule.feeCategoryId !== feeCategoryId) return false
  if (rule.sessionId != null && rule.sessionId !== sessionId) return false
  if ((rule.optionId ?? null) !== optionId) return false
  if (rule.classId != null) return false
  return rule.isActive !== false
}

export function FeeGridV2Panel({
  sessionId,
  defaultCurrency = 'USD',
}: {
  sessionId: number
  defaultCurrency?: 'USD' | 'CDF'
}) {
  const { data: catalog, isLoading } = useFeeStructuresV2({ enabled: sessionId > 0 })
  const { data: sections = [] } = useSections()
  const [sectionId, setSectionId] = useState<number>(0)
  const { data: options = [] } = useOptions(sectionId > 0 ? sectionId : undefined)
  const upsert = useUpsertFeeCatalogV2()
  const bulkApply = useBulkApplyFeeStructureV2()

  const categories = catalog?.categories ?? []
  const { data: studentCategoryCatalog } = useStudentFeeCategories()
  const studentCategories = useMemo(
    () => studentCategoryCatalog?.categories ?? [],
    [studentCategoryCatalog],
  )
  const columns = useMemo(() => buildColumns(studentCategories), [studentCategories])
  const [feeCategoryId, setFeeCategoryId] = useState(0)
  const [cells, setCells] = useState<Record<string, DraftCell>>({})
  const [policies, setPolicies] = useState<DraftPolicy[]>([])
  const [error, setError] = useState<string | null>(null)
  const [savedFlash, setSavedFlash] = useState(false)

  const optionRows = useMemo(
    () => [{ id: null as number | null, name: 'Toute l’école / section' }, ...options.map((o) => ({ id: o.id, name: o.name }))],
    [options],
  )

  useEffect(() => {
    if (categories.length > 0 && feeCategoryId === 0) {
      setFeeCategoryId(categories[0].id)
    }
  }, [categories, feeCategoryId])

  useEffect(() => {
    if (sections.length > 0 && sectionId === 0) {
      setSectionId(sections[0].id)
    }
  }, [sections, sectionId])

  useEffect(() => {
    if (!catalog || !feeCategoryId || !sessionId) return
    const next: Record<string, DraftCell> = {}
    for (const row of optionRows) {
      for (const col of columns) {
        const key = cellKey(row.id, col.key)
        const candidates = (catalog.gridRules ?? []).filter(
          (r) => ruleMatchesScope(r, feeCategoryId, sessionId, row.id) && ruleMatchesColumn(r, col),
        )
        // une règle déjà liée à la catégorie prime sur l'ancienne règle enum
        const existing = candidates.find((r) => r.studentFeeCategoryId != null) ?? candidates[0]
        next[key] = {
          ruleId: existing?.id,
          amount: existing ? String(toMoneyNumber(existing.amount)) : '',
          currency: existing?.currency ?? defaultCurrency,
        }
      }
    }
    setCells(next)
  }, [catalog, feeCategoryId, sessionId, optionRows, columns, defaultCurrency])

  useEffect(() => {
    const rows = (catalog?.discountPolicies ?? []).map((p, i) => {
      // Politique historique (enum / libellé) : rattachée à la catégorie équivalente quand elle existe
      let studentFeeCategoryId = p.studentFeeCategoryId ?? null
      if (studentFeeCategoryId == null) {
        const label = normalizeCustomCategoryLabel(p.appliesToCustomLabel)?.toLocaleLowerCase('fr-CD')
        const byLabel = label
          ? studentCategories.find((c) => c.name.toLocaleLowerCase('fr-CD') === label)
          : undefined
        const byEnum =
          !label && p.appliesToCategory !== 'STANDARD'
            ? studentCategories.find((c) => c.legacyCategory === p.appliesToCategory)
            : undefined
        studentFeeCategoryId = (byLabel ?? byEnum)?.id ?? null
      }
      return {
        key: p.id != null ? `id-${p.id}` : `new-${i}`,
        id: p.id,
        name: p.name,
        discountType: p.discountType,
        value: String(toMoneyNumber(p.value)),
        appliesToCategory: p.appliesToCategory,
        appliesToCustomLabel: p.appliesToCustomLabel ?? '',
        studentFeeCategoryId,
        feeCategoryId: p.feeCategoryId,
        isActive: p.isActive !== false,
      }
    })
    setPolicies(rows)
  }, [catalog?.discountPolicies, studentCategories])

  function setCellAmount(key: string, amount: string) {
    setCells((prev) => ({
      ...prev,
      [key]: {
        ...(prev[key] ?? { amount: '', currency: defaultCurrency }),
        amount,
      },
    }))
  }

  async function handleSave() {
    if (!feeCategoryId || !sessionId) return
    setError(null)
    setSavedFlash(false)

    const gridRules: UpsertFeeCatalogV2Payload['gridRules'] = []
    for (const row of optionRows) {
      for (const col of columns) {
        const key = cellKey(row.id, col.key)
        const cell = cells[key]
        if (!cell) continue
        const amount = Number(cell.amount)
        if (!Number.isFinite(amount) || amount < 0 || cell.amount.trim() === '') {
          if (cell.ruleId) {
            gridRules.push({
              id: cell.ruleId,
              feeCategoryId,
              sessionId,
              optionId: row.id,
              sectionId: sectionId || null,
              ...(col.studentFeeCategoryId != null
                ? { studentFeeCategoryId: col.studentFeeCategoryId }
                : { studentCategory: 'STANDARD' as const }),
              amount: 0,
              currency: cell.currency || defaultCurrency,
              isActive: false,
            })
          }
          continue
        }
        gridRules.push({
          ...(cell.ruleId ? { id: cell.ruleId } : {}),
          feeCategoryId,
          sessionId,
          optionId: row.id,
          sectionId: sectionId || null,
          ...(col.studentFeeCategoryId != null
            ? { studentFeeCategoryId: col.studentFeeCategoryId }
            : { studentCategory: 'STANDARD' as const }),
          amount,
          currency: cell.currency || defaultCurrency,
          isActive: true,
        })
      }
    }

    const discountPolicies: UpsertFeeCatalogV2Payload['discountPolicies'] = policies
      .filter((p) => p.name.trim() && Number(p.value) >= 0)
      .map((p) => ({
        ...(p.id ? { id: p.id } : {}),
        name: p.name.trim(),
        discountType: p.discountType,
        value: Number(p.value),
        ...(p.studentFeeCategoryId != null
          ? { studentFeeCategoryId: p.studentFeeCategoryId, appliesToCustomLabel: null }
          : {
              studentFeeCategoryId: null,
              appliesToCategory: p.appliesToCategory,
              appliesToCustomLabel: normalizeCustomCategoryLabel(p.appliesToCustomLabel),
            }),
        feeCategoryId: p.feeCategoryId,
        isActive: p.isActive,
      }))

    try {
      await upsert.mutateAsync({ gridRules, discountPolicies })
      setSavedFlash(true)
    } catch (err) {
      setError(getApiErrorMessage(err))
    }
  }

  async function handleBulkApply() {
    if (!sessionId) return
    setError(null)
    try {
      await bulkApply.mutateAsync({
        sessionId,
        ...(sectionId > 0 ? { sectionId } : {}),
      })
    } catch (err) {
      setError(getApiErrorMessage(err))
    }
  }

  function addPolicy() {
    setPolicies((prev) => [
      ...prev,
      {
        key: `new-${Date.now()}`,
        name: '',
        discountType: 'PERCENTAGE',
        value: '50',
        appliesToCategory: 'STANDARD',
        appliesToCustomLabel: '',
        studentFeeCategoryId: studentCategories[0]?.id ?? null,
        feeCategoryId: feeCategoryId || null,
        isActive: true,
      },
    ])
  }

  function updatePolicy(key: string, patch: Partial<DraftPolicy>) {
    setPolicies((prev) => prev.map((p) => (p.key === key ? { ...p, ...patch } : p)))
  }

  function removePolicy(key: string) {
    setPolicies((prev) =>
      prev
        .map((p) => (p.key === key ? { ...p, isActive: false } : p))
        .filter((p) => p.isActive || p.id != null),
    )
  }

  const activePolicies = policies.filter((p) => p.isActive)
  const saving = upsert.isPending

  return (
    <div className="bg-white rounded-2xl border border-zinc-100 shadow-sm overflow-hidden">
      <div className="px-4 py-4 sm:px-5 border-b border-zinc-100 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 min-w-0">
            <Grid3X3 size={14} className="text-emerald-600 shrink-0" />
            <h3 className="text-sm font-semibold text-zinc-900 break-words">
              Grille Tarifaire V2 par Catégorie &amp; Section
            </h3>
          </div>
          <p className="text-xs text-zinc-500 mt-0.5 break-words">
            Montants par option et par catégorie d’élève de votre école. Une case vide = le tarif de base s’applique.
          </p>
        </div>
        <div className="flex flex-wrap gap-2 shrink-0">
          <button
            type="button"
            onClick={() => void handleBulkApply()}
            disabled={bulkApply.isPending || !sessionId}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-zinc-200 text-xs font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-50"
          >
            {bulkApply.isPending ? <Loader2 size={12} className="animate-spin" /> : null}
            Appliquer à la cohorte
          </button>
          <button
            type="button"
            onClick={() => void handleSave()}
            disabled={saving || !feeCategoryId || !sessionId}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 text-xs font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
          >
            {saving ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
            Enregistrer la grille
          </button>
        </div>
      </div>

      <div className="px-5 py-3 border-b border-zinc-50 flex flex-wrap gap-3">
        <label className="text-xs text-zinc-500">
          Catégorie de frais
          <select
            value={feeCategoryId || ''}
            onChange={(e) => setFeeCategoryId(Number(e.target.value))}
            className="mt-1 block min-w-[12rem] px-3 py-2 rounded-lg border border-zinc-200 text-sm text-zinc-800 focus:outline-none focus:ring-2 focus:ring-emerald-400"
          >
            <option value="">— Choisir —</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs text-zinc-500">
          Section
          <select
            value={sectionId || ''}
            onChange={(e) => setSectionId(Number(e.target.value))}
            className="mt-1 block min-w-[10rem] px-3 py-2 rounded-lg border border-zinc-200 text-sm text-zinc-800 focus:outline-none focus:ring-2 focus:ring-emerald-400"
          >
            <option value="">— Toutes —</option>
            {sections.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </label>
      </div>

      {error && (
        <p className="mx-5 mt-3 text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>
      )}
      {savedFlash && (
        <p className="mx-5 mt-3 text-xs text-emerald-700 bg-emerald-50 rounded-lg px-3 py-2">
          Grille et exonérations enregistrées.
        </p>
      )}

      {isLoading ? (
        <div className="p-8 flex justify-center text-zinc-400">
          <Loader2 size={20} className="animate-spin" />
        </div>
      ) : categories.length === 0 ? (
        <p className="p-8 text-center text-sm text-zinc-400">
          Créez d&apos;abord une catégorie de frais (onglet ci-dessus), puis définissez la grille V2.
        </p>
      ) : (
        <div className="w-full overflow-x-auto">
          <table className="w-full text-sm min-w-[720px]">
            <thead>
              <tr className="border-b border-zinc-100 bg-zinc-50/60">
                <th className="text-left px-4 py-3 text-xs font-semibold text-zinc-500 sticky left-0 bg-zinc-50/95">
                  Option
                </th>
                {columns.map((c) => (
                  <th key={c.key} className="text-left px-3 py-3 text-xs font-semibold text-zinc-500 whitespace-nowrap">
                    {c.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {optionRows.map((row) => (
                <tr key={row.id ?? 'all'} className="border-b border-zinc-50 hover:bg-zinc-50/40">
                  <td className="px-4 py-2.5 text-xs font-medium text-zinc-800 sticky left-0 bg-white">
                    {row.name}
                  </td>
                  {columns.map((col) => {
                    const key = cellKey(row.id, col.key)
                    const cell = cells[key]
                    return (
                      <td key={key} className="px-2 py-2">
                        <input
                          type="number"
                          min={0}
                          step="0.01"
                          placeholder="—"
                          value={cell?.amount ?? ''}
                          onChange={(e) => setCellAmount(key, e.target.value)}
                          className="w-24 px-2 py-1.5 rounded-lg border border-zinc-200 text-xs tabular-nums text-right focus:outline-none focus:ring-2 focus:ring-emerald-400"
                        />
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Exonérations & Ristournes */}
      <div className="border-t border-zinc-100 px-5 py-4 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Percent size={14} className="text-amber-600" />
            <h4 className="text-sm font-semibold text-zinc-900">Exonérations &amp; Ristournes</h4>
          </div>
          <button
            type="button"
            onClick={addPolicy}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-zinc-200 text-xs font-medium text-zinc-700 hover:bg-zinc-50"
          >
            <Plus size={12} /> Politique
          </button>
        </div>
        <p className="text-xs text-zinc-500">
          Remises rattachées à vos catégories d’élèves. L’ordre d’application suit la priorité de la catégorie ; le plafond de cumul est réglé plus haut.
        </p>

        {activePolicies.length === 0 ? (
          <p className="text-xs text-zinc-400 py-2">Aucune politique active.</p>
        ) : (
          <div className="space-y-2">
            {activePolicies.map((p) => (
              <div
                key={p.key}
                className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-[minmax(0,1.2fr)_6rem_5rem_minmax(0,1.6fr)_auto] gap-2 items-end rounded-xl border border-zinc-100 bg-zinc-50/50 p-3"
              >
                <label className="text-[10px] font-medium text-zinc-500 uppercase tracking-wide">
                  Nom
                  <input
                    value={p.name}
                    onChange={(e) => updatePolicy(p.key, { name: e.target.value })}
                    placeholder="Remise Famille Nombreuse"
                    className="mt-1 w-full px-2 py-1.5 rounded-lg border border-zinc-200 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-400"
                  />
                </label>
                <label className="text-[10px] font-medium text-zinc-500 uppercase tracking-wide">
                  Type
                  <select
                    value={p.discountType}
                    onChange={(e) =>
                      updatePolicy(p.key, { discountType: e.target.value as FeeDiscountType })
                    }
                    className="mt-1 w-full px-2 py-1.5 rounded-lg border border-zinc-200 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-400"
                  >
                    <option value="PERCENTAGE">%</option>
                    <option value="FIXED_AMOUNT">Montant fixe</option>
                  </select>
                </label>
                <label className="text-[10px] font-medium text-zinc-500 uppercase tracking-wide">
                  Valeur
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    value={p.value}
                    onChange={(e) => updatePolicy(p.key, { value: e.target.value })}
                    className="mt-1 w-full px-2 py-1.5 rounded-lg border border-zinc-200 text-xs tabular-nums focus:outline-none focus:ring-2 focus:ring-emerald-400"
                  />
                </label>
                <label className="text-[10px] font-medium text-zinc-500 uppercase tracking-wide sm:col-span-2">
                  Catégorie d’élève concernée
                  <select
                    value={p.studentFeeCategoryId ?? 0}
                    onChange={(e) =>
                      updatePolicy(p.key, {
                        studentFeeCategoryId: Number(e.target.value) || null,
                      })
                    }
                    className="mt-1 w-full px-2 py-1.5 rounded-lg border border-zinc-200 bg-white text-zinc-900 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-400"
                  >
                    <option value={0}>
                      {p.appliesToCustomLabel
                        ? `Libellé historique : ${p.appliesToCustomLabel}`
                        : 'Élèves sans catégorie (standard)'}
                    </option>
                    {studentCategories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </label>
                <button
                  type="button"
                  onClick={() => removePolicy(p.key)}
                  className="inline-flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg border border-red-100 text-xs text-red-600 hover:bg-red-50"
                  title="Désactiver"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            ))}
          </div>
        )}

        {activePolicies.length > 0 && (
          <ul className="text-[11px] text-zinc-500 space-y-0.5 pt-1">
            {activePolicies.map((p) => (
              <li key={`hint-${p.key}`}>
                <span
                  className={cn(
                    'inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium mr-1.5',
                    'bg-amber-50 text-amber-800',
                  )}
                >
                  {studentCategories.find((c) => c.id === p.studentFeeCategoryId)?.name ||
                    normalizeCustomCategoryLabel(p.appliesToCustomLabel) ||
                    labelStudentCategory(p.appliesToCategory)}
                </span>
                {p.name || 'Sans nom'} ·{' '}
                {p.discountType === 'PERCENTAGE'
                  ? `${p.value}%`
                  : formatMoney(Number(p.value) || 0, defaultCurrency)}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
