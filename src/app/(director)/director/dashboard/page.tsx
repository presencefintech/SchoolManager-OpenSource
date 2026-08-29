'use client'

import Link from 'next/link'
import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import {
  Layers,
  Activity,
  Megaphone,
  ArrowRight,
  BookOpen,
  RefreshCw,
  AlertCircle,
  Clock,
  Send,
  UserX,
  History,
  ClipboardList,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuth } from '@/providers/auth-provider'
import { directorsApi } from '@/lib/admin/api/directors.api'
import { announcementsApi } from '@/lib/admin/api/announcements.api'
import { Skeleton } from '@/components/ui/skeleton'
import {
  DirectorPageHeader,
  DirectorKpiCard,
  DirectorEmptyState,
  PresenceStatusPill,
} from '@/components/director/director-ui'

function historyRange() {
  const to = new Date()
  const from = new Date()
  from.setDate(from.getDate() - 6)
  return {
    from: from.toISOString().slice(0, 10),
    to: to.toISOString().slice(0, 10),
  }
}

function formatHistoryDay(day: string): string {
  const [y, m, d] = day.split('-').map(Number)
  if (!y || !m || !d) return day
  return new Date(y, m - 1, d).toLocaleDateString('fr-FR', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
  })
}

function todayLabel() {
  return new Date().toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })
}

export default function DirectorDashboardPage() {
  const { user } = useAuth()
  const { from: historyFrom, to: historyTo } = useMemo(() => historyRange(), [])

  const summaryQuery = useQuery({
    queryKey: ['director', 'summary'],
    queryFn: () => directorsApi.summary(),
    staleTime: 30_000,
    retry: 1,
  })

  const liveQuery = useQuery({
    queryKey: ['director', 'presence', 'live', 'dash'],
    queryFn: () => directorsApi.presenceLive({ page: 1, limit: 8 }),
    staleTime: 15_000,
    refetchInterval: 45_000,
  })

  const sheetsQuery = useQuery({
    queryKey: ['director', 'sheets', 'today'],
    queryFn: () => directorsApi.presenceSheets(),
    staleTime: 15_000,
    refetchInterval: 45_000,
  })

  const announcementsQuery = useQuery({
    queryKey: ['director', 'announcements', 'dash'],
    queryFn: () => announcementsApi.list({ page: 1, limit: 5 }),
    staleTime: 30_000,
  })

  const historyQuery = useQuery({
    queryKey: ['director', 'presence', 'history', 'dash', historyFrom, historyTo],
    queryFn: () =>
      directorsApi.presenceHistory({
        page: 1,
        limit: 6,
        from: historyFrom,
        to: historyTo,
      }),
    staleTime: 30_000,
  })

  const summary = summaryQuery.data
  const live = liveQuery.data?.data ?? []
  const history = historyQuery.data?.data ?? []
  const announcements = announcementsQuery.data?.items ?? []
  const sheets = sheetsQuery.data ?? []
  const noScope = !summaryQuery.isLoading && (summary?.sectionCount ?? 0) === 0

  return (
    <div className="min-h-screen pb-10">
      <DirectorPageHeader
        title={`Bonjour${user?.firstName ? `, ${user.firstName}` : ''}`}
        subtitle={`${todayLabel()} · Pilotage pédagogique de votre périmètre`}
        actions={
          <button
            type="button"
            onClick={() => {
              summaryQuery.refetch()
              liveQuery.refetch()
              sheetsQuery.refetch()
              historyQuery.refetch()
              announcementsQuery.refetch()
            }}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-sm rounded-xl border border-zinc-200 bg-white hover:bg-zinc-50 text-zinc-600"
          >
            <RefreshCw
              size={14}
              className={cn(
                (summaryQuery.isFetching ||
                  liveQuery.isFetching ||
                  historyQuery.isFetching) &&
                  'animate-spin'
              )}
            />
            Actualiser
          </button>
        }
      />

      <div className="max-w-6xl mx-auto px-6 sm:px-8 py-8 space-y-6">
        {noScope && (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 flex items-start gap-3">
            <AlertCircle size={18} className="text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-amber-900">Aucune section affectée</p>
              <p className="text-xs text-amber-800/80 mt-0.5 leading-relaxed">
                Demandez à l’administrateur de vous rattacher à une ou plusieurs sections
                (Personnel → Directeur → Sections). Sans cela, les présences et communiqués
                sectionnels resteront vides.
              </p>
            </div>
          </div>
        )}

        {/* KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
          {summaryQuery.isLoading ? (
            [...Array(5)].map((_, i) => <Skeleton key={i} className="h-24 rounded-2xl" />)
          ) : (
            <>
              <DirectorKpiCard
                label="Sections"
                value={summary?.sectionCount ?? 0}
                hint={
                  summary?.sections?.[0]
                    ? summary.sections.map((s) => s.name).join(', ')
                    : 'Non affecté'
                }
                icon={Layers}
                tone="emerald"
              />
              <DirectorKpiCard
                label="Classes"
                value={summary?.classCount ?? 0}
                hint="Classes actives du périmètre"
                icon={BookOpen}
                tone="sky"
              />
              <DirectorKpiCard
                label="Pointages du jour"
                value={summary?.presenceToday ?? 0}
                hint="Scans dans vos classes"
                icon={Activity}
                tone="emerald"
              />
              <DirectorKpiCard
                label="Absents du jour"
                value={summary?.absentToday ?? 0}
                hint={
                  summary?.studentCount
                    ? `Sur ${summary.studentCount} élèves actifs`
                    : 'Sans PRESENT / LATE'
                }
                icon={UserX}
                tone="amber"
              />
              <DirectorKpiCard
                label="Communiqués"
                value={announcementsQuery.data?.total ?? announcements.length}
                hint="Visibles dans votre périmètre"
                icon={Megaphone}
                tone="sky"
              />
            </>
          )}
        </div>

        {/* Quick actions */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            {
              href: '/director/absences',
              title: 'Absences du jour',
              desc: 'Qui n’a pas été pointé',
              icon: UserX,
            },
            {
              href: '/director/presences',
              title: 'Suivre les présences',
              desc: 'Live & heatmap lecture seule',
              icon: Activity,
            },
            {
              href: '/director/announcements',
              title: 'Publier un communiqué',
              desc: 'Parents de section ou école',
              icon: Send,
            },
            {
              href: '/director/sections',
              title: 'Voir mon périmètre',
              desc: 'Sections et classes rattachées',
              icon: Layers,
            },
          ].map((item, i) => (
            <motion.div
              key={item.href}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.04 * i }}
            >
              <Link
                href={item.href}
                className="group flex items-center gap-3 bg-white rounded-2xl border border-zinc-200 px-4 py-3.5 hover:border-emerald-200 hover:shadow-sm transition-all"
              >
                <div className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center flex-shrink-0">
                  <item.icon size={16} className="text-emerald-600" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-zinc-900 flex items-center gap-1">
                    {item.title}
                    <ArrowRight
                      size={13}
                      className="text-zinc-300 group-hover:text-emerald-500 transition-colors"
                    />
                  </p>
                  <p className="text-[11px] text-zinc-500 truncate">{item.desc}</p>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>

        <div className="bg-white rounded-2xl border border-zinc-200 overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-100">
            <div className="flex items-center gap-2">
              <ClipboardList size={16} className="text-emerald-600" />
              <div>
                <h2 className="text-sm font-semibold text-zinc-900">Cahiers d’appel du jour</h2>
                <p className="text-[11px] text-zinc-400 mt-0.5">
                  Dès qu’un enseignant soumet, le résumé apparaît ici
                </p>
              </div>
            </div>
            <Link
              href="/director/presences"
              className="text-xs font-medium text-emerald-700 hover:underline"
            >
              Voir les présences
            </Link>
          </div>
          {sheetsQuery.isLoading ? (
            <div className="p-5 space-y-3">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-12" />
              ))}
            </div>
          ) : sheets.length === 0 ? (
            <div className="px-5 py-6">
              <p className="text-sm text-zinc-500">Aucun cahier soumis aujourd’hui dans vos classes.</p>
            </div>
          ) : (
            <ul className="divide-y divide-zinc-50">
              {sheets.slice(0, 8).map((sheet) => (
                <li
                  key={sheet.sheetId}
                  className="px-5 py-3 flex items-center justify-between gap-3"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-zinc-900 truncate">{sheet.className}</p>
                    <p className="text-[11px] text-zinc-500 mt-0.5">
                      {sheet.presentCount} présents · {sheet.lateCount} retards · {sheet.absentCount}{' '}
                      absents
                    </p>
                  </div>
                  <span
                    className={cn(
                      'flex-shrink-0 text-[11px] font-medium px-2 py-0.5 rounded-full',
                      sheet.status === 'SEALED'
                        ? 'bg-emerald-50 text-emerald-700'
                        : sheet.status === 'SUBMITTED'
                          ? 'bg-amber-50 text-amber-800'
                          : 'bg-zinc-100 text-zinc-600'
                    )}
                  >
                    {sheet.status === 'SEALED'
                      ? 'Scellé'
                      : sheet.status === 'SUBMITTED'
                        ? 'Soumis'
                        : 'Brouillon'}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="grid lg:grid-cols-5 gap-4">
          {/* Live presence */}
          <div className="lg:col-span-3 bg-white rounded-2xl border border-zinc-200 overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-100">
              <div>
                <h2 className="text-sm font-semibold text-zinc-900">Présences récentes</h2>
                <p className="text-[11px] text-zinc-400 mt-0.5">Flux du jour — vos classes</p>
              </div>
              <Link
                href="/director/presences"
                className="text-xs font-medium text-emerald-700 hover:underline"
              >
                Tout voir
              </Link>
            </div>
            {liveQuery.isLoading ? (
              <div className="p-5 space-y-3">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-12" />
                ))}
              </div>
            ) : live.length === 0 ? (
              <DirectorEmptyState
                icon={Clock}
                title="Aucun pointage pour l’instant"
                description="Dès qu’un cahier est soumis ou qu’un élève est pointé dans vos classes, les passages apparaissent ici."
                action={
                  <Link
                    href="/director/presences"
                    className="text-xs font-medium text-emerald-700 hover:underline"
                  >
                    Ouvrir le module présences
                  </Link>
                }
              />
            ) : (
              <ul className="divide-y divide-zinc-50">
                {live.map((row) => (
                  <li
                    key={row.id}
                    className="px-5 py-3 flex items-center justify-between gap-3 hover:bg-zinc-50/80"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-zinc-900 truncate">
                        {row.studentName}
                      </p>
                      <p className="text-[11px] text-zinc-400 truncate">
                        {row.className}
                        {row.matricule ? ` · ${row.matricule}` : ''}
                      </p>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0">
                      <span className="text-[11px] text-zinc-400 tabular-nums">
                        {row.scannedAt
                          ? new Date(row.scannedAt).toLocaleTimeString('fr-FR', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })
                          : '—'}
                      </span>
                      <PresenceStatusPill status={row.status} />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Right column */}
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-white rounded-2xl border border-zinc-200 overflow-hidden">
              <div className="px-5 py-4 border-b border-zinc-100 flex items-center justify-between">
                <h2 className="text-sm font-semibold text-zinc-900">Mon périmètre</h2>
                <Link
                  href="/director/sections"
                  className="text-xs font-medium text-emerald-700 hover:underline"
                >
                  Détail
                </Link>
              </div>
              {summaryQuery.isLoading ? (
                <div className="p-5 space-y-2">
                  <Skeleton className="h-10" />
                  <Skeleton className="h-10" />
                </div>
              ) : (summary?.sections?.length ?? 0) === 0 ? (
                <DirectorEmptyState
                  icon={Layers}
                  title="Périmètre vide"
                  description="Aucune section n’est encore liée à votre compte."
                />
              ) : (
                <ul className="divide-y divide-zinc-50">
                  {summary!.sections.map((s) => {
                    const classCount =
                      summary!.classes.filter((c) => c.sectionId === s.id).length
                    return (
                      <li key={s.id} className="px-5 py-3 flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center flex-shrink-0">
                          <Layers size={15} className="text-emerald-600" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-zinc-900 truncate">{s.name}</p>
                          <p className="text-[11px] text-zinc-400">
                            {classCount} classe{classCount !== 1 ? 's' : ''}
                            {s.code ? ` · ${s.code}` : ''}
                          </p>
                        </div>
                      </li>
                    )
                  })}
                </ul>
              )}
            </div>

            <div className="bg-white rounded-2xl border border-zinc-200 overflow-hidden">
              <div className="px-5 py-4 border-b border-zinc-100 flex items-center justify-between">
                <h2 className="text-sm font-semibold text-zinc-900">Derniers communiqués</h2>
                <Link
                  href="/director/announcements"
                  className="text-xs font-medium text-emerald-700 hover:underline"
                >
                  Gérer
                </Link>
              </div>
              {announcementsQuery.isLoading ? (
                <div className="p-5 space-y-2">
                  <Skeleton className="h-12" />
                  <Skeleton className="h-12" />
                </div>
              ) : announcements.length === 0 ? (
                <DirectorEmptyState
                  icon={Megaphone}
                  title="Aucun communiqué"
                  description="Publiez une annonce pour informer les parents de vos sections."
                  action={
                    <Link
                      href="/director/announcements"
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-600 text-white text-xs font-medium hover:bg-emerald-700"
                    >
                      <Send size={12} />
                      Nouveau communiqué
                    </Link>
                  }
                />
              ) : (
                <ul className="divide-y divide-zinc-50">
                  {announcements.slice(0, 4).map((a) => (
                    <li key={a.id} className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-zinc-900 truncate flex-1">
                          {a.title}
                        </p>
                        <span
                          className={cn(
                            'text-[10px] font-semibold px-1.5 py-0.5 rounded-full flex-shrink-0',
                            a.status === 'PUBLISHED'
                              ? 'bg-emerald-50 text-emerald-700'
                              : a.status === 'DRAFT'
                                ? 'bg-zinc-100 text-zinc-600'
                                : 'bg-amber-50 text-amber-800'
                          )}
                        >
                          {a.status}
                        </span>
                      </div>
                      <p className="text-[11px] text-zinc-400 mt-0.5 line-clamp-1">{a.body}</p>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>

        {/* Historique récent (7 jours) */}
        <div className="bg-white rounded-2xl border border-zinc-200 overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-100">
            <div>
              <h2 className="text-sm font-semibold text-zinc-900 flex items-center gap-2">
                <History size={15} className="text-emerald-600" />
                Historique récent
              </h2>
              <p className="text-[11px] text-zinc-400 mt-0.5">
                7 derniers jours · section & option
              </p>
            </div>
            <Link
              href="/director/presences?tab=history"
              className="text-xs font-medium text-emerald-700 hover:underline"
            >
              Historique complet
            </Link>
          </div>
          {historyQuery.isLoading ? (
            <div className="p-5 space-y-3">
              {[...Array(4)].map((_, i) => (
                <Skeleton key={i} className="h-12" />
              ))}
            </div>
          ) : history.length === 0 ? (
            <DirectorEmptyState
              icon={History}
              title="Aucun pointage sur la période"
              description="Les présences, retards et absences enregistrés apparaîtront ici avec la section et l’option."
            />
          ) : (
            <ul className="divide-y divide-zinc-50">
              {history.map((row) => (
                <li
                  key={row.id}
                  className="px-5 py-3 flex items-center justify-between gap-3 hover:bg-zinc-50/80"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-zinc-900 truncate">
                      {row.studentName}
                    </p>
                    <p className="text-[11px] text-zinc-400 truncate">
                      {row.className}
                      {row.sectionName ? ` · ${row.sectionName}` : ''}
                      {row.optionName ? ` · ${row.optionName}` : ''}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <span className="text-[11px] text-zinc-500 tabular-nums text-right">
                      {formatHistoryDay(row.day)}
                      <br />
                      <span className="text-zinc-400">{row.time || '—'}</span>
                    </span>
                    <PresenceStatusPill status={row.status} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}
