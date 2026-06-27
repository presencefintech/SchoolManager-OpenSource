'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Plus, CheckCircle, Ban, TrendingUp, Calendar } from 'lucide-react'
import {
  useMoratoriums, useCreateMoratorium, useCreateBulkMoratoriums,
  useRevokeMoratorium, useMoratoriumRecoveryRate,
} from '@/lib/hooks/use-admin'
import type { CreateMoratoriumPayload, BulkMoratoriumPayload } from '@/types/admin'
import { Skeleton } from '@/components/ui/skeleton'
 import { getApiErrorMessage } from '@/lib/api/client'

function Sk({ className }: { className?: string }) {
  return <div className={`rounded-xl bg-zinc-100 animate-pulse ${className ?? ''}`} />
}

const STATUS_CFG: Record<string, { label: string; cls: string }> = {
  ACTIVE:  { label: 'Actif',    cls: 'bg-emerald-50 text-emerald-700' },
  EXPIRED: { label: 'Expiré',  cls: 'bg-zinc-100 text-zinc-500' },
  REVOKED: { label: 'Révoqué', cls: 'bg-red-50 text-red-700' },
}

const TYPE_LABEL: Record<string, string> = {
  PAYMENT_PLAN: 'Plan de paiement',
  DEBT_FREEZE:  'Gel de dette',
  GRACE_PERIOD: 'Période de grâce',
}

function MoratoriumModal({ onClose }: { onClose: () => void }) {
  const { mutateAsync, isPending } = useCreateMoratorium()
  const [form, setForm] = useState<CreateMoratoriumPayload>({ studentId: 0, type: 'PAYMENT_PLAN', startDate: '', endDate: '', reason: '' })
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    try { await mutateAsync(form); setSuccess(true) }
    catch (err) { setError(getApiErrorMessage(err)) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 mx-4">
        <h2 className="text-lg font-semibold text-zinc-900 mb-5">Nouveau moratoire</h2>
        {success ? (
          <div className="text-center py-6">
            <CheckCircle size={20} className="mx-auto text-emerald-600 mb-2" />
            <p className="text-sm text-zinc-800">Moratoire créé</p>
            <button onClick={onClose} className="mt-4 px-4 py-2 rounded-xl bg-emerald-600 text-sm text-white">Fermer</button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-zinc-500 mb-1">ID Élève *</label>
              <input type="number" required min={1} value={form.studentId || ''}
                onChange={e => setForm(p => ({ ...p, studentId: Number(e.target.value) }))}
                className="w-full px-3 py-2 rounded-lg border border-zinc-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400" />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-500 mb-1">Type *</label>
              <select value={form.type} onChange={e => setForm(p => ({ ...p, type: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg border border-zinc-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400">
                <option value="PAYMENT_PLAN">Plan de paiement</option>
                <option value="DEBT_FREEZE">Gel de dette</option>
                <option value="GRACE_PERIOD">Période de grâce</option>
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-zinc-500 mb-1">Date début *</label>
                <input type="date" required value={form.startDate} onChange={e => setForm(p => ({ ...p, startDate: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg border border-zinc-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400" />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-500 mb-1">Date fin *</label>
                <input type="date" required value={form.endDate} onChange={e => setForm(p => ({ ...p, endDate: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg border border-zinc-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-500 mb-1">Motif *</label>
              <textarea required value={form.reason} onChange={e => setForm(p => ({ ...p, reason: e.target.value }))}
                rows={3} className="w-full px-3 py-2 rounded-lg border border-zinc-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 resize-none" />
            </div>
            {error && <p className="text-xs text-red-500 bg-red-50 rounded-lg px-3 py-2">{error}</p>}
            <div className="flex gap-2 pt-2">
              <button type="button" onClick={onClose} className="flex-1 px-4 py-2 rounded-xl border border-zinc-200 text-sm text-zinc-600 hover:bg-zinc-50">Annuler</button>
              <button type="submit" disabled={isPending} className="flex-1 px-4 py-2 rounded-xl bg-emerald-600 text-sm text-white font-medium disabled:opacity-50">
                {isPending ? 'Création...' : 'Créer'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}

function BulkMoratoriumModal({ onClose }: { onClose: () => void }) {
  const { mutateAsync, isPending } = useCreateBulkMoratoriums()
  const [form, setForm] = useState<BulkMoratoriumPayload>({ studentIds: [], type: 'PAYMENT_PLAN', startDate: '', endDate: '', reason: '' })
  const [idsText, setIdsText] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    const ids = idsText.split('\n').map(s => parseInt(s.trim(), 10)).filter(n => !isNaN(n) && n > 0)
    if (ids.length === 0) { setError('Entrez au moins un ID élève'); return }
    try { await mutateAsync({ ...form, studentIds: ids }); setSuccess(true) }
    catch (err) { setError(getApiErrorMessage(err)) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6 mx-4">
        <h2 className="text-lg font-semibold text-zinc-900 mb-5">Créer des moratoires en masse</h2>
        {success ? (
          <div className="text-center py-6">
            <CheckCircle size={20} className="mx-auto text-emerald-600 mb-2" />
            <p className="text-sm text-zinc-800">Moratoires créés</p>
            <button onClick={onClose} className="mt-4 px-4 py-2 rounded-xl bg-emerald-600 text-sm text-white">Fermer</button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-zinc-500 mb-1">IDs élèves (un par ligne) *</label>
              <textarea value={idsText} onChange={e => setIdsText(e.target.value)} rows={4} placeholder={'123\n456\n789'}
                className="w-full px-3 py-2 rounded-lg border border-zinc-200 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-emerald-400 resize-none" />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-500 mb-1">Type *</label>
              <select value={form.type} onChange={e => setForm(p => ({ ...p, type: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg border border-zinc-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400">
                <option value="PAYMENT_PLAN">Plan de paiement</option>
                <option value="DEBT_FREEZE">Gel de dette</option>
                <option value="GRACE_PERIOD">Période de grâce</option>
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-zinc-500 mb-1">Date début *</label>
                <input type="date" required value={form.startDate} onChange={e => setForm(p => ({ ...p, startDate: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg border border-zinc-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400" />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-500 mb-1">Date fin *</label>
                <input type="date" required value={form.endDate} onChange={e => setForm(p => ({ ...p, endDate: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg border border-zinc-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-500 mb-1">Motif *</label>
              <textarea required value={form.reason} onChange={e => setForm(p => ({ ...p, reason: e.target.value }))} rows={2}
                className="w-full px-3 py-2 rounded-lg border border-zinc-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 resize-none" />
            </div>
            {error && <p className="text-xs text-red-500 bg-red-50 rounded-lg px-3 py-2">{error}</p>}
            <div className="flex gap-2 pt-2">
              <button type="button" onClick={onClose} className="flex-1 px-4 py-2 rounded-xl border border-zinc-200 text-sm text-zinc-600 hover:bg-zinc-50">Annuler</button>
              <button type="submit" disabled={isPending} className="flex-1 px-4 py-2 rounded-xl bg-emerald-600 text-sm text-white font-medium disabled:opacity-50">
                {isPending ? 'Création...' : 'Créer en masse'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}

export default function MoratoriumsPage() {
  const [statusFilter, setStatusFilter] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [showBulk, setShowBulk] = useState(false)
  const { data: moratoriums = [], isLoading } = useMoratoriums({ status: statusFilter || undefined })
  const { data: recoveryRate } = useMoratoriumRecoveryRate()
  const { mutate: revoke } = useRevokeMoratorium()
  const rate = recoveryRate as any

  return (
    <div className="space-y-6">
      <motion.div
        className="flex items-center justify-between"
        initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}
      >
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">Moratoires</h1>
          <p className="text-sm text-zinc-500 mt-0.5">Gestion des plans de paiement et délais accordés</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowBulk(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-zinc-200 text-sm text-zinc-700 hover:bg-zinc-50">
            <Calendar size={13} /> En masse
          </button>
          <button onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 text-sm text-white font-medium hover:bg-emerald-700 shadow-sm">
            <Plus size={14} /> Nouveau moratoire
          </button>
        </div>
      </motion.div>

      <div className="flex items-center gap-3">
        {rate && (
          <div className="flex items-center gap-2 px-4 py-2 bg-white rounded-xl border border-zinc-100 shadow-sm">
            <TrendingUp size={14} className="text-emerald-600" />
            <span className="text-sm font-semibold text-zinc-800">
              Taux recouvrement : {rate?.rate != null ? `${Number(rate.rate).toFixed(1)}%` : rate?.recoveryRate != null ? `${Number(rate.recoveryRate).toFixed(1)}%` : '—'}
            </span>
          </div>
        )}
        <div className="flex gap-1 bg-zinc-100 p-1 rounded-xl">
          {[['', 'Tous'], ['ACTIVE', 'Actifs'], ['EXPIRED', 'Expirés'], ['REVOKED', 'Révoqués']].map(([v, l]) => (
            <button key={v} onClick={() => setStatusFilter(v)}
              className={`px-3 py-1 rounded-lg text-sm font-medium transition-all ${statusFilter === v ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-500 hover:text-zinc-700'}`}>
              {l}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-zinc-100 shadow-sm">
        {isLoading ? (
          <div className="p-6 space-y-2">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12" />)}</div>
        ) : (moratoriums as any[]).length === 0 ? (
          <div className="py-12 text-center">
            <Calendar size={28} className="mx-auto text-zinc-300 mb-2" />
            <p className="text-sm text-zinc-400">Aucun moratoire</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-100 bg-zinc-50/50">
                <th className="text-left px-5 py-3 text-xs font-semibold text-zinc-500">Élève</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-zinc-500">Type</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-zinc-500">Début</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-zinc-500">Fin</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-zinc-500">Statut</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-zinc-500">Motif</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody>
              {(moratoriums as any[]).map((m) => {
                const cfg = STATUS_CFG[m.status] ?? { label: m.status, cls: 'bg-zinc-100 text-zinc-500' }
                return (
                  <tr key={m.id} className="border-b border-zinc-50 hover:bg-zinc-50/50">
                    <td className="px-5 py-3.5 font-medium text-zinc-900">
                      {m.student ? `${m.student.firstName} ${m.student.lastName}` : `#${m.studentId}`}
                    </td>
                    <td className="px-5 py-3.5 text-zinc-600 text-xs">{TYPE_LABEL[m.type] ?? m.type}</td>
                    <td className="px-5 py-3.5 text-zinc-500 text-xs">{new Date(m.startDate).toLocaleDateString('fr-FR')}</td>
                    <td className="px-5 py-3.5 text-zinc-500 text-xs">{new Date(m.endDate).toLocaleDateString('fr-FR')}</td>
                    <td className="px-5 py-3.5">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${cfg.cls}`}>{cfg.label}</span>
                    </td>
                    <td className="px-5 py-3.5 text-zinc-400 text-xs max-w-[160px] truncate">{m.reason}</td>
                    <td className="px-5 py-3.5">
                      {m.status === 'ACTIVE' && (
                        <button onClick={() => revoke(m.id)}
                          className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 transition-colors" title="Révoquer">
                          <Ban size={13} />
                        </button>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {showCreate && <MoratoriumModal onClose={() => setShowCreate(false)} />}
      {showBulk && <BulkMoratoriumModal onClose={() => setShowBulk(false)} />}
    </div>
  )
}
