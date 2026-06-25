'use client'

import { useState, useCallback } from 'react'
import { motion } from 'framer-motion'
import { useQueryClient } from '@tanstack/react-query'
import {
  GraduationCap, Search, Users, Clock, BarChart3, BookOpen,
  AlertTriangle, CheckCircle2, XCircle, RefreshCw, ChevronLeft,
  ChevronRight, User, Wallet, ScanLine, ShieldAlert, FileText,
  Camera, Fingerprint, BadgeCheck,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useSchools } from '@/lib/hooks/use-super-admin'
import {
  useStudentSchoolStats,
  useStudentList,
  useStudentDebtors,
  useStudentDashboard,
  useStudentActivity,
  useStudentDossier,
} from '@/lib/hooks/use-super-admin'
import { superAdminApi } from '@/lib/superAdmin/api'

/* ─────────────────────────── helpers ─────────────────────────── */

function fmt(n: number, currency = 'USD') {
  return new Intl.NumberFormat('fr-CD', { style: 'currency', currency, maximumFractionDigits: 0 }).format(n)
}

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })
}

function statusBadge(status: string) {
  const map: Record<string, string> = {
    ACTIVE: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
    INACTIVE: 'bg-zinc-100 text-zinc-500 ring-zinc-200',
    SUSPENDED: 'bg-red-50 text-red-600 ring-red-200',
    GRADUATED: 'bg-indigo-50 text-indigo-700 ring-indigo-200',
  }
  return map[status] ?? 'bg-zinc-100 text-zinc-500 ring-zinc-200'
}

/* ─────────────────────────── sub-components ─────────────────── */

function StatCard({
  label,
  value,
  sub,
  icon: Icon,
  color = 'indigo',
}: {
  label: string
  value: string | number
  sub?: string
  icon: React.ElementType
  color?: 'indigo' | 'emerald' | 'amber' | 'rose'
}) {
  const colors = {
    indigo: 'bg-indigo-50 text-indigo-600',
    emerald: 'bg-emerald-50 text-emerald-600',
    amber: 'bg-amber-50 text-amber-600',
    rose: 'bg-rose-50 text-rose-600',
  }
  return (
    <div className="bg-white rounded-xl border border-zinc-200 shadow-[0_1px_4px_rgba(0,0,0,0.06)] px-5 py-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium text-zinc-400 uppercase tracking-wide mb-1.5">{label}</p>
          <p className="text-3xl font-bold text-zinc-900 tabular-nums leading-none">{value}</p>
          {sub && <p className="text-sm text-zinc-500 mt-1.5">{sub}</p>}
        </div>
        <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0', colors[color])}>
          <Icon size={18} />
        </div>
      </div>
    </div>
  )
}

/* ─────────────────────────── school view ─────────────────────── */

function SchoolView({ schoolId }: { schoolId: number }) {
  const [tab, setTab] = useState<'list' | 'debtors'>('list')
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [page, setPage] = useState(1)
  const [invalidating, setInvalidating] = useState(false)
  const qc = useQueryClient()

  const { data: stats, isLoading: statsLoading } = useStudentSchoolStats(schoolId)
  const { data: list, isLoading: listLoading } = useStudentList(schoolId, {
    page,
    limit: 20,
    search: debouncedSearch || undefined,
  })
  const { data: debtors, isLoading: debtorsLoading } = useStudentDebtors(schoolId)

  const handleSearch = useCallback((v: string) => {
    setSearch(v)
    const t = setTimeout(() => { setDebouncedSearch(v); setPage(1) }, 400)
    return () => clearTimeout(t)
  }, [])

  const handleInvalidate = async () => {
    setInvalidating(true)
    try {
      await superAdminApi.invalidateStats(schoolId)
      qc.invalidateQueries({ queryKey: ['superadmin', 'students', 'stats', schoolId] })
    } finally {
      setInvalidating(false)
    }
  }

  return (
    <div className="space-y-5">
      {/* KPIs */}
      {statsLoading ? (
        <div className="grid grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-24 bg-zinc-100 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : stats ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Total élèves" value={stats.totalStudents} icon={Users} color="indigo" />
          <StatCard label="Présents auj." value={stats.presentToday} sub={`${stats.lateToday} en retard`} icon={Clock} color="emerald" />
          <StatCard label="Taux de présence" value={`${stats.attendanceRate}%`} icon={BarChart3} color="amber" />
          <StatCard label="Classes actives" value={stats.totalClasses} icon={BookOpen} color="rose" />
        </div>
      ) : (
        <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-sm text-amber-700">
          Impossible de charger les statistiques
        </div>
      )}

      {/* Tabs + actions */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex gap-1 bg-zinc-100 p-1 rounded-xl">
          <button
            onClick={() => setTab('list')}
            className={cn('px-4 py-2 rounded-lg text-sm font-medium transition-all', tab === 'list' ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-500 hover:text-zinc-700')}
          >
            Liste des élèves
          </button>
          <button
            onClick={() => setTab('debtors')}
            className={cn('flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all', tab === 'debtors' ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-500 hover:text-zinc-700')}
          >
            <AlertTriangle size={13} />
            Débiteurs
            {debtors && debtors.length > 0 && (
              <span className="ml-1 px-1.5 py-0.5 text-xs rounded-full bg-rose-100 text-rose-600 tabular-nums">{debtors.length}</span>
            )}
          </button>
        </div>

        <button
          onClick={handleInvalidate}
          disabled={invalidating}
          className="flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm text-zinc-500 border border-zinc-200 bg-white hover:bg-zinc-50 transition-all disabled:opacity-50"
        >
          <RefreshCw size={13} className={invalidating ? 'animate-spin' : ''} />
          Invalider le cache
        </button>
      </div>

      {/* List tab */}
      {tab === 'list' && (
        <div className="bg-white rounded-xl border border-zinc-200 shadow-[0_1px_4px_rgba(0,0,0,0.06)] overflow-hidden">
          <div className="px-5 py-4 border-b border-zinc-100 flex items-center gap-3">
            <div className="relative flex-1 max-w-xs">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
              <input
                type="text"
                placeholder="Nom, prénom, matricule..."
                value={search}
                onChange={(e) => handleSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-2 text-sm border border-zinc-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400"
              />
            </div>
            {list && (
              <p className="text-sm text-zinc-400 tabular-nums">{list.total} élève{list.total !== 1 ? 's' : ''}</p>
            )}
          </div>

          {listLoading ? (
            <div className="divide-y divide-zinc-100">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="px-5 py-4 flex items-center gap-4">
                  <div className="w-8 h-8 rounded-full bg-zinc-100 animate-pulse" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3 w-40 bg-zinc-100 rounded animate-pulse" />
                    <div className="h-3 w-24 bg-zinc-100 rounded animate-pulse" />
                  </div>
                </div>
              ))}
            </div>
          ) : list?.data?.length ? (
            <>
              <div className="divide-y divide-zinc-100">
                {list.data.map((s) => (
                  <div key={s.id} className="px-5 py-3.5 flex items-center gap-4 hover:bg-zinc-50 transition-colors">
                    <div className="w-9 h-9 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0">
                      <span className="text-xs font-semibold text-indigo-700">
                        {s.firstName[0]}{s.lastName[0]}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-zinc-800 truncate">
                        {s.firstName} {s.lastName}
                      </p>
                      <p className="text-xs text-zinc-400 truncate">
                        {s.class?.name ?? '—'} · {s.matricule ?? 'Pas de matricule'}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className={cn('px-2 py-0.5 text-xs rounded-full ring-1', statusBadge(s.status))}>
                        {s.status}
                      </span>
                      {s.isPaymentLocked && (
                        <span className="px-2 py-0.5 text-xs rounded-full bg-red-50 text-red-600 ring-1 ring-red-200">
                          Verrouillé
                        </span>
                      )}
                      <span className="text-xs text-zinc-400 tabular-nums">ID {s.id}</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Pagination */}
              {list.totalPages > 1 && (
                <div className="px-5 py-3 border-t border-zinc-100 flex items-center justify-between">
                  <p className="text-xs text-zinc-400 tabular-nums">Page {list.page} / {list.totalPages}</p>
                  <div className="flex gap-1">
                    <button
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page === 1}
                      className="p-1.5 rounded-lg border border-zinc-200 text-zinc-500 hover:bg-zinc-50 disabled:opacity-40 transition-all"
                    >
                      <ChevronLeft size={14} />
                    </button>
                    <button
                      onClick={() => setPage((p) => Math.min(list.totalPages, p + 1))}
                      disabled={page === list.totalPages}
                      className="p-1.5 rounded-lg border border-zinc-200 text-zinc-500 hover:bg-zinc-50 disabled:opacity-40 transition-all"
                    >
                      <ChevronRight size={14} />
                    </button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="px-5 py-12 text-center">
              <Users size={28} className="mx-auto text-zinc-300 mb-2" />
              <p className="text-sm text-zinc-400">Aucun élève trouvé</p>
            </div>
          )}
        </div>
      )}

      {/* Debtors tab */}
      {tab === 'debtors' && (
        <div className="bg-white rounded-xl border border-zinc-200 shadow-[0_1px_4px_rgba(0,0,0,0.06)] overflow-hidden">
          <div className="px-5 py-4 border-b border-zinc-100">
            <h3 className="text-sm font-semibold text-zinc-800">Élèves avec solde impayé</h3>
            <p className="text-xs text-zinc-400 mt-0.5">Triés par dette décroissante</p>
          </div>

          {debtorsLoading ? (
            <div className="divide-y divide-zinc-100">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="px-5 py-4 flex items-center gap-4">
                  <div className="w-8 h-8 rounded-full bg-zinc-100 animate-pulse" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3 w-40 bg-zinc-100 rounded animate-pulse" />
                    <div className="h-3 w-24 bg-zinc-100 rounded animate-pulse" />
                  </div>
                  <div className="h-5 w-20 bg-zinc-100 rounded animate-pulse" />
                </div>
              ))}
            </div>
          ) : debtors?.length ? (
            <div className="divide-y divide-zinc-100">
              {debtors.map((d, i) => (
                <div key={d.id} className="px-5 py-3.5 flex items-center gap-4 hover:bg-zinc-50 transition-colors">
                  <span className="text-xs font-mono text-zinc-400 w-5 tabular-nums">{i + 1}</span>
                  <div className="w-9 h-9 rounded-full bg-rose-100 flex items-center justify-center flex-shrink-0">
                    <span className="text-xs font-semibold text-rose-600">
                      {d.firstName[0]}{d.lastName[0]}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-zinc-800 truncate">
                      {d.firstName} {d.lastName}
                    </p>
                    <p className="text-xs text-zinc-400 truncate">
                      {d.class?.name ?? '—'} · {d.matricule ?? 'Pas de matricule'}
                    </p>
                  </div>
                  <span className="text-sm font-semibold text-rose-600 tabular-nums">
                    {fmt(Number(d.feesBalance))}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="px-5 py-12 text-center">
              <CheckCircle2 size={28} className="mx-auto text-emerald-400 mb-2" />
              <p className="text-sm text-zinc-500">Aucun débiteur — tous les élèves sont à jour</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

/* ─────────────────────────── student 360° view ─────────────────── */

function StudentView() {
  const [inputId, setInputId] = useState('')
  const [studentId, setStudentId] = useState(0)

  const { data: dashboard, isLoading: dashLoading, isError: dashError } = useStudentDashboard(studentId)
  const { data: activity, isLoading: actLoading } = useStudentActivity(studentId)
  const { data: dossier, isLoading: dossierLoading } = useStudentDossier(studentId)

  const handleSearch = () => {
    const id = parseInt(inputId, 10)
    if (!isNaN(id) && id > 0) setStudentId(id)
  }

  const activityIcons: Record<string, React.ElementType> = {
    PRESENCE: ScanLine,
    PAYMENT: Wallet,
    DISCIPLINE: ShieldAlert,
  }

  const activityColors: Record<string, string> = {
    PRESENCE: 'bg-indigo-50 text-indigo-600',
    PAYMENT: 'bg-emerald-50 text-emerald-600',
    DISCIPLINE: 'bg-rose-50 text-rose-600',
  }

  const dossierItems = dossier
    ? [
        { key: 'photo', label: 'Photo de profil', icon: Camera },
        { key: 'biometrics', label: 'Données biométriques', icon: Fingerprint },
        { key: 'verified', label: 'Vérifié physiquement', icon: BadgeCheck },
        { key: 'payment', label: 'Premier paiement effectué', icon: Wallet },
        { key: 'documents', label: 'Documents (acte de naissance)', icon: FileText },
      ]
    : []

  return (
    <div className="space-y-5">
      {/* Search */}
      <div className="bg-white rounded-xl border border-zinc-200 shadow-[0_1px_4px_rgba(0,0,0,0.06)] px-5 py-5">
        <p className="text-sm font-medium text-zinc-700 mb-3">Rechercher un élève par ID</p>
        <div className="flex gap-2">
          <input
            type="number"
            placeholder="Ex: 42"
            value={inputId}
            onChange={(e) => setInputId(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            className="w-48 px-3 py-2.5 text-sm border border-zinc-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400"
          />
          <button
            onClick={handleSearch}
            disabled={!inputId}
            className="px-4 py-2.5 text-sm font-medium bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-40 transition-colors"
          >
            Charger la fiche
          </button>
        </div>
      </div>

      {!studentId && (
        <div className="bg-white rounded-xl border border-zinc-200 shadow-[0_1px_4px_rgba(0,0,0,0.06)] px-8 py-16 text-center">
          <User size={36} className="mx-auto text-zinc-300 mb-3" />
          <p className="text-base font-medium text-zinc-500">Entrez l&apos;ID d&apos;un élève pour afficher sa fiche</p>
          <p className="text-sm text-zinc-400 mt-1">Dashboard 360° · Timeline · Complétude du dossier</p>
        </div>
      )}

      {studentId > 0 && dashError && (
        <div className="bg-white rounded-xl border border-red-200 shadow-[0_1px_4px_rgba(0,0,0,0.06)] px-5 py-5">
          <div className="flex items-center gap-3 text-red-600">
            <XCircle size={18} />
            <p className="text-sm font-medium">Élève introuvable ou accès refusé (ID {studentId})</p>
          </div>
        </div>
      )}

      {studentId > 0 && !dashError && (
        <>
          {/* Profile + stats */}
          {dashLoading ? (
            <div className="h-40 bg-zinc-100 rounded-xl animate-pulse" />
          ) : dashboard && (
            <>
              {/* Profile card */}
              <div className="bg-white rounded-xl border border-zinc-200 shadow-[0_1px_4px_rgba(0,0,0,0.06)] px-6 py-5 flex items-start gap-5">
                <div className="w-14 h-14 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0">
                  {dashboard.profile.photoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={dashboard.profile.photoUrl} alt="" className="w-14 h-14 rounded-full object-cover" />
                  ) : (
                    <span className="text-lg font-bold text-indigo-700">
                      {dashboard.profile.firstName[0]}{dashboard.profile.lastName[0]}
                    </span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-lg font-semibold text-zinc-900">
                      {dashboard.profile.firstName} {dashboard.profile.lastName}
                    </h3>
                    <span className={cn('px-2 py-0.5 text-xs rounded-full ring-1', statusBadge(dashboard.profile.status))}>
                      {dashboard.profile.status}
                    </span>
                    {dashboard.profile.isPaymentLocked && (
                      <span className="px-2 py-0.5 text-xs rounded-full bg-red-50 text-red-600 ring-1 ring-red-200">
                        Paiement verrouillé
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-zinc-500 mt-1">
                    {dashboard.profile.class?.name ?? 'Sans classe'} ·{' '}
                    {dashboard.profile.school?.name ?? '—'} ·{' '}
                    Matricule : <span className="font-mono text-zinc-700">{dashboard.profile.matricule ?? 'N/A'}</span>
                  </p>
                  {dashboard.profile.birthDate && (
                    <p className="text-xs text-zinc-400 mt-0.5">
                      Né(e) le {fmtDate(dashboard.profile.birthDate)} · {dashboard.profile.gender}
                    </p>
                  )}
                </div>
              </div>

              {/* Financial + attendance stats */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard
                  label="Taux de présence"
                  value={`${dashboard.stats.attendanceRate}%`}
                  icon={ScanLine}
                  color="indigo"
                />
                <StatCard
                  label="Total payé"
                  value={fmt(dashboard.stats.totalPaid, dashboard.stats.currency)}
                  icon={Wallet}
                  color="emerald"
                />
                <StatCard
                  label="Dette restante"
                  value={fmt(dashboard.stats.remainingDebt, dashboard.stats.currency)}
                  sub={dashboard.stats.isUpToDate ? 'À jour' : 'En retard'}
                  icon={AlertTriangle}
                  color={dashboard.stats.isUpToDate ? 'emerald' : 'rose'}
                />
                <StatCard
                  label="Biométrie"
                  value={dashboard.profile.biometricStatus ?? 'Non enrôlé'}
                  icon={Fingerprint}
                  color="amber"
                />
              </div>
            </>
          )}

          {/* Dossier completeness */}
          {dossierLoading ? (
            <div className="h-28 bg-zinc-100 rounded-xl animate-pulse" />
          ) : dossier && (
            <div className="bg-white rounded-xl border border-zinc-200 shadow-[0_1px_4px_rgba(0,0,0,0.06)] px-6 py-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h4 className="text-sm font-semibold text-zinc-800">Complétude du dossier</h4>
                  <p className="text-xs text-zinc-400 mt-0.5">{Math.round(dossier.completionRate)}% complet</p>
                </div>
                <span className={cn('px-2.5 py-1 text-xs font-semibold rounded-full', dossier.isReady ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200' : 'bg-amber-50 text-amber-700 ring-1 ring-amber-200')}>
                  {dossier.isReady ? 'Dossier complet' : 'Incomplet'}
                </span>
              </div>

              {/* Progress bar */}
              <div className="w-full h-2 bg-zinc-100 rounded-full mb-4 overflow-hidden">
                <div
                  className={cn('h-full rounded-full transition-all', dossier.isReady ? 'bg-emerald-500' : 'bg-amber-400')}
                  style={{ width: `${dossier.completionRate}%` }}
                />
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {dossierItems.map(({ key, label, icon: Icon }) => {
                  const ok = dossier.checks[key as keyof typeof dossier.checks]
                  return (
                    <div
                      key={key}
                      className={cn(
                        'flex items-center gap-2.5 px-3 py-2.5 rounded-lg border text-sm',
                        ok
                          ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                          : 'bg-zinc-50 border-zinc-200 text-zinc-400'
                      )}
                    >
                      <Icon size={14} className="flex-shrink-0" />
                      <span className="truncate text-xs">{label}</span>
                      {ok
                        ? <CheckCircle2 size={12} className="ml-auto flex-shrink-0 text-emerald-500" />
                        : <XCircle size={12} className="ml-auto flex-shrink-0 text-zinc-300" />
                      }
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Activity timeline */}
          <div className="bg-white rounded-xl border border-zinc-200 shadow-[0_1px_4px_rgba(0,0,0,0.06)] overflow-hidden">
            <div className="px-6 py-4 border-b border-zinc-100">
              <h4 className="text-sm font-semibold text-zinc-800">Timeline d&apos;activité</h4>
              <p className="text-xs text-zinc-400 mt-0.5">Présences, paiements, actions disciplinaires</p>
            </div>

            {actLoading ? (
              <div className="divide-y divide-zinc-100">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="px-6 py-4 flex items-center gap-4">
                    <div className="w-8 h-8 rounded-full bg-zinc-100 animate-pulse" />
                    <div className="flex-1 space-y-2">
                      <div className="h-3 w-40 bg-zinc-100 rounded animate-pulse" />
                      <div className="h-2 w-24 bg-zinc-100 rounded animate-pulse" />
                    </div>
                  </div>
                ))}
              </div>
            ) : activity?.length ? (
              <div className="divide-y divide-zinc-100">
                {activity.map((event, i) => {
                  const Icon = activityIcons[event.type] ?? ScanLine
                  const colorClass = activityColors[event.type] ?? 'bg-zinc-100 text-zinc-500'
                  return (
                    <div key={i} className="px-6 py-3.5 flex items-center gap-4 hover:bg-zinc-50 transition-colors">
                      <div className={cn('w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0', colorClass)}>
                        <Icon size={13} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-zinc-700 truncate">{event.title}</p>
                        <p className="text-xs text-zinc-400">{fmtDate(event.date)}</p>
                      </div>
                      <span className="text-xs text-zinc-300 tabular-nums">{event.type}</span>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="px-6 py-10 text-center">
                <p className="text-sm text-zinc-400">Aucune activité enregistrée</p>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}

/* ─────────────────────────── main page ─────────────────────────── */

export default function StudentsPage() {
  const [activeTab, setActiveTab] = useState<'school' | 'student'>('school')
  const [schoolId, setSchoolId] = useState(0)

  const { data: schools, isLoading: schoolsLoading } = useSchools()

  return (
    <div className="px-8 py-8 space-y-7 max-w-6xl mx-auto">
      {/* Header */}
      <motion.div
        className="flex items-center justify-between"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
      >
        <div>
          <h1 className="text-3xl font-bold text-zinc-900 tracking-tight">Gestion des élèves</h1>
          <p className="text-sm text-zinc-500 mt-1">Statistiques, liste paginée, débiteurs et fiches individuelles</p>
        </div>
        <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center shadow-sm">
          <GraduationCap size={18} className="text-white" />
        </div>
      </motion.div>

      {/* Main tab switch */}
      <div className="flex gap-1 bg-zinc-100 p-1 rounded-xl w-fit">
        <button
          onClick={() => setActiveTab('school')}
          className={cn('flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-all', activeTab === 'school' ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-500 hover:text-zinc-700')}
        >
          <Users size={14} />
          Vue par école
        </button>
        <button
          onClick={() => setActiveTab('student')}
          className={cn('flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-all', activeTab === 'student' ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-500 hover:text-zinc-700')}
        >
          <User size={14} />
          Fiche élève
        </button>
      </div>

      {/* School tab */}
      {activeTab === 'school' && (
        <>
          {/* School selector */}
          <div className="flex items-center gap-3">
            <label className="text-sm font-medium text-zinc-600 whitespace-nowrap">Établissement</label>
            {schoolsLoading ? (
              <div className="h-10 w-56 bg-zinc-100 rounded-lg animate-pulse" />
            ) : (
              <select
                value={schoolId}
                onChange={(e) => setSchoolId(Number(e.target.value))}
                className="px-3 py-2 text-sm border border-zinc-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 min-w-[220px]"
              >
                <option value={0}>Sélectionner un établissement</option>
                {schools?.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            )}
          </div>

          {!schoolId ? (
            <div className="bg-white rounded-xl border border-zinc-200 shadow-[0_1px_4px_rgba(0,0,0,0.06)] px-8 py-16 text-center">
              <GraduationCap size={36} className="mx-auto text-zinc-300 mb-3" />
              <p className="text-base font-medium text-zinc-500">Sélectionnez un établissement</p>
              <p className="text-sm text-zinc-400 mt-1">Statistiques et liste des élèves disponibles après sélection</p>
            </div>
          ) : (
            <SchoolView schoolId={schoolId} />
          )}
        </>
      )}

      {/* Student tab */}
      {activeTab === 'student' && <StudentView />}
    </div>
  )
}
