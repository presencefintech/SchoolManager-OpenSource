'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { FileText, Plus, Search, CheckCircle, DollarSign, RotateCcw } from 'lucide-react'
import {
  useSetupFeeStructure, useStudentInvoices, useGenerateInvoice,
  useApplyDiscount, useSyncBalance,
} from '@/lib/hooks/use-admin'
import type { FeeStructurePayload } from '@/types/admin'

function Sk({ className }: { className?: string }) {
  return <div className={`rounded-xl bg-zinc-100 animate-pulse ${className ?? ''}`} />
}

function EmptyState({ icon: Icon, message }: { icon: React.ElementType; message: string }) {
  return (
    <div className="py-12 text-center">
      <Icon size={28} className="mx-auto text-zinc-300 mb-2" />
      <p className="text-sm text-zinc-400">{message}</p>
    </div>
  )
}

function GenerateInvoiceModal({ onClose }: { onClose: () => void }) {
  const { mutateAsync, isPending } = useGenerateInvoice()
  const [form, setForm] = useState({ studentId: 0, feeStructureId: 0, dueDate: '' })
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    try {
      await mutateAsync({ studentId: form.studentId, feeStructureId: form.feeStructureId, dueDate: form.dueDate || undefined })
      setSuccess(true)
    } catch (err: any) { setError(err?.response?.data?.message ?? 'Erreur') }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 mx-4">
        <h2 className="text-lg font-semibold text-zinc-900 mb-5">Générer une facture</h2>
        {success ? (
          <div className="text-center py-6">
            <CheckCircle size={20} className="mx-auto text-emerald-600 mb-2" />
            <p className="text-sm text-zinc-800">Facture générée avec succès</p>
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
              <label className="block text-xs font-medium text-zinc-500 mb-1">ID Structure de frais *</label>
              <input type="number" required min={1} value={form.feeStructureId || ''}
                onChange={e => setForm(p => ({ ...p, feeStructureId: Number(e.target.value) }))}
                className="w-full px-3 py-2 rounded-lg border border-zinc-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400" />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-500 mb-1">Date d'échéance</label>
              <input type="date" value={form.dueDate}
                onChange={e => setForm(p => ({ ...p, dueDate: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg border border-zinc-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400" />
            </div>
            {error && <p className="text-xs text-red-500 bg-red-50 rounded-lg px-3 py-2">{error}</p>}
            <div className="flex gap-2 pt-2">
              <button type="button" onClick={onClose} className="flex-1 px-4 py-2 rounded-xl border border-zinc-200 text-sm text-zinc-600 hover:bg-zinc-50">Annuler</button>
              <button type="submit" disabled={isPending} className="flex-1 px-4 py-2 rounded-xl bg-emerald-600 text-sm text-white font-medium disabled:opacity-50">
                {isPending ? 'Génération...' : 'Générer'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}

function DiscountModal({ invoiceId, onClose }: { invoiceId: number; onClose: () => void }) {
  const { mutateAsync, isPending } = useApplyDiscount()
  const [form, setForm] = useState({ discountAmount: 0, reason: '' })
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    try { await mutateAsync({ invoiceId, discountAmount: form.discountAmount, reason: form.reason || undefined }); setSuccess(true) }
    catch (err: any) { setError(err?.response?.data?.message ?? 'Erreur') }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 mx-4">
        <h2 className="text-lg font-semibold text-zinc-900 mb-5">Appliquer une remise</h2>
        {success ? (
          <div className="text-center py-6">
            <CheckCircle size={20} className="mx-auto text-emerald-600 mb-2" />
            <p className="text-sm text-zinc-800">Remise appliquée</p>
            <button onClick={onClose} className="mt-4 px-4 py-2 rounded-xl bg-emerald-600 text-sm text-white">Fermer</button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-zinc-500 mb-1">Montant remise (FCFA) *</label>
              <input type="number" required min={1} value={form.discountAmount || ''}
                onChange={e => setForm(p => ({ ...p, discountAmount: Number(e.target.value) }))}
                className="w-full px-3 py-2 rounded-lg border border-zinc-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400" />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-500 mb-1">Motif</label>
              <input value={form.reason} placeholder="Optionnel"
                onChange={e => setForm(p => ({ ...p, reason: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg border border-zinc-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400" />
            </div>
            {error && <p className="text-xs text-red-500 bg-red-50 rounded-lg px-3 py-2">{error}</p>}
            <div className="flex gap-2 pt-2">
              <button type="button" onClick={onClose} className="flex-1 px-4 py-2 rounded-xl border border-zinc-200 text-sm text-zinc-600 hover:bg-zinc-50">Annuler</button>
              <button type="submit" disabled={isPending} className="flex-1 px-4 py-2 rounded-xl bg-emerald-600 text-sm text-white font-medium disabled:opacity-50">
                {isPending ? 'Application...' : 'Appliquer'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}

export default function FacturesPage() {
  const { mutateAsync: createFee, isPending: creatingFee } = useSetupFeeStructure()
  const { mutate: syncBalance } = useSyncBalance()
  const [feeForm, setFeeForm] = useState<FeeStructurePayload>({ label: '', totalAmount: 0 })
  const [feeSuccess, setFeeSuccess] = useState(false)
  const [feeError, setFeeError] = useState<string | null>(null)
  const [studentIdSearch, setStudentIdSearch] = useState('')
  const [activeStudentId, setActiveStudentId] = useState<number | null>(null)
  const [showGenerateModal, setShowGenerateModal] = useState(false)
  const [discountInvoiceId, setDiscountInvoiceId] = useState<number | null>(null)

  const { data: invoices = [], isLoading: loadingInvoices } = useStudentInvoices(activeStudentId ?? 0)

  async function handleCreateFee(e: React.FormEvent) {
    e.preventDefault()
    setFeeError(null)
    setFeeSuccess(false)
    try { await createFee(feeForm); setFeeSuccess(true); setFeeForm({ label: '', totalAmount: 0 }) }
    catch (err: any) { setFeeError(err?.response?.data?.message ?? 'Erreur') }
  }

  return (
    <div className="space-y-6">
      <motion.div
        className="flex items-center justify-between"
        initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}
      >
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">Factures & Frais</h1>
          <p className="text-sm text-zinc-500 mt-0.5">Gestion des structures de frais et des factures</p>
        </div>
      </motion.div>

      <div className="bg-white rounded-2xl border border-zinc-100 shadow-sm p-5">
        <h3 className="text-sm font-semibold text-zinc-900 mb-4">Créer une structure de frais</h3>
        {feeSuccess && (
          <div className="mb-4 flex items-center gap-2 text-sm text-emerald-700 bg-emerald-50 rounded-lg px-3 py-2">
            <CheckCircle size={14} /> Structure créée avec succès
          </div>
        )}
        <form onSubmit={handleCreateFee} className="grid grid-cols-4 gap-3 items-end">
          <div>
            <label className="block text-xs font-medium text-zinc-500 mb-1">Libellé *</label>
            <input required value={feeForm.label} onChange={e => setFeeForm(p => ({ ...p, label: e.target.value }))}
              placeholder="Ex: Frais scolarité T1"
              className="w-full px-3 py-2 rounded-lg border border-zinc-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400" />
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-500 mb-1">Montant (FCFA) *</label>
            <input type="number" required min={1} value={feeForm.totalAmount || ''}
              onChange={e => setFeeForm(p => ({ ...p, totalAmount: Number(e.target.value) }))}
              className="w-full px-3 py-2 rounded-lg border border-zinc-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400" />
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-500 mb-1">ID Classe</label>
            <input type="number" min={1} value={feeForm.classId ?? ''}
              onChange={e => setFeeForm(p => ({ ...p, classId: e.target.value ? Number(e.target.value) : undefined }))}
              className="w-full px-3 py-2 rounded-lg border border-zinc-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400" />
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-500 mb-1">Échéance</label>
            <div className="flex gap-2">
              <input type="date" value={feeForm.dueDate ?? ''}
                onChange={e => setFeeForm(p => ({ ...p, dueDate: e.target.value || undefined }))}
                className="flex-1 px-3 py-2 rounded-lg border border-zinc-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400" />
              <button type="submit" disabled={creatingFee}
                className="px-4 py-2 rounded-xl bg-emerald-600 text-sm text-white font-medium hover:bg-emerald-700 disabled:opacity-50 whitespace-nowrap flex items-center gap-1.5">
                <Plus size={13} />
                {creatingFee ? '...' : 'Créer'}
              </button>
            </div>
          </div>
        </form>
        {feeError && <p className="mt-2 text-xs text-red-500 bg-red-50 rounded-lg px-3 py-2">{feeError}</p>}
      </div>

      <div className="bg-white rounded-2xl border border-zinc-100 shadow-sm">
        <div className="px-5 py-4 border-b border-zinc-100 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-zinc-900">Factures d'un élève</h3>
          <button onClick={() => setShowGenerateModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 text-xs text-white font-medium hover:bg-emerald-700">
            <Plus size={12} /> Générer facture
          </button>
        </div>
        <div className="px-5 py-4 border-b border-zinc-100">
          <div className="flex gap-2 items-center">
            <input type="number" min={1} value={studentIdSearch}
              onChange={e => setStudentIdSearch(e.target.value)}
              placeholder="ID Élève..."
              className="w-48 px-3 py-2 rounded-lg border border-zinc-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400" />
            <button
              onClick={() => setActiveStudentId(studentIdSearch ? Number(studentIdSearch) : null)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-zinc-200 text-sm text-zinc-700 hover:bg-zinc-50">
              <Search size={13} /> Rechercher
            </button>
            {activeStudentId && (
              <button
                onClick={() => syncBalance(activeStudentId)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-zinc-200 text-xs text-zinc-600 hover:bg-zinc-50">
                <RotateCcw size={12} /> Sync solde
              </button>
            )}
          </div>
        </div>
        {activeStudentId ? (
          loadingInvoices ? (
            <div className="p-6 space-y-2">{Array.from({ length: 3 }).map((_, i) => <Sk key={i} className="h-12" />)}</div>
          ) : (invoices as any[]).length === 0 ? (
            <EmptyState icon={FileText} message="Aucune facture pour cet élève" />
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-100 bg-zinc-50/50">
                  <th className="text-left px-5 py-3 text-xs font-semibold text-zinc-500">Libellé</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-zinc-500">Montant</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-zinc-500">Statut</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-zinc-500">Échéance</th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody>
                {(invoices as any[]).map((inv) => (
                  <tr key={inv.id} className="border-b border-zinc-50 hover:bg-zinc-50/50">
                    <td className="px-5 py-3.5 font-medium text-zinc-900">{inv.label ?? inv.description ?? '—'}</td>
                    <td className="px-5 py-3.5 text-zinc-700 font-medium">{Number(inv.amount ?? inv.totalAmount ?? 0).toLocaleString('fr-FR')} F</td>
                    <td className="px-5 py-3.5">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${inv.status === 'PAID' ? 'bg-emerald-50 text-emerald-700' : inv.status === 'PENDING' ? 'bg-amber-50 text-amber-700' : 'bg-zinc-100 text-zinc-500'}`}>
                        {inv.status ?? '—'}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-zinc-400 text-xs">{inv.dueDate ? new Date(inv.dueDate).toLocaleDateString('fr-FR') : '—'}</td>
                    <td className="px-5 py-3.5">
                      <button onClick={() => setDiscountInvoiceId(inv.id)}
                        className="flex items-center gap-1 text-xs px-2 py-1 rounded-lg border border-zinc-200 text-zinc-600 hover:bg-zinc-50">
                        <DollarSign size={11} /> Remise
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )
        ) : (
          <div className="px-5 py-10 text-center">
            <Search size={24} className="mx-auto text-zinc-300 mb-2" />
            <p className="text-sm text-zinc-400">Entrez un ID élève pour voir ses factures</p>
          </div>
        )}
      </div>

      {showGenerateModal && <GenerateInvoiceModal onClose={() => setShowGenerateModal(false)} />}
      {discountInvoiceId !== null && <DiscountModal invoiceId={discountInvoiceId} onClose={() => setDiscountInvoiceId(null)} />}
    </div>
  )
}
