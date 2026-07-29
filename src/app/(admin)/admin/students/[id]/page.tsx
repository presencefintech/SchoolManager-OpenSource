'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { useParams, useRouter } from 'next/navigation'
import {
  ArrowLeft, User, CheckCircle2, XCircle, Clock, ShieldAlert,
  FileCheck, Loader2, FileEdit, Camera, Upload, Trash2, FileImage, CreditCard,
  FileDown, Printer, Wallet,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  useStudentDetail, useStudentActivity, useDossierStatus, useSecurityAction,
  useEnrollmentDetail, useSyncBalance, useToggleLock, useLogPiiAccess,
  useUploadStudentPhoto, useUploadStudentDocument, useDeleteCloudinaryFile, useUpdateBiometrics,
  useSchoolBranding,
} from '@/lib/hooks/use-admin'
import type { StudentSecurityAction } from '@/types/admin'
import { SessionEnrollmentsTable } from '@/components/admin/enrollments/session-enrollments-table'
import { StudentFinanceBadges } from '@/components/admin/students/student-finance-badges'
import { StudentCardPhoto } from '@/components/student-card/student-card-photo'
import { StudentCard } from '@/components/StudentCard'
import {
  buildStudentCardData,
  buildStudentQrPayload,
} from '@/lib/student-card/utils'
import {
  downloadStudentCardPdf,
  printStudentCard,
} from '@/lib/student-card/export-actions'
import { AdminProfileModal } from '@/components/admin/students/admin-profile-modal'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { useToast } from '@/providers/toast-provider'
import { labelBiometricStatus } from '@/lib/business-labels'
import { getApiErrorMessage } from '@/lib/api/client'
import { formatStudentDisplayName } from '@/lib/admin/normalizers'
import { formatStudentInitials, formatRdcFullName } from '@/lib/utils/student-name.util'
import { fmtMoney } from '@/components/admin/finance/verification-ui'
import { StudentFinanceDashboard } from '@/components/finance/student-dashboard/StudentFinanceDashboard'
import { StudentFeeAssignmentPanel } from '@/components/admin/students/StudentFeeAssignmentPanel'

function Sk({ className }: { className?: string }) {
  return <div className={cn('rounded-xl bg-zinc-100 animate-pulse', className)} />
}

const STATUS_CFG: Record<string, { label: string; cls: string }> = {
  ACTIVE:    { label: 'Actif',    cls: 'bg-emerald-50 text-emerald-700' },
  INACTIVE:  { label: 'Inactif', cls: 'bg-zinc-100 text-zinc-500' },
  SUSPENDED: { label: 'Suspendu', cls: 'bg-red-50 text-red-700' },
}

function InfoRow({ label, value, action }: { label: string; value?: string | null; action?: React.ReactNode }) {
  if (!value) return null
  return (
    <div className="flex items-start gap-3 py-2 border-b border-zinc-50 last:border-0">
      <span className="text-xs text-zinc-400 w-32 flex-shrink-0 pt-0.5">{label}</span>
      <span className="text-sm text-zinc-700 min-w-0 break-words flex-1">{value}</span>
      {action}
    </div>
  )
}

function BiometricsUpdateModal({ studentId, onClose }: { studentId: number; onClose: () => void }) {
  const toast = useToast()
  const { mutate, isPending } = useUpdateBiometrics()
  const [file, setFile] = useState<File | null>(null)
  const [error, setError] = useState('')

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!file) { setError('Sélectionnez une photo'); return }
    mutate({ studentId, photo: file }, {
      onSuccess: () => { toast.success('Biométrie mise à jour'); onClose() },
      onError: (err) => setError(getApiErrorMessage(err)),
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 mx-4">
        <h2 className="text-lg font-semibold text-zinc-900 mb-5">Mettre à jour la biométrie</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-zinc-500 mb-1">Photo du visage</label>
            <input
              type="file" accept="image/*" required
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              className="w-full text-sm"
            />
          </div>
          {error && <p className="text-xs text-red-500 bg-red-50 rounded-lg px-3 py-2">{error}</p>}
          <div className="flex gap-2">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-2 rounded-xl border border-zinc-200 text-sm text-zinc-600 hover:bg-zinc-50">Annuler</button>
            <button type="submit" disabled={isPending} className="flex-1 px-4 py-2 rounded-xl bg-emerald-600 text-sm text-white font-medium hover:bg-emerald-700 disabled:opacity-50">
              {isPending ? 'Envoi...' : 'Mettre à jour'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function extractCloudinaryPublicId(url?: string): string | undefined {
  if (!url) return undefined
  const match = url.match(/\/upload\/(?:v\d+\/)?(.+)\.\w+$/)
  return match?.[1]
}

function PhotoDocumentsCard({ studentId, firstName, lastName, photoUrl, birthCertificateUrl, enrollmentFormUrl }: {
  studentId: number
  firstName: string
  lastName: string
  photoUrl?: string
  birthCertificateUrl?: string
  enrollmentFormUrl?: string
}) {
  const toast = useToast()
  const { mutate: uploadPhoto, isPending: uploadingPhoto } = useUploadStudentPhoto()
  const { mutate: uploadDocument, isPending: uploadingDocument } = useUploadStudentDocument()
  const { mutateAsync: deleteFile, isPending: deleting } = useDeleteCloudinaryFile()
  const [deleteTarget, setDeleteTarget] = useState<{ publicId: string; label: string } | null>(null)

  function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    uploadPhoto({ studentId, file }, {
      onSuccess: () => toast.success('Photo mise à jour'),
      onError: (err) => toast.error('Upload impossible', getApiErrorMessage(err)),
    })
  }

  function handleDocumentChange(documentType: 'certificates' | 'reports') {
    return (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      e.target.value = ''
      if (!file) return
      uploadDocument({ studentId, documentType, file }, {
        onSuccess: () => toast.success('Document téléversé'),
        onError: (err) => toast.error('Upload impossible', getApiErrorMessage(err)),
      })
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return
    try {
      await deleteFile({ studentId, publicId: deleteTarget.publicId })
      toast.success('Fichier supprimé')
    } catch (err) {
      toast.error('Suppression impossible', getApiErrorMessage(err))
    } finally {
      setDeleteTarget(null)
    }
  }

  const documents: { type: 'certificates' | 'reports'; label: string; url?: string }[] = [
    { type: 'certificates', label: 'Certificat de naissance', url: birthCertificateUrl },
    { type: 'reports', label: "Fiche d'inscription", url: enrollmentFormUrl },
  ]

  return (
    <div className="bg-white rounded-xl border border-zinc-200 shadow-[0_1px_4px_rgba(0,0,0,0.06)] p-5">
      <h2 className="text-sm font-semibold text-zinc-700 mb-4 flex items-center gap-2"><Camera size={14} /> Photo & documents</h2>
      <div className="flex items-start gap-4">
        <div className="w-20 h-20 rounded-xl overflow-hidden flex-shrink-0">
          <StudentCardPhoto photoUrl={photoUrl ?? null} firstName={firstName} lastName={lastName} />
        </div>
        <div className="flex-1 min-w-0 space-y-2">
          <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-zinc-200 text-xs text-zinc-600 hover:bg-zinc-50 cursor-pointer">
            <Upload size={11} />
            {uploadingPhoto ? 'Envoi...' : 'Changer la photo'}
            <input type="file" accept="image/*" className="hidden" disabled={uploadingPhoto} onChange={handlePhotoChange} />
          </label>
          {photoUrl && (() => {
            const publicId = extractCloudinaryPublicId(photoUrl)
            return publicId ? (
              <button
                type="button"
                onClick={() => setDeleteTarget({ publicId, label: 'Photo élève' })}
                className="flex items-center gap-1 text-xs text-red-600 hover:text-red-700"
              >
                <Trash2 size={11} /> Supprimer
              </button>
            ) : null
          })()}
        </div>
      </div>

      <div className="mt-4 pt-4 border-t border-zinc-50 space-y-3">
        {documents.map((doc) => {
          const publicId = extractCloudinaryPublicId(doc.url)
          return (
            <div key={doc.type} className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <FileImage size={13} className="text-zinc-400 flex-shrink-0" />
                <div className="min-w-0">
                  <p className="text-xs font-medium text-zinc-700 truncate">{doc.label}</p>
                  {doc.url ? (
                    <a href={doc.url} target="_blank" rel="noreferrer" className="text-[11px] text-emerald-600 hover:underline">
                      Voir le fichier
                    </a>
                  ) : (
                    <p className="text-[11px] text-zinc-400">Aucun fichier</p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-1.5 flex-shrink-0">
                <label className="inline-flex items-center gap-1 px-2 py-1 rounded-lg border border-zinc-200 text-[11px] text-zinc-600 hover:bg-zinc-50 cursor-pointer">
                  <Upload size={10} />
                  {uploadingDocument ? '...' : 'Téléverser'}
                  <input type="file" className="hidden" disabled={uploadingDocument} onChange={handleDocumentChange(doc.type)} />
                </label>
                {publicId && (
                  <button
                    type="button"
                    onClick={() => setDeleteTarget({ publicId, label: doc.label })}
                    className="p-1 rounded-lg border border-red-100 text-red-600 hover:bg-red-50"
                  >
                    <Trash2 size={11} />
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>

      <ConfirmDialog
        open={deleteTarget != null}
        title="Supprimer ce fichier ?"
        description="Cette action est irréversible."
        impact={deleteTarget ? [deleteTarget.label] : []}
        confirmLabel="Supprimer"
        variant="danger"
        loading={deleting}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  )
}

function DossierCheck({ ok, label }: { ok: boolean; label: string }) {
  return (
    <div className={cn('flex items-center gap-2 p-3 rounded-xl', ok ? 'bg-emerald-50' : 'bg-zinc-50')}>
      {ok ? <CheckCircle2 size={14} className="text-emerald-600" /> : <XCircle size={14} className="text-zinc-300" />}
      <span className={cn('text-xs font-medium', ok ? 'text-emerald-700' : 'text-zinc-400')}>{label}</span>
    </div>
  )
}

export default function StudentDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const toast = useToast()
  const studentId = Number(id)

  const { data: student, isLoading } = useStudentDetail(studentId)
  const { data: enrollmentDetail } = useEnrollmentDetail(studentId)
  const { data: activity, isLoading: loadingActivity } = useStudentActivity(studentId)
  const { data: dossier } = useDossierStatus(studentId)
  const { data: branding } = useSchoolBranding()
  const securityMutation = useSecurityAction()
  const toggleLockMutation = useToggleLock()
  const syncMutation = useSyncBalance()
  const { mutate: logPiiAccess } = useLogPiiAccess()

  useEffect(() => {
    if (!studentId) return
    logPiiAccess({ id: studentId, reason: 'Consultation fiche élève' }, { onError: () => {} })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [studentId])

  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [securityReason, setSecurityReason] = useState('')
  const [syncingEnrollmentId, setSyncingEnrollmentId] = useState<number | null>(null)
  const [showAdminProfile, setShowAdminProfile] = useState(false)
  const [showBiometricsUpdate, setShowBiometricsUpdate] = useState(false)
  const [cardExportReady, setCardExportReady] = useState(false)
  const [downloadingCard, setDownloadingCard] = useState(false)
  const [cardElement, setCardElement] = useState<HTMLDivElement | null>(null)
  const [pendingAction, setPendingAction] = useState<{
    key: string
    kind: 'security' | 'lock'
    label: string
    studentName: string
    action?: StudentSecurityAction
    danger?: boolean
    currentlyLocked?: boolean
  } | null>(null)

  const cardData = useMemo(() => {
    if (!student) return null
    const gender =
      student.gender === 'M' || student.gender === 'F' || student.gender === 'MALE' || student.gender === 'FEMALE'
        ? student.gender
        : null
    return buildStudentCardData({
      studentId: student.id,
      firstName: student.firstName,
      lastName: student.lastName,
      postnom: student.postnom,
      prenom: student.prenom,
      matricule: student.matricule,
      photoUrl: student.photoUrl,
      qrPayload: buildStudentQrPayload(student.id, student.matricule),
      schoolName: branding?.name?.trim() || student.schoolName?.trim() || 'Établissement scolaire',
      schoolCity: branding?.city,
      schoolLogoUrl: branding?.logoUrl,
      schoolSlogan: branding?.slogan,
      schoolDevise: branding?.devise,
      cardTheme: branding?.cardTheme ?? null,
      className: student.className,
      academicYear: student.academicYear ?? enrollmentDetail?.academicYear,
      placeOfBirth: student.placeOfBirth,
      nationality: student.nationality,
      gender,
      feesBalance: student.feesBalance ?? student.debtAmount ?? enrollmentDetail?.feesBalance,
      isPaymentLocked: student.isPaymentLocked,
    })
  }, [student, branding, enrollmentDetail])

  const handleCardElement = useCallback((el: HTMLDivElement | null) => {
    setCardElement(el)
  }, [])

  async function handleDownloadCard() {
    if (!cardData) return
    setDownloadingCard(true)
    try {
      await downloadStudentCardPdf(cardData, `carte_eleve_${studentId}.pdf`, {
        sourceElement: cardElement,
      })
      toast.success('PDF téléchargé')
    } catch (err) {
      toast.error('Export PDF impossible', getApiErrorMessage(err))
    } finally {
      setDownloadingCard(false)
    }
  }

  async function handlePrintCard() {
    if (!cardData) return
    try {
      await printStudentCard(cardData, { sourceElement: cardElement })
    } catch (err) {
      toast.error('Impression impossible', getApiErrorMessage(err))
    }
  }

  async function executePendingAction() {
    if (!pendingAction) return
    setActionLoading(pendingAction.key)
    try {
      if (pendingAction.kind === 'lock') {
        await toggleLockMutation.mutateAsync({
          studentId,
          isLocked: !pendingAction.currentlyLocked,
        })
        toast.success(
          pendingAction.currentlyLocked ? 'Dossier déverrouillé' : 'Dossier verrouillé',
          pendingAction.currentlyLocked
            ? 'Les modifications sont à nouveau autorisées.'
            : 'Les modifications sont suspendues.',
        )
      } else if (pendingAction.action === 'BLOCK') {
        const reason = securityReason.trim()
        if (!reason) {
          toast.error('Motif obligatoire', 'Indiquez la raison de la suspension.')
          return
        }
        await securityMutation.mutateAsync({ id: studentId, action: 'BLOCK', reason })
        toast.success('Compte suspendu', 'L\'élève ne peut plus accéder aux services.')
      } else if (pendingAction.action === 'UNBLOCK') {
        await securityMutation.mutateAsync({ id: studentId, action: 'UNBLOCK' })
        toast.success('Compte réactivé', 'L\'élève peut à nouveau accéder aux services.')
      }
    } catch (err) {
      toast.error('Action impossible', getApiErrorMessage(err))
    } finally {
      setActionLoading(null)
      setPendingAction(null)
      setSecurityReason('')
    }
  }

  function closePendingAction() {
    setPendingAction(null)
    setSecurityReason('')
  }

  async function handleSyncEnrollment(enrollmentId: number) {
    setSyncingEnrollmentId(enrollmentId)
    try {
      await syncMutation.mutateAsync(enrollmentId)
      toast.success('Solde recalculé')
    } catch (err) {
      toast.error('Échec', getApiErrorMessage(err))
    } finally {
      setSyncingEnrollmentId(null)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-zinc-50 p-8 space-y-4 max-w-4xl mx-auto">
        <Sk className="h-8 w-48" />
        <Sk className="h-48" />
        <Sk className="h-64" />
      </div>
    )
  }

  if (!student) {
    return (
      <div className="min-h-screen bg-zinc-50 flex items-center justify-center">
        <p className="text-sm text-zinc-400">Élève introuvable.</p>
      </div>
    )
  }

  const sc = STATUS_CFG[student.status] ?? { label: student.status, cls: 'bg-zinc-100 text-zinc-500' }
  const debtAmount = student.debtAmount ?? 0
  const studentDisplayName = formatStudentDisplayName(student)
  const studentInitials = formatStudentInitials(student)
  const identity = {
    nom: (student.lastName ?? '').trim().toUpperCase() || null,
    postnom: (student.postnom ?? '').trim().toUpperCase() || null,
    prenom: (student.prenom || student.firstName || '').trim() || null,
    prenomUsage:
      student.prenom &&
      student.firstName &&
      student.prenom.trim().toLocaleLowerCase('fr-FR') !== student.firstName.trim().toLocaleLowerCase('fr-FR')
        ? student.firstName.trim()
        : null,
  }
  const dossierItem = dossier as {
    hasPhoto?: boolean; hasBiometrics?: boolean; hasParentContact?: boolean;
    isFinanciallyCleared?: boolean; completionRate?: number
  } | undefined

  const securityActions = [
    ...(student.status !== 'SUSPENDED'
      ? [{
          key: 'BLOCK',
          kind: 'security' as const,
          action: 'BLOCK' as const,
          label: 'Suspendre le compte',
          danger: true,
        }]
      : [{
          key: 'UNBLOCK',
          kind: 'security' as const,
          action: 'UNBLOCK' as const,
          label: 'Réactiver le compte',
          danger: false,
        }]),
    {
      key: student.isLocked ? 'UNLOCK' : 'LOCK',
      kind: 'lock' as const,
      label: student.isLocked ? 'Déverrouiller le dossier' : 'Verrouiller le dossier',
      danger: !student.isLocked,
      currentlyLocked: student.isLocked,
    },
  ]

  const actionPending = securityMutation.isPending || toggleLockMutation.isPending

  return (
    <div className="min-h-screen bg-zinc-50">
      <motion.div
        className="bg-white border-b border-zinc-200"
        initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}
      >
        <div className="max-w-4xl mx-auto px-8 py-5 flex items-center gap-4">
          <button
            onClick={() => router.back()}
            className="p-1.5 rounded-lg hover:bg-zinc-100 text-zinc-400 transition-colors"
          >
            <ArrowLeft size={16} />
          </button>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-emerald-100 flex items-center justify-center">
              <span className="text-sm font-bold text-emerald-700">
                {studentInitials}
              </span>
            </div>
            <div>
              <h1 className="text-lg font-semibold text-zinc-900">{studentDisplayName}</h1>
              <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                <span className={cn('text-xs font-medium px-2 py-0.5 rounded-full', sc.cls)}>{sc.label}</span>
                {student.matricule && <span className="text-xs text-zinc-400 font-mono">{student.matricule}</span>}
              </div>
              <StudentFinanceBadges
                className="mt-2"
                debtAmount={debtAmount > 0 ? debtAmount : undefined}
                isPaymentLocked={student.isPaymentLocked}
                activeMoratoriumId={student.activeMoratoriumId ?? enrollmentDetail?.activeMoratoriumId}
                biometricStatus={student.biometricStatus ?? enrollmentDetail?.biometricStatus}
                scholarshipPercent={student.scholarshipPercent ?? enrollmentDetail?.scholarshipPercent}
              />
            </div>
          </div>
        </div>
      </motion.div>

      <div className="max-w-4xl mx-auto px-8 py-6 space-y-5">

        {/* Aperçu carte — toujours visible en premier (desktop + mobile) */}
        {cardData && (
          <div className="bg-white rounded-xl border border-zinc-200 shadow-[0_1px_4px_rgba(0,0,0,0.06)] overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 border-b border-zinc-100">
              <div className="flex items-center gap-2 min-w-0">
                <CreditCard size={14} className="text-emerald-600 flex-shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-zinc-800">Aperçu carte élève</p>
                  <p className="text-[11px] text-zinc-400">Format CR80 · vérifiez avant d&apos;imprimer</p>
                </div>
              </div>
              <div className="flex items-center gap-1.5 flex-shrink-0">
                <button
                  type="button"
                  onClick={handleDownloadCard}
                  disabled={downloadingCard || !cardExportReady}
                  className="h-8 flex items-center gap-1.5 px-2.5 rounded-lg text-[11px] font-semibold bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-60 transition-colors"
                >
                  {downloadingCard ? <Loader2 size={12} className="animate-spin" /> : <FileDown size={12} />}
                  PDF
                </button>
                <button
                  type="button"
                  onClick={handlePrintCard}
                  disabled={!cardExportReady}
                  className="h-8 flex items-center gap-1.5 px-2.5 rounded-lg text-[11px] font-semibold border border-zinc-200 text-zinc-700 hover:bg-zinc-50 disabled:opacity-60 transition-colors"
                >
                  <Printer size={12} />
                  Imprimer
                </button>
              </div>
            </div>
            <div className="flex justify-center p-5 overflow-x-auto bg-zinc-50/70">
              <StudentCard
                data={cardData}
                preview
                onCardElement={handleCardElement}
                onReady={(s) => setCardExportReady(s.canDownload)}
              />
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

          {/* Profile */}
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-white rounded-xl border border-zinc-200 shadow-[0_1px_4px_rgba(0,0,0,0.06)] p-5">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-semibold text-zinc-700 flex items-center gap-2"><User size={14} /> Informations</h2>
                <button
                  type="button"
                  onClick={() => setShowAdminProfile(true)}
                  className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 hover:text-emerald-800"
                >
                  <FileEdit size={12} /> Profil administratif
                </button>
              </div>
              <InfoRow label="Nom complet" value={formatRdcFullName(student)} />
              <InfoRow label="Nom" value={identity.nom} />
              <InfoRow label="Postnom" value={identity.postnom} />
              <InfoRow label="Prénom" value={identity.prenom} />
              <InfoRow label="Prénom d'usage" value={identity.prenomUsage} />
              <InfoRow label="Classe" value={student.className} />
              <InfoRow label="Email" value={student.email} />
              <InfoRow label="Téléphone" value={student.phone} />
              <InfoRow label="Date de naissance" value={student.dateOfBirth ? new Date(student.dateOfBirth).toLocaleDateString('fr-FR') : undefined} />
              <InfoRow label="Adresse" value={student.address} />
              <InfoRow label="Parent/Tuteur" value={student.parentName} />
              <InfoRow label="Tél. parent" value={student.parentPhone} />
              <InfoRow label="Email parent" value={student.parentEmail} />
              <InfoRow label="Genre" value={student.gender === 'M' ? 'Masculin' : student.gender === 'F' ? 'Féminin' : undefined} />
              <InfoRow label="Lieu de naissance" value={student.placeOfBirth} />
              <InfoRow label="Nationalité" value={student.nationality} />
              <InfoRow label="Année scolaire" value={student.academicYear ?? enrollmentDetail?.academicYear} />
              <InfoRow
                label="Biométrie"
                value={labelBiometricStatus(student.biometricStatus ?? enrollmentDetail?.biometricStatus)}
                action={
                  <button
                    type="button"
                    onClick={() => setShowBiometricsUpdate(true)}
                    className="text-xs font-medium text-emerald-700 hover:text-emerald-800 flex-shrink-0"
                  >
                    Mettre à jour
                  </button>
                }
              />
              <InfoRow label="Groupe sanguin" value={student.bloodGroup} />
              <InfoRow label="Allergies" value={student.allergies} />
              <InfoRow label="Notes médicales" value={student.medicalNotes} />
            </div>

            <PhotoDocumentsCard
              studentId={studentId}
              firstName={identity.prenom || student.firstName}
              lastName={identity.nom || student.lastName}
              photoUrl={student.photoUrl}
              birthCertificateUrl={student.birthCertificateUrl}
              enrollmentFormUrl={student.enrollmentFormUrl}
            />

            {/* Sessions académiques */}
            {enrollmentDetail?.enrollments && enrollmentDetail.enrollments.length > 0 && (
              <div className="bg-white rounded-xl border border-zinc-200 shadow-[0_1px_4px_rgba(0,0,0,0.06)] p-5">
                <h2 className="text-sm font-semibold text-zinc-700 mb-4">Inscriptions par session</h2>
                <SessionEnrollmentsTable
                  enrollments={enrollmentDetail.enrollments}
                  onSync={handleSyncEnrollment}
                  syncingId={syncingEnrollmentId}
                />
              </div>
            )}

            {/* Finance — agrégats + échéancier dus / non dus */}
            <div className="bg-white rounded-xl border border-zinc-200 shadow-[0_1px_4px_rgba(0,0,0,0.06)] p-5 space-y-5">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-sm font-semibold text-zinc-700 flex items-center gap-2">
                  <Wallet size={14} /> Finance
                </h2>
                <a
                  href="/admin/finance/paiements"
                  className="text-xs font-medium text-emerald-700 hover:text-emerald-800"
                >
                  Guichet paiements →
                </a>
              </div>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: 'À payer', value: student.totalDue ?? enrollmentDetail?.totalFees, color: 'zinc' },
                  { label: 'Payé', value: student.totalPaid ?? enrollmentDetail?.feesPaid, color: 'emerald' },
                  { label: 'Solde', value: debtAmount || enrollmentDetail?.feesBalance, color: debtAmount > 0 ? 'red' : 'emerald' },
                ].map(({ label, value, color }) => (
                  <div key={label} className={cn('rounded-xl p-3',
                    color === 'emerald' ? 'bg-emerald-50' : color === 'red' ? 'bg-red-50' : 'bg-zinc-50'
                  )}>
                    <p className="text-[11px] text-zinc-400 uppercase tracking-wide mb-1">{label}</p>
                    <p className={cn('text-base font-bold tabular-nums',
                      color === 'emerald' ? 'text-emerald-700' : color === 'red' ? 'text-red-700' : 'text-zinc-700'
                    )}>
                      {fmtMoney(Number(value ?? 0))}
                    </p>
                  </div>
                ))}
              </div>

              <div className="border-t border-zinc-100 pt-5 space-y-5">
                <StudentFeeAssignmentPanel studentId={studentId} />
                <StudentFinanceDashboard
                  studentId={studentId}
                  api="admin"
                  allowPay={false}
                  showNav={false}
                  compactHeader
                />
              </div>
            </div>

            {/* Activity */}
            <div className="bg-white rounded-xl border border-zinc-200 shadow-[0_1px_4px_rgba(0,0,0,0.06)] overflow-hidden">
              <div className="px-5 py-4 border-b border-zinc-100">
                <h2 className="text-sm font-semibold text-zinc-700 flex items-center gap-2"><Clock size={14} /> Activité récente</h2>
              </div>
              {loadingActivity ? (
                <div className="p-4 space-y-3">{[...Array(4)].map((_, i) => <Sk key={i} className="h-10" />)}</div>
              ) : (activity as unknown[])?.length ? (
                <div className="divide-y divide-zinc-50 max-h-72 overflow-y-auto">
                  {((activity as Array<{ id: number; type: string; description: string; createdAt: string }>) ?? []).map((evt) => (
                    <div key={evt.id} className="px-5 py-3 flex items-start gap-3">
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-2 flex-shrink-0" />
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-zinc-700">{evt.type}</p>
                        <p className="text-xs text-zinc-400 truncate">{evt.description}</p>
                      </div>
                      <span className="text-[10px] text-zinc-300 flex-shrink-0 ml-auto pt-0.5 tabular-nums">
                        {new Date(evt.createdAt).toLocaleDateString('fr-FR')}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-8 text-center text-sm text-zinc-400">Aucune activité</div>
              )}
            </div>
          </div>
          {/* Right column */}
          <div className="space-y-4">

            {/* Dossier */}
            {dossierItem && (
              <div className="bg-white rounded-xl border border-zinc-200 shadow-[0_1px_4px_rgba(0,0,0,0.06)] p-5">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-sm font-semibold text-zinc-700 flex items-center gap-2"><FileCheck size={14} /> Dossier</h2>
                  <span className={cn('text-xs font-bold px-2 py-0.5 rounded-full',
                    (dossierItem.completionRate ?? 0) >= 80 ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
                  )}>
                    {dossierItem.completionRate ?? 0}%
                  </span>
                </div>
                <div className="space-y-2">
                  <DossierCheck ok={!!dossierItem.hasPhoto} label="Photo" />
                  <DossierCheck ok={!!dossierItem.hasBiometrics} label="Biométrie" />
                  <DossierCheck ok={!!dossierItem.hasParentContact} label="Contact parent" />
                  <DossierCheck ok={!!dossierItem.isFinanciallyCleared} label="Dégagé financièrement" />
                </div>
              </div>
            )}
            {/* Presence stats */}
            {student.presenceCount !== undefined && (
              <div className="bg-white rounded-xl border border-zinc-200 shadow-[0_1px_4px_rgba(0,0,0,0.06)] p-5">
                <h2 className="text-sm font-semibold text-zinc-700 mb-3">Présence</h2>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-zinc-500">Total présences</span>
                    <span className="text-sm font-bold text-zinc-900 tabular-nums">{student.presenceCount}</span>
                  </div>
                  {student.lastPresence && (
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-zinc-500">Dernière présence</span>
                      <span className="text-xs text-zinc-600">{new Date(student.lastPresence).toLocaleDateString('fr-FR')}</span>
                    </div>
                  )}
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-zinc-500">Dossier verrouillé</span>
                    <span className={cn('text-xs font-medium', student.isLocked ? 'text-red-600' : 'text-emerald-600')}>
                      {student.isLocked ? 'Oui — modifications suspendues' : 'Non'}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Security actions */}
            <div className="bg-white rounded-xl border border-zinc-200 shadow-[0_1px_4px_rgba(0,0,0,0.06)] p-5">
              <h2 className="text-sm font-semibold text-zinc-700 mb-3 flex items-center gap-2">
                <ShieldAlert size={14} className="text-red-500" /> Actions
              </h2>
              <div className="space-y-2">
                {securityActions.map(({ key, kind, action, label, danger, currentlyLocked }) => (
                  <button
                    key={key}
                    onClick={() => setPendingAction({
                      key,
                      kind,
                      label,
                      studentName: studentDisplayName,
                      action,
                      danger,
                      currentlyLocked,
                    })}
                    disabled={actionPending}
                    className={cn(
                      'w-full flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-medium transition-colors',
                      danger
                        ? 'border border-red-200 text-red-600 hover:bg-red-50'
                        : 'border border-zinc-200 text-zinc-600 hover:bg-zinc-50',
                    )}
                  >
                    {actionLoading === key && <Loader2 size={12} className="animate-spin" />}
                    {label}
                  </button>
                ))}
              </div>
            </div>

          </div>
        </div>
      </div>

      <AdminProfileModal open={showAdminProfile} student={student} onClose={() => setShowAdminProfile(false)} />

      {showBiometricsUpdate && (
        <BiometricsUpdateModal studentId={studentId} onClose={() => setShowBiometricsUpdate(false)} />
      )}

      <ConfirmDialog
        open={pendingAction != null}
        title={`Confirmer : ${pendingAction?.label ?? ''}`}
        description={
          pendingAction?.kind === 'lock'
            ? (pendingAction.currentlyLocked
              ? 'Le dossier pourra à nouveau être modifié (inscriptions, paiements, etc.).'
              : 'Les modifications du dossier seront bloquées jusqu\'au déverrouillage.')
            : pendingAction?.action === 'BLOCK'
              ? 'Le compte élève sera suspendu et les parents seront notifiés.'
              : 'Le compte élève sera réactivé et l\'accès aux services restauré.'
        }
        impact={[
          `Élève : ${pendingAction?.studentName ?? studentDisplayName}`,
          student.matricule ? `Matricule : ${student.matricule}` : '',
          student.className ? `Classe : ${student.className}` : '',
        ].filter(Boolean)}
        variant={pendingAction?.danger ? 'danger' : 'default'}
        loading={actionPending}
        confirmLabel="Confirmer"
        reason={pendingAction?.action === 'BLOCK' ? securityReason : undefined}
        onReasonChange={pendingAction?.action === 'BLOCK' ? setSecurityReason : undefined}
        reasonLabel="Motif de suspension *"
        reasonPlaceholder="Ex. impayés récurrents, fraude suspectée…"
        confirmDisabled={pendingAction?.action === 'BLOCK' && !securityReason.trim()}
        onConfirm={executePendingAction}
        onCancel={closePendingAction}
      />
    </div>
  )
}
