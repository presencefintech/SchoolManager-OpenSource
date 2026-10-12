'use client'

import { Suspense, useCallback, useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import {
  ArrowLeft, User, CheckCircle2, XCircle, Clock, ShieldAlert,
  FileCheck, Loader2, FileEdit, Camera, Upload, Trash2, FileImage, CreditCard,
  FileDown, Printer, Wallet, FileMinus, Mail, DoorOpen, Contact, Briefcase,
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
import { useAuth } from '@/providers/auth-provider'
import { isItDesk } from '@/types/auth'
import { enrollmentsApi } from '@/lib/admin/api/enrollments.api'
import { triggerBlobDownload } from '@/lib/download-blob'
import { labelBiometricStatus } from '@/lib/business-labels'
import { getApiErrorMessage } from '@/lib/api/client'
import { formatStudentDisplayName } from '@/lib/admin/normalizers'
import { formatRdcFullName } from '@/lib/utils/student-name.util'
import { fmtMoney } from '@/components/admin/finance/verification-ui'
import { StudentFinanceDashboard } from '@/components/finance/student-dashboard/StudentFinanceDashboard'
import { StudentFeeAssignmentPanel } from '@/components/admin/students/StudentFeeAssignmentPanel'
import { PickupAdultsPanel } from '@/components/admin/students/PickupAdultsPanel'
import { StudentGuardiansPanel } from '@/components/admin/students/StudentGuardiansPanel'
import { StudentAdministrativeCareerPanel } from '@/components/admin/students/StudentAdministrativeCareerPanel'

function RevokeIssuedDocumentPanel() {
  const toast = useToast()
  const [documentRef, setDocumentRef] = useState('')
  const [reason, setReason] = useState('')
  const [busy, setBusy] = useState(false)

  const onRevoke = async () => {
    if (!documentRef.trim()) {
      toast.error('Référence requise', 'Indiquez le N° document (documentRef).')
      return
    }
    setBusy(true)
    try {
      const result = await enrollmentsApi.revokeIssuedDocument({
        documentRef: documentRef.trim(),
        reason: reason.trim() || undefined,
      })
      toast.success('Document révoqué', result.documentRef)
      setDocumentRef('')
      setReason('')
    } catch (err) {
      toast.error('Révocation impossible', getApiErrorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="bg-white rounded-xl border border-zinc-200 p-4 space-y-3">
      <h3 className="text-sm font-semibold text-zinc-800 flex items-center gap-1.5">
        <FileMinus size={14} className="text-rose-600" />
        Révoquer un document émis
      </h3>
      <p className="text-xs text-zinc-500">
        Invalide immédiatement le QR / code de vérification (fiche, attestation…).
      </p>
      <input
        value={documentRef}
        onChange={(e) => setDocumentRef(e.target.value)}
        placeholder="N° document (ex. INS-2026-00042)"
        className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
      />
      <input
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        placeholder="Motif (optionnel)"
        className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
      />
      <button
        type="button"
        disabled={busy}
        onClick={() => void onRevoke()}
        className="rounded-lg bg-rose-600 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
      >
        {busy ? 'Révocation…' : 'Révoquer'}
      </button>
    </div>
  )
}

function Sk({ className }: { className?: string }) {
  return <div className={cn('rounded-xl bg-zinc-100 animate-pulse', className)} />
}

const STATUS_CFG: Record<string, { label: string; cls: string }> = {
  ACTIVE:    { label: 'Actif',    cls: 'bg-emerald-50 text-emerald-700' },
  INACTIVE:  { label: 'Inactif', cls: 'bg-zinc-100 text-zinc-500' },
  SUSPENDED: { label: 'Suspendu', cls: 'bg-red-50 text-red-700' },
}

function ageLabel(dateOfBirth?: string): string | null {
  if (!dateOfBirth) return null
  const born = new Date(dateOfBirth)
  if (Number.isNaN(born.getTime())) return null
  const now = new Date()
  let years = now.getFullYear() - born.getFullYear()
  const monthDelta = now.getMonth() - born.getMonth()
  if (monthDelta < 0 || (monthDelta === 0 && now.getDate() < born.getDate())) years -= 1
  if (years < 0 || years > 30) return null
  return `${years} ans`
}

function isSameLocalDay(iso?: string): boolean {
  if (!iso) return false
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return false
  const now = new Date()
  return (
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate()
  )
}

function todayPresenceLabel(lastPresence?: string, status?: string): { label: string; tone: 'ok' | 'warn' | 'bad' | 'neutral' } {
  if (!isSameLocalDay(lastPresence)) return { label: 'Non pointé', tone: 'neutral' }
  if (status === 'PRESENT') return { label: 'Présent aujourd’hui', tone: 'ok' }
  if (status === 'LATE') return { label: 'En retard', tone: 'warn' }
  if (status === 'ABSENT') return { label: 'Absent aujourd’hui', tone: 'bad' }
  return { label: 'Pointé aujourd’hui', tone: 'ok' }
}

function activitySentence(evt: Record<string, unknown>, index: number): { key: string; text: string } {
  const type = String(evt.type ?? '')
  const title = typeof evt.title === 'string' ? evt.title : ''
  const description = typeof evt.description === 'string' ? evt.description : ''
  const rawDate = (evt.date ?? evt.createdAt) as string | undefined
  const parsed = rawDate ? new Date(rawDate) : null
  const day = parsed && !Number.isNaN(parsed.getTime())
    ? parsed.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
    : ''

  let text = title || description || 'Activité'
  if (/^Présence\s*:/i.test(title)) {
    const status = title.split(':').pop()?.trim()
    text = status === 'LATE' ? `En retard le ${day}` : status === 'ABSENT' ? `Absent le ${day}` : `Présent le ${day}`
  } else if (/^Paiement\s*:/i.test(title)) {
    text = `Paiement ${title.replace(/^Paiement\s*:\s*/i, '')}`.trim()
  } else if (type === 'PRESENCE' && !title && day) {
    text = `Présent le ${day}`
  }

  return { key: String(evt.id ?? `${type}-${rawDate ?? index}`), text }
}

function GlancePill({ label, tone }: { label: string; tone: 'ok' | 'warn' | 'bad' | 'neutral' }) {
  const toneClass =
    tone === 'ok'
      ? 'bg-emerald-50 text-emerald-800 ring-emerald-100'
      : tone === 'warn'
        ? 'bg-amber-50 text-amber-900 ring-amber-100'
        : tone === 'bad'
          ? 'bg-red-50 text-red-800 ring-red-100'
          : 'bg-zinc-100 text-zinc-700 ring-zinc-200'
  return (
    <span className={cn('inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1', toneClass)}>
      {label}
    </span>
  )
}

function InfoRow({
  label,
  value,
  action,
  skipEmpty,
}: {
  label: string
  value?: string | null
  action?: React.ReactNode
  skipEmpty?: boolean
}) {
  const text = value?.trim() ?? ''
  if (!text && skipEmpty) return null
  return (
    <div className="flex items-start gap-3 py-2 border-b border-zinc-50 last:border-0">
      <span className="text-xs text-zinc-400 w-32 flex-shrink-0 pt-0.5">{label}</span>
      <span className={cn('text-sm min-w-0 break-words flex-1', text ? 'text-zinc-700' : 'text-zinc-400')}>
        {text || 'À compléter'}
      </span>
      {action}
    </div>
  )
}

const EXIT_REASONS = [
  { value: 'TRANSFER', label: 'Transfert vers un autre établissement' },
  { value: 'END_CYCLE', label: 'Fin de cycle' },
  { value: 'FAMILY', label: 'Demande de la famille' },
  { value: 'RELOCATION', label: 'Changement de résidence' },
  { value: 'HEALTH', label: 'Raisons de santé' },
  { value: 'ABANDON', label: 'Abandon de scolarité' },
  { value: 'OTHER', label: 'Motif administratif' },
] as const

const SUMMONS_REASONS = [
  { value: 'MEETING', label: 'Entretien avec la direction' },
  { value: 'ABSENCE', label: 'Absences répétées' },
  { value: 'DISCIPLINE', label: 'Entretien disciplinaire' },
  { value: 'DOSSIER', label: 'Dossier administratif incomplet' },
  { value: 'OTHER', label: 'Motif administratif' },
] as const

const EXIT_PASS_REASONS = [
  { value: 'FAMILY', label: 'Convenance familiale' },
  { value: 'MEDICAL', label: 'Raison médicale' },
  { value: 'ADMIN', label: 'Démarche administrative' },
  { value: 'SPORT', label: 'Activité scolaire / sportive' },
  { value: 'OTHER', label: 'Autre motif autorisé' },
] as const

function todayIsoDate() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function isYoungPickupStudent(dateOfBirth?: string, className?: string) {
  if (/maternel|prescol|préscol|garderie|creche|crèche|jardin/i.test(className ?? '')) return true
  if (!dateOfBirth) return false
  const years = (Date.now() - new Date(dateOfBirth).getTime()) / (365.25 * 86_400_000)
  return years >= 0 && years < 7
}

function deskDocButtonClass(disabled?: boolean) {
  return cn(
    'h-8 flex items-center gap-1.5 px-2.5 rounded-lg text-[11px] font-semibold border border-zinc-200 text-zinc-700 hover:bg-zinc-50 disabled:opacity-60 transition-colors',
    disabled && 'opacity-60',
  )
}

function ExitCertificateModal({ studentId, onClose }: { studentId: number; onClose: () => void }) {
  const toast = useToast()
  const [reason, setReason] = useState<string>('TRANSFER')
  const [destination, setDestination] = useState('')
  const [destinationCity, setDestinationCity] = useState('')
  const [exitDate, setExitDate] = useState(todayIsoDate)
  const [observations, setObservations] = useState('')
  const [nothingToReport, setNothingToReport] = useState(true)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      const { blob, filename } = await enrollmentsApi.downloadExitCertificatePdf(studentId, {
        reason: reason || undefined,
        destination: destination.trim() || undefined,
        destinationCity: destinationCity.trim() || undefined,
        exitDate: exitDate || undefined,
        observations: observations.trim() || undefined,
        nothingToReport: nothingToReport ? '1' : '0',
      })
      triggerBlobDownload(blob, filename)
      toast.success('Certificat de radiation', filename)
      onClose()
    } catch (err) {
      toast.error('Radiation impossible', getApiErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6 mx-4 max-h-[90vh] overflow-y-auto">
        <h2 className="text-lg font-semibold text-zinc-900 mb-1">Certificat de radiation</h2>
        <p className="text-xs text-zinc-500 mb-5">
          Document officiel de guichet (identité RDC, scolarité, n° de pièce). Impression seule —
          n&apos;inactive pas le dossier. Un admin clôture le statut si besoin.
        </p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-zinc-500 mb-1">Motif</label>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm text-zinc-800"
            >
              {EXIT_REASONS.map((r) => (
                <option key={r.value} value={r.value}>{r.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-500 mb-1">Date de radiation</label>
            <input
              type="date"
              required
              value={exitDate}
              onChange={(e) => setExitDate(e.target.value)}
              className="w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm text-zinc-800"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2 sm:col-span-1">
              <label className="block text-xs font-medium text-zinc-500 mb-1">
                Établissement d&apos;accueil
              </label>
              <input
                type="text"
                maxLength={120}
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
                placeholder="Ex. Collège Saint-Joseph"
                className="w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm text-zinc-800"
              />
            </div>
            <div className="col-span-2 sm:col-span-1">
              <label className="block text-xs font-medium text-zinc-500 mb-1">Ville d&apos;accueil</label>
              <input
                type="text"
                maxLength={80}
                value={destinationCity}
                onChange={(e) => setDestinationCity(e.target.value)}
                placeholder="Ex. Lubumbashi"
                className="w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm text-zinc-800"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-500 mb-1">
              Observations <span className="text-zinc-400">(optionnel)</span>
            </label>
            <textarea
              maxLength={280}
              rows={3}
              value={observations}
              onChange={(e) => setObservations(e.target.value)}
              placeholder="Mention libre pour l’établissement d’accueil (pas de montants)."
              className="w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm text-zinc-800"
            />
          </div>
          <label className="flex items-start gap-2 text-sm text-zinc-700">
            <input
              type="checkbox"
              checked={nothingToReport}
              onChange={(e) => setNothingToReport(e.target.checked)}
              className="mt-0.5"
            />
            <span>
              Mention « rien à signaler » sur le plan disciplinaire
              <span className="block text-xs text-zinc-400">Décochez si le document ne doit pas porter cette phrase.</span>
            </span>
          </label>
          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 rounded-xl border border-zinc-200 text-sm text-zinc-600 hover:bg-zinc-50"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 rounded-xl bg-emerald-600 text-sm text-white font-medium hover:bg-emerald-700 disabled:opacity-50"
            >
              {loading ? 'Génération…' : 'Télécharger le PDF'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function ParentSummonsModal({ studentId, onClose }: { studentId: number; onClose: () => void }) {
  const toast = useToast()
  const [reason, setReason] = useState('MEETING')
  const [meetingDate, setMeetingDate] = useState(todayIsoDate)
  const [meetingTime, setMeetingTime] = useState('09:00')
  const [location, setLocation] = useState('')
  const [note, setNote] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      const { blob, filename } = await enrollmentsApi.downloadParentSummonsPdf(studentId, {
        reason: reason || undefined,
        meetingDate: meetingDate || undefined,
        meetingTime: meetingTime || undefined,
        location: location.trim() || undefined,
        note: note.trim() || undefined,
      })
      triggerBlobDownload(blob, filename)
      toast.success('Convocation parent', filename)
      onClose()
    } catch (err) {
      toast.error('Convocation impossible', getApiErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 mx-4 max-h-[90vh] overflow-y-auto">
        <h2 className="text-lg font-semibold text-zinc-900 mb-1">Convocation parent</h2>
        <p className="text-xs text-zinc-500 mb-5">
          Impression seule — ce document n&apos;envoie pas de SMS ni de notification.
        </p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-zinc-500 mb-1">Objet</label>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm text-zinc-800"
            >
              {SUMMONS_REASONS.map((r) => (
                <option key={r.value} value={r.value}>{r.label}</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-zinc-500 mb-1">Date</label>
              <input
                type="date"
                required
                value={meetingDate}
                onChange={(e) => setMeetingDate(e.target.value)}
                className="w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm text-zinc-800"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-500 mb-1">Heure</label>
              <input
                type="time"
                value={meetingTime}
                onChange={(e) => setMeetingTime(e.target.value)}
                className="w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm text-zinc-800"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-500 mb-1">
              Lieu <span className="text-zinc-400">(défaut : secrétariat)</span>
            </label>
            <input
              type="text"
              maxLength={120}
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Secrétariat de l'établissement"
              className="w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm text-zinc-800"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-500 mb-1">
              Mention <span className="text-zinc-400">(optionnel)</span>
            </label>
            <textarea
              maxLength={280}
              rows={3}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Ex. Merci d'apporter le carnet de correspondance."
              className="w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm text-zinc-800"
            />
          </div>
          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 rounded-xl border border-zinc-200 text-sm text-zinc-600 hover:bg-zinc-50"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 rounded-xl bg-emerald-600 text-sm text-white font-medium hover:bg-emerald-700 disabled:opacity-50"
            >
              {loading ? 'Génération…' : 'Télécharger le PDF'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function ExitPassModal({
  studentId,
  youngChild,
  dossierParentName,
  dossierParentPhone,
  onClose,
}: {
  studentId: number
  youngChild: boolean
  dossierParentName?: string | null
  dossierParentPhone?: string | null
  onClose: () => void
}) {
  const toast = useToast()
  const [reason, setReason] = useState('FAMILY')
  const [exitDate, setExitDate] = useState(todayIsoDate)
  const [timeFrom, setTimeFrom] = useState('10:00')
  const [timeTo, setTimeTo] = useState('12:00')
  const [destination, setDestination] = useState('')
  const [companion, setCompanion] = useState('')
  const [unaccompanied, setUnaccompanied] = useState(false)
  const [parentVisa, setParentVisa] = useState<'PRESENT' | 'PHONE' | 'NONE'>(youngChild ? 'PRESENT' : 'PHONE')
  const [pickerKind, setPickerKind] = useState<'LINKED' | 'MANDATED'>('LINKED')
  const [pickerPhone, setPickerPhone] = useState('')
  const [pickerIdNumber, setPickerIdNumber] = useState('')
  const [pickerRelation, setPickerRelation] = useState('')
  const [note, setNote] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (youngChild && pickerKind === 'MANDATED' && !pickerIdNumber.trim()) {
      toast.error('Pièce obligatoire', 'Pour un enfant en bas âge, notez la pièce d’identité de la personne.')
      return
    }
    if (youngChild && pickerKind === 'MANDATED' && parentVisa === 'NONE') {
      toast.error('Appel parent', 'Confirmez par téléphone que le parent a envoyé cette personne.')
      return
    }
    setLoading(true)
    try {
      const { blob, filename } = await enrollmentsApi.downloadExitPassPdf(studentId, {
        reason: reason || undefined,
        exitDate: exitDate || undefined,
        timeFrom: timeFrom || undefined,
        timeTo: timeTo || undefined,
        destination: destination.trim() || undefined,
        companion: unaccompanied ? undefined : companion.trim() || undefined,
        unaccompanied: !youngChild && unaccompanied ? '1' : undefined,
        parentVisa: youngChild && parentVisa === 'NONE' ? 'PHONE' : parentVisa,
        pickerKind,
        pickerName: companion.trim() || undefined,
        pickerPhone: pickerPhone.trim() || undefined,
        pickerIdNumber: pickerIdNumber.trim() || undefined,
        pickerRelation: pickerRelation.trim() || undefined,
        note: note.trim() || undefined,
      })
      triggerBlobDownload(blob, filename)
      toast.success('Autorisation de sortie', filename)
      onClose()
    } catch (err) {
      toast.error('Autorisation impossible', getApiErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6 mx-4 max-h-[90vh] overflow-y-auto">
        <h2 className="text-lg font-semibold text-zinc-900 mb-1">Autorisation de sortie</h2>
        <p className="text-xs text-zinc-500 mb-5">
          {youngChild
            ? 'Enfant en bas âge : comparer la personne au dossier, ou noter un mandat (pièce + appel au parent). Pas de sortie seule.'
            : 'Autorisation du jour pour une personne sans carte parent. Demandez une signature ou appelez le parent.'}
        </p>
        <form onSubmit={handleSubmit} className="space-y-4">
          {youngChild && (
            <p className="text-xs rounded-xl bg-amber-50 text-amber-800 px-3 py-2">
              Dossier parent : {dossierParentName || 'non lié'} {dossierParentPhone ? `· ${dossierParentPhone}` : ''}
              — vérifiez la pièce avant de remettre l’enfant.
            </p>
          )}
          <fieldset className="space-y-2">
            <legend className="text-xs font-medium text-zinc-500">Qui récupère l’enfant ?</legend>
            {([
              { value: 'LINKED' as const, label: 'Parent / tuteur du dossier', hint: 'Comparer nom et téléphone avec la fiche.' },
              { value: 'MANDATED' as const, label: 'Personne non déclarée à l’inscription', hint: 'Sans carte parent : pièce d’identité et appel au parent.' },
            ]).map((opt) => (
              <label key={opt.value} className="flex items-start gap-2 text-sm text-zinc-700">
                <input
                  type="radio"
                  name="pickerKind"
                  checked={pickerKind === opt.value}
                  onChange={() => {
                    setPickerKind(opt.value)
                    if (opt.value === 'MANDATED') setParentVisa('PHONE')
                    if (opt.value === 'LINKED') setParentVisa('PRESENT')
                  }}
                  className="mt-0.5"
                />
                <span>
                  {opt.label}
                  <span className="block text-xs text-zinc-400">{opt.hint}</span>
                </span>
              </label>
            ))}
          </fieldset>
          <fieldset className="space-y-2">
            <legend className="text-xs font-medium text-zinc-500">Accord parent</legend>
            {([
              { value: 'PHONE' as const, label: 'Parent prévenu par téléphone', hint: 'Le n° du dossier est imprimé. Pas de signature sur place.' },
              { value: 'PRESENT' as const, label: 'Parent ou accompagnateur présent', hint: 'Il signe le papier au guichet.' },
              ...(!youngChild
                ? [{ value: 'NONE' as const, label: 'Autorisation du secrétariat seulement', hint: 'Activité scolaire, parent injoignable, etc.' }]
                : []),
            ]).map((opt) => (
              <label key={opt.value} className="flex items-start gap-2 text-sm text-zinc-700">
                <input
                  type="radio"
                  name="parentVisa"
                  checked={parentVisa === opt.value}
                  onChange={() => setParentVisa(opt.value)}
                  className="mt-0.5"
                />
                <span>
                  {opt.label}
                  <span className="block text-xs text-zinc-400">{opt.hint}</span>
                </span>
              </label>
            ))}
          </fieldset>
          <div>
            <label className="block text-xs font-medium text-zinc-500 mb-1">Motif</label>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm text-zinc-800"
            >
              {EXIT_PASS_REASONS.map((r) => (
                <option key={r.value} value={r.value}>{r.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-500 mb-1">Date</label>
            <input
              type="date"
              required
              value={exitDate}
              onChange={(e) => setExitDate(e.target.value)}
              className="w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm text-zinc-800"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-zinc-500 mb-1">Sortie à</label>
              <input
                type="time"
                value={timeFrom}
                onChange={(e) => setTimeFrom(e.target.value)}
                className="w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm text-zinc-800"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-500 mb-1">Retour prévu</label>
              <input
                type="time"
                value={timeTo}
                onChange={(e) => setTimeTo(e.target.value)}
                className="w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm text-zinc-800"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-500 mb-1">
              Destination <span className="text-zinc-400">(optionnel)</span>
            </label>
            <input
              type="text"
              maxLength={120}
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
              placeholder="Ex. Centre de santé, domicile"
              className="w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm text-zinc-800"
            />
          </div>
          {!youngChild && (
            <label className="flex items-start gap-2 text-sm text-zinc-700">
              <input
                type="checkbox"
                checked={unaccompanied}
                onChange={(e) => setUnaccompanied(e.target.checked)}
                className="mt-0.5"
              />
              <span>Sortie seule / seul (sans accompagnateur)</span>
            </label>
          )}
          {!unaccompanied && (
            <div>
              <label className="block text-xs font-medium text-zinc-500 mb-1">
                {pickerKind === 'MANDATED' ? 'Nom de la personne envoyée' : 'Nom de la personne présente'}
                {pickerKind === 'LINKED' ? <span className="text-zinc-400"> (défaut : parent du dossier)</span> : null}
              </label>
              <input
                type="text"
                maxLength={120}
                required={pickerKind === 'MANDATED'}
                value={companion}
                onChange={(e) => setCompanion(e.target.value)}
                placeholder={pickerKind === 'MANDATED' ? 'Ex. KABANGE Paul' : dossierParentName || "Nom de l'accompagnateur"}
                className="w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm text-zinc-800"
              />
            </div>
          )}
          {pickerKind === 'MANDATED' && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-zinc-500 mb-1">Lien avec l’enfant</label>
                  <input
                    type="text"
                    maxLength={40}
                    value={pickerRelation}
                    onChange={(e) => setPickerRelation(e.target.value)}
                    placeholder="Tante, oncle, chauffeur…"
                    className="w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm text-zinc-800"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-500 mb-1">Tél. de cette personne</label>
                  <input
                    type="tel"
                    maxLength={30}
                    value={pickerPhone}
                    onChange={(e) => setPickerPhone(e.target.value)}
                    placeholder="+243…"
                    className="w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm text-zinc-800"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-500 mb-1">
                  Pièce d’identité {youngChild ? '*' : <span className="text-zinc-400">(recommandé)</span>}
                </label>
                <input
                  type="text"
                  maxLength={40}
                  required={youngChild}
                  value={pickerIdNumber}
                  onChange={(e) => setPickerIdNumber(e.target.value)}
                  placeholder="N° carte d’électeur, permis…"
                  className="w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm text-zinc-800"
                />
              </div>
            </>
          )}
          <div>
            <label className="block text-xs font-medium text-zinc-500 mb-1">
              Mention <span className="text-zinc-400">(optionnel)</span>
            </label>
            <textarea
              maxLength={280}
              rows={2}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Ex. Reprise des cours l'après-midi."
              className="w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm text-zinc-800"
            />
          </div>
          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 rounded-xl border border-zinc-200 text-sm text-zinc-600 hover:bg-zinc-50"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 rounded-xl bg-emerald-600 text-sm text-white font-medium hover:bg-emerald-700 disabled:opacity-50"
            >
              {loading ? 'Génération…' : 'Télécharger le PDF'}
            </button>
          </div>
        </form>
      </div>
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
      <h2 className="text-sm font-semibold text-zinc-700 mb-4 flex items-center gap-2"><Camera size={14} /> Photo et documents</h2>
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
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-zinc-50 p-8 space-y-4 max-w-4xl mx-auto">
          <div className="h-8 w-48 rounded-xl bg-zinc-200 animate-pulse" />
          <div className="h-48 rounded-xl bg-zinc-200 animate-pulse" />
          <div className="h-64 rounded-xl bg-zinc-200 animate-pulse" />
        </div>
      }
    >
      <StudentDetailPageContent />
    </Suspense>
  )
}

function StudentDetailPageContent() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const searchParams = useSearchParams()
  const toast = useToast()
  const { user } = useAuth()
  const deskOnly = isItDesk(user?.role)
  const studentId = Number(id)

  const {
    data: student,
    isPending,
    isError,
    error: studentError,
    refetch: refetchStudent,
  } = useStudentDetail(studentId)
  const { data: enrollmentDetail } = useEnrollmentDetail(studentId)
  const { data: activity, isLoading: loadingActivity } = useStudentActivity(studentId)
  const { data: dossier } = useDossierStatus(studentId)
  const { data: branding } = useSchoolBranding()
  const securityMutation = useSecurityAction()
  const toggleLockMutation = useToggleLock()
  const syncMutation = useSyncBalance()
  const { mutate: logPiiAccess } = useLogPiiAccess()

  const feeAttributionSessionId = useMemo(() => {
    const enrollments = enrollmentDetail?.enrollments ?? []
    const current = enrollments.find((e) => e.session?.isCurrent)
    return current?.sessionId ?? enrollments[0]?.sessionId
  }, [enrollmentDetail?.enrollments])

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
  const [downloadingCertificate, setDownloadingCertificate] = useState(false)
  const [downloadingFiche, setDownloadingFiche] = useState(false)
  const [downloadingAttendance, setDownloadingAttendance] = useState(false)
  const [showExitCertificate, setShowExitCertificate] = useState(false)
  const [showParentSummons, setShowParentSummons] = useState(false)
  const [showExitPass, setShowExitPass] = useState(false)
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

  const docParam = searchParams.get('doc')
  useEffect(() => {
    if (docParam === 'exit') setShowExitCertificate(true)
    if (docParam === 'summons') setShowParentSummons(true)
    if (docParam === 'pass') setShowExitPass(true)
    if (docParam === 'pickup') {
      requestAnimationFrame(() => document.getElementById('pickup-adults')?.scrollIntoView({ behavior: 'smooth' }))
    }
  }, [docParam])

  function closeDeskDocModal() {
    setShowExitCertificate(false)
    setShowParentSummons(false)
    setShowExitPass(false)
    if (searchParams.get('doc')) {
      router.replace(`/admin/students/${studentId}`)
    }
  }

  const cardData = useMemo(() => {
    if (!student) return null
    try {
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
      feesBalance: deskOnly ? undefined : student.feesBalance ?? student.debtAmount ?? enrollmentDetail?.feesBalance,
      isPaymentLocked: student.isPaymentLocked,
    })
    } catch {
      return null
    }
  }, [student, branding, enrollmentDetail, deskOnly])

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

  async function handleDownloadCertificate() {
    setDownloadingCertificate(true)
    try {
      const { blob, filename } = await enrollmentsApi.downloadEnrollmentCertificatePdf(studentId)
      triggerBlobDownload(blob, filename)
      toast.success('Attestation téléchargée', filename)
    } catch (err) {
      toast.error('Attestation impossible', getApiErrorMessage(err))
    } finally {
      setDownloadingCertificate(false)
    }
  }

  async function handleDownloadFiche() {
    setDownloadingFiche(true)
    try {
      const { blob, filename } = await enrollmentsApi.downloadStudentFichePdf(studentId)
      triggerBlobDownload(blob, filename)
      toast.success('Fiche d’inscription', filename)
    } catch (err) {
      toast.error('Fiche d’inscription impossible', getApiErrorMessage(err))
    } finally {
      setDownloadingFiche(false)
    }
  }

  async function handleDownloadAttendance() {
    setDownloadingAttendance(true)
    try {
      const { blob, filename } = await enrollmentsApi.downloadAttendanceCertificatePdf(studentId)
      triggerBlobDownload(blob, filename)
      toast.success('Justificatif de présence', filename)
    } catch (err) {
      toast.error('Justificatif impossible', getApiErrorMessage(err))
    } finally {
      setDownloadingAttendance(false)
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

  if (!Number.isFinite(studentId) || studentId <= 0) {
    return (
      <div className="min-h-screen bg-zinc-50 flex items-center justify-center">
        <p className="text-sm text-zinc-400">Élève introuvable.</p>
      </div>
    )
  }

  if (isPending) {
    return (
      <div className="min-h-screen bg-zinc-50 p-8 space-y-4 max-w-4xl mx-auto">
        <Sk className="h-8 w-48" />
        <Sk className="h-48" />
        <Sk className="h-64" />
      </div>
    )
  }

  if (isError || !student?.id) {
    return (
      <div className="min-h-[60vh] bg-white flex flex-col items-center justify-center gap-4 px-6">
        <p className="text-base font-semibold text-zinc-900 text-center">
          La fiche de l’élève #{studentId} ne s’est pas ouverte.
        </p>
        <p className="text-sm text-zinc-600 text-center max-w-md">
          {getApiErrorMessage(studentError) || 'Élève introuvable.'}
        </p>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => void refetchStudent()}
            className="rounded-lg bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-700"
          >
            Réessayer
          </button>
          <button
            type="button"
            onClick={() => router.push('/admin/students')}
            className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
          >
            Retour à la liste
          </button>
        </div>
      </div>
    )
  }

  const sc = STATUS_CFG[student.status] ?? { label: student.status, cls: 'bg-zinc-100 text-zinc-500' }
  const debtAmount = student.debtAmount ?? 0
  const studentDisplayName = formatStudentDisplayName(student)
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
        <div className="max-w-4xl mx-auto px-8 py-5">
          <div className="flex items-start gap-4">
            <button
              onClick={() => router.back()}
              className="mt-1 p-1.5 rounded-lg hover:bg-zinc-100 text-zinc-400 transition-colors"
            >
              <ArrowLeft size={16} />
            </button>
            <div className="h-16 w-16 rounded-2xl overflow-hidden flex-shrink-0 ring-1 ring-zinc-200">
              <StudentCardPhoto
                photoUrl={student.photoUrl ?? null}
                firstName={student.prenom || student.firstName}
                lastName={student.lastName}
              />
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="text-xl font-semibold tracking-tight text-zinc-900">{studentDisplayName}</h1>
              <p className="text-sm text-zinc-500 mt-0.5">
                {[
                  student.className || 'Classe à compléter',
                  student.academicYear || enrollmentDetail?.academicYear || 'Année à compléter',
                  ageLabel(student.dateOfBirth),
                  student.placeOfBirth,
                ].filter(Boolean).join(' · ')}
              </p>
              <p className="text-sm mt-1">
                {student.parentName ? (
                  <span className="text-zinc-700">
                    {student.parentName}{student.parentPhone ? ` · ${student.parentPhone}` : ''}
                  </span>
                ) : (
                  <span className="text-zinc-400">Tuteur à compléter</span>
                )}
              </p>
              {student.matricule && (
                <p className="text-xs font-mono text-zinc-400 mt-1">{student.matricule}</p>
              )}
              {(student.bloodGroup || student.allergies) && (
                <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-xs font-medium text-red-800 ring-1 ring-red-100">
                  Urgence
                  {student.bloodGroup ? ` · Groupe ${student.bloodGroup}` : ''}
                  {student.allergies ? ` · ${student.allergies}` : ''}
                </p>
              )}
              <div className="flex flex-wrap gap-1.5 mt-3">
                <GlancePill
                  label={sc.label}
                  tone={student.status === 'ACTIVE' ? 'ok' : student.status === 'SUSPENDED' ? 'bad' : 'neutral'}
                />
                <GlancePill
                  label={
                    (deskOnly ? (dossierItem?.isFinanciallyCleared ?? debtAmount <= 0) : debtAmount <= 0)
                      ? 'En ordre'
                      : deskOnly
                        ? 'Dette'
                        : `Dette ${fmtMoney(debtAmount)}`
                  }
                  tone={(deskOnly ? (dossierItem?.isFinanciallyCleared ?? debtAmount <= 0) : debtAmount <= 0) ? 'ok' : 'bad'}
                />
                <GlancePill {...todayPresenceLabel(student.lastPresence, student.lastPresenceStatus)} />
                <GlancePill
                  label={dossierItem?.completionRate == null ? 'Dossier' : `Dossier ${Math.round(dossierItem.completionRate)} %`}
                  tone={(dossierItem?.completionRate ?? 0) >= 80 ? 'ok' : (dossierItem?.completionRate ?? 0) > 0 ? 'warn' : 'neutral'}
                />
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

        <div className="bg-white rounded-xl border border-zinc-200 shadow-[0_1px_4px_rgba(0,0,0,0.06)] px-4 py-3">
          <p className="text-sm font-semibold text-zinc-800 mb-2">Documents de guichet</p>
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={handleDownloadCertificate}
              disabled={downloadingCertificate || student.status !== 'ACTIVE'}
              className={deskDocButtonClass()}
            >
              {downloadingCertificate ? <Loader2 size={12} className="animate-spin" /> : <FileCheck size={12} />}
              Attestation
            </button>
            <button
              type="button"
              onClick={handleDownloadFiche}
              disabled={downloadingFiche || student.status !== 'ACTIVE'}
              className={deskDocButtonClass()}
            >
              {downloadingFiche ? <Loader2 size={12} className="animate-spin" /> : <FileEdit size={12} />}
              Fiche d’inscription
            </button>
            <button
              type="button"
              onClick={handleDownloadAttendance}
              disabled={downloadingAttendance || student.status !== 'ACTIVE'}
              className={deskDocButtonClass()}
            >
              {downloadingAttendance ? <Loader2 size={12} className="animate-spin" /> : <Clock size={12} />}
              Présence
            </button>
            <button
              type="button"
              onClick={() => setShowExitCertificate(true)}
              disabled={!student.matricule || student.status === 'PENDING_ENROLLMENT' || student.status === 'DELETED'}
              className={deskDocButtonClass()}
            >
              <FileMinus size={12} />
              Radiation
            </button>
            <button
              type="button"
              onClick={() => setShowParentSummons(true)}
              disabled={!student.matricule || student.status === 'PENDING_ENROLLMENT' || student.status === 'DELETED'}
              className={deskDocButtonClass()}
            >
              <Mail size={12} />
              Convocation
            </button>
            <button
              type="button"
              onClick={() => document.getElementById('pickup-adults')?.scrollIntoView({ behavior: 'smooth' })}
              className="h-8 flex items-center gap-1.5 px-2.5 rounded-lg text-[11px] font-semibold bg-emerald-600 text-white hover:bg-emerald-700"
            >
              <Contact size={12} />
              Cartes parent
            </button>
            <button
              type="button"
              onClick={() =>
                document.getElementById('administrative-career')?.scrollIntoView({ behavior: 'smooth' })
              }
              className={deskDocButtonClass()}
            >
              <Briefcase size={12} />
              Orientation
            </button>
            <button
              type="button"
              onClick={() => setShowExitPass(true)}
              disabled={student.status !== 'ACTIVE'}
              className={deskDocButtonClass()}
            >
              <DoorOpen size={12} />
              Sortie
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

          <div className="lg:col-span-2 space-y-4">
            <div className="bg-white rounded-xl border border-zinc-200 shadow-[0_1px_4px_rgba(0,0,0,0.06)] p-5 space-y-5">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-sm font-semibold text-zinc-700 flex items-center gap-2">
                  <User size={14} /> Dossier élève
                </h2>
                <button
                  type="button"
                  onClick={() => setShowAdminProfile(true)}
                  className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 hover:text-emerald-800"
                >
                  <FileEdit size={12} /> Mettre à jour
                </button>
              </div>

              <section>
                <h3 className="text-[11px] font-semibold uppercase tracking-wide text-zinc-400 mb-1">
                  État civil &amp; identité
                </h3>
                <InfoRow label="Nom complet" value={formatRdcFullName(student)} />
                <InfoRow label="Nom" value={identity.nom} />
                <InfoRow label="Postnom" value={identity.postnom} />
                <InfoRow label="Prénom" value={identity.prenom} />
                <InfoRow label="Prénom d'usage" value={identity.prenomUsage} skipEmpty />
                <InfoRow
                  label="Genre"
                  value={
                    student.gender === 'M' || student.gender === 'MALE'
                      ? 'Masculin'
                      : student.gender === 'F' || student.gender === 'FEMALE'
                        ? 'Féminin'
                        : student.gender
                  }
                />
                <InfoRow
                  label="Date de naissance"
                  value={
                    student.dateOfBirth
                      ? new Date(student.dateOfBirth).toLocaleDateString('fr-FR')
                      : undefined
                  }
                />
                <InfoRow label="Lieu de naissance" value={student.placeOfBirth} />
                <InfoRow label="Nationalité" value={student.nationality} />
                <InfoRow label="Adresse" value={student.address} />
              </section>

              <section>
                <h3 className="text-[11px] font-semibold uppercase tracking-wide text-zinc-400 mb-1">
                  Scolarité &amp; année
                </h3>
                <InfoRow label="Classe" value={student.className} />
                <InfoRow
                  label="Année scolaire"
                  value={student.academicYear ?? enrollmentDetail?.academicYear}
                />
                <InfoRow label="Email élève" value={student.email} />
                <InfoRow label="Téléphone" value={student.phone} />
              </section>

              <section>
                <h3 className="text-[11px] font-semibold uppercase tracking-wide text-zinc-400 mb-1">
                  Parent / tuteur
                </h3>
                <InfoRow
                  label="Parent/Tuteur"
                  value={student.parentName ?? student.emergencyContactName}
                />
                <InfoRow
                  label="Tél. parent"
                  value={student.parentPhone ?? student.emergencyContactPhone}
                />
                <InfoRow label="Email parent" value={student.parentEmail} />
              </section>

              <section>
                <h3 className="text-[11px] font-semibold uppercase tracking-wide text-zinc-400 mb-1">
                  Biométrie &amp; santé
                </h3>
                <InfoRow
                  label="Biométrie"
                  value={labelBiometricStatus(
                    student.biometricStatus ?? enrollmentDetail?.biometricStatus,
                  )}
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
              </section>
            </div>

            <PhotoDocumentsCard
              studentId={studentId}
              firstName={identity.prenom || student.firstName}
              lastName={identity.nom || student.lastName}
              photoUrl={student.photoUrl}
              birthCertificateUrl={student.birthCertificateUrl}
              enrollmentFormUrl={student.enrollmentFormUrl}
            />

            <PickupAdultsPanel studentId={studentId} />
            <StudentGuardiansPanel studentId={studentId} />
            <StudentAdministrativeCareerPanel
              studentId={studentId}
              studentName={formatRdcFullName(student)}
              schoolName={
                branding?.name?.trim() || student.schoolName?.trim() || 'Établissement scolaire'
              }
            />
            <RevokeIssuedDocumentPanel />

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

            <div className="bg-white rounded-xl border border-zinc-200 shadow-[0_1px_4px_rgba(0,0,0,0.06)] p-5 space-y-5">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-sm font-semibold text-zinc-700 flex items-center gap-2">
                  <Wallet size={14} /> Finance
                </h2>
                {!deskOnly && (
                <a
                  href="/admin/finance/paiements"
                  className="text-xs font-medium text-emerald-700 hover:text-emerald-800"
                >
                  Guichet paiements →
                </a>
                )}
              </div>
              {deskOnly ? (
                <div className={cn(
                  'rounded-xl p-4 border',
                  dossier?.isFinanciallyCleared
                    ? 'bg-emerald-50 border-emerald-100'
                    : 'bg-red-50 border-red-100',
                )}>
                  <p className="text-[11px] uppercase tracking-wide text-zinc-500 mb-1">Situation</p>
                  <p className="text-base font-semibold text-zinc-900">
                    {dossier?.isFinanciallyCleared ? 'En ordre' : 'Dette en cours'}
                  </p>
                  <p className="text-xs text-zinc-500 mt-1">Les montants restent au service finance.</p>
                </div>
              ) : (
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
              )}

              <div className="border-t border-zinc-100 pt-5 space-y-5">
                <StudentFeeAssignmentPanel
                  studentId={studentId}
                  sessionId={feeAttributionSessionId}
                  hideAmounts={deskOnly}
                />
                {!deskOnly && (
                <StudentFinanceDashboard
                  studentId={studentId}
                  api="admin"
                  allowPay={false}
                  showNav={false}
                  compactHeader
                />
                )}
              </div>
            </div>

            <div className="bg-white rounded-xl border border-zinc-200 shadow-[0_1px_4px_rgba(0,0,0,0.06)] overflow-hidden">
              <div className="px-5 py-4 border-b border-zinc-100">
                <h2 className="text-sm font-semibold text-zinc-700 flex items-center gap-2"><Clock size={14} /> Activité récente</h2>
              </div>
              {loadingActivity ? (
                <div className="p-4 space-y-3">{[...Array(4)].map((_, i) => <Sk key={i} className="h-10" />)}</div>
              ) : (activity as unknown[])?.length ? (
                <div className="divide-y divide-zinc-50 max-h-72 overflow-y-auto">
                  {((activity as unknown as Array<Record<string, unknown>>) ?? []).map((evt, index) => {
                    const line = activitySentence(evt, index)
                    return (
                      <div key={line.key} className="px-5 py-3 flex items-start gap-3">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-2 flex-shrink-0" />
                        <p className="text-sm text-zinc-700">{line.text}</p>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div className="py-8 text-center text-sm text-zinc-400">Aucune activité</div>
              )}
            </div>
          </div>
          <div className="space-y-4">

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
            <div className="bg-white rounded-xl border border-zinc-200 shadow-[0_1px_4px_rgba(0,0,0,0.06)] p-5">
              <h2 className="text-sm font-semibold text-zinc-700 mb-3">Présence du mois</h2>
              {student.monthPresenceRate == null ? (
                <p className="text-sm text-zinc-400">Aucun pointage ce mois.</p>
              ) : (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-zinc-500">Taux</span>
                    <span className="text-sm font-bold text-zinc-900 tabular-nums">{student.monthPresenceRate} %</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-zinc-500">Présences</span>
                    <span className="text-sm font-medium text-zinc-800 tabular-nums">{student.monthPresent ?? 0}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-zinc-500">Retards</span>
                    <span className="text-sm font-medium text-zinc-800 tabular-nums">{student.monthLate ?? 0}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-zinc-500">Absences</span>
                    <span className="text-sm font-medium text-zinc-800 tabular-nums">{student.monthAbsent ?? 0}</span>
                  </div>
                </div>
              )}
              {student.lastPresence && (
                <p className="text-xs text-zinc-400 mt-3">
                  Dernier pointage le {new Date(student.lastPresence).toLocaleDateString('fr-FR')}
                </p>
              )}
            </div>

            {!deskOnly && (
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
            )}

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

      {showExitCertificate && (
        <ExitCertificateModal studentId={studentId} onClose={closeDeskDocModal} />
      )}
      {showParentSummons && (
        <ParentSummonsModal studentId={studentId} onClose={closeDeskDocModal} />
      )}
      {showExitPass && (
        <ExitPassModal
          studentId={studentId}
          youngChild={isYoungPickupStudent(student.dateOfBirth, student.className)}
          dossierParentName={student.parentName}
          dossierParentPhone={student.parentPhone}
          onClose={closeDeskDocModal}
        />
      )}
    </div>
  )
}
