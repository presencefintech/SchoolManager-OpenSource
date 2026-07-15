'use client'

import { useState } from 'react'
import { Download, BookOpen, Landmark } from 'lucide-react'
import {
  useExportAccountingJournal,
  useExportGeneralLedger,
  useExportPayments,
  useExportDebtors,
} from '@/lib/hooks/use-finance'
import { FinancePageHeader, FinancePageShell, FinancePanel } from '@/components/finance/finance-page-shell'
import { downloadBlob } from '@/lib/finance/download-blob'
import { getApiErrorMessage } from '@/lib/api/client'

const METHODS = [
  { value: '', label: 'Tous les modes' },
  { value: 'CASH', label: 'Espèces' },
  { value: 'ORANGE_MONEY', label: 'Orange Money' },
  { value: 'MPESA', label: 'M-Pesa' },
  { value: 'AIRTEL_MONEY', label: 'Airtel Money' },
  { value: 'BANK', label: 'Virement' },
  { value: 'CARD', label: 'Carte' },
]

export default function FinanceExportsPage() {
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [method, setMethod] = useState('')
  const [error, setError] = useState<string | null>(null)

  const journal = useExportAccountingJournal()
  const ledger = useExportGeneralLedger()
  const payments = useExportPayments()
  const debtors = useExportDebtors()

  const periodParams = {
    ...(startDate ? { startDate } : {}),
    ...(endDate ? { endDate } : {}),
  }

  async function run(
    fn: () => Promise<Blob>,
    filename: string,
  ) {
    setError(null)
    try {
      const blob = await fn()
      downloadBlob(blob, filename)
    } catch (e) {
      setError(getApiErrorMessage(e))
    }
  }

  const stamp = new Date().toISOString().slice(0, 10)

  return (
    <FinancePageShell>
      <FinancePageHeader
        title="Exports comptables"
        subtitle="Journal OHADA-like, grand livre et exports opérationnels CSV"
      />

      {error && (
        <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      <FinancePanel>
        <h2 className="text-sm font-semibold text-zinc-900 mb-3">Période (journal & grand livre)</h2>
        <div className="flex flex-wrap gap-3 items-end">
          <div>
            <label className="block text-xs text-zinc-500 mb-1">Début</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="rounded-xl border border-zinc-200 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs text-zinc-500 mb-1">Fin</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="rounded-xl border border-zinc-200 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs text-zinc-500 mb-1">Mode (journal)</label>
            <select
              value={method}
              onChange={(e) => setMethod(e.target.value)}
              className="rounded-xl border border-zinc-200 px-3 py-2 text-sm min-w-[160px]"
            >
              {METHODS.map((m) => (
                <option key={m.value || 'all'} value={m.value}>{m.label}</option>
              ))}
            </select>
          </div>
        </div>
      </FinancePanel>

      <div className="grid gap-4 sm:grid-cols-2">
        <FinancePanel>
          <div className="flex items-start gap-3">
            <div className="rounded-xl bg-emerald-50 p-2.5 text-emerald-700">
              <BookOpen size={18} />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-semibold text-zinc-900">Journal comptable</h3>
              <p className="text-xs text-zinc-500 mt-1 mb-3">
                Écritures type OHADA (débit / crédit) pour la période sélectionnée.
              </p>
              <button
                type="button"
                disabled={journal.isPending}
                onClick={() =>
                  void run(
                    () => journal.mutateAsync({
                      ...periodParams,
                      ...(method ? { method } : {}),
                    }),
                    `journal-comptable-${stamp}.csv`,
                  )
                }
                className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-2 text-xs font-medium text-white hover:bg-emerald-500 disabled:opacity-40"
              >
                <Download size={13} />
                {journal.isPending ? 'Export…' : 'Télécharger CSV'}
              </button>
            </div>
          </div>
        </FinancePanel>

        <FinancePanel>
          <div className="flex items-start gap-3">
            <div className="rounded-xl bg-sky-50 p-2.5 text-sky-700">
              <Landmark size={18} />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-semibold text-zinc-900">Grand livre</h3>
              <p className="text-xs text-zinc-500 mt-1 mb-3">
                Soldes cumulés par compte sur la période.
              </p>
              <button
                type="button"
                disabled={ledger.isPending}
                onClick={() =>
                  void run(
                    () => ledger.mutateAsync(periodParams),
                    `grand-livre-${stamp}.csv`,
                  )
                }
                className="inline-flex items-center gap-1.5 rounded-xl bg-sky-600 px-3 py-2 text-xs font-medium text-white hover:bg-sky-500 disabled:opacity-40"
              >
                <Download size={13} />
                {ledger.isPending ? 'Export…' : 'Télécharger CSV'}
              </button>
            </div>
          </div>
        </FinancePanel>

        <FinancePanel>
          <h3 className="text-sm font-semibold text-zinc-900 mb-1">Paiements</h3>
          <p className="text-xs text-zinc-500 mb-3">Export opérationnel de tous les paiements.</p>
          <button
            type="button"
            disabled={payments.isPending}
            onClick={() =>
              void run(() => payments.mutateAsync(), `paiements-${stamp}.csv`)
            }
            className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-200 px-3 py-2 text-xs font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-40"
          >
            <Download size={13} /> CSV paiements
          </button>
        </FinancePanel>

        <FinancePanel>
          <h3 className="text-sm font-semibold text-zinc-900 mb-1">Débiteurs</h3>
          <p className="text-xs text-zinc-500 mb-3">Liste des soldes impayés.</p>
          <button
            type="button"
            disabled={debtors.isPending}
            onClick={() =>
              void run(() => debtors.mutateAsync(), `debiteurs-${stamp}.csv`)
            }
            className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-200 px-3 py-2 text-xs font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-40"
          >
            <Download size={13} /> CSV débiteurs
          </button>
        </FinancePanel>
      </div>
    </FinancePageShell>
  )
}
