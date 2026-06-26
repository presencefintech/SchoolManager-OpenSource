'use client'

import { Suspense, useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { motion } from 'framer-motion'
import {
  Bot, ShieldCheck, AlertTriangle, Lock, LockOpen,
  Clock, Search, Trash2, CheckCircle, XCircle, Fingerprint,
  RefreshCw, UserPlus, ImagePlus, FileDown, Info,
  GraduationCap, Building2, Sparkles, Loader2,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useSchools, useWorkerHealth, useFinanceAudit, useClasses } from '@/lib/hooks/use-super-admin'
import { superAdminApi } from '@/lib/superAdmin/api'
import { enrollmentApi } from '@/lib/superAdmin/api/enrollment.api'

/* â"€â"€ design system (page) â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€ */

function Sk({ className }: { className?: string }) {
  return <div className={cn('rounded-2xl bg-zinc-100/80 animate-pulse', className)} />
}

function ActionResult({ result }: { result: { type: 'success' | 'error'; message: string } | null }) {
  if (!result) return null
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        'flex items-start gap-2.5 px-4 py-3 rounded-xl border text-sm',
        result.type === 'success'
          ? 'border-emerald-200/80 bg-emerald-50/90 text-emerald-800'
          : 'border-red-200/80 bg-red-50/90 text-red-800',
      )}
    >
      {result.type === 'success' ? (
        <CheckCircle size={16} className="flex-shrink-0 mt-0.5" />
      ) : (
        <XCircle size={16} className="flex-shrink-0 mt-0.5" />
      )}
      <span className="leading-snug">{result.message}</span>
    </motion.div>
  )
}

function Panel({
  children,
  className,
  padding = true,
}: {
  children: React.ReactNode
  className?: string
  padding?: boolean
}) {
  return (
    <div
      className={cn(
        'bg-white rounded-2xl border border-zinc-200/80 shadow-[0_1px_3px_rgba(0,0,0,0.04)]',
        padding && 'p-6',
        className,
      )}
    >
      {children}
    </div>
  )
}

function PanelHeader({
  icon: Icon,
  iconClass,
  title,
  description,
  action,
}: {
  icon: React.ElementType
  iconClass?: string
  title: string
  description?: string
  action?: React.ReactNode
}) {
  return (
    <div className="flex items-start justify-between gap-4 mb-5">
      <div className="flex items-start gap-3">
        <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0', iconClass ?? 'bg-indigo-50 text-indigo-600')}>
          <Icon size={18} />
        </div>
        <div>
          <h2 className="text-sm font-semibold text-zinc-900">{title}</h2>
          {description && <p className="text-xs text-zinc-500 mt-0.5 leading-relaxed max-w-prose">{description}</p>}
        </div>
      </div>
      {action}
    </div>
  )
}

function MetricTile({
  icon: Icon,
  label,
  value,
  sub,
  tone,
}: {
  icon: React.ElementType
  label: string
  value: string | number
  sub: string
  tone: 'ok' | 'warn' | 'danger'
}) {
  const tones = {
    ok: { ring: 'ring-emerald-500/10', icon: 'bg-emerald-50 text-emerald-600', val: 'text-emerald-600' },
    warn: { ring: 'ring-amber-500/10', icon: 'bg-amber-50 text-amber-600', val: 'text-amber-600' },
    danger: { ring: 'ring-red-500/10', icon: 'bg-red-50 text-red-600', val: 'text-red-600' },
  }[tone]

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn('relative overflow-hidden rounded-2xl border border-zinc-200/80 bg-white p-5 shadow-sm ring-1', tones.ring)}
    >
      <div className="flex items-start justify-between gap-3">
        <div className={cn('w-9 h-9 rounded-lg flex items-center justify-center', tones.icon)}>
          <Icon size={17} />
        </div>
      </div>
      <p className={cn('text-3xl font-bold tabular-nums tracking-tight mt-4', tones.val)}>{value}</p>
      <p className="text-xs font-medium text-zinc-700 mt-1">{label}</p>
      <p className="text-[11px] text-zinc-400 mt-0.5">{sub}</p>
    </motion.div>
  )
}

function FormBlock({
  step,
  title,
  hint,
  children,
}: {
  step: number
  title: string
  hint?: string
  children: React.ReactNode
}) {
  return (
    <div className="relative pl-4 border-l-2 border-indigo-100">
      <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-indigo-600 text-[9px] font-bold text-white flex items-center justify-center">
        {step}
      </div>
      <p className="text-sm font-semibold text-zinc-800">{title}</p>
      {hint && <p className="text-xs text-zinc-500 mt-0.5 mb-3">{hint}</p>}
      {!hint && <div className="mb-3" />}
      {children}
    </div>
  )
}

function EmptySchoolPrompt() {
  return (
    <div className="rounded-2xl border border-zinc-200/80 bg-white">
      <div className="px-8 py-10 text-center border-b border-zinc-100">
        <div className="w-10 h-10 rounded-xl bg-violet-50 flex items-center justify-center mx-auto mb-3">
          <Building2 size={20} className="text-violet-500" />
        </div>
        <p className="text-sm font-semibold text-zinc-800">Sélectionnez un établissement</p>
        <p className="text-xs text-zinc-400 mt-1">
          Utilisez le sélecteur en haut de page pour filtrer par école.
        </p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-zinc-100">
        {[
          {
            icon: UserPlus,
            color: 'bg-indigo-50 text-indigo-600',
            title: 'Inscription plateforme',
            desc: 'Créez un élève avec motif d\'intervention audité et génération de carte PDF.',
          },
          {
            icon: Bot,
            color: 'bg-amber-50 text-amber-600',
            title: 'Biométrie',
            desc: 'Suivez les élèves sans vecteur facial et injectez les données FaceNet.',
          },
          {
            icon: ShieldCheck,
            color: 'bg-emerald-50 text-emerald-600',
            title: 'Intégrité financière',
            desc: 'Détectez les signatures corrompues et consultez les IDs à investiguer.',
          },
        ].map((item) => (
          <div key={item.title} className="px-6 py-5 flex items-start gap-3">
            <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0', item.color)}>
              <item.icon size={15} />
            </div>
            <div>
              <p className="text-xs font-semibold text-zinc-700">{item.title}</p>
              <p className="text-[11px] text-zinc-400 mt-0.5 leading-relaxed">{item.desc}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

const inputCls =
  'h-10 w-full px-3.5 text-sm rounded-xl border border-zinc-200 bg-zinc-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/25 focus:border-indigo-400 transition-all placeholder:text-zinc-400'
const btnPrimary =
  'h-10 px-4 text-sm font-medium bg-zinc-900 text-white rounded-xl hover:bg-zinc-800 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-sm'
const textareaCls =
  'w-full px-3.5 py-2.5 text-sm rounded-xl border border-zinc-200 bg-zinc-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/25 focus:border-indigo-400 transition-all placeholder:text-zinc-400 resize-none'
const labelCls = 'text-xs font-medium text-zinc-600 block mb-1.5'
const hintCls = 'text-[11px] text-zinc-400 mt-1.5 leading-relaxed'
const MAX_PHOTO_BYTES = 5 * 1024 * 1024

/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */
function EnrollmentPageContent() {
  const searchParams = useSearchParams()
  const { data: schools } = useSchools()

  /* school selector */
  const [schoolId, setSchoolId] = useState<number | null>(null)
  const { data: workerHealth, isLoading: loadingWorker, refetch: refetchWorker } = useWorkerHealth(schoolId ?? 0)
  const { data: financeAudit, isLoading: loadingFinance, refetch: refetchFinance } = useFinanceAudit(schoolId ?? 0)

  /* student diagnostic */
  const [studentId, setStudentId] = useState('')
  const [integrity, setIntegrity] = useState<Record<string, unknown> | null>(null)
  const [integrityError, setIntegrityError] = useState<string | null>(null)
  const [loadingIntegrity, setLoadingIntegrity] = useState(false)

  /* shared action state */
  const [actionResult, setActionResult] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
  const [loading, setLoading] = useState<string | null>(null)

  /* grace period */
  const [graceUntil, setGraceUntil] = useState('')

  /* create student "" intervention plateforme */
  const [createFirstName, setCreateFirstName] = useState('')
  const [createLastName, setCreateLastName] = useState('')
  const [createSchoolId, setCreateSchoolId] = useState('')
  const [createClassId, setCreateClassId] = useState('')
  const [createBirthDate, setCreateBirthDate] = useState('')
  const [createGender, setCreateGender] = useState<'MALE' | 'FEMALE' | ''>('')
  const [createPlaceOfBirth, setCreatePlaceOfBirth] = useState('')
  const [createNationality, setCreateNationality] = useState('')
  const [createAcademicYear, setCreateAcademicYear] = useState('')
  const [createOverrideReason, setCreateOverrideReason] = useState('')
  const [createPhoto, setCreatePhoto] = useState<File | null>(null)
  const [createPhotoPreview, setCreatePhotoPreview] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [createResult, setCreateResult] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
  const [lastCreatedStudentId, setLastCreatedStudentId] = useState<number | null>(null)
  const [lastPdfCard, setLastPdfCard] = useState<string | null>(null)
  const { data: createClasses } = useClasses(Number(createSchoolId) || 0)

  useEffect(() => {
    const urlSchoolId = Number(searchParams.get('schoolId')) || 0
    const urlStudentId = searchParams.get('studentId')?.trim() ?? ''
    if (urlSchoolId > 0) setSchoolId(urlSchoolId)
    if (urlStudentId) setStudentId(urlStudentId)
  }, [searchParams])

  const selectedCreateSchool = schools?.find((s) => s.id === Number(createSchoolId))
  const selectedAuditSchool = schools?.find((s) => s.id === schoolId)
  const overrideReasonValid = createOverrideReason.trim().length >= 10
  const createFormValid =
    Boolean(createFirstName.trim() && createLastName.trim() && createSchoolId && createClassId && createBirthDate && createGender)
    && overrideReasonValid

  /* purge */
  const [purgeId, setPurgeId] = useState('')
  const [purgeWord, setPurgeWord] = useState('')
  const [loadingPurge, setLoadingPurge] = useState(false)

  /* biométrie */
  const [faceVectorJson, setFaceVectorJson] = useState('')

  /* â"€â"€ handlers â"€â"€ */

  async function checkIntegrity() {
    if (!studentId) return
    setLoadingIntegrity(true)
    setIntegrity(null)
    setIntegrityError(null)
    try {
      const data = await superAdminApi.getStudentIntegrity(Number(studentId))
      setIntegrity(data as Record<string, unknown>)
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } }
      setIntegrityError(err.response?.data?.message ?? 'Élève introuvable.')
    } finally {
      setLoadingIntegrity(false)
    }
  }

  async function runAction(key: string, fn: () => Promise<{ message?: string }>) {
    setLoading(key)
    setActionResult(null)
    try {
      const r = await fn()
      setActionResult({ type: 'success', message: r.message ?? 'Action effectuée.' })
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } }
      setActionResult({ type: 'error', message: err.response?.data?.message ?? 'Une erreur est survenue.' })
    } finally {
      setLoading(null)
    }
  }

  function clearCreatePhoto() {
    if (createPhotoPreview) URL.revokeObjectURL(createPhotoPreview)
    setCreatePhoto(null)
    setCreatePhotoPreview(null)
  }

  function resetCreateFields() {
    setCreateFirstName('')
    setCreateLastName('')
    setCreateSchoolId('')
    setCreateClassId('')
    setCreateBirthDate('')
    setCreateGender('')
    setCreatePlaceOfBirth('')
    setCreateNationality('')
    setCreateAcademicYear('')
    setCreateOverrideReason('')
    clearCreatePhoto()
  }

  function resetCreateForm() {
    resetCreateFields()
    setCreateResult(null)
    setLastCreatedStudentId(null)
    setLastPdfCard(null)
  }

  function handleCreatePhotoChange(file: File | null) {
    clearCreatePhoto()
    if (!file) return
    if (!file.type.startsWith('image/')) {
      setCreateResult({ type: 'error', message: 'La photo doit être une image (JPEG, PNG, WebP).' })
      return
    }
    if (file.size > MAX_PHOTO_BYTES) {
      setCreateResult({ type: 'error', message: 'Photo trop volumineuse (max 5 Mo).' })
      return
    }
    setCreatePhoto(file)
    setCreatePhotoPreview(URL.createObjectURL(file))
    setCreateResult(null)
  }

  function downloadStudentCardPdf() {
    if (!lastPdfCard) return
    const a = document.createElement('a')
    a.href = lastPdfCard
    a.download = `carte_eleve_${lastCreatedStudentId ?? 'nouveau'}.pdf`
    a.click()
  }

  async function runCreateStudent() {
    if (!createFormValid) return
    setCreating(true)
    setCreateResult(null)
    setLastCreatedStudentId(null)
    setLastPdfCard(null)
    try {
      const result = await enrollmentApi.createStudent(
        {
          firstName: createFirstName.trim(),
          lastName: createLastName.trim(),
          schoolId: Number(createSchoolId),
          classId: Number(createClassId),
          birthDate: createBirthDate,
          gender: createGender as 'MALE' | 'FEMALE',
          overrideReason: createOverrideReason.trim(),
          ...(createPlaceOfBirth.trim() ? { placeOfBirth: createPlaceOfBirth.trim() } : {}),
          ...(createNationality.trim() ? { nationality: createNationality.trim() } : {}),
          ...(createAcademicYear.trim() ? { academicYear: createAcademicYear.trim() } : {}),
        },
        createPhoto,
      )
      const { student } = result
      const matricule = student.matricule ? `, matricule ${student.matricule}` : ''
      const pdfNote = result.pdfWarning ? ' (carte PDF non générée)' : result.pdfCard ? ' — carte PDF disponible' : ''
      setLastCreatedStudentId(student.id)
      setLastPdfCard(result.pdfCard ?? null)
      setCreateResult({
        type: 'success',
        message: `Élève créé : ${student.firstName} ${student.lastName} (ID #${student.id}${matricule})${pdfNote}`,
      })
      setStudentId(String(student.id))
      resetCreateFields()
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } }
      setCreateResult({ type: 'error', message: err.response?.data?.message ?? 'Erreur lors de la création.' })
    } finally {
      setCreating(false)
    }
  }

  async function runInjectBiometrics() {
    if (!studentId || !faceVectorJson.trim()) return
    setLoading('biometrics')
    setActionResult(null)
    try {
      const parsed = JSON.parse(faceVectorJson) as unknown
      const faceVector = Array.isArray(parsed)
        ? parsed
        : (parsed as { faceVector?: unknown })?.faceVector
      if (!Array.isArray(faceVector) || faceVector.length < 128 || faceVector.length > 512) {
        throw new Error('Le vecteur doit contenir entre 128 et 512 nombres (FaceNet).')
      }
      if (!faceVector.every((n) => typeof n === 'number' && Number.isFinite(n))) {
        throw new Error('Chaque valeur du vecteur doit être un nombre.')
      }
      const r = await enrollmentApi.injectBiometrics(Number(studentId), { faceVector })
      setActionResult({
        type: 'success',
        message: r.message ?? `Vecteur facial injecté pour l'élève #${studentId} (${faceVector.length} dimensions).`,
      })
      setFaceVectorJson('')
      if (schoolId) refetchWorker()
    } catch (e: unknown) {
      const err = e as { message?: string; response?: { data?: { message?: string } } }
      setActionResult({
        type: 'error',
        message: err.response?.data?.message ?? err.message ?? 'Erreur lors de l\'injection biométrique.',
      })
    } finally {
      setLoading(null)
    }
  }

  async function runPurge() {
    if (!purgeId || purgeWord !== 'PURGE') return
    setLoadingPurge(true)
    setActionResult(null)
    try {
      await superAdminApi.purgeStudent(Number(purgeId))
      setActionResult({ type: 'success', message: `Élève #${purgeId} purgé définitivement.` })
      setPurgeId('')
      setPurgeWord('')
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } }
      setActionResult({ type: 'error', message: err.response?.data?.message ?? 'Erreur lors de la purge.' })
    } finally {
      setLoadingPurge(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#f6f7fb]">

      {/* Header */}
      <div className="bg-white border-b border-zinc-200/80">
        <div className="max-w-7xl mx-auto px-6 py-5">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-violet-50 flex items-center justify-center flex-shrink-0">
                <Sparkles size={17} className="text-violet-600" />
              </div>
              <div>
                <h1 className="text-base font-semibold text-zinc-900">Inscriptions</h1>
                <p className="text-xs text-zinc-400 mt-0.5">
                  {selectedAuditSchool ? selectedAuditSchool.name : 'Audit · intervention support · conformité élèves'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {schoolId && (
                <button
                  type="button"
                  onClick={() => { refetchWorker(); refetchFinance() }}
                  className="h-8 w-8 flex items-center justify-center rounded-lg border border-zinc-200 bg-white text-zinc-500 hover:bg-zinc-50 transition-all"
                >
                  <RefreshCw size={13} />
                </button>
              )}
              <div className="flex items-center gap-2 border border-zinc-200 rounded-lg px-3 py-1.5 bg-white">
                <Building2 size={13} className="text-zinc-400" />
                <select
                  value={schoolId ?? ''}
                  onChange={(e) => setSchoolId(e.target.value ? Number(e.target.value) : null)}
                  className="bg-transparent text-sm text-zinc-700 focus:outline-none min-w-[220px] cursor-pointer"
                >
                  <option value="">Filtrer par établissement…</option>
                  {schools?.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}{s.city ? ` — ${s.city}` : ''}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 pt-6 pb-8 space-y-8">

        {/* â"€â"€ KPIs établissement â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€ */}
        {!schoolId ? (
          <EmptySchoolPrompt />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {loadingWorker ? (
              <Sk className="h-[148px]" />
            ) : workerHealth ? (
              <MetricTile
                icon={Bot}
                label="Biométrie en attente"
                value={workerHealth.pending}
                sub={`élève${workerHealth.pending !== 1 ? 's' : ''} sans vecteur facial`}
                tone={workerHealth.pending > 0 ? 'warn' : 'ok'}
              />
            ) : null}
            {loadingFinance ? (
              <Sk className="h-[148px]" />
            ) : financeAudit ? (
              <MetricTile
                icon={ShieldCheck}
                label="Anomalies financières"
                value={`${financeAudit.count} / ${financeAudit.total}`}
                sub={financeAudit.count > 0 ? 'Signatures corrompues détectées' : 'Intégrité validée'}
                tone={financeAudit.count > 0 ? 'danger' : 'ok'}
              />
            ) : null}
          </div>
        )}

        {schoolId && financeAudit && financeAudit.count > 0 && (
          <Panel className="!p-4 border-red-100 bg-red-50/40">
            <p className="text-xs font-medium text-red-800 mb-2">IDs Ã  investiguer</p>
            <div className="flex flex-wrap gap-1.5">
              {financeAudit.ids.slice(0, 12).map((id) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setStudentId(String(id))}
                  className="text-[11px] font-mono bg-white text-red-700 ring-1 ring-red-200 px-2 py-0.5 rounded-lg hover:bg-red-50 transition-colors"
                >
                  #{id}
                </button>
              ))}
            </div>
          </Panel>
        )}

        {/* â"€â"€ Grille principale â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€ */}
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">

          {/* Colonne gauche "" inscription */}
          <div className="xl:col-span-7 space-y-4">
            <Panel className="overflow-hidden !p-0 ring-1 ring-indigo-500/10">
              <div className="px-6 py-4 bg-gradient-to-r from-indigo-50 to-violet-50 border-b border-indigo-100/80">
                <PanelHeader
                  icon={UserPlus}
                  iconClass="bg-indigo-600 text-white shadow-sm shadow-indigo-600/30"
                  title="Nouvelle inscription"
                  description="Intervention plateforme auditée. Les champs vides héritent de la configuration école."
                />
                <div className="flex items-start gap-2.5 text-xs text-indigo-800/80 bg-white/60 rounded-xl px-3 py-2.5 border border-indigo-100/60">
                  <Info size={14} className="flex-shrink-0 mt-0.5 text-indigo-600" />
                  <span>Motif obligatoire (min. 10 car.) — journalisé en audit <strong>SECURITY</strong>.</span>
                </div>
              </div>

              <div className="p-6 space-y-8">
                <FormBlock step={1} title="Identité civile">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className={labelCls}>Prénom <span className="text-red-500">*</span></label>
                      <input type="text" placeholder="Jean" value={createFirstName} onChange={(e) => setCreateFirstName(e.target.value)} className={inputCls} autoComplete="off" />
                    </div>
                    <div>
                      <label className={labelCls}>Nom <span className="text-red-500">*</span></label>
                      <input type="text" placeholder="Dupont" value={createLastName} onChange={(e) => setCreateLastName(e.target.value)} className={inputCls} autoComplete="off" />
                    </div>
                    <div>
                      <label className={labelCls}>Date de naissance <span className="text-red-500">*</span></label>
                      <input type="date" value={createBirthDate} onChange={(e) => setCreateBirthDate(e.target.value)} className={inputCls} />
                    </div>
                    <div>
                      <label className={labelCls}>Genre <span className="text-red-500">*</span></label>
                      <select value={createGender} onChange={(e) => setCreateGender(e.target.value as 'MALE' | 'FEMALE' | '')} className={cn(inputCls, 'pr-8')}>
                        <option value="">Choisir…</option>
                        <option value="MALE">Masculin</option>
                        <option value="FEMALE">Féminin</option>
                      </select>
                    </div>
                  </div>
                </FormBlock>

                <FormBlock step={2} title="Scolarité">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className={labelCls}>Établissement <span className="text-red-500">*</span></label>
                      <select
                        value={createSchoolId}
                        onChange={(e) => { setCreateSchoolId(e.target.value); setCreateClassId('') }}
                        className={cn(inputCls, 'pr-8')}
                      >
                        <option value="">Choisir…</option>
                        {schools?.map((s) => (
                          <option key={s.id} value={s.id}>{s.name}{s.city ? ` — ${s.city}` : ''}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className={labelCls}>Classe <span className="text-red-500">*</span></label>
                      <select value={createClassId} onChange={(e) => setCreateClassId(e.target.value)} disabled={!createSchoolId} className={cn(inputCls, 'pr-8')}>
                        <option value="">{createSchoolId ? 'Choisir…' : 'Établissement requis'}</option>
                        {createClasses?.data?.map((c) => (
                          <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </FormBlock>

                <FormBlock
                  step={3}
                  title="Compléments"
                  hint={selectedCreateSchool?.city ? `Défauts école si vide — ville : ${selectedCreateSchool.city}` : 'Optionnel — défauts appliqués côté serveur'}
                >
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className={labelCls}>Lieu de naissance</label>
                      <input type="text" placeholder={selectedCreateSchool?.city ?? 'Kinshasa'} value={createPlaceOfBirth} onChange={(e) => setCreatePlaceOfBirth(e.target.value)} className={inputCls} />
                    </div>
                    <div>
                      <label className={labelCls}>Nationalité</label>
                      <input type="text" placeholder="Congolaise" value={createNationality} onChange={(e) => setCreateNationality(e.target.value)} className={inputCls} />
                    </div>
                    <div>
                      <label className={labelCls}>Année scolaire</label>
                      <input type="text" placeholder="2025-2026" value={createAcademicYear} onChange={(e) => setCreateAcademicYear(e.target.value)} className={inputCls} />
                    </div>
                  </div>
                  <div className="mt-4 flex flex-wrap items-start gap-4">
                    <label className={cn(
                      'relative flex h-28 w-28 cursor-pointer items-center justify-center rounded-2xl border-2 border-dashed transition-all overflow-hidden',
                      createPhotoPreview ? 'border-indigo-400 bg-indigo-50/50' : 'border-zinc-200 bg-zinc-50 hover:border-indigo-300 hover:bg-indigo-50/40',
                    )}>
                      {createPhotoPreview ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={createPhotoPreview} alt="Aperçu" className="h-full w-full object-cover" />
                      ) : (
                        <div className="flex flex-col items-center text-zinc-400">
                          <ImagePlus size={22} />
                          <span className="text-[10px] mt-1.5 font-medium">Photo</span>
                        </div>
                      )}
                      <input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={(e) => handleCreatePhotoChange(e.target.files?.[0] ?? null)} />
                    </label>
                    <div className="flex-1 min-w-[180px]">
                      <p className="text-xs text-zinc-600 font-medium">Photo élève</p>
                      <p className={hintCls}>
                        {createPhoto ? `${createPhoto.name} · ${(createPhoto.size / 1024).toFixed(0)} Ko` : 'JPEG, PNG, WebP — max 5 Mo. Active la carte PDF.'}
                      </p>
                      {createPhoto && (
                        <button type="button" onClick={clearCreatePhoto} className="mt-2 text-xs font-medium text-red-600 hover:text-red-700">
                          Retirer
                        </button>
                      )}
                    </div>
                  </div>
                </FormBlock>

                <FormBlock step={4} title="Motif d'intervention">
                  <textarea
                    rows={3}
                    placeholder="Ex. Ticket #42 — réinscription urgente, accord direction."
                    value={createOverrideReason}
                    onChange={(e) => setCreateOverrideReason(e.target.value)}
                    className={cn(textareaCls, createOverrideReason.length > 0 && !overrideReasonValid && 'border-amber-300 ring-amber-500/20')}
                  />
                  <p className={cn(hintCls, !overrideReasonValid && createOverrideReason.length > 0 && 'text-amber-600')}>
                    {createOverrideReason.trim().length}/10 caractères minimum
                  </p>
                </FormBlock>

                <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-zinc-100">
                  <button
                    type="button"
                    disabled={!createFormValid || creating}
                    onClick={runCreateStudent}
                    className="h-10 flex items-center gap-2 px-5 text-sm font-semibold bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 disabled:opacity-40 shadow-sm shadow-indigo-600/25 transition-all"
                  >
                    {creating ? <><Loader2 size={15} className="animate-spin" /> Création…</> : <><UserPlus size={15} /> Créer l&apos;élève</>}
                  </button>
                  <button type="button" onClick={resetCreateForm} disabled={creating} className="h-10 px-4 text-sm font-medium rounded-xl border border-zinc-200 text-zinc-600 hover:bg-zinc-50 transition-all">
                    Réinitialiser
                  </button>
                </div>

                <ActionResult result={createResult} />

                {createResult?.type === 'success' && lastCreatedStudentId && (
                  <div className="flex flex-wrap items-center gap-2">
                    {lastPdfCard && (
                      <button type="button" onClick={downloadStudentCardPdf} className="h-9 flex items-center gap-2 px-3.5 text-xs font-semibold rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 transition-all">
                        <FileDown size={14} />
                        Télécharger la carte PDF
                      </button>
                    )}
                    <span className="text-xs text-zinc-500">ID #{lastCreatedStudentId} → panneau élève</span>
                  </div>
                )}
              </div>
            </Panel>
          </div>

          {/* Colonne droite "" élève cible */}
          <div className="xl:col-span-5 xl:sticky xl:top-6 space-y-4">
            <Panel>
              <PanelHeader
                icon={Search}
                iconClass="bg-violet-50 text-violet-600"
                title="Élève cible"
                description="Diagnostic et actions rapides sur un profil existant."
              />

              <div className="flex gap-2 mb-4">
                <input
                  type="number"
                  placeholder="ID élève…"
                  value={studentId}
                  onChange={(e) => setStudentId(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && checkIntegrity()}
                  className={cn(inputCls, 'font-mono text-base')}
                />
                <button type="button" onClick={checkIntegrity} disabled={!studentId || loadingIntegrity} className={cn(btnPrimary, 'flex-shrink-0 px-4')}>
                  {loadingIntegrity ? <Loader2 size={16} className="animate-spin" /> : 'Vérifier'}
                </button>
              </div>

              {studentId && (
                <div className="mb-4 flex items-center gap-2">
                  <span className="text-xs text-zinc-500">Élève sélectionné</span>
                  <span className="text-xs font-mono font-semibold bg-violet-50 text-violet-700 px-2 py-0.5 rounded-lg">#{studentId}</span>
                </div>
              )}

              {integrityError && (
                <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-red-50 border border-red-100 text-xs text-red-700 mb-4">
                  <AlertTriangle size={14} /> {integrityError}
                </div>
              )}

              {integrity && !integrityError && (
                <div className="rounded-xl border border-zinc-100 bg-zinc-50/80 p-3 mb-4 max-h-40 overflow-y-auto">
                  <div className="grid grid-cols-1 gap-1.5">
                    {Object.entries(integrity).slice(0, 10).map(([k, v]) => (
                      <div key={k} className="flex justify-between gap-2 text-[11px]">
                        <span className="text-zinc-400 truncate">{k}</span>
                        <span className="font-mono text-zinc-700 truncate text-right">{String(v ?? '—')}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <ActionResult result={actionResult} />

              <div className="space-y-3 mt-4">
                <p className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">Actions</p>

                <div className="rounded-xl border border-zinc-100 p-3.5 space-y-3">
                  <div className="flex items-center gap-2">
                    <Lock size={14} className="text-zinc-400" />
                    <span className="text-xs font-medium text-zinc-700">Verrouillage financier</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      disabled={!studentId || loading === 'lock'}
                      onClick={() => runAction('lock', () => superAdminApi.toggleStudentLock(Number(studentId), true))}
                      className="h-9 text-xs font-medium rounded-xl border border-red-100 bg-red-50 text-red-700 hover:bg-red-100 disabled:opacity-40 transition-all"
                    >
                      Verrouiller
                    </button>
                    <button
                      type="button"
                      disabled={!studentId || loading === 'unlock'}
                      onClick={() => runAction('unlock', () => superAdminApi.toggleStudentLock(Number(studentId), false))}
                      className="h-9 text-xs font-medium rounded-xl border border-emerald-100 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 disabled:opacity-40 transition-all"
                    >
                      Débloquer
                    </button>
                  </div>
                </div>

                <div className="rounded-xl border border-zinc-100 p-3.5 space-y-3">
                  <div className="flex items-center gap-2">
                    <Clock size={14} className="text-zinc-400" />
                    <span className="text-xs font-medium text-zinc-700">Période de grâce</span>
                  </div>
                  <input type="date" value={graceUntil} onChange={(e) => setGraceUntil(e.target.value)} className={inputCls} />
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      disabled={!studentId || !graceUntil || loading === 'grace'}
                      onClick={() => runAction('grace', () => superAdminApi.setStudentGracePeriod(Number(studentId), graceUntil))}
                      className="h-9 text-xs font-medium rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-40 transition-all"
                    >
                      Appliquer
                    </button>
                    <button
                      type="button"
                      disabled={!studentId || loading === 'grace-clear'}
                      onClick={() => runAction('grace-clear', () => superAdminApi.setStudentGracePeriod(Number(studentId), null))}
                      className="h-9 text-xs font-medium rounded-xl border border-zinc-200 text-zinc-600 hover:bg-zinc-50 disabled:opacity-40 transition-all"
                    >
                      Lever
                    </button>
                  </div>
                </div>

                <div className="rounded-xl border border-zinc-100 p-3.5 space-y-3">
                  <div className="flex items-center gap-2">
                    <Fingerprint size={14} className="text-zinc-400" />
                    <span className="text-xs font-medium text-zinc-700">Vecteur facial</span>
                  </div>
                  <textarea
                    rows={3}
                    placeholder='[0.01, -0.02, …] ou {"faceVector":[…]}'
                    value={faceVectorJson}
                    onChange={(e) => setFaceVectorJson(e.target.value)}
                    className="w-full px-3 py-2 text-[11px] font-mono rounded-xl border border-zinc-200 bg-zinc-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/25 resize-none"
                  />
                  <button
                    type="button"
                    disabled={!studentId || !faceVectorJson.trim() || loading === 'biometrics'}
                    onClick={runInjectBiometrics}
                    className="h-9 w-full text-xs font-medium rounded-xl border border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 disabled:opacity-40 transition-all"
                  >
                    {loading === 'biometrics' ? 'Injection…' : 'Injecter le vecteur'}
                  </button>
                </div>
              </div>
            </Panel>
          </div>
        </div>

        <Panel className="border-red-200/80 bg-gradient-to-br from-red-50/50 to-white overflow-hidden">
          <div className="flex flex-col sm:flex-row sm:items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-red-100 flex items-center justify-center flex-shrink-0">
              <Trash2 size={20} className="text-red-600" />
            </div>
            <div className="flex-1">
              <h3 className="text-base font-semibold text-red-900">Zone de danger — Purge RGPD</h3>
              <p className="text-sm text-zinc-500 mt-1 leading-relaxed">
                Suppression physique irréversible : profil, paiements, présences, biométrie et documents.
              </p>
              <div className="flex flex-wrap items-end gap-3 mt-5">
                <div>
                  <label className={labelCls}>ID élève</label>
                  <input
                    type="number"
                    placeholder="ID…"
                    value={purgeId}
                    onChange={(e) => setPurgeId(e.target.value)}
                    className={cn(inputCls, 'w-36 focus:ring-red-500/25 focus:border-red-400')}
                  />
                </div>
                <div>
                  <label className={labelCls}>
                    Confirmation <code className="font-mono text-red-600 font-bold">PURGE</code>
                  </label>
                  <input
                    type="text"
                    placeholder="PURGE"
                    value={purgeWord}
                    onChange={(e) => setPurgeWord(e.target.value)}
                    className={cn(inputCls, 'w-36 font-mono focus:ring-red-500/25 focus:border-red-400')}
                  />
                </div>
                <button
                  type="button"
                  disabled={!purgeId || purgeWord !== 'PURGE' || loadingPurge}
                  onClick={runPurge}
                  className="h-10 px-5 text-sm font-semibold bg-red-600 text-white rounded-xl hover:bg-red-700 disabled:opacity-40 shadow-sm shadow-red-600/20 transition-all"
                >
                  {loadingPurge ? 'Purge…' : 'Purger définitivement'}
                </button>
              </div>
            </div>
          </div>
        </Panel>

      </div>
    </div>
  )
}

export default function EnrollmentPage() {
  return (
    <Suspense fallback={
      <div className="px-8 py-8 max-w-6xl mx-auto">
        <div className="h-10 w-64 bg-zinc-100 rounded-lg animate-pulse mb-8" />
        <div className="h-96 bg-zinc-100 rounded-xl animate-pulse" />
      </div>
    }>
      <EnrollmentPageContent />
    </Suspense>
  )
}
