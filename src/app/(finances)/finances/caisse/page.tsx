'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import {
  Banknote, CheckCircle, XCircle, Clock, RefreshCw, Lock, Unlock,
  TrendingUp, Download,
} from 'lucide-react'
import {
  useCurrentSession, useSessionSummary, useOpenSession,
  useCloseSession, useExportCashSession,
} from '@/lib/hooks/use-finance'
import { fadeUp } from '@/lib/animations'
import { getApiErrorMessage } from '@/lib/api/client'
import type { CashSession } from '@/types/finance'

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export default function CaissePage() {
  const { data: session, isLoading, refetch, error: sessionError } = useCurrentSession()
  const currentSession = session as CashSession | null | undefined
  const hasOpenSession = currentSession?.status === 'OPEN'

  const { data: summary } = useSessionSummary(currentSession?.id ?? 0)
  const { mutateAsync: openSession, isPending: opening } = useOpenSession()
  const { mutateAsync: closeSession, isPending: closing } = useCloseSession()
  const exportSession = useExportCashSession()

  const [openForm, setOpenForm] = useState({ openingFloat: '', openNotes: '' })
  const [closeForm, setCloseForm] = useState({ closingCounted: '', closeNotes: '' })
  const [openError, setOpenError] = useState<string | null>(null)
  const [closeError, setCloseError] = useState<string | null>(null)
  const [openSuccess, setOpenSuccess] = useState(false)
  const [closeSuccess, setCloseSuccess] = useState(false)

  const st = summary as any

  async function handleOpen(e: React.FormEvent) {
    e.preventDefault()
    setOpenError(null)
    try {
      await openSession({
        openingFloat: Number(openForm.openingFloat) || 0,
        openNotes: openForm.openNotes || undefined,
      })
      setOpenSuccess(true)
      setOpenForm({ openingFloat: '', openNotes: '' })
      refetch()
    } catch (err) {
      setOpenError(getApiErrorMessage(err))
    }
  }

  async function handleClose(e: React.FormEvent) {
    e.preventDefault()
    if (!currentSession?.id) return
    setCloseError(null)
    try {
      await closeSession({
        id: currentSession.id,
        payload: {
          closingCounted: Number(closeForm.closingCounted) || 0,
          closeNotes: closeForm.closeNotes || undefined,
        },
      })
      setCloseSuccess(true)
      setCloseForm({ closingCounted: '', closeNotes: '' })
      refetch()
    } catch (err) {
      setCloseError(getApiErrorMessage(err))
    }
  }

  async function handleExport() {
    if (!currentSession?.id) return
    try {
      const blob = await exportSession.mutateAsync(currentSession.id)
      downloadBlob(blob, `session-caisse-${currentSession.id}-${new Date().toISOString().slice(0, 10)}.csv`)
    } catch {}
  }

  return (
    <div className="px-8 py-8 space-y-6">
      <motion.div
        className="flex items-center justify-between"
        initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}
      >
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">Session de caisse</h1>
          <p className="text-sm text-zinc-500 mt-0.5">Ouverture, suivi et clôture de session</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => refetch()} className="p-2 rounded-xl border border-zinc-200 text-zinc-400 hover:bg-zinc-50">
            <RefreshCw size={14} />
          </button>
          {hasOpenSession && (
            <button
              onClick={handleExport}
              disabled={exportSession.isPending}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-zinc-200 text-xs text-zinc-600 hover:bg-zinc-50 disabled:opacity-40"
            >
              <Download size={12} /> Exporter session
            </button>
          )}
        </div>
      </motion.div>

      {/* État session actuelle */}
      <motion.div variants={fadeUp} initial="hidden" animate="show" className="bg-white rounded-2xl border border-zinc-100 shadow-sm p-5">
        <div className="flex items-center gap-3 mb-4">
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${hasOpenSession ? 'bg-emerald-50' : 'bg-zinc-100'}`}>
            {hasOpenSession ? <Unlock size={16} className="text-emerald-600" /> : <Lock size={16} className="text-zinc-400" />}
          </div>
          <div>
            <h2 className="text-sm font-semibold text-zinc-900">Session actuelle</h2>
            <p className="text-xs text-zinc-400">
              {isLoading ? 'Chargement…' : hasOpenSession
                ? `Session #${currentSession!.id} — ouverte à ${new Date(currentSession!.openedAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`
                : 'Aucune session ouverte'}
            </p>
          </div>
          <div className="ml-auto">
            <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${hasOpenSession ? 'bg-emerald-50 text-emerald-700' : 'bg-zinc-100 text-zinc-500'}`}>
              {hasOpenSession ? 'OUVERTE' : 'FERMÉE'}
            </span>
          </div>
        </div>

        {hasOpenSession && st?.byMethod && (
          <div className="grid grid-cols-4 gap-3 mt-3">
            {(st.byMethod as any[]).map((m: any, i: number) => (
              <div key={i} className="bg-zinc-50 rounded-xl p-3">
                <p className="text-xs text-zinc-400 mb-1">{m.method}</p>
                <p className="text-sm font-bold text-zinc-900">{Number(m.amount).toLocaleString('fr-FR')} F</p>
                <p className="text-xs text-zinc-400">{m.count} tx</p>
              </div>
            ))}
            <div className="bg-emerald-50 rounded-xl p-3 border border-emerald-100">
              <div className="flex items-center gap-1.5 mb-1">
                <TrendingUp size={11} className="text-emerald-600" />
                <p className="text-xs text-emerald-600">Total encaissé</p>
              </div>
              <p className="text-sm font-bold text-emerald-700">{Number(st.totalCollected ?? 0).toLocaleString('fr-FR')} F</p>
              <p className="text-xs text-emerald-600">{st.transactionCount ?? 0} transactions</p>
            </div>
          </div>
        )}
      </motion.div>

      <div className="grid grid-cols-2 gap-6">
        {/* Ouvrir une session */}
        {!hasOpenSession && (
          <motion.div variants={fadeUp} initial="hidden" animate="show" className="bg-white rounded-2xl border border-zinc-100 shadow-sm p-6">
            <div className="flex items-center gap-2 mb-5">
              <CheckCircle size={15} className="text-emerald-600" />
              <h2 className="text-sm font-semibold text-zinc-900">Ouvrir une session</h2>
            </div>
            {openSuccess && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-emerald-50 border border-emerald-100 mb-4">
                <CheckCircle size={13} className="text-emerald-600" />
                <p className="text-sm text-emerald-700">Session ouverte avec succès</p>
              </div>
            )}
            <form onSubmit={handleOpen} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-zinc-500 mb-1">Fond de caisse à l'ouverture (FCFA)</label>
                <input
                  type="number" min={0}
                  value={openForm.openingFloat}
                  onChange={e => setOpenForm(p => ({ ...p, openingFloat: e.target.value }))}
                  placeholder="0"
                  className="w-full px-3 py-2 rounded-lg border border-zinc-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-500 mb-1">Notes</label>
                <input
                  value={openForm.openNotes}
                  onChange={e => setOpenForm(p => ({ ...p, openNotes: e.target.value }))}
                  placeholder="Optionnel"
                  className="w-full px-3 py-2 rounded-lg border border-zinc-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
                />
              </div>
              {openError && <p className="text-xs text-red-500 bg-red-50 rounded-lg px-3 py-2">{openError}</p>}
              <button
                type="submit" disabled={opening}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 text-sm text-white font-medium hover:bg-emerald-700 disabled:opacity-50"
              >
                <Unlock size={14} />
                {opening ? 'Ouverture…' : 'Ouvrir la session'}
              </button>
            </form>
          </motion.div>
        )}

        {/* Clôturer la session */}
        {hasOpenSession && (
          <motion.div variants={fadeUp} initial="hidden" animate="show" className="bg-white rounded-2xl border border-zinc-100 shadow-sm p-6">
            <div className="flex items-center gap-2 mb-5">
              <Lock size={15} className="text-red-500" />
              <h2 className="text-sm font-semibold text-zinc-900">Clôturer la session</h2>
            </div>
            {closeSuccess && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-emerald-50 border border-emerald-100 mb-4">
                <CheckCircle size={13} className="text-emerald-600" />
                <p className="text-sm text-emerald-700">Session clôturée</p>
              </div>
            )}
            <form onSubmit={handleClose} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-zinc-500 mb-1">Caisse comptée à la clôture (FCFA)</label>
                <input
                  type="number" min={0}
                  value={closeForm.closingCounted}
                  onChange={e => setCloseForm(p => ({ ...p, closingCounted: e.target.value }))}
                  placeholder="0"
                  className="w-full px-3 py-2 rounded-lg border border-zinc-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-500 mb-1">Notes de clôture</label>
                <textarea
                  value={closeForm.closeNotes}
                  onChange={e => setCloseForm(p => ({ ...p, closeNotes: e.target.value }))}
                  rows={2} placeholder="Observations, écarts…"
                  className="w-full px-3 py-2 rounded-lg border border-zinc-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 resize-none"
                />
              </div>
              {closeError && <p className="text-xs text-red-500 bg-red-50 rounded-lg px-3 py-2">{closeError}</p>}
              <button
                type="submit" disabled={closing}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-red-600 text-sm text-white font-medium hover:bg-red-700 disabled:opacity-50"
              >
                <Lock size={14} />
                {closing ? 'Clôture…' : 'Clôturer la session'}
              </button>
            </form>
          </motion.div>
        )}

        {/* Info session */}
        {hasOpenSession && currentSession && (
          <motion.div variants={fadeUp} initial="hidden" animate="show" className="bg-white rounded-2xl border border-zinc-100 shadow-sm p-6">
            <div className="flex items-center gap-2 mb-5">
              <Banknote size={15} className="text-zinc-400" />
              <h2 className="text-sm font-semibold text-zinc-900">Détails de la session</h2>
            </div>
            <div className="space-y-3">
              {[
                ['ID session', `#${currentSession.id}`],
                ['Statut', currentSession.status],
                ['Ouverture', new Date(currentSession.openedAt).toLocaleString('fr-FR')],
                ...(currentSession.openingBalance != null ? [['Solde ouverture', `${Number(currentSession.openingBalance).toLocaleString('fr-FR')} F`] as [string, string]] : []),
                ...(currentSession.notes ? [['Notes', currentSession.notes] as [string, string]] : []),
                ...(currentSession.cashierName ? [['Caissier', currentSession.cashierName] as [string, string]] : []),
              ].map(([k, v]) => (
                <div key={k} className="flex items-center justify-between py-2 border-b border-zinc-50 last:border-0">
                  <span className="text-xs text-zinc-500">{k}</span>
                  <span className="text-xs font-semibold text-zinc-800">{v}</span>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </div>
    </div>
  )
}
