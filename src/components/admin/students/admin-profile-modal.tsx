'use client'

import { useEffect, type ReactNode } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2, X, FileEdit } from 'lucide-react'
import { motion } from 'framer-motion'
import {
  adminProfileSchema,
  adminProfileToPayload,
  type AdminProfileForm,
} from '@/lib/schemas/enrollment-actions'
import { useUpdateAdministrativeProfile } from '@/lib/hooks/use-admin'
import { useClasses } from '@/lib/hooks/admin/classes'
import { useToast } from '@/providers/toast-provider'
import { getApiErrorMessage } from '@/lib/api/client'
import type { StudentDetail } from '@/types/admin'
import { formatRdcFullName } from '@/lib/utils/student-name.util'
import { cn } from '@/lib/utils'

const BLOOD_OPTIONS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'] as const

function toDateInput(iso?: string): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

function normalizeGenderValue(gender?: string): AdminProfileForm['gender'] {
  if (!gender) return ''
  const g = gender.toUpperCase()
  if (g === 'M' || g === 'MALE') return 'M'
  if (g === 'F' || g === 'FEMALE') return 'F'
  return ''
}

function Field({
  label,
  error,
  children,
  className,
}: {
  label: string
  error?: string
  children: ReactNode
  className?: string
}) {
  return (
    <div className={className}>
      <label className="block text-xs font-medium text-zinc-600 mb-1">{label}</label>
      {children}
      {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
    </div>
  )
}

const inputClass =
  'w-full px-3 py-2 rounded-lg border border-zinc-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-200'

export function AdminProfileModal({
  open,
  student,
  onClose,
}: {
  open: boolean
  student: StudentDetail
  onClose: () => void
}) {
  const toast = useToast()
  const updateMutation = useUpdateAdministrativeProfile()
  const { data: classesData } = useClasses({ isActive: true })
  const classes = (classesData ?? []).map((c) => ({
    id: c.id,
    name: c.name,
    displayLabel: c.displayLabel ?? c.name,
  }))

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm<AdminProfileForm>({
    resolver: zodResolver(adminProfileSchema),
  })

  useEffect(() => {
    if (open && student) {
      reset({
        lastName: student.lastName ?? '',
        postnom: student.postnom ?? '',
        firstName: student.prenom || student.firstName || '',
        prenom: student.prenom ?? '',
        gender: normalizeGenderValue(student.gender),
        dateOfBirth: toDateInput(student.dateOfBirth),
        placeOfBirth: student.placeOfBirth ?? '',
        nationality: student.nationality ?? 'Congolaise',
        address: student.address ?? '',
        email: student.email ?? '',
        phone: student.phone ?? '',
        academicYear: student.academicYear ?? '',
        classId: student.classId,
        emergencyContactName: student.emergencyContactName ?? student.parentName ?? '',
        emergencyContactPhone: student.emergencyContactPhone ?? student.parentPhone ?? '',
        parentEmail: student.parentEmail ?? '',
        bloodGroup: (student.bloodGroup as AdminProfileForm['bloodGroup']) ?? '',
        allergies: student.allergies ?? '',
        medicalNotes: student.medicalNotes ?? '',
      })
    }
  }, [open, student, reset])

  if (!open) return null

  async function onSubmit(data: AdminProfileForm) {
    try {
      const hadMedical = Boolean(
        student.bloodGroup || student.allergies || student.medicalNotes,
      )
      await updateMutation.mutateAsync({
        studentId: student.id,
        payload: adminProfileToPayload(data, { clearMedical: hadMedical }),
      })
      toast.success('Profil mis à jour', 'Les informations administratives ont été enregistrées.')
      onClose()
    } catch (err) {
      toast.error('Échec de la mise à jour', getApiErrorMessage(err))
    }
  }

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between px-6 py-5 border-b border-zinc-100 sticky top-0 bg-white z-10">
          <div className="flex items-center gap-2">
            <FileEdit size={16} className="text-emerald-600" />
            <div>
              <h2 className="text-base font-semibold text-zinc-900">Mettre à jour le dossier</h2>
              <p className="text-xs text-zinc-500">{formatRdcFullName(student)}</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="p-1.5 rounded-lg hover:bg-zinc-100 text-zinc-400">
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-6">
          <fieldset className="space-y-3">
            <legend className="text-xs font-semibold text-zinc-500 uppercase tracking-wide">
              État civil &amp; identité
            </legend>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Field label="Nom *" error={errors.lastName?.message}>
                <input {...register('lastName')} className={cn(inputClass, 'uppercase')} />
              </Field>
              <Field label="Postnom" error={errors.postnom?.message}>
                <input {...register('postnom')} className={cn(inputClass, 'uppercase')} />
              </Field>
              <Field label="Prénom" error={errors.firstName?.message}>
                <input {...register('firstName')} className={inputClass} />
                <p className="text-[11px] text-zinc-400 mt-1">Optionnel</p>
              </Field>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Field label="Prénom administratif" error={errors.prenom?.message}>
                <input {...register('prenom')} className={inputClass} placeholder="Optionnel" />
              </Field>
              <Field label="Genre" error={errors.gender?.message}>
                <select {...register('gender')} className={inputClass}>
                  <option value="">—</option>
                  <option value="M">Masculin</option>
                  <option value="F">Féminin</option>
                </select>
              </Field>
              <Field label="Date de naissance" error={errors.dateOfBirth?.message}>
                <input type="date" {...register('dateOfBirth')} className={inputClass} />
              </Field>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="Lieu de naissance" error={errors.placeOfBirth?.message}>
                <input {...register('placeOfBirth')} placeholder="Ex. Kolwezi" className={inputClass} />
              </Field>
              <Field label="Nationalité" error={errors.nationality?.message}>
                <input {...register('nationality')} placeholder="Congolaise" className={inputClass} />
              </Field>
            </div>
            <Field label="Adresse" error={errors.address?.message}>
              <input {...register('address')} placeholder="Avenue, commune, ville…" className={inputClass} />
            </Field>
          </fieldset>

          <fieldset className="space-y-3">
            <legend className="text-xs font-semibold text-zinc-500 uppercase tracking-wide">
              Scolarité &amp; contacts élève
            </legend>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="Classe" error={errors.classId?.message}>
                <select
                  {...register('classId', { setValueAs: (v) => (v === '' || v == null ? undefined : Number(v)) })}
                  className={inputClass}
                >
                  <option value="">— Conservée —</option>
                  {classes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.displayLabel ?? c.name}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Année scolaire" error={errors.academicYear?.message}>
                <input {...register('academicYear')} placeholder="2026-2027" className={inputClass} />
              </Field>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="Email élève" error={errors.email?.message}>
                <input type="email" {...register('email')} className={inputClass} />
              </Field>
              <Field label="Téléphone élève" error={errors.phone?.message}>
                <input type="tel" {...register('phone')} placeholder="+243…" className={inputClass} />
              </Field>
            </div>
          </fieldset>

          <fieldset className="space-y-3">
            <legend className="text-xs font-semibold text-zinc-500 uppercase tracking-wide">
              Parent / tuteur (dossier)
            </legend>
            <p className="text-[11px] text-zinc-400">
              Contact de dossier (urgence). Les tuteurs liés restent gérés dans le panneau Tuteurs.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="Parent / tuteur" error={errors.emergencyContactName?.message}>
                <input {...register('emergencyContactName')} className={inputClass} />
              </Field>
              <Field label="Tél. parent" error={errors.emergencyContactPhone?.message}>
                <input type="tel" {...register('emergencyContactPhone')} placeholder="+243…" className={inputClass} />
              </Field>
            </div>
            <Field label="Email parent" error={errors.parentEmail?.message}>
              <input type="email" {...register('parentEmail')} className={inputClass} />
            </Field>
          </fieldset>

          <fieldset className="space-y-3">
            <legend className="text-xs font-semibold text-zinc-500 uppercase tracking-wide">
              Santé
            </legend>
            <Field label="Groupe sanguin" error={errors.bloodGroup?.message}>
              <select {...register('bloodGroup')} className={inputClass}>
                <option value="">—</option>
                {BLOOD_OPTIONS.map((g) => (
                  <option key={g} value={g}>
                    {g}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Allergies" error={errors.allergies?.message}>
              <textarea rows={2} {...register('allergies')} className={cn(inputClass, 'resize-none')} />
            </Field>
            <Field label="Notes médicales" error={errors.medicalNotes?.message}>
              <textarea
                rows={3}
                {...register('medicalNotes')}
                placeholder="Traitements, conditions particulières…"
                className={cn(inputClass, 'resize-none')}
              />
            </Field>
          </fieldset>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 rounded-xl border border-zinc-200 text-sm text-zinc-600 hover:bg-zinc-50"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={updateMutation.isPending || !isDirty}
              className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-medium disabled:opacity-50"
            >
              {updateMutation.isPending && <Loader2 size={14} className="animate-spin" />}
              Enregistrer
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  )
}
