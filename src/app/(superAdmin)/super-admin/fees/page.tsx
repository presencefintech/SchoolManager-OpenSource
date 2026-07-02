'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import {
  Building2, Plus, RefreshCw, FileText, Tag,
  Zap, Search, CheckCircle2, XCircle, History,
  Receipt, Percent, Users, RotateCcw, Trash2,
} from 'lucide-react'
import {
  useSchools,
  useFeeSchoolStructures,
  useStudentInvoiceAudit,
} from '@/lib/hooks/use-super-admin'
import { feesApi } from '@/lib/superAdmin/api/fees.api'
import type { FeeType } from '@/types/super-admin'
import { cn } from '@/lib/utils'
import { Skeleton } from '@/components/ui/skeleton'

/* ── helpers ────────────────────────────────────────────────────────────── */
const fmt = (n: number) =>
  new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'XOF', maximumFractionDigits: 0 }).format(n)

const FEE_TYPES: { value: FeeType; label: string }[] = [
  { value: 'TUITION',   label: 'Scolarité' },
  { value: 'TRANSPORT', label: 'Transport' },
  { value: 'CANTEEN',   label: 'Cantine' },
  { value: 'OTHER',     label: 'Autre' },
]

const TYPE_COLORS: Record<FeeType, string> = {
  TUITION:   'bg-indigo-50 text-indigo-700',
  TRANSPORT: 'bg-orange-50 text-orange-700',
  CANTEEN:   'bg-emerald-50 text-emerald-700',
  OTHER:     'bg-zinc-100 text-zinc-600',
}

const STATUS_COLORS: Record<string, string> = {
  PAID:    'bg-emerald-50 text-emerald-700',
  PENDING: 'bg-amber-50 text-amber-700',
  OVERDUE: 'bg-red-50 text-red-600',
}

type Feedback = { type: 'success' | 'error'; message: string } | null

function Sk({ className }: { className?: string }) {
  return <div className={cn('rounded-xl bg-zinc-100 animate-pulse', className)} />
}

function FeedbackBanner({ fb }: { fb: Feedback }) {
  if (!fb) return null
  return (
    <div className={cn(
      'flex items-center gap-2 px-4 py-3 rounded-xl text-sm mt-3',
      fb.type === 'success' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'
    )}>
      {fb.type === 'success'
        ? <CheckCircle2 size={14} className="flex-shrink-0" />
        : <XCircle size={14} className="flex-shrink-0" />
      }
      {fb.message}
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════════════════ */

export default function FeesPage() {
  const { data: schools } = useSchools()
  const [schoolId, setSchoolId] = useState<number | null>(null)
  const id = schoolId ?? 0

  const { data: structures, isLoading: loadingStructures, refetch: refetchStructures } =
    useFeeSchoolStructures(id)

  /* ── Upsert structure ─────────────────────────────────────────────────── */
  const [upsertId,      setUpsertId]      = useState('')
  const [upsertName,    setUpsertName]    = useState('')
  const [upsertAmount,  setUpsertAmount]  = useState('')
  const [upsertType,    setUpsertType]    = useState<FeeType>('TUITION')
  const [upsertLevelId, setUpsertLevelId] = useState('')
  const [upsertLoading, setUpsertLoading] = useState(false)
  const [upsertFb,      setUpsertFb]      = useState<Feedback>(null)

  async function handleUpsert() {
    if (!schoolId || !upsertName || !upsertAmount) return
    setUpsertLoading(true); setUpsertFb(null)
    try {
      await feesApi.upsertFee({
        ...(upsertId ? { id: Number(upsertId) } : {}),
        schoolId,
        name: upsertName,
        amount: Number(upsertAmount),
        type: upsertType,
        ...(upsertLevelId ? { levelId: Number(upsertLevelId) } : {}),
      })
      setUpsertFb({ type: 'success', message: upsertId ? 'Structure mise à jour.' : 'Structure créée.' })
      setUpsertId(''); setUpsertName(''); setUpsertAmount(''); setUpsertLevelId('')
      refetchStructures()
    } catch {
      setUpsertFb({ type: 'error', message: 'Erreur lors de l\'opération.' })
    } finally {
      setUpsertLoading(false)
    }
  }

  /* ── Suppression structure ────────────────────────────────────────────── */
  const [deletingFeeId, setDeletingFeeId] = useState<number | null>(null)
  const [deleteFb, setDeleteFb] = useState<Feedback>(null)

  async function handleDeleteFee(feeId: number, name: string) {
    if (!window.confirm(`Supprimer définitivement la structure "${name}" ?`)) return
    setDeletingFeeId(feeId)
    setDeleteFb(null)
    try {
      await feesApi.deleteFee(feeId)
      setDeleteFb({ type: 'success', message: `Structure #${feeId} supprimée.` })
      refetchStructures()
    } catch {
      setDeleteFb({ type: 'error', message: 'Erreur lors de la suppression.' })
    } finally {
      setDeletingFeeId(null)
    }
  }

  /* ── Catégorie ────────────────────────────────────────────────────────── */
  const [catName,    setCatName]    = useState('')
  const [catDesc,    setCatDesc]    = useState('')
  const [catLoading, setCatLoading] = useState(false)
  const [catFb,      setCatFb]      = useState<Feedback>(null)

  async function handleCreateCategory() {
    if (!schoolId || !catName) return
    setCatLoading(true); setCatFb(null)
    try {
      await feesApi.createCategory({ targetSchoolId: schoolId, name: catName, description: catDesc || undefined })
      setCatFb({ type: 'success', message: `Catégorie "${catName}" créée.` })
      setCatName(''); setCatDesc('')
    } catch {
      setCatFb({ type: 'error', message: 'Impossible de créer la catégorie.' })
    } finally {
      setCatLoading(false)
    }
  }

  /* ── Générer facture ──────────────────────────────────────────────────── */
  const [fgStudentId,  setFgStudentId]  = useState('')
  const [fgSessionId,  setFgSessionId]  = useState('')
  const [fgDesc,       setFgDesc]       = useState('')
  const [fgLoading,    setFgLoading]    = useState(false)
  const [fgFb,         setFgFb]         = useState<Feedback>(null)

  async function handleForceGenerate() {
    if (!schoolId || !fgStudentId || !fgSessionId) return
    setFgLoading(true); setFgFb(null)
    try {
      const inv = await feesApi.forceGenerateInvoice({
        schoolId,
        studentId: Number(fgStudentId),
        sessionId: Number(fgSessionId),
        description: fgDesc || undefined,
      })
      setFgFb({ type: 'success', message: `Facture #${inv.id} générée — ${fmt(inv.amount)}` })
      setFgStudentId(''); setFgSessionId(''); setFgDesc('')
    } catch {
      setFgFb({ type: 'error', message: 'Erreur lors de la génération.' })
    } finally {
      setFgLoading(false)
    }
  }

  /* ── Remise ───────────────────────────────────────────────────────────── */
  const [discInvoiceId, setDiscInvoiceId] = useState('')
  const [discAmount,    setDiscAmount]    = useState('')
  const [discReason,    setDiscReason]    = useState('')
  const [discLoading,   setDiscLoading]   = useState(false)
  const [discFb,        setDiscFb]        = useState<Feedback>(null)

  async function handleDiscount() {
    if (!schoolId || !discInvoiceId || !discAmount || !discReason) return
    setDiscLoading(true); setDiscFb(null)
    try {
      await feesApi.applyGlobalDiscount({
        schoolId,
        invoiceId: Number(discInvoiceId),
        amount: Number(discAmount),
        reason: discReason,
      })
      setDiscFb({ type: 'success', message: `Remise de ${fmt(Number(discAmount))} appliquée.` })
      setDiscInvoiceId(''); setDiscAmount(''); setDiscReason('')
    } catch {
      setDiscFb({ type: 'error', message: 'Impossible d\'appliquer la remise.' })
    } finally {
      setDiscLoading(false)
    }
  }

  /* ── Bulk apply ───────────────────────────────────────────────────────── */
  const [bulkIds,     setBulkIds]     = useState('')
  const [bulkLoading, setBulkLoading] = useState(false)
  const [bulkFb,      setBulkFb]      = useState<Feedback>(null)

  async function handleBulkApply() {
    const ids = bulkIds.split(',').map((s) => Number(s.trim())).filter((n) => n > 0)
    if (!ids.length) return
    setBulkLoading(true); setBulkFb(null)
    try {
      const result = await feesApi.bulkApplyFees(ids)
      setBulkFb({ type: 'success', message: `${result.success ?? '?'}/${result.processed ?? ids.length} inscriptions traitées.` })
      setBulkIds('')
    } catch {
      setBulkFb({ type: 'error', message: 'Erreur lors du bulk apply.' })
    } finally {
      setBulkLoading(false)
    }
  }

  /* ── Apply single enrollment ──────────────────────────────────────────── */
  const [applyId,      setApplyId]      = useState('')
  const [applyLoading, setApplyLoading] = useState(false)
  const [applyFb,      setApplyFb]      = useState<Feedback>(null)

  async function handleApplyEnrollment() {
    if (!applyId) return
    setApplyLoading(true); setApplyFb(null)
    try {
      await feesApi.applyFeeToEnrollment(Number(applyId))
      setApplyFb({ type: 'success', message: `Frais appliqués à l'inscription #${applyId}.` })
      setApplyId('')
    } catch {
      setApplyFb({ type: 'error', message: 'Erreur lors de l\'application.' })
    } finally {
      setApplyLoading(false)
    }
  }

  /* ── Réconciliation ───────────────────────────────────────────────────── */
  const [reconcileId,      setReconcileId]      = useState('')
  const [reconcileLoading, setReconcileLoading] = useState(false)
  const [reconcileFb,      setReconcileFb]      = useState<Feedback>(null)

  async function handleReconcile() {
    if (!reconcileId) return
    setReconcileLoading(true); setReconcileFb(null)
    try {
      const result = await feesApi.reconcile(Number(reconcileId))
      const msg = result.newBalance !== undefined
        ? `Balance recalculée : ${fmt(result.newBalance)}`
        : result.message ?? 'Réconciliation effectuée.'
      setReconcileFb({ type: 'success', message: msg })
      setReconcileId('')
    } catch {
      setReconcileFb({ type: 'error', message: 'Erreur lors de la réconciliation.' })
    } finally {
      setReconcileLoading(false)
    }
  }

  /* ── Audit élève ──────────────────────────────────────────────────────── */
  const [auditInput,     setAuditInput]     = useState('')
  const [auditStudentId, setAuditStudentId] = useState(0)

  const { data: invoices, isLoading: loadingInvoices } =
    useStudentInvoiceAudit(id, auditStudentId)

  function triggerAudit() {
    const n = Number(auditInput)
    if (n > 0) setAuditStudentId(n)
  }

  const schoolName = schools?.find((s) => s.id === schoolId)?.name ?? ''

  /* ══════════════════════════════════════════════════════════════════════ */

  return (
    <div className="min-h-screen bg-zinc-50">

      {/* ── Header ── */}
      <motion.div className="bg-white border-b border-zinc-200" initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
        <div className="max-w-7xl mx-auto px-8 py-6 flex items-center justify-between gap-6">
          <div>
            <h1 className="text-3xl font-semibold text-zinc-900 tracking-tight">Frais & Facturation</h1>
            <p className="text-sm text-zinc-400 mt-1">
              {schoolName ? `Gestion — ${schoolName}` : 'Sélectionnez un établissement'}
            </p>
          </div>
          <div className="flex items-center gap-2 border border-zinc-200 rounded-xl px-4 py-2.5 bg-white">
            <Building2 size={14} className="text-zinc-400 flex-shrink-0" />
            <select
              value={schoolId ?? ''}
              onChange={(e) => setSchoolId(e.target.value ? Number(e.target.value) : null)}
              className="text-sm text-zinc-700 bg-transparent focus:outline-none min-w-[220px]"
            >
              <option value="">Choisir un établissement…</option>
              {schools?.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
        </div>
      </motion.div>

      {!schoolId ? (
        <div className="max-w-7xl mx-auto px-8 py-24 flex flex-col items-center gap-4 text-zinc-400">
          <Building2 size={40} className="text-zinc-200" />
          <p className="text-sm">Sélectionnez un établissement pour gérer les frais</p>
        </div>
      ) : (
        <div className="max-w-7xl mx-auto px-8 py-8 space-y-6">

          {/* ══ 1. STRUCTURES + CATÉGORIES ══════════════════════════════════ */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

            {/* Upsert structure */}
            <div className="bg-white rounded-2xl border border-zinc-200 shadow-[0_2px_12px_rgba(0,0,0,0.06)] p-7">
              <div className="flex items-center gap-2 mb-5">
                <Plus size={16} className="text-indigo-500" />
                <h2 className="text-base font-semibold text-zinc-900">Structure de frais</h2>
                <span className="ml-auto text-xs text-zinc-400">Créer ou modifier</span>
              </div>

              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-zinc-500 block mb-1">ID (modification)</label>
                    <input
                      type="number"
                      placeholder="Laisser vide pour créer"
                      value={upsertId}
                      onChange={(e) => setUpsertId(e.target.value)}
                      className="w-full border border-zinc-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-300"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-zinc-500 block mb-1">Type</label>
                    <select
                      value={upsertType}
                      onChange={(e) => setUpsertType(e.target.value as FeeType)}
                      className="w-full border border-zinc-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-300 bg-white"
                    >
                      {FEE_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-medium text-zinc-500 block mb-1">Nom</label>
                  <input
                    type="text"
                    placeholder="Ex : Écolage 2024-2025"
                    value={upsertName}
                    onChange={(e) => setUpsertName(e.target.value)}
                    className="w-full border border-zinc-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-300"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-zinc-500 block mb-1">Montant (XOF)</label>
                    <input
                      type="number"
                      placeholder="150000"
                      value={upsertAmount}
                      onChange={(e) => setUpsertAmount(e.target.value)}
                      className="w-full border border-zinc-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-300"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-zinc-500 block mb-1">ID Niveau (optionnel)</label>
                    <input
                      type="number"
                      placeholder="—"
                      value={upsertLevelId}
                      onChange={(e) => setUpsertLevelId(e.target.value)}
                      className="w-full border border-zinc-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-300"
                    />
                  </div>
                </div>

                <button
                  onClick={handleUpsert}
                  disabled={upsertLoading || !upsertName || !upsertAmount}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {upsertLoading
                    ? <RefreshCw size={14} className="animate-spin" />
                    : <Plus size={14} />
                  }
                  {upsertId ? 'Mettre à jour' : 'Créer la structure'}
                </button>

                <FeedbackBanner fb={upsertFb} />
              </div>
            </div>

            {/* Catégorie */}
            <div className="bg-white rounded-2xl border border-zinc-200 shadow-[0_2px_12px_rgba(0,0,0,0.06)] p-7">
              <div className="flex items-center gap-2 mb-5">
                <Tag size={16} className="text-violet-500" />
                <h2 className="text-base font-semibold text-zinc-900">Nouvelle catégorie</h2>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="text-xs font-medium text-zinc-500 block mb-1">Nom de la catégorie</label>
                  <input
                    type="text"
                    placeholder="Ex : Frais d'inscription"
                    value={catName}
                    onChange={(e) => setCatName(e.target.value)}
                    className="w-full border border-zinc-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-100 focus:border-violet-300"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-zinc-500 block mb-1">Description (optionnelle)</label>
                  <textarea
                    rows={3}
                    placeholder="Précisions sur cette catégorie…"
                    value={catDesc}
                    onChange={(e) => setCatDesc(e.target.value)}
                    className="w-full border border-zinc-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-100 focus:border-violet-300 resize-none"
                  />
                </div>

                <button
                  onClick={handleCreateCategory}
                  disabled={catLoading || !catName}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-violet-600 text-white text-sm font-medium hover:bg-violet-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {catLoading
                    ? <RefreshCw size={14} className="animate-spin" />
                    : <Tag size={14} />
                  }
                  Créer la catégorie
                </button>

                <FeedbackBanner fb={catFb} />
              </div>
            </div>
          </div>

          {/* ══ 2. STRUCTURES LIST ══════════════════════════════════════════ */}
          <div className="bg-white rounded-2xl border border-zinc-200 shadow-[0_2px_12px_rgba(0,0,0,0.06)] overflow-hidden">
            <div className="px-7 py-5 border-b border-zinc-100 flex items-center justify-between">
              <div>
                <h2 className="text-base font-semibold text-zinc-900">Structures actives</h2>
                <p className="text-xs text-zinc-400 mt-0.5">{structures?.length ?? 0} structure{(structures?.length ?? 0) !== 1 ? 's' : ''}</p>
              </div>
              <button
                onClick={() => refetchStructures()}
                className="p-2 rounded-xl hover:bg-zinc-50 transition-colors"
                title="Rafraîchir"
              >
                <RefreshCw size={14} className="text-zinc-400" />
              </button>
            </div>

            {loadingStructures ? (
              <div className="p-6 space-y-2">
                {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-12" />)}
              </div>
            ) : structures?.length ? (
              <div className="divide-y divide-zinc-100">
                {structures.map((s) => (
                  <div key={s.id} className="flex items-center gap-4 px-7 py-4 hover:bg-zinc-50 transition-colors">
                    <div className="w-8 h-8 rounded-lg bg-zinc-100 flex items-center justify-center flex-shrink-0">
                      <FileText size={14} className="text-zinc-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-zinc-800 truncate">{s.name}</p>
                      <p className="text-xs text-zinc-400">ID #{s.id}{s.levelId ? ` · Niveau ${s.levelId}` : ''}</p>
                    </div>
                    <span className={cn('text-xs font-semibold px-2.5 py-1 rounded-full', TYPE_COLORS[s.type])}>
                      {FEE_TYPES.find((t) => t.value === s.type)?.label ?? s.type}
                    </span>
                    <span className="text-sm font-bold text-zinc-900 tabular-nums w-28 text-right">
                      {fmt(s.amount)}
                    </span>
                    <button
                      onClick={() => {
                        setUpsertId(String(s.id))
                        setUpsertName(s.name)
                        setUpsertAmount(String(s.amount))
                        setUpsertType(s.type)
                        setUpsertLevelId(s.levelId ? String(s.levelId) : '')
                        window.scrollTo({ top: 0, behavior: 'smooth' })
                      }}
                      className="text-xs text-indigo-500 hover:text-indigo-700 font-medium flex-shrink-0"
                    >
                      Modifier
                    </button>
                    <button
                      onClick={() => handleDeleteFee(s.id, s.name)}
                      disabled={deletingFeeId === s.id}
                      className="text-xs text-red-500 hover:text-red-700 font-medium flex-shrink-0 flex items-center gap-1 disabled:opacity-50"
                    >
                      {deletingFeeId === s.id ? <RefreshCw size={11} className="animate-spin" /> : <Trash2 size={11} />}
                      Supprimer
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="px-7 py-10 text-center text-sm text-zinc-400">
                Aucune structure de frais pour cet établissement
              </div>
            )}
            {deleteFb && <div className="px-7 py-3 border-t border-zinc-100"><FeedbackBanner fb={deleteFb} /></div>}
          </div>

          {/* ══ 3. FACTURES — GÉNÉRATION + REMISE ══════════════════════════ */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

            {/* Force generate */}
            <div className="bg-white rounded-2xl border border-zinc-200 shadow-[0_2px_12px_rgba(0,0,0,0.06)] p-7">
              <div className="flex items-center gap-2 mb-5">
                <Receipt size={16} className="text-amber-500" />
                <h2 className="text-base font-semibold text-zinc-900">Générer une facture</h2>
              </div>

              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-zinc-500 block mb-1">ID Élève</label>
                    <input
                      type="number"
                      placeholder="Ex : 42"
                      value={fgStudentId}
                      onChange={(e) => setFgStudentId(e.target.value)}
                      className="w-full border border-zinc-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-100 focus:border-amber-300"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-zinc-500 block mb-1">ID Session</label>
                    <input
                      type="number"
                      placeholder="Ex : 1"
                      value={fgSessionId}
                      onChange={(e) => setFgSessionId(e.target.value)}
                      className="w-full border border-zinc-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-100 focus:border-amber-300"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-medium text-zinc-500 block mb-1">Description (optionnelle)</label>
                  <input
                    type="text"
                    placeholder="Raison de la génération forcée…"
                    value={fgDesc}
                    onChange={(e) => setFgDesc(e.target.value)}
                    className="w-full border border-zinc-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-100 focus:border-amber-300"
                  />
                </div>

                <button
                  onClick={handleForceGenerate}
                  disabled={fgLoading || !fgStudentId || !fgSessionId}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-amber-500 text-white text-sm font-medium hover:bg-amber-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {fgLoading ? <RefreshCw size={14} className="animate-spin" /> : <Receipt size={14} />}
                  Forcer la génération
                </button>

                <FeedbackBanner fb={fgFb} />
              </div>
            </div>

            {/* Apply discount */}
            <div className="bg-white rounded-2xl border border-zinc-200 shadow-[0_2px_12px_rgba(0,0,0,0.06)] p-7">
              <div className="flex items-center gap-2 mb-5">
                <Percent size={16} className="text-rose-500" />
                <h2 className="text-base font-semibold text-zinc-900">Remise exceptionnelle</h2>
              </div>

              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-zinc-500 block mb-1">ID Facture</label>
                    <input
                      type="number"
                      placeholder="Ex : 101"
                      value={discInvoiceId}
                      onChange={(e) => setDiscInvoiceId(e.target.value)}
                      className="w-full border border-zinc-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-rose-100 focus:border-rose-300"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-zinc-500 block mb-1">Montant remise (XOF)</label>
                    <input
                      type="number"
                      placeholder="Ex : 10000"
                      value={discAmount}
                      onChange={(e) => setDiscAmount(e.target.value)}
                      className="w-full border border-zinc-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-rose-100 focus:border-rose-300"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-medium text-zinc-500 block mb-1">Motif</label>
                  <input
                    type="text"
                    placeholder="Justification de la remise…"
                    value={discReason}
                    onChange={(e) => setDiscReason(e.target.value)}
                    className="w-full border border-zinc-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-rose-100 focus:border-rose-300"
                  />
                </div>

                <button
                  onClick={handleDiscount}
                  disabled={discLoading || !discInvoiceId || !discAmount || !discReason}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-rose-500 text-white text-sm font-medium hover:bg-rose-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {discLoading ? <RefreshCw size={14} className="animate-spin" /> : <Percent size={14} />}
                  Appliquer la remise
                </button>

                <FeedbackBanner fb={discFb} />
              </div>
            </div>
          </div>

          {/* ══ 4. OPÉRATIONS BULK ══════════════════════════════════════════ */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

            {/* Bulk apply */}
            <div className="bg-white rounded-2xl border border-zinc-200 shadow-[0_2px_12px_rgba(0,0,0,0.06)] p-7">
              <div className="flex items-center gap-2 mb-5">
                <Users size={16} className="text-indigo-500" />
                <h2 className="text-sm font-semibold text-zinc-900">Bulk apply</h2>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="text-xs font-medium text-zinc-500 block mb-1">
                    IDs d'inscriptions <span className="text-zinc-300">(séparés par virgule)</span>
                  </label>
                  <textarea
                    rows={3}
                    placeholder="1, 2, 3, 45, 67…"
                    value={bulkIds}
                    onChange={(e) => setBulkIds(e.target.value)}
                    className="w-full border border-zinc-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-300 resize-none font-mono"
                  />
                </div>

                <button
                  onClick={handleBulkApply}
                  disabled={bulkLoading || !bulkIds.trim()}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {bulkLoading ? <RefreshCw size={14} className="animate-spin" /> : <Zap size={14} />}
                  Appliquer en masse
                </button>

                <FeedbackBanner fb={bulkFb} />
              </div>
            </div>

            {/* Apply single enrollment */}
            <div className="bg-white rounded-2xl border border-zinc-200 shadow-[0_2px_12px_rgba(0,0,0,0.06)] p-7">
              <div className="flex items-center gap-2 mb-5">
                <Zap size={16} className="text-emerald-500" />
                <h2 className="text-sm font-semibold text-zinc-900">Apply inscription</h2>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="text-xs font-medium text-zinc-500 block mb-1">ID Inscription</label>
                  <input
                    type="number"
                    placeholder="Ex : 17"
                    value={applyId}
                    onChange={(e) => setApplyId(e.target.value)}
                    className="w-full border border-zinc-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-100 focus:border-emerald-300"
                  />
                </div>

                <button
                  onClick={handleApplyEnrollment}
                  disabled={applyLoading || !applyId}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {applyLoading ? <RefreshCw size={14} className="animate-spin" /> : <Zap size={14} />}
                  Forcer l'application
                </button>

                <FeedbackBanner fb={applyFb} />
              </div>
            </div>

            {/* Reconcile */}
            <div className="bg-white rounded-2xl border border-zinc-200 shadow-[0_2px_12px_rgba(0,0,0,0.06)] p-7">
              <div className="flex items-center gap-2 mb-5">
                <RotateCcw size={16} className="text-orange-500" />
                <h2 className="text-sm font-semibold text-zinc-900">Réconciliation</h2>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="text-xs font-medium text-zinc-500 block mb-1">ID Inscription</label>
                  <input
                    type="number"
                    placeholder="Ex : 17"
                    value={reconcileId}
                    onChange={(e) => setReconcileId(e.target.value)}
                    className="w-full border border-zinc-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-100 focus:border-orange-300"
                  />
                </div>

                <button
                  onClick={handleReconcile}
                  disabled={reconcileLoading || !reconcileId}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-orange-500 text-white text-sm font-medium hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {reconcileLoading ? <RefreshCw size={14} className="animate-spin" /> : <RotateCcw size={14} />}
                  Recalculer la balance
                </button>

                <FeedbackBanner fb={reconcileFb} />
              </div>
            </div>
          </div>

          {/* ══ 5. AUDIT ÉLÈVE ══════════════════════════════════════════════ */}
          <div className="bg-white rounded-2xl border border-zinc-200 shadow-[0_2px_12px_rgba(0,0,0,0.06)] overflow-hidden">
            <div className="px-7 py-5 border-b border-zinc-100">
              <div className="flex items-center gap-2 mb-1">
                <History size={16} className="text-zinc-500" />
                <h2 className="text-base font-semibold text-zinc-900">Audit factures élève</h2>
              </div>
              <p className="text-xs text-zinc-400">Historique complet des factures d'un élève dans cet établissement</p>
            </div>

            <div className="px-7 py-5 border-b border-zinc-100">
              <div className="flex gap-3">
                <input
                  type="number"
                  placeholder="ID de l'élève…"
                  value={auditInput}
                  onChange={(e) => setAuditInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && triggerAudit()}
                  className="flex-1 border border-zinc-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-200"
                />
                <button
                  onClick={triggerAudit}
                  disabled={!auditInput}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-zinc-900 text-white text-sm font-medium hover:bg-zinc-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  <Search size={14} />
                  Auditer
                </button>
              </div>
            </div>

            {!auditStudentId ? (
              <div className="px-7 py-10 text-center text-sm text-zinc-400">
                Entrez un ID élève pour afficher ses factures
              </div>
            ) : loadingInvoices ? (
              <div className="p-6 space-y-2">
                {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-12" />)}
              </div>
            ) : invoices?.length ? (
              <div className="divide-y divide-zinc-100">
                {invoices.map((inv) => (
                  <div key={inv.id} className="flex items-center gap-4 px-7 py-4 hover:bg-zinc-50 transition-colors">
                    <div className="w-8 h-8 rounded-lg bg-zinc-100 flex items-center justify-center flex-shrink-0">
                      <Receipt size={13} className="text-zinc-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-zinc-800">
                        {inv.description ?? `Facture #${inv.id}`}
                      </p>
                      <p className="text-xs text-zinc-400">
                        {inv.reference ? `Réf. ${inv.reference} · ` : ''}
                        {new Date(inv.createdAt).toLocaleDateString('fr-FR')}
                      </p>
                    </div>
                    <span className={cn(
                      'text-xs font-semibold px-2.5 py-1 rounded-full',
                      STATUS_COLORS[inv.status] ?? 'bg-zinc-100 text-zinc-500'
                    )}>
                      {inv.status}
                    </span>
                    <span className="text-sm font-bold text-zinc-900 tabular-nums w-28 text-right">
                      {fmt(inv.amount)}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="px-7 py-10 text-center text-sm text-zinc-400">
                Aucune facture trouvée pour cet élève
              </div>
            )}
          </div>

        </div>
      )}
    </div>
  )
}
