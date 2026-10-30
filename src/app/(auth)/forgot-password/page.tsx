'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { motion } from 'framer-motion'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { ArrowLeft, Loader2, Mail, CheckCircle2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { resolveApiErrorMessage } from '@/lib/auth/security-errors'

const forgotSchema = z.object({
  email: z.string().email('Adresse email invalide'),
})

type ForgotForm = z.infer<typeof forgotSchema>

export default function ForgotPasswordPage() {
  const [serverError, setServerError] = useState('')
  const [sent, setSent] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotForm>({ resolver: zodResolver(forgotSchema) })

  async function onSubmit(values: ForgotForm) {
    setServerError('')
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(resolveApiErrorMessage(data, 'Erreur lors de la demande.'))
      }
      setSent(true)
    } catch (err) {
      setServerError(err instanceof Error ? err.message : 'Erreur lors de la demande.')
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
          <Link
            href="/login"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-zinc-400 hover:text-zinc-600 transition-colors mb-6"
          >
            <ArrowLeft size={13} />
            Retour à la connexion
          </Link>

          {sent ? (
            <div className="text-center py-4">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 size={22} className="text-emerald-600" />
              </div>
              <h2 className="text-lg font-semibold text-zinc-900">Vérifiez votre boîte mail</h2>
              <p className="text-sm text-zinc-500 mt-2 leading-relaxed">
                Si un compte existe avec cette adresse, un lien de réinitialisation vient de vous être envoyé.
              </p>
              <Link
                href="/login"
                className="inline-flex mt-6 items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium transition-colors"
              >
                Retour à la connexion
              </Link>
            </div>
          ) : (
            <>
              <div className="mb-6">
                <h2 className="text-lg font-semibold text-zinc-900">Mot de passe oublié</h2>
                <p className="text-sm text-zinc-400 mt-1">
                  Indiquez votre email, nous vous enverrons un lien de réinitialisation.
                </p>
              </div>

              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
                <div className="space-y-1.5">
                  <label htmlFor="email" className="block text-xs font-medium text-zinc-500 uppercase tracking-wide">
                    Email
                  </label>
                  <div className="relative">
                    <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-300 pointer-events-none" />
                    <input
                      {...register('email')}
                      id="email"
                      type="email"
                      autoComplete="email"
                      autoFocus
                      placeholder="admin@ecole.sn"
                      className={cn(
                        'w-full pl-10 pr-3.5 py-2.5 rounded-xl border bg-white text-sm text-zinc-900 outline-none transition-all',
                        'placeholder:text-zinc-300',
                        'focus:ring-2 focus:ring-emerald-500/25 focus:border-emerald-400',
                        errors.email
                          ? 'border-red-300 bg-red-50/50 focus:ring-red-500/20 focus:border-red-400'
                          : 'border-zinc-200 hover:border-zinc-300',
                      )}
                    />
                  </div>
                  {errors.email && (
                    <p className="text-xs text-red-500">{errors.email.message}</p>
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
                  {isSubmitting ? 'Envoi…' : 'Envoyer le lien'}
                </button>
              </form>
            </>
          )}
        </div>
      </motion.div>
    </div>
  )
}
