'use client'

import { useState } from 'react'
import { Search } from 'lucide-react'
import { SchoolCard, SchoolCardSkeleton } from '@/components/ui/school-card'
import { useSchools } from '@/lib/hooks/use-super-admin'
import { useQueryLoading } from '@/lib/hooks/use-auth-query'

export default function SchoolsPage() {
  const { data: schools, isPending, isError, refetch } = useSchools()
  const [search, setSearch] = useState('')

  const filtered = schools?.filter((s) =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.city.toLowerCase().includes(search.toLowerCase())
  ) ?? []

  const loading = useQueryLoading(isPending)

  return (
    <div className="max-w-7xl mx-auto px-6 py-8 space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Établissements</h1>
          <p className="text-sm text-slate-500 mt-1">
            {loading ? '—' : `${schools?.length ?? 0} établissement${(schools?.length ?? 0) > 1 ? 's' : ''}`}
          </p>
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

      {isError && !loading && (
        <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-600 flex items-center justify-between">
          <span>Impossible de charger les établissements.</span>
          <button type="button" onClick={() => refetch()} className="font-medium underline">Réessayer</button>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? (
          Array.from({ length: 6 }).map((_, i) => <SchoolCardSkeleton key={i} />)
        ) : filtered.length > 0 ? (
          filtered.map((school) => (
            <SchoolCard key={school.id} school={school} />
          ))
        ) : (
          <p className="col-span-3 text-center text-slate-500 py-12">Aucun établissement trouvé.</p>
        )}
      </div>
    </div>
  )
}
