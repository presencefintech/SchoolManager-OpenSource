'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  Building2,
  CheckCircle2,
  Circle,
  Loader2,
  Save,
  ShieldCheck,
  AlertCircle,
  KeyRound,
  Landmark,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  usePaymentOnboarding,
  usePaymentProfile,
  useTestPaymentProfileCredentials,
  useUpsertPaymentProfile,
} from '@/lib/hooks/use-admin'
import { getApiErrorMessage } from '@/lib/api/client'
import { KycStatusBadge } from '@/components/admin/students/student-finance-badges'
import type {
  AggregateProvider,
  OnboardingStepStatus,
  PaymentProfile,
  SettlementBank,
  UpsertPaymentProfilePayload,
} from '@/types/admin'

function payoutBankForPipe(pipe: AggregateProvider): SettlementBank {
  return pipe === 'MAXICASH' ? 'EQUITY_BCDC' : 'RAWBANK'
}

function profileToForm(p: PaymentProfile): UpsertPaymentProfilePayload {
  return {
    legalName: p.legalName ?? '',
    contactEmail: p.contactEmail ?? '',
    contactPhone: p.contactPhone ?? '',
    settlementBank: payoutBankForPipe(p.aggregateProvider ?? 'PAWAPAY'),
    settlementBankCode: p.settlementBankCode ?? '',
    settlementAccountNumber: '',
    settlementAccountName: p.settlementAccountName ?? '',
    aggregateProvider: p.aggregateProvider ?? 'PAWAPAY',
    pawapayApiKey: '',
    pawapayApiSecret: '',
    maxicashMerchantId: '',
    maxicashMerchantPassword: '',
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
  const { mutateAsync: testKeys, isPending: testing } = useTestPaymentProfileCredentials()
  const [form, setForm] = useState<UpsertPaymentProfilePayload>({
    legalName: '',
    settlementBank: 'RAWBANK',
    settlementAccountNumber: '',
    settlementAccountName: '',
    aggregateProvider: 'PAWAPAY',
  })
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [testMessage, setTestMessage] = useState<string | null>(null)

  const displayProfile = onboarding?.profile ?? profile

  useEffect(() => {
    if (displayProfile) setForm(profileToForm(displayProfile))
  }, [displayProfile])

  function patch<K extends keyof UpsertPaymentProfilePayload>(key: K, value: UpsertPaymentProfilePayload[K]) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSuccess(false)
    if (!form.settlementAccountNumber?.trim() && displayProfile?.kycStatus === 'NOT_CONFIGURED') {
      setError('Saisissez le numéro de compte / IBAN de versement.')
      return
    }
    const payload: UpsertPaymentProfilePayload = {
      legalName: form.legalName,
      settlementBank: payoutBankForPipe(aggregator),
      settlementBankCode: payoutBankForPipe(aggregator),
      settlementAccountName: form.settlementAccountName,
      aggregateProvider: form.aggregateProvider,
      ...(form.settlementAccountNumber?.trim()
        ? { settlementAccountNumber: form.settlementAccountNumber.trim() }
        : {}),
      ...(form.contactEmail?.trim() ? { contactEmail: form.contactEmail.trim() } : {}),
      ...(form.contactPhone?.trim() ? { contactPhone: form.contactPhone.trim() } : {}),
      ...(form.pawapayApiKey?.trim() ? { pawapayApiKey: form.pawapayApiKey.trim() } : {}),
      ...(form.pawapayApiSecret?.trim() ? { pawapayApiSecret: form.pawapayApiSecret.trim() } : {}),
      ...(form.maxicashMerchantId?.trim() ? { maxicashMerchantId: form.maxicashMerchantId.trim() } : {}),
      ...(form.maxicashMerchantPassword?.trim()
        ? { maxicashMerchantPassword: form.maxicashMerchantPassword.trim() }
        : {}),
    }
    try {
      await save(payload)
      setSuccess(true)
      setForm((f) => ({
        ...f,
        settlementAccountNumber: '',
        pawapayApiKey: '',
        pawapayApiSecret: '',
        maxicashMerchantId: '',
        maxicashMerchantPassword: '',
      }))
      await refetchOnboarding()
    } catch (err) {
      setError(getApiErrorMessage(err))
    }
  }

  async function handleTest() {
    setTestMessage(null)
    setError(null)
    const provider = (form.aggregateProvider ?? 'PAWAPAY') as AggregateProvider
    try {
      const result = await testKeys({
        provider,
        pawapayApiKey: form.pawapayApiKey,
        pawapayApiSecret: form.pawapayApiSecret,
        maxicashMerchantId: form.maxicashMerchantId,
        maxicashMerchantPassword: form.maxicashMerchantPassword,
      })
      setTestMessage(result.message)
    } catch (err) {
      setError(getApiErrorMessage(err))
    }
  }

  const isLoading = profileLoading || onboardingLoading
  const aggregator = (form.aggregateProvider ?? 'PAWAPAY') as AggregateProvider

  return (
    <div className="space-y-6 max-w-3xl">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
        <h1 className="text-2xl font-bold text-zinc-900">Configuration des règlements</h1>
        <p className="text-sm text-zinc-500 mt-0.5">
          Identifiants de collecte (agrégateur) et compte de versement — jamais visibles par les parents
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
          <p className="text-xs text-zinc-500">
            Agrégateur : <span className="font-medium text-zinc-800">{displayProfile.aggregateProvider}</span>
            {displayProfile.pawapayConfigured ? ' · PawaPay configuré' : ''}
            {displayProfile.maxicashConfigured ? ' · Maxicash configuré' : ''}
          </p>
          {displayProfile.kycNote && (
            <p className="text-xs text-amber-800 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
              {displayProfile.kycNote}
            </p>
          )}
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-zinc-100 shadow-sm p-6 space-y-8">
        <section className="space-y-4">
          <h2 className="text-sm font-semibold text-zinc-900 flex items-center gap-2">
            <Building2 size={16} className="text-emerald-600" />
            Identité marchande
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-zinc-500 mb-1">Raison sociale *</label>
              <input
                required
                value={form.legalName}
                onChange={(e) => patch('legalName', e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-zinc-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-500 mb-1">Email contact</label>
              <input
                type="email"
                value={form.contactEmail ?? ''}
                onChange={(e) => patch('contactEmail', e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-zinc-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-500 mb-1">Téléphone contact</label>
              <input
                value={form.contactPhone ?? ''}
                onChange={(e) => patch('contactPhone', e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-zinc-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
              />
            </div>
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="text-sm font-semibold text-zinc-900 flex items-center gap-2">
            <KeyRound size={16} className="text-emerald-600" />
            Tuyau de collecte (agrégateur)
          </h2>
          <p className="text-xs text-zinc-500">
            PawaPay ou Maxicash parlent aux opérateurs. Ce n’est pas un moyen de paiement parent :
            le parent choisit uniquement M-Pesa, Orange Money ou Airtel Money.
          </p>
          <div>
            <label className="block text-xs font-medium text-zinc-500 mb-1">Agrégateur *</label>
            <select
              value={aggregator}
              onChange={(e) => {
                const next = e.target.value as AggregateProvider
                setForm((f) => ({
                  ...f,
                  aggregateProvider: next,
                  settlementBank: payoutBankForPipe(next),
                }))
              }}
              className="w-full px-3 py-2 rounded-lg border border-zinc-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
            >
              <option value="PAWAPAY">PawaPay (recommandé)</option>
              <option value="MAXICASH">Maxicash</option>
            </select>
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="text-sm font-semibold text-zinc-900 flex items-center gap-2">
            <ShieldCheck size={16} className="text-emerald-600" />
            Clés API de l’agrégateur
          </h2>
          <p className="text-xs text-zinc-500">
            Chiffrées en base. Jamais renvoyées à l’app parent ni aux APIs publiques.
          </p>
          {aggregator === 'PAWAPAY' ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-zinc-500 mb-1">Clé API PawaPay</label>
                <input
                  type="password"
                  autoComplete="off"
                  value={form.pawapayApiKey ?? ''}
                  onChange={(e) => patch('pawapayApiKey', e.target.value)}
                  placeholder={displayProfile?.pawapayConfigured ? '•••• configurée' : 'Token API'}
                  className="w-full px-3 py-2 rounded-lg border border-zinc-200 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-emerald-400"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-500 mb-1">Secret PawaPay (optionnel)</label>
                <input
                  type="password"
                  autoComplete="off"
                  value={form.pawapayApiSecret ?? ''}
                  onChange={(e) => patch('pawapayApiSecret', e.target.value)}
                  placeholder={displayProfile?.pawapayConfigured ? '•••• configuré' : 'Secret'}
                  className="w-full px-3 py-2 rounded-lg border border-zinc-200 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-emerald-400"
                />
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-zinc-500 mb-1">Merchant ID Maxicash</label>
                <input
                  type="password"
                  autoComplete="off"
                  value={form.maxicashMerchantId ?? ''}
                  onChange={(e) => patch('maxicashMerchantId', e.target.value)}
                  placeholder={displayProfile?.maxicashConfigured ? '•••• configuré' : 'Merchant ID'}
                  className="w-full px-3 py-2 rounded-lg border border-zinc-200 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-emerald-400"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-500 mb-1">Mot de passe marchand</label>
                <input
                  type="password"
                  autoComplete="off"
                  value={form.maxicashMerchantPassword ?? ''}
                  onChange={(e) => patch('maxicashMerchantPassword', e.target.value)}
                  placeholder={displayProfile?.maxicashConfigured ? '•••• configuré' : 'Password'}
                  className="w-full px-3 py-2 rounded-lg border border-zinc-200 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-emerald-400"
                />
              </div>
            </div>
          )}
          <button
            type="button"
            onClick={() => void handleTest()}
            disabled={testing}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-zinc-200 text-sm text-zinc-700 hover:bg-zinc-50 disabled:opacity-50"
          >
            {testing ? <Loader2 size={14} className="animate-spin" /> : <ShieldCheck size={14} />}
            Tester la connexion
          </button>
          {testMessage && (
            <p className="text-xs text-emerald-700 bg-emerald-50 rounded-lg px-3 py-2">{testMessage}</p>
          )}
        </section>

        <section className="space-y-4">
          <h2 className="text-sm font-semibold text-zinc-900 flex items-center gap-2">
            <Landmark size={16} className="text-emerald-600" />
            Compte de versement (payouts agrégateur)
          </h2>
          <p className="text-xs text-zinc-500">
            {aggregator === 'MAXICASH'
              ? 'Canal banque documenté Maxicash : Equity BCDC. Saisissez le compte école pour les versements.'
              : 'Payout PawaPay : compte / IBAN école (Rawbank par défaut). Les opérateurs COD (Orange, Airtel, Vodacom M-Pesa) restent côté parent.'}
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-zinc-500 mb-1">Canal de versement</label>
              <input
                readOnly
                value={
                  aggregator === 'MAXICASH'
                    ? 'Equity BCDC (Maxicash)'
                    : 'Rawbank / IBAN école (PawaPay)'
                }
                className="w-full px-3 py-2 rounded-lg border border-zinc-200 bg-zinc-50 text-sm text-zinc-700"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-500 mb-1">N° compte / IBAN *</label>
              <input
                value={form.settlementAccountNumber ?? ''}
                onChange={(e) => patch('settlementAccountNumber', e.target.value)}
                placeholder={displayProfile?.settlementAccountMasked ?? 'CD… ou n° de compte'}
                className="w-full px-3 py-2 rounded-lg border border-zinc-200 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-emerald-400"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-500 mb-1">Intitulé du compte *</label>
              <input
                required
                value={form.settlementAccountName}
                onChange={(e) => patch('settlementAccountName', e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-zinc-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
              />
            </div>
          </div>
        </section>

        {error && <p className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}
        {success && (
          <p className="text-xs text-emerald-700 bg-emerald-50 rounded-lg px-3 py-2 flex items-center gap-1.5">
            <ShieldCheck size={14} /> Profil enregistré — clés chiffrées, validation plateforme requise
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
          Enregistrer
        </button>
      </form>
    </div>
  )
}
