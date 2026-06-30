'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'

import { useRouter } from 'next/navigation'
import {
  GraduationCap, Search, CheckCircle, XCircle, Clock,
  ChevronLeft, ChevronRight, User, AlertTriangle, TrendingUp,
  Users, BookOpen} from 'lucide-react'
import {
  ResponsiveContainer, Tooltip,
  BarChart, Bar, XAxis, Cell,
} from 'recharts'
import { cn } from '@/lib/utils'
import {
  useStudents, useStudentDashboard,
  useStudentApplications, useApproveApplication, useRejectApplication,
} from '@/lib/hooks/use-admin'
import { StudentFinanceBadges } from '@/components/admin/students/student-finance-badges'
import { RowActionsMenu } from '@/components/admin/shared/row-actions-menu'
import { useToast } from '@/providers/toast-provider'
import type { StudentListItem } from '@/types/admin'

function Sk({ className }: { className?: string }) {
  return <div className={cn('rounded-xl bg-zinc-100 animate-pulse', className)} />
}

const STATUS_CFG: Record<string, { label: string; cls: string }> = {
  ACTIVE:     { label: 'Actif',        cls: 'bg-emerald-50 text-emerald-700' },
  INACTIVE:   { label: 'Inactif',      cls: 'bg-zinc-100 text-zinc-500' },
  SUSPENDED:  { label: 'Suspendu',     cls: 'bg-red-50 text-red-700' },
  PRE_ENROLL: { label: 'Pré-inscrit',  cls: 'bg-indigo-50 text-indigo-700' },
}

const APP_STATUS_CFG: Record<string, { label: string; cls: string }> = {
  PENDING:  { label: 'En attente', cls: 'bg-amber-50 text-amber-700' },
  APPROVED: { label: 'Approuvé',   cls: 'bg-emerald-50 text-emerald-700' },
  REJECTED: { label: 'Refusé',     cls: 'bg-red-50 text-red-700' },
}

type Tab = 'list' | 'applications'

/** Mini anneau SVG */
function RingProgress({ pct, color = '#10b981', size = 48 }: { pct: number; color?: string; size?: number }) {
  const r = (size - 6) / 2
  const circ = 2 * Math.PI * r
  const dash = Math.min(Math.max(pct, 0), 100) / 100 * circ
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="flex-shrink-0">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#f4f4f5" strokeWidth={5} />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={5}
        strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
        transform={`rotate(-90 ${size / 2} ${size / 2})`} />
      <text x={size / 2} y={size / 2 + 4} textAnchor="middle" fontSize={10} fontWeight={700} fill={color}>
        {Math.round(pct)}%
      </text>
    </svg>
  )
}

export default function StudentsPage() {
  const router = useRouter()
  const toast = useToast()
  const [tab, setTab] = useState<Tab>('list')
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [page, setPage] = useState(1)
  const [appFilter, setAppFilter] = useState<string>('PENDING')
  const [rejectId, setRejectId] = useState<number | null>(null)
  const [rejectReason, setRejectReason] = useState('')

  const limit = 20
  const { data: dashboard, isLoading: dashLoading } = useStudentDashboard()
  const { data: studentsData, isLoading: loadingStudents } = useStudents({
    search: debouncedSearch, page, limit,
  })
  const { data: applications, isLoading: loadingApps } = useStudentApplications({ status: appFilter })
  const applicationItems = applications?.data ?? []
  const approveMutation = useApproveApplication()
  const rejectMutation = useRejectApplication()

  function handleSearchKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') { setDebouncedSearch(search); setPage(1) }
  }

  const s = dashboard?.stats as any
  const live = dashboard?.liveMonitoring as any

  const students: StudentListItem[] = studentsData?.data ?? []
  const totalPages = studentsData?.totalPages ?? 1
  const total = studentsData?.total ?? 0

  const statusBarData = s ? [
    { label: 'Actifs',       value: s.activeCount    ?? 0, color: '#10b981' },
    { label: 'Inactifs',     value: s.inactiveCount  ?? 0, color: '#a1a1aa' },
    { label: 'Suspendus',    value: s.suspendedCount ?? 0, color: '#ef4444' },
    { label: 'Pré-inscrits', value: s.preEnrollCount ?? 0, color: '#6366f1' },
  ] : []

  async function handleApprove(id: number) {
    await approveMutation.mutateAsync(id)
  }

  async function handleReject() {
    if (rejectId === null) return
    await rejectMutation.mutateAsync({ id: rejectId, reason: rejectReason || undefined })
    setRejectId(null)
    setRejectReason('')
  }

  return (
    <div className="min-h-screen bg-zinc-50">
      <motion.div className="bg-white border-b border-zinc-200"
        initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
        <div className="max-w-6xl mx-auto px-8 py-6">
          <h1 className="text-2xl font-semibold text-zinc-900">Élèves</h1>
          <p className="text-sm text-zinc-400 mt-0.5">Gestion et suivi de l'effectif scolaire</p>
        </div>
      </motion.div>

      <div className="max-w-6xl mx-auto px-8 py-6 space-y-5">

        {/* KPI cards */}
        {dashLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {Array.from({ length: 4 }).map((_, i) => <Sk key={i} className="h-24" />)}
          </div>
        ) : s && (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: 'Total élèves',    value: s.totalStudents ?? '—',  icon: Users,         bg: 'bg-indigo-50',  iconCls: 'text-indigo-600' },
                { label: 'Actifs',          value: s.activeCount    ?? '—',  icon: CheckCircle,   bg: 'bg-emerald-50', iconCls: 'text-emerald-600' },
                { label: 'Inactifs',        value: s.inactiveCount  ?? '—',  icon: XCircle,       bg: 'bg-zinc-100',   iconCls: 'text-zinc-500' },
                { label: 'Suspendus',       value: s.suspendedCount ?? '—',  icon: AlertTriangle, bg: 'bg-red-50',     iconCls: 'text-red-600' },
              ].map(({ label, value, icon: Icon, bg, iconCls }) => (
                <div key={label} className="bg-white rounded-2xl border border-zinc-100 px-4 py-4 flex items-center gap-3 shadow-sm">
                  <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0', bg)}>
                    <Icon size={15} className={iconCls} />
                  </div>
                  <div>
                    <p className="text-[11px] text-zinc-400 uppercase tracking-wide">{label}</p>
                    <p className="text-xl font-bold text-zinc-900 leading-none tabular-nums mt-0.5">{value}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* KPIs présence + graphiques */}
            <div className="grid grid-cols-3 gap-4">
              {/* Taux de présence */}
              <div className="bg-white rounded-2xl border border-zinc-100 shadow-sm p-5 flex items-center gap-4">
                <RingProgress
                  pct={s.attendanceRate ?? 0}
                  color={s.attendanceRate >= 70 ? '#10b981' : s.attendanceRate >= 50 ? '#f59e0b' : '#ef4444'}
                  size={56}
                />
                <div>
                  <p className="text-xs text-zinc-400 mb-0.5">Taux de présence</p>
                  <p className="text-xl font-bold text-zinc-900">{s.attendanceRate ?? 0} %</p>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    {s.presentToday ?? 0} présents · {s.lateToday ?? 0} retards
                  </p>
                </div>
              </div>

              {/* Absents aujourd'hui */}
              <div className="bg-white rounded-2xl border border-zinc-100 shadow-sm p-5 flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center flex-shrink-0">
                  <Clock size={16} className="text-amber-600" />
                </div>
                <div className="flex-1">
                  <p className="text-xs text-zinc-400 mb-0.5">Absents aujourd'hui</p>
                  <p className="text-xl font-bold text-zinc-900">{Math.max(0, s.absentToday ?? 0)}</p>
                  <div className="mt-1.5 h-1.5 bg-zinc-100 rounded-full overflow-hidden">
                    <div className="h-full bg-amber-400 rounded-full"
                      style={{ width: s.activeCount > 0 ? `${Math.min(100, (Math.max(0, s.absentToday) / s.activeCount) * 100)}%` : '0%' }} />
                  </div>
                </div>
              </div>

              {/* Classes */}
              <div className="bg-white rounded-2xl border border-zinc-100 shadow-sm p-5 flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0">
                  <BookOpen size={16} className="text-blue-600" />
                </div>
                <div>
                  <p className="text-xs text-zinc-400 mb-0.5">Classes actives</p>
                  <p className="text-xl font-bold text-zinc-900">{s.totalClasses ?? '—'}</p>
                  {s.activeCount > 0 && s.totalClasses > 0 && (
                    <p className="text-xs text-zinc-400 mt-0.5">
                      ~{Math.round(s.activeCount / s.totalClasses)} élèves/classe
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Bar chart répartition statuts + pré-inscrits */}
            {statusBarData.some(d => d.value > 0) && (
              <div className="bg-white rounded-2xl border border-zinc-100 shadow-sm p-5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-semibold text-zinc-900">Répartition des statuts</h3>
                  {s.preEnrollCount > 0 && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-100">
                      {s.preEnrollCount} pré-inscrits en attente
                    </span>
                  )}
                </div>
                <div className="flex items-end gap-6">
                  <div className="flex-1" style={{ height: 80 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={statusBarData} barSize={28} margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
                        <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#71717a' }} axisLine={false} tickLine={false} />
                        <Tooltip
                          contentStyle={{ fontSize: 11, padding: '2px 8px', borderRadius: 6 }}
                          formatter={(v: number) => [v, 'Élèves']}
                          cursor={{ fill: '#f4f4f5' }}
                        />
                        <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                          {statusBarData.map((d, i) => <Cell key={i} fill={d.color} />)}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-xs">
                    {statusBarData.map(d => (
                      <div key={d.label} className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: d.color }} />
                        <span className="text-zinc-500">{d.label}</span>
                        <span className="font-semibold text-zinc-800 ml-1">{d.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Live monitoring: dernières présences */}
            {live?.liveFeed?.length > 0 && (
              <div className="bg-white rounded-2xl border border-zinc-100 shadow-sm p-5">
                <div className="flex items-center gap-2 mb-3">
                  <TrendingUp size={14} className="text-zinc-400" />
                  <h3 className="text-sm font-semibold text-zinc-900">Derniers pointages du jour</h3>
                  <span className="ml-auto text-xs text-zinc-400">{live.stats?.presentCount ?? 0} présents</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {live.liveFeed.slice(0, 12).map((p: any, i: number) => (
                    <div key={i} className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-zinc-50 border border-zinc-100 text-xs">
                      <div className={cn('w-1.5 h-1.5 rounded-full', p.status === 'PRESENT' ? 'bg-emerald-500' : 'bg-amber-400')} />
                      <span className="text-zinc-700">{p.student?.firstName} {p.student?.lastName}</span>
                      {p.student?.class?.name && <span className="text-zinc-400">· {p.student.class.name}</span>}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {/* Tabs */}
        <div className="flex gap-1 bg-zinc-100 rounded-xl p-1 w-fit">
          {([['list', 'Liste'], ['applications', 'Pré-inscriptions']] as [Tab, string][]).map(([t, label]) => (
            <button key={t} onClick={() => setTab(t)}
              className={cn('px-4 py-1.5 rounded-lg text-sm font-medium transition-colors',
                tab === t ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-500 hover:text-zinc-700')}>
              {label}
            </button>
          ))}
        </div>

        {/* LIST TAB */}
        {tab === 'list' && (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="relative flex-1 max-w-sm">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                <input value={search} onChange={e => setSearch(e.target.value)} onKeyDown={handleSearchKeyDown}
                  placeholder="Rechercher… (Entrée pour valider)"
                  className="w-full pl-9 pr-3 py-2 rounded-xl border border-zinc-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-200 focus:border-emerald-400" />
              </div>
              {total > 0 && <p className="text-sm text-zinc-400">{total} résultat{total !== 1 ? 's' : ''}</p>}
            </div>

            <div className="bg-white rounded-xl border border-zinc-200 shadow-[0_1px_4px_rgba(0,0,0,0.06)] overflow-hidden">
              {loadingStudents ? (
                <div className="p-4 space-y-3">{[...Array(6)].map((_, i) => <Sk key={i} className="h-14" />)}</div>
              ) : students.length > 0 ? (
                <>
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-zinc-100">
                        <th className="text-left text-xs font-semibold text-zinc-400 uppercase tracking-wide px-5 py-3">Élève</th>
                        <th className="text-left text-xs font-semibold text-zinc-400 uppercase tracking-wide px-5 py-3">Classe</th>
                        <th className="text-left text-xs font-semibold text-zinc-400 uppercase tracking-wide px-5 py-3">Statut</th>
                        <th className="text-left text-xs font-semibold text-zinc-400 uppercase tracking-wide px-5 py-3">Matricule</th>
                        <th className="px-5 py-3" />
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-50">
                      {students.map((s) => {
                        const sc = STATUS_CFG[s.status] ?? { label: s.status, cls: 'bg-zinc-100 text-zinc-500' }
                        return (
                          <tr key={s.id} className="hover:bg-zinc-50 transition-colors">
                            <td className="px-5 py-3">
                              <div className="flex items-center gap-2.5">
                                <div className="w-7 h-7 rounded-full bg-emerald-50 flex items-center justify-center flex-shrink-0">
                                  <User size={12} className="text-emerald-600" />
                                </div>
                                <div>
                                  <p className="text-sm font-medium text-zinc-900">{s.firstName} {s.lastName}</p>
                                  <StudentFinanceBadges className="mt-0.5" debtAmount={s.debtAmount}
                                    isPaymentLocked={s.isPaymentLocked} activeMoratoriumId={s.activeMoratoriumId}
                                    biometricStatus={s.biometricStatus} scholarshipPercent={s.scholarshipPercent} />
                                </div>
                              </div>
                            </td>
                            <td className="px-5 py-3 text-sm text-zinc-500">{s.className ?? '—'}</td>
                            <td className="px-5 py-3">
                              <span className={cn('text-xs font-medium px-2 py-0.5 rounded-full', sc.cls)}>{sc.label}</span>
                            </td>
                            <td className="px-5 py-3 text-sm text-zinc-400 font-mono">{s.matricule ?? '—'}</td>
                            <td className="px-5 py-3 text-right">
                              <RowActionsMenu actions={[
                                { id: 'view', label: 'Voir fiche', onClick: () => router.push(`/admin/students/${s.id}`) },
                                { id: 'balance', label: 'Modifier solde', onClick: () => router.push(`/admin/enrollments?studentId=${s.id}`) },
                                { id: 'card', label: 'Imprimer carte', onClick: () => {
                                  router.push(`/admin/students/${s.id}`)
                                  toast.info('Carte élève', 'Ouvrez la fiche et utilisez Imprimer (Ctrl+P) pour la carte.')
                                }},
                              ]} />
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                  {totalPages > 1 && (
                    <div className="flex items-center justify-center gap-3 px-5 py-3 border-t border-zinc-100">
                      <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                        className="p-1.5 rounded-lg border border-zinc-200 text-zinc-500 hover:bg-zinc-50 disabled:opacity-40 transition-colors">
                        <ChevronLeft size={14} />
                      </button>
                      <span className="text-sm text-zinc-500">Page {page} / {totalPages}</span>
                      <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                        className="p-1.5 rounded-lg border border-zinc-200 text-zinc-500 hover:bg-zinc-50 disabled:opacity-40 transition-colors">
                        <ChevronRight size={14} />
                      </button>
                    </div>
                  )}
                </>
              ) : (
                <div className="py-14 text-center">
                  <GraduationCap size={28} className="mx-auto text-zinc-200 mb-2" />
                  <p className="text-sm text-zinc-400">Aucun élève trouvé</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* APPLICATIONS TAB */}
        {tab === 'applications' && (
          <div className="space-y-4">
            <div className="flex gap-1 bg-zinc-100 rounded-xl p-1 w-fit">
              {(['PENDING', 'APPROVED', 'REJECTED'] as const).map((st) => {
                const cfg = APP_STATUS_CFG[st]
                return (
                  <button key={st} onClick={() => setAppFilter(st)}
                    className={cn('px-3 py-1.5 rounded-lg text-xs font-medium transition-colors',
                      appFilter === st ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-500 hover:text-zinc-700')}>
                    {cfg.label}
                  </button>
                )
              })}
            </div>

            <div className="bg-white rounded-xl border border-zinc-200 shadow-[0_1px_4px_rgba(0,0,0,0.06)] overflow-hidden">
              {loadingApps ? (
                <div className="p-4 space-y-3">{[...Array(4)].map((_, i) => <Sk key={i} className="h-16" />)}</div>
              ) : applicationItems.length ? (
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-zinc-100">
                      <th className="text-left text-xs font-semibold text-zinc-400 uppercase tracking-wide px-5 py-3">Candidat</th>
                      <th className="text-left text-xs font-semibold text-zinc-400 uppercase tracking-wide px-5 py-3">Contact</th>
                      <th className="text-left text-xs font-semibold text-zinc-400 uppercase tracking-wide px-5 py-3">Soumis le</th>
                      <th className="text-left text-xs font-semibold text-zinc-400 uppercase tracking-wide px-5 py-3">Statut</th>
                      {appFilter === 'PENDING' && <th className="px-5 py-3" />}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-50">
                    {applicationItems.map((app) => {
                      const cfg = APP_STATUS_CFG[app.status] ?? { label: app.status, cls: 'bg-zinc-100 text-zinc-500' }
                      return (
                        <tr key={app.id} className="hover:bg-zinc-50 transition-colors">
                          <td className="px-5 py-3 text-sm font-medium text-zinc-900">{app.firstName} {app.lastName}</td>
                          <td className="px-5 py-3 text-sm text-zinc-500">{app.email ?? app.phone ?? '—'}</td>
                          <td className="px-5 py-3 text-sm text-zinc-400">{new Date(app.submittedAt).toLocaleDateString('fr-FR')}</td>
                          <td className="px-5 py-3">
                            <span className={cn('text-xs font-medium px-2 py-0.5 rounded-full', cfg.cls)}>{cfg.label}</span>
                          </td>
                          {appFilter === 'PENDING' && (
                            <td className="px-5 py-3">
                              <div className="flex items-center gap-2">
                                <button onClick={() => handleApprove(app.id)} disabled={approveMutation.isPending}
                                  className="px-2.5 py-1 rounded-lg text-xs font-medium bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-colors">
                                  Approuver
                                </button>
                                <button onClick={() => setRejectId(app.id)}
                                  className="px-2.5 py-1 rounded-lg text-xs font-medium bg-red-50 text-red-600 hover:bg-red-100 transition-colors">
                                  Refuser
                                </button>
                              </div>
                            </td>
                          )}
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              ) : (
                <div className="py-14 text-center">
                  <Clock size={28} className="mx-auto text-zinc-200 mb-2" />
                  <p className="text-sm text-zinc-400">Aucune pré-inscription {appFilter === 'PENDING' ? 'en attente' : ''}</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Reject modal */}
      {rejectId !== null && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4">
            <h2 className="text-base font-semibold text-zinc-900">Motif de refus</h2>
            <textarea value={rejectReason} onChange={e => setRejectReason(e.target.value)} rows={3}
              placeholder="Motif (optionnel)"
              className="w-full px-3 py-2 rounded-lg border border-zinc-200 text-sm focus:outline-none focus:ring-2 focus:ring-red-200 focus:border-red-400 resize-none" />
            <div className="flex gap-3">
              <button onClick={() => { setRejectId(null); setRejectReason('') }}
                className="flex-1 px-4 py-2.5 rounded-xl border border-zinc-200 text-sm text-zinc-600 hover:bg-zinc-50 transition-colors">
                Annuler
              </button>
              <button onClick={handleReject} disabled={rejectMutation.isPending}
                className="flex-1 px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white text-sm font-medium transition-colors">
                Confirmer
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  )
}
