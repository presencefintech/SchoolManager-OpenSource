'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  ChevronLeft,
  ChevronRight,
  LayoutGrid,
  Plus,
  Search,
  Settings2,
  Table2,
} from 'lucide-react'
import { SchoolCard, SchoolCardSkeleton } from '@/components/ui/school-card'
import {
  CapacityBar,
  SchoolSaasDrawer,
  StatusBadge,
  ThemeToggle,
} from '@/components/super-admin/school-saas-drawer'
import { useSchoolsPaginated } from '@/lib/hooks/use-super-admin'
import { useQueryLoading } from '@/lib/hooks/use-auth-query'
import { cn } from '@/lib/utils'
import type { School } from '@/types/super-admin'

const PAGE_SIZE = 12
const THEME_KEY = 'saas-schools-theme'

type StatusFilter = string

export default function SchoolsPage() {
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [status, setStatus] = useState<StatusFilter>('all')
  const [page, setPage] = useState(1)
  const [view, setView] = useState<'table' | 'cards'>('table')
  const [selected, setSelected] = useState<School | null>(null)
  const [dark, setDark] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300)
    return () => clearTimeout(t)
  }, [search])

  useEffect(() => {
    setPage(1)
  }, [debouncedSearch, status])

  useEffect(() => {
    const saved = localStorage.getItem(THEME_KEY)
    if (saved === 'dark') setDark(true)
  }, [])

  function toggleTheme() {
    setDark((d) => {
      const next = !d
      localStorage.setItem(THEME_KEY, next ? 'dark' : 'light')
      return next
    })
  }

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
    <div className={cn(dark && 'dark')}>
      <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-zinc-950 dark:text-zinc-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Établissements SaaS</h1>
              <p className="text-sm text-slate-500 dark:text-zinc-400 mt-1">
                {loading ? '—' : `${total} école${total > 1 ? 's' : ''}`} · pilotage contrat & modules
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Link
                href="/super-admin/schools/onboard"
                className="inline-flex items-center gap-1.5 rounded-lg bg-zinc-900 px-3 py-2 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-100"
              >
                <Plus size={15} />
                Nouvelle école
              </Link>
              <ThemeToggle dark={dark} onToggle={toggleTheme} />
              <div className="flex gap-1 rounded-lg border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 p-1">
                <button
                  type="button"
                  onClick={() => setView('table')}
                  className={cn(
                    'rounded-md p-1.5',
                    view === 'table' ? 'bg-indigo-600 text-white' : 'text-slate-500',
                  )}
                >
                  <Table2 size={16} />
                </button>
                <button
                  type="button"
                  onClick={() => setView('cards')}
                  className={cn(
                    'rounded-md p-1.5',
                    view === 'cards' ? 'bg-indigo-600 text-white' : 'text-slate-500',
                  )}
                >
                  <LayoutGrid size={16} />
                </button>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex flex-wrap gap-1 rounded-lg border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 p-1">
              {(
                [
                  ['all', 'Tous'],
                  ['ACTIVE', 'Actifs'],
                  ['SUSPENDED', 'Suspendus'],
                  ['PENDING', 'Pending'],
                  ['EXPIRED', 'Expirés'],
                ] as const
              ).map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setStatus(id)}
                  className={cn(
                    'rounded-md px-3 py-1.5 text-xs font-medium',
                    status === id
                      ? 'bg-indigo-600 text-white'
                      : 'text-slate-600 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-zinc-800',
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
            <div className="relative grow sm:grow-0">
              <Search
                size={15}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                type="text"
                placeholder="Rechercher…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 pr-4 py-2 text-sm rounded-lg border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 outline-none focus:ring-2 focus:ring-indigo-500/30 w-full sm:w-56"
              />
            </div>
          </div>

          {isError && !loading && (
            <div className="rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 px-4 py-3 text-sm text-red-600 flex items-center justify-between">
              <span>Impossible de charger les établissements.</span>
              <button type="button" onClick={() => refetch()} className="font-medium underline">
                Réessayer
              </button>
            </div>
          )}

          {view === 'table' ? (
            <div
              className={cn(
                'overflow-x-auto rounded-2xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm',
                isFetching && !loading && 'opacity-70',
              )}
            >
              <table className="min-w-full text-sm">
                <thead className="bg-slate-50 dark:bg-zinc-950/80 text-left text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-4 py-3 font-medium">École</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium">Expiration</th>
                    <th className="px-4 py-3 font-medium">Élèves</th>
                    <th className="px-4 py-3 font-medium">Tier</th>
                    <th className="px-4 py-3 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loading
                    ? Array.from({ length: 6 }).map((_, i) => (
                        <tr key={i} className="border-t border-slate-100 dark:border-zinc-800">
                          <td colSpan={6} className="px-4 py-4">
                            <div className="h-8 animate-pulse rounded bg-slate-100 dark:bg-zinc-800" />
                          </td>
                        </tr>
                      ))
                    : schools.map((school) => {
                        const count = school.studentCount ?? school._count.students
                        return (
                          <tr
                            key={school.id}
                            className="border-t border-slate-100 dark:border-zinc-800 hover:bg-slate-50/80 dark:hover:bg-zinc-800/40"
                          >
                            <td className="px-4 py-3">
                              <p className="font-medium">{school.name}</p>
                              <p className="text-xs text-slate-500">{school.city || '—'}</p>
                            </td>
                            <td className="px-4 py-3">
                              <StatusBadge
                                status={school.status ?? (school.active ? 'ACTIVE' : 'SUSPENDED')}
                              />
                            </td>
                            <td className="px-4 py-3 text-xs text-slate-600 dark:text-zinc-300">
                              {school.contractExpiry
                                ? new Date(school.contractExpiry).toLocaleDateString('fr-FR')
                                : '—'}
                            </td>
                            <td className="px-4 py-3 min-w-[140px]">
                              <CapacityBar count={count} capacity={school.studentCapacity} />
                            </td>
                            <td className="px-4 py-3 text-xs font-mono">
                              {school.subscriptionTier ?? 'BASIC'}
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => setSelected(school)}
                                  className="inline-flex items-center gap-1 rounded-lg bg-indigo-600 px-2.5 py-1.5 text-xs font-medium text-white"
                                >
                                  <Settings2 size={13} /> Contrôler
                                </button>
                                <Link
                                  href={`/super-admin/schools/${school.id}`}
                                  className="text-xs text-indigo-600 dark:text-indigo-400 underline"
                                >
                                  Fiche
                                </Link>
                              </div>
                            </td>
                          </tr>
                        )
                      })}
                  {!loading && schools.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-12 text-center text-slate-500">
                        Aucun établissement trouvé.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          ) : (
            <div
              className={cn(
                'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4',
                isFetching && !loading && 'opacity-70',
              )}
            >
              {loading ? (
                Array.from({ length: 6 }).map((_, i) => <SchoolCardSkeleton key={i} />)
              ) : schools.length > 0 ? (
                schools.map((school) => (
                  <div key={school.id} className="relative">
                    <SchoolCard school={school} />
                    <button
                      type="button"
                      onClick={() => setSelected(school)}
                      className="absolute top-3 right-3 rounded-lg bg-white/95 dark:bg-zinc-900 border px-2 py-1 text-[11px] font-medium shadow"
                    >
                      Contrôler
                    </button>
                  </div>
                ))
              ) : (
                <p className="col-span-3 text-center text-slate-500 py-12">Aucun établissement trouvé.</p>
              )}
            </div>
          )}

          {!loading && totalPages > 1 ? (
            <div className="flex items-center justify-between gap-4 pt-2">
              <p className="text-xs text-slate-500">
                Page {page} sur {totalPages}
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="inline-flex items-center gap-1 rounded-lg border px-3 py-1.5 text-xs disabled:opacity-40"
                >
                  <ChevronLeft size={14} /> Préc.
                </button>
                <button
                  type="button"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  className="inline-flex items-center gap-1 rounded-lg border px-3 py-1.5 text-xs disabled:opacity-40"
                >
                  Suiv. <ChevronRight size={14} />
                </button>
              </div>
            </div>
          ) : null}
        </div>
      </div>

      <SchoolSaasDrawer
        school={selected}
        open={Boolean(selected)}
        onClose={() => setSelected(null)}
        dark={dark}
      />
    </div>
  )
}
