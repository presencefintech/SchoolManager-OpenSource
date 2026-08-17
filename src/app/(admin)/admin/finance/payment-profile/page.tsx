'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Building2, CheckCircle2, Circle, Loader2, Save, ShieldCheck, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { usePaymentOnboarding, usePaymentProfile, useUpsertPaymentProfile } from '@/lib/hooks/use-admin'
import { getApiErrorMessage } from '@/lib/api/client'
import { KycStatusBadge } from '@/components/admin/students/student-finance-badges'
import type { OnboardingStepStatus, PaymentProfile, UpsertPaymentProfilePayload } from '@/types/admin'

const PROVIDERS = ['FLUTTERWAVE', 'RAWBANK', 'UBA'] as const

function profileToForm(p: PaymentProfile): UpsertPaymentProfilePayload {
  return {
    legalName: p.legalName ?? '',
    contactEmail: p.contactEmail ?? '',
    contactPhone: p.contactPhone ?? '',
    settlementBankCode: p.settlementBankCode ?? '',
    settlementAccountNumber: '',
    settlementAccountName: p.settlementAccountName ?? '',
    mobileMoneyBusinessId: p.mobileMoneyBusinessId ?? '',
    provider: p.provider,
  }
}

function StepIcon({ status }: { status: OnboardingStepStatus }) {
  if (status === 'DONE') return <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
  if (status === 'BLOCKED') return <AlertCircle size={16} className="text-amber-600 shrink-0" />
  return <Circle size={16} className="text-zinc-300 shrink-0" />
}

export default function PaymentProfilePage() {
  const { data: profile, isLoading: profileLoading } = usePaymentProfile()
  const { data: onboarding, isLoading: onboardingLoading, refetch: refetchOnboarding } =
    usePaymentOnboarding()
  const { mutateAsync: save, isPending } = useUpsertPaymentProfile()
  const [form, setForm] = useState<UpsertPaymentProfilePayload>({
    legalName: '',
    settlementBankCode: '',
    settlementAccountNumber: '',
    settlementAccountName: '',
    provider: 'FLUTTERWAVE',
  })
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const displayProfile = onboarding?.profile ?? profile

  useEffect(() => {
    if (displayProfile) setForm(profileToForm(displayProfile))
  }, [displayProfile])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSuccess(false)
    if (!form.settlementAccountNumber.trim() && displayProfile?.kycStatus === 'NOT_CONFIGURED') {
      setError('Saisissez le numéro de compte de règlement (requis à chaque enregistrement).')
      return
    }
    if (!form.settlementAccountNumber.trim()) {
      setError('Saisissez le numéro de compte de règlement (requis à chaque enregistrement).')
      return
    }
    const payload: UpsertPaymentProfilePayload = {
      legalName: form.legalName,
      settlementBankCode: form.settlementBankCode,
      settlementAccountNumber: form.settlementAccountNumber,
      settlementAccountName: form.settlementAccountName,
      provider: form.provider,
      ...(form.contactEmail?.trim() ? { contactEmail: form.contactEmail.trim() } : {}),
      ...(form.contactPhone?.trim() ? { contactPhone: form.contactPhone.trim() } : {}),
      ...(form.mobileMoneyBusinessId?.trim()
        ? { mobileMoneyBusinessId: form.mobileMoneyBusinessId.trim() }
        : {}),
    }
    try {
      await save(payload)
      setSuccess(true)
      setForm((f) => ({ ...f, settlementAccountNumber: '' }))
      await refetchOnboarding()
    } catch (err) {
      setError(getApiErrorMessage(err))
    }
  }

  const isLoading = profileLoading || onboardingLoading

  return (
    <div className="space-y-6 max-w-3xl">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
        <h1 className="text-2xl font-bold text-zinc-900">Paiements en ligne</h1>
        <p className="text-sm text-zinc-500 mt-0.5">
          Activez les paiements parents pour votre établissement
        </p>
      </motion.div>

      {isLoading ? (
        <div className="h-40 rounded-2xl bg-zinc-100 animate-pulse" />
      ) : onboarding && (
        <div className="bg-white rounded-2xl border border-zinc-100 shadow-sm p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-semibold text-zinc-900">
              Progression · étape <span className="font-mono text-emerald-700">{onboarding.currentStep}</span>
            </p>
            {onboarding.readyForOnlinePayments ? (
              <span className="text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-full px-2.5 py-1">
                Prêt pour paiements en ligne
              </span>
            ) : (
              <span className="text-xs font-medium text-zinc-600 bg-zinc-50 border border-zinc-100 rounded-full px-2.5 py-1">
                Configuration en cours
              </span>
            )}
          </div>
          <ol className="space-y-2">
            {onboarding.steps.map((step) => (
              <li
                key={step.key}
                className={cn(
                  'flex items-start gap-3 rounded-xl px-3 py-2.5 text-sm',
                  step.key === onboarding.currentStep ? 'bg-emerald-50/80' : 'bg-zinc-50/50',
                )}
              >
                <StepIcon status={step.status} />
                <div className="min-w-0">
                  <p className="font-medium text-zinc-800">{step.label}</p>
                  {step.detail && <p className="text-xs text-zinc-500 mt-0.5">{step.detail}</p>}
                </div>
                <span className="ml-auto text-[10px] uppercase tracking-wide text-zinc-400 shrink-0">
                  {step.status}
                </span>
              </li>
            ))}
          </ol>
        </div>
      )}

      {displayProfile && (
        <div className="bg-white rounded-2xl border border-zinc-100 shadow-sm p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <KycStatusBadge
              status={displayProfile.kycStatus}
              onlineEnabled={displayProfile.onlinePaymentsEnabled}
            />
            {displayProfile.settlementAccountMasked && (
              <p className="text-xs text-zinc-500 font-mono">
                Compte · {displayProfile.settlementAccountMasked}
              </p>
            )}
          </div>
          {displayProfile.kycNote && (
            <p className="text-xs text-amber-800 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
              {displayProfile.kycNote}
            </p>
          )}
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-zinc-100 shadow-sm p-6 space-y-5">
        <h2 className="text-sm font-semibold text-zinc-900 flex items-center gap-2">
          <Building2 size={16} className="text-emerald-600" />
          Informations marchand
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <label className="block text-xs font-medium text-zinc-500 mb-1">Raison sociale *</label>
            <input
              required
              value={form.legalName}
              onChange={(e) => setForm((f) => ({ ...f, legalName: e.target.value }))}
              className="w-full px-3 py-2 rounded-lg border border-zinc-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-500 mb-1">Email contact</label>
            <input
              type="email"
              value={form.contactEmail ?? ''}
              onChange={(e) => setForm((f) => ({ ...f, contactEmail: e.target.value }))}
              className="w-full px-3 py-2 rounded-lg border border-zinc-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-500 mb-1">Téléphone contact</label>
            <input
              value={form.contactPhone ?? ''}
              onChange={(e) => setForm((f) => ({ ...f, contactPhone: e.target.value }))}
              className="w-full px-3 py-2 rounded-lg border border-zinc-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-500 mb-1">Provider</label>
            <select
              value={form.provider ?? 'FLUTTERWAVE'}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  provider: e.target.value as UpsertPaymentProfilePayload['provider'],
                }))
              }
              className="w-full px-3 py-2 rounded-lg border border-zinc-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
            >
              {PROVIDERS.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-500 mb-1">Code banque *</label>
            <input
              required
              value={form.settlementBankCode}
              onChange={(e) => setForm((f) => ({ ...f, settlementBankCode: e.target.value }))}
              className="w-full px-3 py-2 rounded-lg border border-zinc-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-500 mb-1">N° compte *</label>
            <input
              value={form.settlementAccountNumber}
              onChange={(e) => setForm((f) => ({ ...f, settlementAccountNumber: e.target.value }))}
              placeholder={displayProfile?.settlementAccountMasked ?? 'Compte de règlement'}
              className="w-full px-3 py-2 rounded-lg border border-zinc-200 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-emerald-400"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-xs font-medium text-zinc-500 mb-1">Intitulé du compte *</label>
            <input
              required
              value={form.settlementAccountName}
              onChange={(e) => setForm((f) => ({ ...f, settlementAccountName: e.target.value }))}
              className="w-full px-3 py-2 rounded-lg border border-zinc-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-xs font-medium text-zinc-500 mb-1">ID Mobile Money Business</label>
            <input
              value={form.mobileMoneyBusinessId ?? ''}
              onChange={(e) => setForm((f) => ({ ...f, mobileMoneyBusinessId: e.target.value }))}
              className="w-full px-3 py-2 rounded-lg border border-zinc-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
            />
          </div>
        </div>

        {error && <p className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}
        {success && (
          <p className="text-xs text-emerald-700 bg-emerald-50 rounded-lg px-3 py-2 flex items-center gap-1.5">
            <ShieldCheck size={14} /> Profil enregistré — checklist mise à jour, validation plateforme requise
          </p>
        )}

        <button
          type="submit"
          disabled={isPending}
          className={cn(
            'inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 text-sm text-white font-medium',
            'hover:bg-emerald-700 disabled:opacity-50',
          )}
        >
          {isPending ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
          Enregistrer le profil
        </button>
      </form>
    </div>
  )
}
