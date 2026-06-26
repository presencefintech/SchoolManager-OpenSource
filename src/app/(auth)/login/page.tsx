'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  Eye, EyeOff, Loader2,
  GraduationCap, ScanLine, BarChart3, ShieldCheck,
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
  {
    icon: ScanLine,
    title: 'Présence biométrique',
    desc: 'Pointage en temps réel via empreinte ou code QR',
  },
  {
    icon: GraduationCap,
    title: 'Suivi des élèves',
    desc: 'Fiches 360°, historique académique et financier',
  },
  {
    icon: BarChart3,
    title: 'Reporting avancé',
    desc: 'Tableaux de bord, exports et alertes automatiques',
  },
]

export default function LoginPage() {
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
    <div className="min-h-screen flex">

      {/* ── Left brand panel ── */}
      <div className="hidden lg:flex lg:w-[52%] relative flex-col justify-between p-12 bg-[#0f1623] overflow-hidden">

        {/* Background grid */}
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage: `linear-gradient(rgba(255,255,255,0.6) 1px, transparent 1px),
              linear-gradient(90deg, rgba(255,255,255,0.6) 1px, transparent 1px)`,
            backgroundSize: '40px 40px',
          }}
        />

        {/* Glow blobs */}
        <div className="absolute top-[-120px] left-[-80px] w-[420px] h-[420px] rounded-full bg-indigo-600/20 blur-[120px]" />
        <div className="absolute bottom-[-80px] right-[-60px] w-[320px] h-[320px] rounded-full bg-violet-500/15 blur-[100px]" />

        {/* Logo */}
        <div className="relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-500 flex items-center justify-center shadow-lg shadow-indigo-500/30">
              <ShieldCheck size={18} className="text-white" />
            </div>
            <span className="text-white font-semibold text-lg tracking-tight">presenceFintech</span>
          </div>
        </div>

        {/* Center headline */}
        <div className="relative z-10 space-y-8">
          <div>
            <h2 className="text-4xl font-bold text-white leading-tight tracking-tight">
              Gérez votre école
              <br />
              <span className="text-indigo-400">intelligemment.</span>
            </h2>
            <p className="mt-4 text-sm text-zinc-400 leading-relaxed max-w-xs">
              Plateforme tout-en-un pour la gestion des présences,
              des élèves et des finances scolaires.
            </p>
          </div>

          <div className="space-y-4">
            {features.map(({ icon: Icon, title, desc }) => (
              <div key={title} className="flex items-start gap-3.5">
                <div className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Icon size={14} className="text-indigo-400" />
                </div>
                <div>
                  <p className="text-sm font-medium text-white/90">{title}</p>
                  <p className="text-xs text-zinc-500 mt-0.5 leading-relaxed">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="relative z-10">
          <p className="text-xs text-zinc-600">© 2026 presenceFintech · Tous droits réservés</p>
        </div>
      </div>

      {/* ── Right form panel ── */}
      <div className="flex-1 flex items-center justify-center bg-zinc-50 px-6 py-12">
        <motion.div
          className="w-full max-w-sm"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
        >
          {/* Mobile logo */}
          <div className="flex items-center gap-2.5 mb-8 lg:hidden">
            <div className="w-8 h-8 rounded-xl bg-indigo-600 flex items-center justify-center">
              <ShieldCheck size={16} className="text-white" />
            </div>
            <span className="font-semibold text-zinc-900">presenceFintech</span>
          </div>

          <div className="mb-8">
            <h1 className="text-2xl font-bold text-zinc-900 tracking-tight">Connexion</h1>
            <p className="text-sm text-zinc-400 mt-1.5">Accédez à votre espace administrateur</p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>

            {/* Identifier */}
            <div className="space-y-1.5">
              <label htmlFor="identifier" className="block text-xs font-medium text-zinc-500 uppercase tracking-wide">
                Email ou téléphone
              </label>
              <input
                {...register('identifier')}
                id="identifier"
                type="text"
                autoComplete="email"
                placeholder="admin@ecole.sn"
                className={cn(
                  'w-full px-3.5 py-2.5 rounded-xl border bg-white text-sm text-zinc-900 outline-none transition-all',
                  'placeholder:text-zinc-300',
                  'focus:ring-2 focus:ring-indigo-500/25 focus:border-indigo-400',
                  errors.identifier
                    ? 'border-red-300 bg-red-50/50 focus:ring-red-500/20 focus:border-red-400'
                    : 'border-zinc-200 hover:border-zinc-300',
                )}
              />
              {errors.identifier && (
                <p className="text-xs text-red-500">{errors.identifier.message}</p>
              )}
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <label htmlFor="password" className="block text-xs font-medium text-zinc-500 uppercase tracking-wide">
                Mot de passe
              </label>
              <div className="relative">
                <input
                  {...register('password')}
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="••••••••"
                  className={cn(
                    'w-full px-3.5 py-2.5 pr-11 rounded-xl border bg-white text-sm text-zinc-900 outline-none transition-all',
                    'placeholder:text-zinc-300',
                    'focus:ring-2 focus:ring-indigo-500/25 focus:border-indigo-400',
                    errors.password
                      ? 'border-red-300 bg-red-50/50 focus:ring-red-500/20 focus:border-red-400'
                      : 'border-zinc-200 hover:border-zinc-300',
                  )}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-300 hover:text-zinc-500 transition-colors"
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
              <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-600">
                {serverError}
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={isSubmitting}
              className={cn(
                'w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl mt-2',
                'bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800',
                'disabled:opacity-60 disabled:cursor-not-allowed',
                'text-white text-sm font-medium transition-colors',
                'focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2',
                'shadow-sm shadow-indigo-600/20',
              )}
            >
              {isSubmitting && <Loader2 size={15} className="animate-spin" />}
              {isSubmitting ? 'Connexion…' : 'Se connecter'}
            </button>
          </form>

          <p className="mt-8 text-center text-xs text-zinc-400">
            Problème de connexion ? Contactez votre administrateur système.
          </p>
        </motion.div>
      </div>

    </div>
  )
}
