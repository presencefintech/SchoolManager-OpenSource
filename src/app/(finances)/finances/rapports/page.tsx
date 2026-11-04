'use client'

import Link from 'next/link'
import { FileText, Wallet } from 'lucide-react'
import { FinanceReportsDashboard } from '@/components/admin/finance/reports/FinanceReportsDashboard'

/** Guichet FINANCE — rapports en lecture (pas de publication taux / figer snapshot). */
export default function FinancesReportsPage() {
  return (
    <div className="space-y-4">
      <div className="mx-auto max-w-7xl px-4 pt-4">
        <Link
          href="/finances/rapports/situation-mensuelle"
          className="flex items-center justify-between gap-3 rounded-2xl border border-emerald-200 bg-gradient-to-r from-emerald-50 to-white px-5 py-4 hover:border-emerald-300 transition-colors"
        >
          <div className="flex items-start gap-3">
            <div className="mt-0.5 rounded-xl bg-emerald-100 p-2 text-emerald-700">
              <FileText size={18} />
            </div>
            <div>
              <p className="text-sm font-semibold text-emerald-950">
                Situation financière mensuelle (promoteur)
              </p>
              <p className="text-xs text-emerald-800/80 mt-0.5">
                Effectifs, recettes attendues / réelles, versements, solde caisse, crédits — période libre type
                26→25.
              </p>
            </div>
          </div>
          <span className="text-xs font-semibold text-emerald-700 shrink-0">Ouvrir →</span>
        </Link>
        <Link
          href="/finances/depenses"
          className="mt-3 flex items-center justify-between gap-3 rounded-2xl border border-zinc-200 bg-white px-5 py-4 hover:border-zinc-300 transition-colors"
        >
          <div className="flex items-start gap-3">
            <div className="mt-0.5 rounded-xl bg-zinc-100 p-2 text-zinc-700">
              <Wallet size={18} />
            </div>
            <div>
              <p className="text-sm font-semibold text-zinc-900">Dépenses (opex / capex)</p>
              <p className="text-xs text-zinc-500 mt-0.5">
                Saisie des charges POSTED — active burn rate et variance du rapport mensuel.
              </p>
            </div>
          </div>
          <span className="text-xs font-semibold text-zinc-600 shrink-0">Ouvrir →</span>
        </Link>
      </div>
      <FinanceReportsDashboard />
    </div>
  )
}
