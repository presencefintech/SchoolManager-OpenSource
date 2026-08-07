'use client'

import { Suspense, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter, useSearchParams } from 'next/navigation'
import { motion } from 'framer-motion'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Eye, EyeOff, Loader2, Lock, CheckCircle2, AlertTriangle } from 'lucide-react'
import { cn } from '@/lib/utils'

const resetSchema = z
  .object({
    newPassword: z.string().min(8, 'Minimum 8 caractères'),
    confirmPassword: z.string().min(8, 'Minimum 8 caractères'),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Les mots de passe ne correspondent pas',
    path: ['confirmPassword'],
  })

type ResetForm = z.infer<typeof resetSchema>

function ResetPasswordContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get('token') ?? ''

  const [showPassword, setShowPassword] = useState(false)
  const [serverError, setServerError] = useState('')
  const [done, setDone] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ResetForm>({ resolver: zodResolver(resetSchema) })

  async function onSubmit(values: ResetForm) {
    setServerError('')
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, newPassword: values.newPassword }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.message ?? 'Ce lien est invalide ou a expiré.')
      }
      setDone(true)
      setTimeout(() => router.push('/login'), 2500)
    } catch (err) {
      setServerError(err instanceof Error ? err.message : 'Ce lien est invalide ou a expiré.')
    }
  }

  return (
    <div className="relative min-h-screen flex items-center justify-center px-4 py-12 bg-[#f4f6fa] overflow-hidden">

      {/* Ambient mesh background */}
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-32 right-[-10%] h-[420px] w-[420px] rounded-full bg-emerald-200/40 blur-3xl" />
        <div className="absolute top-[30%] -left-24 h-[360px] w-[360px] rounded-full bg-teal-200/30 blur-3xl" />
        <div className="absolute bottom-[-15%] right-[15%] h-[300px] w-[300px] rounded-full bg-emerald-100/50 blur-3xl" />
      </div>

      <motion.div
        className="relative w-full max-w-xl"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      >
        {/* Brand lockup */}
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
        </div>

        {/* Card */}
        <div className="rounded-3xl border border-slate-200/90 bg-white/90 backdrop-blur-sm shadow-xl shadow-slate-200/60 ring-1 ring-slate-100 p-10">
          {!token ? (
            <div className="text-center py-4">
              <div className="w-12 h-12 rounded-2xl bg-red-50 flex items-center justify-center mx-auto mb-4">
                <AlertTriangle size={22} className="text-red-500" />
              </div>
              <h2 className="text-lg font-semibold text-zinc-900">Lien invalide</h2>
              <p className="text-sm text-zinc-500 mt-2 leading-relaxed">
                Ce lien de réinitialisation est incomplet. Demandez-en un nouveau depuis la page de connexion.
              </p>
              <Link
                href="/forgot-password"
                className="inline-flex mt-6 items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium transition-colors"
              >
                Demander un nouveau lien
              </Link>
            </div>
          ) : done ? (
            <div className="text-center py-4">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 size={22} className="text-emerald-600" />
              </div>
              <h2 className="text-lg font-semibold text-zinc-900">Mot de passe mis à jour</h2>
              <p className="text-sm text-zinc-500 mt-2 leading-relaxed">
                Redirection vers la connexion…
              </p>
            </div>
          ) : (
            <>
              <div className="mb-6">
                <h2 className="text-lg font-semibold text-zinc-900">Nouveau mot de passe</h2>
                <p className="text-sm text-zinc-400 mt-1">Choisissez un mot de passe d&apos;au moins 8 caractères.</p>
              </div>

              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
                <div className="space-y-1.5">
                  <label htmlFor="newPassword" className="block text-xs font-medium text-zinc-500 uppercase tracking-wide">
                    Nouveau mot de passe
                  </label>
                  <div className="relative">
                    <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-300 pointer-events-none" />
                    <input
                      {...register('newPassword')}
                      id="newPassword"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="new-password"
                      autoFocus
                      placeholder="••••••••"
                      className={cn(
                        'w-full pl-10 pr-11 py-2.5 rounded-xl border bg-white text-sm text-zinc-900 outline-none transition-all',
                        'placeholder:text-zinc-300',
                        'focus:ring-2 focus:ring-emerald-500/25 focus:border-emerald-400',
                        errors.newPassword
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
                  {errors.newPassword && (
                    <p className="text-xs text-red-500">{errors.newPassword.message}</p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="confirmPassword" className="block text-xs font-medium text-zinc-500 uppercase tracking-wide">
                    Confirmer le mot de passe
                  </label>
                  <div className="relative">
                    <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-300 pointer-events-none" />
                    <input
                      {...register('confirmPassword')}
                      id="confirmPassword"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="new-password"
                      placeholder="••••••••"
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
                  <div role="alert" aria-live="polite" className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-600">
                    {serverError}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isSubmitting}
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
                  {isSubmitting ? 'Enregistrement…' : 'Réinitialiser le mot de passe'}
                </button>
              </form>
            </>
          )}
        </div>
      </motion.div>
    </div>
  )
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ResetPasswordContent />
    </Suspense>
  )
}
