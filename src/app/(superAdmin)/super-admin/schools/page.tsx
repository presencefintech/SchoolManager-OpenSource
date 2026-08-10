'use client'

import { useEffect, useState } from 'react'
import { ChevronLeft, ChevronRight, Search } from 'lucide-react'
import { SchoolCard, SchoolCardSkeleton } from '@/components/ui/school-card'
import { useSchoolsPaginated } from '@/lib/hooks/use-super-admin'
import { useQueryLoading } from '@/lib/hooks/use-auth-query'
import { cn } from '@/lib/utils'

type StatusFilter = 'all' | 'active' | 'suspended'

const PAGE_SIZE = 12

export default function SchoolsPage() {
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [status, setStatus] = useState<StatusFilter>('all')
  const [page, setPage] = useState(1)

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300)
    return () => clearTimeout(t)
  }, [search])

  useEffect(() => {
    setPage(1)
  }, [debouncedSearch, status])

  const { data, isPending, isError, refetch, isFetching } = useSchoolsPaginated({
    page,
    take: PAGE_SIZE,
    q: debouncedSearch,
    status,
  })

  const schools = data?.rows ?? []
  const total = data?.total ?? 0
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))
  const loading = useQueryLoading(isPending && !data)

  return (
    <div className="max-w-7xl mx-auto px-6 py-8 space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Établissements</h1>
          <p className="text-sm text-slate-500 mt-1">
            {loading
              ? '—'
              : `${total} établissement${total > 1 ? 's' : ''}`}
            {!loading && status !== 'all'
              ? ` · filtre : ${status === 'active' ? 'actifs' : 'suspendus'}`
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
              placeholder="Rechercher…"
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

      <div
        className={cn(
          'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 transition-opacity',
          isFetching && !loading && 'opacity-70',
        )}
      >
        {loading ? (
          Array.from({ length: 6 }).map((_, i) => <SchoolCardSkeleton key={i} />)
        ) : schools.length > 0 ? (
          schools.map((school) => <SchoolCard key={school.id} school={school} />)
        ) : (
          <p className="col-span-3 text-center text-slate-500 py-12">Aucun établissement trouvé.</p>
        )}
      </div>

      {!loading && totalPages > 1 ? (
        <div className="flex items-center justify-between gap-4 pt-2">
          <p className="text-xs text-slate-500">
            Page {page} sur {totalPages}
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={page <= 1 || isFetching}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50 disabled:opacity-40"
            >
              <ChevronLeft size={14} /> Précédent
            </button>
            <button
              type="button"
              disabled={page >= totalPages || isFetching}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50 disabled:opacity-40"
            >
              Suivant <ChevronRight size={14} />
            </button>
          </div>
        </div>
      ) : null}
    </div>
  )
}
