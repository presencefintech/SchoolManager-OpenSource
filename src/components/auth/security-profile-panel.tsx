'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { motion } from 'framer-motion'
import {
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  Mail,
  RefreshCw,
  Shield,
  ShieldAlert,
  User,
} from 'lucide-react'
import { useAuth } from '@/providers/auth-provider'
import { authApi } from '@/lib/api/auth'
import { getApiErrorMessage } from '@/lib/api/client'
import { evaluateStaffPassword, staffPasswordField } from '@/lib/auth/password-policy'
import { cn } from '@/lib/utils'
import { useToast } from '@/providers/toast-provider'

const changePasswordSchema = z
  .object({
    oldPassword: z.string().min(1, 'Mot de passe actuel requis'),
    newPassword: staffPasswordField,
    confirmPassword: z.string().min(1, 'Confirmez le nouveau mot de passe'),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Les mots de passe ne correspondent pas',
    path: ['confirmPassword'],
  })

type ChangePasswordForm = z.infer<typeof changePasswordSchema>

const STAFF_ROLES = new Set(['ADMIN', 'FINANCE', 'SUPER_ADMIN', 'DIRECTOR'])

const ROLE_LABELS: Record<string, string> = {
  ADMIN: 'Administrateur',
  FINANCE: 'Finance / Guichet',
  SUPER_ADMIN: 'Super administrateur',
}

export function SecurityProfilePanel() {
  const { user, refreshUser, logout } = useAuth()
  const { success, error: toastError } = useToast()
  const [showPasswords, setShowPasswords] = useState(false)
  const [resending, setResending] = useState(false)

  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ChangePasswordForm>({ resolver: zodResolver(changePasswordSchema), mode: 'onChange' })

  const newPassword = watch('newPassword') ?? ''
  const requirements = evaluateStaffPassword(newPassword)
  const emailVerified = user?.isEmailConfirmed !== false
  const isStaff = user?.role ? STAFF_ROLES.has(user.role) : false

  async function onChangePassword(values: ChangePasswordForm) {
    try {
      await authApi.changePassword({
        oldPassword: values.oldPassword,
        newPassword: values.newPassword,
      })
      success('Mot de passe modifié', 'Reconnectez-vous avec votre nouveau mot de passe.')
      reset()
      setTimeout(() => void logout(), 1500)
    } catch (err) {
      toastError('Échec', getApiErrorMessage(err))
    }
  }

  async function handleResendVerification() {
    setResending(true)
    try {
      await authApi.resendVerificationEmail()
      success('Email envoyé', 'Consultez votre boîte de réception.')
    } catch (err) {
      toastError('Envoi impossible', getApiErrorMessage(err))
    } finally {
      setResending(false)
    }
  }

  if (!user) {
    return (
      <div className="p-8 text-center text-sm text-zinc-500">
        Chargement du profil…
      </div>
    )
  }

  const initials = `${user.firstName?.[0] ?? ''}${user.lastName?.[0] ?? ''}`.toUpperCase()

  return (
    <div className="p-6 lg:p-8 max-w-4xl mx-auto space-y-6">
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-bold text-zinc-900 tracking-tight">Profil &amp; sécurité</h1>
        <p className="text-sm text-zinc-500 mt-1">
          Gérez votre identité, la vérification email et votre mot de passe.
        </p>
      </motion.div>

      {/* Identité */}
      <section className="rounded-2xl border border-slate-200/90 bg-white shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-2">
          <User size={18} className="text-emerald-600" />
          <h2 className="text-sm font-semibold text-zinc-900">Identité du compte</h2>
        </div>
        <div className="p-6 flex flex-col sm:flex-row gap-6">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white text-lg font-bold shrink-0 shadow-md shadow-emerald-500/20">
            {initials || '?'}
          </div>
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 flex-1 text-sm">
            <div>
              <dt className="text-xs font-medium text-zinc-400 uppercase tracking-wide">Nom</dt>
              <dd className="text-zinc-900 font-medium mt-0.5">
                {user.firstName} {user.lastName}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-zinc-400 uppercase tracking-wide">Rôle</dt>
              <dd className="text-zinc-900 mt-0.5">{ROLE_LABELS[user.role] ?? user.role}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-zinc-400 uppercase tracking-wide">Email</dt>
              <dd className="text-zinc-900 mt-0.5 break-all">{user.email ?? '—'}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-zinc-400 uppercase tracking-wide">École</dt>
              <dd className="text-zinc-900 mt-0.5">
                {user.schoolId != null ? `#${user.schoolId}` : 'Plateforme'}
              </dd>
            </div>
          </dl>
        </div>
      </section>

      {/* Vérification email */}
      {isStaff && (
        <section className="rounded-2xl border border-slate-200/90 bg-white shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-2">
            <Mail size={18} className="text-emerald-600" />
            <h2 className="text-sm font-semibold text-zinc-900">Vérification email</h2>
          </div>
          <div className="p-6">
            <div
              className={cn(
                'flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 rounded-xl px-4 py-4 border',
                emailVerified
                  ? 'bg-emerald-50/80 border-emerald-200'
                  : 'bg-amber-50/80 border-amber-200',
              )}
            >
              <div className="flex items-start gap-3">
                {emailVerified ? (
                  <CheckCircle2 size={22} className="text-emerald-600 shrink-0 mt-0.5" />
                ) : (
                  <ShieldAlert size={22} className="text-amber-600 shrink-0 mt-0.5" />
                )}
                <div>
                  <p className={cn('text-sm font-semibold', emailVerified ? 'text-emerald-900' : 'text-amber-900')}>
                    {emailVerified ? 'Adresse email confirmée' : 'Email en attente de confirmation'}
                  </p>
                  <p className={cn('text-xs mt-1', emailVerified ? 'text-emerald-800/80' : 'text-amber-800/80')}>
                    {emailVerified
                      ? 'Vous pouvez effectuer toutes les opérations financières autorisées par votre rôle.'
                      : 'Les mutations finance (paiements, validations, remboursements) restent bloquées jusqu\'à confirmation.'}
                  </p>
                </div>
              </div>
              {!emailVerified && (
                <div className="flex flex-wrap gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => void handleResendVerification()}
                    disabled={resending}
                    className="inline-flex items-center gap-2 rounded-xl bg-amber-600 px-3 py-2 text-xs font-medium text-white hover:bg-amber-700 disabled:opacity-60"
                  >
                    {resending ? <Loader2 size={14} className="animate-spin" /> : <Mail size={14} />}
                    Renvoyer l&apos;email
                  </button>
                  <button
                    type="button"
                    onClick={() => void refreshUser()}
                    className="inline-flex items-center gap-2 rounded-xl border border-amber-300 bg-white px-3 py-2 text-xs font-medium text-amber-900 hover:bg-amber-100/80"
                  >
                    <RefreshCw size={14} />
                    Actualiser
                  </button>
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      {/* Mot de passe */}
      <section className="rounded-2xl border border-slate-200/90 bg-white shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-2">
          <KeyRound size={18} className="text-emerald-600" />
          <h2 className="text-sm font-semibold text-zinc-900">Mot de passe</h2>
        </div>
        <form onSubmit={handleSubmit(onChangePassword)} className="p-6 space-y-4 max-w-lg" noValidate>
          <p className="text-xs text-zinc-500 -mt-1 mb-2">
            Après modification, toutes vos sessions seront fermées par mesure de sécurité.
          </p>

          <div className="space-y-1.5">
            <label htmlFor="oldPassword" className="block text-xs font-medium text-zinc-500 uppercase tracking-wide">
              Mot de passe actuel
            </label>
            <input
              {...register('oldPassword')}
              id="oldPassword"
              type={showPasswords ? 'text' : 'password'}
              autoComplete="current-password"
              className="w-full px-3 py-2.5 rounded-xl border border-zinc-200 text-sm focus:ring-2 focus:ring-emerald-500/25 focus:border-emerald-400 outline-none"
            />
            {errors.oldPassword && <p className="text-xs text-red-500">{errors.oldPassword.message}</p>}
          </div>

          <div className="space-y-1.5">
            <label htmlFor="newPassword" className="block text-xs font-medium text-zinc-500 uppercase tracking-wide">
              Nouveau mot de passe
            </label>
            <div className="relative">
              <input
                {...register('newPassword')}
                id="newPassword"
                type={showPasswords ? 'text' : 'password'}
                autoComplete="new-password"
                className="w-full px-3 py-2.5 pr-10 rounded-xl border border-zinc-200 text-sm focus:ring-2 focus:ring-emerald-500/25 focus:border-emerald-400 outline-none"
              />
              <button
                type="button"
                onClick={() => setShowPasswords((v) => !v)}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-zinc-400 hover:text-zinc-600"
                tabIndex={-1}
              >
                {showPasswords ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {errors.newPassword && <p className="text-xs text-red-500">{errors.newPassword.message}</p>}
            {newPassword && (
              <ul className="mt-2 space-y-1 rounded-lg bg-slate-50 border border-slate-100 px-3 py-2">
                {requirements.map((req) => (
                  <li key={req.id} className="flex items-center gap-2 text-xs">
                    <CheckCircle2
                      size={12}
                      className={req.met ? 'text-emerald-600' : 'text-zinc-300'}
                    />
                    <span className={req.met ? 'text-emerald-800' : 'text-zinc-500'}>{req.label}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="space-y-1.5">
            <label htmlFor="confirmPassword" className="block text-xs font-medium text-zinc-500 uppercase tracking-wide">
              Confirmer le nouveau mot de passe
            </label>
            <input
              {...register('confirmPassword')}
              id="confirmPassword"
              type={showPasswords ? 'text' : 'password'}
              autoComplete="new-password"
              className="w-full px-3 py-2.5 rounded-xl border border-zinc-200 text-sm focus:ring-2 focus:ring-emerald-500/25 focus:border-emerald-400 outline-none"
            />
            {errors.confirmPassword && (
              <p className="text-xs text-red-500">{errors.confirmPassword.message}</p>
            )}
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className={cn(
              'inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium text-white',
              'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700',
              'disabled:opacity-60 shadow-md shadow-emerald-600/20',
            )}
          >
            {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <Shield size={16} />}
            {isSubmitting ? 'Enregistrement…' : 'Mettre à jour le mot de passe'}
          </button>
        </form>
      </section>
    </div>
  )
}
