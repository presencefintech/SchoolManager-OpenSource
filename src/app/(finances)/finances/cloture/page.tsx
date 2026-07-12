'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { CheckCircle, AlertCircle, Clock, RefreshCw, Bell, Download } from 'lucide-react'
import {
  useClosingPreview, useFinalizeClosing, useTriggerDebtReminders,
  useExportPayments, useCurrentSession,
} from '@/lib/hooks/use-finance'
import { fadeUp } from '@/lib/animations'
import { getApiErrorMessage } from '@/lib/api/client'
import { Skeleton } from '@/components/ui/skeleton'
import { formatMoney } from '@/lib/finance/currency'
import { FinancePageHeader, FinancePageShell, FinancePanel } from '@/components/finance/finance-page-shell'

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export default function CloturePage() {
  const { data: preview, isLoading, refetch } = useClosingPreview()
  const { data: session } = useCurrentSession()
  const { mutateAsync: finalize, isPending: finalizing } = useFinalizeClosing()
  const { mutateAsync: triggerReminders, isPending: triggering } = useTriggerDebtReminders()
  const exportPay = useExportPayments()

  const [notes, setNotes] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [reminderDone, setReminderDone] = useState(false)

  const pv = preview as any
  const currentSession = session as any
  const canFinalize = pv?.canFinalize === true

  async function handleFinalize(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    try {
      await finalize({ notes: notes || undefined })
      setSuccess(true)
      refetch()
    } catch (err) {
      setError(getApiErrorMessage(err))
    }
  }

  async function handleExport() {
    try {
      const blob = await exportPay.mutateAsync()
      downloadBlob(blob, `paiements-${new Date().toISOString().slice(0, 10)}.csv`)
    } catch {}
  }

  async function handleReminders() {
    try {
      await triggerReminders()
      setReminderDone(true)
    } catch {}
  }

  return (
    <FinancePageShell>
      <FinancePageHeader
        title="Clôture journalière"
        subtitle="Aperçu, finalisation et exports de fin de journée"
        actions={
          <button
            type="button"
            onClick={() => refetch()}
            className="rounded-xl border border-zinc-200 p-2 text-zinc-400 hover:bg-zinc-50"
          >
            <RefreshCw size={14} />
          </button>
        }
      />

      {success && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-emerald-50 border border-emerald-100">
          <CheckCircle size={15} className="text-emerald-600" />
          <p className="text-sm text-emerald-700 font-medium">Clôture finalisée avec succès</p>
        </div>
      )}

      {/* Aperçu */}
      <FinancePanel
        title="Aperçu de la journée"
        icon={Clock}
        headerRight={
          pv?.date ? (
            <span className="text-xs text-zinc-400">
              {new Date(pv.date).toLocaleDateString('fr-FR')}
            </span>
          ) : undefined
        }
      >
        {isLoading ? (
          <div className="p-5 space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-8" />)}</div>
        ) : pv ? (
          <div className="p-5 space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-emerald-50 rounded-xl p-4 border border-emerald-100">
                <p className="text-xs text-emerald-600 mb-1">Total encaissé</p>
                <p className="text-xl font-bold text-emerald-700">{formatMoney(Number(pv.totalCash ?? 0))}</p>
              </div>
              <div className="bg-zinc-50 rounded-xl p-4 border border-zinc-100">
                <p className="text-xs text-zinc-500 mb-1">Transactions</p>
                <p className="text-xl font-bold text-zinc-800">{pv.transactionCount ?? 0}</p>
              </div>
              <div className={`rounded-xl p-4 border ${(pv.pendingCount ?? 0) > 0 ? 'bg-amber-50 border-amber-100' : 'bg-zinc-50 border-zinc-100'}`}>
                <p className={`text-xs mb-1 ${(pv.pendingCount ?? 0) > 0 ? 'text-amber-600' : 'text-zinc-500'}`}>En attente</p>
                <p className={`text-xl font-bold ${(pv.pendingCount ?? 0) > 0 ? 'text-amber-700' : 'text-zinc-800'}`}>{pv.pendingCount ?? 0}</p>
              </div>
            </div>

            {pv.totalByMethod && Object.keys(pv.totalByMethod).length > 0 && (
              <div>
                <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-3">Répartition par méthode</p>
                <div className="space-y-2">
                  {Object.entries(pv.totalByMethod as Record<string, number>).map(([method, amount]) => (
                    <div key={method} className="flex items-center justify-between py-1.5 border-b border-zinc-50 last:border-0">
                      <span className="text-sm text-zinc-600">{method}</span>
                      <span className="text-sm font-semibold text-zinc-900">{formatMoney(Number(amount))}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {!canFinalize && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-amber-50 border border-amber-100">
                <AlertCircle size={14} className="text-amber-500" />
                <p className="text-xs text-amber-700">
                  {(pv.pendingCount ?? 0) > 0
                    ? `${pv.pendingCount} paiements en attente — veuillez les traiter avant la clôture.`
                    : 'La clôture n\'est pas disponible pour le moment.'}
                </p>
              </div>
            )}
          </div>
        ) : (
          <div className="py-10 text-center">
            <Clock size={24} className="mx-auto text-zinc-300 mb-2" />
            <p className="text-sm text-zinc-400">Aucun aperçu disponible</p>
          </div>
        )}
      </FinancePanel>

      <div className="grid grid-cols-2 gap-6">
        {/* Finaliser */}
        <motion.div variants={fadeUp} initial="hidden" animate="show" className="bg-white rounded-2xl border border-zinc-100 shadow-sm p-6">
          <h2 className="text-sm font-semibold text-zinc-900 mb-5">Finaliser la clôture</h2>
          {!canFinalize && !success && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-amber-50 border border-amber-100 mb-4">
              <AlertCircle size={13} className="text-amber-500" />
              <p className="text-xs text-amber-700">Clôture non disponible — traitez d'abord tous les paiements en attente.</p>
            </div>
          )}
          <form onSubmit={handleFinalize} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-zinc-500 mb-1">Notes de clôture</label>
              <textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                rows={3}
                placeholder="Observations du jour, incidents, remarques…"
                className="w-full px-3 py-2 rounded-lg border border-zinc-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 resize-none"
              />
            </div>
            {error && <p className="text-xs text-red-500 bg-red-50 rounded-lg px-3 py-2">{error}</p>}
            <button
              type="submit"
              disabled={finalizing || !canFinalize || success}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 text-sm text-white font-medium hover:bg-emerald-700 disabled:opacity-40"
            >
              <CheckCircle size={14} />
              {finalizing ? 'Finalisation…' : 'Finaliser la clôture'}
            </button>
          </form>
        </motion.div>

        {/* Actions */}
        <motion.div variants={fadeUp} initial="hidden" animate="show" className="bg-white rounded-2xl border border-zinc-100 shadow-sm p-6">
          <h2 className="text-sm font-semibold text-zinc-900 mb-5">Actions de fin de journée</h2>
          <div className="space-y-3">
            <button
              onClick={handleExport}
              disabled={exportPay.isPending}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border border-zinc-200 text-sm text-zinc-700 hover:bg-zinc-50 disabled:opacity-40 transition-colors text-left"
            >
              <Download size={15} className="text-zinc-400 flex-shrink-0" />
              <div>
                <p className="font-medium">Exporter les paiements</p>
                <p className="text-xs text-zinc-400">CSV de tous les paiements du jour</p>
              </div>
            </button>

            <button
              onClick={handleReminders}
              disabled={triggering || reminderDone}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border border-zinc-200 text-sm text-zinc-700 hover:bg-zinc-50 disabled:opacity-40 transition-colors text-left"
            >
              <Bell size={15} className={`flex-shrink-0 ${reminderDone ? 'text-emerald-500' : 'text-zinc-400'}`} />
              <div>
                <p className="font-medium">{reminderDone ? 'Relances envoyées' : 'Envoyer les relances de dettes'}</p>
                <p className="text-xs text-zinc-400">Notifie les débiteurs par SMS / email</p>
              </div>
            </button>
          </div>
        </motion.div>
      </div>
    </FinancePageShell>
  )
}
