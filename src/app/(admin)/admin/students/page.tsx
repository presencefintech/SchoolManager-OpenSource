'use client'

import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  GraduationCap, CheckCircle, XCircle, Clock,
  ChevronLeft, ChevronRight, User, AlertTriangle, Wallet,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  useStudents, useStudentDashboard, useClasses,
  useStudentApplications, useApproveApplication, useRejectApplication, useDebtors,
} from '@/lib/hooks/use-admin'
import { formatMoney } from '@/lib/finance/currency'
import { AdminMultiCriteriaSearch } from '@/components/admin/shared/admin-multi-criteria-search'
import { useMultiCriteriaSearch } from '@/lib/hooks/use-multi-criteria-search'
import { StudentFinanceBadges } from '@/components/admin/students/student-finance-badges'
import { RowActionsMenu } from '@/components/admin/shared/row-actions-menu'
import { useToast } from '@/providers/toast-provider'
import type { StudentListItem } from '@/types/admin'

const STUDENT_FILTER_DEFAULTS = { search: '', status: '', classId: '' }

function Sk({ className }: { className?: string }) {
  return <div className={cn('rounded-xl bg-zinc-100 animate-pulse', className)} />
}

const STATUS_CFG: Record<string, { label: string; cls: string }> = {
  ACTIVE:     { label: 'Actif',        cls: 'bg-emerald-50 text-emerald-600' },
  INACTIVE:   { label: 'Inactif',      cls: 'bg-zinc-100 text-zinc-500' },
  SUSPENDED:  { label: 'Suspendu',     cls: 'bg-red-50 text-red-700' },
  PRE_ENROLL: { label: 'Pré-inscrit',  cls: 'bg-indigo-50 text-indigo-700' },
}

const APP_STATUS_CFG: Record<string, { label: string; cls: string }> = {
  PENDING:  { label: 'En attente', cls: 'bg-amber-50 text-amber-700' },
  APPROVED: { label: 'Approuvé',   cls: 'bg-emerald-50 text-emerald-700' },
  REJECTED: { label: 'Refusé',     cls: 'bg-red-50 text-red-700' },
}

type Tab = 'list' | 'applications' | 'debtors'

export default function StudentsPage() {
  const router = useRouter()
  const toast = useToast()
  const [tab, setTab] = useState<Tab>('list')
  const {
    draft: filterDraft,
    applied: filters,
    setField: setFilterField,
    apply: applyFilters,
    reset: resetFilters,
    removeFilter,
  } = useMultiCriteriaSearch(STUDENT_FILTER_DEFAULTS)
  const [page, setPage] = useState(1)
  const [appFilter, setAppFilter] = useState<string>('PENDING')
  const [rejectId, setRejectId] = useState<number | null>(null)
  const [rejectReason, setRejectReason] = useState('')

  const limit = 20
  const { data: dashboard } = useStudentDashboard()
  const { data: classes = [] } = useClasses()
  const { data: studentsData, isLoading: loadingStudents } = useStudents({
    search: filters.search ? String(filters.search) : undefined,
    status: filters.status ? String(filters.status) : undefined,
    classId: filters.classId ? Number(filters.classId) : undefined,
    page,
    limit,
  })
  const { data: applications, isLoading: loadingApps } = useStudentApplications({ status: appFilter })
  const applicationItems = applications?.data ?? []
  const approveMutation = useApproveApplication()
  const rejectMutation = useRejectApplication()
  const { data: debtors = [], isLoading: loadingDebtors } = useDebtors()

  function handleApplyFilters() {
    applyFilters()
    setPage(1)
  }

  function handleResetFilters() {
    resetFilters()
    setPage(1)
  }

  const filterChips = useMemo(() => {
    const chips: { id: string; label: string }[] = []
    if (filters.search) chips.push({ id: 'search', label: `Texte : ${filters.search}` })
    if (filters.status) {
      const label = STATUS_CFG[filters.status as string]?.label ?? filters.status
      chips.push({ id: 'status', label: `Statut : ${label}` })
    }
    if (filters.classId) {
      const name = classes.find((c) => c.id === Number(filters.classId))?.name ?? filters.classId
      chips.push({ id: 'classId', label: `Classe : ${name}` })
    }
    return chips
  }, [filters, classes])

  const stats = dashboard?.stats
  const students: StudentListItem[] = studentsData?.data ?? []
  const totalPages = studentsData?.totalPages ?? 1
  const total = studentsData?.total ?? 0

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
      <motion.div
        className="bg-white border-b border-zinc-200"
        initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}
      >
        <div className="max-w-6xl mx-auto px-8 py-6">
          <h1 className="text-2xl font-semibold text-zinc-900">Élèves</h1>
        </div>
      </motion.div>

      <div className="max-w-6xl mx-auto px-8 py-6 space-y-5">

        {/* Stats bar */}
        {stats && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'Total', value: stats.total, icon: GraduationCap, color: 'indigo' },
              { label: 'Actifs', value: stats.active, icon: CheckCircle, color: 'emerald' },
              { label: 'Inactifs', value: stats.inactive, icon: XCircle, color: 'zinc' },
              { label: 'Suspendu', value: stats.suspended, icon: AlertTriangle, color: 'red' },
            ].map(({ label, value, icon: Icon, color }) => (
              <div key={label} className="bg-white rounded-xl border border-zinc-200 px-4 py-3 flex items-center gap-3">
                <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center',
                  color === 'indigo' ? 'bg-indigo-50 text-indigo-600' :
                  color === 'emerald' ? 'bg-emerald-50 text-emerald-600' :
                  color === 'red' ? 'bg-red-50 text-red-600' : 'bg-zinc-100 text-zinc-500'
                )}>
                  <Icon size={15} />
                </div>
                <div>
                  <p className="text-[11px] text-zinc-400 uppercase tracking-wide">{label}</p>
                  <p className="text-lg font-bold text-zinc-900 leading-none tabular-nums">{value ?? '—'}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-1 bg-zinc-100 rounded-xl p-1 w-fit">
          {([['list', 'Liste'], ['applications', 'Pré-inscriptions'], ['debtors', 'Débiteurs']] as [Tab, string][]).map(([t, label]) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={cn(
                'px-4 py-1.5 rounded-lg text-sm font-medium transition-colors',
                tab === t ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-500 hover:text-zinc-700',
              )}
            >
              {label}
            </button>
          ))}
        </div>

        {/* LIST TAB */}
        {tab === 'list' && (
          <div className="space-y-4">
            <AdminMultiCriteriaSearch
              title="Rechercher un élève"
              primaryPlaceholder="Nom, prénom, matricule…"
              values={filterDraft}
              onChange={(id, value) => setFilterField(id as keyof typeof STUDENT_FILTER_DEFAULTS, value)}
              onApply={handleApplyFilters}
              onReset={handleResetFilters}
              activeChips={filterChips}
              onRemoveChip={(id) => {
                removeFilter(id as keyof typeof STUDENT_FILTER_DEFAULTS)
                setPage(1)
              }}
              resultCount={total}
              loading={loadingStudents}
              fields={[
                {
                  id: 'status',
                  type: 'select',
                  label: 'Statut',
                  options: Object.entries(STATUS_CFG).map(([value, { label }]) => ({ value, label })),
                },
                {
                  id: 'classId',
                  type: 'select',
                  label: 'Classe',
                  options: classes.map((c) => ({ value: String(c.id), label: c.name })),
                },
              ]}
            />

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
                                  <StudentFinanceBadges
                                    className="mt-0.5"
                                    debtAmount={s.debtAmount}
                                    isPaymentLocked={s.isPaymentLocked}
                                    activeMoratoriumId={s.activeMoratoriumId}
                                    biometricStatus={s.biometricStatus}
                                    scholarshipPercent={s.scholarshipPercent}
                                  />
                                </div>
                              </div>
                            </td>
                            <td className="px-5 py-3 text-sm text-zinc-500">{s.className ?? '—'}</td>
                            <td className="px-5 py-3">
                              <span className={cn('text-xs font-medium px-2 py-0.5 rounded-full', sc.cls)}>{sc.label}</span>
                            </td>
                            <td className="px-5 py-3 text-sm text-zinc-400 font-mono">{s.matricule ?? '—'}</td>
                            <td className="px-5 py-3 text-right">
                              <RowActionsMenu
                                actions={[
                                  {
                                    id: 'view',
                                    label: 'Voir fiche',
                                    onClick: () => router.push(`/admin/students/${s.id}`),
                                  },
                                  {
                                    id: 'balance',
                                    label: 'Modifier solde',
                                    onClick: () => router.push(`/admin/enrollments?studentId=${s.id}`),
                                  },
                                  {
                                    id: 'card',
                                    label: 'Imprimer carte',
                                    onClick: () => {
                                      router.push(`/admin/students/${s.id}`)
                                      toast.info('Carte élève', 'Ouvrez la fiche et utilisez Imprimer (Ctrl+P) pour la carte.')
                                    },
                                  },
                                ]}
                              />
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                  {totalPages > 1 && (
                    <div className="flex items-center justify-center gap-3 px-5 py-3 border-t border-zinc-100">
                      <button
                        onClick={() => setPage(p => Math.max(1, p - 1))}
                        disabled={page === 1}
                        className="p-1.5 rounded-lg border border-zinc-200 text-zinc-500 hover:bg-zinc-50 disabled:opacity-40 transition-colors"
                      >
                        <ChevronLeft size={14} />
                      </button>
                      <span className="text-sm text-zinc-500">Page {page} / {totalPages}</span>
                      <button
                        onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                        disabled={page === totalPages}
                        className="p-1.5 rounded-lg border border-zinc-200 text-zinc-500 hover:bg-zinc-50 disabled:opacity-40 transition-colors"
                      >
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
              {(['PENDING', 'APPROVED', 'REJECTED'] as const).map((s) => {
                const cfg = APP_STATUS_CFG[s]
                return (
                  <button
                    key={s}
                    onClick={() => setAppFilter(s)}
                    className={cn(
                      'px-3 py-1.5 rounded-lg text-xs font-medium transition-colors',
                      appFilter === s ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-500 hover:text-zinc-700',
                    )}
                  >
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
                          <td className="px-5 py-3 text-sm text-zinc-400">
                            {new Date(app.submittedAt).toLocaleDateString('fr-FR')}
                          </td>
                          <td className="px-5 py-3">
                            <span className={cn('text-xs font-medium px-2 py-0.5 rounded-full', cfg.cls)}>{cfg.label}</span>
                          </td>
                          {appFilter === 'PENDING' && (
                            <td className="px-5 py-3">
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => handleApprove(app.id)}
                                  disabled={approveMutation.isPending}
                                  className="px-2.5 py-1 rounded-lg text-xs font-medium bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-colors"
                                >
                                  Approuver
                                </button>
                                <button
                                  onClick={() => setRejectId(app.id)}
                                  className="px-2.5 py-1 rounded-lg text-xs font-medium bg-red-50 text-red-600 hover:bg-red-100 transition-colors"
                                >
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

        {/* DEBTORS TAB */}
        {tab === 'debtors' && (
          <div className="bg-white rounded-xl border border-zinc-200 shadow-[0_1px_4px_rgba(0,0,0,0.06)] overflow-hidden">
            {loadingDebtors ? (
              <div className="p-4 space-y-3">{[...Array(6)].map((_, i) => <Sk key={i} className="h-14" />)}</div>
            ) : debtors.length > 0 ? (
              <table className="w-full">
                <thead>
                  <tr className="border-b border-zinc-100">
                    <th className="text-left text-xs font-semibold text-zinc-400 uppercase tracking-wide px-5 py-3">Élève</th>
                    <th className="text-left text-xs font-semibold text-zinc-400 uppercase tracking-wide px-5 py-3">Classe</th>
                    <th className="text-right text-xs font-semibold text-zinc-400 uppercase tracking-wide px-5 py-3">Dû</th>
                    <th className="text-right text-xs font-semibold text-zinc-400 uppercase tracking-wide px-5 py-3">Payé</th>
                    <th className="text-right text-xs font-semibold text-zinc-400 uppercase tracking-wide px-5 py-3">Solde</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-50">
                  {debtors.map((d) => (
                    <tr
                      key={d.studentId}
                      className="hover:bg-zinc-50 transition-colors cursor-pointer"
                      onClick={() => router.push(`/admin/students/${d.studentId}`)}
                    >
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-full bg-red-50 flex items-center justify-center flex-shrink-0">
                            <Wallet size={12} className="text-red-500" />
                          </div>
                          <p className="text-sm font-medium text-zinc-900">{d.firstName} {d.lastName}</p>
                        </div>
                      </td>
                      <td className="px-5 py-3 text-sm text-zinc-500">{d.className ?? '—'}</td>
                      <td className="px-5 py-3 text-sm text-right tabular-nums text-zinc-600">{formatMoney(d.totalDue)}</td>
                      <td className="px-5 py-3 text-sm text-right tabular-nums text-emerald-700">{formatMoney(d.totalPaid)}</td>
                      <td className="px-5 py-3 text-sm text-right tabular-nums font-semibold text-red-600">{formatMoney(d.balance)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="py-14 text-center">
                <Wallet size={28} className="mx-auto text-zinc-200 mb-2" />
                <p className="text-sm text-zinc-400">Aucun débiteur</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Reject modal */}
      {rejectId !== null && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4"
          >
            <h2 className="text-base font-semibold text-zinc-900">Motif de refus</h2>
            <textarea
              value={rejectReason}
              onChange={e => setRejectReason(e.target.value)}
              rows={3}
              placeholder="Motif (optionnel)"
              className="w-full px-3 py-2 rounded-lg border border-zinc-200 text-sm focus:outline-none focus:ring-2 focus:ring-red-200 focus:border-red-400 resize-none"
            />
            <div className="flex gap-3">
              <button
                onClick={() => { setRejectId(null); setRejectReason('') }}
                className="flex-1 px-4 py-2.5 rounded-xl border border-zinc-200 text-sm text-zinc-600 hover:bg-zinc-50 transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={handleReject}
                disabled={rejectMutation.isPending}
                className="flex-1 px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white text-sm font-medium transition-colors"
              >
                Confirmer
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  )
}
