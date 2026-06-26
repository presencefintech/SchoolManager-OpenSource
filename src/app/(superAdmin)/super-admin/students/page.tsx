'use client'

import { Suspense, useState, useEffect, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useQueryClient } from '@tanstack/react-query'
import {
  GraduationCap, Search, Users, Clock, BarChart3, BookOpen,
  AlertTriangle, CheckCircle2, RefreshCw, ChevronLeft, ChevronRight, ChevronRight as RowChevron,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useSchools, useStudentSchoolStats, useStudentList, useStudentDebtors } from '@/lib/hooks/use-super-admin'
import { superAdminApi } from '@/lib/superAdmin/api'
import { securityApi } from '@/lib/superAdmin/api/security.api'
import { StudentDetailPanel } from '@/components/super-admin/students/student-detail-panel'
import { fmtCurrency, statusBadgeClass } from '@/components/super-admin/students/student-utils'

/* ─────────────────────────── sub-components ─────────────────── */

function StatCard({
  label, value, sub, icon: Icon, color = 'indigo',
}: {
  label: string; value: string | number; sub?: string
  icon: React.ElementType; color?: 'indigo' | 'emerald' | 'amber' | 'rose'
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

function SchoolView({
  schoolId,
  selectedStudentId,
  onSelectStudent,
}: {
  schoolId: number
  selectedStudentId: number
  onSelectStudent: (studentId: number) => void
}) {
  const [tab, setTab] = useState<'list' | 'debtors'>('list')
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [page, setPage] = useState(1)
  const [invalidating, setInvalidating] = useState(false)
  const qc = useQueryClient()

  useEffect(() => {
    const t = setTimeout(() => { setDebouncedSearch(search); setPage(1) }, 400)
    return () => clearTimeout(t)
  }, [search])

  const { data: stats, isLoading: statsLoading } = useStudentSchoolStats(schoolId)
  const { data: list, isLoading: listLoading } = useStudentList(schoolId, {
    page,
    limit: 20,
    search: debouncedSearch || undefined,
  })
  const { data: debtors, isLoading: debtorsLoading } = useStudentDebtors(schoolId)

  const handleInvalidate = async () => {
    setInvalidating(true)
    try {
      await superAdminApi.invalidateStats(schoolId)
      qc.invalidateQueries({ queryKey: ['superadmin', 'students', 'stats', schoolId] })
    } finally {
      setInvalidating(false)
    }
  }

  const rowCls = (id: number) => cn(
    'w-full text-left px-5 py-3.5 flex items-center gap-4 transition-colors cursor-pointer group',
    selectedStudentId === id
      ? 'bg-indigo-50/80 ring-1 ring-inset ring-indigo-200'
      : 'hover:bg-zinc-50',
  )

  return (
    <div className="space-y-5">
      {statsLoading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <div key={i} className="h-24 bg-zinc-100 rounded-xl animate-pulse" />)}
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

      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex gap-1 bg-zinc-100 p-1 rounded-xl">
          <button
            type="button"
            onClick={() => setTab('list')}
            className={cn('px-4 py-2 rounded-lg text-sm font-medium transition-all', tab === 'list' ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-500 hover:text-zinc-700')}
          >
            Liste des élèves
          </button>
          <button
            type="button"
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
          type="button"
          onClick={handleInvalidate}
          disabled={invalidating}
          className="flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm text-zinc-500 border border-zinc-200 bg-white hover:bg-zinc-50 transition-all disabled:opacity-50"
        >
          <RefreshCw size={13} className={invalidating ? 'animate-spin' : ''} />
          Invalider le cache
        </button>
      </div>

      {tab === 'list' && (
        <div className="bg-white rounded-xl border border-zinc-200 shadow-[0_1px_4px_rgba(0,0,0,0.06)] overflow-hidden">
          <div className="px-5 py-4 border-b border-zinc-100 flex items-center gap-3">
            <div className="relative flex-1 max-w-xs">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
              <input
                type="text"
                placeholder="Nom, prénom, matricule..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
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
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => onSelectStudent(s.id)}
                    className={rowCls(s.id)}
                  >
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
                      <span className={cn('px-2 py-0.5 text-xs rounded-full ring-1', statusBadgeClass(s.status))}>
                        {s.status}
                      </span>
                      {s.isPaymentLocked && (
                        <span className="px-2 py-0.5 text-xs rounded-full bg-red-50 text-red-600 ring-1 ring-red-200">
                          Verrouillé
                        </span>
                      )}
                      <RowChevron size={14} className="text-zinc-300 group-hover:text-indigo-400 transition-colors" />
                    </div>
                  </button>
                ))}
              </div>

              {list.totalPages > 1 && (
                <div className="px-5 py-3 border-t border-zinc-100 flex items-center justify-between">
                  <p className="text-xs text-zinc-400 tabular-nums">Page {list.page} / {list.totalPages}</p>
                  <div className="flex gap-1">
                    <button type="button" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="p-1.5 rounded-lg border border-zinc-200 text-zinc-500 hover:bg-zinc-50 disabled:opacity-40">
                      <ChevronLeft size={14} />
                    </button>
                    <button type="button" onClick={() => setPage((p) => Math.min(list.totalPages, p + 1))} disabled={page === list.totalPages} className="p-1.5 rounded-lg border border-zinc-200 text-zinc-500 hover:bg-zinc-50 disabled:opacity-40">
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

      {tab === 'debtors' && (
        <div className="bg-white rounded-xl border border-zinc-200 shadow-[0_1px_4px_rgba(0,0,0,0.06)] overflow-hidden">
          <div className="px-5 py-4 border-b border-zinc-100">
            <h3 className="text-sm font-semibold text-zinc-800">Élèves avec solde impayé</h3>
            <p className="text-xs text-zinc-400 mt-0.5">Cliquez sur une ligne pour ouvrir la fiche</p>
          </div>

          {debtorsLoading ? (
            <div className="divide-y divide-zinc-100">
              {[...Array(4)].map((_, i) => <div key={i} className="h-16 bg-zinc-50 animate-pulse" />)}
            </div>
          ) : debtors?.length ? (
            <div className="divide-y divide-zinc-100">
              {debtors.map((d, i) => (
                <button
                  key={d.id}
                  type="button"
                  onClick={() => onSelectStudent(d.id)}
                  className={rowCls(d.id)}
                >
                  <span className="text-xs font-mono text-zinc-400 w-5 tabular-nums">{i + 1}</span>
                  <div className="w-9 h-9 rounded-full bg-rose-100 flex items-center justify-center flex-shrink-0">
                    <span className="text-xs font-semibold text-rose-600">{d.firstName[0]}{d.lastName[0]}</span>
                  </div>
                  <div className="flex-1 min-w-0 text-left">
                    <p className="text-sm font-medium text-zinc-800 truncate">{d.firstName} {d.lastName}</p>
                    <p className="text-xs text-zinc-400 truncate">{d.class?.name ?? '—'} · {d.matricule ?? 'Pas de matricule'}</p>
                  </div>
                  <span className="text-sm font-semibold text-rose-600 tabular-nums">{fmtCurrency(Number(d.feesBalance))}</span>
                  <RowChevron size={14} className="text-zinc-300 group-hover:text-indigo-400" />
                </button>
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

/* ─────────────────────────── main (URL state) ─────────────────── */

function StudentsPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const schoolId = Number(searchParams.get('schoolId')) || 0
  const studentId = Number(searchParams.get('studentId')) || 0

  const { data: schools, isLoading: schoolsLoading } = useSchools()

  const pushParams = useCallback((mutate: (p: URLSearchParams) => void) => {
    const p = new URLSearchParams(searchParams.toString())
    mutate(p)
    const q = p.toString()
    router.push(q ? `/super-admin/students?${q}` : '/super-admin/students', { scroll: false })
  }, [router, searchParams])

  const setSchoolId = (id: number) => {
    pushParams((p) => {
      if (id) p.set('schoolId', String(id))
      else p.delete('schoolId')
      p.delete('studentId')
    })
  }

  const openStudent = (id: number) => {
    if (!schoolId) return
    pushParams((p) => {
      p.set('schoolId', String(schoolId))
      p.set('studentId', String(id))
    })
    void securityApi.auditPIIAccess({
      studentId: id,
      schoolId,
      dataType: 'PERSONAL_DOCS',
    }).catch(() => undefined)
  }

  const closePanel = useCallback(() => {
    pushParams((p) => { p.delete('studentId') })
  }, [pushParams])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && studentId > 0) closePanel()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [studentId, closePanel])

  return (
    <div className="min-h-screen bg-gradient-to-b from-zinc-50 via-white to-zinc-50/80">
      {/* Hero */}
      <div className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-indigo-500/20 via-transparent to-transparent" />
        <div className="relative max-w-6xl mx-auto px-8 pt-8 pb-10">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-white/10 border border-white/10 flex items-center justify-center">
                <GraduationCap size={22} className="text-indigo-200" />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Gestion des élèves</h1>
                <p className="text-sm text-indigo-200/70 mt-1">
                  Liste par établissement · fiche 360° au clic · audit des consultations
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-8 -mt-4 pb-10 space-y-6">
        <div className="flex items-center gap-3 bg-white rounded-xl border border-zinc-200/80 shadow-sm px-4 py-3">
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
            <p className="text-sm text-zinc-400 mt-1">Liste, débiteurs et fiches individuelles au clic</p>
          </div>
        ) : (
          <SchoolView
            schoolId={schoolId}
            selectedStudentId={studentId}
            onSelectStudent={openStudent}
          />
        )}

        <StudentDetailPanel
          studentId={studentId}
          schoolId={schoolId}
          open={studentId > 0 && schoolId > 0}
          onClose={closePanel}
        />
      </div>
    </div>
  )
}

export default function StudentsPage() {
  return (
    <Suspense fallback={
      <div className="px-8 py-8 max-w-6xl mx-auto">
        <div className="h-10 w-64 bg-zinc-100 rounded-lg animate-pulse mb-8" />
        <div className="h-96 bg-zinc-100 rounded-xl animate-pulse" />
      </div>
    }>
      <StudentsPageContent />
    </Suspense>
  )
}
