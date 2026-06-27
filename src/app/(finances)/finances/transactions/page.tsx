'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Search, RefreshCw } from 'lucide-react'
import { useSearchTransactions } from '@/lib/hooks/use-finance'
import { fadeUp } from '@/lib/animations'

const STATUS_CFG: Record<string, { label: string; cls: string }> = {
  PENDING:   { label: 'En attente', cls: 'bg-amber-50 text-amber-700' },
  VALIDATED: { label: 'Validé',     cls: 'bg-emerald-50 text-emerald-700' },
  REJECTED:  { label: 'Rejeté',     cls: 'bg-red-50 text-red-700' },
}

type SearchParams = {
  status?: string
  studentId?: number
  startDate?: string
  endDate?: string
  limit: number
  page: number
}

export default function TransactionsPage() {
  const [draft, setDraft] = useState({ status: '', studentId: '', startDate: '', endDate: '', limit: '20' })
  const [params, setParams] = useState<SearchParams>({ limit: 20, page: 1 })
  const [searched, setSearched] = useState(false)

  const { data: results, isLoading, refetch } = useSearchTransactions(params)

  const transactions: any[] = (results as any)?.data ?? (Array.isArray(results) ? results : [])
  const total: number = (results as any)?.total ?? transactions.length

  function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    setParams({
      status: draft.status || undefined,
      studentId: draft.studentId ? Number(draft.studentId) : undefined,
      startDate: draft.startDate || undefined,
      endDate: draft.endDate || undefined,
      limit: Number(draft.limit) || 20,
      page: 1,
    })
    setSearched(true)
  }

  function handlePage(p: number) {
    setParams(prev => ({ ...prev, page: p }))
  }

  return (
    <div className="px-8 py-8 space-y-6">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
        <h1 className="text-2xl font-bold text-zinc-900">Transactions</h1>
        <p className="text-sm text-zinc-500 mt-0.5">Recherche multicritères de paiements</p>
      </motion.div>

      {/* Formulaire de recherche */}
      <motion.div variants={fadeUp} initial="hidden" animate="show" className="bg-white rounded-2xl border border-zinc-100 shadow-sm p-5">
        <form onSubmit={handleSearch} className="space-y-4">
          <div className="grid grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-medium text-zinc-500 mb-1">Statut</label>
              <select
                value={draft.status}
                onChange={e => setDraft(p => ({ ...p, status: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg border border-zinc-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
              >
                <option value="">Tous</option>
                <option value="PENDING">En attente</option>
                <option value="VALIDATED">Validé</option>
                <option value="REJECTED">Rejeté</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-500 mb-1">ID Élève</label>
              <input
                type="number" min={1}
                value={draft.studentId}
                onChange={e => setDraft(p => ({ ...p, studentId: e.target.value }))}
                placeholder="Optionnel"
                className="w-full px-3 py-2 rounded-lg border border-zinc-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-500 mb-1">Date début</label>
              <input
                type="date"
                value={draft.startDate}
                onChange={e => setDraft(p => ({ ...p, startDate: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg border border-zinc-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-500 mb-1">Date fin</label>
              <input
                type="date"
                value={draft.endDate}
                onChange={e => setDraft(p => ({ ...p, endDate: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg border border-zinc-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
              />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div>
              <label className="block text-xs font-medium text-zinc-500 mb-1">Résultats par page</label>
              <select
                value={draft.limit}
                onChange={e => setDraft(p => ({ ...p, limit: e.target.value }))}
                className="px-3 py-2 rounded-lg border border-zinc-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
              >
                <option value="10">10</option>
                <option value="20">20</option>
                <option value="50">50</option>
              </select>
            </div>
            <div className="flex gap-2 mt-5">
              <button
                type="submit"
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 text-sm text-white font-medium hover:bg-emerald-700"
              >
                <Search size={14} />
                Rechercher
              </button>
              {searched && (
                <button
                  type="button"
                  onClick={() => refetch()}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-zinc-200 text-sm text-zinc-600 hover:bg-zinc-50"
                >
                  <RefreshCw size={13} />
                  Actualiser
                </button>
              )}
            </div>
          </div>
        </form>
      </motion.div>

      {/* Résultats */}
      {searched && (
        <div className="bg-white rounded-2xl border border-zinc-100 shadow-sm">
          <div className="px-5 py-4 border-b border-zinc-100 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-zinc-900">Résultats</h2>
            {!isLoading && <span className="text-xs text-zinc-400">{total} transaction(s)</span>}
          </div>

          {isLoading ? (
            <div className="p-5 space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-10 rounded-xl bg-zinc-100 animate-pulse" />
              ))}
            </div>
          ) : transactions.length === 0 ? (
            <div className="py-12 text-center">
              <Search size={24} className="mx-auto text-zinc-300 mb-2" />
              <p className="text-sm text-zinc-400">Aucune transaction trouvée</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-zinc-100 bg-zinc-50/50">
                      <th className="text-left px-5 py-3 text-xs font-semibold text-zinc-500">ID</th>
                      <th className="text-left px-5 py-3 text-xs font-semibold text-zinc-500">Élève</th>
                      <th className="text-right px-5 py-3 text-xs font-semibold text-zinc-500">Montant</th>
                      <th className="text-left px-5 py-3 text-xs font-semibold text-zinc-500">Méthode</th>
                      <th className="text-left px-5 py-3 text-xs font-semibold text-zinc-500">Statut</th>
                      <th className="text-left px-5 py-3 text-xs font-semibold text-zinc-500">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {transactions.map((t: any) => {
                      const sc = STATUS_CFG[t.status] ?? { label: t.status, cls: 'bg-zinc-100 text-zinc-500' }
                      return (
                        <tr key={t.id} className="border-b border-zinc-50 hover:bg-zinc-50/50">
                          <td className="px-5 py-3.5 text-zinc-400 font-mono text-xs">{t.id}</td>
                          <td className="px-5 py-3.5 font-medium text-zinc-900">
                            {t.student ? `${t.student.firstName} ${t.student.lastName}` : t.studentId ?? '—'}
                          </td>
                          <td className="px-5 py-3.5 text-right font-semibold text-zinc-900">
                            {t.amount != null ? `${Number(t.amount).toLocaleString('fr-FR')} F` : '—'}
                          </td>
                          <td className="px-5 py-3.5">
                            <span className="text-xs px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-600">{t.method ?? '—'}</span>
                          </td>
                          <td className="px-5 py-3.5">
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${sc.cls}`}>{sc.label}</span>
                          </td>
                          <td className="px-5 py-3.5 text-zinc-400 text-xs">
                            {t.createdAt ? new Date(t.createdAt).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' }) : '—'}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              {/* Pagination simple */}
              {(results as any)?.totalPages > 1 && (
                <div className="flex items-center justify-between px-5 py-3 border-t border-zinc-100">
                  <p className="text-xs text-zinc-400">Page {params.page} / {(results as any).totalPages}</p>
                  <div className="flex gap-1">
                    <button
                      disabled={params.page <= 1}
                      onClick={() => handlePage(params.page - 1)}
                      className="px-3 py-1.5 rounded-lg border border-zinc-200 text-xs text-zinc-600 hover:bg-zinc-50 disabled:opacity-40"
                    >
                      Précédent
                    </button>
                    <button
                      disabled={params.page >= (results as any).totalPages}
                      onClick={() => handlePage(params.page + 1)}
                      className="px-3 py-1.5 rounded-lg border border-zinc-200 text-xs text-zinc-600 hover:bg-zinc-50 disabled:opacity-40"
                    >
                      Suivant
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}
