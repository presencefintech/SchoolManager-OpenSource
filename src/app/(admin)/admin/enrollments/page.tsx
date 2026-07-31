'use client'

import { Suspense, useState, useEffect, useMemo } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  UserPlus, Plus, Lock, CheckCircle, Flag,
  Loader2, ChevronLeft, ChevronRight, XCircle,
  PauseCircle, RefreshCw,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatRdcFullName, formatStudentFullName } from '@/lib/utils/student-name.util'
import {
  useEnrollments, useEnrollmentDetail, useClasses,
  useApproveEnrollment, useFinalizeEnrollment, useToggleLock, useSyncBalance,
  usePromoteStudent, useUpdateEnrollment, useTransferEnrollment, useSetReminderPause, usePurgeEnrollment,
} from '@/lib/hooks/use-admin'
import { AdminMultiCriteriaSearch } from '@/components/admin/shared/admin-multi-criteria-search'
import { useMultiCriteriaSearch } from '@/lib/hooks/use-multi-criteria-search'
import { getApiErrorMessage } from '@/lib/api/client'
import { SessionEnrollmentsTable } from '@/components/admin/enrollments/session-enrollments-table'
import { EnrollSessionDrawer, RentreePackDrawer, MoratoriumDrawer } from '@/components/admin/enrollments/enrollment-business-drawers'
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

const ENROLLMENT_FILTER_DEFAULTS = { search: '', status: '', balance: '' }

function PromoteModal({ enrollment, onClose }: { enrollment: EnrollmentListItem; onClose: () => void }) {
  const toast = useToast()
  const { data: classes = [] } = useClasses()
  const { mutate, isPending } = usePromoteStudent()
  const [classId, setClassId] = useState<number | ''>('')
  const [error, setError] = useState('')

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!classId) { setError('Sélectionnez une classe cible'); return }
    mutate({ studentId: enrollment.id, newClassId: Number(classId) }, {
      onSuccess: () => { toast.success('Élève promu'); onClose() },
      onError: (err) => setError(getApiErrorMessage(err)),
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 mx-4">
        <h2 className="text-lg font-semibold text-zinc-900 mb-1">Promouvoir l'élève</h2>
        <p className="text-sm text-zinc-500 mb-5">{formatStudentFullName(enrollment)}</p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-zinc-500 mb-1">Classe cible</label>
            <select
              required
              value={classId}
              onChange={(e) => setClassId(Number(e.target.value))}
              className="w-full px-3 py-2 rounded-lg border border-zinc-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
            >
              <option value="">Sélectionner...</option>
              {classes.filter((c) => c.id !== enrollment.classId && c.isActive).map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          {error && <p className="text-xs text-red-500 bg-red-50 rounded-lg px-3 py-2">{error}</p>}
          <div className="flex gap-2">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-2 rounded-xl border border-zinc-200 text-sm text-zinc-600 hover:bg-zinc-50">Annuler</button>
            <button type="submit" disabled={isPending} className="flex-1 px-4 py-2 rounded-xl bg-emerald-600 text-sm text-white font-medium hover:bg-emerald-700 disabled:opacity-50">
              {isPending ? 'En cours...' : 'Promouvoir'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function UpdateEnrollmentModal({ enrollment, onClose }: { enrollment: EnrollmentListItem; onClose: () => void }) {
  const toast = useToast()
  const { data: classes = [] } = useClasses()
  const { mutate, isPending } = useUpdateEnrollment()
  const [classId, setClassId] = useState<number | ''>(enrollment.classId ?? '')
  const [scholarshipPercent, setScholarshipPercent] = useState<number | ''>(enrollment.scholarshipPercent ?? '')
  const [error, setError] = useState('')

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    mutate({
      studentId: enrollment.id,
      payload: {
        classId: classId === '' ? undefined : Number(classId),
        scholarshipPercent: scholarshipPercent === '' ? undefined : Number(scholarshipPercent),
      },
    }, {
      onSuccess: () => { toast.success('Inscription modifiée'); onClose() },
      onError: (err) => setError(getApiErrorMessage(err)),
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 mx-4">
        <h2 className="text-lg font-semibold text-zinc-900 mb-1">Modifier l'inscription</h2>
        <p className="text-sm text-zinc-500 mb-5">{formatStudentFullName(enrollment)}</p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-zinc-500 mb-1">Classe</label>
            <select
              value={classId}
              onChange={(e) => setClassId(e.target.value === '' ? '' : Number(e.target.value))}
              className="w-full px-3 py-2 rounded-lg border border-zinc-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
            >
              <option value="">Sélectionner...</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-500 mb-1">Bourse (%)</label>
            <input
              type="number" min={0} max={100}
              value={scholarshipPercent}
              onChange={(e) => setScholarshipPercent(e.target.value === '' ? '' : Number(e.target.value))}
              className="w-full px-3 py-2 rounded-lg border border-zinc-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
            />
          </div>
          {error && <p className="text-xs text-red-500 bg-red-50 rounded-lg px-3 py-2">{error}</p>}
          <div className="flex gap-2">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-2 rounded-xl border border-zinc-200 text-sm text-zinc-600 hover:bg-zinc-50">Annuler</button>
            <button type="submit" disabled={isPending} className="flex-1 px-4 py-2 rounded-xl bg-emerald-600 text-sm text-white font-medium hover:bg-emerald-700 disabled:opacity-50">
              {isPending ? 'En cours...' : 'Enregistrer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function TransferEnrollmentModal({ enrollment, onClose }: { enrollment: EnrollmentListItem; onClose: () => void }) {
  const toast = useToast()
  const { mutate, isPending } = useTransferEnrollment()
  const [targetSchoolId, setTargetSchoolId] = useState('')
  const [newClassId, setNewClassId] = useState('')
  const [error, setError] = useState('')

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!targetSchoolId) { setError('Indiquez l\'identifiant de l\'école cible'); return }
    mutate({
      studentId: enrollment.id,
      targetSchoolId: Number(targetSchoolId),
      newClassId: newClassId ? Number(newClassId) : undefined,
    }, {
      onSuccess: () => { toast.success('Transfert effectué'); onClose() },
      onError: (err) => setError(getApiErrorMessage(err)),
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 mx-4">
        <h2 className="text-lg font-semibold text-zinc-900 mb-1">Transférer vers une autre école</h2>
        <p className="text-sm text-zinc-500 mb-5">{formatStudentFullName(enrollment)}</p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-zinc-500 mb-1">Identifiant école cible</label>
            <input
              type="number" min={1} required
              value={targetSchoolId}
              onChange={(e) => setTargetSchoolId(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-zinc-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-500 mb-1">Classe cible (optionnel)</label>
            <input
              type="number" min={1}
              value={newClassId}
              onChange={(e) => setNewClassId(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-zinc-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
            />
          </div>
          {error && <p className="text-xs text-red-500 bg-red-50 rounded-lg px-3 py-2">{error}</p>}
          <div className="flex gap-2">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-2 rounded-xl border border-zinc-200 text-sm text-zinc-600 hover:bg-zinc-50">Annuler</button>
            <button type="submit" disabled={isPending} className="flex-1 px-4 py-2 rounded-xl bg-blue-600 text-sm text-white font-medium hover:bg-blue-700 disabled:opacity-50">
              {isPending ? 'Transfert...' : 'Transférer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function EnrollmentsPage() {
  return (
    <Suspense fallback={null}>
      <EnrollmentsPageContent />
    </Suspense>
  )
}

function EnrollmentsPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const toast = useToast()
  const {
    draft: filterDraft,
    applied: filters,
    setField: setFilterField,
    apply: applyFilters,
    reset: resetFilters,
    removeFilter,
    applyValues,
  } = useMultiCriteriaSearch(ENROLLMENT_FILTER_DEFAULTS)
  const [page, setPage] = useState(1)
  const [showModal, setShowModal] = useState(false)
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [syncingId, setSyncingId] = useState<number | null>(null)
  const [showEnrollSession, setShowEnrollSession] = useState(false)
  const [showRentreePack, setShowRentreePack] = useState(false)
  const [showMoratorium, setShowMoratorium] = useState(false)
  const [lockConfirm, setLockConfirm] = useState<EnrollmentListItem | null>(null)
  const [syncConfirm, setSyncConfirm] = useState<{ studentId: number; name: string } | null>(null)
  const [promoteTarget, setPromoteTarget] = useState<EnrollmentListItem | null>(null)
  const [updateTarget, setUpdateTarget] = useState<EnrollmentListItem | null>(null)
  const [transferTarget, setTransferTarget] = useState<EnrollmentListItem | null>(null)
  const [purgeConfirm, setPurgeConfirm] = useState<EnrollmentListItem | null>(null)
  const [purgeToken, setPurgeToken] = useState('')

  const limit = 20
  const { data: enrollmentsData, isLoading } = useEnrollments({
    search: filters.search ? String(filters.search) : undefined,
    status: filters.status ? String(filters.status) : undefined,
    page,
    limit,
  })
  const { data: detail, isLoading: detailLoading } = useEnrollmentDetail(selectedId ?? 0)
  const { data: syncDetail } = useEnrollmentDetail(syncConfirm?.studentId ?? 0)
  const approveMutation = useApproveEnrollment()
  const finalizeMutation = useFinalizeEnrollment()
  const toggleLockMutation = useToggleLock()
  const syncMutation = useSyncBalance()
  const reminderPauseMutation = useSetReminderPause()
  const purgeMutation = usePurgeEnrollment()

  const enrollmentsRaw = enrollmentsData?.data ?? []
  const enrollments = useMemo(() => {
    const bal = String(filters.balance ?? '')
    if (!bal) return enrollmentsRaw
    return enrollmentsRaw.filter((en) => {
      const balance = en.feesBalance ?? (en.totalFees ?? 0) - (en.feesPaid ?? 0)
      if (bal === 'debt') return balance > 0
      if (bal === 'clear') return balance <= 0
      if (bal === 'locked') return en.isLocked
      return true
    })
  }, [enrollmentsRaw, filters.balance])
  const totalPages = enrollmentsData?.totalPages ?? 1
  const total = enrollmentsData?.total ?? 0

  useEffect(() => {
    const q = searchParams.get('search')
    const studentId = searchParams.get('studentId')
    if (q) applyValues({ ...ENROLLMENT_FILTER_DEFAULTS, search: q })
    if (studentId) setSelectedId(Number(studentId))
  }, [searchParams, applyValues])

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
    if (filters.balance === 'debt') chips.push({ id: 'balance', label: 'Avec solde dû' })
    if (filters.balance === 'clear') chips.push({ id: 'balance', label: 'Soldé' })
    if (filters.balance === 'locked') chips.push({ id: 'balance', label: 'Dossier verrouillé' })
    return chips
  }, [filters])

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
      await toggleLockMutation.mutateAsync({
        studentId: lockConfirm.id,
        isLocked: !lockConfirm.isLocked,
      })
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

  async function confirmPurge() {
    if (!purgeConfirm) return
    try {
      await purgeMutation.mutateAsync({ studentId: purgeConfirm.id, confirmationToken: purgeToken })
      toast.success('Dossier purgé', 'Les données ont été supprimées définitivement.')
    } catch (err) {
      toast.error('Purge impossible', getApiErrorMessage(err))
    } finally {
      setPurgeConfirm(null)
      setPurgeToken('')
    }
  }

  const selectedStudent = enrollments.find((e) => e.id === selectedId)
  const drawerStudentName = selectedStudent
    ? formatRdcFullName(selectedStudent)
    : detail
      ? formatRdcFullName(detail)
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
        <AdminMultiCriteriaSearch
          title="Rechercher une inscription"
          primaryPlaceholder="Nom, prénom, matricule…"
          values={filterDraft}
          onChange={(id, value) => setFilterField(id as keyof typeof ENROLLMENT_FILTER_DEFAULTS, value)}
          onApply={handleApplyFilters}
          onReset={handleResetFilters}
          activeChips={filterChips}
          onRemoveChip={(id) => {
            removeFilter(id as keyof typeof ENROLLMENT_FILTER_DEFAULTS)
            setPage(1)
          }}
          resultCount={enrollments.length}
          loading={isLoading}
          fields={[
            {
              id: 'status',
              type: 'select',
              label: 'Statut dossier',
              options: [
                { value: 'ACTIVE', label: 'Actif' },
                { value: 'PRE_ENROLL', label: 'Pré-inscrit' },
                { value: 'APPROVED', label: 'Approuvé' },
                { value: 'FINALIZED', label: 'Finalisé' },
                { value: 'SUSPENDED', label: 'Suspendu' },
                { value: 'INACTIVE', label: 'Inactif' },
              ],
            },
            {
              id: 'balance',
              type: 'select',
              label: 'Situation financière',
              options: [
                { value: 'debt', label: 'Solde dû' },
                { value: 'clear', label: 'Soldé' },
                { value: 'locked', label: 'Dossier verrouillé' },
              ],
            },
          ]}
        />

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
                            <p className="text-sm font-medium text-zinc-900">{formatStudentFullName(en)}</p>
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
                                    onSuccess: (res) => {
                                      const pack = res.data?.explicitFeePack
                                      if (pack?.assigned?.length) {
                                        toast.success(
                                          'Inscription approuvée',
                                          `${pack.assigned.length} barème(s) EXPLICIT appliqués.`,
                                        )
                                      } else {
                                        toast.success('Inscription approuvée')
                                      }
                                      if (pack?.skipped?.length) {
                                        toast.error(
                                          'Frais partiels',
                                          `${pack.skipped.length} barème(s) non attribués.`,
                                        )
                                      }
                                    },
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
                                    id: 'rentree',
                                    label: 'Pack rentrée',
                                    onClick: () => { setSelectedId(en.id); setShowRentreePack(true) },
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
                                      setSyncConfirm({ studentId: en.id, name: formatStudentFullName(en) })
                                    },
                                  },
                                  {
                                    id: 'lock',
                                    label: en.isLocked ? 'Déverrouiller dossier' : 'Verrouiller dossier',
                                    onClick: () => setLockConfirm(en),
                                  },
                                  {
                                    id: 'promote',
                                    label: 'Promouvoir',
                                    onClick: () => setPromoteTarget(en),
                                  },
                                  {
                                    id: 'update',
                                    label: 'Modifier inscription',
                                    onClick: () => setUpdateTarget(en),
                                  },
                                  {
                                    id: 'transfer',
                                    label: 'Transférer (autre école)',
                                    onClick: () => setTransferTarget(en),
                                  },
                                  {
                                    id: 'reminder-pause',
                                    label: en.reminderPaused ? 'Reprendre rappels' : 'Suspendre rappels',
                                    onClick: () => reminderPauseMutation.mutate(
                                      { studentId: en.id, paused: !en.reminderPaused },
                                      {
                                        onSuccess: () => toast.success(en.reminderPaused ? 'Rappels repris' : 'Rappels suspendus'),
                                        onError: (err) => toast.error('Action impossible', getApiErrorMessage(err)),
                                      },
                                    ),
                                  },
                                  {
                                    id: 'purge',
                                    label: 'Purger dossier',
                                    danger: true,
                                    onClick: () => setPurgeConfirm(en),
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
                    <p className="text-xs text-zinc-500">{formatRdcFullName(detail)} · {detail.matricule ?? '—'}</p>
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
            defaultClassId={detail?.classId ?? syncDetail?.classId}
            onClose={() => setShowEnrollSession(false)}
          />
          <RentreePackDrawer
            open={showRentreePack}
            studentId={selectedId}
            studentName={drawerStudentName}
            defaultClassId={detail?.classId ?? syncDetail?.classId}
            onClose={() => setShowRentreePack(false)}
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
        impact={lockConfirm ? [`Élève : ${formatRdcFullName(lockConfirm)}`] : []}
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

      <ConfirmDialog
        open={purgeConfirm != null}
        title="Purger le dossier ?"
        description="Cette action supprime définitivement toutes les données de l'élève (RGPD). Elle est irréversible."
        impact={purgeConfirm ? [`Élève : ${formatRdcFullName(purgeConfirm)}`] : []}
        confirmLabel="Purger définitivement"
        variant="danger"
        loading={purgeMutation.isPending}
        reasonLabel="Jeton de confirmation"
        reasonPlaceholder="Coller le jeton de confirmation fourni"
        reason={purgeToken}
        onReasonChange={setPurgeToken}
        confirmDisabled={!purgeToken.trim()}
        onConfirm={confirmPurge}
        onCancel={() => { setPurgeConfirm(null); setPurgeToken('') }}
      />

      {promoteTarget && <PromoteModal enrollment={promoteTarget} onClose={() => setPromoteTarget(null)} />}
      {updateTarget && <UpdateEnrollmentModal enrollment={updateTarget} onClose={() => setUpdateTarget(null)} />}
      {transferTarget && <TransferEnrollmentModal enrollment={transferTarget} onClose={() => setTransferTarget(null)} />}
    </div>
  )
}
