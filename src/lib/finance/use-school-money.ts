'use client'

import { useQuery } from '@tanstack/react-query'
import { financeRoleApi } from '@/lib/finance/api/finance.api'
import { formatLedgerAmount, normalizeMoneyCurrency } from '@/lib/finance/ledger-money'

const CURRENCY_QUERY_KEY = ['finance', 'currency-config'] as const

/** Devise d’affichage école — même règle partout (caisse, réseau, live, rapports). */
export function useSchoolMoney() {
  const { data, isFetched } = useQuery({
    queryKey: CURRENCY_QUERY_KEY,
    queryFn: financeRoleApi.getCurrencyConfig,
    staleTime: 300_000,
    retry: 1,
  })

  const displayCurrency = normalizeMoneyCurrency(data?.displayCurrency)

  function format(amount: number, storedCurrency?: string | null): string {
    return formatLedgerAmount(amount, storedCurrency, data)
  }

  return {
    format,
    displayCurrency,
    rate: Number(data?.legacyRate) > 0 ? Number(data?.legacyRate) : null,
    isFetched,
    config: data ?? null,
  }
}

export { CURRENCY_QUERY_KEY }
