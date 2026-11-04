'use client'

import { useEffect, useMemo, useState } from 'react'
import { PiggyBank, Plus, RefreshCw, Save } from 'lucide-react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { cn } from '@/lib/utils'
import { getApiErrorMessage } from '@/lib/api/client'
import { useAcademicSessions } from '@/lib/hooks/admin/enrollments'
import { financeBudgetApi } from '@/lib/admin/api/finance-budget.api'
import { useSchoolMoney } from '@/lib/finance/use-school-money'

function BudgetContent() {
  const { format: formatMoney } = useSchoolMoney()
  const qc = useQueryClient()
  const sessionsQuery = useAcademicSessions()
  const sessions = useMemo(() => sessionsQuery.data ?? [], [sessionsQuery.data])
  const [sessionId, setSessionId] = useState<number | null>(null)
  const [draft, setDraft] = useState<Record<string, number>>({})
  const [newCategory, setNewCategory] = useState('')
  const [err, setErr] = useState('')

  useEffect(() => {
    if (sessionId == null && sessions.length > 0) {
      setSessionId(sessions.find((s) => s.isCurrent)?.id ?? sessions[0].id)
    }
  }, [sessions, sessionId])

  const categoriesQuery = useQuery({
    queryKey: ['admin', 'finance', 'budget-categories'],
    queryFn: () => financeBudgetApi.listCategories(),
    staleTime: 60_000,
  })

  const gridQuery = useQuery({
    queryKey: ['admin', 'finance', 'budget', sessionId],
    queryFn: () => financeBudgetApi.getBudget(sessionId!),
    enabled: sessionId != null,
    staleTime: 20_000,
  })

  const createCategoryMut = useMutation({
    mutationFn: (name: string) => financeBudgetApi.createCategory(name),
    onSuccess: () => {
      setNewCategory('')
      qc.invalidateQueries({ queryKey: ['admin', 'finance', 'budget-categories'] })
      qc.invalidateQueries({ queryKey: ['admin', 'finance', 'budget'] })
    },
  })

  const saveMut = useMutation({
    mutationFn: (lines: Array<{ categoryId: number; monthYear: string; plannedAmount: number }>) =>
      financeBudgetApi.upsertLines(sessionId!, lines),
    onSuccess: () => {
      setDraft({})
      qc.invalidateQueries({ queryKey: ['admin', 'finance', 'budget', sessionId] })
      qc.invalidateQueries({ queryKey: ['admin', 'finance', 'budget', 'variance'] })
    },
  })

  const grid = gridQuery.data
  const dirtyCount = Object.keys(draft).length

  function cellValue(categoryId: number, monthYear: string): number {
    const key = `${categoryId}:${monthYear}`
    if (key in draft) return draft[key]
    const cat = grid?.categories.find((c) => c.id === categoryId)
    return cat?.lines.find((l) => l.monthYear === monthYear)?.plannedAmount ?? 0
  }

  function setCellValue(categoryId: number, monthYear: string, value: number) {
    setDraft((d) => ({ ...d, [`${categoryId}:${monthYear}`]: value }))
  }

  async function handleSave() {
    setErr('')
    const lines = Object.entries(draft).map(([key, plannedAmount]) => {
      const [categoryId, monthYear] = key.split(':')
      return { categoryId: Number(categoryId), monthYear, plannedAmount }
    })
    try {
      await saveMut.mutateAsync(lines)
    } catch (error) {
      setErr(getApiErrorMessage(error))
    }
  }

  async function handleCreateCategory(e: React.FormEvent) {
    e.preventDefault()
    if (!newCategory.trim()) return
    try {
      await createCategoryMut.mutateAsync(newCategory.trim())
    } catch (error) {
      setErr(getApiErrorMessage(error))
    }
  }

  const monthTotals = useMemo(() => {
    if (!grid) return {}
    const totals: Record<string, number> = {}
    for (const month of grid.months) {
      totals[month] = grid.categories.reduce((sum, c) => sum + cellValue(c.id, month), 0)
    }
    return totals
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [grid, draft])

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-emerald-700 mb-1">
            <PiggyBank size={18} />
            <span className="text-xs font-semibold uppercase tracking-wide">Budget prévisionnel</span>
          </div>
          <h1 className="text-xl font-bold text-zinc-900">Dépenses planifiées par catégorie et par mois</h1>
          <p className="text-sm text-zinc-500 mt-0.5">
            Document vivant — modifiable à tout moment. Finance suit l&apos;écart prévu/réel en lecture seule.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={sessionId ?? ''}
            onChange={(e) => setSessionId(e.target.value ? Number(e.target.value) : null)}
            className="px-3 py-2 text-sm border border-zinc-200 rounded-xl bg-white"
          >
            {sessions.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
                {s.isCurrent ? ' (en cours)' : ''}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => gridQuery.refetch()}
            className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-600 hover:bg-zinc-50"
          >
            <RefreshCw size={14} className={cn(gridQuery.isFetching && 'animate-spin')} />
            Actualiser
          </button>
          <button
            type="button"
            disabled={dirtyCount === 0 || saveMut.isPending}
            onClick={handleSave}
            className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
          >
            <Save size={14} />
            {saveMut.isPending ? 'Sauvegarde…' : dirtyCount > 0 ? `Sauvegarder (${dirtyCount})` : 'Sauvegardé'}
          </button>
        </div>
      </div>

      {err && <p className="text-sm text-red-600 bg-red-50 rounded-xl px-4 py-2">{err}</p>}

      <form onSubmit={handleCreateCategory} className="flex items-center gap-2">
        <input
          value={newCategory}
          onChange={(e) => setNewCategory(e.target.value)}
          placeholder="Nouvelle catégorie (ex. Loyer, Salaires, Fournitures…)"
          className="px-3 py-2 text-sm border border-zinc-200 rounded-xl w-72"
        />
        <button
          type="submit"
          disabled={!newCategory.trim() || createCategoryMut.isPending}
          className="inline-flex items-center gap-1.5 px-3 py-2 text-sm rounded-xl border border-zinc-200 bg-white hover:bg-zinc-50 disabled:opacity-50"
        >
          <Plus size={14} /> Ajouter
        </button>
      </form>

      <div className="rounded-2xl border border-zinc-200 bg-white overflow-hidden">
        {gridQuery.isLoading || sessionId == null ? (
          <div className="p-8 text-center text-sm text-zinc-400">Chargement…</div>
        ) : !grid || grid.categories.length === 0 ? (
          <div className="p-8 text-center text-sm text-zinc-400">
            Ajoutez une catégorie budgétaire ci-dessus pour commencer.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-100 bg-zinc-50/80">
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-zinc-400">
                    Catégorie
                  </th>
                  {grid.months.map((m) => (
                    <th key={m} className="px-3 py-3 text-right text-xs font-semibold uppercase tracking-wide text-zinc-400">
                      {m}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-50">
                {grid.categories.map((cat) => (
                  <tr key={cat.id}>
                    <td className="px-4 py-2 text-zinc-800 font-medium whitespace-nowrap">{cat.name}</td>
                    {grid.months.map((m) => (
                      <td key={m} className="px-2 py-2">
                        <input
                          type="number"
                          min={0}
                          step="0.01"
                          value={cellValue(cat.id, m) || ''}
                          onChange={(e) => setCellValue(cat.id, m, Number(e.target.value) || 0)}
                          className="w-24 px-2 py-1.5 text-right text-sm border border-zinc-200 rounded-lg"
                        />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t border-zinc-200 bg-zinc-50/60">
                  <td className="px-4 py-2 text-xs font-semibold text-zinc-500">Total / mois</td>
                  {grid.months.map((m) => (
                    <td key={m} className="px-3 py-2 text-right text-xs font-semibold text-zinc-600 tabular-nums">
                      {formatMoney(monthTotals[m] ?? 0)}
                    </td>
                  ))}
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

export default function AdminFinanceBudgetPage() {
  return (
    <div className="p-6 max-w-7xl mx-auto">
      <BudgetContent />
    </div>
  )
}
