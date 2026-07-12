'use client'

import { useState, useEffect } from 'react'
import { useStudents } from '@/lib/hooks/use-admin'
import type { StudentListItem } from '@/types/admin'
import { formatStudentFullName } from '@/lib/utils/student-name.util'

interface Props {
  studentId: number
  onSelect: (id: number) => void
  label?: string
  required?: boolean
}

export function StudentSearchField({ studentId, onSelect, label = 'Élève', required }: Props) {
  const [query, setQuery] = useState('')
  const [debounced, setDebounced] = useState('')
  const [selected, setSelected] = useState<StudentListItem | null>(null)

  useEffect(() => {
    const t = setTimeout(() => setDebounced(query.trim()), 350)
    return () => clearTimeout(t)
  }, [query])

  const { data, isFetching } = useStudents(
    debounced.length >= 2 ? { search: debounced, limit: 15 } : undefined,
  )
  const results = data?.data ?? []
  const display = selected ?? (studentId > 0 ? results.find((s) => s.id === studentId) : null)

  function pick(student: StudentListItem) {
    setSelected(student)
    onSelect(student.id)
    setQuery('')
    setDebounced('')
  }

  function clear() {
    setSelected(null)
    onSelect(0)
  }

  return (
    <div className="space-y-1.5">
      <label className="block text-xs font-medium text-zinc-500">
        {label}{required && ' *'}
      </label>
      {display && studentId > 0 ? (
        <div className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg border border-emerald-200 bg-emerald-50/80">
          <div className="min-w-0">
            <p className="text-sm text-emerald-900 truncate">
              {formatStudentFullName(display)}
              {display.matricule ? ` · ${display.matricule}` : ''}
            </p>
            {display.className && (
              <p className="text-xs text-emerald-700/70">{display.className}</p>
            )}
          </div>
          <button type="button" onClick={clear} className="text-xs text-emerald-700 hover:underline flex-shrink-0">
            Changer
          </button>
        </div>
      ) : (
        <>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Nom, prénom ou matricule (min. 2 car.)"
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
                    <span className="font-medium text-zinc-900">{formatStudentFullName(s)}</span>
                    {s.matricule && <span className="text-zinc-400 ml-1">({s.matricule})</span>}
                    {s.className && <span className="block text-xs text-zinc-400">{s.className}</span>}
                  </button>
                ))
              ) : (
                <p className="px-3 py-2 text-xs text-zinc-400">Aucun élève trouvé</p>
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}
