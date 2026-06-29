'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Search, GraduationCap, UserPlus } from 'lucide-react'
import { useStudents } from '@/lib/hooks/use-admin'

export function AdminGlobalSearch() {
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [debounced, setDebounced] = useState('')
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => setDebounced(query.trim()), 300)
    return () => clearTimeout(t)
  }, [query])

  const { data } = useStudents(debounced.length >= 2 ? { search: debounced, limit: 8 } : undefined)
  const results = data?.data ?? []

  return (
    <div className="relative w-full max-w-md">
      <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
      <input
        type="search"
        value={query}
        onChange={(e) => { setQuery(e.target.value); setOpen(true) }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        placeholder="Rechercher élève (nom, matricule, classe)…"
        className="w-full pl-9 pr-3 py-2 rounded-xl border border-zinc-200 bg-zinc-50/80 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300 focus:bg-white"
      />
      {open && debounced.length >= 2 && (
        <div className="absolute top-full left-0 right-0 mt-1 rounded-xl border border-zinc-200 bg-white shadow-xl z-50 overflow-hidden">
          {results.length ? (
            <ul className="divide-y divide-zinc-50 max-h-64 overflow-y-auto">
              {results.map((s) => (
                <li key={s.id}>
                  <button
                    type="button"
                    className="w-full flex items-center gap-2 px-3 py-2.5 text-left hover:bg-zinc-50"
                    onMouseDown={() => {
                      router.push(`/admin/students/${s.id}`)
                      setQuery('')
                      setOpen(false)
                    }}
                  >
                    <GraduationCap size={14} className="text-emerald-600 flex-shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-zinc-900 truncate">{s.firstName} {s.lastName}</p>
                      <p className="text-[11px] text-zinc-400 truncate">{s.matricule ?? '—'} · {s.className ?? 'Sans classe'}</p>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="px-3 py-4 text-xs text-zinc-400 text-center">Aucun élève trouvé</p>
          )}
          <button
            type="button"
            className="w-full flex items-center gap-2 px-3 py-2 text-xs text-emerald-700 bg-emerald-50/80 hover:bg-emerald-50 border-t border-zinc-100"
            onMouseDown={() => {
              router.push(`/admin/enrollments?search=${encodeURIComponent(debounced)}`)
              setOpen(false)
            }}
          >
            <UserPlus size={12} /> Voir inscriptions « {debounced} »
          </button>
        </div>
      )}
    </div>
  )
}
