'use client'

import { useEffect, useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Search, X, Loader2 } from 'lucide-react'
import { studentsApi } from '@/lib/superAdmin/api/students.api'
import { useSchools } from '@/lib/hooks/use-super-admin'
import { cn } from '@/lib/utils'

interface StudentPickerProps {
  /** Student id as string (matches the surrounding form's useState<string> pattern), '' if none selected. */
  value: string
  onChange: (value: string) => void
  /** If provided, the school selector is hidden and students are searched within this school only. */
  schoolId?: number | null
  placeholder?: string
  className?: string
  disabled?: boolean
}

/** Searchable élève picker — replaces raw "ID élève" number inputs across SuperAdmin. */
export function StudentPicker({
  value, onChange, schoolId: schoolIdProp, placeholder = 'Rechercher un élève…', className, disabled,
}: StudentPickerProps) {
  const showSchoolSelect = schoolIdProp === undefined
  const [internalSchoolId, setInternalSchoolId] = useState<number | null>(null)
  const schoolId = showSchoolSelect ? internalSchoolId : (schoolIdProp ?? null)

  const { data: schools } = useSchools()
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const { data, isFetching } = useQuery({
    queryKey: ['student-picker', schoolId, query],
    queryFn: () => studentsApi.listStudents(schoolId as number, { search: query || undefined, limit: 20 }),
    enabled: Boolean(schoolId) && open,
  })
  const students = data?.data ?? []
  const selected = students.find((s) => String(s.id) === value)

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [])

  const clear = () => { onChange(''); setQuery('') }

  return (
    <div ref={containerRef} className={cn('relative flex gap-2', className)}>
      {showSchoolSelect && (
        <select
          value={internalSchoolId ?? ''}
          onChange={(e) => { setInternalSchoolId(e.target.value ? Number(e.target.value) : null); clear() }}
          disabled={disabled}
          className="border border-zinc-200 rounded-xl px-2.5 py-2 text-xs text-zinc-600 bg-white focus:outline-none focus:ring-2 focus:ring-zinc-200 max-w-[9.5rem] flex-shrink-0"
        >
          <option value="">École…</option>
          {schools?.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
      )}

      <div className="relative flex-1 min-w-0">
        {value && selected ? (
          <div className="flex items-center justify-between gap-2 border border-zinc-200 rounded-xl px-3 py-2 text-sm bg-zinc-50">
            <span className="truncate">
              {selected.firstName} {selected.lastName}
              {selected.matricule && <span className="text-zinc-400 font-mono text-xs ml-1.5">· {selected.matricule}</span>}
            </span>
            <button type="button" onClick={clear} className="text-zinc-300 hover:text-zinc-500 flex-shrink-0">
              <X size={13} />
            </button>
          </div>
        ) : value ? (
          <div className="flex items-center justify-between gap-2 border border-zinc-200 rounded-xl px-3 py-2 text-sm bg-zinc-50">
            <span className="font-mono text-zinc-600">Élève #{value}</span>
            <button type="button" onClick={clear} className="text-zinc-300 hover:text-zinc-500 flex-shrink-0">
              <X size={13} />
            </button>
          </div>
        ) : (
          <>
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-300 pointer-events-none" />
            <input
              type="text"
              disabled={disabled || !schoolId}
              placeholder={!schoolId && showSchoolSelect ? "Choisir une école d'abord" : placeholder}
              value={query}
              onChange={(e) => { setQuery(e.target.value); setOpen(true) }}
              onFocus={() => schoolId && setOpen(true)}
              className="w-full border border-zinc-200 rounded-xl pl-8 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-200 disabled:bg-zinc-50 disabled:text-zinc-400"
            />
          </>
        )}

        {open && schoolId && !value && (
          <div className="absolute z-20 mt-1 w-full bg-white border border-zinc-200 rounded-xl shadow-lg max-h-56 overflow-y-auto">
            {isFetching ? (
              <div className="px-3 py-3 flex items-center gap-2 text-xs text-zinc-400">
                <Loader2 size={12} className="animate-spin" /> Recherche…
              </div>
            ) : students.length === 0 ? (
              <div className="px-3 py-3 text-xs text-zinc-400">Aucun élève trouvé</div>
            ) : (
              students.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => { onChange(String(s.id)); setQuery(''); setOpen(false) }}
                  className="w-full text-left px-3 py-2 text-xs hover:bg-zinc-50 flex items-center justify-between gap-2"
                >
                  <span className="truncate">{s.firstName} {s.lastName}</span>
                  <span className="text-zinc-400 font-mono text-[10px] flex-shrink-0">{s.matricule ?? `#${s.id}`}</span>
                </button>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  )
}
