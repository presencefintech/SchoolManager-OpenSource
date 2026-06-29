'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Building2, Loader2, Save, ShieldCheck } from 'lucide-react'
import { cn } from '@/lib/utils'
import { usePaymentProfile, useUpsertPaymentProfile } from '@/lib/hooks/use-admin'
import { getApiErrorMessage } from '@/lib/api/client'
import { KycStatusBadge } from '@/components/admin/students/student-finance-badges'
import type { PaymentProfile, UpsertPaymentProfilePayload } from '@/types/admin'

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

export default function PaymentProfilePage() {
  const { data: profile, isLoading } = usePaymentProfile()
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

  useEffect(() => {
    if (profile) setForm(profileToForm(profile))
  }, [profile])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSuccess(false)
    if (!form.settlementAccountNumber.trim()) {
      setError('Saisissez le numéro de compte settlement (requis à chaque enregistrement).')
      return
    }
    try {
      await save(form)
      setSuccess(true)
      setForm((f) => ({ ...f, settlementAccountNumber: '' }))
    } catch (err) {
      setError(getApiErrorMessage(err))
    }
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
        <h1 className="text-2xl font-bold text-zinc-900">Profil de règlement</h1>
        <p className="text-sm text-zinc-500 mt-0.5">
          Configuration KYC marchand — activation des paiements en ligne pour votre établissement
        </p>
      </motion.div>

      {isLoading ? (
        <div className="h-48 rounded-2xl bg-zinc-100 animate-pulse" />
      ) : profile && (
        <div className="bg-white rounded-2xl border border-zinc-100 shadow-sm p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <KycStatusBadge status={profile.kycStatus} onlineEnabled={profile.onlinePaymentsEnabled} />
            {profile.settlementAccountMasked && (
              <p className="text-xs text-zinc-500 font-mono">Compte · {profile.settlementAccountMasked}</p>
            )}
          </div>
          {profile.kycNote && (
            <p className="text-xs text-amber-800 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">{profile.kycNote}</p>
          )}
          <dl className="grid grid-cols-2 gap-3 text-sm">
            {profile.flwSubaccountId && (
              <div>
                <dt className="text-xs text-zinc-400">Subaccount</dt>
                <dd className="font-mono text-xs text-zinc-700 truncate">{profile.flwSubaccountId}</dd>
              </div>
            )}
            {profile.verifiedAt && (
              <div>
                <dt className="text-xs text-zinc-400">Validé le</dt>
                <dd className="text-zinc-700">{new Date(profile.verifiedAt).toLocaleDateString('fr-FR')}</dd>
              </div>
            )}
          </dl>
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
              onChange={(e) => setForm((f) => ({ ...f, provider: e.target.value as UpsertPaymentProfilePayload['provider'] }))}
              className="w-full px-3 py-2 rounded-lg border border-zinc-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
            >
              {PROVIDERS.map((p) => (
                <option key={p} value={p}>{p}</option>
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
            <label className="block text-xs font-medium text-zinc-500 mb-1">
              N° compte {profile?.kycStatus === 'NOT_CONFIGURED' ? '*' : '(laisser vide pour conserver)'}
            </label>
            <input
              value={form.settlementAccountNumber}
              onChange={(e) => setForm((f) => ({ ...f, settlementAccountNumber: e.target.value }))}
              placeholder={profile?.settlementAccountMasked ?? 'Compte settlement'}
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
            <ShieldCheck size={14} /> Profil enregistré — statut repassé en validation KYC
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
