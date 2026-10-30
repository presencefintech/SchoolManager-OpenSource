'use client'

import { Suspense, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter, useSearchParams } from 'next/navigation'
import { motion } from 'framer-motion'
import { AlertTriangle, CheckCircle2, Loader2, MailCheck } from 'lucide-react'
import { resolveApiErrorMessage } from '@/lib/auth/security-errors'

type VerifyState = 'idle' | 'loading' | 'success' | 'error'

function VerifyEmailContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get('token') ?? ''
  const started = useRef(false)

  const [state, setState] = useState<VerifyState>(token ? 'idle' : 'error')
  const [message, setMessage] = useState(
    token ? '' : 'Ce lien de vérification est incomplet.',
  )

  useEffect(() => {
    if (!token || started.current) return
    started.current = true

    async function verify() {
      setState('loading')
      try {
        const res = await fetch('/api/auth/verify-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token }),
        })
        const data = await res.json().catch(() => ({}))
        if (!res.ok) {
          throw new Error(resolveApiErrorMessage(data, 'Ce lien est invalide ou a expiré.'))
        }
        setState('success')
        setTimeout(() => router.push('/login'), 3000)
      } catch (err) {
        setState('error')
        setMessage(err instanceof Error ? err.message : 'Ce lien est invalide ou a expiré.')
      }
    }

    void verify()
  }, [token, router])

  return (
    <div className="relative min-h-screen flex items-center justify-center px-4 py-12 bg-[#f4f6fa] overflow-hidden">
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-32 right-[-10%] h-[420px] w-[420px] rounded-full bg-emerald-200/40 blur-3xl" />
        <div className="absolute top-[30%] -left-24 h-[360px] w-[360px] rounded-full bg-teal-200/30 blur-3xl" />
      </div>

      <motion.div
        className="relative w-full max-w-xl"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      >
        <div className="flex flex-col items-center text-center mb-8">
          <div className="w-14 h-14 mb-4">
            <Image src="/logo-icon-transparent.png" alt="SchoolManager" width={56} height={56} className="h-full w-full object-contain" />
          </div>
          <h1 className="text-xl font-bold text-zinc-900 tracking-tight">SchoolManager</h1>
        </div>

        <div className="rounded-3xl border border-slate-200/90 bg-white/90 backdrop-blur-sm shadow-xl shadow-slate-200/60 ring-1 ring-slate-100 p-10 text-center">
          {(state === 'idle' || state === 'loading') && (
            <>
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 flex items-center justify-center mx-auto mb-4">
                <Loader2 size={22} className="text-emerald-600 animate-spin" />
              </div>
              <h2 className="text-lg font-semibold text-zinc-900">Vérification en cours</h2>
              <p className="text-sm text-zinc-500 mt-2">Confirmation de votre adresse email…</p>
            </>
          )}

          {state === 'success' && (
            <>
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 size={22} className="text-emerald-600" />
              </div>
              <h2 className="text-lg font-semibold text-zinc-900">Email confirmé</h2>
              <p className="text-sm text-zinc-500 mt-2 leading-relaxed">
                Vous pouvez maintenant effectuer des opérations financières. Redirection vers la connexion…
              </p>
            </>
          )}

          {state === 'error' && (
            <>
              <div className="w-12 h-12 rounded-2xl bg-amber-50 flex items-center justify-center mx-auto mb-4">
                {token ? (
                  <AlertTriangle size={22} className="text-amber-600" />
                ) : (
                  <MailCheck size={22} className="text-amber-600" />
                )}
              </div>
              <h2 className="text-lg font-semibold text-zinc-900">
                {token ? 'Vérification impossible' : 'Lien invalide'}
              </h2>
              <p className="text-sm text-zinc-500 mt-2 leading-relaxed">{message}</p>
              <Link
                href="/login"
                className="inline-flex mt-6 items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium transition-colors"
              >
                Retour à la connexion
              </Link>
            </>
          )}
        </div>
      </motion.div>
    </div>
  )
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={null}>
      <VerifyEmailContent />
    </Suspense>
  )
}
