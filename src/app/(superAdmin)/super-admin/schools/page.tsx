'use client'

import { useState } from 'react'
import { Search } from 'lucide-react'
import { SchoolCard, SchoolCardSkeleton } from '@/components/ui/school-card'
import { useSchools } from '@/lib/hooks/use-super-admin'
import { useQueryLoading } from '@/lib/hooks/use-auth-query'
import { cn } from '@/lib/utils'

type StatusFilter = 'all' | 'active' | 'suspended'

export default function SchoolsPage() {
  const { data: schools, isPending, isError, refetch } = useSchools()
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<StatusFilter>('all')

  const filtered =
    schools?.filter((s) => {
      const q = search.toLowerCase()
      const matchesSearch =
        s.name.toLowerCase().includes(q) || (s.city ?? '').toLowerCase().includes(q)
      if (!matchesSearch) return false
      if (status === 'active') return s.active !== false
      if (status === 'suspended') return s.active === false
      return true
    }) ?? []

  const loading = useQueryLoading(isPending)
  const suspendedCount = schools?.filter((s) => s.active === false).length ?? 0

  return (
    <div className="max-w-7xl mx-auto px-6 py-8 space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Établissements</h1>
          <p className="text-sm text-slate-500 mt-1">
            {loading
              ? '—'
              : `${schools?.length ?? 0} établissement${(schools?.length ?? 0) > 1 ? 's' : ''}`}
            {!loading && suspendedCount > 0
              ? ` · ${suspendedCount} suspendu${suspendedCount > 1 ? 's' : ''}`
              : ''}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex gap-1 rounded-lg border border-slate-200 bg-white p-1">
            {(
              [
                ['all', 'Tous'],
                ['active', 'Actifs'],
                ['suspended', 'Suspendus'],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => setStatus(id)}
                className={cn(
                  'rounded-md px-3 py-1.5 text-xs font-medium',
                  status === id ? 'bg-indigo-600 text-white' : 'text-slate-600 hover:bg-slate-50',
                )}
              >
                {label}
              </button>
            ))}
          </div>
          <div className="relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Rechercher..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 pr-4 py-2 text-sm rounded-lg border border-slate-300 bg-white outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 w-56"
            />
          </div>
        </div>
      </div>

      {isError && !loading && (
        <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-600 flex items-center justify-between">
          <span>Impossible de charger les établissements.</span>
          <button type="button" onClick={() => refetch()} className="font-medium underline">
            Réessayer
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? (
          Array.from({ length: 6 }).map((_, i) => <SchoolCardSkeleton key={i} />)
        ) : filtered.length > 0 ? (
          filtered.map((school) => <SchoolCard key={school.id} school={school} />)
        ) : (
          <p className="col-span-3 text-center text-slate-500 py-12">Aucun établissement trouvé.</p>
        )}
      </div>
    </div>
  )
}
