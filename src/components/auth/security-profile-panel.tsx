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
  LogOut,
  Mail,
  RefreshCw,
  Shield,
  ShieldAlert,
  User,
  Phone,
} from 'lucide-react'
import { useAuth } from '@/providers/auth-provider'
import { authApi } from '@/lib/api/auth'
import { getApiErrorMessage } from '@/lib/api/client'
import { evaluateStaffPassword, staffPasswordField } from '@/lib/auth/password-policy'
import { cn } from '@/lib/utils'
import { useToast } from '@/providers/toast-provider'
import { ThemeStudio } from '@/components/theme/theme-studio'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'

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

const changeEmailSchema = z.object({
  email: z.string().email('Email invalide').toLowerCase(),
  currentPassword: z.string().min(1, 'Mot de passe actuel requis'),
})

const changePhoneSchema = z.object({
  phone: z.string().min(8, 'Numéro invalide'),
  currentPassword: z.string().min(1, 'Mot de passe actuel requis'),
})

const verifyPhoneSchema = z.object({
  otp: z.string().length(6, '6 chiffres'),
})

type ChangePasswordForm = z.infer<typeof changePasswordSchema>
type ChangeEmailForm = z.infer<typeof changeEmailSchema>
type ChangePhoneForm = z.infer<typeof changePhoneSchema>
type VerifyPhoneForm = z.infer<typeof verifyPhoneSchema>

const STAFF_ROLES = new Set(['ADMIN', 'FINANCE', 'SUPER_ADMIN', 'DIRECTOR', 'IT'])

const ROLE_LABELS: Record<string, string> = {
  ADMIN: 'Administrateur',
  FINANCE: 'Finance / Guichet',
  MANAGER: 'Gérant',
  SUPER_ADMIN: 'Super administrateur',
}

export function SecurityProfilePanel() {
  const { user, refreshUser, logout } = useAuth()
  const { success, error: toastError } = useToast()
  const [showPasswords, setShowPasswords] = useState(false)
  const [resending, setResending] = useState(false)

  const [waLink, setWaLink] = useState<string | null>(null)
  const [confirmLogoutAll, setConfirmLogoutAll] = useState(false)
  const [loggingOutAll, setLoggingOutAll] = useState(false)

  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ChangePasswordForm>({ resolver: zodResolver(changePasswordSchema), mode: 'onChange' })

  const emailForm = useForm<ChangeEmailForm>({ resolver: zodResolver(changeEmailSchema), mode: 'onChange' })
  const phoneForm = useForm<ChangePhoneForm>({ resolver: zodResolver(changePhoneSchema), mode: 'onChange' })
  const otpForm = useForm<VerifyPhoneForm>({ resolver: zodResolver(verifyPhoneSchema), mode: 'onChange' })

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

  async function onLogoutAll() {
    setLoggingOutAll(true)
    try {
      await authApi.logoutAll()
      setConfirmLogoutAll(false)
      success('Sessions fermées', 'Tous vos appareils ont été déconnectés.')
      setTimeout(() => void logout(), 1200)
    } catch (err) {
      toastError('Échec', getApiErrorMessage(err))
    } finally {
      setLoggingOutAll(false)
    }
  }

  async function onChangeEmail(values: ChangeEmailForm) {
    try {
      await authApi.changeEmail(values)
      success('Email mis à jour', 'Confirmez le lien reçu. Votre session reste ouverte.')
      emailForm.reset()
      await refreshUser()
    } catch (err) {
      toastError('Échec', getApiErrorMessage(err))
    }
  }

  async function onRequestPhone(values: ChangePhoneForm) {
    try {
      const data = await authApi.changePhone(values)
      setWaLink(data.whatsappDeepLink)
      success('Code envoyé', 'Saisissez le code reçu sur le nouveau numéro.')
      phoneForm.reset()
      await refreshUser()
    } catch (err) {
      toastError('Échec', getApiErrorMessage(err))
    }
  }

  async function onVerifyPhone(values: VerifyPhoneForm) {
    try {
      await authApi.verifyChangePhone(values)
      success('Numéro mis à jour', 'Le téléphone de connexion a été modifié.')
      otpForm.reset()
      setWaLink(null)
      await refreshUser()
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
          Gérez l&apos;apparence, vos identifiants de connexion (email, WhatsApp) et votre mot de passe.
        </p>
      </motion.div>

      <ThemeStudio />

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
              <dt className="text-xs font-medium text-zinc-400 uppercase tracking-wide">Téléphone / WhatsApp</dt>
              <dd className="text-zinc-900 mt-0.5 break-all">{user.phone ?? '—'}</dd>
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

      <section className="rounded-2xl border border-slate-200/90 bg-white shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-2">
          <Mail size={18} className="text-emerald-600" />
          <h2 className="text-sm font-semibold text-zinc-900">E-mail de connexion</h2>
        </div>
        <form onSubmit={emailForm.handleSubmit(onChangeEmail)} className="p-6 space-y-4 max-w-lg" noValidate>
          <p className="text-xs text-zinc-500 -mt-1">
            Un lien de confirmation est envoyé à la nouvelle adresse. Les sessions sont fermées. Les opérations finance
            restent bloquées jusqu&apos;à confirmation.
          </p>
          <div className="space-y-1.5">
            <label htmlFor="loginEmail" className="block text-xs font-medium text-zinc-500 uppercase tracking-wide">
              Nouvel e-mail
            </label>
            <input
              {...emailForm.register('email')}
              id="loginEmail"
              type="email"
              autoComplete="email"
              defaultValue={user.email ?? ''}
              className="w-full px-3 py-2.5 rounded-xl border border-zinc-200 text-sm focus:ring-2 focus:ring-emerald-500/25 focus:border-emerald-400 outline-none"
            />
            {emailForm.formState.errors.email && (
              <p className="text-xs text-red-500">{emailForm.formState.errors.email.message}</p>
            )}
          </div>
          <div className="space-y-1.5">
            <label htmlFor="emailCurrentPassword" className="block text-xs font-medium text-zinc-500 uppercase tracking-wide">
              Mot de passe actuel
            </label>
            <input
              {...emailForm.register('currentPassword')}
              id="emailCurrentPassword"
              type="password"
              autoComplete="current-password"
              className="w-full px-3 py-2.5 rounded-xl border border-zinc-200 text-sm focus:ring-2 focus:ring-emerald-500/25 focus:border-emerald-400 outline-none"
            />
            {emailForm.formState.errors.currentPassword && (
              <p className="text-xs text-red-500">{emailForm.formState.errors.currentPassword.message}</p>
            )}
          </div>
          <button
            type="submit"
            disabled={emailForm.formState.isSubmitting}
            className={cn(
              'inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium text-white',
              'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 disabled:opacity-60',
            )}
          >
            {emailForm.formState.isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <Mail size={16} />}
            Changer l&apos;e-mail
          </button>
        </form>
      </section>

      <section className="rounded-2xl border border-slate-200/90 bg-white shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-2">
          <Phone size={18} className="text-emerald-600" />
          <h2 className="text-sm font-semibold text-zinc-900">Téléphone / WhatsApp de connexion</h2>
        </div>
        <div className="p-6 space-y-6 max-w-lg">
          <form onSubmit={phoneForm.handleSubmit(onRequestPhone)} className="space-y-4" noValidate>
            <p className="text-xs text-zinc-500 -mt-1">
              Un code est envoyé vers le nouveau numéro (SMS et/ou WhatsApp). Il n&apos;est appliqué qu&apos;après
              confirmation.
            </p>
            <div className="space-y-1.5">
              <label htmlFor="loginPhone" className="block text-xs font-medium text-zinc-500 uppercase tracking-wide">
                Nouveau numéro (ex. +243…)
              </label>
              <input
                {...phoneForm.register('phone')}
                id="loginPhone"
                type="tel"
                placeholder="+243…"
                autoComplete="tel"
                className="w-full px-3 py-2.5 rounded-xl border border-zinc-200 text-sm focus:ring-2 focus:ring-emerald-500/25 focus:border-emerald-400 outline-none"
              />
              {phoneForm.formState.errors.phone && (
                <p className="text-xs text-red-500">{phoneForm.formState.errors.phone.message}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <label htmlFor="phoneCurrentPassword" className="block text-xs font-medium text-zinc-500 uppercase tracking-wide">
                Mot de passe actuel
              </label>
              <input
                {...phoneForm.register('currentPassword')}
                id="phoneCurrentPassword"
                type="password"
                autoComplete="current-password"
                className="w-full px-3 py-2.5 rounded-xl border border-zinc-200 text-sm focus:ring-2 focus:ring-emerald-500/25 focus:border-emerald-400 outline-none"
              />
              {phoneForm.formState.errors.currentPassword && (
                <p className="text-xs text-red-500">{phoneForm.formState.errors.currentPassword.message}</p>
              )}
            </div>
            <button
              type="submit"
              disabled={phoneForm.formState.isSubmitting}
              className={cn(
                'inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium text-white',
                'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 disabled:opacity-60',
              )}
            >
              {phoneForm.formState.isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <Phone size={16} />}
              Envoyer le code
            </button>
          </form>

          {(user.pendingPhone || waLink) && (
            <form onSubmit={otpForm.handleSubmit(onVerifyPhone)} className="space-y-4 border-t border-slate-100 pt-4" noValidate>
              <p className="text-xs text-zinc-500">
                Code envoyé vers {user.pendingPhone ?? 'le nouveau numéro'} (15 min).
              </p>
              {waLink && (
                <a
                  href={waLink}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs font-medium text-emerald-700 hover:underline"
                >
                  Ouvrir WhatsApp pour transmettre / lire le code
                </a>
              )}
              <div className="space-y-1.5">
                <label htmlFor="phoneOtp" className="block text-xs font-medium text-zinc-500 uppercase tracking-wide">
                  Code reçu
                </label>
                <input
                  {...otpForm.register('otp')}
                  id="phoneOtp"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  className="w-full px-3 py-2.5 rounded-xl border border-zinc-200 text-sm tracking-widest focus:ring-2 focus:ring-emerald-500/25 focus:border-emerald-400 outline-none"
                />
                {otpForm.formState.errors.otp && (
                  <p className="text-xs text-red-500">{otpForm.formState.errors.otp.message}</p>
                )}
              </div>
              <button
                type="submit"
                disabled={otpForm.formState.isSubmitting}
                className="inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium bg-zinc-900 text-white hover:bg-zinc-800 disabled:opacity-60"
              >
                {otpForm.formState.isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <Shield size={16} />}
                Confirmer le numéro
              </button>
            </form>
          )}
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

      {/* Sessions */}
      <section className="rounded-2xl border border-slate-200/90 bg-white shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-2">
          <LogOut size={18} className="text-emerald-600" />
          <h2 className="text-sm font-semibold text-zinc-900">Sessions actives</h2>
        </div>
        <div className="p-6 flex flex-col sm:flex-row sm:items-center gap-4 justify-between">
          <p className="text-sm text-zinc-600 max-w-lg">
            Téléphone perdu, ordinateur partagé ou doute sur votre compte ? Fermez toutes vos sessions
            ouvertes (web et mobile). Vous devrez vous reconnecter partout, y compris ici.
          </p>
          <button
            type="button"
            onClick={() => setConfirmLogoutAll(true)}
            className="inline-flex shrink-0 items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-medium text-red-700 hover:bg-red-100"
          >
            <LogOut size={16} />
            Déconnecter toutes mes sessions
          </button>
        </div>
      </section>

      <ConfirmDialog
        open={confirmLogoutAll}
        title="Déconnecter toutes vos sessions ?"
        description="Toutes les sessions ouvertes sur ce compte seront fermées immédiatement."
        impact={[
          'Web et application mobile : reconnexion obligatoire partout',
          'Vous serez redirigé vers la page de connexion',
        ]}
        confirmLabel="Tout déconnecter"
        variant="danger"
        loading={loggingOutAll}
        onConfirm={() => void onLogoutAll()}
        onCancel={() => setConfirmLogoutAll(false)}
      />
    </div>
  )
}
