'use client'

import { Suspense, useMemo, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter, useSearchParams } from 'next/navigation'
import { motion } from 'framer-motion'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  AlertTriangle,
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  Lock,
  Mail,
  ShieldCheck,
  UserCheck,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  evaluateStaffPassword,
  mapActivateErrorMessage,
  staffPasswordField,
  staffPasswordStrength,
} from '@/lib/auth/password-policy'

const activateSchema = z
  .object({
    password: staffPasswordField,
    confirmPassword: z.string().min(1, 'Confirmez votre mot de passe'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Les mots de passe ne correspondent pas',
    path: ['confirmPassword'],
  })

type ActivateForm = z.infer<typeof activateSchema>

const onboardingSteps = [
  { icon: UserCheck, title: 'Mot de passe défini', desc: 'Votre accès staff est préparé.' },
  { icon: Mail, title: 'Code SMS vérifié', desc: 'Double validation email + SMS.' },
  { icon: ShieldCheck, title: 'Connexion sécurisée', desc: 'Accédez à votre espace.' },
]

function PasswordRequirements({ password }: { password: string }) {
  const requirements = evaluateStaffPassword(password)
  if (!password) return null

  return (
    <ul className="mt-3 space-y-1.5 rounded-xl bg-slate-50 border border-slate-100 px-3 py-2.5">
      {requirements.map((req) => (
        <li key={req.id} className="flex items-center gap-2 text-xs">
          <CheckCircle2
            size={14}
            className={cn('shrink-0', req.met ? 'text-emerald-600' : 'text-zinc-300')}
          />
          <span className={cn(req.met ? 'text-emerald-800' : 'text-zinc-500')}>{req.label}</span>
        </li>
      ))}
    </ul>
  )
}

function StrengthBar({ password }: { password: string }) {
  const score = staffPasswordStrength(password)
  if (!password) return null

  const labels = ['Faible', 'Correct', 'Bon', 'Fort', 'Excellent'] as const
  const colors = ['bg-red-400', 'bg-orange-400', 'bg-amber-400', 'bg-emerald-500', 'bg-teal-600']

  return (
    <div className="mt-2">
      <div className="flex gap-1">
        {[0, 1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className={cn(
              'h-1 flex-1 rounded-full transition-colors',
              i < score ? colors[score - 1] : 'bg-zinc-200',
            )}
          />
        ))}
      </div>
      <p className="text-[11px] text-zinc-400 mt-1">{labels[Math.max(0, score - 1)] ?? 'Faible'}</p>
    </div>
  )
}

function ActivateContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get('token') ?? ''

  const [showPassword, setShowPassword] = useState(false)
  const [serverError, setServerError] = useState('')
  const [step, setStep] = useState<'password' | 'otp' | 'done'>('password')
  const [otp, setOtp] = useState('')
  const [otpSubmitting, setOtpSubmitting] = useState(false)

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<ActivateForm>({ resolver: zodResolver(activateSchema), mode: 'onChange' })

  const passwordValue = watch('password') ?? ''
  const canSubmit = useMemo(
    () => staffPasswordStrength(passwordValue) === 5,
    [passwordValue],
  )

  async function onSubmit(values: ActivateForm) {
    setServerError('')
    try {
      const res = await fetch('/api/auth/activate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password: values.password }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(mapActivateErrorMessage(data.message ?? data.code))
      }
      if (data.requiresVerification) {
        setStep('otp')
        return
      }
      setStep('done')
      setTimeout(() => router.push('/login?activated=1'), 4500)
    } catch (err) {
      setServerError(err instanceof Error ? err.message : mapActivateErrorMessage(undefined))
    }
  }

  async function onVerifyOtp(e: React.FormEvent) {
    e.preventDefault()
    setServerError('')
    setOtpSubmitting(true)
    try {
      const res = await fetch('/api/auth/verify-account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, otp }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(mapActivateErrorMessage(data.message ?? data.code))
      }
      setStep('done')
      setTimeout(() => router.push('/login?activated=1'), 4500)
    } catch (err) {
      setServerError(err instanceof Error ? err.message : mapActivateErrorMessage(undefined))
    } finally {
      setOtpSubmitting(false)
    }
  }

  const done = step === 'done'

  return (
    <div className="relative min-h-screen flex items-center justify-center px-4 py-12 bg-[#f4f6fa] overflow-hidden">
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-32 right-[-10%] h-[420px] w-[420px] rounded-full bg-emerald-200/40 blur-3xl" />
        <div className="absolute top-[30%] -left-24 h-[360px] w-[360px] rounded-full bg-teal-200/30 blur-3xl" />
        <div className="absolute bottom-[-15%] right-[15%] h-[300px] w-[300px] rounded-full bg-emerald-100/50 blur-3xl" />
        <div
          className="absolute inset-0 opacity-[0.025]"
          style={{
            backgroundImage:
              'linear-gradient(#0f1623 1px, transparent 1px), linear-gradient(90deg, #0f1623 1px, transparent 1px)',
            backgroundSize: '48px 48px',
          }}
        />
      </div>

      <motion.div
        className="relative w-full max-w-xl"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      >
        <div className="flex flex-col items-center text-center mb-8">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.4, delay: 0.1 }}
            className="w-14 h-14 mb-4"
          >
            <Image src="/logo-icon-transparent.png" alt="SchoolManager" width={56} height={56} className="h-full w-full object-contain" />
          </motion.div>
          <h1 className="text-xl font-bold text-zinc-900 tracking-tight">SchoolManager</h1>
          <p className="text-sm text-zinc-500 mt-1">Activation compte professionnel</p>
        </div>

        <div className="rounded-3xl border border-slate-200/90 bg-white/90 backdrop-blur-sm shadow-xl shadow-slate-200/60 ring-1 ring-slate-100 p-10">
          {!token ? (
            <div className="text-center py-2">
              <div className="w-12 h-12 rounded-2xl bg-red-50 flex items-center justify-center mx-auto mb-4">
                <AlertTriangle size={22} className="text-red-500" />
              </div>
              <h2 className="text-lg font-semibold text-zinc-900">Invitation invalide</h2>
              <p className="text-sm text-zinc-500 mt-2 leading-relaxed">
                Ce lien d&apos;activation est incomplet. Ouvrez le lien reçu par email ou demandez une
                nouvelle invitation à votre administrateur.
              </p>
              <Link
                href="/login"
                className="inline-flex mt-6 items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium transition-colors"
              >
                Retour à la connexion
              </Link>
            </div>
          ) : done ? (
            <div className="py-2">
              <div className="text-center mb-8">
                <div className="w-12 h-12 rounded-2xl bg-emerald-50 flex items-center justify-center mx-auto mb-4">
                  <CheckCircle2 size={22} className="text-emerald-600" />
                </div>
                <h2 className="text-lg font-semibold text-zinc-900">Compte vérifié avec succès</h2>
                <p className="text-sm text-zinc-500 mt-2 leading-relaxed">
                  Votre email et votre numéro de téléphone sont confirmés. Vous pouvez vous connecter.
                </p>
              </div>
              <ol className="space-y-3">
                {onboardingSteps.map(({ icon: Icon, title, desc }, i) => (
                  <li
                    key={title}
                    className="flex items-start gap-3 rounded-xl border border-emerald-100 bg-emerald-50/50 px-3 py-2.5"
                  >
                    <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center shrink-0 ring-1 ring-emerald-100">
                      <Icon size={16} className="text-emerald-600" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-emerald-900">
                        {i + 1}. {title}
                      </p>
                      <p className="text-xs text-emerald-800/70">{desc}</p>
                    </div>
                  </li>
                ))}
              </ol>
              <p className="text-center text-xs text-zinc-400 mt-6">Redirection vers la connexion…</p>
            </div>
          ) : step === 'otp' ? (
            <>
              <div className="mb-6">
                <h2 className="text-lg font-semibold text-zinc-900">Vérification SMS</h2>
                <p className="text-sm text-zinc-400 mt-1 leading-relaxed">
                  Saisissez le code à 6 chiffres reçu par SMS pour finaliser l&apos;activation.
                </p>
              </div>
              <form onSubmit={onVerifyOtp} className="space-y-4" noValidate>
                <div className="space-y-1.5">
                  <label htmlFor="otp" className="block text-xs font-medium text-zinc-500 uppercase tracking-wide">
                    Code SMS
                  </label>
                  <input
                    id="otp"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    autoFocus
                    placeholder="000000"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-200 text-sm tracking-[0.3em] text-center font-mono focus:ring-2 focus:ring-emerald-500/25 focus:border-emerald-400 outline-none"
                  />
                </div>
                {serverError && (
                  <div role="alert" className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-600">
                    {serverError}
                  </div>
                )}
                <button
                  type="submit"
                  disabled={otpSubmitting || otp.length !== 6}
                  className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white text-sm font-medium disabled:opacity-60"
                >
                  {otpSubmitting && <Loader2 size={15} className="animate-spin" />}
                  {otpSubmitting ? 'Vérification…' : 'Valider mon compte'}
                </button>
              </form>
            </>
          ) : (
            <>
              <div className="mb-6">
                <h2 className="text-lg font-semibold text-zinc-900">Finaliser votre accès</h2>
                <p className="text-sm text-zinc-400 mt-1 leading-relaxed">
                  Définissez un mot de passe robuste pour sécuriser votre compte staff (administration,
                  finance ou enseignement).
                </p>
              </div>

              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
                <div className="space-y-1.5">
                  <label
                    htmlFor="password"
                    className="block text-xs font-medium text-zinc-500 uppercase tracking-wide"
                  >
                    Mot de passe
                  </label>
                  <div className="relative">
                    <KeyRound
                      size={16}
                      className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-300 pointer-events-none"
                    />
                    <input
                      {...register('password')}
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="new-password"
                      autoFocus
                      placeholder="••••••••••••"
                      className={cn(
                        'w-full pl-10 pr-11 py-2.5 rounded-xl border bg-white text-sm text-zinc-900 outline-none transition-all',
                        'placeholder:text-zinc-300',
                        'focus:ring-2 focus:ring-emerald-500/25 focus:border-emerald-400',
                        errors.password
                          ? 'border-red-300 bg-red-50/50 focus:ring-red-500/20 focus:border-red-400'
                          : 'border-zinc-200 hover:border-zinc-300',
                      )}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                      className="absolute right-1.5 top-1/2 -translate-y-1/2 p-1.5 rounded-lg text-zinc-300 hover:text-zinc-500 hover:bg-zinc-50 transition-colors"
                      tabIndex={-1}
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  {errors.password && (
                    <p className="text-xs text-red-500">{errors.password.message}</p>
                  )}
                  <StrengthBar password={passwordValue} />
                  <PasswordRequirements password={passwordValue} />
                </div>

                <div className="space-y-1.5">
                  <label
                    htmlFor="confirmPassword"
                    className="block text-xs font-medium text-zinc-500 uppercase tracking-wide"
                  >
                    Confirmer le mot de passe
                  </label>
                  <div className="relative">
                    <Lock
                      size={16}
                      className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-300 pointer-events-none"
                    />
                    <input
                      {...register('confirmPassword')}
                      id="confirmPassword"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="new-password"
                      placeholder="••••••••••••"
                      className={cn(
                        'w-full pl-10 pr-3.5 py-2.5 rounded-xl border bg-white text-sm text-zinc-900 outline-none transition-all',
                        'placeholder:text-zinc-300',
                        'focus:ring-2 focus:ring-emerald-500/25 focus:border-emerald-400',
                        errors.confirmPassword
                          ? 'border-red-300 bg-red-50/50 focus:ring-red-500/20 focus:border-red-400'
                          : 'border-zinc-200 hover:border-zinc-300',
                      )}
                    />
                  </div>
                  {errors.confirmPassword && (
                    <p className="text-xs text-red-500">{errors.confirmPassword.message}</p>
                  )}
                </div>

                {serverError && (
                  <div
                    role="alert"
                    aria-live="polite"
                    className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-600"
                  >
                    {serverError}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isSubmitting || !canSubmit}
                  className={cn(
                    'w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl mt-2',
                    'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700',
                    'disabled:opacity-60 disabled:cursor-not-allowed',
                    'text-white text-sm font-medium transition-all',
                    'focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2',
                    'shadow-md shadow-emerald-600/25',
                  )}
                >
                  {isSubmitting && <Loader2 size={15} className="animate-spin" />}
                  {isSubmitting ? 'Activation…' : 'Activer mon compte'}
                </button>
              </form>
            </>
          )}
        </div>

        <p className="mt-6 text-center text-xs text-zinc-400">
          Lien expiré ou déjà utilisé ? Contactez l&apos;administrateur de votre établissement.
        </p>
        <p className="mt-2 text-center text-[11px] text-zinc-300">
          © 2026 SchoolManager · Accès réservé au personnel autorisé
        </p>
      </motion.div>
    </div>
  )
}

export default function ActivatePage() {
  return (
    <Suspense fallback={null}>
      <ActivateContent />
    </Suspense>
  )
}
