'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { CheckCircle2, Eye, EyeOff, Loader2 } from 'lucide-react'
import { resolveApiErrorMessage } from '@/lib/auth/security-errors'

const API = '/api/v1/mobile/parents'

type Step = 'phone' | 'details'

async function postJson<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(body),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    const message = resolveApiErrorMessage(data, 'Une erreur est survenue')
    throw Object.assign(new Error(message), { status: res.status })
  }
  return (data?.data ?? data) as T
}

/** "0033…" → "+33…" ; espaces retirés. Les numéros sans indicatif restent traités comme RDC par le serveur. */
function normalizePhone(raw: string): string {
  const compact = raw.replace(/[s.-]/g, "");
  return compact.startsWith("00") ? `+${compact.slice(2)}` : compact
}

/** Même règle que le serveur (InvitationUtils.isPasswordRobust). */
const PASSWORD_RULE = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{12,}$/
const PASSWORD_HELP =
  '12 caractères minimum avec une minuscule, une majuscule, un chiffre et un symbole parmi @ $ ! % * ? & (autres symboles non acceptés).'

function friendlyError(err: unknown): string {
  const e = err as { status?: number; message?: string }
  if (/NOT_FOUND|ALREADY_ACTIVE|ALREADY_ACTIVATED/.test(e.message ?? '')) {
    return 'Numéro inconnu ou compte déjà actif. Vérifiez le numéro donné à l’école, ou connectez-vous.'
  }
  if (/OTP/i.test(e.message ?? '') && /INVALID|EXPIRED|WRONG/i.test(e.message ?? '')) {
    return 'Code de vérification invalide ou expiré. Demandez un nouveau code.'
  }
  if (/CODE/i.test(e.message ?? '') && /INVALID|EXPIRED|USED/i.test(e.message ?? '')) {
    return 'Code école invalide, expiré ou déjà utilisé. Demandez-en un nouveau à l’école.'
  }
  if (/WEAK_PASSWORD/.test(e.message ?? '')) return PASSWORD_HELP
  if (e.status === 429) return 'Trop de tentatives. Patientez quelques minutes avant de réessayer.'
  if (/INVALID_MOBILE_PHONE|invalide ou non joignable/i.test(e.message ?? '')) {
    return 'Numéro invalide. Saisissez-le avec l’indicatif du pays, par exemple +33 7 78 66 17 66 ou +243 8X XXX XXXX.'
  }
  if (e.status === 403) {
    return e.message && !/forbidden/i.test(e.message) && !/^[A-Z][A-Z0-9_]+$/.test(e.message)
      ? e.message
      : 'Numéro inconnu ou compte déjà actif. Vérifiez le numéro donné à l’école.'
  }
  return e.message && !/^[A-Z][A-Z0-9_]+$/.test(e.message)
    ? e.message
    : 'Une erreur est survenue'
}

/** Premier accès d'un parent : numéro → OTP (WhatsApp/SMS) → code école + mot de passe. */
export default function ActivateParentPage() {
  const router = useRouter()
  const [step, setStep] = useState<Step>('phone')
  const [phone, setPhone] = useState('')
  const [channel, setChannel] = useState<string | null>(null)
  const [otp, setOtp] = useState('')
  const [code, setCode] = useState('')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)

  async function requestOtp(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setBusy(true)
    try {
      const res = await postJson<{ channel?: string }>('/request-activation-otp', { phone: normalizePhone(phone) })
      setChannel(res?.channel ?? null)
      setStep('details')
    } catch (err) {
      setError(friendlyError(err))
    } finally {
      setBusy(false)
    }
  }

  async function activate(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (!PASSWORD_RULE.test(password)) return setError(PASSWORD_HELP)
    if (password !== confirm) return setError('Les mots de passe ne correspondent pas.')
    setBusy(true)
    try {
      await postJson('/activate-access', {
        phone: normalizePhone(phone),
        code: code.trim(),
        otp: otp.trim(),
        password,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
      })
      setDone(true)
      setTimeout(() => router.push('/login?activated=1'), 1800)
    } catch (err) {
      setError(friendlyError(err))
    } finally {
      setBusy(false)
    }
  }

  const field =
    'w-full rounded-xl border border-line bg-canvas px-3 py-2.5 text-base outline-none focus:border-teal-600'
  const submit =
    'inline-flex w-full items-center justify-center gap-2 rounded-xl bg-teal-600 px-4 py-2.5 font-medium text-white disabled:opacity-50'

  return (
    <div className="flex min-h-screen items-center justify-center bg-canvas px-4 py-6">
      <div className="w-full max-w-md">
        <div className="mb-4 flex flex-col items-center text-center">
          <Image src="/logo-icon-transparent.png" alt="SchoolManager" width={96} height={96} className="mb-2 h-24 w-24 object-contain" />
          <h1 className="text-xl font-bold tracking-tight">Activer mon espace parent</h1>
          <p className="mt-1 text-sm text-zinc-500">
            Utilisez le numéro donné à l&apos;école et le code remis par l&apos;établissement.
          </p>
        </div>

        <div className="rounded-3xl border border-line bg-surface p-6 shadow-xl ring-1 ring-line">
          {done ? (
            <div role="status" className="flex flex-col items-center gap-2 py-4 text-center">
              <CheckCircle2 className="h-10 w-10 text-emerald-600" />
              <p className="font-medium">Compte activé</p>
              <p className="text-sm text-zinc-500">Redirection vers la connexion…</p>
            </div>
          ) : step === 'phone' ? (
            <form onSubmit={requestOtp} className="space-y-4" noValidate>
              <div>
                <label htmlFor="phone" className="mb-1 block text-sm font-medium">
                  Numéro de téléphone
                </label>
                <input
                  id="phone"
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+243 8X XXX XXXX"
                  className={field}
                />
                <p className="mt-1 text-xs text-zinc-500">Format international avec l’indicatif : +243… (RDC), +33… (France). Un code de vérification vous sera envoyé par WhatsApp ou SMS.</p>
              </div>
              {error && (
                <p role="alert" className="text-sm text-red-600">
                  {error}
                </p>
              )}
              <button type="submit" disabled={busy || phone.replace(/\D/g, '').length < 6} className={submit}>
                {busy && <Loader2 className="h-4 w-4 animate-spin" />} Recevoir le code
              </button>
            </form>
          ) : (
            <form onSubmit={activate} className="space-y-4" noValidate>
              <p role="status" className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200">
                Code envoyé {channel === 'whatsapp' ? 'par WhatsApp' : 'par SMS'} au {phone}.{' '}
                <button type="button" onClick={() => setStep('phone')} className="font-medium underline underline-offset-2">
                  Modifier
                </button>
              </p>
              <div>
                <label htmlFor="otp" className="mb-1 block text-sm font-medium">
                  Code de vérification (6 chiffres)
                </label>
                <input
                  id="otp"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={6}
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                  className={`${field} tracking-[0.4em]`}
                />
              </div>
              <div>
                <label htmlFor="code" className="mb-1 block text-sm font-medium">
                  Code école (élève)
                </label>
                <input
                  id="code"
                  autoCapitalize="characters"
                  autoComplete="off"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  className={`${field} tracking-widest`}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="firstName" className="mb-1 block text-sm font-medium">
                    Prénom
                  </label>
                  <input id="firstName" autoComplete="given-name" value={firstName} onChange={(e) => setFirstName(e.target.value)} className={field} />
                </div>
                <div>
                  <label htmlFor="lastName" className="mb-1 block text-sm font-medium">
                    Nom
                  </label>
                  <input id="lastName" autoComplete="family-name" value={lastName} onChange={(e) => setLastName(e.target.value)} className={field} />
                </div>
              </div>
              <div>
                <label htmlFor="password" className="mb-1 block text-sm font-medium">
                  Mot de passe
                </label>
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className={`${field} pr-10`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <div>
                <label htmlFor="confirm" className="mb-1 block text-sm font-medium">
                  Confirmer le mot de passe
                </label>
                <input id="confirm" type={showPassword ? 'text' : 'password'} autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} className={field} />
              </div>
              {error && (
                <p role="alert" className="text-sm text-red-600">
                  {error}
                </p>
              )}
              <button
                type="submit"
                disabled={busy || otp.length !== 6 || code.trim().length < 4 || firstName.trim().length < 2 || lastName.trim().length < 2 || !password}
                className={submit}
              >
                {busy && <Loader2 className="h-4 w-4 animate-spin" />} Activer mon compte
              </button>
            </form>
          )}
        </div>

        <p className="mt-4 text-center text-sm text-zinc-500">
          Déjà un compte ?{' '}
          <Link href="/login" className="font-medium text-teal-700 underline underline-offset-2">
            Se connecter
          </Link>
        </p>
      </div>
    </div>
  )
}
