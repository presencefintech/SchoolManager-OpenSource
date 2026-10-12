'use client'

import { Lock, PauseCircle, Fingerprint, Percent } from 'lucide-react'
import { cn } from '@/lib/utils'
import { labelPaymentLocked, labelBiometricStatus, labelMoratorium } from '@/lib/business-labels'
import { useSchoolMoney } from '@/lib/finance/use-school-money'

export function StudentFinanceBadges({
  debtAmount,
  isPaymentLocked,
  activeMoratoriumId,
  biometricStatus,
  scholarshipPercent,
  className,
}: {
  debtAmount?: number
  isPaymentLocked?: boolean
  activeMoratoriumId?: number
  biometricStatus?: string
  scholarshipPercent?: number
  className?: string
}) {
  const { format: formatMoney } = useSchoolMoney()
  const badges: { key: string; label: string; cls: string; icon?: React.ElementType }[] = []

  if ((debtAmount ?? 0) > 0) {
    badges.push({ key: 'debt', label: `Dette ${formatMoney(debtAmount!)}`, cls: 'bg-red-50 text-red-700' })
  }
  if (isPaymentLocked) {
    badges.push({ key: 'lock', label: labelPaymentLocked(true), cls: 'bg-amber-50 text-amber-800', icon: Lock })
  }
  if (activeMoratoriumId) {
    badges.push({ key: 'moratorium', label: labelMoratorium(true) ?? 'Moratoire', cls: 'bg-indigo-50 text-indigo-700', icon: PauseCircle })
  }
  if (scholarshipPercent && scholarshipPercent > 0) {
    badges.push({ key: 'scholarship', label: `Bourse ${scholarshipPercent}%`, cls: 'bg-teal-50 text-teal-700', icon: Percent })
  }
  if (biometricStatus && biometricStatus !== 'READY') {
    badges.push({ key: 'bio', label: labelBiometricStatus(biometricStatus), cls: 'bg-zinc-100 text-zinc-600', icon: Fingerprint })
  }

  if (!badges.length) return null

  return (
    <div className={cn('flex flex-wrap gap-1', className)}>
      {badges.map(({ key, label, cls, icon: Icon }) => (
        <span key={key} className={cn('inline-flex items-center gap-0.5 text-[10px] font-medium px-1.5 py-0.5 rounded-full', cls)}>
          {Icon && <Icon size={9} />}
          {label}
        </span>
      ))}
    </div>
  )
}

export function KycStatusBadge({ status, onlineEnabled }: { status: string; onlineEnabled?: boolean }) {
  const cfg: Record<string, { label: string; cls: string }> = {
    VERIFIED: { label: onlineEnabled ? 'Identité validée · Paiements en ligne actifs' : 'Identité validée', cls: 'bg-emerald-50 text-emerald-700 ring-emerald-100' },
    PENDING: { label: 'Identité en attente de validation', cls: 'bg-amber-50 text-amber-700 ring-amber-100' },
    REJECTED: { label: 'Identité refusée', cls: 'bg-red-50 text-red-700 ring-red-100' },
    NOT_CONFIGURED: { label: 'Profil règlement non configuré', cls: 'bg-zinc-100 text-zinc-600 ring-zinc-200' },
  }
  const c = cfg[status] ?? cfg.NOT_CONFIGURED
  return (
    <span className={cn('inline-flex text-xs font-medium px-2.5 py-1 rounded-full ring-1', c.cls)}>
      {c.label}
    </span>
  )
}
