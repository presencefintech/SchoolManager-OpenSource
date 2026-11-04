'use client'

import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { UserX, RefreshCw, Phone, Filter, Users, Percent } from 'lucide-react'
import { cn } from '@/lib/utils'
import { directorsApi } from '@/lib/admin/api/directors.api'
import { Skeleton } from '@/components/ui/skeleton'
import {
  DirectorPageHeader,
  DirectorEmptyState,
  DirectorKpiCard,
} from '@/components/director/director-ui'

export default function DirectorAbsencesPage() {
  const [classId, setClassId] = useState<number | ''>('')
  const [sectionId, setSectionId] = useState<number | ''>('')

  const sectionsQuery = useQuery({
    queryKey: ['director', 'sections'],
    queryFn: () => directorsApi.mySections(),
    staleTime: 60_000,
  })

  const classesQuery = useQuery({
    queryKey: ['director', 'classes'],
    queryFn: () => directorsApi.myClasses(),
    staleTime: 60_000,
  })

  const absencesQuery = useQuery({
    queryKey: [
      'director',
      'presence',
      'absences',
      classId || 'all',
      sectionId || 'all',
    ],
    queryFn: () =>
      directorsApi.presenceAbsences({
        page: 1,
        limit: 100,
        ...(classId ? { classId } : {}),
        ...(sectionId ? { sectionId } : {}),
      }),
    staleTime: 20_000,
    refetchInterval: 60_000,
  })

  const classes = useMemo(() => {
    const all = classesQuery.data ?? []
    if (!sectionId) return all
    return all.filter((c) => c.sectionId === sectionId)
  }, [classesQuery.data, sectionId])

  const data = absencesQuery.data
  const items = data?.items ?? []
  const rate =
    data && data.studentCount > 0
      ? Math.round(((data.presentCount ?? 0) / data.studentCount) * 100)
      : null

  return (
    <div className="min-h-screen">
      <DirectorPageHeader
        title="Absences du jour"
        subtitle="Élèves de votre périmètre non pointés (présent / retard)"
        actions={
          <button
            type="button"
            onClick={() => absencesQuery.refetch()}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-zinc-200 bg-white text-xs font-medium text-zinc-700 hover:border-emerald-200 hover:text-emerald-700"
          >
            <RefreshCw
              size={13}
              className={cn(absencesQuery.isFetching && 'animate-spin')}
            />
            Actualiser
          </button>
        }
      />

      <div className="max-w-6xl mx-auto px-6 sm:px-8 py-6 space-y-5">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {absencesQuery.isLoading ? (
            [...Array(4)].map((_, i) => <Skeleton key={i} className="h-24 rounded-2xl" />)
          ) : (
            <>
              <DirectorKpiCard
                label="Absents"
                value={data?.absentCount ?? 0}
                hint="Sans PRESENT / LATE aujourd’hui"
                icon={UserX}
                tone="amber"
              />
              <DirectorKpiCard
                label="Présents"
                value={data?.presentCount ?? 0}
                hint="Pointages validés"
                icon={Users}
                tone="emerald"
              />
              <DirectorKpiCard
                label="Effectif"
                value={data?.studentCount ?? 0}
                hint="Élèves actifs du filtre"
                icon={Filter}
                tone="sky"
              />
              <DirectorKpiCard
                label="Taux présence"
                value={rate != null ? `${rate}%` : '—'}
                hint="Présents / effectif"
                icon={Percent}
                tone="indigo"
              />
            </>
          )}
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <select
            value={sectionId}
            onChange={(e) => {
              setSectionId(e.target.value ? Number(e.target.value) : '')
              setClassId('')
            }}
            className="sm:max-w-xs w-full px-3 py-2 rounded-xl border border-zinc-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-200"
          >
            <option value="">Toutes les sections</option>
            {(sectionsQuery.data ?? []).map((s) => (
              <option key={s.sectionId} value={s.sectionId}>
                {s.section.name}
              </option>
            ))}
          </select>
          <select
            value={classId}
            onChange={(e) => setClassId(e.target.value ? Number(e.target.value) : '')}
            className="sm:max-w-xs w-full px-3 py-2 rounded-xl border border-zinc-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-200"
          >
            <option value="">Toutes les classes</option>
            {classes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl border border-zinc-200 overflow-hidden"
        >
          <div className="px-5 py-4 border-b border-zinc-100">
            <h2 className="text-sm font-semibold text-zinc-900">
              Liste ({data?.total ?? items.length})
            </h2>
            <p className="text-[11px] text-zinc-400 mt-0.5">
              Contact d’urgence affiché quand renseigné — pour relance parents.
            </p>
          </div>

          {absencesQuery.isLoading ? (
            <div className="p-5 space-y-3">
              {[...Array(6)].map((_, i) => (
                <Skeleton key={i} className="h-14" />
              ))}
            </div>
          ) : items.length === 0 ? (
            <DirectorEmptyState
              icon={UserX}
              title="Aucune absence détectée"
              description="Tous les élèves du filtre ont un pointage présent ou retard aujourd’hui — ou l’effectif est vide."
            />
          ) : (
            <ul className="divide-y divide-zinc-100">
              {items.map((row) => (
                <li
                  key={row.id}
                  className="px-5 py-3.5 flex items-start justify-between gap-3 hover:bg-zinc-50/80"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-zinc-900">
                      {row.lastName} {row.firstName}
                    </p>
                    <p className="text-[11px] text-zinc-500 mt-0.5">
                      {row.className ?? 'Classe ?'}
                      {row.sectionName ? ` · ${row.sectionName}` : ''}
                      {row.matricule ? ` · ${row.matricule}` : ''}
                    </p>
                    {row.totalAbsences > 0 && (
                      <p className="text-[11px] text-amber-700 mt-1">
                        Cumul absences : {row.totalAbsences}
                      </p>
                    )}
                  </div>
                  <div className="text-right flex-shrink-0">
                    {row.emergencyContactPhone ? (
                      <a
                        href={`tel:${row.emergencyContactPhone}`}
                        className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700 hover:underline"
                      >
                        <Phone size={12} />
                        {row.emergencyContactName || row.emergencyContactPhone}
                      </a>
                    ) : (
                      <span className="text-[11px] text-zinc-400">Pas de contact</span>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </motion.div>
      </div>
    </div>
  )
}
