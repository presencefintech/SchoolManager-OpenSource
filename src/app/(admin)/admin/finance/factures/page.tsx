'use client'

import { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import {
  FileText, Plus, CheckCircle, DollarSign, RotateCcw, Layers, Trash2,
  Info, Tag, X, Pencil,
} from 'lucide-react'
import {
  useAcademicSessions, useCreateFeeCategory, useUpdateFeeCategory, useDeleteFeeCategory,
  useCreateFeeStructure, useUpdateFeeStructure,
  useStudentInvoices, useGenerateInvoice, useApplyDiscount, useSyncBalance,
  useFeeStructures, useFeeCategories, useClasses, useDeleteFeeStructure,
  useCloneFeeCatalogAdmin,
} from '@/lib/hooks/use-admin'
import type {
  CreateFeeCategoryPayload,
  CreateFeeStructurePayload,
  FeeBillingPeriod,
  FeeCategoryItem,
  UpdateFeeCategoryPayload,
  UpdateFeeStructurePayload,
} from '@/types/admin'
import { getApiErrorMessage } from '@/lib/api/client'
import { Skeleton } from '@/components/ui/skeleton'
import { StudentSearchField } from '@/components/admin/shared/student-search-field'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { useToast } from '@/providers/toast-provider'
import { formatMoney } from '@/lib/finance/currency'
import {
  isValidFeeCategoryCode,
  toFeeCategoryCode,
  type FeeStructureListItem,
} from '@/lib/finance/fee-structure.utils'

const BILLING_PERIOD_LABELS: Record<FeeBillingPeriod, string> = {
  ONE_TIME: 'Ponctuel',
  ANNUAL: 'Annuel',
  MONTHLY: 'Mensuel',
}

function EmptyState({ icon: Icon, message }: { icon: React.ElementType; message: string }) {
  return (
    <div className="py-12 text-center">
      <Icon size={28} className="mx-auto text-zinc-300 mb-2" />
      <p className="text-sm text-zinc-400">{message}</p>
    </div>
  )
}

function CategoryModal({
  initial,
  onClose,
  onSaved,
}: {
  initial?: FeeCategoryItem | null
  onClose: () => void
  onSaved: (categoryId: number) => void
}) {
  const isEdit = initial != null
  const { mutateAsync: createCategory, isPending: creating } = useCreateFeeCategory()
  const { mutateAsync: updateCategory, isPending: updating } = useUpdateFeeCategory()
  const [form, setForm] = useState<CreateFeeCategoryPayload>({
    name: initial?.name ?? '',
    code: initial?.code ?? '',
    billingPeriod: initial?.billingPeriod ?? 'MONTHLY',
    dueDayOfMonth: initial?.dueDayOfMonth ?? 5,
    description: initial?.description ?? '',
  })
  const [codeLocked, setCodeLocked] = useState(isEdit)
  const [error, setError] = useState<string | null>(null)
  const isPending = creating || updating

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    try {
      if (isEdit && initial) {
        const payload: UpdateFeeCategoryPayload = {
          name: form.name.trim(),
          description: form.description?.trim() || null,
          billingPeriod: form.billingPeriod,
          dueDayOfMonth:
            form.billingPeriod === 'MONTHLY' ? (form.dueDayOfMonth ?? 5) : null,
        }
        const updated = await updateCategory({ categoryId: initial.id, payload })
        onSaved(updated.id)
        onClose()
        return
      }
      const code = toFeeCategoryCode(form.code || form.name)
      if (!isValidFeeCategoryCode(code)) {
        setError('Code invalide. Utilisez des lettres (ex. CANTEEN, TUITION, SCOLARITE).')
        return
      }
      const created = await createCategory({
        ...form,
        code,
        dueDayOfMonth: form.billingPeriod === 'MONTHLY' ? form.dueDayOfMonth : undefined,
      })
      onSaved(created.id)
      onClose()
    } catch (err) {
      setError(getApiErrorMessage(err))
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 mx-4">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold text-zinc-900">
            {isEdit ? 'Modifier la catégorie' : 'Nouvelle catégorie de frais'}
          </h2>
          <button type="button" onClick={onClose} className="rounded-lg p-1 text-zinc-400 hover:bg-zinc-100">
            <X size={16} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-zinc-500 mb-1">Nom *</label>
            <input
              required
              value={form.name}
              onChange={(e) => {
                const name = e.target.value
                setForm((p) => ({
                  ...p,
                  name,
                  code: isEdit || codeLocked ? p.code : toFeeCategoryCode(name),
                }))
              }}
              placeholder="Ex: Scolarité mensuelle"
              className="w-full px-3 py-2 rounded-lg border border-zinc-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-500 mb-1">Code *</label>
            <input
              required
              disabled={isEdit}
              value={form.code}
              onChange={(e) => {
                setCodeLocked(true)
                setForm((p) => ({
                  ...p,
                  code: toFeeCategoryCode(e.target.value),
                }))
              }}
              placeholder="TUITION"
              className="w-full px-3 py-2 rounded-lg border border-zinc-200 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-emerald-400 disabled:bg-zinc-50 disabled:opacity-70"
            />
            <p className="mt-1 text-[11px] text-zinc-400">
              {isEdit
                ? 'Le code n’est pas modifiable après création.'
                : 'Généré automatiquement (UPPER_SNAKE). Ex. CANTEEN, TUITION, SCOLARITE'}
            </p>
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-500 mb-1">Périodicité *</label>
            <select
              value={form.billingPeriod}
              onChange={(e) =>
                setForm((p) => ({
                  ...p,
                  billingPeriod: e.target.value as FeeBillingPeriod,
                  dueDayOfMonth: e.target.value === 'MONTHLY' ? (p.dueDayOfMonth ?? 5) : undefined,
                }))
              }
              className="w-full px-3 py-2 rounded-lg border border-zinc-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
            >
              <option value="MONTHLY">Mensuel</option>
              <option value="ANNUAL">Annuel</option>
              <option value="ONE_TIME">Ponctuel</option>
            </select>
          </div>
          {form.billingPeriod === 'MONTHLY' && (
            <div>
              <label className="block text-xs font-medium text-zinc-500 mb-1">Jour d&apos;échéance (1–28) *</label>
              <input
                type="number"
                required
                min={1}
                max={28}
                value={form.dueDayOfMonth ?? 5}
                onChange={(e) => setForm((p) => ({ ...p, dueDayOfMonth: Number(e.target.value) }))}
                className="w-full px-3 py-2 rounded-lg border border-zinc-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
              />
            </div>
          )}
          {error && <p className="text-xs text-red-500 bg-red-50 rounded-lg px-3 py-2">{error}</p>}
          <div className="flex gap-2 pt-2">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-2 rounded-xl border border-zinc-200 text-sm text-zinc-600 hover:bg-zinc-50">
              Annuler
            </button>
            <button type="submit" disabled={isPending} className="flex-1 px-4 py-2 rounded-xl bg-emerald-600 text-sm text-white font-medium disabled:opacity-50">
              {isPending ? (isEdit ? 'Enregistrement…' : 'Création...') : isEdit ? 'Enregistrer' : 'Créer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function GenerateInvoiceModal({ onClose }: { onClose: () => void }) {
  const { mutateAsync, isPending } = useGenerateInvoice()
  const { data: feeStructures = [], isLoading: loadingFees } = useFeeStructures()
  const [form, setForm] = useState({ studentId: 0, feeStructureId: 0, dueDate: '' })
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.studentId) { setError('Sélectionnez un élève.'); return }
    if (!form.feeStructureId) { setError('Sélectionnez une structure de frais.'); return }
    setError(null)
    try {
      await mutateAsync({ studentId: form.studentId, feeStructureId: form.feeStructureId, dueDate: form.dueDate || undefined })
      setSuccess(true)
    } catch (err) { setError(getApiErrorMessage(err)) }
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
            <StudentSearchField
              studentId={form.studentId}
              onSelect={(id) => setForm((p) => ({ ...p, studentId: id }))}
              label="Élève"
              required
            />
            <div>
              <label className="block text-xs font-medium text-zinc-500 mb-1">Structure de frais *</label>
              {loadingFees ? (
                <div className="h-9 rounded-lg bg-zinc-100 animate-pulse" />
              ) : (
                <select
                  required
                  value={form.feeStructureId || ''}
                  onChange={e => setForm(p => ({ ...p, feeStructureId: Number(e.target.value) }))}
                  className="w-full px-3 py-2 rounded-lg border border-zinc-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
                >
                  <option value="">— Choisir —</option>
                  {feeStructures.map((fs) => (
                    <option key={fs.id} value={fs.id}>
                      {fs.label} · {formatMoney(Number(fs.amount))}
                    </option>
                  ))}
                </select>
              )}
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-500 mb-1">Date d&apos;échéance</label>
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
    catch (err) { setError(getApiErrorMessage(err)) }
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
              <label className="block text-xs font-medium text-zinc-500 mb-1">Montant remise (USD) *</label>
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
  const toast = useToast()
  const { data: sessions = [] } = useAcademicSessions()
  const currentSession = useMemo(() => sessions.find((s) => s.isCurrent) ?? sessions[0], [sessions])

  const [selectedSessionId, setSelectedSessionId] = useState(0)
  useEffect(() => {
    if (currentSession && selectedSessionId === 0) {
      setSelectedSessionId(currentSession.id)
    }
  }, [currentSession, selectedSessionId])

  const { mutateAsync: createFee, isPending: creatingFee } = useCreateFeeStructure()
  const { mutateAsync: updateFee, isPending: updatingFee } = useUpdateFeeStructure()
  const { mutate: syncBalance } = useSyncBalance()
  const { data: classes = [] } = useClasses({ isActive: true })
  const { data: feeCategories = [], isLoading: loadingCategories } = useFeeCategories({ isActive: true })
  const { data: feeStructures = [], isLoading: loadingFeeStructures } = useFeeStructures({
    sessionId: selectedSessionId || undefined,
    isActive: true,
  })
  const { mutateAsync: deleteFeeStructure, isPending: deletingFee } = useDeleteFeeStructure()
  const { mutateAsync: cloneCatalog, isPending: cloningCatalog } = useCloneFeeCatalogAdmin()

  const emptyFeeForm = (): Omit<CreateFeeStructurePayload, 'sessionId'> => ({
    categoryId: 0,
    amount: 0,
    description: '',
    assignmentMode: 'AUTOMATIC',
    effectiveFrom: null,
    effectiveTo: null,
  })

  const [feeForm, setFeeForm] = useState<Omit<CreateFeeStructurePayload, 'sessionId'>>(emptyFeeForm)
  const [editingFeeId, setEditingFeeId] = useState<number | null>(null)
  const [feeSuccess, setFeeSuccess] = useState(false)
  const [feeError, setFeeError] = useState<string | null>(null)
  const [cloneSourceSessionId, setCloneSourceSessionId] = useState(0)
  const [cloneMsg, setCloneMsg] = useState<string | null>(null)
  const [showCategoryModal, setShowCategoryModal] = useState(false)
  const [editingCategory, setEditingCategory] = useState<FeeCategoryItem | null>(null)
  const [activeStudentId, setActiveStudentId] = useState<number>(0)
  const [showGenerateModal, setShowGenerateModal] = useState(false)
  const [discountInvoiceId, setDiscountInvoiceId] = useState<number | null>(null)
  const [deleteFeeTarget, setDeleteFeeTarget] = useState<{ id: number; label: string } | null>(null)
  const [deleteCategoryTarget, setDeleteCategoryTarget] = useState<FeeCategoryItem | null>(null)

  const { mutateAsync: deleteCategory, isPending: deletingCategory } = useDeleteFeeCategory()

  const { data: invoices = [], isLoading: loadingInvoices } = useStudentInvoices(activeStudentId)
  const savingFee = creatingFee || updatingFee

  const classById = useMemo(
    () => new Map(classes.map((c) => [c.id, c.name])),
    [classes],
  )

  function startEditFee(fs: FeeStructureListItem) {
    setEditingFeeId(fs.id)
    setFeeSuccess(false)
    setFeeError(null)
    setFeeForm({
      categoryId: 0,
      amount: fs.amount,
      classId: fs.classId ?? null,
      description: fs.description ?? '',
      assignmentMode: fs.assignmentMode ?? 'AUTOMATIC',
      effectiveFrom: fs.effectiveFrom ?? null,
      effectiveTo: fs.effectiveTo ?? null,
    })
    if (typeof window !== 'undefined') {
      document.getElementById('fee-structure-form')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }

  function cancelEditFee() {
    setEditingFeeId(null)
    setFeeForm(emptyFeeForm())
    setFeeError(null)
    setFeeSuccess(false)
  }

  async function handleSaveFee(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedSessionId) {
      setFeeError('Sélectionnez une session académique.')
      return
    }
    setFeeError(null)
    setFeeSuccess(false)

    try {
      if (editingFeeId != null) {
        if (!feeForm.amount || feeForm.amount <= 0) {
          setFeeError('Montant invalide.')
          return
        }
        const payload: UpdateFeeStructurePayload = {
          amount: feeForm.amount,
          description: feeForm.description?.trim() || null,
          assignmentMode: feeForm.assignmentMode ?? 'AUTOMATIC',
          effectiveFrom: feeForm.effectiveFrom || null,
          effectiveTo: feeForm.effectiveTo || null,
        }
        await updateFee({ feeId: editingFeeId, payload })
        toast.success('Barème mis à jour')
        setEditingFeeId(null)
        setFeeForm(emptyFeeForm())
        setFeeSuccess(true)
        return
      }

      if (!feeForm.categoryId) {
        setFeeError('Sélectionnez une catégorie de frais.')
        return
      }
      await createFee({
        sessionId: selectedSessionId,
        categoryId: feeForm.categoryId,
        amount: feeForm.amount,
        classId: feeForm.classId ?? null,
        description: feeForm.description?.trim() || undefined,
        assignmentMode: feeForm.assignmentMode ?? 'AUTOMATIC',
        ...(feeForm.effectiveFrom ? { effectiveFrom: feeForm.effectiveFrom } : {}),
        ...(feeForm.effectiveTo ? { effectiveTo: feeForm.effectiveTo } : {}),
      })
      setFeeSuccess(true)
      setFeeForm({
        ...emptyFeeForm(),
        categoryId: feeForm.categoryId,
      })
    } catch (err) {
      setFeeError(getApiErrorMessage(err))
    }
  }

  async function confirmDeleteFee() {
    if (!deleteFeeTarget) return
    try {
      await deleteFeeStructure(deleteFeeTarget.id)
      toast.success('Barème désactivé')
    } catch (err) {
      toast.error('Désactivation impossible', getApiErrorMessage(err))
    } finally {
      setDeleteFeeTarget(null)
    }
  }

  return (
    <div className="space-y-6">
      <motion.div
        className="flex items-center justify-between"
        initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}
      >
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">Factures & Frais</h1>
          <p className="text-sm text-zinc-500 mt-0.5">
            Catégories et barèmes — visibles automatiquement au guichet finance
          </p>
        </div>
      </motion.div>

      <div className="rounded-2xl border border-sky-100 bg-sky-50/80 px-4 py-4 space-y-3">
        <div className="flex items-start gap-3">
          <Info size={16} className="text-sky-600 shrink-0 mt-0.5" />
          <div className="text-sm text-sky-900 space-y-2">
            <p>
              Les barèmes alimentent l&apos;échéancier du guichet{' '}
              <span className="font-medium">/finances/paiements</span> — une ligne par période
              (mois, année ou frais unique).
            </p>
            <p className="font-medium text-sky-950">Pratique courante en RDC — minerval mois par mois :</p>
            <ol className="list-decimal list-inside space-y-1 text-sky-800/90">
              <li>
                Créez une catégorie <strong>Mensuelle</strong> (ex. « Minerval » · jour 5) — le système
                génère automatiquement juillet, août, septembre… jusqu&apos;à la fin de la session.
              </li>
              <li>
                Créez un barème avec le <strong>montant d&apos;un seul mois</strong> (ex. 30 USD/mois),
                pas le total annuel.
              </li>
              <li>
                Au guichet, le parent paie le mois en cours (ou les arriérés) ; les mois futurs restent
                « À venir ».
              </li>
              <li>
                Pour l&apos;inscription, uniforme, etc. → catégorie <strong>Ponctuelle</strong> ou{' '}
                <strong>Annuelle</strong>, en plus du minerval mensuel.
              </li>
            </ol>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-zinc-100 shadow-sm">
        <div className="px-5 py-4 border-b border-zinc-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Tag size={14} className="text-zinc-400" />
            <h3 className="text-sm font-semibold text-zinc-900">Catégories de frais</h3>
          </div>
          <button
            type="button"
            onClick={() => {
              setEditingCategory(null)
              setShowCategoryModal(true)
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-zinc-200 text-xs font-medium text-zinc-700 hover:bg-zinc-50"
          >
            <Plus size={12} /> Nouvelle catégorie
          </button>
        </div>
        {loadingCategories ? (
          <div className="p-5 space-y-2">{Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} className="h-10" />)}</div>
        ) : feeCategories.length === 0 ? (
          <EmptyState icon={Tag} message="Aucune catégorie — créez-en une pour commencer" />
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-100 bg-zinc-50/50">
                <th className="text-left px-5 py-3 text-xs font-semibold text-zinc-500">Nom</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-zinc-500">Code</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-zinc-500">Périodicité</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody>
              {feeCategories.map((cat) => (
                <tr key={cat.id} className="border-b border-zinc-50 hover:bg-zinc-50/50">
                  <td className="px-5 py-3 font-medium text-zinc-900">{cat.name}</td>
                  <td className="px-5 py-3 font-mono text-xs text-zinc-500">{cat.code}</td>
                  <td className="px-5 py-3 text-zinc-600">
                    {BILLING_PERIOD_LABELS[cat.billingPeriod]}
                    {cat.billingPeriod === 'MONTHLY' && cat.dueDayOfMonth
                      ? ` · jour ${cat.dueDayOfMonth}`
                      : ''}
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingCategory(cat)
                          setShowCategoryModal(true)
                        }}
                        className="flex items-center gap-1 text-xs px-2 py-1 rounded-lg border border-zinc-200 text-zinc-600 hover:bg-zinc-50"
                      >
                        <Pencil size={11} /> Éditer
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleteCategoryTarget(cat)}
                        className="flex items-center gap-1 text-xs px-2 py-1 rounded-lg border border-red-100 text-red-600 hover:bg-red-50"
                      >
                        <Trash2 size={11} /> Désactiver
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div id="fee-structure-form" className="bg-white rounded-2xl border border-zinc-100 shadow-sm p-5">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h3 className="text-sm font-semibold text-zinc-900">
            {editingFeeId != null
              ? `Modifier le barème #${editingFeeId}`
              : 'Créer un barème (structure de frais)'}
          </h3>
          {editingFeeId != null && (
            <button
              type="button"
              onClick={cancelEditFee}
              className="text-xs font-medium text-zinc-500 hover:text-zinc-800"
            >
              Annuler l&apos;édition
            </button>
          )}
        </div>
        {feeSuccess && (
          <div className="mb-4 flex items-center gap-2 text-sm text-emerald-700 bg-emerald-50 rounded-lg px-3 py-2">
            <CheckCircle size={14} /> Barème enregistré — visible au guichet pour la session sélectionnée
          </div>
        )}
        <form onSubmit={handleSaveFee} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 items-end">
          <div>
            <label className="block text-xs font-medium text-zinc-500 mb-1">Session académique *</label>
            <select
              required
              value={selectedSessionId || ''}
              onChange={(e) => setSelectedSessionId(Number(e.target.value))}
              className="w-full px-3 py-2 rounded-lg border border-zinc-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
            >
              <option value="">— Choisir —</option>
              {sessions.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}{s.isCurrent ? ' (courante)' : ''}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-500 mb-1">Catégorie *</label>
            <div className="flex gap-2">
              <select
                required={editingFeeId == null}
                disabled={editingFeeId != null}
                value={feeForm.categoryId || ''}
                onChange={(e) => setFeeForm((p) => ({ ...p, categoryId: Number(e.target.value) }))}
                className="flex-1 px-3 py-2 rounded-lg border border-zinc-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 disabled:bg-zinc-50 disabled:opacity-70"
              >
                <option value="">
                  {editingFeeId != null ? '— Inchangée (édition) —' : '— Choisir —'}
                </option>
                {feeCategories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name} ({BILLING_PERIOD_LABELS[cat.billingPeriod]})
                  </option>
                ))}
              </select>
              {editingFeeId == null && (
                <button
                  type="button"
                  onClick={() => {
                    setEditingCategory(null)
                    setShowCategoryModal(true)
                  }}
                  className="shrink-0 rounded-lg border border-zinc-200 px-2.5 text-zinc-500 hover:bg-zinc-50"
                  title="Nouvelle catégorie"
                >
                  <Plus size={14} />
                </button>
              )}
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-500 mb-1">Montant (USD) *</label>
            <input
              type="number"
              required
              min={1}
              step="0.01"
              value={feeForm.amount || ''}
              onChange={(e) => setFeeForm((p) => ({ ...p, amount: Number(e.target.value) }))}
              className="w-full px-3 py-2 rounded-lg border border-zinc-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-500 mb-1">Classe (optionnel)</label>
            <select
              disabled={editingFeeId != null}
              value={feeForm.classId ?? ''}
              onChange={(e) =>
                setFeeForm((p) => ({
                  ...p,
                  classId: e.target.value ? Number(e.target.value) : null,
                }))
              }
              className="w-full px-3 py-2 rounded-lg border border-zinc-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 disabled:bg-zinc-50 disabled:opacity-70"
            >
              <option value="">Toutes les classes</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
            {editingFeeId != null && (
              <p className="mt-1 text-[10px] text-zinc-400">Classe / catégorie non modifiables en édition.</p>
            )}
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-500 mb-1">Attribution *</label>
            <select
              value={feeForm.assignmentMode ?? 'AUTOMATIC'}
              onChange={(e) =>
                setFeeForm((p) => ({
                  ...p,
                  assignmentMode: e.target.value as 'AUTOMATIC' | 'EXPLICIT',
                }))
              }
              className="w-full px-3 py-2 rounded-lg border border-zinc-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
            >
              <option value="AUTOMATIC">Automatique (classe / école)</option>
              <option value="EXPLICIT">Optionnel (ASSIGN à l&apos;inscription)</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-500 mb-1">Valide du</label>
            <input
              type="date"
              value={feeForm.effectiveFrom?.slice(0, 10) ?? ''}
              onChange={(e) =>
                setFeeForm((p) => ({
                  ...p,
                  effectiveFrom: e.target.value ? `${e.target.value}T00:00:00.000Z` : null,
                }))
              }
              className="w-full px-3 py-2 rounded-lg border border-zinc-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-500 mb-1">Valide jusqu&apos;au</label>
            <input
              type="date"
              value={feeForm.effectiveTo?.slice(0, 10) ?? ''}
              onChange={(e) =>
                setFeeForm((p) => ({
                  ...p,
                  effectiveTo: e.target.value ? `${e.target.value}T23:59:59.000Z` : null,
                }))
              }
              className="w-full px-3 py-2 rounded-lg border border-zinc-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-xs font-medium text-zinc-500 mb-1">Description (optionnel)</label>
            <input
              value={feeForm.description ?? ''}
              onChange={(e) => setFeeForm((p) => ({ ...p, description: e.target.value }))}
              placeholder="Ex: Scolarité T1 2025-2026"
              className="w-full px-3 py-2 rounded-lg border border-zinc-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
            />
          </div>
          <div>
            <button
              type="submit"
              disabled={savingFee || (editingFeeId == null && feeCategories.length === 0)}
              className="w-full px-4 py-2 rounded-xl bg-emerald-600 text-sm text-white font-medium hover:bg-emerald-700 disabled:opacity-50 flex items-center justify-center gap-1.5"
            >
              {editingFeeId != null ? <Pencil size={13} /> : <Plus size={13} />}
              {savingFee
                ? editingFeeId != null
                  ? 'Mise à jour…'
                  : 'Création...'
                : editingFeeId != null
                  ? 'Enregistrer les modifications'
                  : 'Créer le barème'}
            </button>
          </div>
        </form>
        {feeError && <p className="mt-2 text-xs text-red-500 bg-red-50 rounded-lg px-3 py-2">{feeError}</p>}
      </div>

      <div className="bg-white rounded-2xl border border-zinc-100 shadow-sm p-5">
        <h3 className="text-sm font-semibold text-zinc-900 mb-1">Cloner le catalogue d’une session</h3>
        <p className="text-xs text-zinc-400 mb-3">
          Copie catégories + barèmes vers la session sélectionnée ci-dessus.
        </p>
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="block text-xs font-medium text-zinc-500 mb-1">Session source</label>
            <select
              value={cloneSourceSessionId || ''}
              onChange={(e) => setCloneSourceSessionId(Number(e.target.value))}
              className="px-3 py-2 rounded-lg border border-zinc-200 text-sm min-w-[200px]"
            >
              <option value="">— Choisir —</option>
              {sessions.map((s) => (
                <option key={s.id} value={s.id}>{s.label}</option>
              ))}
            </select>
          </div>
          <button
            type="button"
            disabled={cloningCatalog || !cloneSourceSessionId || !selectedSessionId
              || cloneSourceSessionId === selectedSessionId}
            onClick={async () => {
              setCloneMsg(null)
              try {
                const result = await cloneCatalog({
                  sourceSessionId: cloneSourceSessionId,
                  targetSessionId: selectedSessionId,
                })
                setCloneMsg(
                  `OK — ${result.categoriesCloned} catégorie(s), ${result.structuresCloned} barème(s).`,
                )
                toast.success('Catalogue cloné')
              } catch (e) {
                setCloneMsg(getApiErrorMessage(e))
              }
            }}
            className="rounded-xl bg-zinc-900 px-4 py-2 text-xs font-medium text-white hover:bg-zinc-800 disabled:opacity-40"
          >
            {cloningCatalog ? 'Clonage…' : 'Cloner vers session courante'}
          </button>
        </div>
        {cloneMsg && <p className="mt-2 text-xs text-zinc-600">{cloneMsg}</p>}
      </div>

      <div className="bg-white rounded-2xl border border-zinc-100 shadow-sm">
        <div className="px-5 py-4 border-b border-zinc-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Layers size={14} className="text-zinc-400" />
            <h3 className="text-sm font-semibold text-zinc-900">Barèmes de la session</h3>
          </div>
          {selectedSessionId > 0 && (
            <span className="text-xs text-zinc-400">
              {sessions.find((s) => s.id === selectedSessionId)?.label ?? `Session #${selectedSessionId}`}
            </span>
          )}
        </div>
        {loadingFeeStructures ? (
          <div className="p-5 space-y-2">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-10" />)}</div>
        ) : feeStructures.length === 0 ? (
          <EmptyState icon={Layers} message="Aucun barème pour cette session" />
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-100 bg-zinc-50/50">
                <th className="text-left px-5 py-3 text-xs font-semibold text-zinc-500">Libellé</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-zinc-500">Catégorie</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-zinc-500">Classe</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-zinc-500">Mode</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-zinc-500">Montant</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody>
              {feeStructures.map((fs) => (
                <tr key={fs.id} className="border-b border-zinc-50 hover:bg-zinc-50/50">
                  <td className="px-5 py-3 font-medium text-zinc-900">{fs.label}</td>
                  <td className="px-5 py-3 text-zinc-600">
                    {fs.categoryName ?? '—'}
                    {fs.billingPeriod
                      ? ` · ${BILLING_PERIOD_LABELS[fs.billingPeriod as FeeBillingPeriod] ?? fs.billingPeriod}`
                      : ''}
                  </td>
                  <td className="px-5 py-3 text-zinc-500 text-xs">
                    {fs.classId ? (classById.get(fs.classId) ?? `Classe #${fs.classId}`) : 'Toutes'}
                  </td>
                  <td className="px-5 py-3 text-xs">
                    <span
                      className={
                        fs.assignmentMode === 'EXPLICIT'
                          ? 'rounded bg-amber-50 px-1.5 py-0.5 font-medium text-amber-800'
                          : 'rounded bg-emerald-50 px-1.5 py-0.5 font-medium text-emerald-800'
                      }
                    >
                      {fs.assignmentMode === 'EXPLICIT' ? 'Optionnel' : 'Auto'}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-zinc-600">{formatMoney(Number(fs.amount))}</td>
                  <td className="px-5 py-3">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        type="button"
                        onClick={() => startEditFee(fs)}
                        className="flex items-center gap-1 text-xs px-2 py-1 rounded-lg border border-zinc-200 text-zinc-600 hover:bg-zinc-50"
                      >
                        <Pencil size={11} /> Éditer
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleteFeeTarget({ id: fs.id, label: fs.label })}
                        className="flex items-center gap-1 text-xs px-2 py-1 rounded-lg border border-red-100 text-red-600 hover:bg-red-50"
                      >
                        <Trash2 size={11} /> Désactiver
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="bg-white rounded-2xl border border-zinc-100 shadow-sm">
        <div className="px-5 py-4 border-b border-zinc-100 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-zinc-900">Factures d&apos;un élève</h3>
          <button onClick={() => setShowGenerateModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 text-xs text-white font-medium hover:bg-emerald-700">
            <Plus size={12} /> Générer facture
          </button>
        </div>
        <div className="px-5 py-4 border-b border-zinc-100">
          <div className="flex gap-2 items-end">
            <div className="flex-1 max-w-sm">
              <StudentSearchField
                studentId={activeStudentId}
                onSelect={(id) => setActiveStudentId(id)}
                label="Rechercher un élève"
              />
            </div>
            {activeStudentId > 0 && (
              <button
                onClick={() => syncBalance(activeStudentId)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-zinc-200 text-xs text-zinc-600 hover:bg-zinc-50">
                <RotateCcw size={12} /> Sync solde
              </button>
            )}
          </div>
        </div>
        {activeStudentId > 0 ? (
          loadingInvoices ? (
            <div className="p-6 space-y-2">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-12" />)}</div>
          ) : (invoices as { id: number; label?: string; description?: string; amount?: number; totalAmount?: number; status?: string; dueDate?: string }[]).length === 0 ? (
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
                {(invoices as { id: number; label?: string; description?: string; amount?: number; totalAmount?: number; status?: string; dueDate?: string }[]).map((inv) => (
                  <tr key={inv.id} className="border-b border-zinc-50 hover:bg-zinc-50/50">
                    <td className="px-5 py-3.5 font-medium text-zinc-900">{inv.label ?? inv.description ?? '—'}</td>
                    <td className="px-5 py-3.5 text-zinc-700 font-medium">{formatMoney(Number(inv.amount ?? inv.totalAmount ?? 0))}</td>
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
            <FileText size={24} className="mx-auto text-zinc-300 mb-2" />
            <p className="text-sm text-zinc-400">Recherchez un élève pour voir ses factures</p>
          </div>
        )}
      </div>

      {showCategoryModal && (
        <CategoryModal
          key={editingCategory?.id ?? 'new'}
          initial={editingCategory}
          onClose={() => {
            setShowCategoryModal(false)
            setEditingCategory(null)
          }}
          onSaved={(categoryId) => {
            setFeeForm((p) => ({ ...p, categoryId }))
            toast.success(editingCategory ? 'Catégorie mise à jour' : 'Catégorie créée')
          }}
        />
      )}
      {showGenerateModal && <GenerateInvoiceModal onClose={() => setShowGenerateModal(false)} />}
      {discountInvoiceId !== null && <DiscountModal invoiceId={discountInvoiceId} onClose={() => setDiscountInvoiceId(null)} />}

      <ConfirmDialog
        open={deleteFeeTarget != null}
        title="Désactiver ce barème ?"
        description="Le barème ne sera plus proposé au guichet. Les paiements déjà enregistrés sont conservés."
        impact={deleteFeeTarget ? [`Barème : ${deleteFeeTarget.label}`] : []}
        confirmLabel="Désactiver"
        variant="danger"
        loading={deletingFee}
        onConfirm={confirmDeleteFee}
        onCancel={() => setDeleteFeeTarget(null)}
      />

      <ConfirmDialog
        open={deleteCategoryTarget != null}
        title="Désactiver cette catégorie ?"
        description="La catégorie ne pourra plus être utilisée pour de nouveaux barèmes."
        impact={deleteCategoryTarget ? [`Catégorie : ${deleteCategoryTarget.name} (${deleteCategoryTarget.code})`] : []}
        confirmLabel="Désactiver"
        variant="danger"
        loading={deletingCategory}
        onConfirm={async () => {
          if (!deleteCategoryTarget) return
          try {
            await deleteCategory(deleteCategoryTarget.id)
            toast.success('Catégorie désactivée')
          } catch (err) {
            toast.error('Désactivation impossible', getApiErrorMessage(err))
          } finally {
            setDeleteCategoryTarget(null)
          }
        }}
        onCancel={() => setDeleteCategoryTarget(null)}
      />
    </div>
  )
}
