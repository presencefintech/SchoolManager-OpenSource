'use client'

import { RefreshCw, PiggyBank, TrendingDown, TrendingUp } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { cn } from '@/lib/utils'
import { useFinanceAcademicSessionId } from '@/lib/hooks/use-finance'
import { financeBudgetApi } from '@/lib/admin/api/finance-budget.api'
import { formatMoney } from '@/lib/finance/currency'
import { FinancePageHeader, FinancePageShell, FinancePanel, FinanceEmptyState } from '@/components/finance/finance-page-shell'

export default function FinanceBudgetPage() {
  const { sessionId, isLoading: sessionLoading } = useFinanceAcademicSessionId()

  const varianceQuery = useQuery({
    queryKey: ['finance', 'budget', 'variance', sessionId],
    queryFn: () => financeBudgetApi.getVariance(sessionId!),
    enabled: sessionId != null,
    staleTime: 20_000,
  })

  const data = varianceQuery.data

  return (
    <FinancePageShell>
      <FinancePageHeader
        title="Budget — prévu vs réel"
        subtitle={data ? `Session ${data.sessionLabel}` : 'Suivi du budget défini par l’administrateur'}
        actions={
          <button
            type="button"
            onClick={() => varianceQuery.refetch()}
            className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-600 hover:bg-zinc-50"
          >
            <RefreshCw size={14} className={cn(varianceQuery.isFetching && 'animate-spin')} />
            Actualiser
          </button>
        }
      />

      <FinancePanel title="Écart par catégorie" icon={PiggyBank}>
        {sessionLoading || varianceQuery.isLoading ? (
          <div className="p-8 text-center text-sm text-zinc-400">Chargement…</div>
        ) : !data || data.categories.length === 0 ? (
          <FinanceEmptyState
            icon={PiggyBank}
            title="Aucun budget défini"
            description="L'administrateur n'a pas encore saisi de budget pour cette session."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-100 bg-zinc-50/80">
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-zinc-400">
                    Catégorie
                  </th>
                  <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wide text-zinc-400">
                    Prévu
                  </th>
                  <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wide text-zinc-400">
                    Réel
                  </th>
                  <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wide text-zinc-400">
                    Écart
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-50">
                {data.categories.map((cat) => (
                  <tr key={cat.categoryId} className="hover:bg-zinc-50/80">
                    <td className="px-5 py-3 font-medium text-zinc-900">{cat.categoryName}</td>
                    <td className="px-5 py-3 text-right tabular-nums text-zinc-700">{formatMoney(cat.totalPlanned)}</td>
                    <td className="px-5 py-3 text-right tabular-nums text-zinc-700">{formatMoney(cat.totalActual)}</td>
                    <td
                      className={cn(
                        'px-5 py-3 text-right tabular-nums font-semibold flex items-center justify-end gap-1',
                        cat.totalVariance < 0 ? 'text-red-600' : 'text-emerald-700',
                      )}
                    >
                      {cat.totalVariance < 0 ? <TrendingDown size={13} /> : <TrendingUp size={13} />}
                      {formatMoney(cat.totalVariance)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {data.unbudgetedActual > 0 && (
              <p className="px-5 py-3 text-xs text-amber-700 bg-amber-50 border-t border-amber-100">
                {formatMoney(data.unbudgetedActual)} de dépenses postées sans catégorie budgétaire (hors budget).
              </p>
            )}
          </div>
        )}
      </FinancePanel>
    </FinancePageShell>
  )
}
