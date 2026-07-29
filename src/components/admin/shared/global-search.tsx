'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Search, GraduationCap, UserPlus, BookOpen, SlidersHorizontal } from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatStudentFullName } from '@/lib/utils/student-name.util'
import { useStudents } from '@/lib/hooks/use-admin'

const QUICK_STATUS = [
  { value: '', label: 'Tous' },
  { value: 'ACTIVE', label: 'Actifs' },
  { value: 'PRE_ENROLL', label: 'Pré-inscrits' },
] as const

export function AdminGlobalSearch() {
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [debounced, setDebounced] = useState('')
  const [status, setStatus] = useState('')
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => setDebounced(query.trim()), 300)
    return () => clearTimeout(t)
  }, [query])

  const searchEnabled = debounced.length >= 2
  const { data } = useStudents(
    searchEnabled ? { search: debounced, limit: 8, status: status || undefined } : undefined,
    { enabled: searchEnabled },
  )
  const results = data?.data ?? []

  return (
    <div className="relative w-full max-w-xl">
      <div className="flex items-center gap-2 rounded-xl border border-zinc-200 bg-white px-3 py-1.5 shadow-sm focus-within:ring-2 focus-within:ring-emerald-400/30 focus-within:border-emerald-400">
        <Search size={15} className="text-zinc-400 flex-shrink-0" />
        <input
          type="search"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            setOpen(true)
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          placeholder="Recherche rapide — élève, matricule, classe…"
          className="flex-1 min-w-0 py-1.5 text-sm bg-transparent focus:outline-none"
        />
        <span className="hidden sm:inline-flex items-center gap-1 text-[10px] font-medium text-zinc-400 border border-zinc-200 rounded px-1.5 py-0.5">
          <SlidersHorizontal size={10} />
          multicritères
        </span>
      </div>

      {open && debounced.length >= 2 && (
        <div className="absolute top-full left-0 right-0 mt-1.5 rounded-xl border border-zinc-200 bg-white shadow-xl z-50 overflow-hidden">
          <div className="flex items-center gap-1 px-3 py-2 border-b border-zinc-100 bg-zinc-50/80">
            {QUICK_STATUS.map(({ value, label }) => (
              <button
                key={value || 'all'}
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => setStatus(value)}
                className={cn(
                  'px-2.5 py-1 rounded-lg text-[11px] font-medium transition-colors',
                  status === value
                    ? 'bg-emerald-600 text-white'
                    : 'text-zinc-500 hover:bg-white hover:text-zinc-700',
                )}
              >
                {label}
              </button>
            ))}
          </div>

          {results.length ? (
            <ul className="divide-y divide-zinc-50 max-h-64 overflow-y-auto">
              {results.map((s) => (
                <li key={s.id}>
                  <button
                    type="button"
                    className="w-full flex items-center gap-2.5 px-3 py-2.5 text-left hover:bg-emerald-50/50"
                    onMouseDown={() => {
                      router.push(`/admin/students/${s.id}`)
                      setQuery('')
                      setOpen(false)
                    }}
                  >
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 flex-shrink-0">
                      <GraduationCap size={14} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-zinc-900 truncate">
                        {formatStudentFullName(s)}
                      </p>
                      <p className="text-[11px] text-zinc-400 truncate">
                        {s.matricule ?? '—'} · {s.className ?? 'Sans classe'}
                      </p>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="px-3 py-4 text-xs text-zinc-400 text-center">Aucun élève trouvé</p>
          )}

          <div className="grid grid-cols-2 border-t border-zinc-100">
            <button
              type="button"
              className="flex items-center justify-center gap-1.5 px-3 py-2.5 text-xs font-medium text-emerald-700 hover:bg-emerald-50/80 border-r border-zinc-100"
              onMouseDown={() => {
                router.push(`/admin/enrollments?search=${encodeURIComponent(debounced)}`)
                setOpen(false)
              }}
            >
              <UserPlus size={12} />
              Inscriptions
            </button>
            <button
              type="button"
              className="flex items-center justify-center gap-1.5 px-3 py-2.5 text-xs font-medium text-emerald-700 hover:bg-emerald-50/80"
              onMouseDown={() => {
                router.push('/admin/classes')
                setOpen(false)
              }}
            >
              <BookOpen size={12} />
              Classes
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
