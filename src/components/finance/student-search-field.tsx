'use client'

import { useState, useEffect } from 'react'
import { Search } from 'lucide-react'
import { useFinanceStudentSearch } from '@/lib/hooks/use-finance'
import type { FinanceStudentResult } from '@/types/finance'
import { cn } from '@/lib/utils'

interface FinanceStudentSearchFieldProps {
  studentId: number
  onSelect: (id: number, student?: FinanceStudentResult) => void
  label?: string
  required?: boolean
  className?: string
}

export function FinanceStudentSearchField({
  studentId,
  onSelect,
  label = 'Élève',
  required,
  className,
}: FinanceStudentSearchFieldProps) {
  const [query, setQuery] = useState('')
  const [debounced, setDebounced] = useState('')
  const [selected, setSelected] = useState<FinanceStudentResult | null>(null)

  useEffect(() => {
    const t = setTimeout(() => setDebounced(query.trim()), 350)
    return () => clearTimeout(t)
  }, [query])

  const { data: results = [], isFetching } = useFinanceStudentSearch(debounced)

  function pick(s: FinanceStudentResult) {
    setSelected(s)
    onSelect(s.id, s)
    setQuery('')
    setDebounced('')
  }

  function clear() {
    setSelected(null)
    onSelect(0)
  }

  return (
    <div className={cn('space-y-1.5', className)}>
      <label className="block text-xs font-medium text-zinc-500">
        {label}
        {required && <span className="text-red-500"> *</span>}
      </label>
      {selected && studentId > 0 ? (
        <div className="flex items-center justify-between gap-2 rounded-xl border border-emerald-200 bg-emerald-50/80 px-3 py-2.5">
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-emerald-900">
              {selected.name}
              {selected.matricule ? ` · ${selected.matricule}` : ''}
            </p>
            {selected.className && (
              <p className="text-xs text-emerald-700/70">{selected.className}</p>
            )}
          </div>
          <button
            type="button"
            onClick={clear}
            className="shrink-0 text-xs font-medium text-emerald-700 hover:underline"
          >
            Changer
          </button>
        </div>
      ) : (
        <>
          <div className="relative">
            <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Nom, prénom ou matricule (min. 2 car.)"
              className="w-full rounded-xl border border-zinc-200 py-2.5 pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400/40"
            />
          </div>
          {debounced.length >= 2 && (
            <div className="max-h-44 overflow-y-auto rounded-xl border border-zinc-200 bg-white shadow-sm divide-y divide-zinc-100">
              {isFetching ? (
                <p className="px-3 py-2.5 text-xs text-zinc-400">Recherche…</p>
              ) : results.length ? (
                results.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => pick(s)}
                    className="w-full px-3 py-2.5 text-left text-sm transition-colors hover:bg-emerald-50/60"
                  >
                    <span className="font-medium text-zinc-900">{s.name}</span>
                    {s.matricule && (
                      <span className="ml-1.5 text-zinc-400">({s.matricule})</span>
                    )}
                    {s.className && (
                      <span className="mt-0.5 block text-xs text-zinc-400">{s.className}</span>
                    )}
                  </button>
                ))
              ) : (
                <p className="px-3 py-2.5 text-xs text-zinc-400">Aucun élève trouvé</p>
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}
