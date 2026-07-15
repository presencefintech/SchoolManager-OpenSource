'use client'

import { Banknote, ShieldCheck, ShieldAlert } from 'lucide-react'
import type { PaymentProfile } from '@/types/admin'

const KYC_LABEL: Record<string, string> = {
  VERIFIED: 'Vérifié',
  PENDING: 'En attente',
  REJECTED: 'Rejeté',
  NOT_CONFIGURED: 'Non configuré',
}

export function GuichetOnlinePaymentsBanner({ profile }: { profile?: PaymentProfile | null }) {
  if (!profile) return null

  const verified = profile.kycStatus === 'VERIFIED' && profile.onlinePaymentsEnabled
  const pending = profile.kycStatus === 'PENDING'

  return (
    <div
      className={`rounded-xl border px-4 py-3 flex items-start gap-3 ${
        verified
          ? 'border-emerald-200 bg-emerald-50/80'
          : pending
            ? 'border-amber-200 bg-amber-50/80'
            : 'border-zinc-200 bg-zinc-50'
      }`}
    >
      <div
        className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
          verified ? 'bg-emerald-100 text-emerald-700' : pending ? 'bg-amber-100 text-amber-700' : 'bg-zinc-200 text-zinc-600'
        }`}
      >
        {verified ? <ShieldCheck size={16} /> : pending ? <ShieldAlert size={16} /> : <Banknote size={16} />}
      </div>
      <div className="min-w-0">
        <p className="text-sm font-medium text-zinc-900">
          Paiements en ligne parent — {KYC_LABEL[profile.kycStatus] ?? profile.kycStatus}
        </p>
        <p className="mt-0.5 text-xs text-zinc-600">
          {verified
            ? 'Les parents peuvent payer via l’application mobile. Les encaissements arrivent en temps réel au guichet.'
            : pending
              ? 'Profil en cours de validation par la plateforme. Paiements parent désactivés pour l’instant.'
              : 'Paiements parent non actifs. Contactez l’administration pour configurer le profil règlement.'}
        </p>
        {profile.settlementAccountMasked ? (
          <p className="mt-1 text-[11px] font-mono text-zinc-500">
            Compte règlement : {profile.settlementAccountMasked}
          </p>
        ) : null}
      </div>
    </div>
  )
}
