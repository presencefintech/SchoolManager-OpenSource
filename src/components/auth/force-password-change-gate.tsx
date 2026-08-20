'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { KeyRound, Loader2, ShieldAlert, Eye, EyeOff } from 'lucide-react'
import { useAuth } from '@/providers/auth-provider'
import { authApi } from '@/lib/api/auth'
import { getApiErrorMessage } from '@/lib/api/client'
import { evaluateStaffPassword, staffPasswordField } from '@/lib/auth/password-policy'
import { cn } from '@/lib/utils'
import { useToast } from '@/providers/toast-provider'

const schema = z
  .object({
    oldPassword: z.string().min(1, 'Mot de passe temporaire requis'),
    newPassword: staffPasswordField,
    confirmPassword: z.string().min(1, 'Confirmez le nouveau mot de passe'),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    message: 'Les mots de passe ne correspondent pas',
    path: ['confirmPassword'],
  })

type FormValues = z.infer<typeof schema>

/**
 * Barrière pleine page — modèle SaaS enterprise.
 * Tant que mustChangePassword=true, aucune navigation métier.
 */
export function ForcePasswordChangeGate() {
  const { user, logout, refreshUser } = useAuth()
  const toast = useToast()
  const [show, setShow] = useState(false)
  const [formError, setFormError] = useState('')

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema), mode: 'onChange' })

  const newPassword = watch('newPassword') ?? ''
  const requirements = evaluateStaffPassword(newPassword)

  if (!user?.mustChangePassword) return null

  async function onSubmit(values: FormValues) {
    setFormError('')
    try {
      await authApi.changePassword({
        oldPassword: values.oldPassword,
        newPassword: values.newPassword,
      })
      toast.success('Mot de passe mis à jour', 'Reconnectez-vous avec votre nouveau mot de passe.')
      await logout().catch(() => undefined)
      window.location.assign('/login?passwordChanged=1')
    } catch (err) {
      const message = getApiErrorMessage(err)
      setFormError(message)
      toast.error('Échec', message)
      void refreshUser()
    }
  }

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-zinc-950/70 backdrop-blur-sm p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="force-pwd-title"
        className="w-full max-w-md rounded-2xl bg-white shadow-2xl overflow-hidden"
      >
        <div className="px-6 py-5 border-b border-zinc-100 bg-gradient-to-br from-amber-50 to-white">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500 flex items-center justify-center flex-shrink-0">
              <ShieldAlert size={18} className="text-white" />
            </div>
            <div>
              <h2 id="force-pwd-title" className="text-base font-semibold text-zinc-900">
                Changement de mot de passe obligatoire
              </h2>
              <p className="text-xs text-zinc-500 mt-1 leading-relaxed">
                Votre compte a reçu un mot de passe temporaire (reset support ou bootstrap d’urgence).
                Définissez un mot de passe personnel avant d’accéder à la plateforme.
              </p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="px-6 py-5 space-y-4">
          <label className="block">
            <span className="text-xs font-medium text-zinc-500">Mot de passe temporaire actuel</span>
            <div className="relative mt-1">
              <input
                type={show ? 'text' : 'password'}
                autoComplete="current-password"
                className="w-full rounded-xl border border-zinc-200 px-3 py-2.5 pr-10 text-sm outline-none focus:ring-2 focus:ring-amber-200"
                {...register('oldPassword')}
              />
              <button
                type="button"
                onClick={() => setShow((v) => !v)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600"
                aria-label={show ? 'Masquer' : 'Afficher'}
              >
                {show ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
            {errors.oldPassword && (
              <p className="text-[11px] text-red-600 mt-1">{errors.oldPassword.message}</p>
            )}
          </label>

          <label className="block">
            <span className="text-xs font-medium text-zinc-500">Nouveau mot de passe</span>
            <input
              type="password"
              autoComplete="new-password"
              className="mt-1 w-full rounded-xl border border-zinc-200 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-amber-200"
              {...register('newPassword')}
            />
            {errors.newPassword && (
              <p className="text-[11px] text-red-600 mt-1">{errors.newPassword.message}</p>
            )}
          </label>

          <label className="block">
            <span className="text-xs font-medium text-zinc-500">Confirmer</span>
            <input
              type="password"
              autoComplete="new-password"
              className="mt-1 w-full rounded-xl border border-zinc-200 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-amber-200"
              {...register('confirmPassword')}
            />
            {errors.confirmPassword && (
              <p className="text-[11px] text-red-600 mt-1">{errors.confirmPassword.message}</p>
            )}
          </label>

          <ul className="grid grid-cols-1 gap-1 rounded-xl bg-zinc-50 px-3 py-2.5">
            {requirements.map((r) => (
              <li
                key={r.id}
                className={cn('text-[11px]', r.met ? 'text-emerald-700' : 'text-zinc-400')}
              >
                {r.met ? '✓' : '○'} {r.label}
              </li>
            ))}
          </ul>

          {formError && (
            <div role="alert" className="rounded-xl bg-red-50 border border-red-200 px-3 py-2.5 text-sm text-red-700">
              {formError}
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-zinc-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-zinc-800 disabled:opacity-50"
          >
            {isSubmitting ? <Loader2 size={14} className="animate-spin" /> : <KeyRound size={14} />}
            Enregistrer et se reconnecter
          </button>

          <button
            type="button"
            onClick={() => void logout()}
            className="w-full text-xs text-zinc-500 hover:text-zinc-800 py-1"
          >
            Se déconnecter
          </button>
        </form>
      </div>
    </div>
  )
}
