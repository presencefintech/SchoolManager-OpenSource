'use client'

import { useState, useEffect } from 'react'
import { X } from 'lucide-react'
import { useStudents } from '@/lib/hooks/use-admin'
import type { StudentListItem } from '@/types/admin'

interface Props {
  studentIds: number[]
  onSelect: (ids: number[]) => void
  label?: string
  required?: boolean
}

export function StudentMultiSelect({ studentIds, onSelect, label = 'Élèves', required }: Props) {
  const [query, setQuery] = useState('')
  const [debounced, setDebounced] = useState('')
  const [selected, setSelected] = useState<StudentListItem[]>([])

  useEffect(() => {
    const t = setTimeout(() => setDebounced(query.trim()), 350)
    return () => clearTimeout(t)
  }, [query])

  const { data, isFetching } = useStudents(
    debounced.length >= 2 ? { search: debounced, limit: 15 } : undefined,
  )
  const results = (data?.data ?? []).filter((s) => !studentIds.includes(s.id))

  function pick(student: StudentListItem) {
    const next = [...selected, student]
    setSelected(next)
    onSelect(next.map((s) => s.id))
    setQuery('')
    setDebounced('')
  }

  function remove(id: number) {
    const next = selected.filter((s) => s.id !== id)
    setSelected(next)
    onSelect(next.map((s) => s.id))
  }

  return (
    <div className="space-y-1.5">
      <label className="block text-xs font-medium text-zinc-500">
        {label}{required && ' *'}
      </label>

      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1.5 p-2 rounded-lg border border-zinc-200 bg-zinc-50 min-h-[38px]">
          {selected.map((s) => (
            <span
              key={s.id}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-xs font-medium"
            >
              {s.firstName} {s.lastName}
              <button type="button" onClick={() => remove(s.id)} className="hover:text-emerald-600">
                <X size={11} />
              </button>
            </span>
          ))}
        </div>
      )}

      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Rechercher et ajouter un élève…"
        className="w-full px-3 py-2 rounded-lg border border-zinc-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
      />

      {debounced.length >= 2 && (
        <div className="max-h-40 overflow-y-auto rounded-lg border border-zinc-200 bg-white divide-y divide-zinc-100 shadow-sm">
          {isFetching ? (
            <p className="px-3 py-2 text-xs text-zinc-400">Recherche…</p>
          ) : results.length ? (
            results.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => pick(s)}
                className="w-full text-left px-3 py-2 text-sm hover:bg-zinc-50"
              >
                <span className="font-medium text-zinc-900">{s.firstName} {s.lastName}</span>
                {s.matricule && <span className="text-zinc-400 ml-1">({s.matricule})</span>}
                {s.className && <span className="block text-xs text-zinc-400">{s.className}</span>}
              </button>
            ))
          ) : (
            <p className="px-3 py-2 text-xs text-zinc-400">Aucun élève trouvé</p>
          )}
        </div>
      )}

      {selected.length === 0 && (
        <p className="text-xs text-zinc-400">Aucun élève sélectionné</p>
      )}
    </div>
  )
}
