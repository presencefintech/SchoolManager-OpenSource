'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { motion } from 'framer-motion'
import { Loader2, X, UserPlus, GraduationCap, Heart, Wallet, Info, Plus, Users, FileText } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  enrollmentCreateSchema,
  ENROLLMENT_CREATE_DEFAULTS,
  toCreateEnrollmentPayload,
  deriveSections,
  deriveOptions,
  filterClassesByStructure,
  type EnrollmentCreateForm,
  type StructureRef,
} from '@/lib/schemas/enrollment-create'
import { sectionRequiresOption, isRdcCycleWithoutOption } from '@/lib/academic/rdc-section-cycle'
import {
  useClasses,
  useCreateEnrollment,
  useAcademicSessions,
  useEnrollmentFeePreview,
  useFeeStructures,
  useSections,
  useOptions,
  useCreateSection,
  useCreateOption,
  useCreateClass,
  useParentLookupByPhone,
  useUploadStudentPhoto,
  useUploadStudentDocument,
} from '@/lib/hooks/use-admin'
import { useToast } from '@/providers/toast-provider'
import { getApiErrorMessage } from '@/lib/api/client'
import { newIdempotencyKey } from '@/lib/idempotency'
import { PhoneInput } from '@/components/ui/phone-input'
import { isValidInternationalPhone } from '@/lib/phone/validation'

const inputCls =
  'w-full px-3 py-2 rounded-lg border border-zinc-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-200 focus:border-emerald-400'
const labelCls = 'block text-xs font-medium text-zinc-600 mb-1'
const hintCls = 'text-[10px] text-zinc-400 mt-1'
const errorCls = 'text-xs text-red-600 mt-1'
const addBtnCls =
  'flex-shrink-0 px-2.5 py-2 rounded-lg border border-emerald-200 text-emerald-700 hover:bg-emerald-50 disabled:opacity-40 disabled:cursor-not-allowed'

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'] as const

type InlineCreate = 'section' | 'option' | 'class' | null

function mergeStructureRefs(...lists: StructureRef[][]): StructureRef[] {
  const map = new Map<number, StructureRef>()
  for (const list of lists) {
    for (const item of list) {
      const prev = map.get(item.id)
      map.set(item.id, {
        id: item.id,
        name: item.name,
        code: item.code ?? prev?.code,
      })
    }
  }
  return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name, 'fr'))
}

function FormSection({
  icon: Icon,
  title,
  hint,
  children,
}: {
  icon: React.ElementType
  title: string
  hint?: string
  children: React.ReactNode
}) {
  return (
    <section className="space-y-3">
      <div className="flex items-start gap-2">
        <div className="w-7 h-7 rounded-lg bg-emerald-50 flex items-center justify-center flex-shrink-0">
          <Icon size={14} className="text-emerald-600" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-zinc-800">{title}</h3>
          {hint && <p className={hintCls}>{hint}</p>}
        </div>
      </div>
      {children}
    </section>
  )
}

function Field({
  label,
  required,
  error,
  children,
}: {
  label: string
  required?: boolean
  error?: string
  children: React.ReactNode
}) {
  return (
    <div>
      <label className={labelCls}>
        {label}{required && <span className="text-red-500"> *</span>}
      </label>
      {children}
      {error && <p className={errorCls}>{error}</p>}
    </div>
  )
}

function InlineCreateRow({
  placeholder,
  value,
  onChange,
  onSubmit,
  onCancel,
  pending,
}: {
  placeholder: string
  value: string
  onChange: (v: string) => void
  onSubmit: () => void
  onCancel: () => void
  pending: boolean
}) {
  return (
    <div className="flex gap-2 mt-1.5">
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={cn(inputCls, 'flex-1')}
        autoFocus
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault()
            onSubmit()
          }
          if (e.key === 'Escape') onCancel()
        }}
      />
      <button
        type="button"
        disabled={pending || value.trim().length < 2}
        onClick={onSubmit}
        className="px-3 py-2 rounded-lg bg-emerald-600 text-white text-xs font-medium hover:bg-emerald-700 disabled:opacity-50"
      >
        {pending ? <Loader2 size={14} className="animate-spin" /> : 'Créer'}
      </button>
      <button type="button" onClick={onCancel} className="px-2 py-2 text-xs text-zinc-500 hover:text-zinc-700">
        Annuler
      </button>
    </div>
  )
}

export function EnrollmentCreateModal({
  open,
  onClose,
  onSuccess,
}: {
  open: boolean
  onClose: () => void
  onSuccess?: () => void
}) {
  const toast = useToast()
  const { data: classes = [], isLoading: loadingClasses } = useClasses({ isActive: true })
  const { data: sessions = [], isLoading: loadingSessions } = useAcademicSessions()
  const { data: apiSections = [], isLoading: loadingSections } = useSections()
  const createMutation = useCreateEnrollment()
  const uploadPhoto = useUploadStudentPhoto()
  const uploadDoc = useUploadStudentDocument()
  const createSectionMutation = useCreateSection()
  const createOptionMutation = useCreateOption()
  const createClassMutation = useCreateClass()

  const [inlineCreate, setInlineCreate] = useState<InlineCreate>(null)
  const [inlineName, setInlineName] = useState('')
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [birthCertFile, setBirthCertFile] = useState<File | null>(null)
  const [enrollmentFormFile, setEnrollmentFormFile] = useState<File | null>(null)
  const [uploadingDocs, setUploadingDocs] = useState(false)

  const prevSectionRef = useRef(0)
  const prevOptionRef = useRef(0)

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    setError,
    clearErrors,
    control,
    formState: { errors },
  } = useForm<EnrollmentCreateForm>({
    resolver: zodResolver(enrollmentCreateSchema),
    defaultValues: ENROLLMENT_CREATE_DEFAULTS,
  })

  const totalFees = watch('totalFees')
  const feesPaid = watch('feesPaid')
  const collectDeposit = watch('collectDeposit')
  const sectionId = watch('sectionId')
  const optionId = watch('optionId')
  const classId = watch('classId')
  const academicYear = watch('academicYear')
  const emergencyContactPhone = watch('emergencyContactPhone')
  const emergencyContactName = watch('emergencyContactName')
  const autoAssignExplicitFees = watch('autoAssignExplicitFees')
  const explicitFeeStructureIds = watch('explicitFeeStructureIds') ?? []

  const { data: apiOptions = [], isLoading: loadingOptions } = useOptions(sectionId || undefined)

  const sections = useMemo(
    () =>
      mergeStructureRefs(
        apiSections.map((s) => ({ id: s.id, name: s.name, code: s.code ?? undefined })),
        deriveSections(classes),
      ),
    [apiSections, classes],
  )

  const options = useMemo(
    () =>
      mergeStructureRefs(
        apiOptions.map((o) => ({ id: o.id, name: o.name })),
        deriveOptions(classes, sectionId || undefined),
      ),
    [apiOptions, classes, sectionId],
  )

  const selectedSection = useMemo(
    () => sections.find((s) => s.id === sectionId) ?? apiSections.find((s) => s.id === sectionId) ?? null,
    [sections, apiSections, sectionId],
  )

  const requiresOption = sectionRequiresOption(selectedSection, options.length)
  const cycleWithoutOption = isRdcCycleWithoutOption(selectedSection)

  const currentSession = useMemo(() => sessions.find((s) => s.isCurrent), [sessions])
  const { data: feeStructures = [] } = useFeeStructures({
    sessionId: currentSession?.id,
    isActive: true,
  })

  const explicitCatalog = useMemo(
    () =>
      feeStructures.filter(
        (fs) =>
          fs.assignmentMode === 'EXPLICIT' &&
          (fs.classId == null || fs.classId === classId),
      ),
    [feeStructures, classId],
  )

  const previewExplicitIds = useMemo(() => {
    if (autoAssignExplicitFees) return explicitCatalog.map((f) => f.id)
    return explicitFeeStructureIds
  }, [autoAssignExplicitFees, explicitCatalog, explicitFeeStructureIds])

  const { data: feePreview, isFetching: feePreviewLoading } = useEnrollmentFeePreview(
    classId > 0 ? classId : undefined,
    {
      sessionId: currentSession?.id,
      explicitFeeStructureIds: previewExplicitIds.length ? previewExplicitIds : undefined,
    },
  )
  const lastFeeSyncKeyRef = useRef('')

  useEffect(() => {
    if (!feePreview || !classId || classId <= 0) return
    const syncKey = `${classId}:${previewExplicitIds.slice().sort((a, b) => a - b).join(',')}:${feePreview.totalFees}`
    if (lastFeeSyncKeyRef.current === syncKey) return
    lastFeeSyncKeyRef.current = syncKey
    setValue('totalFees', feePreview.totalFees, { shouldValidate: true })
    if (feePreview.academicYear) {
      setValue('academicYear', feePreview.academicYear, { shouldValidate: false })
    }
  }, [feePreview, classId, previewExplicitIds, setValue])

  const phoneIsValid = isValidInternationalPhone(emergencyContactPhone)
  const { data: parentLookup, isFetching: lookingUpParent } = useParentLookupByPhone(
    emergencyContactPhone,
    phoneIsValid,
  )

  const parentMatch = parentLookup?.found ? parentLookup.parent : null
  const lastAutofillPhoneRef = useRef('')

  useEffect(() => {
    if (!open || !parentMatch?.displayName) return
    if (lastAutofillPhoneRef.current === emergencyContactPhone) return
    if (emergencyContactName?.trim()) return
    setValue('emergencyContactName', parentMatch.displayName, { shouldValidate: true })
    lastAutofillPhoneRef.current = emergencyContactPhone ?? ''
  }, [open, parentMatch, emergencyContactPhone, emergencyContactName, setValue])

  const filteredClasses = useMemo(
    () =>
      filterClassesByStructure(
        classes,
        sectionId || undefined,
        requiresOption ? optionId || undefined : undefined,
        academicYear || undefined,
      ),
    [classes, sectionId, optionId, academicYear, requiresOption],
  )

  const balance =
    totalFees != null && !Number.isNaN(totalFees)
      ? Math.max(0, totalFees - (feesPaid ?? 0))
      : null

  useEffect(() => {
    if (!open) {
      reset(ENROLLMENT_CREATE_DEFAULTS)
      setInlineCreate(null)
      setInlineName('')
      setPhotoFile(null)
      setBirthCertFile(null)
      setEnrollmentFormFile(null)
      prevSectionRef.current = 0
      prevOptionRef.current = 0
      lastAutofillPhoneRef.current = ''
      lastFeeSyncKeyRef.current = ''
    }
  }, [open, reset])

  useEffect(() => {
    if (!open) return
    if (!requiresOption) {
      setValue('optionId', undefined as unknown as number)
      clearErrors('optionId')
    }
  }, [requiresOption, open, setValue, clearErrors])

  useEffect(() => {
    if (!open) return
    if (prevSectionRef.current !== sectionId && prevSectionRef.current !== 0) {
      setValue('optionId', undefined as unknown as number)
      setValue('classId', 0)
    }
    prevSectionRef.current = sectionId ?? 0
  }, [sectionId, setValue, open])

  useEffect(() => {
    if (!open) return
    if (prevOptionRef.current !== optionId && prevOptionRef.current !== 0) {
      setValue('classId', 0)
    }
    prevOptionRef.current = optionId ?? 0
  }, [optionId, setValue, open])

  useEffect(() => {
    if (!open || academicYear) return
    const current = sessions.find((s) => s.isCurrent)
    if (current?.label) setValue('academicYear', current.label)
  }, [open, sessions, academicYear, setValue])

  useEffect(() => {
    if (!classId) return
    const cls = classes.find((c) => c.id === classId)
    if (cls?.academicYear && !academicYear) {
      setValue('academicYear', cls.academicYear)
    }
  }, [classId, classes, academicYear, setValue])

  async function handleCreateSection() {
    const name = inlineName.trim()
    if (name.length < 2) return
    try {
      const created = await createSectionMutation.mutateAsync({ name })
      setValue('sectionId', created.id)
      toast.success('Section créée', `"${created.name}" est disponible.`)
      setInlineCreate(null)
      setInlineName('')
    } catch (err) {
      toast.error('Création impossible', getApiErrorMessage(err))
    }
  }

  async function handleCreateOption() {
    const name = inlineName.trim()
    if (!sectionId || name.length < 2) return
    try {
      const created = await createOptionMutation.mutateAsync({ sectionId, name })
      setValue('optionId', created.id)
      toast.success('Option créée', `"${created.name}" est disponible.`)
      setInlineCreate(null)
      setInlineName('')
    } catch (err) {
      toast.error('Création impossible', getApiErrorMessage(err))
    }
  }

  async function handleCreateClass() {
    const name = inlineName.trim()
    if (!sectionId || !academicYear || name.length < 2) return
    try {
      let resolvedOptionId = optionId && optionId > 0 ? optionId : undefined
      if (!resolvedOptionId) {
        if (options[0]) {
          resolvedOptionId = options[0].id
        } else {
          const createdOpt = await createOptionMutation.mutateAsync({
            sectionId,
            name: cycleWithoutOption ? 'Générale' : 'Tronc commun',
            code: cycleWithoutOption ? 'GEN' : 'TC',
          })
          resolvedOptionId = createdOpt.id
          setValue('optionId', createdOpt.id)
        }
      }
      const created = await createClassMutation.mutateAsync({
        name,
        sectionId,
        optionId: resolvedOptionId,
        academicYear,
      })
      setValue('classId', created.id)
      toast.success('Classe créée', `"${created.name}" est disponible.`)
      setInlineCreate(null)
      setInlineName('')
    } catch (err) {
      toast.error('Création impossible', getApiErrorMessage(err))
    }
  }

  if (!open) return null

  async function onSubmit(data: EnrollmentCreateForm) {
    if (requiresOption && !(data.optionId && data.optionId > 0)) {
      setError('optionId', { message: 'Option / filière requise pour ce cycle' })
      return
    }
    const idempotencyKey = newIdempotencyKey('enroll')
    try {
      const result = await createMutation.mutateAsync({
        ...toCreateEnrollmentPayload(data),
        idempotencyKey,
      })
      const studentId = Number((result as { id?: number }).id)

      if (studentId && (photoFile || birthCertFile || enrollmentFormFile)) {
        setUploadingDocs(true)
        try {
          if (photoFile) {
            await uploadPhoto.mutateAsync({ studentId, file: photoFile })
          }
          if (birthCertFile) {
            await uploadDoc.mutateAsync({
              studentId,
              documentType: 'certificates',
              file: birthCertFile,
              description: 'Acte de naissance',
            })
          }
          if (enrollmentFormFile) {
            await uploadDoc.mutateAsync({
              studentId,
              documentType: 'reports',
              file: enrollmentFormFile,
              description: "Fiche d'inscription",
            })
          }
        } catch (docErr) {
          toast.success(
            'Inscription créée',
            `Dossier OK, mais document non uploadé : ${getApiErrorMessage(docErr)}`,
          )
          onSuccess?.()
          onClose()
          return
        } finally {
          setUploadingDocs(false)
        }
      }

      if (result.depositWarning) {
        toast.success('Inscription créée', result.depositWarning)
      } else if (result.deposit) {
        toast.success(
          'Inscription + acompte',
          `Paiement #${result.deposit.paymentId} · ${result.deposit.amount} ${result.deposit.currency} — reçu en cours.`,
        )
      } else {
        toast.success(
          'Inscription créée',
          'Dossier enregistré. Ensuite : déclarez les personnes autorisées sur la fiche élève.',
        )
      }
      if (result.explicitFeePack?.assigned?.length) {
        toast.success(
          'Frais optionnels',
          `${result.explicitFeePack.assigned.length} barème(s) optionnel(s) attribué(s).`,
        )
      }
      if (result.explicitFeePack?.skipped?.length) {
        toast.error(
          'Frais optionnels partiels',
          `${result.explicitFeePack.skipped.length} barème(s) non attribués (déjà actifs / hors session).`,
        )
      }
      if (result.explicitFeePackPending) {
        toast.success(
          'Frais optionnels',
          'Frais optionnels mémorisés — appliqués à l’approbation de la pré-inscription.',
        )
      }
      onSuccess?.()
      onClose()
    } catch (err) {
      toast.error('Inscription impossible', getApiErrorMessage(err))
    } finally {
      setUploadingDocs(false)
    }
  }

  const structureLoading = loadingSections || loadingClasses

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[92vh] overflow-hidden flex flex-col"
      >
        <div className="flex items-center justify-between px-6 py-5 border-b border-zinc-100 flex-shrink-0">
          <div className="flex items-center gap-2">
            <UserPlus size={18} className="text-emerald-600" />
            <div>
              <h2 className="text-base font-semibold text-zinc-900">Nouvelle inscription</h2>
              <p className="text-xs text-zinc-500">Dossier complet aligné sur le registre scolaire</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="p-1.5 rounded-lg hover:bg-zinc-100 text-zinc-400">
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="flex-1 overflow-y-auto">
          <div className="p-6 space-y-8">
            <div className="flex items-start gap-2 text-xs text-emerald-800 bg-emerald-50 border border-emerald-100 rounded-xl px-3 py-2.5">
              <Info size={14} className="flex-shrink-0 mt-0.5" />
              <span>
                Section, option et classe peuvent être créées directement ici si elles n&apos;existent pas encore.
                Matricule auto-généré si vide.
              </span>
            </div>

            <FormSection icon={UserPlus} title="Identité civile (RDC)">
              <p className="text-[11px] text-zinc-500 -mt-1">Ordre officiel : Nom · Postnom · Prénom</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Field label="Nom" required error={errors.lastName?.message}>
                  <input {...register('lastName')} className={inputCls} autoComplete="family-name" />
                </Field>
                <Field label="Postnom" required error={errors.postnom?.message}>
                  <input {...register('postnom')} className={inputCls} />
                </Field>
                <Field label="Prénom" required error={errors.firstName?.message}>
                  <input {...register('firstName')} className={inputCls} autoComplete="given-name" />
                </Field>
                <Field label="Prénom administratif" error={errors.prenom?.message}>
                  <input {...register('prenom')} placeholder="Optionnel — si différent du prénom ci-dessus" className={inputCls} />
                </Field>
                <Field label="Date de naissance" required error={errors.birthDate?.message}>
                  <input type="date" {...register('birthDate')} className={inputCls} />
                </Field>
                <Field label="Genre" required error={errors.gender?.message}>
                  <select {...register('gender')} className={cn(inputCls, 'pr-8')}>
                    <option value="MALE">Masculin</option>
                    <option value="FEMALE">Féminin</option>
                  </select>
                </Field>
                <Field label="Lieu de naissance" error={errors.placeOfBirth?.message}>
                  <input {...register('placeOfBirth')} placeholder="Ex. Kinshasa" className={inputCls} />
                </Field>
                <Field label="Nationalité" error={errors.nationality?.message}>
                  <input {...register('nationality')} placeholder="Ex. Congolaise" className={inputCls} />
                </Field>
              </div>
            </FormSection>

            <FormSection
              icon={GraduationCap}
              title="Scolarité"
              hint={
                cycleWithoutOption
                  ? 'Maternelle / primaire : pas de filière — choisissez directement la classe.'
                  : 'Section → Option (filière) → Année → Classe. Utilisez + pour créer une entrée manquante.'
              }
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Field label="Section" required error={errors.sectionId?.message}>
                  <div className="flex gap-2">
                    <select
                      {...register('sectionId', { valueAsNumber: true })}
                      disabled={structureLoading}
                      className={cn(inputCls, 'flex-1 pr-8')}
                    >
                      <option value={0}>
                        {structureLoading ? 'Chargement…' : sections.length === 0 ? 'Aucune section — créez-en une' : 'Choisir une section…'}
                      </option>
                      {sections.map((s) => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                      ))}
                    </select>
                    <button
                      type="button"
                      title="Créer une section"
                      className={addBtnCls}
                      onClick={() => { setInlineCreate('section'); setInlineName('') }}
                    >
                      <Plus size={16} />
                    </button>
                  </div>
                  {inlineCreate === 'section' && (
                    <InlineCreateRow
                      placeholder="Nom de la section (ex. Primaire, Secondaire)"
                      value={inlineName}
                      onChange={setInlineName}
                      onSubmit={handleCreateSection}
                      onCancel={() => setInlineCreate(null)}
                      pending={createSectionMutation.isPending}
                    />
                  )}
                </Field>

                <Field
                  label={requiresOption ? 'Option / filière' : 'Option (non requise)'}
                  required={requiresOption}
                  error={errors.optionId?.message}
                >
                  <div className="flex gap-2">
                    <select
                      {...register('optionId', { valueAsNumber: true })}
                      disabled={!sectionId || loadingOptions || cycleWithoutOption}
                      className={cn(inputCls, 'flex-1 pr-8', cycleWithoutOption && 'bg-zinc-50 text-zinc-500')}
                    >
                      <option value={0}>
                        {!sectionId
                          ? 'Sélectionnez d\'abord une section'
                          : cycleWithoutOption
                            ? 'Non applicable (maternelle / primaire)'
                            : loadingOptions
                              ? 'Chargement…'
                              : options.length === 0
                                ? 'Aucune option — créez-en une'
                                : 'Choisir une option…'}
                      </option>
                      {!cycleWithoutOption &&
                        options.map((o) => (
                          <option key={o.id} value={o.id}>{o.name}</option>
                        ))}
                    </select>
                    <button
                      type="button"
                      title="Créer une option"
                      disabled={!sectionId || cycleWithoutOption}
                      className={addBtnCls}
                      onClick={() => { setInlineCreate('option'); setInlineName('') }}
                    >
                      <Plus size={16} />
                    </button>
                  </div>
                  {cycleWithoutOption && (
                    <p className={hintCls}>
                      En RDC, maternelle et primaire n&apos;ont pas de filière — l&apos;option est ignorée.
                    </p>
                  )}
                  {inlineCreate === 'option' && !cycleWithoutOption && (
                    <InlineCreateRow
                      placeholder="Nom de l'option (ex. Scientifique)"
                      value={inlineName}
                      onChange={setInlineName}
                      onSubmit={handleCreateOption}
                      onCancel={() => setInlineCreate(null)}
                      pending={createOptionMutation.isPending}
                    />
                  )}
                </Field>

                <Field label="Année scolaire" error={errors.academicYear?.message}>
                  {loadingSessions ? (
                    <div className={cn(inputCls, 'h-[38px] bg-zinc-100 animate-pulse')} />
                  ) : sessions.length > 0 ? (
                    <select
                      {...register('academicYear')}
                      className={cn(inputCls, 'pr-8')}
                    >
                      <option value="">— Choisir une année —</option>
                      {sessions.map((s) => (
                        <option key={s.id} value={s.label}>
                          {s.label}{s.isCurrent ? ' (courante)' : ''}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <>
                      <input
                        {...register('academicYear')}
                        placeholder="2025-2026"
                        className={inputCls}
                      />
                      <p className={hintCls}>Aucune session configurée — format attendu : 2025-2026</p>
                    </>
                  )}
                </Field>

                <Field label="Classe" required error={errors.classId?.message}>
                  <div className="flex gap-2">
                    <select
                      {...register('classId', { valueAsNumber: true })}
                      disabled={!sectionId || !academicYear || (requiresOption && !optionId)}
                      className={cn(inputCls, 'flex-1 pr-8')}
                    >
                      <option value={0}>
                        {!sectionId
                          ? 'Section requise'
                          : requiresOption && !optionId
                            ? 'Option / filière requise'
                            : !academicYear
                              ? 'Année scolaire requise'
                              : filteredClasses.length === 0
                                ? 'Aucune classe — créez-en une'
                                : 'Choisir une classe…'}
                      </option>
                      {filteredClasses.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}{c.level ? ` · ${c.level}` : ''}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      title="Créer une classe"
                      disabled={!sectionId || !academicYear || (requiresOption && !optionId)}
                      className={addBtnCls}
                      onClick={() => { setInlineCreate('class'); setInlineName('') }}
                    >
                      <Plus size={16} />
                    </button>
                  </div>
                  {inlineCreate === 'class' && (
                    <InlineCreateRow
                      placeholder="Nom de la classe (ex. 6ème A)"
                      value={inlineName}
                      onChange={setInlineName}
                      onSubmit={handleCreateClass}
                      onCancel={() => setInlineCreate(null)}
                      pending={createClassMutation.isPending}
                    />
                  )}
                </Field>

                <Field label="Statut initial" error={errors.status?.message}>
                  <select {...register('status')} className={cn(inputCls, 'pr-8')}>
                    <option value="ACTIVE">Actif — inscription immédiate</option>
                    <option value="PENDING_ENROLLMENT">Pré-inscription — validation requise</option>
                  </select>
                </Field>
                <Field label="Matricule" error={errors.matricule?.message}>
                  <input {...register('matricule')} placeholder="Auto-généré si vide" className={cn(inputCls, 'font-mono text-xs')} />
                </Field>
                <Field label="Badge NFC (optionnel)" error={errors.nfcTagId?.message}>
                  <input {...register('nfcTagId')} placeholder="Identifiant carte NFC" className={cn(inputCls, 'font-mono text-xs')} />
                </Field>
              </div>
            </FormSection>

            <FormSection
              icon={FileText}
              title="Documents"
              hint="Photo, acte de naissance et fiche — uploadés juste après création."
            >
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <Field label="Photo élève">
                  <input
                    type="file"
                    accept="image/*"
                    className={cn(inputCls, 'text-xs file:mr-2 file:rounded-md file:border-0 file:bg-emerald-50 file:px-2 file:py-1 file:text-emerald-700')}
                    onChange={(e) => setPhotoFile(e.target.files?.[0] ?? null)}
                  />
                  {photoFile && <p className={hintCls}>{photoFile.name}</p>}
                </Field>
                <Field label="Acte de naissance">
                  <input
                    type="file"
                    accept="image/*,.pdf"
                    className={cn(inputCls, 'text-xs file:mr-2 file:rounded-md file:border-0 file:bg-emerald-50 file:px-2 file:py-1 file:text-emerald-700')}
                    onChange={(e) => setBirthCertFile(e.target.files?.[0] ?? null)}
                  />
                  {birthCertFile && <p className={hintCls}>{birthCertFile.name}</p>}
                </Field>
                <Field label="Fiche d'inscription">
                  <input
                    type="file"
                    accept="image/*,.pdf"
                    className={cn(inputCls, 'text-xs file:mr-2 file:rounded-md file:border-0 file:bg-emerald-50 file:px-2 file:py-1 file:text-emerald-700')}
                    onChange={(e) => setEnrollmentFormFile(e.target.files?.[0] ?? null)}
                  />
                  {enrollmentFormFile && <p className={hintCls}>{enrollmentFormFile.name}</p>}
                </Field>
              </div>
            </FormSection>

            <FormSection
              icon={Wallet}
              title="Frais & acompte"
              hint="Barème de la classe, frais optionnels et acompte en caisse."
            >
              {classId > 0 && (
                <div className="rounded-xl border border-zinc-100 bg-zinc-50/80 px-3 py-2.5 space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-[11px] font-medium text-zinc-600">
                      Frais {feePreview?.academicYear ?? '—'}
                      {feePreview?.currency ? ` · ${feePreview.currency}` : ''}
                      {feePreview?.mode ? ` · ${feePreview.mode}` : ''}
                    </p>
                    {feePreviewLoading && <Loader2 size={12} className="animate-spin text-zinc-400" />}
                  </div>
                  {feePreview?.feeLines?.length ? (
                    <ul className="space-y-1">
                      {feePreview.feeLines.map((line) => (
                        <li
                          key={`${line.feeStructureId}-${line.source ?? 'auto'}`}
                          className="flex items-center justify-between gap-2 text-[11px] text-zinc-700"
                        >
                          <span>
                            {line.categoryName}
                            <span className="text-zinc-400"> · {line.billingPeriod}</span>
                            {line.source && line.source !== 'AUTOMATIC' && (
                              <span className="ml-1 rounded bg-amber-50 px-1 text-[9px] font-medium uppercase text-amber-700">
                                {line.source === 'PROPOSED' ? 'optionnel' : line.source}
                              </span>
                            )}
                          </span>
                          <span className="tabular-nums font-medium">
                            {line.amount.toLocaleString('fr-FR', {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}
                          </span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    !feePreviewLoading && (
                      <p className="text-[11px] text-amber-700">
                        Aucun barème pour cette classe — configurez les frais ou saisissez le total manuellement.
                      </p>
                    )
                  )}
                </div>
              )}

              {classId > 0 && explicitCatalog.length > 0 && (
                <div className="rounded-xl border border-amber-100 bg-amber-50/40 px-3 py-2.5 space-y-2">
                  <p className="text-[11px] font-medium text-amber-900">Frais optionnels</p>
                  <label className="flex items-start gap-2 text-xs text-zinc-700 cursor-pointer">
                    <input
                      type="checkbox"
                      className="mt-0.5 rounded border-zinc-300"
                      checked={!!autoAssignExplicitFees}
                      onChange={(e) => {
                        const checked = e.target.checked
                        setValue('autoAssignExplicitFees', checked)
                        if (checked) {
                          setValue(
                            'explicitFeeStructureIds',
                            explicitCatalog.map((f) => f.id),
                            { shouldValidate: true },
                          )
                        } else {
                          setValue('explicitFeeStructureIds', [], { shouldValidate: true })
                        }
                      }}
                    />
                    <span>Attribuer tous les frais optionnels de la session / classe</span>
                  </label>
                  {!autoAssignExplicitFees && (
                    <ul className="space-y-1.5">
                      {explicitCatalog.map((fs) => {
                        const checked = explicitFeeStructureIds.includes(fs.id)
                        return (
                          <li key={fs.id}>
                            <label className="flex items-center justify-between gap-2 text-[11px] text-zinc-700 cursor-pointer">
                              <span className="flex items-center gap-2">
                                <input
                                  type="checkbox"
                                  className="rounded border-zinc-300"
                                  checked={checked}
                                  onChange={() => {
                                    const next = checked
                                      ? explicitFeeStructureIds.filter((id) => id !== fs.id)
                                      : [...explicitFeeStructureIds, fs.id]
                                    setValue('explicitFeeStructureIds', next, { shouldValidate: true })
                                  }}
                                />
                                {fs.label}
                              </span>
                              <span className="tabular-nums font-medium">
                                {fs.amount.toLocaleString('fr-FR', {
                                  minimumFractionDigits: 2,
                                  maximumFractionDigits: 2,
                                })}
                              </span>
                            </label>
                          </li>
                        )
                      })}
                    </ul>
                  )}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <Field label="Frais totaux" error={errors.totalFees?.message}>
                  <input type="number" min={0} step="0.01" {...register('totalFees')} className={inputCls} />
                </Field>
                <Field label="Acompte (déjà payé)" error={errors.feesPaid?.message}>
                  <input type="number" min={0} step="0.01" {...register('feesPaid')} className={inputCls} />
                </Field>
                <Field label="Bourse (%)" error={errors.scholarshipPercent?.message}>
                  <input type="number" min={0} max={100} {...register('scholarshipPercent')} className={inputCls} />
                </Field>
              </div>
              {balance != null && totalFees != null && totalFees > 0 && (
                <p className={hintCls}>
                  Solde initial estimé : <strong className="text-zinc-700">{balance.toLocaleString('fr-FR')}</strong>
                </p>
              )}
              <label className="flex items-start gap-2 text-xs text-zinc-700 cursor-pointer">
                <input type="checkbox" {...register('collectDeposit')} className="mt-0.5 rounded border-zinc-300" />
                <span>
                  Encaisser l&apos;acompte en caisse (Payment + reçu)
                  {feesPaid != null && feesPaid > 0 && collectDeposit !== false ? (
                    <span className="block text-[10px] text-emerald-700 mt-0.5">
                      Un reçu sera généré et le parent notifié si lié.
                    </span>
                  ) : (
                    <span className="block text-[10px] text-zinc-400 mt-0.5">
                      Décochez uniquement pour un simple solde sans paiement.
                    </span>
                  )}
                </span>
              </label>
              <Field label="Notes finance" error={errors.paymentNotes?.message}>
                <textarea {...register('paymentNotes')} rows={2} placeholder="Ex. accord de paiement échelonné…" className={cn(inputCls, 'resize-none')} />
              </Field>
            </FormSection>

            <FormSection
              icon={Heart}
              title="Contact d'urgence & santé"
              hint="Saisir le mobile du parent : s'il existe déjà, le dossier fratrie est réutilisé."
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Field label="Parent / tuteur" error={errors.emergencyContactName?.message}>
                  <input {...register('emergencyContactName')} className={inputCls} autoComplete="name" />
                </Field>
                <Field label="Téléphone mobile" error={errors.emergencyContactPhone?.message}>
                  <Controller
                    name="emergencyContactPhone"
                    control={control}
                    render={({ field }) => (
                      <PhoneInput
                        value={field.value ?? ''}
                        onChange={field.onChange}
                        defaultCountry="CD"
                        placeholder="Ex. 81 000 0000"
                        error={errors.emergencyContactPhone?.message}
                        showError={false}
                      />
                    )}
                  />
                </Field>
              </div>

              {lookingUpParent && phoneIsValid && (
                <p className="flex items-center gap-2 text-[11px] text-zinc-500">
                  <Loader2 size={12} className="animate-spin" />
                  Recherche du parent…
                </p>
              )}

              {parentMatch && (
                <div className="flex items-start gap-2 text-xs text-emerald-900 bg-emerald-50 border border-emerald-100 rounded-xl px-3 py-2.5">
                  <Users size={14} className="flex-shrink-0 mt-0.5 text-emerald-600" />
                  <div className="space-y-0.5">
                    <p className="font-medium">
                      Parent trouvé — {parentMatch.displayName}
                      {parentMatch.id != null ? ` (#${parentMatch.id})` : ''}
                    </p>
                    <p className="text-emerald-800/80">
                      {parentMatch.childrenCount > 0
                        ? `Déjà lié à ${parentMatch.childrenCount} élève${parentMatch.childrenCount > 1 ? 's' : ''}${
                            parentMatch.children[0]
                              ? ` (ex. ${parentMatch.children.map((c) => c.fullName).slice(0, 3).join(', ')})`
                              : ''
                          }. Ce numéro sera réutilisé automatiquement.`
                        : 'Ce numéro est déjà connu dans l’école et sera réutilisé à l’inscription.'}
                    </p>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Field label="Groupe sanguin" error={errors.bloodGroup?.message}>
                  <select {...register('bloodGroup')} className={cn(inputCls, 'pr-8')}>
                    <option value="">—</option>
                    {BLOOD_GROUPS.map((g) => (
                      <option key={g} value={g}>{g}</option>
                    ))}
                  </select>
                </Field>
              </div>
              <Field label="Allergies" error={errors.allergies?.message}>
                <textarea {...register('allergies')} rows={2} placeholder="Ex. arachides, pénicilline…" className={cn(inputCls, 'resize-none')} />
              </Field>
              <Field label="Notes médicales" error={errors.medicalNotes?.message}>
                <textarea {...register('medicalNotes')} rows={2} placeholder="Informations utiles en cas d'urgence…" className={cn(inputCls, 'resize-none')} />
              </Field>
            </FormSection>

            <p className="text-[11px] text-zinc-600 rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2">
              Après les inscriptions du foyer : sur une fiche élève, déclarez les personnes autorisées
              (photo + pièce, quels enfants) puis imprimez les cartes parent. Une carte par adulte, pas par enfant.
            </p>
          </div>

          <div className="sticky bottom-0 flex gap-3 px-6 py-4 border-t border-zinc-100 bg-white">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 rounded-xl border border-zinc-200 text-sm text-zinc-600 hover:bg-zinc-50"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={createMutation.isPending || uploadingDocs}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 disabled:opacity-50"
            >
              {(createMutation.isPending || uploadingDocs) && <Loader2 size={14} className="animate-spin" />}
              {uploadingDocs ? 'Documents…' : "Inscrire l'élève"}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  )
}
