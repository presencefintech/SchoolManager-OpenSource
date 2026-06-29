'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Plus, CheckCircle, Ban, TrendingUp, Calendar } from 'lucide-react'
import {
  useMoratoriums, useCreateMoratorium, useCreateBulkMoratoriums,
  useRevokeMoratorium, useMoratoriumRecoveryRate, useAllowedMoratoriumTypes,
} from '@/lib/hooks/use-admin'
import { MoratoriumTypeSelect } from '@/components/admin/finance/moratorium-type-select'
import { StudentSearchField } from '@/components/admin/shared/student-search-field'
import { StudentMultiSelect } from '@/components/admin/shared/student-multi-select'
import type { CreateMoratoriumPayload, BulkMoratoriumPayload } from '@/types/admin'
import { labelMoratoriumType } from '@/lib/business-labels'

function Sk({ className }: { className?: string }) {
  return <div className={`rounded-xl bg-zinc-100 animate-pulse ${className ?? ''}`} />
}

const STATUS_CFG: Record<string, { label: string; cls: string }> = {
  ACTIVE:  { label: 'Actif',    cls: 'bg-emerald-50 text-emerald-700' },
  EXPIRED: { label: 'Expiré',  cls: 'bg-zinc-100 text-zinc-500' },
  REVOKED: { label: 'Révoqué', cls: 'bg-red-50 text-red-700' },
}

const TYPE_LABEL: Record<string, string> = {
  MONTHLY: labelMoratoriumType('MONTHLY'),
  QUARTERLY: labelMoratoriumType('QUARTERLY'),
  EXCEPTIONAL: labelMoratoriumType('EXCEPTIONAL'),
  SCHOLARSHIP_REVIEW: labelMoratoriumType('SCHOLARSHIP_REVIEW'),
}

function MoratoriumModal({
  onClose,
  allowedTypes,
  defaultType,
  policyLoading,
}: {
  onClose: () => void
  allowedTypes: import('@/types/admin').MoratoriumType[]
  defaultType: import('@/types/admin').MoratoriumType
  policyLoading: boolean
}) {
  const { mutateAsync, isPending } = useCreateMoratorium()
  const [form, setForm] = useState<CreateMoratoriumPayload>({
    studentId: 0, type: defaultType, startDate: '', endDate: '', reason: '',
  })
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    setForm((p) => ({ ...p, type: defaultType }))
  }, [defaultType])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    try { await mutateAsync(form); setSuccess(true) }
    catch (err: any) {
      const status = err?.response?.status
      setError(
        status === 429
          ? 'Trop de requêtes — patientez quelques instants puis réessayez.'
          : (err?.response?.data?.message ?? 'Erreur'),
      )
    }
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
            <StudentSearchField
              studentId={form.studentId}
              onSelect={(id) => setForm((p) => ({ ...p, studentId: id }))}
              label="Élève"
              required
            />
            <div>
              <label className="block text-xs font-medium text-zinc-500 mb-1">Type *</label>
              <MoratoriumTypeSelect
                value={form.type}
                onChange={(type) => setForm((p) => ({ ...p, type }))}
                allowedTypes={allowedTypes}
                defaultType={defaultType}
                isLoading={policyLoading}
              />
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

function BulkMoratoriumModal({
  onClose,
  allowedTypes,
  defaultType,
  policyLoading,
}: {
  onClose: () => void
  allowedTypes: import('@/types/admin').MoratoriumType[]
  defaultType: import('@/types/admin').MoratoriumType
  policyLoading: boolean
}) {
  const { mutateAsync, isPending } = useCreateBulkMoratoriums()
  const [form, setForm] = useState<BulkMoratoriumPayload>({
    studentIds: [], type: defaultType, startDate: '', endDate: '', reason: '',
  })
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    setForm((p) => ({ ...p, type: defaultType }))
  }, [defaultType])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (form.studentIds.length === 0) { setError('Sélectionnez au moins un élève'); return }
    try { await mutateAsync(form); setSuccess(true) }
    catch (err: any) {
      const status = err?.response?.status
      setError(
        status === 429
          ? 'Trop de requêtes — patientez quelques instants puis réessayez.'
          : (err?.response?.data?.message ?? 'Erreur'),
      )
    }
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
            <StudentMultiSelect
              studentIds={form.studentIds}
              onSelect={(ids) => setForm((p) => ({ ...p, studentIds: ids }))}
              label="Élèves"
              required
            />
            <div>
              <label className="block text-xs font-medium text-zinc-500 mb-1">Type *</label>
              <MoratoriumTypeSelect
                value={form.type}
                onChange={(type) => setForm((p) => ({ ...p, type }))}
                allowedTypes={allowedTypes}
                defaultType={defaultType}
                isLoading={policyLoading}
              />
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
  const { allowedTypes, defaultType, isLoading: policyLoading } = useAllowedMoratoriumTypes()
  const { data: moratoriums = [], isLoading } = useMoratoriums({ status: statusFilter || undefined })
  const { data: recoveryRate } = useMoratoriumRecoveryRate()
  const { mutate: revoke } = useRevokeMoratorium()

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
        {recoveryRate && (
          <div className="flex items-center gap-2 px-4 py-2 bg-white rounded-xl border border-zinc-100 shadow-sm">
            <TrendingUp size={14} className="text-emerald-600" />
            <span className="text-sm font-semibold text-zinc-800">
              Taux recouvrement : {recoveryRate.recoveryRateGlobal.toFixed(1)}%
            </span>
            {recoveryRate.studentsUnderMoratorium > 0 && (
              <span className="text-xs text-zinc-400">
                · {recoveryRate.studentsUnderMoratorium} sous moratoire
              </span>
            )}
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
          <div className="p-6 space-y-2">{Array.from({ length: 5 }).map((_, i) => <Sk key={i} className="h-12" />)}</div>
        ) : moratoriums.length === 0 ? (
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
                <th className="text-left px-5 py-3 text-xs font-semibold text-zinc-500">Accordé par</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody>
              {moratoriums.map((m) => {
                const cfg = STATUS_CFG[m.status] ?? { label: m.status, cls: 'bg-zinc-100 text-zinc-500' }
                const studentLabel = m.studentName ?? (
                  (m.student ? `${m.student.firstName} ${m.student.lastName}`.trim() : '') || `#${m.studentId}`
                )
                return (
                  <tr key={m.id} className="border-b border-zinc-50 hover:bg-zinc-50/50">
                    <td className="px-5 py-3.5 font-medium text-zinc-900">
                      {studentLabel}
                    </td>
                    <td className="px-5 py-3.5 text-zinc-600 text-xs">{TYPE_LABEL[m.type] ?? m.type}</td>
                    <td className="px-5 py-3.5 text-zinc-500 text-xs">{new Date(m.startDate).toLocaleDateString('fr-FR')}</td>
                    <td className="px-5 py-3.5 text-zinc-500 text-xs">{new Date(m.endDate).toLocaleDateString('fr-FR')}</td>
                    <td className="px-5 py-3.5">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${cfg.cls}`}>{cfg.label}</span>
                    </td>
                    <td className="px-5 py-3.5 text-zinc-400 text-xs max-w-[160px] truncate">{m.reason}</td>
                    <td className="px-5 py-3.5 text-zinc-500 text-xs">{m.grantedByName ?? '—'}</td>
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

      {showCreate && (
        <MoratoriumModal
          onClose={() => setShowCreate(false)}
          allowedTypes={allowedTypes}
          defaultType={defaultType}
          policyLoading={policyLoading}
        />
      )}
      {showBulk && (
        <BulkMoratoriumModal
          onClose={() => setShowBulk(false)}
          allowedTypes={allowedTypes}
          defaultType={defaultType}
          policyLoading={policyLoading}
        />
      )}
    </div>
  )
}
