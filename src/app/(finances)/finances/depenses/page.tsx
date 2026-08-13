'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { Plus, RefreshCw, FileText, Ban, CheckCircle2 } from 'lucide-react'
import {
  useFinanceExpenses,
  usePostExpense,
  useVoidExpense,
} from '@/lib/hooks/use-finance'
import { FinancePageHeader, FinancePageShell } from '@/components/finance/finance-page-shell'
import { ExpenseLinesForm } from '@/components/finance/expense-lines-form'
import { formatMoney } from '@/lib/finance/currency'
import { getApiErrorMessage } from '@/lib/api/client'
import { cn } from '@/lib/utils'
import type { ExpenseStatus, FinanceExpense } from '@/types/finance'

function statusLabel(s: ExpenseStatus) {
  switch (s) {
    case 'DRAFT':
      return 'Brouillon'
    case 'POSTED':
      return 'Postée'
    case 'VOID':
      return 'Annulée'
  }
}

function statusClass(s: ExpenseStatus) {
  switch (s) {
    case 'DRAFT':
      return 'bg-amber-50 text-amber-800 border-amber-200'
    case 'POSTED':
      return 'bg-emerald-50 text-emerald-800 border-emerald-200'
    case 'VOID':
      return 'bg-zinc-100 text-zinc-500 border-zinc-200'
  }
}

export default function DepensesPage() {
  const [status, setStatus] = useState<string>('')
  const [kind, setKind] = useState<string>('')
  const [showForm, setShowForm] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const filters = useMemo(
    () => ({
      status: status || undefined,
      kind: kind || undefined,
    }),
    [status, kind],
  )

  const { data, isLoading, isFetching, refetch } = useFinanceExpenses(filters)
  const postMut = usePostExpense()
  const voidMut = useVoidExpense()

  async function handlePost(item: FinanceExpense) {
    setError(null)
    try {
      await postMut.mutateAsync(item.id)
    } catch (err) {
      setError(getApiErrorMessage(err))
    }
  }

  async function handleVoid(item: FinanceExpense) {
    const reason = window.prompt('Motif d’annulation (optionnel) :') ?? undefined
    setError(null)
    try {
      await voidMut.mutateAsync({ id: item.id, reason: reason || undefined })
    } catch (err) {
      setError(getApiErrorMessage(err))
    }
  }

  const items = data?.items ?? []

  return (
    <FinancePageShell>
      <FinancePageHeader
        title="Dépenses"
        subtitle="Une ligne par charge, montant et n° de preuve optionnel — alimente la situation mensuelle"
        actions={
          <>
            <Link
              href="/finances/rapports/situation-mensuelle"
              className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-600 hover:bg-zinc-50"
            >
              <FileText size={14} /> Situation mensuelle
            </Link>
            <button
              type="button"
              onClick={() => refetch()}
              className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-600 hover:bg-zinc-50"
            >
              <RefreshCw size={14} className={isFetching ? 'animate-spin' : ''} />
              Actualiser
            </button>
            <button
              type="button"
              onClick={() => setShowForm((v) => !v)}
              className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-700"
            >
              <Plus size={14} /> {showForm ? 'Masquer la saisie' : 'Saisir des dépenses'}
            </button>
          </>
        }
      />

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      {showForm ? (
        <div className="rounded-2xl border border-zinc-200 bg-white p-5">
          <h2 className="text-sm font-bold text-zinc-900 mb-4">Saisie des charges</h2>
          <ExpenseLinesForm onSaved={() => void refetch()} />
        </div>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="rounded-lg border border-zinc-200 px-3 py-2 text-sm"
        >
          <option value="">Tous statuts</option>
          <option value="DRAFT">Brouillon</option>
          <option value="POSTED">Postée</option>
          <option value="VOID">Annulée</option>
        </select>
        <select
          value={kind}
          onChange={(e) => setKind(e.target.value)}
          className="rounded-lg border border-zinc-200 px-3 py-2 text-sm"
        >
          <option value="">Tous types</option>
          <option value="OPERATING">Opérationnelle</option>
          <option value="INVESTMENT">Investissement</option>
        </select>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-zinc-200 bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-100 text-left text-[10px] uppercase tracking-wide text-zinc-500">
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3">Poste</th>
              <th className="px-4 py-3">Type</th>
              <th className="px-4 py-3">Statut</th>
              <th className="px-4 py-3 text-right">Montant</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-zinc-400">
                  Chargement…
                </td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-zinc-400">
                  Aucune dépense. Ajoutez des lignes ci-dessus (montant + n° de preuve optionnel).
                </td>
              </tr>
            ) : (
              items.map((item) => (
                <tr key={item.id} className="border-b border-zinc-50 hover:bg-zinc-50/60">
                  <td className="px-4 py-3 tabular-nums text-zinc-600 whitespace-nowrap">
                    {item.occurredAt.slice(0, 10).split('-').reverse().join('/')}
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-medium text-zinc-900">
                      {item.category} — {item.label}
                    </p>
                    <p className="text-[11px] text-zinc-400">
                      {item.affectsCash ? 'Impact caisse · ' : ''}
                      {item.reference ? `Réf. ${item.reference}` : 'Sans réf.'}
                    </p>
                  </td>
                  <td className="px-4 py-3 text-zinc-600">
                    {item.kind === 'OPERATING' ? 'Opex' : 'Capex'}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={cn(
                        'inline-block rounded border px-1.5 py-0.5 text-[10px] font-semibold uppercase',
                        statusClass(item.status),
                      )}
                    >
                      {statusLabel(item.status)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right font-semibold tabular-nums">
                    {formatMoney(item.amount, item.currency)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="inline-flex gap-1">
                      {item.status === 'DRAFT' ? (
                        <button
                          type="button"
                          title="Poster"
                          onClick={() => handlePost(item)}
                          disabled={postMut.isPending}
                          className="rounded-lg border border-emerald-200 p-1.5 text-emerald-700 hover:bg-emerald-50"
                        >
                          <CheckCircle2 size={14} />
                        </button>
                      ) : null}
                      {item.status !== 'VOID' ? (
                        <button
                          type="button"
                          title="Annuler"
                          onClick={() => handleVoid(item)}
                          disabled={voidMut.isPending}
                          className="rounded-lg border border-zinc-200 p-1.5 text-zinc-500 hover:bg-zinc-50"
                        >
                          <Ban size={14} />
                        </button>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </FinancePageShell>
  )
}
