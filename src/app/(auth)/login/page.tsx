'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Eye, EyeOff, Loader2, ShieldCheck } from 'lucide-react'
import { useAuth } from '@/providers/auth-provider'
import { getApiErrorMessage } from '@/lib/api/client'
import { cn } from '@/lib/utils'

const loginSchema = z.object({
  identifier: z.string().min(3, 'Email ou téléphone requis'),
  password: z.string().min(6, 'Minimum 6 caractères'),
})

type LoginForm = z.infer<typeof loginSchema>

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
    <div className="w-full max-w-md px-4">
      <div className="bg-white rounded-2xl shadow-2xl shadow-black/20 p-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-indigo-600 mb-4">
            <ShieldCheck size={22} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900">PresenceCollab</h1>
          <p className="text-sm text-slate-500 mt-1">Tableau de bord administrateur</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
          {/* Identifier */}
          <div className="space-y-1.5">
            <label htmlFor="identifier" className="block text-sm font-medium text-slate-700">
              Email ou téléphone
            </label>
            <input
              {...register('identifier')}
              id="identifier"
              type="text"
              autoComplete="email"
              placeholder="admin@ecole.sn"
              className={cn(
                'w-full px-3.5 py-2.5 rounded-lg border text-sm outline-none transition-shadow',
                'placeholder:text-slate-400',
                'focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500',
                errors.identifier
                  ? 'border-red-400 bg-red-50 focus:ring-red-500/20 focus:border-red-500'
                  : 'border-slate-300',
              )}
            />
            {errors.identifier && (
              <p className="text-xs text-red-500">{errors.identifier.message}</p>
            )}
          </div>

          {/* Password */}
          <div className="space-y-1.5">
            <label htmlFor="password" className="block text-sm font-medium text-slate-700">
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
                  'w-full px-3.5 py-2.5 pr-10 rounded-lg border text-sm outline-none transition-shadow',
                  'placeholder:text-slate-400',
                  'focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500',
                  errors.password
                    ? 'border-red-400 bg-red-50 focus:ring-red-500/20 focus:border-red-500'
                    : 'border-slate-300',
                )}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
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
            <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-600">
              {serverError}
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={isSubmitting}
            className={cn(
              'w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg',
              'bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400',
              'text-white text-sm font-medium transition-colors',
              'focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2',
            )}
          >
            {isSubmitting && <Loader2 size={15} className="animate-spin" />}
            {isSubmitting ? 'Connexion en cours...' : 'Se connecter'}
          </button>
        </form>
      </div>
    </div>
  )
}
