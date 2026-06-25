'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import {
  UserPlus, Plus, Lock, Unlock, CheckCircle, Flag,
  X, Loader2, ChevronLeft, ChevronRight, Search,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  useEnrollments, useCreateEnrollment,
  useApproveEnrollment, useFinalizeEnrollment, useToggleLock,
} from '@/lib/hooks/use-admin'
import { getApiErrorMessage } from '@/lib/api/client'
import type { CreateEnrollmentPayload } from '@/types/admin'

function Sk({ className }: { className?: string }) {
  return <div className={cn('rounded-xl bg-zinc-100 animate-pulse', className)} />
}

const STATUS_CFG: Record<string, { label: string; cls: string }> = {
  ACTIVE:       { label: 'Actif',        cls: 'bg-emerald-50 text-emerald-700' },
  INACTIVE:     { label: 'Inactif',      cls: 'bg-zinc-100 text-zinc-500' },
  PRE_ENROLL:   { label: 'Pré-inscrit',  cls: 'bg-indigo-50 text-indigo-700' },
  APPROVED:     { label: 'Approuvé',     cls: 'bg-teal-50 text-teal-700' },
  FINALIZED:    { label: 'Finalisé',     cls: 'bg-emerald-50 text-emerald-700' },
  SUSPENDED:    { label: 'Suspendu',     cls: 'bg-red-50 text-red-700' },
}

const EMPTY_FORM: CreateEnrollmentPayload = {
  firstName: '', lastName: '', email: '', phone: '', dateOfBirth: '',
  gender: undefined, address: '', parentName: '', parentPhone: '', parentEmail: '',
}

export default function EnrollmentsPage() {
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [page, setPage] = useState(1)
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState<CreateEnrollmentPayload>(EMPTY_FORM)
  const [error, setError] = useState('')

  const limit = 20
  const { data: enrollmentsData, isLoading } = useEnrollments({ search: debouncedSearch, page, limit })
  const createMutation = useCreateEnrollment()
  const approveMutation = useApproveEnrollment()
  const finalizeMutation = useFinalizeEnrollment()
  const toggleLockMutation = useToggleLock()

  const enrollments = (enrollmentsData as { data?: Array<{ id: number; firstName: string; lastName: string; matricule?: string; status: string; className?: string; isLocked: boolean; createdAt: string }> })?.data ?? []
  const totalPages = (enrollmentsData as { totalPages?: number })?.totalPages ?? 1
  const total = (enrollmentsData as { total?: number })?.total ?? 0

  function handleSearchKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') { setDebouncedSearch(search); setPage(1) }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    try {
      await createMutation.mutateAsync(form)
      setShowModal(false)
      setForm(EMPTY_FORM)
    } catch (err) {
      setError(getApiErrorMessage(err))
    }
  }

  return (
    <div className="min-h-screen bg-zinc-50">
      <motion.div
        className="bg-white border-b border-zinc-200"
        initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}
      >
        <div className="max-w-6xl mx-auto px-8 py-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-zinc-900">Inscriptions</h1>
            {total > 0 && <p className="text-sm text-zinc-400 mt-0.5">{total} inscription{total !== 1 ? 's' : ''}</p>}
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium transition-colors"
          >
            <Plus size={15} />
            Nouvelle inscription
          </button>
        </div>
      </motion.div>

      <div className="max-w-6xl mx-auto px-8 py-6 space-y-4">
        <div className="relative max-w-sm">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            onKeyDown={handleSearchKeyDown}
            placeholder="Rechercher... (Entrée)"
            className="w-full pl-9 pr-3 py-2 rounded-xl border border-zinc-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-200 focus:border-emerald-400"
          />
        </div>

        <div className="bg-white rounded-xl border border-zinc-200 shadow-[0_1px_4px_rgba(0,0,0,0.06)] overflow-hidden">
          {isLoading ? (
            <div className="p-4 space-y-3">{[...Array(6)].map((_, i) => <Sk key={i} className="h-14" />)}</div>
          ) : enrollments.length ? (
            <>
              <table className="w-full">
                <thead>
                  <tr className="border-b border-zinc-100">
                    <th className="text-left text-xs font-semibold text-zinc-400 uppercase tracking-wide px-5 py-3">Élève</th>
                    <th className="text-left text-xs font-semibold text-zinc-400 uppercase tracking-wide px-5 py-3">Classe</th>
                    <th className="text-left text-xs font-semibold text-zinc-400 uppercase tracking-wide px-5 py-3">Statut</th>
                    <th className="text-left text-xs font-semibold text-zinc-400 uppercase tracking-wide px-5 py-3">Date</th>
                    <th className="px-5 py-3 text-right text-xs font-semibold text-zinc-400 uppercase tracking-wide">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-50">
                  {enrollments.map((en) => {
                    const sc = STATUS_CFG[en.status] ?? { label: en.status, cls: 'bg-zinc-100 text-zinc-500' }
                    return (
                      <tr key={en.id} className="hover:bg-zinc-50 transition-colors">
                        <td className="px-5 py-3">
                          <p className="text-sm font-medium text-zinc-900">{en.firstName} {en.lastName}</p>
                          {en.matricule && <p className="text-xs text-zinc-400 font-mono mt-0.5">{en.matricule}</p>}
                        </td>
                        <td className="px-5 py-3 text-sm text-zinc-500">{en.className ?? '—'}</td>
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-1.5">
                            <span className={cn('text-xs font-medium px-2 py-0.5 rounded-full', sc.cls)}>{sc.label}</span>
                            {en.isLocked && <Lock size={11} className="text-amber-500" />}
                          </div>
                        </td>
                        <td className="px-5 py-3 text-xs text-zinc-400">
                          {new Date(en.createdAt).toLocaleDateString('fr-FR')}
                        </td>
                        <td className="px-5 py-3">
                          <div className="flex items-center justify-end gap-1.5">
                            {en.status === 'PRE_ENROLL' && (
                              <button
                                onClick={() => approveMutation.mutate(en.id)}
                                disabled={approveMutation.isPending}
                                title="Approuver"
                                className="p-1.5 rounded-lg bg-teal-50 text-teal-600 hover:bg-teal-100 transition-colors"
                              >
                                <CheckCircle size={13} />
                              </button>
                            )}
                            {en.status === 'APPROVED' && (
                              <button
                                onClick={() => finalizeMutation.mutate(en.id)}
                                disabled={finalizeMutation.isPending}
                                title="Finaliser"
                                className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition-colors"
                              >
                                <Flag size={13} />
                              </button>
                            )}
                            <button
                              onClick={() => toggleLockMutation.mutate(en.id)}
                              disabled={toggleLockMutation.isPending}
                              title={en.isLocked ? 'Déverrouiller' : 'Verrouiller'}
                              className="p-1.5 rounded-lg border border-zinc-200 text-zinc-400 hover:bg-zinc-50 transition-colors"
                            >
                              {en.isLocked ? <Unlock size={13} /> : <Lock size={13} />}
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-3 px-5 py-3 border-t border-zinc-100">
                  <button
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="p-1.5 rounded-lg border border-zinc-200 text-zinc-500 hover:bg-zinc-50 disabled:opacity-40 transition-colors"
                  >
                    <ChevronLeft size={14} />
                  </button>
                  <span className="text-sm text-zinc-500">Page {page} / {totalPages}</span>
                  <button
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="p-1.5 rounded-lg border border-zinc-200 text-zinc-500 hover:bg-zinc-50 disabled:opacity-40 transition-colors"
                  >
                    <ChevronRight size={14} />
                  </button>
                </div>
              )}
            </>
          ) : (
            <div className="py-14 text-center">
              <UserPlus size={28} className="mx-auto text-zinc-200 mb-2" />
              <p className="text-sm text-zinc-400">Aucune inscription trouvée</p>
            </div>
          )}
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between px-6 py-5 border-b border-zinc-100 sticky top-0 bg-white">
              <h2 className="text-base font-semibold text-zinc-900">Nouvelle inscription</h2>
              <button onClick={() => setShowModal(false)} className="p-1.5 rounded-lg hover:bg-zinc-100 text-zinc-400 transition-colors">
                <X size={16} />
              </button>
            </div>
            <form onSubmit={handleCreate} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-zinc-600 mb-1">Prénom *</label>
                  <input
                    required value={form.firstName}
                    onChange={e => setForm(f => ({ ...f, firstName: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg border border-zinc-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-200 focus:border-emerald-400"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-600 mb-1">Nom *</label>
                  <input
                    required value={form.lastName}
                    onChange={e => setForm(f => ({ ...f, lastName: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg border border-zinc-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-200 focus:border-emerald-400"
                  />
                </div>
              </div>
              {([
                { key: 'email', label: 'Email', type: 'email' },
                { key: 'phone', label: 'Téléphone', type: 'tel' },
                { key: 'dateOfBirth', label: 'Date de naissance', type: 'date' },
                { key: 'address', label: 'Adresse', type: 'text' },
                { key: 'parentName', label: 'Parent/Tuteur', type: 'text' },
                { key: 'parentPhone', label: 'Tél. parent', type: 'tel' },
                { key: 'parentEmail', label: 'Email parent', type: 'email' },
              ] as { key: keyof CreateEnrollmentPayload; label: string; type: string }[]).map(({ key, label, type }) => (
                <div key={key}>
                  <label className="block text-xs font-medium text-zinc-600 mb-1">{label}</label>
                  <input
                    type={type}
                    value={(form[key] as string) ?? ''}
                    onChange={e => setForm(f => ({ ...f, [key]: e.target.value || undefined }))}
                    className="w-full px-3 py-2 rounded-lg border border-zinc-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-200 focus:border-emerald-400"
                  />
                </div>
              ))}
              <div>
                <label className="block text-xs font-medium text-zinc-600 mb-1">Genre</label>
                <select
                  value={form.gender ?? ''}
                  onChange={e => setForm(f => ({ ...f, gender: (e.target.value as 'M' | 'F') || undefined }))}
                  className="w-full px-3 py-2 rounded-lg border border-zinc-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-200 focus:border-emerald-400"
                >
                  <option value="">—</option>
                  <option value="M">Masculin</option>
                  <option value="F">Féminin</option>
                </select>
              </div>
              {error && <p className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}
              <div className="flex gap-3 pt-2">
                <button
                  type="button" onClick={() => setShowModal(false)}
                  className="flex-1 px-4 py-2.5 rounded-xl border border-zinc-200 text-sm text-zinc-600 hover:bg-zinc-50 transition-colors"
                >
                  Annuler
                </button>
                <button
                  type="submit" disabled={createMutation.isPending}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white text-sm font-medium transition-colors"
                >
                  {createMutation.isPending && <Loader2 size={14} className="animate-spin" />}
                  Inscrire
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  )
}
