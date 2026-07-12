'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import {
  Search, RefreshCw, Download, Filter, ChevronLeft, ChevronRight,
} from 'lucide-react'
import { useSearchTransactions } from '@/lib/hooks/use-finance'
import { FinanceStudentSearchField } from '@/components/finance/student-search-field'
import { FinancePageHeader, FinancePageShell, FinancePanel, FinanceEmptyState } from '@/components/finance/finance-page-shell'
import { StudentFeeScheduleLink } from '@/components/finance/student-fee-schedule-link'
import { PrintReceiptButton } from '@/components/finance/student-dashboard/receipts/PrintReceiptButton'
import { exportRowsToCsv } from '@/lib/finance/export-csv'
import { fadeUp } from '@/lib/animations'
import { formatMoney } from '@/lib/finance/currency'
import { Skeleton } from '@/components/ui/skeleton'

const METHOD_LABEL: Record<string, string> = {
  CASH: 'Espèces',
  BANK: 'Virement',
  ORANGE_MONEY: 'Orange Money',
  MPESA: 'M-Pesa',
  AIRTEL_MONEY: 'Airtel Money',
  CARD: 'Carte',
}

const STATUS_CFG: Record<string, { label: string; cls: string }> = {
  PENDING: { label: 'En attente', cls: 'bg-amber-50 text-amber-700 ring-amber-100' },
  CONFIRMED: { label: 'Confirmé', cls: 'bg-emerald-50 text-emerald-700 ring-emerald-100' },
  VALIDATED: { label: 'Validé', cls: 'bg-emerald-50 text-emerald-700 ring-emerald-100' },
  RECONCILED: { label: 'Réconcilié', cls: 'bg-sky-50 text-sky-700 ring-sky-100' },
  REJECTED: { label: 'Rejeté', cls: 'bg-red-50 text-red-700 ring-red-100' },
  FAILED: { label: 'Échoué', cls: 'bg-red-50 text-red-700 ring-red-100' },
  REFUNDED: { label: 'Remboursé', cls: 'bg-violet-50 text-violet-700 ring-violet-100' },
}

type TxRow = {
  id: number
  studentId?: number
  student?: { id?: number; firstName?: string; lastName?: string; matricule?: string; class?: { name?: string } }
  amount?: number
  method?: string
  status?: string
  reference?: string
  createdAt?: string
}

type SearchParams = {
  status?: string
  studentId?: number
  startDate?: string
  endDate?: string
  limit: number
  page: number
}

const QUICK_FILTERS = [
  { label: "Aujourd'hui", status: 'CONFIRMED' },
  { label: 'En attente', status: 'PENDING' },
  { label: 'Tous confirmés', status: 'CONFIRMED' },
] as const

export default function TransactionsPage() {
  const today = new Date().toISOString().slice(0, 10)
  const [draft, setDraft] = useState({
    status: '',
    method: '',
    studentId: 0,
    startDate: today,
    endDate: today,
    limit: '25',
  })
  const [params, setParams] = useState<SearchParams>({
    startDate: today,
    endDate: today,
    limit: 25,
    page: 1,
  })
  const [searched, setSearched] = useState(true)

  const { data: results, isLoading, isFetching, refetch } = useSearchTransactions(params)

  const rawTransactions: TxRow[] = (results as { data?: TxRow[] })?.data ?? (Array.isArray(results) ? results : [])
  const transactions = useMemo(
    () => (draft.method ? rawTransactions.filter((t) => t.method === draft.method) : rawTransactions),
    [rawTransactions, draft.method],
  )
  const total: number = (results as { total?: number })?.total ?? transactions.length
  const totalPages: number = (results as { totalPages?: number; lastPage?: number })?.totalPages
    ?? (results as { lastPage?: number })?.lastPage
    ?? 1

  const totalAmount = useMemo(
    () => transactions.reduce((acc, t) => acc + (Number(t.amount) || 0), 0),
    [transactions],
  )

  function applySearch(overrides?: Partial<typeof draft> & { page?: number }) {
    const next = { ...draft, ...overrides }
    setDraft(next)
    setParams({
      status: next.status || undefined,
      studentId: next.studentId > 0 ? next.studentId : undefined,
      startDate: next.startDate || undefined,
      endDate: next.endDate || undefined,
      limit: Number(next.limit) || 25,
      page: overrides?.page ?? 1,
    })
    setSearched(true)
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    applySearch({ page: 1 })
  }

  function handleExport() {
    exportRowsToCsv(
      transactions.map((t) => ({
        id: t.id,
        eleve: t.student
          ? `${t.student.firstName ?? ''} ${t.student.lastName ?? ''}`.trim()
          : t.studentId ?? '',
        matricule: t.student?.matricule ?? '',
        montant: t.amount ?? '',
        methode: METHOD_LABEL[t.method ?? ''] ?? t.method ?? '',
        statut: t.status ?? '',
        reference: t.reference ?? '',
        date: t.createdAt ? new Date(t.createdAt).toLocaleString('fr-FR') : '',
      })),
      `transactions-${new Date().toISOString().slice(0, 10)}.csv`,
    )
  }

  return (
    <FinancePageShell>
      <FinancePageHeader
        title="Transactions"
        subtitle="Recherche multicritères, export et accès fiche élève — registre ERP RDC"
        actions={
          <>
            <button
              type="button"
              onClick={() => refetch()}
              className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-600 hover:bg-zinc-50"
            >
              <RefreshCw size={14} className={isFetching ? 'animate-spin' : ''} />
              Actualiser
            </button>
            {transactions.length > 0 && (
              <button
                type="button"
                onClick={handleExport}
                className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
              >
                <Download size={14} />
                Export CSV
              </button>
            )}
          </>
        }
      />

      <motion.div variants={fadeUp} initial="hidden" animate="show">
        <FinancePanel title="Filtres de recherche" icon={Filter}>
          <form onSubmit={handleSearch} className="space-y-4 p-5">
            <div className="flex flex-wrap gap-2">
              {QUICK_FILTERS.map((f) => (
                <button
                  key={f.label}
                  type="button"
                  onClick={() => applySearch({ status: f.status, startDate: today, endDate: today, page: 1 })}
                  className="rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1 text-xs font-medium text-zinc-600 hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700"
                >
                  {f.label}
                </button>
              ))}
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <label className="mb-1 block text-xs font-medium text-zinc-500">Statut</label>
                <select
                  value={draft.status}
                  onChange={(e) => setDraft((p) => ({ ...p, status: e.target.value }))}
                  className="w-full rounded-xl border border-zinc-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400/40"
                >
                  <option value="">Tous</option>
                  <option value="PENDING">En attente</option>
                  <option value="CONFIRMED">Confirmé</option>
                  <option value="RECONCILED">Réconcilié</option>
                  <option value="REJECTED">Rejeté</option>
                  <option value="FAILED">Échoué</option>
                  <option value="REFUNDED">Remboursé</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-zinc-500">Méthode</label>
                <select
                  value={draft.method}
                  onChange={(e) => setDraft((p) => ({ ...p, method: e.target.value }))}
                  className="w-full rounded-xl border border-zinc-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400/40"
                >
                  <option value="">Toutes</option>
                  {Object.entries(METHOD_LABEL).map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-zinc-500">Date début</label>
                <input
                  type="date"
                  value={draft.startDate}
                  onChange={(e) => setDraft((p) => ({ ...p, startDate: e.target.value }))}
                  className="w-full rounded-xl border border-zinc-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400/40"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-zinc-500">Date fin</label>
                <input
                  type="date"
                  value={draft.endDate}
                  onChange={(e) => setDraft((p) => ({ ...p, endDate: e.target.value }))}
                  className="w-full rounded-xl border border-zinc-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400/40"
                />
              </div>
            </div>

            <FinanceStudentSearchField
              studentId={draft.studentId}
              onSelect={(id) => setDraft((p) => ({ ...p, studentId: id }))}
              label="Élève (optionnel)"
            />

            <div className="flex flex-wrap items-end gap-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-zinc-500">Par page</label>
                <select
                  value={draft.limit}
                  onChange={(e) => setDraft((p) => ({ ...p, limit: e.target.value }))}
                  className="rounded-xl border border-zinc-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400/40"
                >
                  <option value="10">10</option>
                  <option value="25">25</option>
                  <option value="50">50</option>
                  <option value="100">100</option>
                </select>
              </div>
              <button
                type="submit"
                className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-emerald-700"
              >
                <Search size={15} />
                Rechercher
              </button>
            </div>
          </form>
        </FinancePanel>
      </motion.div>

      {searched && (
        <FinancePanel
          title="Résultats"
          icon={Search}
          headerRight={
            !isLoading ? (
              <div className="flex items-center gap-3 text-xs">
                <span className="text-zinc-500">{total} transaction(s)</span>
                {transactions.length > 0 && (
                  <span className="font-semibold text-emerald-700 tabular-nums">
                    {formatMoney(totalAmount)}
                  </span>
                )}
              </div>
            ) : null
          }
        >
          {isLoading ? (
            <div className="space-y-3 p-5">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-12 rounded-lg" />
              ))}
            </div>
          ) : transactions.length === 0 ? (
            <FinanceEmptyState
              icon={Search}
              title="Aucune transaction"
              description="Modifiez les filtres ou élargissez la période de recherche."
            />
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-zinc-100 bg-zinc-50/60">
                      <th className="px-5 py-3 text-left text-xs font-semibold text-zinc-500">#</th>
                      <th className="px-5 py-3 text-left text-xs font-semibold text-zinc-500">Élève</th>
                      <th className="px-5 py-3 text-right text-xs font-semibold text-zinc-500">Montant</th>
                      <th className="px-5 py-3 text-left text-xs font-semibold text-zinc-500">Méthode</th>
                      <th className="px-5 py-3 text-left text-xs font-semibold text-zinc-500">Statut</th>
                      <th className="px-5 py-3 text-left text-xs font-semibold text-zinc-500">Référence</th>
                      <th className="px-5 py-3 text-left text-xs font-semibold text-zinc-500">Date</th>
                      <th className="px-5 py-3 text-right text-xs font-semibold text-zinc-500">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-50">
                    {transactions.map((t) => {
                      const sid = Number(t.student?.id ?? t.studentId ?? 0)
                      const sc = STATUS_CFG[t.status ?? ''] ?? {
                        label: t.status ?? '—',
                        cls: 'bg-zinc-100 text-zinc-600 ring-zinc-200',
                      }
                      const studentName = t.student
                        ? `${t.student.firstName ?? ''} ${t.student.lastName ?? ''}`.trim()
                        : null

                      return (
                        <tr key={t.id} className="hover:bg-zinc-50/50">
                          <td className="px-5 py-3.5 font-mono text-xs text-zinc-400">{t.id}</td>
                          <td className="px-5 py-3.5">
                            {sid > 0 ? (
                              <Link
                                href={`/finances/eleves/${sid}`}
                                className="font-medium text-zinc-900 hover:text-emerald-700"
                              >
                                {studentName || `Élève #${sid}`}
                              </Link>
                            ) : (
                              <span className="text-zinc-500">—</span>
                            )}
                            {t.student?.matricule && (
                              <p className="text-xs text-zinc-400">{t.student.matricule}</p>
                            )}
                            {t.student?.class?.name && (
                              <p className="text-xs text-zinc-400">{t.student.class.name}</p>
                            )}
                          </td>
                          <td className="px-5 py-3.5 text-right font-semibold tabular-nums text-zinc-900">
                            {t.amount != null ? formatMoney(Number(t.amount)) : '—'}
                          </td>
                          <td className="px-5 py-3.5">
                            <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-600">
                              {METHOD_LABEL[t.method ?? ''] ?? t.method ?? '—'}
                            </span>
                          </td>
                          <td className="px-5 py-3.5">
                            <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ring-1 ${sc.cls}`}>
                              {sc.label}
                            </span>
                          </td>
                          <td className="max-w-[120px] truncate px-5 py-3.5 font-mono text-xs text-zinc-400">
                            {t.reference ?? '—'}
                          </td>
                          <td className="px-5 py-3.5 text-xs text-zinc-500">
                            {t.createdAt
                              ? new Date(t.createdAt).toLocaleString('fr-FR', {
                                  day: '2-digit',
                                  month: 'short',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })
                              : '—'}
                          </td>
                          <td className="px-5 py-3.5">
                            <div className="flex items-center justify-end gap-2">
                              {sid > 0 && <StudentFeeScheduleLink studentId={sid} />}
                              {(t.status === 'CONFIRMED' || t.status === 'RECONCILED') && (
                                <PrintReceiptButton paymentId={t.id} />
                              )}
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              {totalPages > 1 && (
                <div className="flex items-center justify-between border-t border-zinc-100 px-5 py-3">
                  <p className="text-xs text-zinc-400">
                    Page {params.page} / {totalPages}
                  </p>
                  <div className="flex gap-1">
                    <button
                      type="button"
                      disabled={params.page <= 1}
                      onClick={() => setParams((p) => ({ ...p, page: p.page - 1 }))}
                      className="rounded-lg border border-zinc-200 p-2 text-zinc-500 hover:bg-zinc-50 disabled:opacity-40"
                    >
                      <ChevronLeft size={14} />
                    </button>
                    <button
                      type="button"
                      disabled={params.page >= totalPages}
                      onClick={() => setParams((p) => ({ ...p, page: p.page + 1 }))}
                      className="rounded-lg border border-zinc-200 p-2 text-zinc-500 hover:bg-zinc-50 disabled:opacity-40"
                    >
                      <ChevronRight size={14} />
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </FinancePanel>
      )}
    </FinancePageShell>
  )
}
