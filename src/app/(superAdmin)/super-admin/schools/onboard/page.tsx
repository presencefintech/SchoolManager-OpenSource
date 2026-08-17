'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import axios from 'axios'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  Check,
  CheckCircle2,
  Loader2,
  Mail,
  ShieldCheck,
  UserPlus,
} from 'lucide-react'
import { WhatsAppInviteAssist } from '@/components/super-admin/whatsapp-invite-assist'
import { useOnboardSchool } from '@/lib/hooks/use-super-admin'
import { getApiErrorMessage } from '@/lib/api/client'
import { PhoneInput } from '@/components/ui/phone-input'
import { formatPhoneToE164, isValidInternationalPhone } from '@/lib/phone/validation'
import { useToast } from '@/providers/toast-provider'
import { cn } from '@/lib/utils'

const STEPS = [
  { id: 1, label: 'Établissement', icon: Building2 },
  { id: 2, label: 'Admin principal', icon: UserPlus },
  { id: 3, label: 'Confirmation', icon: ShieldCheck },
] as const

type SchoolForm = {
  name: string
  email: string
  phone: string
  city: string
  address: string
  baseCurrency: 'USD' | 'CDF'
}

type AdminForm = {
  firstName: string
  lastName: string
  email: string
  phone: string
}

const emptySchool: SchoolForm = {
  name: '',
  email: '',
  phone: '',
  city: '',
  address: '',
  baseCurrency: 'USD',
}

const emptyAdmin: AdminForm = {
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
}

function Field({
  label,
  required,
  children,
  hint,
}: {
  label: string
  required?: boolean
  children: React.ReactNode
  hint?: string
}) {
  return (
    <label className="block space-y-1.5">
      <span className="text-xs font-medium text-zinc-600">
        {label}
        {required ? <span className="text-rose-500"> *</span> : null}
      </span>
      {children}
      {hint ? <span className="block text-[11px] text-zinc-400">{hint}</span> : null}
    </label>
  )
}

const inputClass =
  'w-full rounded-xl border border-zinc-200 bg-white px-3.5 py-2.5 text-sm text-zinc-900 outline-none transition focus:border-zinc-400 focus:ring-2 focus:ring-zinc-900/5'

export default function SchoolOnboardPage() {
  const router = useRouter()
  const toast = useToast()
  const onboard = useOnboardSchool()

  const [step, setStep] = useState(1)
  const [school, setSchool] = useState<SchoolForm>(emptySchool)
  const [admin, setAdmin] = useState<AdminForm>(emptyAdmin)
  const [note, setNote] = useState('')
  const [confirmInvite, setConfirmInvite] = useState(false)
  const [done, setDone] = useState<{
    schoolId: number
    schoolName: string
    adminEmail: string
    message: string
    emailSent?: boolean
    smsSent?: boolean
    whatsappDeepLink?: string | null
    whatsappError?: string | null
  } | null>(null)

  const step1Valid = school.name.trim().length >= 2
  const step2Valid =
    admin.firstName.trim().length >= 2 &&
    admin.lastName.trim().length >= 2 &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(admin.email.trim()) &&
    isValidInternationalPhone(admin.phone)

  const canSubmit = step1Valid && step2Valid && confirmInvite && !onboard.isPending

  const summary = useMemo(
    () => ({
      schoolName: school.name.trim() || '—',
      schoolCity: school.city.trim() || '—',
      adminName: `${admin.firstName.trim()} ${admin.lastName.trim()}`.trim() || '—',
      adminEmail: admin.email.trim().toLowerCase() || '—',
    }),
    [school, admin],
  )

  function goNext() {
    if (step === 1 && !step1Valid) {
      toast.error('Indiquez au moins le nom de l’établissement')
      return
    }
    if (step === 2 && !step2Valid) {
      toast.error('Complétez l’identité admin (email + mobile valide)')
      return
    }
    setStep((s) => Math.min(3, s + 1))
  }

  async function submit() {
    if (!canSubmit) return
    try {
      const result = await onboard.mutateAsync({
        school: {
          name: school.name.trim(),
          email: school.email.trim() || null,
          phone: (() => {
            const p = school.phone.trim()
            if (!p) return null
            const e164 = formatPhoneToE164(p)
            return e164.length >= 6 ? e164 : null
          })(),
          city: school.city.trim() || null,
          address: school.address.trim() || null,
          baseCurrency: school.baseCurrency,
        },
        admin: {
          email: admin.email.trim().toLowerCase(),
          phone: formatPhoneToE164(admin.phone),
          firstName: admin.firstName.trim(),
          lastName: admin.lastName.trim(),
        },
        confirmInvite: true,
        note: note.trim() || null,
      })
      setDone({
        schoolId: result.school.id,
        schoolName: result.school.name,
        adminEmail: result.invitation.admin.email,
        message: result.message || result.invitation.message,
        emailSent: result.invitation.emailSent,
        smsSent: result.invitation.smsSent,
        whatsappDeepLink: result.invitation.whatsappDeepLink,
        whatsappError: result.invitation.whatsappError,
      })
      toast.success(
        'École créée',
        result.invitation.whatsappDeepLink
          ? 'Ouvrez WhatsApp pour envoyer l’OTP'
          : 'Invitation admin envoyée',
      )
    } catch (e) {
      const msg = getApiErrorMessage(e)
      toast.error(msg)
      if (axios.isAxiosError(e)) {
        const data = e.response?.data as {
          code?: string
          errors?: { code?: string; details?: { schoolId?: number } }
        } | undefined
        const code = data?.code ?? data?.errors?.code
        const schoolId = data?.errors?.details?.schoolId
        if (code === 'SCHOOL_CREATED_INVITE_FAILED' && schoolId) {
          router.push(`/super-admin/schools/${schoolId}`)
        }
      }
    }
  }

  if (done) {
    return (
      <div className="min-h-screen bg-zinc-50">
        <div className="mx-auto max-w-xl px-4 py-16 sm:px-6">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-3xl border border-zinc-200 bg-white p-8 shadow-sm text-center"
          >
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
              <CheckCircle2 size={28} />
            </div>
            <h1 className="text-xl font-semibold text-zinc-900">École prête</h1>
            <p className="mt-2 text-sm text-zinc-500">
              <span className="font-medium text-zinc-800">{done.schoolName}</span> a été créée.
              L’admin <span className="font-medium text-zinc-800">{done.adminEmail}</span> doit
              activer son compte via le lien email + OTP (WhatsApp ou SMS plus tard).
            </p>
            <p className="mt-3 text-xs text-zinc-400">{done.message}</p>
            <div className="mt-3 flex justify-center gap-3 text-[11px] text-zinc-500">
              <span>Email {done.emailSent ? 'envoyé' : 'à vérifier'}</span>
              <span>·</span>
              <span>SMS {done.smsSent ? 'envoyé' : 'via WhatsApp'}</span>
            </div>
            {(done.whatsappDeepLink || done.whatsappError) ? (
              <WhatsAppInviteAssist
                className="mt-5 text-left"
                link={done.whatsappDeepLink}
                error={done.whatsappError}
              />
            ) : null}
            <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:justify-center">
              <Link
                href={`/super-admin/schools/${done.schoolId}`}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-zinc-800"
              >
                Ouvrir le desk support
              </Link>
              <Link
                href="/super-admin/schools"
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
              >
                Liste des écoles
              </Link>
            </div>
          </motion.div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-zinc-50">
      <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6 sm:py-10">
        <div className="mb-8">
          <button
            type="button"
            onClick={() => router.push('/super-admin/schools')}
            className="mb-4 inline-flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-800"
          >
            <ArrowLeft size={14} />
            Établissements
          </button>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">
            Nouvelle école
          </h1>
          <p className="mt-1 text-sm text-zinc-500">
            Création de l’établissement puis invitation officielle (email + lien WhatsApp direct
            pour l’OTP — sans SMS payant pour l’instant).
          </p>
        </div>

        {/* Steps */}
        <ol className="mb-8 flex items-center gap-2">
          {STEPS.map((s, i) => {
            const Icon = s.icon
            const active = step === s.id
            const doneStep = step > s.id
            return (
              <li key={s.id} className="flex flex-1 items-center gap-2">
                <div
                  className={cn(
                    'flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-xs font-semibold transition',
                    doneStep && 'bg-emerald-600 text-white',
                    active && 'bg-zinc-900 text-white',
                    !active && !doneStep && 'bg-zinc-200 text-zinc-500',
                  )}
                >
                  {doneStep ? <Check size={14} /> : <Icon size={14} />}
                </div>
                <span
                  className={cn(
                    'hidden text-xs font-medium sm:block',
                    active ? 'text-zinc-900' : 'text-zinc-400',
                  )}
                >
                  {s.label}
                </span>
                {i < STEPS.length - 1 ? (
                  <div className="mx-1 hidden h-px flex-1 bg-zinc-200 sm:block" />
                ) : null}
              </li>
            )
          })}
        </ol>

        <div className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm sm:p-8">
          <AnimatePresence mode="wait">
            {step === 1 ? (
              <motion.div
                key="s1"
                initial={{ opacity: 0, x: 8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -8 }}
                className="space-y-4"
              >
                <div className="mb-2 flex items-center gap-2 text-sm font-medium text-zinc-800">
                  <Building2 size={16} />
                  Identité de l’établissement
                </div>
                <Field label="Nom officiel" required>
                  <input
                    className={inputClass}
                    value={school.name}
                    onChange={(e) => setSchool((s) => ({ ...s, name: e.target.value }))}
                    placeholder="Complexe Scolaire…"
                    autoFocus
                  />
                </Field>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Email établissement">
                    <input
                      type="email"
                      className={inputClass}
                      value={school.email}
                      onChange={(e) => setSchool((s) => ({ ...s, email: e.target.value }))}
                      placeholder="contact@ecole.cd"
                    />
                  </Field>
                  <Field label="Téléphone établissement">
                    <PhoneInput
                      value={school.phone}
                      onChange={(v) => setSchool((s) => ({ ...s, phone: v || '' }))}
                      showError={false}
                    />
                  </Field>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Ville">
                    <input
                      className={inputClass}
                      value={school.city}
                      onChange={(e) => setSchool((s) => ({ ...s, city: e.target.value }))}
                      placeholder="Kinshasa"
                    />
                  </Field>
                  <Field label="Devise de base">
                    <select
                      className={inputClass}
                      value={school.baseCurrency}
                      onChange={(e) =>
                        setSchool((s) => ({
                          ...s,
                          baseCurrency: e.target.value as 'USD' | 'CDF',
                        }))
                      }
                    >
                      <option value="USD">USD</option>
                      <option value="CDF">CDF</option>
                    </select>
                  </Field>
                </div>
                <Field label="Adresse">
                  <input
                    className={inputClass}
                    value={school.address}
                    onChange={(e) => setSchool((s) => ({ ...s, address: e.target.value }))}
                    placeholder="Avenue…"
                  />
                </Field>
              </motion.div>
            ) : null}

            {step === 2 ? (
              <motion.div
                key="s2"
                initial={{ opacity: 0, x: 8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -8 }}
                className="space-y-4"
              >
                <div className="mb-2 flex items-center gap-2 text-sm font-medium text-zinc-800">
                  <UserPlus size={16} />
                  Admin principal à inviter
                </div>
                <div className="rounded-xl border border-emerald-100 bg-emerald-50/60 px-3.5 py-3 text-xs text-emerald-900">
                  L’admin choisit son mot de passe à l’activation. OTP transmis par email et/ou
                  lien WhatsApp direct (pas de SMS Brevo/Twilio pour l’instant).
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Prénom" required>
                    <input
                      className={inputClass}
                      value={admin.firstName}
                      onChange={(e) => setAdmin((a) => ({ ...a, firstName: e.target.value }))}
                      autoFocus
                    />
                  </Field>
                  <Field label="Nom" required>
                    <input
                      className={inputClass}
                      value={admin.lastName}
                      onChange={(e) => setAdmin((a) => ({ ...a, lastName: e.target.value }))}
                    />
                  </Field>
                </div>
                <Field label="Email professionnel" required hint="Unique sur la plateforme">
                  <input
                    type="email"
                    className={inputClass}
                    value={admin.email}
                    onChange={(e) => setAdmin((a) => ({ ...a, email: e.target.value }))}
                    placeholder="admin@ecole.cd"
                  />
                </Field>
                <Field
                  label="Mobile (SMS OTP)"
                  required
                  hint="Numéro joignable pour l’OTP d’activation"
                >
                  <PhoneInput
                    value={admin.phone}
                    onChange={(v) => setAdmin((a) => ({ ...a, phone: v || '' }))}
                  />
                </Field>
              </motion.div>
            ) : null}

            {step === 3 ? (
              <motion.div
                key="s3"
                initial={{ opacity: 0, x: 8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -8 }}
                className="space-y-5"
              >
                <div className="mb-2 flex items-center gap-2 text-sm font-medium text-zinc-800">
                  <ShieldCheck size={16} />
                  Vérification avant envoi
                </div>
                <dl className="rounded-2xl border border-zinc-100 bg-zinc-50/80 divide-y divide-zinc-100 text-sm">
                  <div className="flex justify-between gap-4 px-4 py-3">
                    <dt className="text-zinc-500">École</dt>
                    <dd className="font-medium text-zinc-900 text-right">{summary.schoolName}</dd>
                  </div>
                  <div className="flex justify-between gap-4 px-4 py-3">
                    <dt className="text-zinc-500">Ville</dt>
                    <dd className="text-zinc-800 text-right">{summary.schoolCity}</dd>
                  </div>
                  <div className="flex justify-between gap-4 px-4 py-3">
                    <dt className="text-zinc-500">Admin</dt>
                    <dd className="font-medium text-zinc-900 text-right">{summary.adminName}</dd>
                  </div>
                  <div className="flex justify-between gap-4 px-4 py-3">
                    <dt className="text-zinc-500 flex items-center gap-1">
                      <Mail size={12} /> Invitation
                    </dt>
                    <dd className="text-zinc-800 text-right">{summary.adminEmail}</dd>
                  </div>
                </dl>
                <Field label="Note interne (optionnel)">
                  <textarea
                    className={cn(inputClass, 'min-h-[72px] resize-y')}
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="Contexte commercial, contact promoteur…"
                    maxLength={500}
                  />
                </Field>
                <label className="flex items-start gap-3 rounded-xl border border-zinc-200 bg-white px-4 py-3 cursor-pointer">
                  <input
                    type="checkbox"
                    className="mt-0.5 h-4 w-4 rounded border-zinc-300"
                    checked={confirmInvite}
                    onChange={(e) => setConfirmInvite(e.target.checked)}
                  />
                  <span className="text-sm text-zinc-700">
                    Je confirme : créer l’école et <strong>inviter</strong> cet admin
                    (email d’activation + OTP SMS). Aucun mot de passe ne sera inventé.
                  </span>
                </label>
              </motion.div>
            ) : null}
          </AnimatePresence>

          <div className="mt-8 flex items-center justify-between gap-3 border-t border-zinc-100 pt-5">
            <button
              type="button"
              disabled={step === 1 || onboard.isPending}
              onClick={() => setStep((s) => Math.max(1, s - 1))}
              className="inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm text-zinc-600 hover:bg-zinc-50 disabled:opacity-40"
            >
              <ArrowLeft size={14} />
              Retour
            </button>
            {step < 3 ? (
              <button
                type="button"
                onClick={goNext}
                className="inline-flex items-center gap-1.5 rounded-xl bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-zinc-800"
              >
                Continuer
                <ArrowRight size={14} />
              </button>
            ) : (
              <button
                type="button"
                disabled={!canSubmit}
                onClick={() => void submit()}
                className="inline-flex items-center gap-2 rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-medium text-white hover:bg-emerald-800 disabled:opacity-50"
              >
                {onboard.isPending ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <UserPlus size={14} />
                )}
                Créer & inviter
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
