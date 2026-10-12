'use client'

import { useState, useEffect, useMemo } from 'react'
import { motion } from 'framer-motion'
import {
  DollarSign, Search, RefreshCw, Filter, CheckCircle, XCircle,
  Shield, Send, Ban, Smartphone, Download, CheckCheck, Eye, FileDown, X,
} from 'lucide-react'
import { adminPdfApi } from '@/lib/admin/api'
import {
  usePendingVerifications, useMobilePending, useVerifyPayment,
  useConfirmMobilePayment, useConfirmBankTransaction, useResendReceipt,
  useLinkOrphanTransaction, useAdvancedSearch, useProcessManualPayment,
  useMarkVerificationProcessed, useExportPendingVerifications,
  useAdminStudentFeePeriodStatus,
  useClasses,
  useFeeCategories,
} from '@/lib/hooks/use-admin'
import type { ManualPaymentPayload, AdvancedSearchParams, PendingVerificationItem, PaymentProofType, ConfirmPaymentProofPayload } from '@/types/admin'
import { StudentSearchField } from '@/components/admin/shared/student-search-field'
import { VerificationStepper, FraudScoreBadge, fmtMoney, VerificationDetailDrawer, PaymentProofFields } from '@/components/admin/finance/verification-ui'
import {
  FeeAttributionPanel,
  type FeeAttributionValue,
} from '@/components/finance/fee-attribution-picker'
import { buildPaymentFeeLines } from '@/lib/finance/fee-schedule.utils'
import { defaultProofTypeForMethod, labelPaymentProofType } from '@/lib/finance/payment-proof'
import { useSchoolMoney } from '@/lib/finance/use-school-money'
import { exportRowsToCsv } from '@/lib/finance/export-csv'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { useToast } from '@/providers/toast-provider'
import { getApiErrorMessage, getBackendMessage } from '@/lib/api/client'
import { triggerBlobDownload } from '@/lib/download-blob'
import {
  ManualCatalogFeePanel,
  validateManualCatalogPeriod,
} from '@/components/admin/finance/manual-catalog-fee-panel'

const MOBILE_MONEY_METHODS = new Set(['MOBILE_MONEY', 'ORANGE_MONEY', 'MPESA', 'AIRTEL_MONEY'])

function isMobileMoneyMethod(method?: string) {
  return method ? MOBILE_MONEY_METHODS.has(method.toUpperCase()) : false
}

function paymentStatusClass(status: string) {
  switch (status.toUpperCase()) {
    case 'CONFIRMED':
    case 'RECONCILED':
      return 'bg-emerald-50 text-emerald-700'
    case 'PENDING':
    case 'SUSPICIOUS':
      return 'bg-amber-50 text-amber-700'
    case 'REFUNDED':
      return 'bg-sky-50 text-sky-700'
    case 'FAILED':
      return 'bg-red-50 text-red-700'
    default:
      return 'bg-zinc-100 text-zinc-600'
  }
}

function paymentStatusLabel(status: string) {
  switch (status.toUpperCase()) {
    case 'CONFIRMED':
      return 'Confirmé'
    case 'PENDING':
      return 'En attente'
    case 'FAILED':
      return 'Échoué'
    case 'RECONCILED':
      return 'Réconcilié'
    case 'REFUNDED':
      return 'Remboursé'
    case 'SUSPICIOUS':
      return 'Suspect'
    default:
      return status
  }
}


const fadeUp = { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0, transition: { duration: 0.28, ease: 'easeOut' } } }

function EmptyState({ icon: Icon, message }: { icon: React.ElementType; message: string }) {
  return (
    <div className="py-12 text-center">
      <Icon size={28} className="mx-auto text-zinc-300 mb-2" />
      <p className="text-sm text-zinc-400">{message}</p>
    </div>
  )
}

function ManualPaymentModal({ onClose }: { onClose: () => void }) {
  const { mutateAsync, isPending } = useProcessManualPayment()
  const toast = useToast()
  const [form, setForm] = useState<ManualPaymentPayload>({ studentId: 0, amount: 0, method: 'CASH' })
  const [attribution, setAttribution] = useState<FeeAttributionValue | null>(null)
  const [useCatalogFallback, setUseCatalogFallback] = useState(false)
  const [proofType, setProofType] = useState<PaymentProofType>('CASH_VOUCHER')
  const [manualJustification, setManualJustification] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [paid, setPaid] = useState(false)
  const [successPaymentId, setSuccessPaymentId] = useState<number | null>(null)
  const [downloadingReceipt, setDownloadingReceipt] = useState(false)

  useEffect(() => {
    setProofType(defaultProofTypeForMethod(form.method))
  }, [form.method])

  const { data: catalogPeriodStatus } = useAdminStudentFeePeriodStatus(
    form.studentId,
    useCatalogFallback ? form.feeStructureId : undefined,
  )

  useEffect(() => {
    if (
      useCatalogFallback &&
      catalogPeriodStatus?.billingPeriod === 'MONTHLY' &&
      catalogPeriodStatus.allowedMonthYear &&
      !form.monthYear
    ) {
      setForm((p) => ({ ...p, monthYear: catalogPeriodStatus.allowedMonthYear! }))
    }
  }, [useCatalogFallback, catalogPeriodStatus?.allowedMonthYear, catalogPeriodStatus?.billingPeriod, form.monthYear])

  function handleStudentSelect(id: number) {
    setForm(p => ({ ...p, studentId: id, amount: 0, feeStructureId: undefined, monthYear: undefined, sessionId: undefined }))
    setAttribution(null)
    setUseCatalogFallback(false)
  }

  function handleAttributionChange(next: FeeAttributionValue | null) {
    setAttribution(next)
    setUseCatalogFallback(false)
    const feeLines = next ? buildPaymentFeeLines(next.lines) : undefined
    setForm(p => ({
      ...p,
      amount: next?.totalAmount ?? 0,
      sessionId: next?.sessionId,
      feeStructureId: undefined,
      monthYear: undefined,
      fees: feeLines,
    }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.studentId) {
      setError('Sélectionnez un élève dans la liste.')
      return
    }
    if (!attribution && !useCatalogFallback) {
      setError('Sélectionnez une ligne d\'échéancier ou activez le mode hors échéancier.')
      return
    }
    if (!form.amount || form.amount <= 0) {
      setError('Montant invalide.')
      return
    }
    if (proofType === 'OTHER' && manualJustification.trim().length < 10) {
      setError('Un motif explicite (min. 10 caractères) est requis pour le type « Autre ».')
      return
    }
    if (useCatalogFallback && form.feeStructureId) {
      const periodError = validateManualCatalogPeriod(catalogPeriodStatus, form.monthYear)
      if (periodError) {
        setError(periodError)
        return
      }
    }
    setError(null)
    try {
      const payment = await mutateAsync({
        ...form,
        proofType,
        manualJustification: manualJustification.trim() || undefined,
      }) as { id?: number } | undefined
      const id = Number(payment?.id)
      setSuccessPaymentId(Number.isFinite(id) && id > 0 ? id : null)
      setPaid(true)
    }
    catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      setError(msg ?? 'Erreur lors de l\'enregistrement')
    }
  }

  async function handleDownloadSuccessReceipt() {
    if (!successPaymentId) return
    setDownloadingReceipt(true)
    try {
      const blob = await adminPdfApi.getReceipt(successPaymentId)
      triggerBlobDownload(blob, `recu-${successPaymentId}.pdf`)
      toast.success('Reçu PDF', 'Le fichier a été téléchargé.')
    } catch (err) {
      toast.error('Téléchargement impossible', getApiErrorMessage(err))
    } finally {
      setDownloadingReceipt(false)
    }
  }

  if (paid) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
        <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6">
          <h2 className="text-lg font-semibold text-zinc-900 mb-5">Paiement manuel</h2>
          <div className="text-center py-6">
            <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-3">
              <CheckCircle size={20} className="text-emerald-600" />
            </div>
            <p className="text-sm font-medium text-zinc-800">Paiement enregistré</p>
            {successPaymentId ? (
              <button
                type="button"
                onClick={() => void handleDownloadSuccessReceipt()}
                disabled={downloadingReceipt}
                className="mt-4 w-full px-4 py-2 rounded-xl border border-emerald-200 bg-emerald-50 text-sm font-medium text-emerald-800 hover:bg-emerald-100 disabled:opacity-50"
              >
                {downloadingReceipt ? 'Préparation du reçu...' : 'Télécharger le reçu PDF'}
              </button>
            ) : null}
            <button
              type="button"
              onClick={onClose}
              className="mt-3 w-full px-4 py-2 rounded-xl bg-emerald-600 text-sm text-white"
            >
              Fermer
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
        <h2 className="text-lg font-semibold text-zinc-900 mb-5">Paiement manuel</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <StudentSearchField
              studentId={form.studentId}
              onSelect={handleStudentSelect}
            />

            {form.studentId > 0 && !useCatalogFallback && (
              <FeeAttributionPanel
                api="admin"
                compact
                studentId={form.studentId}
                value={attribution}
                onChange={handleAttributionChange}
              />
            )}

            {form.studentId > 0 && (
              <label className="flex items-center gap-2 text-xs text-zinc-500 cursor-pointer">
                <input
                  type="checkbox"
                  checked={useCatalogFallback}
                  onChange={(e) => {
                    setUseCatalogFallback(e.target.checked)
                    setAttribution(null)
                    setForm(p => ({
                      ...p,
                      amount: 0,
                      feeStructureId: undefined,
                      monthYear: undefined,
                      sessionId: undefined,
                      fees: undefined,
                    }))
                  }}
                  className="rounded border-zinc-300"
                />
                Paiement hors échéancier (montant libre ou barème catalogue + période serveur)
              </label>
            )}

            {form.studentId > 0 && useCatalogFallback && (
              <ManualCatalogFeePanel
                studentId={form.studentId}
                feeStructureId={form.feeStructureId}
                monthYear={form.monthYear}
                onFeeStructureChange={(feeStructureId) =>
                  setForm((p) => ({
                    ...p,
                    feeStructureId,
                    monthYear: undefined,
                    fees: undefined,
                  }))
                }
                onMonthYearChange={(monthYear) => setForm((p) => ({ ...p, monthYear }))}
              />
            )}

            <div>
              <label className="block text-xs font-medium text-zinc-500 mb-1">Montant (USD) *</label>
              <input
                type="number"
                required
                min={1}
                readOnly={!!attribution}
                value={form.amount || ''}
                onChange={e => setForm(p => ({ ...p, amount: Number(e.target.value) }))}
                className="w-full px-3 py-2 rounded-lg border border-zinc-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 read-only:bg-zinc-50"
              />
              {attribution && (
                <p className="text-xs text-emerald-600 mt-1">
                  {attribution.lines.length} ligne{attribution.lines.length > 1 ? 's' : ''} ventilée{attribution.lines.length > 1 ? 's' : ''}
                </p>
              )}
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-500 mb-1">Mode de paiement *</label>
              <select value={form.method}
                onChange={e => setForm(p => ({ ...p, method: e.target.value as ManualPaymentPayload['method'] }))}
                className="w-full px-3 py-2 rounded-lg border border-zinc-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400">
                <option value="CASH">Espèces</option>
                <option value="BANK_TRANSFER">Virement bancaire</option>
                <option value="MOBILE_MONEY">Mobile Money</option>
                <option value="CHEQUE">Chèque</option>
                <option value="ORANGE_MONEY">Orange Money</option>
                <option value="MPESA">M-Pesa</option>
                <option value="AIRTEL_MONEY">Airtel Money</option>
              </select>
            </div>
            {form.method !== 'CASH' && (
              <div>
                <label className="block text-xs font-medium text-zinc-500 mb-1">Référence opérateur</label>
                <input
                  value={form.reference ?? ''}
                  placeholder="REF-XXXX (recommandé)"
                  onChange={e => setForm(p => ({ ...p, reference: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg border border-zinc-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
                />
              </div>
            )}
            <PaymentProofFields
              method={form.method}
              proofType={proofType}
              manualJustification={manualJustification}
              onProofTypeChange={setProofType}
              onJustificationChange={setManualJustification}
            />
            <div>
              <label className="block text-xs font-medium text-zinc-500 mb-1">Note interne</label>
              <input value={form.note ?? ''} placeholder="Optionnel"
                onChange={e => setForm(p => ({ ...p, note: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg border border-zinc-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400" />
            </div>
            {error && <p className="text-xs text-red-500 bg-red-50 rounded-lg px-3 py-2">{error}</p>}
            <div className="flex gap-2 pt-2">
              <button type="button" onClick={onClose} className="flex-1 px-4 py-2 rounded-xl border border-zinc-200 text-sm text-zinc-600 hover:bg-zinc-50">Annuler</button>
              <button type="submit" disabled={isPending} className="flex-1 px-4 py-2 rounded-xl bg-emerald-600 text-sm text-white font-medium hover:bg-emerald-700 disabled:opacity-50">
                {isPending ? 'Enregistrement...' : 'Enregistrer'}
              </button>
            </div>
          </form>
      </div>
    </div>
  )
}

function ProviderConfirmModal({
  target,
  onClose,
  onConfirm,
  isPending,
}: {
  target: { paymentId: number; method: string; kind: 'bank' | 'mobile'; label?: string }
  onClose: () => void
  onConfirm: (proof: ConfirmPaymentProofPayload) => void
  isPending?: boolean
}) {
  const [proofType, setProofType] = useState<PaymentProofType>(defaultProofTypeForMethod(target.method))
  const [manualJustification, setManualJustification] = useState('')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setProofType(defaultProofTypeForMethod(target.method))
    setManualJustification('')
    setError(null)
  }, [target.paymentId, target.method])

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (proofType === 'OTHER' && manualJustification.trim().length < 10) {
      setError('Un motif explicite (min. 10 caractères) est requis pour le type « Autre ».')
      return
    }
    setError(null)
    onConfirm({
      proofType,
      manualJustification: manualJustification.trim() || undefined,
    })
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 mx-4">
        <h2 className="text-lg font-semibold text-zinc-900 mb-1">
          {target.kind === 'mobile' ? 'Confirmer Mobile Money' : 'Confirmer virement bancaire'}
        </h2>
        <p className="text-xs text-zinc-500 mb-5">
          {target.label ?? `Paiement #${target.paymentId}`} — indiquez le type de preuve utilisé pour la validation.
        </p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <PaymentProofFields
            method={target.method}
            proofType={proofType}
            manualJustification={manualJustification}
            onProofTypeChange={setProofType}
            onJustificationChange={setManualJustification}
          />
          {error && <p className="text-xs text-red-500 bg-red-50 rounded-lg px-3 py-2">{error}</p>}
          <div className="flex gap-2 pt-2">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-2 rounded-xl border border-zinc-200 text-sm text-zinc-600 hover:bg-zinc-50">Annuler</button>
            <button type="submit" disabled={isPending} className="flex-1 px-4 py-2 rounded-xl bg-blue-600 text-sm text-white font-medium hover:bg-blue-700 disabled:opacity-50">
              {isPending ? 'Confirmation…' : 'Confirmer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function LinkOrphanModal({ onClose }: { onClose: () => void }) {
  const { mutateAsync, isPending } = useLinkOrphanTransaction()
  const [form, setForm] = useState({ transactionRef: '', studentId: 0 })
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.studentId) {
      setError('Sélectionnez un élève.')
      return
    }
    setError(null)
    try { await mutateAsync(form); setSuccess(true) }
    catch (err) { setError(getBackendMessage(err) ?? 'Erreur') }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 mx-4">
        <h2 className="text-lg font-semibold text-zinc-900 mb-5">Lier une transaction orpheline</h2>
        {success ? (
          <div className="text-center py-6">
            <CheckCircle size={20} className="mx-auto text-emerald-600 mb-2" />
            <p className="text-sm text-zinc-800">Transaction liée avec succès</p>
            <button onClick={onClose} className="mt-4 px-4 py-2 rounded-xl bg-emerald-600 text-sm text-white">Fermer</button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-zinc-500 mb-1">Référence transaction *</label>
              <input required value={form.transactionRef}
                onChange={e => setForm(p => ({ ...p, transactionRef: e.target.value }))}
                placeholder="REF-XXXX"
                className="w-full px-3 py-2 rounded-lg border border-zinc-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400" />
            </div>
            <StudentSearchField
              studentId={form.studentId}
              onSelect={(id) => setForm((p) => ({ ...p, studentId: id }))}
            />
            {error && <p className="text-xs text-red-500 bg-red-50 rounded-lg px-3 py-2">{error}</p>}
            <div className="flex gap-2 pt-2">
              <button type="button" onClick={onClose} className="flex-1 px-4 py-2 rounded-xl border border-zinc-200 text-sm text-zinc-600 hover:bg-zinc-50">Annuler</button>
              <button type="submit" disabled={isPending} className="flex-1 px-4 py-2 rounded-xl bg-emerald-600 text-sm text-white font-medium disabled:opacity-50">
                {isPending ? 'Liaison...' : 'Lier'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}

export default function PaiementsPage() {
  const { format: formatMoney } = useSchoolMoney()
  const toast = useToast()
  const { data: pending = [], refetch: refetchPending } = usePendingVerifications()
  const { data: mobilePending = [], refetch: refetchMobile } = useMobilePending()
  const { data: classes = [] } = useClasses({ isActive: true })
  const { data: feeCategories = [] } = useFeeCategories({ isActive: true })
  const { mutate: verify, isPending: verifying } = useVerifyPayment()
  const { mutate: confirmMobile, isPending: confirming } = useConfirmMobilePayment()
  const confirmBank = useConfirmBankTransaction()
  const { mutate: resendReceipt } = useResendReceipt()
  const markProcessed = useMarkVerificationProcessed()
  const exportReport = useExportPendingVerifications()
  const [showManual, setShowManual] = useState(false)
  const [showLinkOrphan, setShowLinkOrphan] = useState(false)
  const [mobileActionError, setMobileActionError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [searchParams, setSearchParams] = useState<AdvancedSearchParams>({})
  const [searchDraft, setSearchDraft] = useState<AdvancedSearchParams>({})
  const [showAdvanced, setShowAdvanced] = useState(true)
  const [processConfirm, setProcessConfirm] = useState<PendingVerificationItem | null>(null)
  const [detailItem, setDetailItem] = useState<PendingVerificationItem | null>(null)
  const [providerConfirm, setProviderConfirm] = useState<{
    paymentId: number
    method: string
    kind: 'bank' | 'mobile'
    label?: string
  } | null>(null)
  const [resendingId, setResendingId] = useState<number | null>(null)
  const { data: searchResults, isFetching: searching } = useAdvancedSearch(searchParams, {
    enabled: Object.keys(searchParams).length > 0,
  })
  const searchRows = searchResults?.data ?? []
  const searchTotal = searchResults?.total ?? searchRows.length
  const searchTotalAmount = searchResults?.totalAmount
  const searchPage = searchResults?.page ?? 1
  const searchLastPage = searchResults?.lastPage ?? 1

  const todayIso = new Date().toISOString().slice(0, 10)
  const weekAgoIso = new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10)

  const QUICK_CHIPS = [
    { label: "Aujourd'hui", patch: { startDate: todayIso, endDate: todayIso } },
    { label: '7 derniers jours', patch: { startDate: weekAgoIso, endDate: todayIso } },
    { label: 'En attente', patch: { status: 'PENDING' } },
    { label: 'Confirmés', patch: { status: 'CONFIRMED' } },
    { label: 'Mobile Money', patch: { method: 'MOBILE_MONEY' } },
    { label: 'Espèces', patch: { method: 'CASH' } },
    { label: 'Signalés', patch: { isFlagged: true } },
  ] as const

  const sections = useMemo(() => {
    const map = new Map<number, string>()
    for (const c of classes) {
      if (c.sectionId && c.sectionName) map.set(c.sectionId, c.sectionName)
    }
    return Array.from(map.entries())
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name, 'fr'))
  }, [classes])

  const options = useMemo(() => {
    const map = new Map<number, string>()
    for (const c of classes) {
      if (searchDraft.sectionId && c.sectionId !== searchDraft.sectionId) continue
      if (c.optionId && c.optionName) map.set(c.optionId, c.optionName)
    }
    return Array.from(map.entries())
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name, 'fr'))
  }, [classes, searchDraft.sectionId])

  const filteredClasses = useMemo(() => {
    return classes
      .filter((c) => {
        if (searchDraft.sectionId && c.sectionId !== searchDraft.sectionId) return false
        if (searchDraft.optionId && c.optionId !== searchDraft.optionId) return false
        return true
      })
      .slice()
      .sort((a, b) => a.name.localeCompare(b.name, 'fr'))
  }, [classes, searchDraft.sectionId, searchDraft.optionId])

  const activeFilterChips = useMemo(() => {
    const chips: { key: string; label: string }[] = []
    if (searchParams.search) chips.push({ key: 'search', label: `« ${searchParams.search} »` })
    if (searchParams.sectionId) {
      const s = sections.find((x) => x.id === searchParams.sectionId)
      chips.push({ key: 'sectionId', label: `Section: ${s?.name ?? searchParams.sectionId}` })
    }
    if (searchParams.optionId) {
      const o = options.find((x) => x.id === searchParams.optionId)
      chips.push({ key: 'optionId', label: `Option: ${o?.name ?? searchParams.optionId}` })
    }
    if (searchParams.classId) {
      const c = classes.find((x) => x.id === searchParams.classId)
      chips.push({ key: 'classId', label: `Classe: ${c?.name ?? searchParams.classId}` })
    }
    if (searchParams.status) chips.push({ key: 'status', label: `Statut: ${paymentStatusLabel(searchParams.status)}` })
    if (searchParams.method) chips.push({ key: 'method', label: `Méthode: ${searchParams.method}` })
    if (searchParams.feeCategoryId) {
      const cat = feeCategories.find((c) => c.id === searchParams.feeCategoryId)
      chips.push({ key: 'feeCategoryId', label: `Frais: ${cat?.name ?? searchParams.feeCategoryId}` })
    }
    if (searchParams.billingPeriod) {
      chips.push({ key: 'billingPeriod', label: `Périodicité: ${searchParams.billingPeriod}` })
    }
    if (searchParams.monthYear) {
      chips.push({ key: 'monthYear', label: `Mois: ${searchParams.monthYear}` })
    }
    if (searchParams.currency) chips.push({ key: 'currency', label: `Devise: ${searchParams.currency}` })
    if (searchParams.channel) chips.push({ key: 'channel', label: `Canal: ${searchParams.channel}` })
    if (searchParams.startDate || searchParams.endDate) {
      chips.push({
        key: 'dates',
        label: `Période: ${searchParams.startDate ?? '…'} → ${searchParams.endDate ?? '…'}`,
      })
    }
    if (searchParams.minAmount != null || searchParams.maxAmount != null) {
      chips.push({
        key: 'amount',
        label: `Montant: ${searchParams.minAmount ?? 0} – ${searchParams.maxAmount ?? '∞'}`,
      })
    }
    if (searchParams.isFlagged) chips.push({ key: 'isFlagged', label: 'Signalés' })
    return chips
  }, [searchParams, sections, options, classes, feeCategories])

  const selectCls =
    'w-full px-3 py-1.5 rounded-lg border border-zinc-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400'

  const filteredPending = pending.filter((p: PendingVerificationItem) => {
    if (!search.trim()) return true
    const q = search.toLowerCase()
    return (
      p.studentName?.toLowerCase().includes(q) ||
      p.reference?.toLowerCase().includes(q) ||
      p.providerRef?.toLowerCase().includes(q) ||
      String(p.amount ?? '').includes(q)
    )
  })

  function cleanSearchParams(next: AdvancedSearchParams): AdvancedSearchParams {
    return Object.fromEntries(
      Object.entries(next).filter(([, v]) => v !== undefined && v !== '' && v !== 0),
    ) as AdvancedSearchParams
  }

  function applyAdvancedSearch(overrides?: Partial<AdvancedSearchParams>) {
    const merged = { ...searchDraft, ...overrides }
    const text = String(overrides?.search ?? merged.search ?? search).trim()
    const next: AdvancedSearchParams = {
      ...merged,
      search: text || undefined,
      page: overrides?.page ?? 1,
      limit: merged.limit ?? 50,
      sortBy: merged.sortBy ?? 'createdAt',
      sortOrder: merged.sortOrder ?? 'desc',
    }
    const cleaned = cleanSearchParams(next)
    setSearchDraft((d) => ({ ...d, ...overrides, search: text || d.search }))
    if (text) setSearch(text)
    setSearchParams(cleaned)
    setShowAdvanced(true)
  }

  function resetAdvancedSearch() {
    setSearchDraft({})
    setSearchParams({})
    setSearch('')
  }

  function removeFilterChip(key: string) {
    const clearDates = key === 'dates'
    const clearAmount = key === 'amount'
    const patch: Partial<AdvancedSearchParams> = clearDates
      ? { startDate: undefined, endDate: undefined }
      : clearAmount
        ? { minAmount: undefined, maxAmount: undefined }
        : { [key]: undefined }
    const nextDraft = { ...searchDraft, ...patch }
    if (key === 'search') {
      nextDraft.search = undefined
      setSearch('')
    }
    setSearchDraft(nextDraft)
    const nextParams = { ...searchParams, ...patch, page: 1 }
    if (key === 'search') nextParams.search = undefined
    setSearchParams(cleanSearchParams(nextParams))
  }

  function handleExportSearchCsv() {
    if (searchRows.length === 0) return
    exportRowsToCsv(
      searchRows.map((r) => ({
        id: r.id,
        eleve: r.studentName,
        matricule: r.matricule ?? '',
        section: r.sectionName ?? '',
        option: r.optionName ?? '',
        classe: r.className ?? '',
        frais: (r.feeLabels ?? []).join(' | '),
        montant: r.amount,
        devise: r.currency ?? '',
        methode: r.method,
        statut: r.status,
        reference: r.reference ?? '',
        recu: r.receiptNumber ?? '',
        telephone: r.phone ?? '',
        caissier: r.cashierName ?? '',
        signale: r.isFlagged ? 'oui' : 'non',
        date: r.createdAt ? new Date(r.createdAt).toLocaleString('fr-FR') : '',
      })),
      `paiements-recherche-${new Date().toISOString().slice(0, 10)}.csv`,
    )
    toast.success('Export CSV', `${searchRows.length} ligne(s) téléchargée(s).`)
  }

  function nextVerifyAction(p: PendingVerificationItem): 'FINANCE' | 'ADMIN' | null {
    if (!p.financeCheck) return 'FINANCE'
    if (!p.adminCheck) return 'ADMIN'
    return null
  }

  async function handleDownloadReceipt(paymentId: number) {
    try {
      const blob = await adminPdfApi.getReceipt(paymentId)
      triggerBlobDownload(blob, `recu-${paymentId}.pdf`)
      toast.success('Reçu PDF', 'Le fichier a été téléchargé.')
    } catch (err) {
      toast.error('Téléchargement impossible', getApiErrorMessage(err))
    }
  }

  async function handleExportReport() {
    try {
      const blob = await exportReport.mutateAsync('csv')
      const url = URL.createObjectURL(blob as Blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `verifications-en-attente-${new Date().toISOString().slice(0, 10)}.csv`
      a.click()
      URL.revokeObjectURL(url)
      toast.success('Rapport exporté', 'Le fichier CSV a été téléchargé.')
    } catch {
      toast.error('Export impossible', 'Réessayez dans quelques instants.')
    }
  }

  async function confirmMarkProcessed() {
    if (!processConfirm) return
    try {
      await markProcessed.mutateAsync({ verificationId: processConfirm.verificationId })
      toast.success('Paiement traité', `${processConfirm.studentName} — dossier clôturé.`)
    } catch (err) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Action impossible'
      toast.error('Échec', msg)
    } finally {
      setProcessConfirm(null)
    }
  }

  return (
    <div className="space-y-6">
      <motion.div
        className="flex items-center justify-between"
        initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}
      >
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">Paiements</h1>
          <p className="text-sm text-zinc-500 mt-0.5">
            Vérification · recherche avancée (section / option / classe / frais) · validation
          </p>
        </div>
        {pending.length > 0 && (
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-50 border border-amber-100">
            <DollarSign size={13} className="text-amber-600" />
            <span className="text-xs font-medium text-amber-700">{pending.length} en attente</span>
          </div>
        )}
      </motion.div>

      <div className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div className="relative flex-1 max-w-xl">
            <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  applyAdvancedSearch({ search: search.trim() || undefined })
                }
              }}
              placeholder="Nom, matricule, référence, reçu, téléphone, caissier, frais…"
              className="w-full pl-9 pr-24 py-2 bg-white border border-zinc-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
            />
            <button
              type="button"
              onClick={() => applyAdvancedSearch({ search: search.trim() || undefined })}
              className="absolute right-1.5 top-1/2 -translate-y-1/2 px-3 py-1 rounded-lg bg-emerald-600 text-xs text-white font-medium hover:bg-emerald-700"
            >
              Chercher
            </button>
          </div>
          <div className="flex flex-wrap gap-2 justify-end">
            <button onClick={() => { refetchPending(); refetchMobile() }}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-zinc-200 text-xs text-zinc-600 hover:bg-zinc-50">
              <RefreshCw size={12} /> Actualiser
            </button>
            <button onClick={() => setShowAdvanced(v => !v)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs transition-colors ${showAdvanced ? 'border-emerald-300 bg-emerald-50 text-emerald-700' : 'border-zinc-200 text-zinc-600 hover:bg-zinc-50'}`}>
              <Filter size={12} /> Recherche avancée
            </button>
            <button onClick={() => setShowLinkOrphan(true)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-zinc-200 text-xs text-zinc-600 hover:bg-zinc-50">
              <Ban size={12} /> Lier orpheline
            </button>
            <button
              onClick={handleExportReport}
              disabled={exportReport.isPending || pending.length === 0}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-zinc-200 text-xs text-zinc-600 hover:bg-zinc-50 disabled:opacity-40"
            >
              <Download size={12} /> Exporter le rapport
            </button>
            <button onClick={() => setShowManual(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 text-sm text-white font-medium hover:bg-emerald-700 shadow-sm">
              <DollarSign size={14} /> Paiement manuel
            </button>
          </div>
        </div>

        <div className="space-y-1.5">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-400">
            Filtres rapides
          </p>
          <div className="flex flex-wrap gap-1.5">
            {QUICK_CHIPS.map((chip) => (
              <button
                key={chip.label}
                type="button"
                onClick={() => applyAdvancedSearch({ ...chip.patch })}
                className="rounded-full border border-emerald-200 bg-emerald-50/80 px-3 py-1 text-[11px] font-medium text-emerald-800 hover:bg-emerald-100"
              >
                {chip.label}
              </button>
            ))}
          </div>
        </div>

        {activeFilterChips.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] text-zinc-400">Filtres actifs :</span>
            {activeFilterChips.map((chip) => (
              <button
                key={chip.key}
                type="button"
                onClick={() => removeFilterChip(chip.key)}
                className="inline-flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-100 px-2.5 py-0.5 text-[11px] font-medium text-emerald-700 hover:bg-emerald-100"
              >
                {chip.label}
                <X size={10} />
              </button>
            ))}
            <button
              type="button"
              onClick={resetAdvancedSearch}
              className="text-[11px] text-zinc-500 underline-offset-2 hover:underline"
            >
              Tout effacer
            </button>
          </div>
        )}
      </div>

      {showAdvanced && (
        <div className="bg-white rounded-2xl border border-zinc-100 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold text-zinc-900">Recherche avancée</h3>
              <p className="text-[11px] text-zinc-400 mt-0.5">
                Structure scolaire, frais, canal, montants, tri — multi-mots (AND)
              </p>
            </div>
            <button
              type="button"
              onClick={resetAdvancedSearch}
              className="flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-700"
            >
              <X size={12} /> Réinitialiser
            </button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="md:col-span-2">
              <label className="block text-xs text-zinc-500 mb-1">Texte libre</label>
              <input
                value={searchDraft.search ?? ''}
                onChange={(e) => setSearchDraft((p) => ({ ...p, search: e.target.value || undefined }))}
                placeholder="Plusieurs mots : nom + classe + réf…"
                className={selectCls}
              />
            </div>
            <div>
              <label className="block text-xs text-zinc-500 mb-1">Section</label>
              <select
                value={searchDraft.sectionId ?? ''}
                onChange={(e) => {
                  const sectionId = e.target.value ? Number(e.target.value) : undefined
                  setSearchDraft((p) => ({
                    ...p,
                    sectionId,
                    optionId: undefined,
                    classId: undefined,
                  }))
                }}
                className={selectCls}
              >
                <option value="">Toutes</option>
                {sections.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-zinc-500 mb-1">Option</label>
              <select
                value={searchDraft.optionId ?? ''}
                onChange={(e) => {
                  const optionId = e.target.value ? Number(e.target.value) : undefined
                  setSearchDraft((p) => ({
                    ...p,
                    optionId,
                    classId: undefined,
                  }))
                }}
                className={selectCls}
              >
                <option value="">Toutes</option>
                {options.map((o) => (
                  <option key={o.id} value={o.id}>{o.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-zinc-500 mb-1">Classe</label>
              <select
                value={searchDraft.classId ?? ''}
                onChange={(e) =>
                  setSearchDraft((p) => ({
                    ...p,
                    classId: e.target.value ? Number(e.target.value) : undefined,
                  }))
                }
                className={selectCls}
              >
                <option value="">Toutes</option>
                {filteredClasses.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <StudentSearchField
              studentId={searchDraft.studentId ?? 0}
              onSelect={(id) => setSearchDraft(p => ({ ...p, studentId: id > 0 ? id : undefined }))}
              label="Élève"
            />
            <div>
              <label className="block text-xs text-zinc-500 mb-1">Catégorie de frais</label>
              <select
                value={searchDraft.feeCategoryId ?? ''}
                onChange={(e) =>
                  setSearchDraft((p) => ({
                    ...p,
                    feeCategoryId: e.target.value ? Number(e.target.value) : undefined,
                  }))
                }
                className={selectCls}
              >
                <option value="">Toutes</option>
                {feeCategories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-zinc-500 mb-1">Périodicité</label>
              <select
                value={searchDraft.billingPeriod ?? ''}
                onChange={(e) =>
                  setSearchDraft((p) => ({ ...p, billingPeriod: e.target.value || undefined }))
                }
                className={selectCls}
              >
                <option value="">Toutes</option>
                <option value="MONTHLY">Mensuel</option>
                <option value="TERM">Trimestriel</option>
                <option value="ANNUAL">Annuel</option>
                <option value="ONE_TIME">Ponctuel</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-zinc-500 mb-1">Mois (AAAA-MM)</label>
              <input
                type="month"
                value={searchDraft.monthYear ?? ''}
                onChange={(e) =>
                  setSearchDraft((p) => ({ ...p, monthYear: e.target.value || undefined }))
                }
                className={selectCls}
              />
            </div>
            <div>
              <label className="block text-xs text-zinc-500 mb-1">Méthode</label>
              <select value={searchDraft.method ?? ''} onChange={e => setSearchDraft(p => ({ ...p, method: e.target.value || undefined }))}
                className={selectCls}>
                <option value="">Toutes</option>
                <option value="CASH">Espèces</option>
                <option value="BANK_TRANSFER">Virement</option>
                <option value="MOBILE_MONEY">Mobile Money</option>
                <option value="CHEQUE">Chèque</option>
                <option value="ORANGE_MONEY">Orange Money</option>
                <option value="MPESA">M-Pesa</option>
                <option value="AIRTEL_MONEY">Airtel Money</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-zinc-500 mb-1">Statut</label>
              <select value={searchDraft.status ?? ''} onChange={e => setSearchDraft(p => ({ ...p, status: e.target.value || undefined }))}
                className={selectCls}>
                <option value="">Tous</option>
                <option value="PENDING">En attente</option>
                <option value="CONFIRMED">Confirmé</option>
                <option value="RECONCILED">Réconcilié</option>
                <option value="REFUNDED">Remboursé</option>
                <option value="FAILED">Échoué</option>
                <option value="SUSPICIOUS">Suspect</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-zinc-500 mb-1">Devise</label>
              <select
                value={searchDraft.currency ?? ''}
                onChange={(e) =>
                  setSearchDraft((p) => ({ ...p, currency: e.target.value || undefined }))
                }
                className={selectCls}
              >
                <option value="">Toutes</option>
                <option value="USD">USD</option>
                <option value="CDF">CDF</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-zinc-500 mb-1">Canal</label>
              <select
                value={searchDraft.channel ?? ''}
                onChange={(e) =>
                  setSearchDraft((p) => ({ ...p, channel: e.target.value || undefined }))
                }
                className={selectCls}
              >
                <option value="">Tous</option>
                <option value="WEB">Web</option>
                <option value="MOBILE">Mobile</option>
                <option value="CASHIER">Guichet</option>
                <option value="API">API</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-zinc-500 mb-1">Montant min</label>
              <input type="number" min={0} value={searchDraft.minAmount ?? ''}
                onChange={e => setSearchDraft(p => ({ ...p, minAmount: e.target.value ? Number(e.target.value) : undefined }))}
                className={selectCls} />
            </div>
            <div>
              <label className="block text-xs text-zinc-500 mb-1">Montant max</label>
              <input type="number" min={0} value={searchDraft.maxAmount ?? ''}
                onChange={e => setSearchDraft(p => ({ ...p, maxAmount: e.target.value ? Number(e.target.value) : undefined }))}
                className={selectCls} />
            </div>
            <div>
              <label className="block text-xs text-zinc-500 mb-1">Date début</label>
              <input type="date" value={searchDraft.startDate ?? ''}
                onChange={e => setSearchDraft(p => ({ ...p, startDate: e.target.value || undefined }))}
                className={selectCls} />
            </div>
            <div>
              <label className="block text-xs text-zinc-500 mb-1">Date fin</label>
              <input type="date" value={searchDraft.endDate ?? ''}
                onChange={e => setSearchDraft(p => ({ ...p, endDate: e.target.value || undefined }))}
                className={selectCls} />
            </div>
            <div>
              <label className="block text-xs text-zinc-500 mb-1">Trier par</label>
              <select
                value={searchDraft.sortBy ?? 'createdAt'}
                onChange={(e) =>
                  setSearchDraft((p) => ({
                    ...p,
                    sortBy: (e.target.value as AdvancedSearchParams['sortBy']) || 'createdAt',
                  }))
                }
                className={selectCls}
              >
                <option value="createdAt">Date</option>
                <option value="amount">Montant</option>
                <option value="status">Statut</option>
                <option value="method">Méthode</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-zinc-500 mb-1">Ordre</label>
              <select
                value={searchDraft.sortOrder ?? 'desc'}
                onChange={(e) =>
                  setSearchDraft((p) => ({
                    ...p,
                    sortOrder: e.target.value === 'asc' ? 'asc' : 'desc',
                  }))
                }
                className={selectCls}
              >
                <option value="desc">Décroissant</option>
                <option value="asc">Croissant</option>
              </select>
            </div>
            <div className="flex items-end gap-3">
              <label className="inline-flex items-center gap-2 text-xs text-zinc-600 pb-2">
                <input
                  type="checkbox"
                  checked={Boolean(searchDraft.isFlagged)}
                  onChange={(e) =>
                    setSearchDraft((p) => ({
                      ...p,
                      isFlagged: e.target.checked ? true : undefined,
                    }))
                  }
                  className="rounded border-zinc-300 text-emerald-600 focus:ring-emerald-400"
                />
                Signalés uniquement
              </label>
            </div>
            <div className="flex items-end">
              <button
                type="button"
                onClick={() => applyAdvancedSearch()}
                disabled={searching}
                className="w-full px-4 py-1.5 rounded-lg bg-emerald-600 text-sm text-white font-medium hover:bg-emerald-700 disabled:opacity-50"
              >
                {searching ? 'Recherche…' : 'Rechercher'}
              </button>
            </div>
          </div>
          {searchResults && (
            <div className="mt-5 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-3 text-xs text-zinc-500">
                  <span>
                    <span className="font-semibold text-zinc-800 tabular-nums">{searchTotal}</span>
                    {' '}résultat{searchTotal !== 1 ? 's' : ''}
                  </span>
                  {searchTotalAmount != null && (
                    <span className="rounded-lg bg-zinc-50 border border-zinc-100 px-2.5 py-1">
                      Total page filtres :{' '}
                      <span className="font-semibold text-zinc-800 tabular-nums">
                        {formatMoney(searchTotalAmount)}
                      </span>
                    </span>
                  )}
                  <span className="text-zinc-400">
                    Page {searchPage}/{searchLastPage}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleExportSearchCsv}
                  disabled={searchRows.length === 0}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 px-2.5 py-1.5 text-xs text-zinc-600 hover:bg-zinc-50 disabled:opacity-40"
                >
                  <FileDown size={12} /> Export CSV résultats
                </button>
              </div>
              <div className="overflow-x-auto rounded-xl border border-zinc-100">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-zinc-100 bg-zinc-50/50">
                      <th className="text-left px-3 py-2 text-xs font-semibold text-zinc-500">Élève</th>
                      <th className="text-left px-3 py-2 text-xs font-semibold text-zinc-500">Structure</th>
                      <th className="text-left px-3 py-2 text-xs font-semibold text-zinc-500">Frais</th>
                      <th className="text-left px-3 py-2 text-xs font-semibold text-zinc-500">Montant</th>
                      <th className="text-left px-3 py-2 text-xs font-semibold text-zinc-500">Méthode</th>
                      <th className="text-left px-3 py-2 text-xs font-semibold text-zinc-500">Statut</th>
                      <th className="text-left px-3 py-2 text-xs font-semibold text-zinc-500">Caissier</th>
                      <th className="text-left px-3 py-2 text-xs font-semibold text-zinc-500">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {searchRows.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="px-3 py-8 text-center text-sm text-zinc-400">
                          Aucun paiement pour ces critères.
                        </td>
                      </tr>
                    ) : (
                      searchRows.map((r) => (
                        <tr key={r.id} className="border-b border-zinc-50 hover:bg-zinc-50/50">
                          <td className="px-3 py-2">
                            <div className="flex items-start gap-1.5">
                              <div>
                                <p className="font-medium text-zinc-900">{r.studentName}</p>
                                <p className="text-[11px] text-zinc-400 font-mono truncate max-w-[220px]">
                                  {[r.matricule, r.receiptNumber || r.reference, r.phone]
                                    .filter(Boolean)
                                    .join(' · ') || '—'}
                                </p>
                              </div>
                              {r.isFlagged && (
                                <span className="shrink-0 text-[9px] px-1.5 py-0.5 rounded bg-red-50 text-red-600 font-semibold">
                                  Signalé
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-3 py-2 text-xs text-zinc-600">
                            <p>{r.className || '—'}</p>
                            <p className="text-[10px] text-zinc-400">
                              {[r.sectionName, r.optionName].filter(Boolean).join(' · ') || ''}
                            </p>
                          </td>
                          <td className="px-3 py-2 text-[11px] text-zinc-500 max-w-[140px]">
                            {(r.feeLabels ?? []).length > 0
                              ? r.feeLabels!.slice(0, 2).join(', ') +
                                (r.feeLabels!.length > 2 ? ` +${r.feeLabels!.length - 2}` : '')
                              : '—'}
                          </td>
                          <td className="px-3 py-2 text-zinc-700 font-medium tabular-nums">
                            {formatMoney(r.amount, r.currency)}
                          </td>
                          <td className="px-3 py-2">
                            <span className="text-xs px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-600">
                              {r.method || '—'}
                            </span>
                          </td>
                          <td className="px-3 py-2">
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${paymentStatusClass(r.status)}`}>
                              {paymentStatusLabel(r.status)}
                            </span>
                          </td>
                          <td className="px-3 py-2 text-xs text-zinc-500 truncate max-w-[120px]">
                            {r.cashierName || '—'}
                          </td>
                          <td className="px-3 py-2 text-zinc-400 text-xs whitespace-nowrap">
                            {r.createdAt
                              ? new Date(r.createdAt).toLocaleString('fr-FR', {
                                  dateStyle: 'short',
                                  timeStyle: 'short',
                                })
                              : '—'}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
              {searchLastPage > 1 && (
                <div className="flex items-center justify-end gap-2">
                  <button
                    type="button"
                    disabled={searchPage <= 1 || searching}
                    onClick={() =>
                      setSearchParams((p) => cleanSearchParams({ ...p, page: Math.max(1, searchPage - 1) }))
                    }
                    className="px-3 py-1.5 rounded-lg border border-zinc-200 text-xs text-zinc-600 disabled:opacity-40 hover:bg-zinc-50"
                  >
                    Précédent
                  </button>
                  <button
                    type="button"
                    disabled={searchPage >= searchLastPage || searching}
                    onClick={() =>
                      setSearchParams((p) =>
                        cleanSearchParams({ ...p, page: Math.min(searchLastPage, searchPage + 1) }),
                      )
                    }
                    className="px-3 py-1.5 rounded-lg border border-zinc-200 text-xs text-zinc-600 disabled:opacity-40 hover:bg-zinc-50"
                  >
                    Suivant
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      <div className="bg-white rounded-2xl border border-zinc-100 shadow-sm">
        <div className="px-5 py-4 border-b border-zinc-100 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-zinc-900">Vérifications en attente</h3>
          <span className="text-xs px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 font-medium">{pending.length}</span>
        </div>
        {filteredPending.length === 0 ? (
          <EmptyState icon={CheckCircle} message="Aucun paiement en attente" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-100 bg-zinc-50/50">
                  <th className="text-left px-5 py-3 text-xs font-semibold text-zinc-500">Élève</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-zinc-500">Montant</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-zinc-500">Workflow</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-zinc-500">Risque</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-zinc-500">Méthode</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-zinc-500">Preuve</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-zinc-500">Réf. / Reçu</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-zinc-500">Date</th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody>
                {filteredPending.map((p) => {
                  const action = nextVerifyAction(p)
                  return (
                  <tr key={p.verificationId} className="border-b border-zinc-50 hover:bg-zinc-50/50">
                    <td className="px-5 py-3.5">
                      <p className="font-medium text-zinc-900">{p.studentName}</p>
                      {p.studentClassName && <p className="text-[11px] text-zinc-400">{p.studentClassName}</p>}
                      {p.studentBalance != null && p.studentBalance > 0 && (
                        <p className="text-[10px] text-red-500 tabular-nums">Solde élève · {fmtMoney(p.studentBalance, p.currency)}</p>
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-zinc-700 font-medium tabular-nums">{fmtMoney(p.amount, p.currency)}</td>
                    <td className="px-5 py-3.5"><VerificationStepper item={p} /></td>
                    <td className="px-5 py-3.5"><FraudScoreBadge score={p.fraudScore} suspicion={p.suspicion} /></td>
                    <td className="px-5 py-3.5"><span className="text-xs px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-600">{p.method}</span></td>
                    <td className="px-5 py-3.5">
                      {p.proofType ? (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 font-medium">
                          {labelPaymentProofType(p.proofType)}
                        </span>
                      ) : (
                        <span className="text-xs text-zinc-300">—</span>
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-zinc-400 font-mono text-xs">
                      {p.receiptNumber ?? p.reference ?? p.providerRef ?? '—'}
                    </td>
                    <td className="px-5 py-3.5 text-zinc-400 text-xs">{new Date(p.createdAt).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' })}</td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => setDetailItem(p)}
                          className="p-1.5 rounded-lg text-zinc-400 hover:bg-zinc-100 transition-colors"
                          title="Voir le détail"
                        >
                          <Eye size={14} />
                        </button>
                        {action && (
                          <button
                            disabled={verifying}
                            onClick={() => verify({ verificationId: p.verificationId, action }, {
                              onSuccess: () => toast.success(
                                action === 'FINANCE' ? 'Validation finance enregistrée' : 'Validation direction enregistrée',
                              ),
                            })}
                            className="px-2 py-1 rounded-lg text-[10px] font-medium bg-emerald-50 text-emerald-700 hover:bg-emerald-100 disabled:opacity-50"
                            title={action === 'FINANCE' ? 'Validation finance' : 'Validation admin'}
                          >
                            {action === 'FINANCE' ? 'Finance ✓' : 'Admin ✓'}
                          </button>
                        )}
                        {p.financeCheck && p.adminCheck && (
                          <button
                            disabled={markProcessed.isPending}
                            onClick={() => setProcessConfirm(p)}
                            className="px-2 py-1 rounded-lg text-[10px] font-medium bg-indigo-50 text-indigo-700 hover:bg-indigo-100 disabled:opacity-50"
                            title="Marquer comme traité"
                          >
                            <CheckCheck size={12} className="inline" /> Traité
                          </button>
                        )}
                        <button disabled={verifying} onClick={() => verify({ verificationId: p.verificationId, action: 'REJECT' })}
                          className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 disabled:opacity-50 transition-colors" title="Rejeter">
                          <XCircle size={14} />
                        </button>
                        <button
                          onClick={() => setProviderConfirm({
                            paymentId: p.paymentId,
                            method: p.method,
                            kind: 'bank',
                            label: p.studentName,
                          })}
                          className="p-1.5 rounded-lg text-blue-500 hover:bg-blue-50 transition-colors" title="Confirmer banque">
                          <Shield size={14} />
                        </button>
                        {p.receiptUrl && (
                          <a href={p.receiptUrl} target="_blank" rel="noopener noreferrer"
                            className="p-1.5 rounded-lg text-zinc-400 hover:bg-zinc-100 transition-colors" title="Reçu">
                            <Send size={14} />
                          </a>
                        )}
                        <button onClick={() => resendReceipt(p.paymentId)}
                          className="p-1.5 rounded-lg text-zinc-400 hover:bg-zinc-100 transition-colors" title="Renvoyer reçu">
                          <Send size={14} />
                        </button>
                        <button
                          onClick={() => void handleDownloadReceipt(p.paymentId)}
                          className="p-1.5 rounded-lg text-zinc-400 hover:bg-emerald-50 hover:text-emerald-600 transition-colors" title="Télécharger reçu PDF">
                          <FileDown size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                )})}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {mobilePending.length > 0 && (
        <div className="bg-white rounded-2xl border border-zinc-100 shadow-sm">
          <div className="px-5 py-4 border-b border-zinc-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Smartphone size={14} className="text-zinc-400" />
              <h3 className="text-sm font-semibold text-zinc-900">Transactions en attente (opérateur)</h3>
            </div>
            <span className="text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 font-medium">{mobilePending.length}</span>
          </div>
          {mobileActionError && (
            <p className="mx-5 mt-3 text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{mobileActionError}</p>
          )}
          <div className="divide-y divide-zinc-50">
            {mobilePending.map((m) => {
              const mobile = isMobileMoneyMethod(m.method ?? m.operator)
              return (
              <div key={m.id} className="flex items-center justify-between px-5 py-3.5 gap-4">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-zinc-900">{m.studentName}</p>
                  <p className="text-xs text-zinc-400 truncate">
                    {m.method ?? m.operator}
                    {m.phone ? ` · ${m.phone}` : ''}
                    {m.reference ? ` · réf: ${m.reference}` : ''}
                  </p>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <span className="text-sm font-semibold text-zinc-900">{formatMoney(Number(m.amount))}</span>
                  {mobile ? (
                    <button
                      disabled={confirming}
                      onClick={() => {
                        setMobileActionError(null)
                        setProviderConfirm({
                          paymentId: m.id,
                          method: m.method ?? m.operator ?? 'MOBILE_MONEY',
                          kind: 'mobile',
                          label: m.studentName,
                        })
                      }}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 text-xs text-white font-medium hover:bg-blue-700 disabled:opacity-50"
                    >
                      <CheckCircle size={11} /> Confirmer mobile
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setProviderConfirm({
                        paymentId: m.id,
                        method: m.method ?? m.operator ?? 'BANK',
                        kind: 'bank',
                        label: m.studentName,
                      })}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-zinc-200 text-xs text-zinc-600 hover:bg-zinc-50"
                      title="Carte / virement — confirmation bancaire"
                    >
                      <Shield size={11} /> Confirmer banque
                    </button>
                  )}
                </div>
              </div>
            )})}
          </div>
        </div>
      )}

      {showManual && <ManualPaymentModal onClose={() => setShowManual(false)} />}
      {showLinkOrphan && <LinkOrphanModal onClose={() => setShowLinkOrphan(false)} />}

      {providerConfirm && (
        <ProviderConfirmModal
          target={providerConfirm}
          onClose={() => setProviderConfirm(null)}
          isPending={confirming || confirmBank.isPending}
          onConfirm={(proof) => {
            const { paymentId, kind } = providerConfirm
            const onError = (error: unknown) => {
              const err = error as { response?: { data?: { message?: string } } }
              const message = err.response?.data?.message
                ?? (kind === 'mobile'
                  ? 'Confirmation impossible — vérifiez que le paiement est bien Mobile Money.'
                  : 'Échec de confirmation bancaire.')
              if (kind === 'mobile') setMobileActionError(message)
              else toast.error(message)
            }
            const onSuccess = () => {
              toast.success(kind === 'mobile' ? 'Transaction mobile confirmée' : 'Paiement bancaire validé')
              setProviderConfirm(null)
              refetchPending()
              refetchMobile()
            }
            if (kind === 'mobile') {
              confirmMobile({ paymentId, proof }, { onSuccess, onError })
            } else {
              confirmBank.mutate({ paymentId, proof }, { onSuccess, onError })
            }
          }}
        />
      )}

      {detailItem && (
        <VerificationDetailDrawer
          item={detailItem}
          onClose={() => setDetailItem(null)}
          resending={resendingId === detailItem.paymentId}
          onResendReceipt={(paymentId) => {
            setResendingId(paymentId)
            resendReceipt(paymentId, {
              onSuccess: () => toast.success('Reçu renvoyé'),
              onSettled: () => setResendingId(null),
            })
          }}
        />
      )}

      <ConfirmDialog
        open={processConfirm != null}
        title="Marquer comme traité ?"
        description="Le paiement sera archivé comme traité et retiré de la file de vérification."
        impact={processConfirm ? [
          `Élève : ${processConfirm.studentName}`,
          `Montant : ${fmtMoney(processConfirm.amount, processConfirm.currency)}`,
        ] : []}
        confirmLabel="Marquer traité"
        loading={markProcessed.isPending}
        onConfirm={confirmMarkProcessed}
        onCancel={() => setProcessConfirm(null)}
      />
    </div>
  )
}
