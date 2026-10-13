'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Building2, Check, ChevronDown, Globe2, Network } from 'lucide-react'
import { adminNetworkApi } from '@/lib/admin/network.api'
import { getAuthSchoolId, setAuthSchoolId } from '@/lib/api/auth-storage'
import { useAuth } from '@/providers/auth-provider'
import { cn } from '@/lib/utils'

type ViewMode = 'network' | 'campus'

/**
 * Navbar — visible uniquement si ADMIN promoteur multi-campus (isNetworkPromoter).
 * Mono-école : rien n’est affiché (vue admin standard).
 */
export function CampusSwitcher() {
  const { user } = useAuth()
  const [open, setOpen] = useState(false)
  const [activeSchoolId, setActiveSchoolId] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<ViewMode>('campus')
  const rootRef = useRef<HTMLDivElement>(null)

  const isAdminPromoter =
    user?.role === 'ADMIN' ||
    user?.role === 'PROMOTER' ||
    user?.role === 'SUPER_ADMIN_NETWORK'

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'network', 'my-schools'],
    queryFn: adminNetworkApi.getMySchools,
    enabled: Boolean(isAdminPromoter),
    staleTime: 60_000,
  })

  useEffect(() => {
    setActiveSchoolId(getAuthSchoolId())
  }, [])

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDocClick)
    return () => document.removeEventListener('mousedown', onDocClick)
  }, [])

  const schools = data?.schools ?? []
  const showSwitcher = Boolean(data?.isNetworkPromoter && schools.length > 1)

  const label = useMemo(() => {
    if (viewMode === 'network') {
      return data?.networkName ? `Vue consolidée · ${data.networkName}` : 'Vue consolidée Groupe'
    }
    const current = schools.find((s) => String(s.id) === activeSchoolId)
    return current?.name ?? data?.networkName ?? 'Campus'
  }, [viewMode, schools, activeSchoolId, data?.networkName])

  if (!isAdminPromoter) return null
  if (isLoading) return null
  if (!showSwitcher) return null

  function selectNetworkView() {
    setViewMode('network')
    setOpen(false)
    window.location.href = '/admin/network'
  }

  function selectCampus(schoolId: number, schoolName: string) {
    setAuthSchoolId(String(schoolId))
    setActiveSchoolId(String(schoolId))
    setViewMode('campus')
    setOpen(false)
    window.dispatchEvent(
      new CustomEvent('network:campus-switched', {
        detail: { schoolId, schoolName },
      }),
    )
    window.location.href = '/admin/dashboard'
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          'inline-flex max-w-[280px] items-center gap-2 rounded-xl border px-3 py-1.5 text-left text-sm font-medium shadow-sm transition',
          viewMode === 'network'
            ? 'border-sky-200 bg-sky-50/90 text-sky-950 hover:bg-sky-50'
            : 'border-emerald-200 bg-emerald-50/80 text-emerald-950 hover:bg-emerald-50',
          open && (viewMode === 'network' ? 'ring-2 ring-sky-600/20' : 'ring-2 ring-emerald-600/20'),
        )}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label="Sélecteur de campus"
      >
        <Network
          size={14}
          className={cn(
            'shrink-0',
            viewMode === 'network' ? 'text-sky-700' : 'text-emerald-700',
          )}
        />
        <span className="min-w-0 truncate">{label}</span>
        <ChevronDown
          size={14}
          className={cn('shrink-0 text-emerald-600/70 transition', open && 'rotate-180')}
        />
      </button>

      {open ? (
        <div
          className="absolute right-0 z-50 mt-1.5 w-80 overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-lg"
          role="listbox"
        >
          <div className="border-b border-zinc-100 px-3 py-2.5">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
              Groupe scolaire
            </p>
            <p className="truncate text-sm font-semibold text-zinc-900">
              {data?.networkName ?? 'Réseau'}
            </p>
            {data?.networkCode ? (
              <p className="text-[11px] text-zinc-500">Code {data.networkCode}</p>
            ) : null}
          </div>

          <button
            type="button"
            onClick={selectNetworkView}
            className={cn(
              'flex w-full items-center gap-2.5 px-3 py-2.5 text-left text-sm transition hover:bg-zinc-50',
              viewMode === 'network' && 'bg-emerald-50/80',
            )}
          >
            <Globe2 size={15} className="text-emerald-600" />
            <span className="flex-1 font-medium text-zinc-800">Vue consolidée Groupe</span>
            {viewMode === 'network' ? <Check size={14} className="text-emerald-600" /> : null}
          </button>

          <div className="border-t border-zinc-100 px-3 py-1.5">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
              Campuses
            </p>
          </div>

          <ul className="max-h-64 overflow-y-auto py-1">
            {schools.map((school) => {
              const active = viewMode === 'campus' && String(school.id) === activeSchoolId
              return (
                <li key={school.id}>
                  <button
                    type="button"
                    onClick={() => selectCampus(school.id, school.name)}
                    className={cn(
                      'flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm transition hover:bg-zinc-50',
                      active && 'bg-zinc-50',
                    )}
                  >
                    <Building2 size={14} className="shrink-0 text-zinc-400" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium text-zinc-800">
                        {school.name}
                      </span>
                      <span className="block text-[11px] text-zinc-400">
                        {school.city || '—'}
                        {school.isPaymentHub ? ' · Caisse hub' : ''}
                      </span>
                    </span>
                    {active ? <Check size={14} className="text-emerald-600" /> : null}
                  </button>
                </li>
              )
            })}
          </ul>
        </div>
      ) : null}
    </div>
  )
}
