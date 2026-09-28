'use client'

import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Plus, Trash2 } from 'lucide-react'
import { useCreateExpensesBatch } from '@/lib/hooks/use-finance'
import { financeBudgetApi } from '@/lib/admin/api/finance-budget.api'
import { formatMoney } from '@/lib/finance/currency'
import { getApiErrorMessage } from '@/lib/api/client'
import type { ExpenseKind } from '@/types/finance'

export type ExpenseDraftLine = {
  key: string
  kind: ExpenseKind
  category: string
  label: string
  amount: string
  reference: string
}

function newLine(): ExpenseDraftLine {
  return {
    key: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    kind: 'OPERATING',
    category: '',
    label: '',
    amount: '',
    reference: '',
  }
}

function todayIsoDate() {
  const d = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

type Props = {
  defaultDate?: string
  compact?: boolean
  onSaved?: () => void
}

export function ExpenseLinesForm({ defaultDate, compact, onSaved }: Props) {
  const createBatch = useCreateExpensesBatch()
  const [error, setError] = useState<string | null>(null)
  const [ok, setOk] = useState<string | null>(null)
  const [occurredAt, setOccurredAt] = useState(defaultDate || todayIsoDate())
  const [affectsCash, setAffectsCash] = useState(true)
  const [postImmediately, setPostImmediately] = useState(true)
  const [budgetCategoryId, setBudgetCategoryId] = useState('')
  const [lines, setLines] = useState<ExpenseDraftLine[]>([newLine()])

  const budgetCategoriesQuery = useQuery({
    queryKey: ['finance', 'budget-categories'],
    queryFn: () => financeBudgetApi.listCategories(),
    staleTime: 60_000,
  })
  const budgetCategories = (budgetCategoriesQuery.data ?? []).filter((c) => c.isActive)

  const total = useMemo(
    () =>
      lines.reduce((s, l) => {
        const n = Number(l.amount)
        return s + (Number.isFinite(n) && n > 0 ? n : 0)
      }, 0),
    [lines],
  )

  function updateLine(key: string, patch: Partial<ExpenseDraftLine>) {
    setLines((prev) => prev.map((l) => (l.key === key ? { ...l, ...patch } : l)))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setOk(null)
    const prepared = lines
      .map((l) => ({
        kind: l.kind,
        category: l.category.trim(),
        label: l.label.trim(),
        amount: Number(l.amount),
        reference: l.reference.trim() || null,
      }))
      .filter((l) => l.category || l.label || (Number.isFinite(l.amount) && l.amount > 0))

    if (prepared.length === 0) {
      setError('Ajoutez au moins une ligne (catégorie, libellé et montant).')
      return
    }
    for (const l of prepared) {
      if (!l.category || !l.label || !Number.isFinite(l.amount) || l.amount <= 0) {
        setError('Chaque ligne doit avoir une catégorie, un libellé et un montant positif.')
        return
      }
    }

    try {
      const result = await createBatch.mutateAsync({
        occurredAt,
        affectsCash,
        postImmediately,
        budgetCategoryId: budgetCategoryId ? Number(budgetCategoryId) : undefined,
        lines: prepared,
      })
      setOk(`${result.count} dépense(s) enregistrée(s) · ${formatMoney(result.total, 'USD')}.`)
      setLines([newLine()])
      onSaved?.()
    } catch (err) {
      setError(getApiErrorMessage(err))
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}
      {ok ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          {ok}
        </div>
      ) : null}

      <div className={`grid gap-3 ${compact ? 'sm:grid-cols-2' : 'sm:grid-cols-3'}`}>
        <label className="text-xs font-medium text-zinc-500">
          Date
          <input
            type="date"
            required
            value={occurredAt}
            onChange={(e) => setOccurredAt(e.target.value)}
            className="mt-1 block w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
          />
        </label>
        <label className="inline-flex items-center gap-2 text-sm text-zinc-700 pt-6">
          <input
            type="checkbox"
            checked={affectsCash}
            onChange={(e) => setAffectsCash(e.target.checked)}
            className="rounded border-zinc-300"
          />
          Sort de la caisse
        </label>
        <label className="inline-flex items-center gap-2 text-sm text-zinc-700 pt-6">
          <input
            type="checkbox"
            checked={postImmediately}
            onChange={(e) => setPostImmediately(e.target.checked)}
            className="rounded border-zinc-300"
          />
          Comptabiliser tout de suite
        </label>
        <label className="text-xs font-medium text-zinc-500">
          Catégorie budgétaire (optionnel)
          <select
            value={budgetCategoryId}
            onChange={(e) => setBudgetCategoryId(e.target.value)}
            className="mt-1 block w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm bg-white"
          >
            <option value="">Hors budget</option>
            {budgetCategories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="overflow-x-auto rounded-xl border border-zinc-200">
        <table className="w-full text-sm min-w-[720px]">
          <thead>
            <tr className="border-b border-zinc-100 bg-zinc-50 text-left text-[10px] uppercase tracking-wide text-zinc-500">
              <th className="px-3 py-2">Type</th>
              <th className="px-3 py-2">Catégorie</th>
              <th className="px-3 py-2">Libellé</th>
              <th className="px-3 py-2 text-right">Montant</th>
              <th className="px-3 py-2">N° preuve</th>
              <th className="px-3 py-2 w-12" />
            </tr>
          </thead>
          <tbody>
            {lines.map((line, idx) => (
              <tr key={line.key} className="border-b border-zinc-50">
                <td className="px-3 py-2">
                  <select
                    value={line.kind}
                    onChange={(e) =>
                      updateLine(line.key, { kind: e.target.value as ExpenseKind })
                    }
                    className="w-full rounded-lg border border-zinc-200 px-2 py-1.5 text-sm"
                  >
                    <option value="OPERATING">Fonctionnement</option>
                    <option value="INVESTMENT">Investissement</option>
                  </select>
                </td>
                <td className="px-3 py-2">
                  <input
                    required
                    value={line.category}
                    onChange={(e) => updateLine(line.key, { category: e.target.value })}
                    placeholder="Salaires, IPR…"
                    className="w-full rounded-lg border border-zinc-200 px-2 py-1.5 text-sm"
                  />
                </td>
                <td className="px-3 py-2">
                  <input
                    required
                    value={line.label}
                    onChange={(e) => updateLine(line.key, { label: e.target.value })}
                    placeholder={`Ligne ${idx + 1}`}
                    className="w-full rounded-lg border border-zinc-200 px-2 py-1.5 text-sm"
                  />
                </td>
                <td className="px-3 py-2">
                  <input
                    required
                    type="number"
                    min={0.01}
                    step="0.01"
                    value={line.amount}
                    onChange={(e) => updateLine(line.key, { amount: e.target.value })}
                    className="w-full rounded-lg border border-zinc-200 px-2 py-1.5 text-sm text-right tabular-nums"
                  />
                </td>
                <td className="px-3 py-2">
                  <input
                    value={line.reference}
                    onChange={(e) => updateLine(line.key, { reference: e.target.value })}
                    placeholder="Optionnel"
                    className="w-full rounded-lg border border-zinc-200 px-2 py-1.5 text-sm"
                  />
                </td>
                <td className="px-3 py-2 text-right">
                  {lines.length > 1 ? (
                    <button
                      type="button"
                      title="Retirer la ligne"
                      onClick={() => setLines((prev) => prev.filter((l) => l.key !== line.key))}
                      className="rounded-lg border border-zinc-200 p-1.5 text-zinc-500 hover:bg-zinc-50"
                    >
                      <Trash2 size={14} />
                    </button>
                  ) : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => setLines((prev) => [...prev, newLine()])}
          className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-700 hover:bg-zinc-50"
        >
          <Plus size={14} /> Ajouter une ligne
        </button>
        <p className="text-sm font-semibold tabular-nums text-zinc-900">
          Total : {formatMoney(total, 'USD')}
        </p>
        <button
          type="submit"
          disabled={createBatch.isPending}
          className="rounded-xl bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50"
        >
          {createBatch.isPending ? 'Enregistrement…' : 'Enregistrer les lignes'}
        </button>
      </div>
      <p className="text-[11px] text-zinc-400">
        Une ligne = une charge, un montant. Le n° de preuve (pièce, reçu, bordereau) est optionnel.
        Seules les dépenses comptabilisées figurent dans le rapport.
      </p>
    </form>
  )
}
