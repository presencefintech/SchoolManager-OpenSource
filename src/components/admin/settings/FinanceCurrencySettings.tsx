'use client'

import { useEffect, useState } from 'react'
import { Loader2, Save } from 'lucide-react'
import { useFinanceCurrencyConfig, useUpdateCurrencyConfig } from '@/lib/hooks/use-admin'

export function FinanceCurrencySettings() {
  const { data, isLoading } = useFinanceCurrencyConfig()
  const update = useUpdateCurrencyConfig()
  const [displayCurrency, setDisplayCurrency] = useState<'USD' | 'CDF'>('USD')
  const [toleranceBps, setToleranceBps] = useState('50')

  useEffect(() => {
    if (data) {
      setDisplayCurrency((data.displayCurrency as 'USD' | 'CDF') || 'USD')
      setToleranceBps(String(data.exchangeToleranceBps ?? 50))
    }
  }, [data])

  if (isLoading) {
    return (
      <div className="rounded-xl border border-zinc-200 bg-white p-6 text-center">
        <Loader2 className="mx-auto h-5 w-5 animate-spin text-zinc-400" />
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-6 space-y-4">
      <div>
        <h3 className="text-sm font-semibold text-zinc-900">Devise & change (rapports)</h3>
        <p className="mt-1 text-xs text-zinc-500">
          Base comptable interne : USD. Tous les écrans (caisse, réseau, live, rapports) utilisent
          cette devise d&apos;affichage. Le franc n&apos;apparaît que si vous le choisissez ici, avec
          le taux de change.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="text-xs font-medium text-zinc-600">Devise d&apos;affichage</span>
          <select
            value={displayCurrency}
            onChange={(e) => setDisplayCurrency(e.target.value as 'USD' | 'CDF')}
            className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
          >
            <option value="CDF">CDF — Franc congolais</option>
            <option value="USD">USD — Dollar</option>
          </select>
        </label>
        <label className="block">
          <span className="text-xs font-medium text-zinc-600">Tolérance écart (basis points)</span>
          <input
            type="number"
            min={0}
            max={5000}
            value={toleranceBps}
            onChange={(e) => setToleranceBps(e.target.value)}
            className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm font-mono"
          />
          <p className="mt-1 text-[11px] text-zinc-400">50 = 0,50 % — audit des conversions paiement</p>
        </label>
      </div>

      {data ? (
        <p className="text-xs text-zinc-500">
          Taux courant : <strong>{data.legacyRate.toLocaleString('fr-FR')}</strong> {data.displayCurrency}
          {' '}(modifiable dans Finance → Rapports)
        </p>
      ) : null}

      <button
        type="button"
        disabled={update.isPending}
        onClick={() =>
          update.mutate({
            displayCurrency,
            exchangeToleranceBps: Number(toleranceBps),
          })
        }
        className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
      >
        <Save size={14} />
        Enregistrer la devise
      </button>
    </div>
  )
}
