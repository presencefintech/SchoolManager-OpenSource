'use client'

import { Suspense, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useSearchParams } from 'next/navigation'
import { motion } from 'framer-motion'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  Eye, EyeOff, Loader2, Mail, Lock,
  GraduationCap, ScanLine, BarChart3,
} from 'lucide-react'
import { useAuth } from '@/providers/auth-provider'
import { getApiErrorMessage } from '@/lib/api/client'
import { cn } from '@/lib/utils'

const loginSchema = z.object({
  identifier: z.string().min(3, 'Email ou téléphone requis'),
  password: z.string().min(6, 'Minimum 6 caractères'),
})

type LoginForm = z.infer<typeof loginSchema>

const features = [
  { icon: ScanLine, label: 'Présence biométrique' },
  { icon: GraduationCap, label: 'Suivi des élèves' },
  { icon: BarChart3, label: 'Reporting avancé' },
]

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginPageContent />
    </Suspense>
  )
}

function LoginPageContent() {
  const searchParams = useSearchParams()
  const justActivated = searchParams.get('activated') === '1'
  const { login } = useAuth()
  const [showPassword, setShowPassword] = useState(false)
  const [serverError, setServerError] = useState('')

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginForm>({ resolver: zodResolver(loginSchema) })

  async function onSubmit(values: LoginForm) {
    setServerError('')
    try {
      await login(values)
    } catch (err) {
      setServerError(getApiErrorMessage(err))
    }
  }

  return (
    <div className="relative h-screen flex items-center justify-center px-4 py-6 bg-[#f4f6fa] overflow-hidden">

      {/* Ambient mesh background */}
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-32 right-[-10%] h-[420px] w-[420px] rounded-full bg-emerald-200/40 blur-3xl" />
        <div className="absolute top-[30%] -left-24 h-[360px] w-[360px] rounded-full bg-teal-200/30 blur-3xl" />
        <div className="absolute bottom-[-15%] right-[15%] h-[300px] w-[300px] rounded-full bg-emerald-100/50 blur-3xl" />
        <div
          className="absolute inset-0 opacity-[0.025]"
          style={{
            backgroundImage: `linear-gradient(#0f1623 1px, transparent 1px), linear-gradient(90deg, #0f1623 1px, transparent 1px)`,
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
        {/* Brand lockup */}
        <div className="flex flex-col items-center text-center mb-4">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.4, delay: 0.1 }}
            className="w-36 h-36 mb-2"
          >
            <Image src="/logo-icon-transparent.png" alt="SchoolManager" width={144} height={144} className="h-full w-full object-contain" />
          </motion.div>
          <h1 className="text-xl font-bold text-zinc-900 tracking-tight">SchoolManager</h1>
          <p className="text-sm text-zinc-500 mt-1">Gestion des présences &amp; finances scolaires</p>
        </div>

        {/* Card */}
        <div className="rounded-3xl border border-slate-200/90 bg-white/90 backdrop-blur-sm shadow-xl shadow-slate-200/60 ring-1 ring-slate-100 p-6">
          <div className="mb-4">
            <h2 className="text-lg font-semibold text-zinc-900">Connexion</h2>
            <p className="text-sm text-zinc-400 mt-1">Accédez à votre espace administrateur</p>
          </div>

          {justActivated && (
            <div
              role="status"
              className="mb-4 rounded-xl bg-emerald-50 border border-emerald-200 px-4 py-3 text-sm text-emerald-800"
            >
              Compte activé. Connectez-vous, puis confirmez votre email pour débloquer les opérations
              financières.
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>

            {/* Identifier */}
            <div className="space-y-1.5">
              <label htmlFor="identifier" className="block text-xs font-medium text-zinc-500 uppercase tracking-wide">
                Email ou téléphone
              </label>
              <div className="relative">
                <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-300 pointer-events-none" />
                <input
                  {...register('identifier')}
                  id="identifier"
                  type="text"
                  autoComplete="email"
                  autoFocus
                  placeholder="admin@ecole.sn"
                  className={cn(
                    'w-full pl-10 pr-3.5 py-2.5 rounded-xl border bg-white text-sm text-zinc-900 outline-none transition-all',
                    'placeholder:text-zinc-300',
                    'focus:ring-2 focus:ring-emerald-500/25 focus:border-emerald-400',
                    errors.identifier
                      ? 'border-red-300 bg-red-50/50 focus:ring-red-500/20 focus:border-red-400'
                      : 'border-zinc-200 hover:border-zinc-300',
                  )}
                />
              </div>
              {errors.identifier && (
                <p className="text-xs text-red-500">{errors.identifier.message}</p>
              )}
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label htmlFor="password" className="block text-xs font-medium text-zinc-500 uppercase tracking-wide">
                  Mot de passe
                </label>
                <Link href="/forgot-password" className="text-xs font-medium text-emerald-600 hover:text-emerald-700 transition-colors">
                  Mot de passe oublié ?
                </Link>
              </div>
              <div className="relative">
                <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-300 pointer-events-none" />
                <input
                  {...register('password')}
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="••••••••"
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
            </div>

            {/* Server error */}
            {serverError && (
              <div role="alert" aria-live="polite" className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-600">
                {serverError}
              </div>
            )}

            {/* Submit */}
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
              {isSubmitting ? 'Connexion…' : 'Se connecter'}
            </button>
          </form>
        </div>

        {/* Feature strip */}
        <div className="mt-4 grid grid-cols-3 gap-3">
          {features.map(({ icon: Icon, label }) => (
            <div key={label} className="flex flex-col items-center gap-1.5 rounded-xl bg-white/60 border border-slate-100 px-3 py-2.5 text-center">
              <div className="w-7 h-7 rounded-lg bg-emerald-50 flex items-center justify-center">
                <Icon size={13} className="text-emerald-600" />
              </div>
              <p className="text-xs font-medium text-zinc-500 leading-tight">{label}</p>
            </div>
          ))}
        </div>

        <p className="mt-3 text-center text-xs text-zinc-400">
          Problème de connexion ? Contactez votre administrateur système.
        </p>
        <p className="mt-1 text-center text-[11px] text-zinc-300">
          © 2026 SchoolManager · Tous droits réservés
        </p>
      </motion.div>
    </div>
  )
}
