'use client'

import { Building2, Crown, GitBranch } from 'lucide-react'
import { formatMoney } from '@/lib/finance/currency'
import type { GuichetDashboard } from '@/types/finance'

/** KPIs réseau — encaissements cross-site du jour sur le hub. */
export function GuichetNetworkOpsCard({
  network,
}: {
  network: NonNullable<GuichetDashboard['network']>
}) {
  const cross = network.crossSiteToday
  const campuses = network.byEnrollmentCampusToday ?? []

  return (
    <div className="rounded-2xl border border-sky-100 bg-sky-50/50 p-4 space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-xs font-semibold text-sky-950 flex items-center gap-1.5">
            <GitBranch size={13} />
            {network.groupName ?? 'Réseau'}
          </p>
          <p className="text-[11px] text-sky-800/80 mt-0.5">
            {network.sitesCount} site(s)
            {network.isPaymentHub ? ' · caisse hub' : ''}
            {!network.canCollectCrossSite ? ' · encaissement local uniquement' : ''}
          </p>
        </div>
        {network.isPaymentHub ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-900">
            <Crown size={10} /> Hub
          </span>
        ) : null}
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-xl bg-white/80 border border-sky-100 px-3 py-2">
          <p className="text-[10px] uppercase tracking-wide text-zinc-400 font-semibold">
            Cross-site (jour)
          </p>
          <p className="text-sm font-bold tabular-nums text-sky-950 mt-0.5">
            {formatMoney(cross.amount)}
          </p>
          <p className="text-[10px] text-zinc-500">{cross.count} paiement(s)</p>
        </div>
        <div className="rounded-xl bg-white/80 border border-sky-100 px-3 py-2">
          <p className="text-[10px] uppercase tracking-wide text-zinc-400 font-semibold">
            Campuses
          </p>
          <p className="text-sm font-bold tabular-nums text-sky-950 mt-0.5">
            {campuses.length || '—'}
          </p>
          <p className="text-[10px] text-zinc-500">crédités aujourd&apos;hui</p>
        </div>
      </div>

      {campuses.length > 0 ? (
        <ul className="space-y-1.5">
          {campuses.slice(0, 4).map((c) => (
            <li
              key={c.enrollmentSchoolId}
              className="flex items-center justify-between gap-2 text-[11px]"
            >
              <span className="flex items-center gap-1.5 text-zinc-700 truncate min-w-0">
                <Building2 size={11} className="text-zinc-400 shrink-0" />
                <span className="truncate">{c.enrollmentSchoolName}</span>
              </span>
              <span className="tabular-nums font-semibold text-zinc-900 shrink-0">
                {formatMoney(c.amount)}
                <span className="text-zinc-400 font-normal"> · {c.count}</span>
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-[11px] text-zinc-500">
          Aucun encaissement cross-site aujourd&apos;hui.
        </p>
      )}
    </div>
  )
}
