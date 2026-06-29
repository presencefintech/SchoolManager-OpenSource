'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  UserPlus, Plus, Lock, CheckCircle, Flag,
  Loader2, ChevronLeft, ChevronRight, Search, XCircle,
  PauseCircle, RefreshCw,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  useEnrollments, useEnrollmentDetail,
  useApproveEnrollment, useFinalizeEnrollment, useToggleLock, useSyncBalance,
} from '@/lib/hooks/use-admin'
import { getApiErrorMessage } from '@/lib/api/client'
import { SessionEnrollmentsTable } from '@/components/admin/enrollments/session-enrollments-table'
import { EnrollSessionDrawer, MoratoriumDrawer } from '@/components/admin/enrollments/enrollment-business-drawers'
import { EnrollmentCreateModal } from '@/components/admin/enrollments/enrollment-create-modal'
import { StudentFinanceBadges } from '@/components/admin/students/student-finance-badges'
import { RowActionsMenu } from '@/components/admin/shared/row-actions-menu'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { useToast } from '@/providers/toast-provider'
import type { EnrollmentListItem } from '@/types/admin'
import { fmtMoney } from '@/components/admin/finance/verification-ui'

function Sk({ className }: { className?: string }) {
  return <div className={cn('rounded-xl bg-zinc-100 animate-pulse', className)} />
}

const STATUS_CFG: Record<string, { label: string; cls: string }> = {
  ACTIVE:       { label: 'Actif',        cls: 'bg-emerald-50 text-emerald-700' },
  INACTIVE:     { label: 'Inactif',      cls: 'bg-zinc-100 text-zinc-500' },
  PRE_ENROLL:   { label: 'Pré-inscrit',  cls: 'bg-indigo-50 text-indigo-700' },
  PENDING_ENROLLMENT: { label: 'Pré-inscrit', cls: 'bg-indigo-50 text-indigo-700' },
  APPROVED:     { label: 'Approuvé',     cls: 'bg-teal-50 text-teal-700' },
  FINALIZED:    { label: 'Finalisé',     cls: 'bg-emerald-50 text-emerald-700' },
  SUSPENDED:    { label: 'Suspendu',     cls: 'bg-red-50 text-red-700' },
}

export default function EnrollmentsPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const toast = useToast()
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [page, setPage] = useState(1)
  const [showModal, setShowModal] = useState(false)
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [syncingId, setSyncingId] = useState<number | null>(null)
  const [showEnrollSession, setShowEnrollSession] = useState(false)
  const [showMoratorium, setShowMoratorium] = useState(false)
  const [lockConfirm, setLockConfirm] = useState<EnrollmentListItem | null>(null)
  const [syncConfirm, setSyncConfirm] = useState<{ studentId: number; name: string } | null>(null)

  const limit = 20
  const { data: enrollmentsData, isLoading } = useEnrollments({ search: debouncedSearch, page, limit })
  const { data: detail, isLoading: detailLoading } = useEnrollmentDetail(selectedId ?? 0)
  const { data: syncDetail } = useEnrollmentDetail(syncConfirm?.studentId ?? 0)
  const approveMutation = useApproveEnrollment()
  const finalizeMutation = useFinalizeEnrollment()
  const toggleLockMutation = useToggleLock()
  const syncMutation = useSyncBalance()

  const enrollments = enrollmentsData?.data ?? []
  const totalPages = enrollmentsData?.totalPages ?? 1
  const total = enrollmentsData?.total ?? 0

  useEffect(() => {
    const q = searchParams.get('search')
    const studentId = searchParams.get('studentId')
    if (q) { setSearch(q); setDebouncedSearch(q) }
    if (studentId) setSelectedId(Number(studentId))
  }, [searchParams])

  function handleSearchKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') { setDebouncedSearch(search); setPage(1) }
  }

  async function handleSync(enrollmentId: number) {
    setSyncingId(enrollmentId)
    try {
      await syncMutation.mutateAsync(enrollmentId)
      toast.success('Solde recalculé', 'Les montants ont été synchronisés avec les paiements.')
    } catch (err) {
      toast.error('Échec de la synchronisation', getApiErrorMessage(err))
    } finally {
      setSyncingId(null)
    }
  }

  async function confirmToggleLock() {
    if (!lockConfirm) return
    try {
      await toggleLockMutation.mutateAsync(lockConfirm.id)
      toast.success(
        lockConfirm.isLocked ? 'Dossier déverrouillé' : 'Dossier verrouillé',
        lockConfirm.isLocked ? 'Les actions sont à nouveau autorisées.' : 'Les modifications sont suspendues.',
      )
    } catch (err) {
      toast.error('Action impossible', getApiErrorMessage(err))
    } finally {
      setLockConfirm(null)
    }
  }

  async function confirmSyncBalance() {
    const enrollmentId = syncDetail?.enrollments?.[0]?.id ?? detail?.enrollments?.[0]?.id
    if (!enrollmentId) {
      toast.error('Synchronisation impossible', 'Aucune session active trouvée pour cet élève.')
      setSyncConfirm(null)
      return
    }
    await handleSync(enrollmentId)
    setSyncConfirm(null)
  }

  const selectedStudent = enrollments.find((e) => e.id === selectedId)
  const drawerStudentName = selectedStudent
    ? `${selectedStudent.firstName} ${selectedStudent.lastName}`
    : detail
      ? `${detail.firstName} ${detail.lastName}`
      : 'Élève'

  function openDetail(en: EnrollmentListItem) {
    setSelectedId(en.id)
  }

  return (
    <div className="min-h-screen bg-zinc-50">
      <motion.div
        className="bg-white border-b border-zinc-200"
        initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}
      >
        <div className="max-w-7xl mx-auto px-8 py-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-zinc-900">Inscriptions</h1>
            {total > 0 && <p className="text-sm text-zinc-400 mt-0.5">{total} élève{total !== 1 ? 's' : ''} inscrit{total !== 1 ? 's' : ''}</p>}
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium transition-colors"
          >
            <Plus size={15} />
            Nouvelle inscription
          </button>
        </div>
      </motion.div>

      <div className="max-w-7xl mx-auto px-8 py-6 space-y-4">
        <div className="relative max-w-sm">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            onKeyDown={handleSearchKeyDown}
            placeholder="Rechercher... (Entrée)"
            className="w-full pl-9 pr-3 py-2 rounded-xl border border-zinc-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-200 focus:border-emerald-400"
          />
        </div>

        <div className="bg-white rounded-xl border border-zinc-200 shadow-[0_1px_4px_rgba(0,0,0,0.06)] overflow-hidden">
          {isLoading ? (
            <div className="p-4 space-y-3">{[...Array(6)].map((_, i) => <Sk key={i} className="h-14" />)}</div>
          ) : enrollments.length ? (
            <>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[900px]">
                  <thead>
                    <tr className="border-b border-zinc-100">
                      <th className="text-left text-xs font-semibold text-zinc-400 uppercase tracking-wide px-5 py-3">Élève</th>
                      <th className="text-left text-xs font-semibold text-zinc-400 uppercase tracking-wide px-5 py-3">Classe</th>
                      <th className="text-right text-xs font-semibold text-zinc-400 uppercase tracking-wide px-5 py-3">Frais dus</th>
                      <th className="text-right text-xs font-semibold text-zinc-400 uppercase tracking-wide px-5 py-3">Payé</th>
                      <th className="text-right text-xs font-semibold text-zinc-400 uppercase tracking-wide px-5 py-3">Solde</th>
                      <th className="text-left text-xs font-semibold text-zinc-400 uppercase tracking-wide px-5 py-3">Statut</th>
                      <th className="px-5 py-3 text-right text-xs font-semibold text-zinc-400 uppercase tracking-wide">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-50">
                    {enrollments.map((en) => {
                      const sc = STATUS_CFG[en.status] ?? { label: en.status, cls: 'bg-zinc-100 text-zinc-500' }
                      const balance = en.feesBalance ?? (en.totalFees ?? 0) - (en.feesPaid ?? 0)
                      return (
                        <tr
                          key={en.id}
                          className="hover:bg-zinc-50 transition-colors cursor-pointer"
                          onClick={() => openDetail(en)}
                        >
                          <td className="px-5 py-3">
                            <p className="text-sm font-medium text-zinc-900">{en.firstName} {en.lastName}</p>
                            {en.matricule && <p className="text-xs text-zinc-400 font-mono mt-0.5">{en.matricule}</p>}
                            <StudentFinanceBadges
                              className="mt-1"
                              debtAmount={balance > 0 ? balance : undefined}
                              isPaymentLocked={en.isPaymentLocked}
                              activeMoratoriumId={en.activeMoratoriumId}
                              biometricStatus={en.biometricStatus}
                              scholarshipPercent={en.scholarshipPercent}
                            />
                          </td>
                          <td className="px-5 py-3 text-sm text-zinc-500">{en.className ?? '—'}</td>
                          <td className="px-5 py-3 text-sm text-right tabular-nums text-zinc-600">{fmtMoney(en.totalFees ?? 0)}</td>
                          <td className="px-5 py-3 text-sm text-right tabular-nums text-emerald-700">{fmtMoney(en.feesPaid ?? 0)}</td>
                          <td className={cn('px-5 py-3 text-sm text-right tabular-nums font-semibold', balance > 0 ? 'text-red-600' : 'text-emerald-700')}>
                            {fmtMoney(balance)}
                          </td>
                          <td className="px-5 py-3">
                            <div className="flex items-center gap-1.5">
                              <span className={cn('text-xs font-medium px-2 py-0.5 rounded-full', sc.cls)}>{sc.label}</span>
                              {en.isLocked && (
                                <span title="Dossier verrouillé">
                                  <Lock size={11} className="text-amber-500" />
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-5 py-3" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center justify-end gap-1.5">
                              {(en.status === 'PRE_ENROLL' || en.status === 'PENDING_ENROLLMENT') && (
                                <button
                                  onClick={() => approveMutation.mutate(en.id, {
                                    onSuccess: () => toast.success('Inscription approuvée'),
                                  })}
                                  disabled={approveMutation.isPending}
                                  title="Approuver"
                                  className="p-1.5 rounded-lg bg-teal-50 text-teal-600 hover:bg-teal-100 transition-colors"
                                >
                                  <CheckCircle size={13} />
                                </button>
                              )}
                              {en.status === 'APPROVED' && (
                                <button
                                  onClick={() => finalizeMutation.mutate(en.id, {
                                    onSuccess: () => toast.success('Inscription finalisée'),
                                  })}
                                  disabled={finalizeMutation.isPending}
                                  title="Finaliser"
                                  className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition-colors"
                                >
                                  <Flag size={13} />
                                </button>
                              )}
                              <RowActionsMenu
                                actions={[
                                  {
                                    id: 'view',
                                    label: 'Voir fiche',
                                    onClick: () => router.push(`/admin/students/${en.id}`),
                                  },
                                  {
                                    id: 'session',
                                    label: 'Inscrire à une session',
                                    onClick: () => { setSelectedId(en.id); setShowEnrollSession(true) },
                                  },
                                  {
                                    id: 'moratorium',
                                    label: 'Gérer le moratoire',
                                    onClick: () => { setSelectedId(en.id); setShowMoratorium(true) },
                                  },
                                  {
                                    id: 'sync',
                                    label: 'Modifier solde',
                                    onClick: () => {
                                      setSelectedId(en.id)
                                      setSyncConfirm({ studentId: en.id, name: `${en.firstName} ${en.lastName}` })
                                    },
                                  },
                                  {
                                    id: 'lock',
                                    label: en.isLocked ? 'Déverrouiller dossier' : 'Verrouiller dossier',
                                    onClick: () => setLockConfirm(en),
                                  },
                                ]}
                              />
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-3 px-5 py-3 border-t border-zinc-100">
                  <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                    className="p-1.5 rounded-lg border border-zinc-200 text-zinc-500 hover:bg-zinc-50 disabled:opacity-40">
                    <ChevronLeft size={14} />
                  </button>
                  <span className="text-sm text-zinc-500">Page {page} / {totalPages}</span>
                  <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                    className="p-1.5 rounded-lg border border-zinc-200 text-zinc-500 hover:bg-zinc-50 disabled:opacity-40">
                    <ChevronRight size={14} />
                  </button>
                </div>
              )}
            </>
          ) : (
            <div className="py-14 text-center">
              <UserPlus size={28} className="mx-auto text-zinc-200 mb-2" />
              <p className="text-sm text-zinc-400">Aucune inscription trouvée</p>
            </div>
          )}
        </div>
      </div>

      {/* Detail panel — sessions académiques */}
      <AnimatePresence>
        {selectedId != null && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/30 z-40"
              onClick={() => setSelectedId(null)}
            />
            <motion.aside
              initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 320 }}
              className="fixed top-0 right-0 h-full w-full max-w-lg bg-white shadow-2xl z-50 flex flex-col"
            >
              <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-100">
                <div>
                  <h2 className="text-base font-semibold text-zinc-900">Détail inscription</h2>
                  {detail && (
                    <p className="text-xs text-zinc-500">{detail.firstName} {detail.lastName} · {detail.matricule ?? '—'}</p>
                  )}
                </div>
                <button onClick={() => setSelectedId(null)} className="p-1.5 rounded-lg hover:bg-zinc-100 text-zinc-400">
                  <XCircle size={18} />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-5 space-y-5">
                {detailLoading ? (
                  <div className="space-y-3">{[...Array(4)].map((_, i) => <Sk key={i} className="h-12" />)}</div>
                ) : detail ? (
                  <>
                    <StudentFinanceBadges
                      debtAmount={(detail.feesBalance ?? 0) > 0 ? detail.feesBalance : undefined}
                      isPaymentLocked={detail.isPaymentLocked}
                      activeMoratoriumId={detail.activeMoratoriumId}
                      biometricStatus={detail.biometricStatus}
                      scholarshipPercent={detail.scholarshipPercent}
                    />
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { label: 'Total frais', value: detail.totalFees ?? 0 },
                        { label: 'Payé', value: detail.feesPaid ?? 0 },
                        { label: 'Solde', value: detail.feesBalance ?? 0 },
                      ].map(({ label, value }) => (
                        <div key={label} className="rounded-xl bg-zinc-50 border border-zinc-100 px-3 py-2.5">
                          <p className="text-[10px] text-zinc-400 uppercase tracking-wide">{label}</p>
                          <p className="text-sm font-bold tabular-nums text-zinc-900">{fmtMoney(value)}</p>
                        </div>
                      ))}
                    </div>
                    <div>
                      <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-3">Sessions académiques</h3>
                      <SessionEnrollmentsTable
                        enrollments={detail.enrollments ?? []}
                        onSync={handleSync}
                        syncingId={syncingId}
                        compact
                      />
                    </div>
                    <div className="flex flex-wrap gap-2 pt-2">
                      <button
                        type="button"
                        onClick={() => setShowEnrollSession(true)}
                        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-600 text-white text-xs font-medium hover:bg-emerald-700"
                      >
                        <UserPlus size={12} /> Inscrire à une session
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowMoratorium(true)}
                        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-indigo-200 text-indigo-700 text-xs font-medium hover:bg-indigo-50"
                      >
                        <PauseCircle size={12} /> Gérer le moratoire
                      </button>
                      {detail.enrollments?.[0]?.id && (
                        <button
                          type="button"
                          onClick={() => handleSync(detail.enrollments![0].id)}
                          disabled={syncingId != null}
                          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-zinc-200 text-zinc-600 text-xs font-medium hover:bg-zinc-50 disabled:opacity-50"
                        >
                          {syncingId != null ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
                          Recalculer solde
                        </button>
                      )}
                    </div>
                  </>
                ) : (
                  <p className="text-sm text-zinc-400">Impossible de charger le détail.</p>
                )}
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      <EnrollmentCreateModal
        open={showModal}
        onClose={() => setShowModal(false)}
      />

      {selectedId != null && (
        <>
          <EnrollSessionDrawer
            open={showEnrollSession}
            studentId={selectedId}
            studentName={drawerStudentName}
            onClose={() => setShowEnrollSession(false)}
          />
          <MoratoriumDrawer
            open={showMoratorium}
            studentId={selectedId}
            studentName={drawerStudentName}
            enrollmentId={detail?.enrollments?.[0]?.id ?? syncDetail?.enrollments?.[0]?.id}
            onClose={() => setShowMoratorium(false)}
          />
        </>
      )}

      <ConfirmDialog
        open={lockConfirm != null}
        title={lockConfirm?.isLocked ? 'Déverrouiller le dossier ?' : 'Verrouiller le dossier ?'}
        description={lockConfirm?.isLocked
          ? 'L\'élève pourra à nouveau être modifié et pointer sa présence.'
          : 'Les modifications du dossier seront bloquées jusqu\'au déverrouillage.'}
        impact={lockConfirm ? [`Élève : ${lockConfirm.firstName} ${lockConfirm.lastName}`] : []}
        confirmLabel={lockConfirm?.isLocked ? 'Déverrouiller' : 'Verrouiller'}
        variant={lockConfirm?.isLocked ? 'default' : 'danger'}
        loading={toggleLockMutation.isPending}
        onConfirm={confirmToggleLock}
        onCancel={() => setLockConfirm(null)}
      />

      <ConfirmDialog
        open={syncConfirm != null}
        title="Recalculer le solde ?"
        description="Cette action recalcule les frais dus, payés et le solde à partir des paiements enregistrés."
        impact={syncConfirm ? [`Élève : ${syncConfirm.name}`] : []}
        confirmLabel="Recalculer"
        loading={syncMutation.isPending}
        onConfirm={confirmSyncBalance}
        onCancel={() => setSyncConfirm(null)}
      />
    </div>
  )
}
