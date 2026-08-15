'use client'

import { useEffect, useRef, useState } from 'react'
import { Check, ChevronDown, Loader2, X } from 'lucide-react'
import { useStudents } from '@/lib/hooks/use-admin'
import type { StudentListItem } from '@/types/admin'
import { formatStudentFullName } from '@/lib/utils/student-name.util'
import { cn } from '@/lib/utils'

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
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const t = setTimeout(() => setDebounced(query.trim()), 350)
    return () => clearTimeout(t)
  }, [query])

  const { data, isFetching } = useStudents(
    { search: debounced || undefined, limit: 20 },
    { enabled: open },
  )
  const results = data?.data ?? []

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false)
    }
    function onEscape(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onClickOutside)
    document.addEventListener('keydown', onEscape)
    return () => {
      document.removeEventListener('mousedown', onClickOutside)
      document.removeEventListener('keydown', onEscape)
    }
  }, [])

  function toggle(student: StudentListItem) {
    const isSelected = studentIds.includes(student.id)
    const next = isSelected
      ? selected.filter((s) => s.id !== student.id)
      : [...selected, student]
    setSelected(next)
    onSelect(next.map((s) => s.id))
  }

  function remove(id: number) {
    const next = selected.filter((s) => s.id !== id)
    setSelected(next)
    onSelect(next.map((s) => s.id))
  }

  const allVisibleSelected = results.length > 0 && results.every((s) => studentIds.includes(s.id))

  function toggleAllVisible() {
    if (allVisibleSelected) {
      const visibleIds = new Set(results.map((s) => s.id))
      const next = selected.filter((s) => !visibleIds.has(s.id))
      setSelected(next)
      onSelect(next.map((s) => s.id))
      return
    }
    const nextMap = new Map(selected.map((s) => [s.id, s]))
    for (const s of results) nextMap.set(s.id, s)
    const next = Array.from(nextMap.values())
    setSelected(next)
    onSelect(next.map((s) => s.id))
  }

  return (
    <div ref={containerRef} className="relative space-y-1.5">
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
              {formatStudentFullName(s)}
              <button type="button" onClick={() => remove(s.id)} className="hover:text-emerald-600">
                <X size={11} />
              </button>
            </span>
          ))}
        </div>
      )}

      <div className="relative">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setOpen(true)}
          placeholder="Rechercher ou parcourir la liste…"
          className="w-full px-3 py-2 pr-8 rounded-lg border border-zinc-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
        />
        <ChevronDown
          size={14}
          className={cn(
            'absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-300 pointer-events-none transition-transform',
            open && 'rotate-180',
          )}
        />
      </div>

      {open && (
        <div className="absolute z-20 mt-1 w-full rounded-lg border border-zinc-200 bg-white shadow-lg overflow-hidden">
          {results.length > 0 && (
            <button
              type="button"
              onClick={toggleAllVisible}
              className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-emerald-700 hover:bg-emerald-50 border-b border-zinc-100"
            >
              <span className={cn(
                'flex h-4 w-4 flex-shrink-0 items-center justify-center rounded border',
                allVisibleSelected ? 'bg-emerald-600 border-emerald-600 text-white' : 'border-zinc-300',
              )}>
                {allVisibleSelected && <Check size={11} />}
              </span>
              {allVisibleSelected ? 'Tout désélectionner' : 'Tout sélectionner'}
            </button>
          )}

          <div className="max-h-52 overflow-y-auto divide-y divide-zinc-100">
            {isFetching ? (
              <p className="px-3 py-3 flex items-center gap-2 text-xs text-zinc-400">
                <Loader2 size={12} className="animate-spin" /> Recherche…
              </p>
            ) : results.length ? (
              results.map((s) => {
                const isSelected = studentIds.includes(s.id)
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => toggle(s)}
                    className="w-full flex items-center gap-2.5 text-left px-3 py-2 text-sm hover:bg-zinc-50"
                  >
                    <span className={cn(
                      'flex h-4 w-4 flex-shrink-0 items-center justify-center rounded border',
                      isSelected ? 'bg-emerald-600 border-emerald-600 text-white' : 'border-zinc-300',
                    )}>
                      {isSelected && <Check size={11} />}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="font-medium text-zinc-900">{formatStudentFullName(s)}</span>
                      {s.matricule && <span className="text-zinc-400 ml-1">({s.matricule})</span>}
                      {s.className && <span className="block text-xs text-zinc-400">{s.className}</span>}
                    </span>
                  </button>
                )
              })
            ) : (
              <p className="px-3 py-3 text-xs text-zinc-400">Aucun élève trouvé</p>
            )}
          </div>
        </div>
      )}

      {selected.length === 0 && (
        <p className="text-xs text-zinc-400">Aucun élève sélectionné</p>
      )}
    </div>
  )
}
