'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import {
  AlertTriangle,
  Banknote,
  CheckCircle2,
  Eye,
  Keyboard,
  Loader2,
  Phone,
  PauseCircle,
  ShieldCheck,
  X,
} from 'lucide-react'
import {
  useProcessPayment,
  useResolvedCashSession,
  useStudentFeePeriodStatus,
  useStudentFinanceProfile,
  useFinanceCurrencyConfig,
  useStudentConfirmedPayments,
  useDownloadReceipt,
  useStudentWallet,
} from '@/lib/hooks/use-finance'
import { financeRoleApi } from '@/lib/finance/api/finance.api'
import { formatMoney, type FinanceCurrencyCode } from '@/lib/finance/currency'
import { getApiErrorMessage } from '@/lib/api/client'
import { parseGuichetStudentIdentity } from '@/lib/finance/guichet-student.utils'
import {
  normalizeCongoPhone,
  sanitizeOperatorReference,
  isRetriablePaymentError,
  type TenderCurrency,
} from '@/lib/finance/congo-money.utils'
import {
  findRecentSimilarPayment,
  formatMinutesAgo,
  getAutoPrintThermalPreference,
  setAutoPrintThermalPreference,
  availableDrawerCashUsd,
  saveGuichetPaymentDraft,
  loadGuichetPaymentDraft,
  clearGuichetPaymentDraft,
} from '@/lib/finance/guichet-ops.utils'
import { printPdfBlob } from '@/lib/finance/download-blob'
import { useToast } from '@/providers/toast-provider'
import { labelMoratorium, labelMoratoriumType } from '@/lib/business-labels'
import type { ProcessPaymentResponse } from '@/types/finance'
import type { PaymentProofType } from '@/types/admin'
import { cn } from '@/lib/utils'
import {
  buildPaymentFeeLines,
  feeScheduleLineKey,
  formatFeePeriodLabel,
  lineRemainingAmount,
} from '@/lib/finance/fee-schedule.utils'
import type { FeeAttributionValue } from '@/components/finance/fee-attribution-picker'
import {
  defaultProofTypeForMethod,
  PAYMENT_PROOF_TYPE_OPTIONS,
  labelPaymentProofType,
} from '@/lib/finance/payment-proof'
import { PrintReceiptButton } from '@/components/finance/student-dashboard/receipts/PrintReceiptButton'
import {
  ReceiptTicketPreview,
  type ThermalReceiptPayload,
} from '@/components/finance/student-dashboard/receipts/ReceiptTicketPreview'
import { CashChangeCalculator } from '@/components/finance/student-dashboard/PaymentModal/CashChangeCalculator'
import { DualCurrencyStrip } from '@/components/finance/student-dashboard/PaymentModal/DualCurrencyStrip'
import { ParentAmountFlash } from '@/components/finance/student-dashboard/PaymentModal/ParentAmountFlash'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { StudentCardPhoto } from '@/components/student-card/student-card-photo'
import {
  validateManualCatalogPeriod,
  type FinanceCatalogSelection,
} from '@/components/finance/finance-catalog-fee-panel'

const PAYER_PRESETS = ['Parent', 'Tuteur', 'Élève', 'Autre parent', 'Voisin / proche'] as const

const METHODS = [
  { value: 'CASH', label: 'Espèces' },
  { value: 'BANK', label: 'Virement bancaire' },
  { value: 'ORANGE_MONEY', label: 'Orange Money' },
  { value: 'MPESA', label: 'M-Pesa' },
  { value: 'AIRTEL_MONEY', label: 'Airtel Money' },
  { value: 'CARD', label: 'Carte bancaire' },
] as const

type PayMethod = (typeof METHODS)[number]['value']

const CONFIRM_THRESHOLD = 100

function newIdempotencyKey(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return `pay-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}

interface PaymentModalProps {
  open: boolean
  onClose: () => void
  studentId: number
  academicSessionId: number
  /** Mode échéancier (sélection de lignes). */
  selection: FeeAttributionValue | null
  /** Mode hors échéancier (catalogue / montant libre). */
  catalog?: FinanceCatalogSelection | null
  currency: FinanceCurrencyCode
  onSuccess: (paymentId: number) => void
}

export function PaymentModal({
  open,
  onClose,
  studentId,
  academicSessionId,
  selection,
  catalog = null,
  currency,
  onSuccess,
}: PaymentModalProps) {
  const isCatalogMode = !selection && !!catalog && catalog.amount > 0
  const { mutateAsync: processPayment, isPending } = useProcessPayment()
  const downloadReceipt = useDownloadReceipt()
  const toast = useToast()
  const {
    session,
    hasOpenSession,
    isLoading: sessionLoading,
    couldNotVerify,
  } = useResolvedCashSession()
  const { data: profile } = useStudentFinanceProfile(open ? studentId : 0)
  const { data: wallet } = useStudentWallet(open ? studentId : 0)
  const { data: currencyConfig } = useFinanceCurrencyConfig()
  const { data: recentPayments } = useStudentConfirmedPayments(open ? studentId : 0)
  const { data: catalogPeriodStatus } = useStudentFeePeriodStatus(
    studentId,
    isCatalogMode ? catalog?.feeStructureId : undefined,
  )

  const exchangeRate =
    currencyConfig?.legacyRate != null && Number(currencyConfig.legacyRate) > 0
      ? Number(currencyConfig.legacyRate)
      : null

  const dialogRef = useRef<HTMLDivElement>(null)
  const [method, setMethod] = useState<PayMethod>('CASH')
  const [reference, setReference] = useState('')
  const [comment, setComment] = useState('')
  const [payerName, setPayerName] = useState('')
  const [payerPhone, setPayerPhone] = useState('')
  const [proofType, setProofType] = useState<PaymentProofType>('CASH_VOUCHER')
  const [manualJustification, setManualJustification] = useState('')
  const [lineAmounts, setLineAmounts] = useState<Record<string, number>>({})
  const [catalogAmount, setCatalogAmount] = useState(0)
  const [tendered, setTendered] = useState('')
  const [tenderCurrency, setTenderCurrency] = useState<TenderCurrency>('USD')
  const [errorMsg, setErrorMsg] = useState('')
  const [idempotencyKey, setIdempotencyKey] = useState(() => newIdempotencyKey())
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [ackDuplicate, setAckDuplicate] = useState(false)
  const [ackIdentity, setAckIdentity] = useState(false)
  const [autoPrintThermal, setAutoPrintThermal] = useState(true)
  const [didAutoPrint, setDidAutoPrint] = useState(false)
  const [showParentAmount, setShowParentAmount] = useState(false)
  const [draftRestored, setDraftRestored] = useState(false)
  const [canRetryNetwork, setCanRetryNetwork] = useState(false)
  const [successPaymentId, setSuccessPaymentId] = useState<number | null>(null)
  const [successReference, setSuccessReference] = useState<string | null>(null)
  const [successServerAmount, setSuccessServerAmount] = useState<number | null>(null)
  const [thermal, setThermal] = useState<ThermalReceiptPayload | null>(null)
  const [thermalLoading, setThermalLoading] = useState(false)

  const activeMoratorium = wallet?.moratorium?.active ? wallet.moratorium : null

  const identity = useMemo(
    () => parseGuichetStudentIdentity(profile, studentId),
    [profile, studentId],
  )

  useEffect(() => {
    if (!open) return
    setMethod('CASH')
    setReference('')
    setComment('')
    setPayerName(identity.parentName || 'Parent')
    setPayerPhone('')
    setProofType(defaultProofTypeForMethod('CASH'))
    setManualJustification('')
    setErrorMsg('')
    setTendered('')
    setTenderCurrency(currencyConfig?.displayCurrency === 'CDF' ? 'CDF' : 'USD')
    setConfirmOpen(false)
    setAckDuplicate(false)
    setAckIdentity(false)
    setAutoPrintThermal(getAutoPrintThermalPreference(true))
    setDidAutoPrint(false)
    setIdempotencyKey(newIdempotencyKey())
    setCanRetryNetwork(false)
    setShowParentAmount(false)
    setDraftRestored(false)
    setSuccessPaymentId(null)
    setSuccessReference(null)
    setSuccessServerAmount(null)
    setThermal(null)
    if (selection) {
      const next: Record<string, number> = {}
      for (const sel of selection.lines) {
        next[feeScheduleLineKey(sel.line)] = sel.amount
      }
      setLineAmounts(next)
      setCatalogAmount(0)
    } else if (catalog) {
      setCatalogAmount(catalog.amount)
      setLineAmounts({})
    }

    const draft = loadGuichetPaymentDraft(studentId)
    if (draft) {
      if (draft.method) setMethod(draft.method as PayMethod)
      if (draft.reference) setReference(draft.reference)
      if (draft.comment) setComment(draft.comment)
      if (draft.payerName) setPayerName(draft.payerName)
      if (draft.payerPhone) setPayerPhone(draft.payerPhone)
      if (draft.proofType) setProofType(draft.proofType as PaymentProofType)
      if (draft.manualJustification) setManualJustification(draft.manualJustification)
      if (catalog && draft.catalogAmount != null && draft.catalogAmount > 0) {
        setCatalogAmount(draft.catalogAmount)
      }
      setDraftRestored(true)
    }
  }, [open, selection, catalog, identity.parentName, currencyConfig?.displayCurrency, studentId])

  // Brouillon local — reprise après coupure / refresh (2 h)
  useEffect(() => {
    if (!open || successPaymentId) return
    const t = window.setTimeout(() => {
      saveGuichetPaymentDraft({
        studentId,
        method,
        reference,
        comment,
        payerName,
        payerPhone,
        proofType,
        manualJustification,
        catalogAmount: isCatalogMode ? catalogAmount : undefined,
        savedAt: new Date().toISOString(),
      })
    }, 400)
    return () => window.clearTimeout(t)
  }, [
    open,
    successPaymentId,
    studentId,
    method,
    reference,
    comment,
    payerName,
    payerPhone,
    proofType,
    manualJustification,
    catalogAmount,
    isCatalogMode,
  ])

  useEffect(() => {
    if (!open) return
    if (!identity.parentPhone) return
    if (method === 'ORANGE_MONEY' || method === 'MPESA' || method === 'AIRTEL_MONEY') {
      setPayerPhone((prev) =>
        prev.trim() ? prev : normalizeCongoPhone(identity.parentPhone!),
      )
    }
  }, [open, method, identity.parentPhone])

  const editedLines = useMemo(() => {
    if (!selection) return []
    return selection.lines.map((sel) => {
      const key = feeScheduleLineKey(sel.line)
      const max = lineRemainingAmount(sel.line)
      const raw = lineAmounts[key] ?? sel.amount
      const amount = Math.min(Math.max(0, Number(raw) || 0), max)
      return { ...sel, amount }
    })
  }, [selection, lineAmounts])

  const totalAmount = useMemo(() => {
    if (isCatalogMode) return Math.max(0, Number(catalogAmount) || 0)
    return editedLines.reduce((s, l) => s + l.amount, 0)
  }, [isCatalogMode, catalogAmount, editedLines])

  const isPartialPay = useMemo(() => {
    if (isCatalogMode || editedLines.length === 0) return false
    return editedLines.some((sel) => sel.amount + 0.001 < lineRemainingAmount(sel.line))
  }, [isCatalogMode, editedLines])

  const duplicateHit = useMemo(
    () =>
      findRecentSimilarPayment(recentPayments, {
        amount: totalAmount,
        method,
      }),
    [recentPayments, totalAmount, method],
  )

  const methodLabel = METHODS.find((m) => m.value === method)?.label ?? method
  const needsConfirm =
    totalAmount >= CONFIRM_THRESHOLD ||
    isPartialPay ||
    isCatalogMode ||
    !!duplicateHit ||
    identity.hasPostnom

  const drawerAvailableUsd = availableDrawerCashUsd(
    session?.openingFloat ?? session?.openingBalance,
    session?.cashCollected ?? session?.totalCollected,
  )

  useEffect(() => {
    if (!open) return
    const node = dialogRef.current
    node?.querySelector<HTMLElement>('button, input, select, textarea')?.focus()
  }, [open, successPaymentId])

  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.preventDefault()
        if (showParentAmount) {
          setShowParentAmount(false)
          return
        }
        if (confirmOpen) {
          setConfirmOpen(false)
          return
        }
        if (!isPending) handleClose()
        return
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        if (successPaymentId || isPending) return
        e.preventDefault()
        if (confirmOpen) {
          void executePayment()
          return
        }
        if (!validateBeforeSubmit()) return
        if (needsConfirm) {
          setConfirmOpen(true)
          return
        }
        void executePayment()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    open,
    confirmOpen,
    showParentAmount,
    isPending,
    successPaymentId,
    needsConfirm,
    totalAmount,
    method,
    ackDuplicate,
  ])

  if (!open) return null
  if (!isCatalogMode && (!selection || selection.lines.length === 0)) return null
  if (isCatalogMode && !catalog) return null

  const needsRef = method !== 'CASH'
  const needsPhone = method === 'ORANGE_MONEY' || method === 'MPESA' || method === 'AIRTEL_MONEY'
  const requiresCashSession =
    method === 'CASH' && !hasOpenSession && !couldNotVerify && !sessionLoading
  const isMulti = editedLines.length > 1
  const structureCount = new Set(editedLines.map((sel) => sel.line.feeStructureId)).size
  const primaryLine = editedLines[0]?.line ?? selection?.lines[0]?.line
  const modalTitle = successPaymentId
    ? 'Paiement enregistré'
    : isCatalogMode
      ? 'Encaissement hors échéancier'
      : isMulti && structureCount > 1
        ? `Encaisser ${editedLines.length} lignes`
        : isMulti
          ? `Encaisser ${editedLines.length} mois`
          : 'Encaissement premium'

  function fillAllMax() {
    if (!selection) return
    const next: Record<string, number> = {}
    for (const sel of selection.lines) {
      next[feeScheduleLineKey(sel.line)] = lineRemainingAmount(sel.line)
    }
    setLineAmounts(next)
  }

  function fillAllHalf() {
    if (!selection) return
    const next: Record<string, number> = {}
    for (const sel of selection.lines) {
      const max = lineRemainingAmount(sel.line)
      next[feeScheduleLineKey(sel.line)] = Number((max / 2).toFixed(2))
    }
    setLineAmounts(next)
  }

  function validateBeforeSubmit(): boolean {
    setErrorMsg('')

    if (requiresCashSession) {
      setErrorMsg("Ouvrez une session de caisse dans Caisse avant d'encaisser des espèces.")
      return false
    }
    if (needsRef) {
      const clean = sanitizeOperatorReference(reference)
      if (clean.length < 3) {
        setErrorMsg('Référence obligatoire (min. 3 caractères) pour ce mode de paiement.')
        return false
      }
      if (clean !== reference) setReference(clean)
    }
    if (needsPhone && payerPhone.trim().length < 9) {
      setErrorMsg('Numéro payeur requis (min. 9 caractères) pour le mobile money.')
      return false
    }
    if (proofType === 'OTHER' && manualJustification.trim().length < 10) {
      setErrorMsg('Un motif explicite (min. 10 caractères) est requis pour le type « Autre ».')
      return false
    }
    if (totalAmount <= 0) {
      setErrorMsg('Montant total invalide.')
      return false
    }
    if (duplicateHit && !ackDuplicate) {
      setErrorMsg(
        `Possible doublon (#${duplicateHit.id}, ${formatMinutesAgo(duplicateHit.createdAt)}). Cochez la confirmation anti-doublon.`,
      )
      return false
    }
    if (identity.hasPostnom && !ackIdentity) {
      setErrorMsg(
        `Confirmez l'identité RDC : ${identity.fullName} (homonymes fréquents — prénom / nom / postnom).`,
      )
      return false
    }

    if (isCatalogMode && catalog) {
      if (catalog.feeStructureId) {
        const periodError = validateManualCatalogPeriod(
          catalogPeriodStatus,
          catalog.monthYear,
        )
        if (periodError) {
          setErrorMsg(periodError)
          return false
        }
      }
    } else {
      for (const sel of editedLines) {
        if (sel.line.billingPeriod === 'MONTHLY' && !sel.line.monthYear) {
          setErrorMsg('Période mensuelle manquante sur une ligne sélectionnée.')
          return false
        }
        const max = lineRemainingAmount(sel.line)
        if (sel.amount <= 0 || sel.amount > max + 0.001) {
          setErrorMsg(
            `Montant invalide sur ${formatFeePeriodLabel(sel.line)} (max ${formatMoney(max, currency)}).`,
          )
          return false
        }
      }
    }
    return true
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!validateBeforeSubmit()) return
    if (needsConfirm) {
      setConfirmOpen(true)
      return
    }
    void executePayment()
  }

  async function executePayment() {
    setConfirmOpen(false)
    setErrorMsg('')
    setCanRetryNetwork(false)
    try {
      const payerTag = payerName.trim() ? `Payé par: ${payerName.trim()}` : ''
      const mergedComment = [payerTag, comment.trim()].filter(Boolean).join(' · ') || undefined
      const normalizedPhone = needsPhone
        ? normalizeCongoPhone(payerPhone.trim())
        : undefined
      const cleanRef = needsRef ? sanitizeOperatorReference(reference) : undefined

      const payloadBase = {
        studentId,
        amount: Number(totalAmount.toFixed(2)),
        method,
        sessionId: academicSessionId,
        reference: cleanRef || undefined,
        comment: mergedComment,
        proofType,
        manualJustification: manualJustification.trim() || undefined,
        payerPhone: normalizedPhone,
        idempotencyKey,
      }

      const feeLines = !isCatalogMode ? buildPaymentFeeLines(editedLines) : []
      const result = (
        isCatalogMode && catalog
          ? await processPayment({
              ...payloadBase,
              feeStructureId: catalog.feeStructureId,
              monthYear: catalog.monthYear,
            })
          : await processPayment({
              ...payloadBase,
              fees: feeLines.length > 1 ? feeLines : undefined,
              feeStructureId: feeLines.length === 1 ? feeLines[0].feeStructureId : undefined,
              monthYear: feeLines.length === 1 ? feeLines[0].monthYear : undefined,
            })
      ) as ProcessPaymentResponse

      const paymentId = result.paymentId ?? result.id ?? result.payment?.id
      if (!paymentId) {
        setErrorMsg('Paiement enregistré mais identifiant reçu introuvable.')
        return
      }

      const ref =
        result.payment?.reference ??
        result.reference ??
        (cleanRef || null)
      const serverAmt =
        result.serverAmount != null
          ? Number(result.serverAmount)
          : result.payment?.amount != null
            ? Number(result.payment.amount)
            : totalAmount

      clearGuichetPaymentDraft(studentId)
      setDraftRestored(false)
      setSuccessPaymentId(paymentId)
      setSuccessReference(ref)
      setSuccessServerAmount(serverAmt)
      onSuccess(paymentId)
      toast.success(
        'Encaissement enregistré',
        `#${paymentId}${ref ? ` · ${ref}` : ''} · ${formatMoney(serverAmt, currency)}`,
      )

      const paymentStatus = String(result.payment?.status ?? (method === 'CASH' ? 'CONFIRMED' : 'PENDING'))
      const receiptReady = paymentStatus === 'CONFIRMED' || paymentStatus === 'RECONCILED'

      if (!receiptReady) {
        toast.info(
          'Reçu après confirmation',
          'Paiement mobile en attente — le reçu PDF sera disponible une fois le paiement confirmé.',
        )
        return
      }

      setThermalLoading(true)
      try {
        const thermalRes = await financeRoleApi.getThermalReceipt(paymentId)
        setThermal(thermalRes as ThermalReceiptPayload)
      } catch (err) {
        toast.warning('Aperçu reçu indisponible', getApiErrorMessage(err))
      } finally {
        setThermalLoading(false)
      }

      if (autoPrintThermal && !didAutoPrint) {
        setDidAutoPrint(true)
        try {
          const blob = await downloadReceipt.mutateAsync({
            paymentId,
            format: 'Thermal',
          })
          await printPdfBlob(blob)
          toast.info('Impression ticket', 'Dialogue d’impression ouvert')
        } catch (err) {
          toast.warning('Auto-impression échouée', getApiErrorMessage(err))
        }
      }
    } catch (err) {
      const msg = getApiErrorMessage(err)
      const retriable = isRetriablePaymentError(err)
      setErrorMsg(
        retriable
          ? `${msg} — réseau instable : réessayez avec la même clé (anti-doublon).`
          : msg,
      )
      toast.error('Échec encaissement', msg)
      setCanRetryNetwork(retriable)
      // Garder la clé sur erreur réseau ; nouvelle clé seulement sur erreur métier (4xx)
      if (!retriable) {
        setIdempotencyKey(newIdempotencyKey())
      }
    }
  }

  function handleClose() {
    setSuccessPaymentId(null)
    setConfirmOpen(false)
    setShowParentAmount(false)
    setThermal(null)
    onClose()
  }

  const cashOpening =
    session?.openingFloat ?? session?.openingBalance ?? null
  const cashCollected = session?.cashCollected ?? session?.totalCollected ?? null

  return (
    <>
    <div className="fixed inset-0 z-[90] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div
        ref={dialogRef}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden max-h-[92vh] flex flex-col"
        role="dialog"
        aria-modal="true"
        aria-labelledby="payment-modal-title"
      >
        <div className="h-1 bg-gradient-to-r from-emerald-500 via-teal-500 to-violet-500" />

        <div className="flex items-start justify-between px-6 pt-5 pb-2 shrink-0">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 id="payment-modal-title" className="text-base font-semibold text-zinc-900">
                {modalTitle}
              </h2>
              <span className="inline-flex items-center rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-800">
                Guichet RDC · FC/USD
              </span>
            </div>
            {!successPaymentId && (
              <p className="text-xs text-zinc-500 mt-1">
                {isCatalogMode
                  ? 'Hors échéancier · preuve & anti-doublon'
                  : structureCount > 1
                    ? `${structureCount} barèmes · ${primaryLine?.categoryName ?? ''}`
                    : primaryLine?.categoryName ?? 'Échéancier'}
                {!isCatalogMode ? ' · preuve & anti-doublon' : null}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={handleClose}
            disabled={isPending}
            className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600"
            aria-label="Fermer"
          >
            <X size={18} />
          </button>
        </div>

        {successPaymentId ? (
          <div className="px-6 pb-6 space-y-4 overflow-y-auto">
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-5 text-center">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100">
                <CheckCircle2 size={22} className="text-emerald-600" />
              </div>
              <p className="text-sm font-semibold text-emerald-900">
                Encaissement confirmé
              </p>
              <p className="mt-1 text-lg font-bold tabular-nums text-emerald-800">
                {formatMoney(successServerAmount ?? totalAmount, currency)}
              </p>
              <p className="mt-1 text-xs text-emerald-800/80">
                #{successPaymentId}
                {successReference ? ` · ${successReference}` : ''}
                {' · '}
                {methodLabel}
              </p>
              <p className="mt-0.5 text-xs text-emerald-700/70">{identity.fullName}</p>
            </div>

            {thermalLoading ? (
              <div className="flex items-center justify-center gap-2 py-6 text-xs text-zinc-500">
                <Loader2 size={14} className="animate-spin" />
                Génération du ticket…
              </div>
            ) : thermal ? (
              <ReceiptTicketPreview
                thermal={thermal}
                onPrint={() => {
                  void (async () => {
                    try {
                      const blob = await downloadReceipt.mutateAsync({
                        paymentId: successPaymentId,
                        format: 'Thermal',
                      })
                      await printPdfBlob(blob)
                      toast.info('Impression ticket', 'Dialogue d’impression ouvert')
                    } catch (err) {
                      toast.error('Impression impossible', getApiErrorMessage(err))
                    }
                  })()
                }}
              />
            ) : null}

            <div>
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-400">
                  Impression & fichiers
                </p>
                <label className="inline-flex items-center gap-1.5 text-[10px] text-zinc-500 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={autoPrintThermal}
                    onChange={(e) => {
                      const on = e.target.checked
                      setAutoPrintThermal(on)
                      setAutoPrintThermalPreference(on)
                    }}
                    className="rounded border-zinc-300"
                  />
                  Auto-ticket à chaque encaissement
                </label>
              </div>
              <PrintReceiptButton paymentId={successPaymentId} />
            </div>
            <button
              type="button"
              onClick={handleClose}
              className="w-full rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-emerald-700"
            >
              Terminer
            </button>
          </div>
        ) : (
          <form
            onSubmit={handleSubmit}
            className="px-6 pb-6 space-y-4 overflow-y-auto"
          >
            {/* Élève identité */}
            <div className="flex items-start gap-3 rounded-xl border border-zinc-100 bg-zinc-50 px-3 py-2.5">
              <div className="h-12 w-12 shrink-0 overflow-hidden rounded-xl ring-1 ring-zinc-200">
                <StudentCardPhoto
                  photoUrl={identity.photoUrl ?? null}
                  firstName={identity.prenom || identity.firstName || identity.fullName}
                  lastName={identity.lastName}
                />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-zinc-900 truncate">{identity.fullName}</p>
                <p className="text-[11px] text-zinc-500 truncate">
                  {[identity.matricule, identity.className].filter(Boolean).join(' · ') ||
                    `#${studentId}`}
                </p>
                {identity.postnom ? (
                  <p className="text-[10px] text-sky-700 mt-0.5">
                    Postnom · {identity.postnom.toUpperCase()}
                  </p>
                ) : null}
                <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-0.5 text-[11px]">
                  {identity.remainingDebt != null ? (
                    <span
                      className={cn(
                        'font-semibold tabular-nums',
                        identity.remainingDebt > 0 ? 'text-red-600' : 'text-emerald-700',
                      )}
                    >
                      Dette {formatMoney(identity.remainingDebt, currency)}
                    </span>
                  ) : null}
                  {identity.parentPhone ? (
                    <span className="inline-flex items-center gap-1 text-zinc-500">
                      <Phone size={10} />
                      {identity.parentPhone}
                    </span>
                  ) : null}
                </div>
                {activeMoratorium ? (
                  <div className="mt-2 inline-flex items-center gap-1.5 rounded-lg border border-indigo-200 bg-indigo-50 px-2 py-1 text-[10px] font-medium text-indigo-800">
                    <PauseCircle size={12} className="shrink-0" />
                    {labelMoratorium(true)}
                    {activeMoratorium.type
                      ? ` · ${labelMoratoriumType(activeMoratorium.type)}`
                      : ''}
                    {activeMoratorium.endDate
                      ? ` · jusqu’au ${new Date(activeMoratorium.endDate).toLocaleDateString('fr-CD')}`
                      : ''}
                  </div>
                ) : null}
              </div>
            </div>

            {draftRestored ? (
              <p className="rounded-lg border border-amber-100 bg-amber-50/80 px-3 py-1.5 text-[10px] text-amber-900">
                Brouillon restauré (coupure / refresh) — vérifiez avant d&apos;encaisser.
              </p>
            ) : null}

            {totalAmount > 0 ? (
              <div className="space-y-2">
                <DualCurrencyStrip
                  amountUsd={totalAmount}
                  rate={exchangeRate}
                  baseCurrency={currency}
                />
                <button
                  type="button"
                  onClick={() => setShowParentAmount(true)}
                  className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl border border-sky-200 bg-sky-50 px-3 py-2 text-xs font-semibold text-sky-900 hover:bg-sky-100"
                >
                  <Eye size={14} />
                  Montre au parent (USD / FC)
                </button>
              </div>
            ) : null}

            {duplicateHit ? (
              <div className="rounded-xl border border-amber-300 bg-amber-50 px-3 py-2.5 space-y-2">
                <div className="flex items-start gap-2">
                  <AlertTriangle size={15} className="text-amber-600 mt-0.5 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-amber-950">
                      Possible doublon guichet
                    </p>
                    <p className="text-[11px] text-amber-900/90 mt-0.5">
                      Paiement #{duplicateHit.id} ·{' '}
                      {formatMoney(Number(duplicateHit.amount), currency)} ·{' '}
                      {duplicateHit.method ?? method} ·{' '}
                      {formatMinutesAgo(duplicateHit.createdAt)}
                    </p>
                  </div>
                </div>
                <label className="flex items-center gap-2 text-[11px] text-amber-950 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={ackDuplicate}
                    onChange={(e) => setAckDuplicate(e.target.checked)}
                    className="rounded border-amber-400"
                  />
                  Je confirme un second encaissement volontaire
                </label>
              </div>
            ) : null}

            {/* Session caisse */}
            <div
              className={cn(
                'flex items-start gap-2 rounded-xl border px-3 py-2.5',
                hasOpenSession
                  ? 'border-emerald-200 bg-emerald-50'
                  : requiresCashSession
                    ? 'border-amber-200 bg-amber-50'
                    : 'border-zinc-200 bg-zinc-50',
              )}
            >
              <Banknote
                size={15}
                className={cn(
                  'mt-0.5 shrink-0',
                  hasOpenSession ? 'text-emerald-600' : 'text-amber-600',
                )}
              />
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium text-zinc-800">
                  {hasOpenSession
                    ? `Session caisse #${session?.id ?? '—'} ouverte`
                    : sessionLoading
                      ? 'Vérification session caisse…'
                      : 'Aucune session caisse ouverte'}
                </p>
                {hasOpenSession ? (
                  <p className="text-[11px] text-emerald-800/80 mt-0.5">
                    Fond {cashOpening != null ? formatMoney(Number(cashOpening), currency) : '—'}
                    {cashCollected != null
                      ? ` · encaissé ${formatMoney(Number(cashCollected), currency)}`
                      : ''}
                    {session?.transactionCount != null
                      ? ` · ${session.transactionCount} txn`
                      : ''}
                  </p>
                ) : (
                  <p className="text-[11px] text-zinc-600 mt-0.5">
                    Requis pour les espèces.{' '}
                    <Link
                      href="/finances/caisse"
                      className="font-semibold text-emerald-700 underline"
                    >
                      Ouvrir la caisse
                    </Link>
                  </p>
                )}
              </div>
            </div>

            {/* Montants */}
            {isCatalogMode ? (
              <div className="rounded-xl bg-violet-50/60 border border-violet-100 px-4 py-3 space-y-2">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-violet-500">
                  Montant hors échéancier
                </p>
                {catalog?.feeStructureId ? (
                  <p className="text-xs text-zinc-600">
                    Barème #{catalog.feeStructureId}
                    {catalog.monthYear ? ` · ${catalog.monthYear}` : ''}
                  </p>
                ) : (
                  <p className="text-xs text-zinc-500">Montant libre (sans barème)</p>
                )}
                <input
                  type="number"
                  min={0.01}
                  step="0.01"
                  value={catalogAmount || ''}
                  onChange={(e) => setCatalogAmount(Number(e.target.value) || 0)}
                  className="w-full px-3 py-2 rounded-lg border border-zinc-200 text-sm tabular-nums focus:outline-none focus:ring-2 focus:ring-emerald-400"
                />
                <div className="flex justify-between text-xs pt-1">
                  <span className="text-zinc-500 font-medium">Total</span>
                  <span className="font-semibold tabular-nums text-zinc-900">
                    {formatMoney(totalAmount, currency)}
                  </span>
                </div>
              </div>
            ) : (
              <div className="rounded-xl bg-zinc-50 border border-zinc-100 px-4 py-3 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-400">
                    Lignes · montants ajustables
                  </p>
                  <div className="flex gap-1">
                    <button
                      type="button"
                      onClick={fillAllMax}
                      className="rounded-md border border-zinc-200 bg-white px-2 py-0.5 text-[10px] font-medium text-zinc-600 hover:bg-zinc-50"
                    >
                      Tout max
                    </button>
                    <button
                      type="button"
                      onClick={fillAllHalf}
                      className="rounded-md border border-zinc-200 bg-white px-2 py-0.5 text-[10px] font-medium text-zinc-600 hover:bg-zinc-50"
                    >
                      ½
                    </button>
                  </div>
                </div>
                <div className="space-y-2 max-h-44 overflow-y-auto">
                  {editedLines.map((sel) => {
                    const key = feeScheduleLineKey(sel.line)
                    const max = lineRemainingAmount(sel.line)
                    return (
                      <div
                        key={key}
                        className="grid grid-cols-[1fr_7rem_auto] gap-1.5 items-center"
                      >
                        <div className="min-w-0">
                          <p className="text-xs text-zinc-700 truncate">
                            {structureCount > 1
                              ? `${sel.line.categoryName} · ${formatFeePeriodLabel(sel.line)}`
                              : formatFeePeriodLabel(sel.line)}
                          </p>
                          <p className="text-[10px] text-zinc-400">
                            Max {formatMoney(max, sel.line.currency || currency)}
                          </p>
                        </div>
                        <input
                          type="number"
                          min={0.01}
                          max={max}
                          step="0.01"
                          value={lineAmounts[key] ?? sel.amount}
                          onChange={(e) => {
                            const v = Number(e.target.value)
                            setLineAmounts((prev) => ({
                              ...prev,
                              [key]: Number.isFinite(v) ? v : 0,
                            }))
                          }}
                          className="w-full px-2 py-1.5 rounded-lg border border-zinc-200 text-xs tabular-nums text-right focus:outline-none focus:ring-2 focus:ring-emerald-400"
                        />
                        <button
                          type="button"
                          title="Remplir le max"
                          onClick={() =>
                            setLineAmounts((prev) => ({ ...prev, [key]: max }))
                          }
                          className="rounded-md px-1.5 py-1 text-[10px] font-semibold text-emerald-700 hover:bg-emerald-50"
                        >
                          Max
                        </button>
                      </div>
                    )
                  })}
                </div>
                <div className="flex justify-between text-xs border-t border-zinc-200/80 pt-2">
                  <span className="text-zinc-500 font-medium">Total à encaisser</span>
                  <span className="font-semibold tabular-nums text-zinc-900">
                    {formatMoney(totalAmount, currency)}
                  </span>
                </div>
              </div>
            )}

            {identity.hasPostnom ? (
              <label className="flex items-start gap-2 rounded-xl border border-sky-200 bg-sky-50 px-3 py-2.5 text-[11px] text-sky-950 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={ackIdentity}
                  onChange={(e) => setAckIdentity(e.target.checked)}
                  className="mt-0.5 rounded border-sky-400"
                />
                <span>
                  Je confirme l&apos;élève{' '}
                  <strong>{identity.fullName}</strong>
                  {identity.matricule ? ` · ${identity.matricule}` : ''}
                  {identity.className ? ` · ${identity.className}` : ''} — évite les homonymes
                  (prénom / nom / postnom).
                </span>
              </label>
            ) : null}

            {method === 'CASH' && totalAmount > 0 ? (
              <CashChangeCalculator
                amountDueUsd={totalAmount}
                currency={currency}
                exchangeRate={exchangeRate}
                tendered={tendered}
                tenderCurrency={tenderCurrency}
                onTenderedChange={setTendered}
                onTenderCurrencyChange={setTenderCurrency}
                availableDrawerUsd={drawerAvailableUsd}
              />
            ) : null}

            {(method === 'ORANGE_MONEY' ||
              method === 'MPESA' ||
              method === 'AIRTEL_MONEY') && (
              <div className="flex items-start gap-2 rounded-xl border border-violet-200 bg-violet-50 px-3 py-2.5 text-[11px] text-violet-950">
                <AlertTriangle size={14} className="mt-0.5 shrink-0 text-violet-600" />
                <p>
                  <strong>Capture Mobile Money</strong> : demandez le SMS ou l&apos;écran de
                  confirmation avant de valider. Saisissez la référence opérateur exacte — litiges
                  fréquents sans preuve.
                </p>
              </div>
            )}

            {requiresCashSession && (
              <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5">
                <AlertTriangle size={15} className="text-amber-600 mt-0.5 shrink-0" />
                <p className="text-xs text-amber-900">
                  Impossible d&apos;encaisser en espèces sans session ouverte.
                </p>
              </div>
            )}

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-medium text-zinc-500 mb-1">
                  Mode de paiement
                </label>
                <select
                  value={method}
                  onChange={(e) => {
                    const next = e.target.value as PayMethod
                    setMethod(next)
                    setProofType(defaultProofTypeForMethod(next))
                  }}
                  className="w-full px-3 py-2 rounded-lg border border-zinc-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
                >
                  {METHODS.map((m) => (
                    <option key={m.value} value={m.value}>
                      {m.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-500 mb-1">
                  Type de preuve
                </label>
                <select
                  value={proofType}
                  onChange={(e) => setProofType(e.target.value as PaymentProofType)}
                  className="w-full px-3 py-2 rounded-lg border border-zinc-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
                >
                  {PAYMENT_PROOF_TYPE_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {needsRef && (
              <div>
                <label className="block text-xs font-medium text-zinc-500 mb-1">
                  Référence <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={reference}
                  onChange={(e) => setReference(e.target.value)}
                  onBlur={() => setReference((r) => sanitizeOperatorReference(r))}
                  onPaste={(e) => {
                    const text = e.clipboardData.getData('text')
                    if (!text) return
                    e.preventDefault()
                    setReference(sanitizeOperatorReference(text))
                  }}
                  minLength={3}
                  required
                  placeholder="Collez le SMS opérateur — ID extrait auto"
                  className="w-full px-3 py-2 rounded-lg border border-zinc-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
                />
                <p className="mt-1 text-[10px] text-zinc-400">
                  Orange Money / Airtel / M-Pesa — collage SMS nettoyé automatiquement
                </p>
              </div>
            )}

            {needsPhone && (
              <div>
                <label className="block text-xs font-medium text-zinc-500 mb-1">
                  Téléphone payeur <span className="text-red-500">*</span>
                </label>
                <input
                  type="tel"
                  value={payerPhone}
                  onChange={(e) => setPayerPhone(e.target.value)}
                  onBlur={() => setPayerPhone((p) => normalizeCongoPhone(p))}
                  minLength={9}
                  required
                  placeholder="+243 8XX XXX XXX"
                  className="w-full px-3 py-2 rounded-lg border border-zinc-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
                />
                <p className="mt-1 text-[10px] text-zinc-400">
                  Format RDC · Orange / Airtel / M-Pesa
                </p>
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-zinc-500 mb-1">
                Payé par (guichet)
              </label>
              <input
                type="text"
                value={payerName}
                onChange={(e) => setPayerName(e.target.value)}
                maxLength={80}
                placeholder="Nom du parent / tuteur présent"
                className="w-full px-3 py-2 rounded-lg border border-zinc-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
              />
              <div className="mt-1.5 flex flex-wrap gap-1">
                {PAYER_PRESETS.map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() =>
                      setPayerName(
                        preset === 'Parent' && identity.parentName
                          ? identity.parentName
                          : preset,
                      )
                    }
                    className="rounded-md border border-zinc-200 bg-zinc-50 px-2 py-0.5 text-[10px] font-medium text-zinc-600 hover:bg-zinc-100"
                  >
                    {preset}
                  </button>
                ))}
              </div>
            </div>

            {(proofType === 'OTHER' || manualJustification.length > 0) && (
              <div>
                <label className="block text-xs font-medium text-zinc-500 mb-1">
                  Justification{proofType === 'OTHER' ? ' *' : ''}
                </label>
                <textarea
                  value={manualJustification}
                  onChange={(e) => setManualJustification(e.target.value)}
                  maxLength={500}
                  rows={2}
                  placeholder={
                    proofType === 'OTHER'
                      ? 'Motif obligatoire (min. 10 caractères)'
                      : 'Note interne optionnelle'
                  }
                  className="w-full px-3 py-2 rounded-lg border border-zinc-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 resize-none"
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-zinc-500 mb-1">Commentaire</label>
              <input
                type="text"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                maxLength={255}
                placeholder="Optionnel — visible sur le ticket"
                className="w-full px-3 py-2 rounded-lg border border-zinc-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
              />
            </div>

            {/* Récap avant confirmation */}
            <div className="rounded-xl border border-emerald-100 bg-emerald-50/50 px-3 py-2.5 text-[11px] text-emerald-900 space-y-1">
              <p className="font-semibold text-emerald-800">Récapitulatif</p>
              <p>
                {formatMoney(totalAmount, currency)} · {methodLabel} ·{' '}
                {labelPaymentProofType(proofType)}
              </p>
              <p className="text-emerald-700/80">
                {isCatalogMode
                  ? catalog?.feeStructureId
                    ? `Barème #${catalog.feeStructureId}${catalog.monthYear ? ` · ${catalog.monthYear}` : ''}`
                    : 'Montant libre'
                  : `${editedLines.length} ligne${editedLines.length > 1 ? 's' : ''} d'échéancier`}
              </p>
            </div>

            <div className="flex items-center gap-2 rounded-lg bg-violet-50/80 px-3 py-2 text-[10px] text-violet-700">
              <ShieldCheck size={12} className="shrink-0" />
              Idempotency · anti-doublon 15 min · Ctrl+Entrée pour valider · Échap pour fermer
            </div>
            <div className="flex items-center gap-1.5 text-[10px] text-zinc-400">
              <Keyboard size={11} />
              Guichet pro — clavier prioritaire
            </div>

            {errorMsg && (
              <div className="rounded-lg border border-red-100 bg-red-50 px-3 py-2 space-y-2">
                <p className="text-xs text-red-600">{errorMsg}</p>
                {canRetryNetwork ? (
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={() => void executePayment()}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-red-600 px-3 py-1.5 text-[11px] font-semibold text-white hover:bg-red-700 disabled:opacity-50"
                  >
                    {isPending && <Loader2 size={12} className="animate-spin" />}
                    Réessayer (même clé anti-doublon)
                  </button>
                ) : null}
              </div>
            )}

            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={handleClose}
                disabled={isPending}
                className="flex-1 px-4 py-2.5 rounded-xl border border-zinc-200 text-sm text-zinc-600 hover:bg-zinc-50 disabled:opacity-50"
              >
                Annuler
              </button>
              <button
                type="submit"
                disabled={isPending || requiresCashSession || totalAmount <= 0}
                className={cn(
                  'flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl',
                  'text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50',
                )}
              >
                {isPending && <Loader2 size={14} className="animate-spin" />}
                {needsConfirm ? 'Vérifier' : 'Confirmer'} · {formatMoney(totalAmount, currency)}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>

    <ParentAmountFlash
      open={showParentAmount}
      onClose={() => setShowParentAmount(false)}
      amountUsd={totalAmount}
      rate={exchangeRate}
      studentName={identity.fullName}
      baseCurrency={currency}
    />

    <ConfirmDialog
      open={confirmOpen}
      title="Confirmer l'encaissement"
      description={`${identity.fullName} — ${formatMoney(totalAmount, currency)} en ${methodLabel}.`}
      impact={[
        identity.hasPostnom
          ? `Identité RDC confirmée · ${identity.fullName}`
          : `Élève · ${identity.fullName}`,
        `Preuve : ${labelPaymentProofType(proofType) ?? proofType}`,
        payerName.trim() ? `Payé par ${payerName.trim()}` : 'Payeur non précisé',
        isCatalogMode
          ? catalog?.feeStructureId
            ? `Hors échéancier · barème #${catalog.feeStructureId}`
            : 'Hors échéancier · montant libre'
          : `${editedLines.length} ligne(s) d'échéancier${isPartialPay ? ' · paiement partiel' : ''}`,
        hasOpenSession ? `Session caisse #${session?.id}` : 'Hors session caisse',
        exchangeRate
          ? `Taux ${exchangeRate.toLocaleString('fr-CD')} FC / $`
          : 'Sans taux FC',
        duplicateHit
          ? `Anti-doublon acquitté (#${duplicateHit.id})`
          : 'Aucun doublon récent détecté',
        reference.trim() ? `Référence ${reference.trim()}` : 'Sans référence opérateur',
      ]}
      confirmLabel="Encaisser maintenant"
      cancelLabel="Retour"
      loading={isPending}
      onConfirm={() => void executePayment()}
      onCancel={() => setConfirmOpen(false)}
    />
    </>
  )
}
