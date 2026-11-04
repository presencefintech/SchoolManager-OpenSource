'use client'

import Link from 'next/link'
import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { Layers, BookOpen, Activity, Megaphone } from 'lucide-react'
import { directorsApi } from '@/lib/admin/api/directors.api'
import { Skeleton } from '@/components/ui/skeleton'
import {
  DirectorPageHeader,
  DirectorEmptyState,
  DirectorKpiCard,
} from '@/components/director/director-ui'

export default function DirectorSectionsPage() {
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

  const sections = sectionsQuery.data ?? []
  const classes = useMemo(() => classesQuery.data ?? [], [classesQuery.data])

  const bySection = useMemo(() => {
    const map = new Map<number, typeof classes>()
    for (const c of classes) {
      const list = map.get(c.sectionId) ?? []
      list.push(c)
      map.set(c.sectionId, list)
    }
    return map
  }, [classes])

  const loading = sectionsQuery.isLoading || classesQuery.isLoading

  return (
    <div className="min-h-screen pb-10">
      <DirectorPageHeader
        title="Mon périmètre"
        subtitle="Sections et classes sous votre responsabilité pédagogique"
      />

      <div className="max-w-6xl mx-auto px-6 sm:px-8 py-8 space-y-6">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {loading ? (
            [...Array(3)].map((_, i) => <Skeleton key={i} className="h-24 rounded-2xl" />)
          ) : (
            <>
              <DirectorKpiCard
                label="Sections"
                value={sections.length}
                icon={Layers}
                tone="emerald"
              />
              <DirectorKpiCard
                label="Classes"
                value={classes.length}
                icon={BookOpen}
                tone="sky"
              />
              <DirectorKpiCard
                label="Niveaux"
                value={new Set(classes.map((c) => c.level)).size}
                hint="Niveaux distincts"
                icon={Layers}
                tone="emerald"
              />
            </>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          <Link
            href="/director/presences"
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-zinc-200 bg-white text-xs font-medium text-zinc-700 hover:border-emerald-200 hover:text-emerald-700"
          >
            <Activity size={13} />
            Voir les présences
          </Link>
          <Link
            href="/director/announcements"
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-zinc-200 bg-white text-xs font-medium text-zinc-700 hover:border-emerald-200 hover:text-emerald-700"
          >
            <Megaphone size={13} />
            Communiqués de section
          </Link>
        </div>

        {loading ? (
          <div className="space-y-3">
            {[...Array(2)].map((_, i) => (
              <Skeleton key={i} className="h-40 rounded-2xl" />
            ))}
          </div>
        ) : sections.length === 0 ? (
          <div className="bg-white rounded-2xl border border-zinc-200">
            <DirectorEmptyState
              icon={Layers}
              title="Aucune section affectée"
              description="L’administrateur doit vous rattacher à une section (Maternelle, Primaire, Secondaire…) depuis Personnel → Directeur."
            />
          </div>
        ) : (
          <div className="space-y-4">
            {sections.map((row, i) => {
              const sectionClasses = bySection.get(row.sectionId) ?? []
              return (
                <motion.div
                  key={row.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="bg-white rounded-2xl border border-zinc-200 overflow-hidden"
                >
                  <div className="px-5 py-4 border-b border-zinc-100 flex items-center gap-3 bg-gradient-to-r from-emerald-50/80 to-white">
                    <div className="w-10 h-10 rounded-xl bg-white border border-emerald-100 flex items-center justify-center flex-shrink-0">
                      <Layers size={16} className="text-emerald-600" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h2 className="text-base font-semibold text-zinc-900">
                        {row.section.name}
                      </h2>
                      <p className="text-xs text-zinc-500">
                        {sectionClasses.length} classe
                        {sectionClasses.length !== 1 ? 's' : ''}
                        {row.section.code ? ` · Code ${row.section.code}` : ''}
                      </p>
                    </div>
                  </div>

                  {sectionClasses.length === 0 ? (
                    <p className="px-5 py-8 text-center text-xs text-zinc-400">
                      Aucune classe active dans cette section
                    </p>
                  ) : (
                    <div className="p-4 grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
                      {sectionClasses.map((c) => (
                        <div
                          key={c.id}
                          className="flex items-center gap-3 rounded-xl border border-zinc-100 bg-zinc-50/50 px-3 py-2.5"
                        >
                          <div className="w-8 h-8 rounded-lg bg-white border border-zinc-100 flex items-center justify-center">
                            <BookOpen size={13} className="text-sky-600" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-zinc-800 truncate">
                              {c.name}
                            </p>
                            <p className="text-[11px] text-zinc-400">{c.level}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </motion.div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
