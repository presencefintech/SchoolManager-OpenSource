'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { Plus, RefreshCw, FileText, Ban, CheckCircle2 } from 'lucide-react'
import {
  useCreateExpense,
  useFinanceExpenses,
  usePostExpense,
  useVoidExpense,
} from '@/lib/hooks/use-finance'
import { FinancePageHeader, FinancePageShell } from '@/components/finance/finance-page-shell'
import { formatMoney } from '@/lib/finance/currency'
import { getApiErrorMessage } from '@/lib/api/client'
import { cn } from '@/lib/utils'
import type { CreateExpensePayload, ExpenseKind, ExpenseStatus, FinanceExpense } from '@/types/finance'

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

function todayIsoDate() {
  const d = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export default function DepensesPage() {
  const [status, setStatus] = useState<string>('')
  const [kind, setKind] = useState<string>('')
  const [showForm, setShowForm] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const filters = useMemo(
    () => ({
      status: status || undefined,
      kind: kind || undefined,
    }),
    [status, kind],
  )

  const { data, isLoading, isFetching, refetch } = useFinanceExpenses(filters)
  const createMut = useCreateExpense()
  const postMut = usePostExpense()
  const voidMut = useVoidExpense()

  const [form, setForm] = useState({
    kind: 'OPERATING' as ExpenseKind,
    category: '',
    label: '',
    amount: '',
    occurredAt: todayIsoDate(),
    affectsCash: true,
    vendor: '',
    reference: '',
    notes: '',
    postImmediately: true,
  })

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    const payload: CreateExpensePayload = {
      kind: form.kind,
      category: form.category.trim(),
      label: form.label.trim(),
      amount: Number(form.amount),
      occurredAt: form.occurredAt,
      affectsCash: form.affectsCash,
      vendor: form.vendor.trim() || null,
      reference: form.reference.trim() || null,
      notes: form.notes.trim() || null,
      postImmediately: form.postImmediately,
    }
    try {
      await createMut.mutateAsync(payload)
      setShowForm(false)
      setForm((f) => ({
        ...f,
        category: '',
        label: '',
        amount: '',
        vendor: '',
        reference: '',
        notes: '',
      }))
    } catch (err) {
      setError(getApiErrorMessage(err))
    }
  }

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
        subtitle="Alimente le burn rate et la variance opex du rapport de situation mensuelle (Expense POSTED uniquement)"
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
              <Plus size={14} /> Nouvelle dépense
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
        <form
          onSubmit={handleCreate}
          className="rounded-2xl border border-zinc-200 bg-white p-5 space-y-4"
        >
          <h2 className="text-sm font-bold text-zinc-900">Saisie d’une charge</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-xs font-medium text-zinc-500">
              Type
              <select
                value={form.kind}
                onChange={(e) => setForm((f) => ({ ...f, kind: e.target.value as ExpenseKind }))}
                className="mt-1 block w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
              >
                <option value="OPERATING">Opérationnelle (opex)</option>
                <option value="INVESTMENT">Investissement (capex)</option>
              </select>
            </label>
            <label className="text-xs font-medium text-zinc-500">
              Date
              <input
                type="date"
                required
                value={form.occurredAt}
                onChange={(e) => setForm((f) => ({ ...f, occurredAt: e.target.value }))}
                className="mt-1 block w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
              />
            </label>
            <label className="text-xs font-medium text-zinc-500">
              Catégorie
              <input
                required
                value={form.category}
                onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                placeholder="Salaires, IPR, Fournitures…"
                className="mt-1 block w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
              />
            </label>
            <label className="text-xs font-medium text-zinc-500">
              Montant (USD)
              <input
                required
                type="number"
                min={0.01}
                step="0.01"
                value={form.amount}
                onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
                className="mt-1 block w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
              />
            </label>
            <label className="text-xs font-medium text-zinc-500 sm:col-span-2">
              Libellé
              <input
                required
                value={form.label}
                onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))}
                placeholder="Paie enseignants — août"
                className="mt-1 block w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
              />
            </label>
            <label className="text-xs font-medium text-zinc-500">
              Fournisseur
              <input
                value={form.vendor}
                onChange={(e) => setForm((f) => ({ ...f, vendor: e.target.value }))}
                className="mt-1 block w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
              />
            </label>
            <label className="text-xs font-medium text-zinc-500">
              Référence pièce
              <input
                value={form.reference}
                onChange={(e) => setForm((f) => ({ ...f, reference: e.target.value }))}
                className="mt-1 block w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
              />
            </label>
            <label className="text-xs font-medium text-zinc-500 sm:col-span-2">
              Notes
              <textarea
                rows={2}
                value={form.notes}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                className="mt-1 block w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
              />
            </label>
          </div>
          <div className="flex flex-wrap gap-4 text-sm text-zinc-700">
            <label className="inline-flex items-center gap-2">
              <input
                type="checkbox"
                checked={form.affectsCash}
                onChange={(e) => setForm((f) => ({ ...f, affectsCash: e.target.checked }))}
                className="rounded border-zinc-300"
              />
              Sort de la caisse guichet (affectsCash)
            </label>
            <label className="inline-flex items-center gap-2">
              <input
                type="checkbox"
                checked={form.postImmediately}
                onChange={(e) => setForm((f) => ({ ...f, postImmediately: e.target.checked }))}
                className="rounded border-zinc-300"
              />
              Poster immédiatement (comptabilisée)
            </label>
          </div>
          <p className="text-[11px] text-zinc-400">
            Seules les dépenses validées (comptabilisées) figurent dans le rapport. La case « sort de
            la caisse » est cochée par défaut — décocher si la charge ne sort pas du tiroir.
          </p>
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={createMut.isPending}
              className="rounded-xl bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50"
            >
              {createMut.isPending ? 'Enregistrement…' : 'Enregistrer'}
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="rounded-xl border border-zinc-200 px-4 py-2 text-sm text-zinc-600"
            >
              Annuler
            </button>
          </div>
        </form>
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
                  Aucune dépense. Saisissez une charge POSTED pour activer le burn rate.
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
