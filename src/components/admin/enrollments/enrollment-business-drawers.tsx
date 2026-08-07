'use client'

import { useEffect, useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2, X, Calendar, PauseCircle, UserPlus, GraduationCap } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  enrollSessionSchema,
  rentreePackSchema,
  moratoriumDrawerSchema,
  type EnrollSessionForm,
  type RentreePackForm,
  type MoratoriumDrawerForm,
} from '@/lib/schemas/enrollment-actions'
import { labelMoratoriumType } from '@/lib/business-labels'
import type { MoratoriumType } from '@/types/admin'
import {
  useAcademicSessions,
  useClasses,
  useEnrollInSession,
  useRentreePack,
  useEnrollmentFeePreview,
  useFeeStructures,
  useCreateMoratorium,
  useAllowedMoratoriumTypes,
} from '@/lib/hooks/use-admin'
import { useToast } from '@/providers/toast-provider'
import { getApiErrorMessage } from '@/lib/api/client'
import { newIdempotencyKey } from '@/lib/idempotency'
import { fmtMoney } from '@/components/admin/finance/verification-ui'

function DrawerShell({
  open,
  title,
  subtitle,
  icon: Icon,
  onClose,
  children,
}: {
  open: boolean
  title: string
  subtitle?: string
  icon: React.ElementType
  onClose: () => void
  children: React.ReactNode
}) {
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/30 z-[60]"
            onClick={onClose}
          />
          <motion.aside
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 320 }}
            className="fixed top-0 right-0 h-full w-full max-w-md bg-white shadow-2xl z-[70] flex flex-col"
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-100">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
                  <Icon size={16} />
                </div>
                <div>
                  <h2 className="text-base font-semibold text-zinc-900">{title}</h2>
                  {subtitle && <p className="text-xs text-zinc-500">{subtitle}</p>}
                </div>
              </div>
              <button type="button" onClick={onClose} className="p-1.5 rounded-lg hover:bg-zinc-100 text-zinc-400">
                <X size={18} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-5">{children}</div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  )
}

export function EnrollSessionDrawer({
  open,
  studentId,
  studentName,
  defaultClassId,
  onClose,
}: {
  open: boolean
  studentId: number
  studentName: string
  defaultClassId?: number | null
  onClose: () => void
}) {
  const toast = useToast()
  const { data: sessions = [], isLoading: loadingSessions } = useAcademicSessions()
  const { data: classesData } = useClasses({ isActive: true })
  const classes = classesData ?? []
  const enrollMutation = useEnrollInSession()

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<EnrollSessionForm>({
    resolver: zodResolver(enrollSessionSchema),
    defaultValues: {
      type: 'RE_ENROLLMENT',
      classId: defaultClassId ?? undefined,
      autoAssignExplicitFees: false,
      explicitFeeStructureIds: [],
    },
  })

  const classId = watch('classId')
  const sessionId = watch('sessionId')
  const autoAssignExplicitFees = watch('autoAssignExplicitFees')
  const explicitFeeStructureIds = watch('explicitFeeStructureIds') ?? []

  const effectiveClassId =
    classId && classId > 0 ? classId : defaultClassId && defaultClassId > 0 ? defaultClassId : undefined

  const { data: feeStructures = [] } = useFeeStructures({
    sessionId: sessionId || undefined,
    isActive: true,
  })

  const explicitCatalog = useMemo(
    () =>
      feeStructures.filter(
        (fs) =>
          fs.assignmentMode === 'EXPLICIT' &&
          (fs.classId == null || fs.classId === effectiveClassId),
      ),
    [feeStructures, effectiveClassId],
  )

  const previewExplicitIds = useMemo(() => {
    if (autoAssignExplicitFees) return explicitCatalog.map((f) => f.id)
    return explicitFeeStructureIds
  }, [autoAssignExplicitFees, explicitCatalog, explicitFeeStructureIds])

  const { data: feePreview, isFetching: feeLoading } = useEnrollmentFeePreview(effectiveClassId, {
    sessionId: sessionId || undefined,
    studentId: open ? studentId : undefined,
    explicitFeeStructureIds: previewExplicitIds.length ? previewExplicitIds : undefined,
  })

  useEffect(() => {
    if (!open) {
      reset({
        type: 'RE_ENROLLMENT',
        classId: defaultClassId ?? undefined,
        autoAssignExplicitFees: false,
        explicitFeeStructureIds: [],
      })
    }
  }, [open, reset, defaultClassId])

  async function onSubmit(data: EnrollSessionForm) {
    try {
      const res = await enrollMutation.mutateAsync({
        studentId,
        sessionId: data.sessionId,
        classId: data.classId,
        type: data.type,
        ...(data.autoAssignExplicitFees ? { autoAssignExplicitFees: true } : {}),
        ...(data.explicitFeeStructureIds?.length
          ? { explicitFeeStructureIds: data.explicitFeeStructureIds }
          : {}),
      })
      toast.success('Inscription enregistrée', `${studentName} est inscrit(e) à la session sélectionnée.`)
      const pack = res?.explicitFeePack
      if (pack?.assigned?.length) {
        toast.success(
          'Frais optionnels',
          `${pack.assigned.length} barème(s) EXPLICIT attribué(s).`,
        )
      }
      if (pack?.skipped?.length) {
        toast.error('Frais partiels', `${pack.skipped.length} barème(s) non attribués.`)
      }
      onClose()
    } catch (err) {
      toast.error('Échec de l\'inscription', getApiErrorMessage(err))
    }
  }

  return (
    <DrawerShell
      open={open}
      title="Inscrire à une session"
      subtitle={studentName}
      icon={UserPlus}
      onClose={onClose}
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label className="block text-xs font-medium text-zinc-600 mb-1">Session académique *</label>
          {loadingSessions ? (
            <div className="h-10 rounded-lg bg-zinc-100 animate-pulse" />
          ) : (
            <select
              {...register('sessionId')}
              className="w-full px-3 py-2 rounded-lg border border-zinc-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-200"
            >
              <option value="">— Choisir —</option>
              {sessions.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}{s.isCurrent ? ' (courante)' : ''}
                </option>
              ))}
            </select>
          )}
          {errors.sessionId && <p className="text-xs text-red-600 mt-1">{errors.sessionId.message}</p>}
        </div>

        <div>
          <label className="block text-xs font-medium text-zinc-600 mb-1">Classe (optionnel)</label>
          <select
            {...register('classId')}
            className="w-full px-3 py-2 rounded-lg border border-zinc-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-200"
          >
            <option value="">— Conserver la classe actuelle —</option>
            {classes.map((c: { id: number; name: string }) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-zinc-600 mb-1">Type d&apos;inscription</label>
          <select
            {...register('type')}
            className="w-full px-3 py-2 rounded-lg border border-zinc-200 text-sm"
          >
            <option value="RE_ENROLLMENT">Réinscription</option>
            <option value="NEW">Nouvelle inscription</option>
            <option value="TRANSFER">Transfert</option>
          </select>
        </div>

        <div className="rounded-xl border border-zinc-100 bg-zinc-50 px-3 py-2.5 space-y-1">
          <div className="flex items-center justify-between text-[11px] text-zinc-600">
            <span>
              Quote {feePreview?.academicYear ?? '—'}
              {feePreview?.mode ? ` · ${feePreview.mode}` : ''}
            </span>
            {feeLoading && <Loader2 size={12} className="animate-spin" />}
          </div>
          {feePreview?.feeLines?.length ? (
            <ul className="space-y-1">
              {feePreview.feeLines.map((line) => (
                <li
                  key={`${line.feeStructureId}-${line.source ?? 'auto'}`}
                  className="flex justify-between text-[11px] text-zinc-700"
                >
                  <span>
                    {line.categoryName}
                    {line.source && line.source !== 'AUTOMATIC' && (
                      <span className="ml-1 rounded bg-amber-50 px-1 text-[9px] font-medium uppercase text-amber-700">
                        {line.source === 'PROPOSED' ? 'optionnel' : line.source}
                      </span>
                    )}
                  </span>
                  <span className="tabular-nums font-medium">
                    {fmtMoney(line.amount, feePreview.currency)}
                  </span>
                </li>
              ))}
              <li className="flex justify-between text-xs font-semibold text-zinc-900 border-t border-zinc-200 pt-1 mt-1">
                <span>Total</span>
                <span>{fmtMoney(feePreview.totalFees, feePreview.currency)}</span>
              </li>
            </ul>
          ) : (
            !feeLoading && (
              <p className="text-[11px] text-amber-700">
                {effectiveClassId ? 'Aucun barème pour cette classe.' : 'Choisissez une classe pour voir la quote.'}
              </p>
            )
          )}
        </div>

        {explicitCatalog.length > 0 && (
          <div className="rounded-xl border border-amber-100 bg-amber-50/40 px-3 py-2.5 space-y-2">
            <p className="text-[11px] font-medium text-amber-900">Frais optionnels (EXPLICIT)</p>
            <label className="flex items-start gap-2 text-xs text-zinc-700 cursor-pointer">
              <input
                type="checkbox"
                className="mt-0.5 rounded border-zinc-300"
                checked={!!autoAssignExplicitFees}
                onChange={(e) => {
                  const checked = e.target.checked
                  setValue('autoAssignExplicitFees', checked)
                  setValue(
                    'explicitFeeStructureIds',
                    checked ? explicitCatalog.map((f) => f.id) : [],
                    { shouldValidate: true },
                  )
                }}
              />
              <span>Attribuer tous les frais optionnels</span>
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
                          {fmtMoney(fs.amount, feePreview?.currency ?? 'USD')}
                        </span>
                      </label>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
        )}

        <div className="flex gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 px-4 py-2.5 rounded-xl border border-zinc-200 text-sm text-zinc-600 hover:bg-zinc-50"
          >
            Annuler
          </button>
          <button
            type="submit"
            disabled={enrollMutation.isPending}
            className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-medium disabled:opacity-50"
          >
            {enrollMutation.isPending && <Loader2 size={14} className="animate-spin" />}
            Confirmer
          </button>
        </div>
      </form>
    </DrawerShell>
  )
}

export function RentreePackDrawer({
  open,
  studentId,
  studentName,
  defaultClassId,
  onClose,
}: {
  open: boolean
  studentId: number
  studentName: string
  defaultClassId?: number | null
  onClose: () => void
}) {
  const toast = useToast()
  const { data: sessions = [], isLoading: loadingSessions } = useAcademicSessions()
  const { data: classesData } = useClasses({ isActive: true })
  const classes = classesData ?? []
  const packMutation = useRentreePack()

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<RentreePackForm>({
    resolver: zodResolver(rentreePackSchema),
    defaultValues: {
      type: 'RE_ENROLLMENT',
      collectDeposit: true,
      classId: defaultClassId ?? undefined,
      autoAssignExplicitFees: false,
      explicitFeeStructureIds: [],
    },
  })

  const classId = watch('classId')
  const sessionId = watch('sessionId')
  const feesPaid = watch('feesPaid')
  const collectDeposit = watch('collectDeposit')
  const autoAssignExplicitFees = watch('autoAssignExplicitFees')
  const explicitFeeStructureIds = watch('explicitFeeStructureIds') ?? []

  const effectiveClassId =
    classId && classId > 0 ? classId : defaultClassId && defaultClassId > 0 ? defaultClassId : undefined

  const { data: feeStructures = [] } = useFeeStructures({
    sessionId: sessionId || undefined,
    isActive: true,
  })

  const explicitCatalog = useMemo(
    () =>
      feeStructures.filter(
        (fs) =>
          fs.assignmentMode === 'EXPLICIT' &&
          (fs.classId == null || fs.classId === effectiveClassId),
      ),
    [feeStructures, effectiveClassId],
  )

  const previewExplicitIds = useMemo(() => {
    if (autoAssignExplicitFees) return explicitCatalog.map((f) => f.id)
    return explicitFeeStructureIds
  }, [autoAssignExplicitFees, explicitCatalog, explicitFeeStructureIds])

  const { data: feePreview, isFetching: feeLoading } = useEnrollmentFeePreview(effectiveClassId, {
    sessionId: sessionId || undefined,
    studentId: open ? studentId : undefined,
    explicitFeeStructureIds: previewExplicitIds.length ? previewExplicitIds : undefined,
  })

  useEffect(() => {
    if (!open) {
      reset({
        type: 'RE_ENROLLMENT',
        collectDeposit: true,
        classId: defaultClassId ?? undefined,
        feesPaid: undefined,
        paymentNotes: '',
        autoAssignExplicitFees: false,
        explicitFeeStructureIds: [],
      })
    }
  }, [open, reset, defaultClassId])

  useEffect(() => {
    if (!open || !sessions.length) return
    const current = sessions.find((s) => s.isCurrent)
    if (current) setValue('sessionId', current.id)
  }, [open, sessions, setValue])

  async function onSubmit(data: RentreePackForm) {
    const idempotencyKey = newIdempotencyKey('rentree')
    try {
      const result = (await packMutation.mutateAsync({
        studentId,
        sessionId: data.sessionId,
        classId: data.classId,
        feesPaid: data.feesPaid,
        collectDeposit: data.collectDeposit,
        paymentNotes: data.paymentNotes || undefined,
        type: data.type,
        ...(data.autoAssignExplicitFees ? { autoAssignExplicitFees: true } : {}),
        ...(data.explicitFeeStructureIds?.length
          ? { explicitFeeStructureIds: data.explicitFeeStructureIds }
          : {}),
        idempotencyKey,
      })) as {
        deposit?: { paymentId: number; amount: number; currency: string }
        depositWarning?: string
        serverMessage?: string
        explicitFeePack?: { assigned: number[] }
      }
      if (result.depositWarning) {
        toast.success('Pack rentrée', result.depositWarning)
      } else if (result.deposit) {
        toast.success(
          'Pack rentrée + acompte',
          `Paiement #${result.deposit.paymentId} · ${result.deposit.amount} ${result.deposit.currency}`,
        )
      } else {
        toast.success('Pack rentrée', result.serverMessage || `${studentName} réinscrit(e) avec barème.`)
      }
      if (result.explicitFeePack?.assigned?.length) {
        toast.success(
          'Frais optionnels',
          `${result.explicitFeePack.assigned.length} barème(s) EXPLICIT attribué(s).`,
        )
      }
      onClose()
    } catch (err) {
      toast.error('Pack rentrée impossible', getApiErrorMessage(err))
    }
  }

  return (
    <DrawerShell
      open={open}
      title="Pack rentrée"
      subtitle={studentName}
      icon={GraduationCap}
      onClose={onClose}
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <p className="text-xs text-zinc-500">
          Réinscription session + application du barème + acompte optionnel (reçu caisse).
        </p>

        <div>
          <label className="block text-xs font-medium text-zinc-600 mb-1">Session académique</label>
          {loadingSessions ? (
            <div className="h-10 rounded-lg bg-zinc-100 animate-pulse" />
          ) : (
            <select
              {...register('sessionId')}
              className="w-full px-3 py-2 rounded-lg border border-zinc-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-200"
            >
              <option value="">— Session courante —</option>
              {sessions.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}{s.isCurrent ? ' (courante)' : ''}
                </option>
              ))}
            </select>
          )}
        </div>

        <div>
          <label className="block text-xs font-medium text-zinc-600 mb-1">Classe</label>
          <select
            {...register('classId')}
            className="w-full px-3 py-2 rounded-lg border border-zinc-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-200"
          >
            <option value="">— Classe actuelle —</option>
            {classes.map((c: { id: number; name: string }) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>

        <div className="rounded-xl border border-zinc-100 bg-zinc-50 px-3 py-2.5 space-y-1">
          <div className="flex items-center justify-between text-[11px] text-zinc-600">
            <span>
              Quote {feePreview?.academicYear ?? '—'}
              {feePreview?.mode ? ` · ${feePreview.mode}` : ''}
            </span>
            {feeLoading && <Loader2 size={12} className="animate-spin" />}
          </div>
          {feePreview?.feeLines?.length ? (
            <ul className="space-y-1">
              {feePreview.feeLines.map((line) => (
                <li
                  key={`${line.feeStructureId}-${line.source ?? 'auto'}`}
                  className="flex justify-between text-[11px] text-zinc-700"
                >
                  <span>
                    {line.categoryName}
                    {line.source && line.source !== 'AUTOMATIC' && (
                      <span className="ml-1 rounded bg-amber-50 px-1 text-[9px] font-medium uppercase text-amber-700">
                        {line.source === 'PROPOSED' ? 'optionnel' : line.source}
                      </span>
                    )}
                  </span>
                  <span className="tabular-nums font-medium">
                    {fmtMoney(line.amount, feePreview.currency)}
                  </span>
                </li>
              ))}
              <li className="flex justify-between text-xs font-semibold text-zinc-900 border-t border-zinc-200 pt-1 mt-1">
                <span>Total</span>
                <span>{fmtMoney(feePreview.totalFees, feePreview.currency)}</span>
              </li>
            </ul>
          ) : (
            !feeLoading && <p className="text-[11px] text-amber-700">Aucun barème pour cette classe.</p>
          )}
        </div>

        {explicitCatalog.length > 0 && (
          <div className="rounded-xl border border-amber-100 bg-amber-50/40 px-3 py-2.5 space-y-2">
            <p className="text-[11px] font-medium text-amber-900">Frais optionnels (EXPLICIT)</p>
            <label className="flex items-start gap-2 text-xs text-zinc-700 cursor-pointer">
              <input
                type="checkbox"
                className="mt-0.5 rounded border-zinc-300"
                checked={!!autoAssignExplicitFees}
                onChange={(e) => {
                  const checked = e.target.checked
                  setValue('autoAssignExplicitFees', checked)
                  setValue(
                    'explicitFeeStructureIds',
                    checked ? explicitCatalog.map((f) => f.id) : [],
                    { shouldValidate: true },
                  )
                }}
              />
              <span>Attribuer tous les frais optionnels</span>
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
                          {fmtMoney(fs.amount, feePreview?.currency ?? 'USD')}
                        </span>
                      </label>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
        )}

        <div>
          <label className="block text-xs font-medium text-zinc-600 mb-1">Acompte</label>
          <input
            type="number"
            min={0}
            step="0.01"
            {...register('feesPaid')}
            className="w-full px-3 py-2 rounded-lg border border-zinc-200 text-sm"
            placeholder="0"
          />
          {errors.feesPaid && <p className="text-xs text-red-600 mt-1">{errors.feesPaid.message}</p>}
        </div>

        <label className="flex items-start gap-2 text-xs text-zinc-700 cursor-pointer">
          <input type="checkbox" {...register('collectDeposit')} className="mt-0.5 rounded border-zinc-300" />
          <span>
            Encaisser l&apos;acompte en caisse
            {feesPaid != null && feesPaid > 0 && collectDeposit !== false && (
              <span className="block text-[10px] text-emerald-700 mt-0.5">Reçu + notification parent</span>
            )}
          </span>
        </label>

        <div>
          <label className="block text-xs font-medium text-zinc-600 mb-1">Notes</label>
          <textarea
            {...register('paymentNotes')}
            rows={2}
            className="w-full px-3 py-2 rounded-lg border border-zinc-200 text-sm resize-none"
            placeholder="Ex. acompte rentrée…"
          />
        </div>

        <div className="flex gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 px-4 py-2.5 rounded-xl border border-zinc-200 text-sm text-zinc-600 hover:bg-zinc-50"
          >
            Annuler
          </button>
          <button
            type="submit"
            disabled={packMutation.isPending}
            className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-zinc-900 text-white text-sm font-medium disabled:opacity-50"
          >
            {packMutation.isPending && <Loader2 size={14} className="animate-spin" />}
            Appliquer le pack
          </button>
        </div>
      </form>
    </DrawerShell>
  )
}

export function MoratoriumDrawer({
  open,
  studentId,
  studentName,
  enrollmentId,
  onClose,
}: {
  open: boolean
  studentId: number
  studentName: string
  enrollmentId?: number
  onClose: () => void
}) {
  const toast = useToast()
  const createMutation = useCreateMoratorium()
  const { allowedTypes, defaultType, isLoading: loadingPolicy } = useAllowedMoratoriumTypes({ enabled: open })

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<MoratoriumDrawerForm>({
    resolver: zodResolver(moratoriumDrawerSchema),
    defaultValues: { note: '', type: 'EXCEPTIONAL' },
  })

  const amount = watch('amount')
  const moratoriumType = watch('type')

  useEffect(() => {
    if (!open) {
      reset({ note: '', endDate: '', amount: undefined, type: defaultType })
    } else if (!loadingPolicy) {
      setValue('type', defaultType)
    }
  }, [open, reset, defaultType, loadingPolicy, setValue])

  async function onSubmit(data: MoratoriumDrawerForm) {
    if (!allowedTypes.includes(data.type)) {
      toast.error('Type non autorisé', `Types permis : ${allowedTypes.map(labelMoratoriumType).join(', ')}`)
      return
    }
    const today = new Date().toISOString().slice(0, 10)
    const reason = data.amount != null && data.amount > 0
      ? `${data.note} — Plafond convenu : ${fmtMoney(data.amount)}`
      : data.note
    try {
      await createMutation.mutateAsync({
        studentId,
        enrollmentId,
        type: data.type as MoratoriumType,
        startDate: today,
        endDate: data.endDate,
        reason,
      })
      toast.success('Moratoire activé', `Les relances sont suspendues jusqu'au ${new Date(data.endDate).toLocaleDateString('fr-FR')}.`)
      onClose()
    } catch (err) {
      toast.error('Impossible d\'activer le moratoire', getApiErrorMessage(err))
    }
  }

  return (
    <DrawerShell
      open={open}
      title="Gérer le moratoire"
      subtitle={studentName}
      icon={PauseCircle}
      onClose={onClose}
    >
      <p className="text-xs text-zinc-500 mb-4 bg-indigo-50 border border-indigo-100 rounded-lg px-3 py-2">
        Un moratoire suspend les relances de paiement pour la période indiquée. Le solde reste dû.
      </p>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label className="block text-xs font-medium text-zinc-600 mb-1">Type de moratoire</label>
          {loadingPolicy ? (
            <div className="h-10 rounded-lg bg-zinc-100 animate-pulse" />
          ) : (
            <select
              {...register('type')}
              className="w-full px-3 py-2 rounded-lg border border-zinc-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200"
            >
              {allowedTypes.map((t) => (
                <option key={t} value={t}>{labelMoratoriumType(t)}</option>
              ))}
            </select>
          )}
          {!loadingPolicy && allowedTypes.length === 1 && (
            <p className="text-[10px] text-zinc-400 mt-1">Seul ce type est autorisé par la politique de votre école.</p>
          )}
          {moratoriumType === 'EXCEPTIONAL' && allowedTypes.includes('EXCEPTIONAL') && (
            <p className="text-[10px] text-zinc-400 mt-1">Recommandé pour un accord de paiement échelonné.</p>
          )}
        </div>

        <div>
          <label className="block text-xs font-medium text-zinc-600 mb-1">Date de fin *</label>
          <div className="relative">
            <Calendar size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
            <input
              type="date"
              {...register('endDate')}
              min={new Date().toISOString().slice(0, 10)}
              className="w-full pl-9 pr-3 py-2 rounded-lg border border-zinc-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200"
            />
          </div>
          {errors.endDate && <p className="text-xs text-red-600 mt-1">{errors.endDate.message}</p>}
        </div>

        <div>
          <label className="block text-xs font-medium text-zinc-600 mb-1">Montant couvert (optionnel)</label>
          <input
            type="number"
            min={0}
            step="0.01"
            placeholder="Ex. 150"
            {...register('amount')}
            className="w-full px-3 py-2 rounded-lg border border-zinc-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200"
          />
          {amount != null && amount > 0 && (
            <p className="text-[10px] text-zinc-400 mt-1">Sera mentionné dans la note interne : {fmtMoney(amount)}</p>
          )}
        </div>

        <div>
          <label className="block text-xs font-medium text-zinc-600 mb-1">Note / motif *</label>
          <textarea
            rows={3}
            {...register('note')}
            placeholder="Ex. Accord direction — paiement échelonné en 3 fois"
            className="w-full px-3 py-2 rounded-lg border border-zinc-200 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-indigo-200"
          />
          {errors.note && <p className="text-xs text-red-600 mt-1">{errors.note.message}</p>}
        </div>

        <div className="flex gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 px-4 py-2.5 rounded-xl border border-zinc-200 text-sm text-zinc-600 hover:bg-zinc-50"
          >
            Annuler
          </button>
          <button
            type="submit"
            disabled={createMutation.isPending}
            className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-medium disabled:opacity-50"
          >
            {createMutation.isPending && <Loader2 size={14} className="animate-spin" />}
            Activer le moratoire
          </button>
        </div>
      </form>
    </DrawerShell>
  )
}
