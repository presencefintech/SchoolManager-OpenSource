'use client'

import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2, X, FileEdit } from 'lucide-react'
import { motion } from 'framer-motion'
import { adminProfileSchema, type AdminProfileForm } from '@/lib/schemas/enrollment-actions'
import { useUpdateAdministrativeProfile } from '@/lib/hooks/use-admin'
import { useToast } from '@/providers/toast-provider'
import { getApiErrorMessage } from '@/lib/api/client'
import type { StudentDetail } from '@/types/admin'

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
        nationality: student.nationality ?? '',
        placeOfBirth: student.placeOfBirth ?? '',
        bloodGroup: student.bloodGroup ?? '',
        allergies: student.allergies ?? '',
        medicalNotes: student.medicalNotes ?? '',
        emergencyContactName: student.emergencyContactName ?? '',
        emergencyContactPhone: student.emergencyContactPhone ?? '',
      })
    }
  }, [open, student, reset])

  if (!open) return null

  async function onSubmit(data: AdminProfileForm) {
    const payload = Object.fromEntries(
      Object.entries(data).filter(([, v]) => v != null && String(v).trim() !== ''),
    )
    try {
      await updateMutation.mutateAsync({ studentId: student.id, payload })
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
        className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between px-6 py-5 border-b border-zinc-100 sticky top-0 bg-white">
          <div className="flex items-center gap-2">
            <FileEdit size={16} className="text-emerald-600" />
            <div>
              <h2 className="text-base font-semibold text-zinc-900">Modifier le profil administratif</h2>
              <p className="text-xs text-zinc-500">{student.firstName} {student.lastName}</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="p-1.5 rounded-lg hover:bg-zinc-100 text-zinc-400">
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
          <fieldset className="space-y-3">
            <legend className="text-xs font-semibold text-zinc-500 uppercase tracking-wide">Identité</legend>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-zinc-600 mb-1">Nationalité</label>
                <input
                  {...register('nationality')}
                  className="w-full px-3 py-2 rounded-lg border border-zinc-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-200"
                />
                {errors.nationality && <p className="text-xs text-red-600 mt-1">{errors.nationality.message}</p>}
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-600 mb-1">Lieu de naissance</label>
                <input
                  {...register('placeOfBirth')}
                  className="w-full px-3 py-2 rounded-lg border border-zinc-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-200"
                />
                {errors.placeOfBirth && <p className="text-xs text-red-600 mt-1">{errors.placeOfBirth.message}</p>}
              </div>
            </div>
          </fieldset>

          <fieldset className="space-y-3">
            <legend className="text-xs font-semibold text-zinc-500 uppercase tracking-wide">Informations médicales</legend>
            <div>
              <label className="block text-xs font-medium text-zinc-600 mb-1">Groupe sanguin</label>
              <input
                {...register('bloodGroup')}
                placeholder="Ex. O+"
                className="w-full px-3 py-2 rounded-lg border border-zinc-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-200"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-600 mb-1">Allergies</label>
              <textarea
                rows={2}
                {...register('allergies')}
                className="w-full px-3 py-2 rounded-lg border border-zinc-200 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-emerald-200"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-600 mb-1">Notes médicales</label>
              <textarea
                rows={3}
                {...register('medicalNotes')}
                placeholder="Traitements, conditions particulières…"
                className="w-full px-3 py-2 rounded-lg border border-zinc-200 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-emerald-200"
              />
            </div>
          </fieldset>

          <fieldset className="space-y-3">
            <legend className="text-xs font-semibold text-zinc-500 uppercase tracking-wide">Urgence</legend>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-zinc-600 mb-1">Contact d&apos;urgence</label>
                <input
                  {...register('emergencyContactName')}
                  className="w-full px-3 py-2 rounded-lg border border-zinc-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-200"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-600 mb-1">Téléphone urgence</label>
                <input
                  type="tel"
                  {...register('emergencyContactPhone')}
                  className="w-full px-3 py-2 rounded-lg border border-zinc-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-200"
                />
              </div>
            </div>
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
