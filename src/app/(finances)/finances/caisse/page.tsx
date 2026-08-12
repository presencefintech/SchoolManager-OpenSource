'use client'

import { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import {
  Banknote,
  CheckCircle,
  Clock,
  Download,
  History,
  Lock,
  RefreshCw,
  TrendingDown,
  TrendingUp,
  Unlock,
  AlertTriangle,
  ArrowLeftRight,
  FileText,
} from 'lucide-react'
import {
  useSessionSummary,
  useOpenSession,
  useCloseSession,
  useExportCashSession,
  useExportCashSessionReport,
  useResolvedCashSession,
  useFinanceCurrencyConfig,
  useCashSessionHistory,
  useOpeningFloatSuggestion,
  useAddCashSessionMovement,
  useSubmitCashSessionToPromoter,
} from '@/lib/hooks/use-finance'
import type { CashLedgerMovementType } from '@/types/finance'
import { fadeUp } from '@/lib/animations'
import { getApiErrorMessage } from '@/lib/api/client'
import { formatMoney } from '@/lib/finance/currency'
import { formatDualMoney, usdToCdf, type TenderCurrency } from '@/lib/finance/congo-money.utils'
import {
  METHOD_LABELS,
  buildDenomSheet,
  denomsFor,
  emptyDenomCounts,
  formatDurationMinutes,
} from '@/lib/finance/cash-session.utils'
import { FinancePageHeader, FinancePageShell } from '@/components/finance/finance-page-shell'
import type { CashSessionSummary } from '@/types/finance'
import axios from 'axios'
import { cn } from '@/lib/utils'

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

function DenomPad({
  currency,
  counts,
  onChange,
  fxHint,
}: {
  currency: TenderCurrency
  counts: Record<number, number>
  onChange: (next: Record<number, number>) => void
  fxHint?: string
}) {
  const denoms = denomsFor(currency)
  const total = buildDenomSheet(currency, counts).total

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-zinc-500">Billetage {currency}</p>
        <p className="text-xs font-semibold tabular-nums text-zinc-800">
          {formatMoney(total, currency)}
        </p>
      </div>
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
        {denoms.map((denom) => (
          <label
            key={denom}
            className="rounded-lg border border-zinc-200 bg-zinc-50/80 px-2 py-1.5"
          >
            <span className="block text-[10px] font-medium text-zinc-500">
              {formatMoney(denom, currency)}
            </span>
            <input
              type="number"
              min={0}
              step={1}
              value={counts[denom] || ''}
              onChange={(e) =>
                onChange({
                  ...counts,
                  [denom]: Math.max(0, Math.floor(Number(e.target.value) || 0)),
                })
              }
              className="mt-0.5 w-full bg-transparent text-sm font-semibold tabular-nums text-zinc-900 outline-none"
              placeholder="0"
            />
          </label>
        ))}
      </div>
      {fxHint ? <p className="text-[10px] text-zinc-400">{fxHint}</p> : null}
    </div>
  )
}

function KpiCard({
  label,
  value,
  hint,
  tone = 'neutral',
}: {
  label: string
  value: string
  hint?: string
  tone?: 'neutral' | 'success' | 'danger' | 'warn'
}) {
  const toneClass =
    tone === 'success'
      ? 'border-emerald-100 bg-emerald-50/60'
      : tone === 'danger'
        ? 'border-red-100 bg-red-50/60'
        : tone === 'warn'
          ? 'border-amber-100 bg-amber-50/60'
          : 'border-zinc-100 bg-white'

  return (
    <div className={cn('rounded-2xl border p-4 shadow-sm', toneClass)}>
      <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-400">{label}</p>
      <p className="mt-1 text-lg font-semibold tabular-nums text-zinc-900">{value}</p>
      {hint ? <p className="mt-1 text-[11px] text-zinc-500">{hint}</p> : null}
    </div>
  )
}

export default function CaissePage() {
  const {
    session: currentSession,
    hasOpenSession,
    isLoading,
    couldNotVerify,
    refetch,
  } = useResolvedCashSession()

  const { data: summaryRaw, isFetching: summaryFetching } = useSessionSummary(
    currentSession?.id ?? 0,
  )
  const summary = summaryRaw as CashSessionSummary | undefined
  const { data: currencyConfig } = useFinanceCurrencyConfig()
  const { data: history } = useCashSessionHistory({ limit: 8 })
  const { data: openingSuggestion } = useOpeningFloatSuggestion(!hasOpenSession)
  const { mutateAsync: openSession, isPending: opening } = useOpenSession()
  const { mutateAsync: closeSession, isPending: closing } = useCloseSession()
  const { mutateAsync: addMovement, isPending: moving } = useAddCashSessionMovement()
  const exportSession = useExportCashSession()
  const exportReport = useExportCashSessionReport()
  const { mutateAsync: submitToPromoter, isPending: submitting } =
    useSubmitCashSessionToPromoter()
  const [submitOk, setSubmitOk] = useState<string | null>(null)

  const [openForm, setOpenForm] = useState({ openingFloat: '', openingFloatCdf: '', openNotes: '' })
  const [openUsdCounts, setOpenUsdCounts] = useState(() => emptyDenomCounts('USD'))
  const [openCdfCounts, setOpenCdfCounts] = useState(() => emptyDenomCounts('CDF'))
  const [closeForm, setCloseForm] = useState({ closingCounted: '', closeNotes: '' })
  const [closeUsdCounts, setCloseUsdCounts] = useState(() => emptyDenomCounts('USD'))
  const [closeCdfCounts, setCloseCdfCounts] = useState(() => emptyDenomCounts('CDF'))
  const [useBilletage, setUseBilletage] = useState(true)
  const [suggestionApplied, setSuggestionApplied] = useState(false)
  const [movForm, setMovForm] = useState({
    type: 'VERSEMENT' as CashLedgerMovementType,
    amount: '',
    currency: 'USD' as 'USD' | 'CDF',
    ref: '',
    note: '',
  })
  const [movError, setMovError] = useState<string | null>(null)
  const [movOk, setMovOk] = useState<string | null>(null)
  const [openError, setOpenError] = useState<string | null>(null)
  const [closeError, setCloseError] = useState<string | null>(null)
  const [exportError, setExportError] = useState<string | null>(null)
  const [openSuccess, setOpenSuccess] = useState(false)
  const [closeResult, setCloseResult] = useState<{
    variance: number
    status: string
    sessionId: number
  } | null>(null)

  const fxRate =
    currencyConfig?.legacyRate != null && Number(currencyConfig.legacyRate) > 0
      ? Number(currencyConfig.legacyRate)
      : null

  const nestedSummary = (currentSession as { summary?: CashSessionSummary } | null)?.summary
  const live = summary ?? nestedSummary

  const openingFloat = Number(
    live?.openingFloat ??
      live?.openingBalance ??
      currentSession?.openingFloat ??
      currentSession?.openingBalance ??
      0,
  )
  const cashCollected = Number(
    live?.cashCollected ?? live?.totalCollected ?? currentSession?.cashCollected ?? 0,
  )
  const expectedCashUsd = Number(
    live?.expectedCash ?? openingFloat + cashCollected,
  )
  const txCount = Number(live?.transactionCount ?? currentSession?.transactionCount ?? 0)
  const byMethod = live?.byMethod ?? []
  const recentPayments = live?.recentPayments ?? []
  const durationMinutes = live?.durationMinutes
  const cashierName = live?.cashierName ?? currentSession?.cashierName
  const ledgerMovements = live?.ledger?.movements ?? currentSession?.ledger?.movements ?? []
  const ledgerTotals = live?.ledgerTotals ?? currentSession?.ledgerTotals

  const expectedDual = formatDualMoney(expectedCashUsd, fxRate)
  const openSheet = buildDenomSheet('USD', openUsdCounts)
  const openCdfSheet = buildDenomSheet('CDF', openCdfCounts)
  const closeUsdSheet = buildDenomSheet('USD', closeUsdCounts)
  const closeCdfSheet = buildDenomSheet('CDF', closeCdfCounts)
  const floatPolicy = openingSuggestion?.policy
  const dualEnabled = Boolean(floatPolicy?.enableDualCurrencyFloat)
  const mustBilletage = Boolean(floatPolicy?.requireDenominationOnOpen) || useBilletage
  const openingFloatCdfLive = Number(
    (currentSession as { openingFloatCdf?: number | null } | null)?.openingFloatCdf ?? 0,
  )

  useEffect(() => {
    if (hasOpenSession || !openingSuggestion || suggestionApplied) return
    setSuggestionApplied(true)
    setOpenForm((p) => ({
      openingFloat: p.openingFloat || String(openingSuggestion.suggested),
      openingFloatCdf:
        p.openingFloatCdf ||
        (openingSuggestion.suggestedCdf != null
          ? String(openingSuggestion.suggestedCdf)
          : p.openingFloatCdf),
      openNotes: p.openNotes,
    }))
    if (openingSuggestion.policy.requireDenominationOnOpen) {
      setUseBilletage(true)
    }
  }, [hasOpenSession, openingSuggestion, suggestionApplied])

  function applySuggestedAmount(amount: number) {
    setOpenForm((p) => ({ ...p, openingFloat: String(amount) }))
    setOpenUsdCounts(emptyDenomCounts('USD'))
    setUseBilletage(Boolean(floatPolicy?.requireDenominationOnOpen))
  }

  function applySuggestedCdf(amount: number) {
    setOpenForm((p) => ({ ...p, openingFloatCdf: String(amount) }))
    setOpenCdfCounts(emptyDenomCounts('CDF'))
  }

  const countedUsd = useMemo(() => {
    if (useBilletage && closeUsdSheet.total > 0) return closeUsdSheet.total
    return Number(closeForm.closingCounted) || 0
  }, [useBilletage, closeUsdSheet.total, closeForm.closingCounted])

  const varianceUsd = countedUsd - expectedCashUsd
  const varianceTone =
    Math.abs(varianceUsd) < 0.02 ? 'success' : Math.abs(varianceUsd) < 5 ? 'warn' : 'danger'

  async function handleOpen(e: React.FormEvent) {
    e.preventDefault()
    setOpenError(null)
    setOpenSuccess(false)
    const float = mustBilletage && openSheet.total > 0
      ? openSheet.total
      : Number(openForm.openingFloat) || 0
    const floatCdf =
      dualEnabled
        ? mustBilletage && openCdfSheet.total > 0
          ? openCdfSheet.total
          : Number(openForm.openingFloatCdf) || 0
        : undefined
    const sheets = []
    if (mustBilletage && openSheet.lines.length > 0) sheets.push(openSheet)
    if (dualEnabled && mustBilletage && openCdfSheet.lines.length > 0) sheets.push(openCdfSheet)
    try {
      await openSession({
        openingFloat: float,
        openingFloatCdf: floatCdf,
        openNotes: openForm.openNotes || undefined,
        openingSheet: sheets.length ? sheets : undefined,
      })
      setOpenSuccess(true)
      setOpenForm({ openingFloat: '', openingFloatCdf: '', openNotes: '' })
      setOpenUsdCounts(emptyDenomCounts('USD'))
      setOpenCdfCounts(emptyDenomCounts('CDF'))
      setSuggestionApplied(false)
      refetch()
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.status === 409) {
        await refetch()
        setOpenError('Une session est déjà ouverte — affichage mis à jour.')
        return
      }
      setOpenError(getApiErrorMessage(err))
    }
  }

  async function handleClose(e: React.FormEvent) {
    e.preventDefault()
    if (!currentSession?.id) return
    setCloseError(null)
    setCloseResult(null)
    const closedId = currentSession.id
    const sheets = []
    if (useBilletage && closeUsdSheet.lines.length > 0) sheets.push(closeUsdSheet)
    if (useBilletage && closeCdfSheet.lines.length > 0) sheets.push(closeCdfSheet)
    try {
      const result = await closeSession({
        id: closedId,
        payload: {
          closingCounted: countedUsd,
          closeNotes: closeForm.closeNotes || undefined,
          fxRateAtClose: fxRate ?? undefined,
          closingSheet: sheets.length ? sheets : undefined,
        },
      })
      const variance = Number((result as { variance?: number })?.variance ?? varianceUsd)
      const status = String(
        (result as { varianceStatus?: string })?.varianceStatus ??
          (Math.abs(variance) < 0.02 ? 'BALANCED' : variance > 0 ? 'OVER' : 'SHORT'),
      )
      setCloseResult({ variance, status, sessionId: closedId })
      setCloseForm({ closingCounted: '', closeNotes: '' })
      setCloseUsdCounts(emptyDenomCounts('USD'))
      setCloseCdfCounts(emptyDenomCounts('CDF'))
      refetch()
      // Rapport Z PDF automatique à la clôture
      try {
        const blob = await exportReport.mutateAsync(closedId)
        downloadBlob(blob, `rapport-caisse-${closedId}.pdf`)
      } catch {
        /* PDF optionnel — l’utilisateur peut le retélécharger */
      }
    } catch (err) {
      setCloseError(getApiErrorMessage(err))
    }
  }

  async function handleExport() {
    if (!currentSession?.id) return
    setExportError(null)
    try {
      const blob = await exportSession.mutateAsync(currentSession.id)
      downloadBlob(
        blob,
        `session-caisse-${currentSession.id}-${new Date().toISOString().slice(0, 10)}.csv`,
      )
    } catch (err) {
      setExportError(getApiErrorMessage(err))
    }
  }

  async function handleReportPdf(sessionId: number) {
    setExportError(null)
    try {
      const blob = await exportReport.mutateAsync(sessionId)
      downloadBlob(blob, `rapport-caisse-${sessionId}.pdf`)
    } catch (err) {
      setExportError(getApiErrorMessage(err))
    }
  }

  async function handleSubmitToPromoter(sessionId: number) {
    setExportError(null)
    setSubmitOk(null)
    try {
      await submitToPromoter({ id: sessionId })
      setSubmitOk('Rapport soumis au promoteur — en attente de visa.')
      void refetch()
    } catch (err) {
      setExportError(getApiErrorMessage(err))
    }
  }

  async function handleAddMovement(e: React.FormEvent) {
    e.preventDefault()
    if (!currentSession?.id) return
    setMovError(null)
    setMovOk(null)
    const raw = Number(movForm.amount)
    if (!Number.isFinite(raw) || raw <= 0) {
      setMovError('Montant invalide.')
      return
    }
    if (movForm.type === 'VERSEMENT' && !movForm.ref.trim()) {
      setMovError('Référence bordereau / banque obligatoire pour un versement.')
      return
    }
    let amount = raw
    let amountCdf: number | undefined
    if (movForm.currency === 'CDF') {
      amountCdf = Math.round(raw)
      if (!fxRate || fxRate <= 0) {
        setMovError('Taux USD/CDF requis pour enregistrer un mouvement en francs.')
        return
      }
      amount = Number((raw / fxRate).toFixed(2))
    }
    try {
      await addMovement({
        id: currentSession.id,
        payload: {
          type: movForm.type,
          amount,
          amountCdf,
          ref: movForm.ref.trim() || undefined,
          note: movForm.note.trim() || undefined,
        },
      })
      setMovForm((p) => ({ ...p, amount: '', ref: '', note: '' }))
      setMovOk(
        movForm.type === 'VERSEMENT'
          ? 'Versement banque enregistré — fond attendu mis à jour.'
          : movForm.type === 'RENFLOUEMENT'
            ? 'Renflouement enregistré.'
            : 'Retrait trésorerie enregistré.',
      )
      void refetch()
    } catch (err) {
      setMovError(getApiErrorMessage(err))
    }
  }

  return (
    <FinancePageShell>
      <FinancePageHeader
        title="Caisse guichet"
        subtitle="Ouverture · encaissements · rapport Z PDF · clôture — RDC"
        badge={
          hasOpenSession ? (
            <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 ring-1 ring-emerald-100">
              SESSION OUVERTE
            </span>
          ) : (
            <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] font-semibold text-zinc-500">
              FERMÉE
            </span>
          )
        }
        actions={
          <>
            <button
              type="button"
              onClick={() => refetch()}
              className="rounded-xl border border-zinc-200 p-2 text-zinc-400 hover:bg-zinc-50"
              title="Actualiser"
            >
              <RefreshCw size={14} className={summaryFetching ? 'animate-spin' : ''} />
            </button>
            {hasOpenSession && (
              <>
                <button
                  type="button"
                  onClick={() => void handleReportPdf(currentSession!.id)}
                  disabled={exportReport.isPending}
                  className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-2 text-xs font-medium text-white hover:bg-emerald-700 disabled:opacity-40"
                >
                  <FileText size={12} />
                  {exportReport.isPending ? 'PDF…' : 'Rapport Z (PDF)'}
                </button>
                <a
                  href="/finances/rapports/situation-mensuelle"
                  className="flex items-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-800 hover:bg-emerald-100"
                >
                  Situation mensuelle
                </a>
                <a
                  href="/finances/depenses"
                  className="flex items-center gap-1.5 rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs font-medium text-zinc-700 hover:bg-zinc-50"
                >
                  Dépenses
                </a>
                <button
                  type="button"
                  onClick={() => void handleExport()}
                  disabled={exportSession.isPending}
                  className="flex items-center gap-1.5 rounded-xl border border-zinc-200 px-3 py-2 text-xs text-zinc-600 hover:bg-zinc-50 disabled:opacity-40"
                >
                  <Download size={12} /> CSV
                </button>
              </>
            )}
          </>
        }
      />

      {exportError ? (
        <p className="rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-xs text-red-700">
          {exportError}
        </p>
      ) : null}

      {closeResult ? (
        <motion.div
          variants={fadeUp}
          initial="hidden"
          animate="show"
          className={cn(
            'rounded-2xl border px-4 py-3 text-sm',
            closeResult.status === 'BALANCED'
              ? 'border-emerald-100 bg-emerald-50 text-emerald-800'
              : closeResult.status === 'OVER'
                ? 'border-sky-100 bg-sky-50 text-sky-900'
                : 'border-amber-100 bg-amber-50 text-amber-900',
          )}
        >
          <div className="flex items-center gap-2 font-semibold">
            {closeResult.status === 'BALANCED' ? (
              <CheckCircle size={16} />
            ) : (
              <AlertTriangle size={16} />
            )}
            Session clôturée —{' '}
            {closeResult.status === 'BALANCED'
              ? 'caisse juste'
              : closeResult.status === 'OVER'
                ? 'excédent'
                : 'manquant'}{' '}
            ({closeResult.variance >= 0 ? '+' : ''}
            {formatMoney(closeResult.variance)})
          </div>
          <button
            type="button"
            onClick={() => void handleReportPdf(closeResult.sessionId)}
            disabled={exportReport.isPending}
            className="mt-2 mr-2 inline-flex items-center gap-1.5 rounded-lg border border-current/20 bg-white/60 px-2.5 py-1.5 text-xs font-medium"
          >
            <FileText size={12} />
            {exportReport.isPending ? 'Génération…' : 'Télécharger le rapport Z (PDF)'}
          </button>
          <button
            type="button"
            onClick={() => void handleSubmitToPromoter(closeResult.sessionId)}
            disabled={submitting}
            className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-zinc-900 px-2.5 py-1.5 text-xs font-medium text-white disabled:opacity-50"
          >
            {submitting ? 'Soumission…' : 'Soumettre au promoteur'}
          </button>
        </motion.div>
      ) : null}

      {submitOk ? (
        <p className="rounded-xl border border-emerald-100 bg-emerald-50 px-3 py-2 text-xs text-emerald-800">
          {submitOk}
        </p>
      ) : null}

      {/* KPI strip */}
      {hasOpenSession ? (
        <motion.div
          variants={fadeUp}
          initial="hidden"
          animate="show"
          className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"
        >
          <KpiCard
            label="Fond d’ouverture"
            value={formatMoney(openingFloat)}
            hint={
              openingFloatCdfLive > 0
                ? `+ ${formatMoney(openingFloatCdfLive, 'CDF')} FC`
                : fxRate
                  ? `≈ ${formatMoney(usdToCdf(openingFloat, fxRate), 'CDF')}`
                  : cashierName || undefined
            }
          />
          <KpiCard
            label="Espèces encaissées"
            value={formatMoney(cashCollected)}
            hint={`${txCount} paiement${txCount > 1 ? 's' : ''} cash`}
            tone="success"
          />
          <KpiCard
            label="Attendu en caisse"
            value={formatMoney(expectedCashUsd)}
            hint={
              ledgerTotals && ledgerTotals.netUsd !== 0
                ? `Dont mvts ${ledgerTotals.netUsd >= 0 ? '+' : ''}${formatMoney(ledgerTotals.netUsd)}`
                : expectedDual.secondary || expectedDual.rateLabel || undefined
            }
          />
          <KpiCard
            label="Durée session"
            value={formatDurationMinutes(durationMinutes)}
            hint={
              currentSession?.openedAt
                ? `Depuis ${new Date(currentSession.openedAt).toLocaleTimeString('fr-FR', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}`
                : undefined
            }
          />
        </motion.div>
      ) : null}

      {/* Session status + method mix */}
      <motion.div
        variants={fadeUp}
        initial="hidden"
        animate="show"
        className="rounded-2xl border border-zinc-100 bg-white p-5 shadow-sm"
      >
        <div className="mb-4 flex items-center gap-3">
          <div
            className={cn(
              'flex h-9 w-9 items-center justify-center rounded-xl',
              hasOpenSession ? 'bg-emerald-50' : 'bg-zinc-100',
            )}
          >
            {hasOpenSession ? (
              <Unlock size={16} className="text-emerald-600" />
            ) : (
              <Lock size={16} className="text-zinc-400" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-sm font-semibold text-zinc-900">Session actuelle</h2>
            <p className="truncate text-xs text-zinc-400">
              {isLoading
                ? 'Chargement…'
                : hasOpenSession
                  ? `#${currentSession!.id}${cashierName ? ` · ${cashierName}` : ''} · ${currentSession!.currency || 'USD'}`
                  : 'Aucune session ouverte — ouvrez la caisse pour encaisser en espèces'}
            </p>
          </div>
          <span
            className={cn(
              'rounded-full px-2.5 py-1 text-xs font-medium',
              hasOpenSession
                ? 'bg-emerald-50 text-emerald-700'
                : 'bg-zinc-100 text-zinc-500',
            )}
          >
            {hasOpenSession ? 'OUVERTE' : 'FERMÉE'}
          </span>
        </div>

        {hasOpenSession && byMethod.length > 0 ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {byMethod.map((m) => (
              <div key={m.method} className="rounded-xl bg-zinc-50 p-3">
                <p className="text-xs text-zinc-400">
                  {METHOD_LABELS[m.method] ?? m.method}
                </p>
                <p className="text-sm font-bold tabular-nums text-zinc-900">
                  {formatMoney(Number(m.amount))}
                </p>
                <p className="text-xs text-zinc-400">{m.count} tx</p>
              </div>
            ))}
            <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-3">
              <div className="mb-1 flex items-center gap-1.5">
                <TrendingUp size={11} className="text-emerald-600" />
                <p className="text-xs text-emerald-600">Total session</p>
              </div>
              <p className="text-sm font-bold tabular-nums text-emerald-700">
                {formatMoney(
                  byMethod.reduce((a, m) => a + Number(m.amount || 0), 0),
                )}
              </p>
              <p className="text-xs text-emerald-600">
                {byMethod.reduce((a, m) => a + Number(m.count || 0), 0)} transactions
              </p>
            </div>
          </div>
        ) : null}

        {couldNotVerify ? (
          <p className="mt-3 rounded-lg border border-amber-100 bg-amber-50 px-3 py-2 text-xs text-amber-800">
            Impossible de lire l&apos;état de la caisse. Vérifiez la connexion, puis rechargez.
          </p>
        ) : null}
      </motion.div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Open */}
        {!hasOpenSession && (
          <motion.div
            variants={fadeUp}
            initial="hidden"
            animate="show"
            className="rounded-2xl border border-zinc-100 bg-white p-6 shadow-sm"
          >
            <div className="mb-5 flex items-center gap-2">
              <CheckCircle size={15} className="text-emerald-600" />
              <h2 className="text-sm font-semibold text-zinc-900">Ouvrir la caisse</h2>
            </div>
            {openSuccess ? (
              <div className="mb-4 flex items-center gap-2 rounded-xl border border-emerald-100 bg-emerald-50 px-3 py-2">
                <CheckCircle size={13} className="text-emerald-600" />
                <p className="text-sm text-emerald-700">Session ouverte</p>
              </div>
            ) : null}
            <form onSubmit={handleOpen} className="space-y-4">
              {openingSuggestion ? (
                <div className="rounded-xl border border-emerald-100 bg-emerald-50/70 px-3 py-3 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-xs font-semibold text-emerald-900">
                        Fond suggéré · {formatMoney(openingSuggestion.suggested, openingSuggestion.currency as 'USD' | 'CDF')}
                      </p>
                      <p className="text-[11px] text-emerald-800/80">{openingSuggestion.label}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => applySuggestedAmount(openingSuggestion.suggested)}
                      className="shrink-0 rounded-lg bg-emerald-600 px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-emerald-700"
                    >
                      Appliquer
                    </button>
                  </div>
                  {openingSuggestion.alternatives.length > 1 ? (
                    <div className="flex flex-wrap gap-1.5">
                      {openingSuggestion.alternatives.map((alt) => (
                        <button
                          key={`${alt.source}-${alt.amount}`}
                          type="button"
                          onClick={() => applySuggestedAmount(alt.amount)}
                          className="rounded-full border border-emerald-200 bg-white px-2.5 py-1 text-[10px] font-medium text-emerald-800 hover:bg-emerald-50"
                          title={alt.label}
                        >
                          {alt.source === 'LAST_CLOSE'
                            ? 'Dernière clôture'
                            : alt.source === 'BALANCED_AVERAGE'
                              ? 'Moyenne école'
                              : 'Défaut école'}{' '}
                          · {formatMoney(alt.amount)}
                        </button>
                      ))}
                    </div>
                  ) : null}
                  <p className="text-[10px] text-emerald-800/70">
                    Politique école : min {formatMoney(floatPolicy?.minOpeningFloat ?? 0)} · max{' '}
                    {formatMoney(floatPolicy?.maxOpeningFloat ?? 0)}
                    {floatPolicy?.requireDenominationOnOpen ? ' · billetage obligatoire' : ''}
                    {dualEnabled ? ' · dual USD+FC' : ''}
                  </p>
                  {dualEnabled && openingSuggestion.suggestedCdf != null ? (
                    <div className="flex items-center justify-between gap-2 border-t border-emerald-100/80 pt-2">
                      <p className="text-[11px] text-emerald-900">
                        Fond FC suggéré ·{' '}
                        <span className="font-semibold tabular-nums">
                          {formatMoney(openingSuggestion.suggestedCdf, 'CDF')}
                        </span>
                      </p>
                      <button
                        type="button"
                        onClick={() => applySuggestedCdf(openingSuggestion.suggestedCdf!)}
                        className="rounded-lg border border-emerald-200 bg-white px-2 py-0.5 text-[10px] font-semibold text-emerald-800"
                      >
                        Appliquer FC
                      </button>
                    </div>
                  ) : null}
                </div>
              ) : null}

              <label className="flex items-center gap-2 text-xs text-zinc-600">
                <input
                  type="checkbox"
                  checked={mustBilletage}
                  disabled={Boolean(floatPolicy?.requireDenominationOnOpen)}
                  onChange={(e) => setUseBilletage(e.target.checked)}
                  className="rounded border-zinc-300"
                />
                Compter le fond par coupures
                {floatPolicy?.requireDenominationOnOpen ? ' (obligatoire)' : ' (recommandé)'}
              </label>
              {mustBilletage ? (
                <div className="space-y-4">
                  <DenomPad
                    currency="USD"
                    counts={openUsdCounts}
                    onChange={setOpenUsdCounts}
                    fxHint={
                      fxRate && openSheet.total > 0
                        ? `≈ ${formatMoney(usdToCdf(openSheet.total, fxRate), 'CDF')}`
                        : undefined
                    }
                  />
                  {dualEnabled ? (
                    <DenomPad
                      currency="CDF"
                      counts={openCdfCounts}
                      onChange={setOpenCdfCounts}
                      fxHint="Tiroir francs congolais (monnaie / rendu)"
                    />
                  ) : null}
                </div>
              ) : (
                <div className="space-y-3">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-zinc-500">
                      Fond USD ($)
                    </label>
                    <input
                      type="number"
                      min={floatPolicy?.minOpeningFloat ?? 0}
                      max={floatPolicy?.maxOpeningFloat}
                      step="0.01"
                      value={openForm.openingFloat}
                      onChange={(e) =>
                        setOpenForm((p) => ({ ...p, openingFloat: e.target.value }))
                      }
                      placeholder={String(openingSuggestion?.suggested ?? 0)}
                      className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
                    />
                  </div>
                  {dualEnabled ? (
                    <div>
                      <label className="mb-1 block text-xs font-medium text-zinc-500">
                        Fond FC (CDF)
                      </label>
                      <input
                        type="number"
                        min={floatPolicy?.minOpeningFloatCdf ?? 0}
                        max={floatPolicy?.maxOpeningFloatCdf}
                        step="1"
                        value={openForm.openingFloatCdf}
                        onChange={(e) =>
                          setOpenForm((p) => ({ ...p, openingFloatCdf: e.target.value }))
                        }
                        placeholder={String(openingSuggestion?.suggestedCdf ?? 0)}
                        className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
                      />
                    </div>
                  ) : null}
                </div>
              )}
              <div>
                <label className="mb-1 block text-xs font-medium text-zinc-500">Notes</label>
                <input
                  value={openForm.openNotes}
                  onChange={(e) =>
                    setOpenForm((p) => ({ ...p, openNotes: e.target.value }))
                  }
                  placeholder="Optionnel"
                  className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
                />
              </div>
              {openError ? (
                <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-500">{openError}</p>
              ) : null}
              <button
                type="submit"
                disabled={opening}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
              >
                <Unlock size={14} />
                {opening ? 'Ouverture…' : 'Ouvrir la session'}
              </button>
            </form>
          </motion.div>
        )}

        {/* Mouvements de fonds RDC */}
        {hasOpenSession && (
          <motion.div
            variants={fadeUp}
            initial="hidden"
            animate="show"
            className="rounded-2xl border border-zinc-100 bg-white p-6 shadow-sm"
          >
            <div className="mb-4 flex items-center gap-2">
              <ArrowLeftRight size={15} className="text-sky-600" />
              <div>
                <h2 className="text-sm font-semibold text-zinc-900">Mouvements de fonds</h2>
                <p className="text-[11px] text-zinc-500">
                  Versement banque (bordereau), renflouement, retrait trésorerie — traçabilité admin.
                </p>
              </div>
            </div>
            <form onSubmit={handleAddMovement} className="space-y-3">
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <div>
                  <label className="mb-1 block text-xs font-medium text-zinc-500">Type</label>
                  <select
                    value={movForm.type}
                    onChange={(e) =>
                      setMovForm((p) => ({
                        ...p,
                        type: e.target.value as CashLedgerMovementType,
                      }))
                    }
                    className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
                  >
                    <option value="VERSEMENT">Versement banque</option>
                    <option value="RENFLOUEMENT">Renflouement</option>
                    <option value="RETRAIT_TRESORERIE">Retrait trésorerie</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-zinc-500">Montant</label>
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    value={movForm.amount}
                    onChange={(e) => setMovForm((p) => ({ ...p, amount: e.target.value }))}
                    className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-zinc-500">Devise</label>
                  <select
                    value={movForm.currency}
                    onChange={(e) =>
                      setMovForm((p) => ({
                        ...p,
                        currency: e.target.value as 'USD' | 'CDF',
                      }))
                    }
                    className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
                  >
                    <option value="USD">USD</option>
                    <option value="CDF">CDF</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-zinc-500">
                    Réf. bordereau{movForm.type === 'VERSEMENT' ? ' *' : ''}
                  </label>
                  <input
                    value={movForm.ref}
                    onChange={(e) => setMovForm((p) => ({ ...p, ref: e.target.value }))}
                    placeholder="ex. BOR-2026-0412"
                    className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
                  />
                </div>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-zinc-500">Note</label>
                <input
                  value={movForm.note}
                  onChange={(e) => setMovForm((p) => ({ ...p, note: e.target.value }))}
                  placeholder="Banque, motif, responsable…"
                  className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
                />
              </div>
              {movError ? (
                <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-500">{movError}</p>
              ) : null}
              {movOk ? (
                <p className="rounded-lg bg-emerald-50 px-3 py-2 text-xs text-emerald-700">{movOk}</p>
              ) : null}
              <button
                type="submit"
                disabled={moving}
                className="inline-flex items-center gap-2 rounded-xl bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50"
              >
                <ArrowLeftRight size={14} />
                {moving ? 'Enregistrement…' : 'Enregistrer le mouvement'}
              </button>
            </form>
            {ledgerMovements.length > 0 ? (
              <div className="mt-4 overflow-hidden rounded-xl border border-zinc-100">
                <table className="w-full text-left text-xs">
                  <thead className="bg-zinc-50 text-[10px] uppercase tracking-wide text-zinc-400">
                    <tr>
                      <th className="px-3 py-2 font-medium">Type</th>
                      <th className="px-3 py-2 font-medium">Montant</th>
                      <th className="px-3 py-2 font-medium">Réf.</th>
                      <th className="px-3 py-2 font-medium">Quand</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-50">
                    {ledgerMovements.map((m) => (
                      <tr key={m.id} className="text-zinc-700">
                        <td className="px-3 py-2 font-medium">{m.type}</td>
                        <td className="px-3 py-2 tabular-nums">
                          {formatMoney(m.amount)}
                          {m.amountCdf ? (
                            <span className="ml-1 text-[10px] text-zinc-400">
                              ({formatMoney(m.amountCdf, 'CDF')})
                            </span>
                          ) : null}
                        </td>
                        <td className="px-3 py-2 text-zinc-500">{m.ref ?? '—'}</td>
                        <td className="px-3 py-2 text-zinc-400">
                          {new Date(m.at).toLocaleString('fr-FR', {
                            day: '2-digit',
                            month: 'short',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : null}
          </motion.div>
        )}

        {/* Close */}
        {hasOpenSession && (
          <motion.div
            variants={fadeUp}
            initial="hidden"
            animate="show"
            className="rounded-2xl border border-zinc-100 bg-white p-6 shadow-sm"
          >
            <div className="mb-5 flex items-center gap-2">
              <Lock size={15} className="text-red-500" />
              <h2 className="text-sm font-semibold text-zinc-900">Clôturer (rapport Z)</h2>
            </div>
            <form onSubmit={handleClose} className="space-y-4">
              <div className="space-y-1 rounded-xl border border-sky-100 bg-sky-50/80 px-3 py-2.5 text-xs">
                <p className="font-semibold text-sky-950">Attendu en caisse</p>
                <p className="tabular-nums text-sky-900">
                  {expectedDual.primary}
                  {expectedDual.secondary ? ` · ${expectedDual.secondary}` : ''}
                </p>
                <button
                  type="button"
                  onClick={() =>
                    setCloseForm((p) => ({
                      ...p,
                      closingCounted: String(Number(expectedCashUsd.toFixed(2))),
                    }))
                  }
                  className="mt-1 text-[11px] font-semibold text-sky-800 underline"
                >
                  Préremplir = attendu
                </button>
              </div>

              <label className="flex items-center gap-2 text-xs text-zinc-600">
                <input
                  type="checkbox"
                  checked={useBilletage}
                  onChange={(e) => setUseBilletage(e.target.checked)}
                  className="rounded border-zinc-300"
                />
                Billetage détaillé à la clôture
              </label>

              {useBilletage ? (
                <div className="space-y-4">
                  <DenomPad
                    currency="USD"
                    counts={closeUsdCounts}
                    onChange={setCloseUsdCounts}
                  />
                  {fxRate ? (
                    <DenomPad
                      currency="CDF"
                      counts={closeCdfCounts}
                      onChange={setCloseCdfCounts}
                      fxHint="Feuille FC (audit) — le solde Z reste en USD"
                    />
                  ) : null}
                </div>
              ) : (
                <div>
                  <label className="mb-1 block text-xs font-medium text-zinc-500">
                    Caisse comptée ($)
                  </label>
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    value={closeForm.closingCounted}
                    onChange={(e) =>
                      setCloseForm((p) => ({ ...p, closingCounted: e.target.value }))
                    }
                    placeholder="0"
                    className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
                  />
                </div>
              )}

              {(closeForm.closingCounted || closeUsdSheet.total > 0) && (
                <div
                  className={cn(
                    'flex items-center gap-2 rounded-xl border px-3 py-2 text-xs',
                    varianceTone === 'success'
                      ? 'border-emerald-100 bg-emerald-50 text-emerald-800'
                      : varianceTone === 'warn'
                        ? 'border-amber-100 bg-amber-50 text-amber-900'
                        : 'border-red-100 bg-red-50 text-red-800',
                  )}
                >
                  {varianceUsd >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                  Écart prévisionnel : {varianceUsd >= 0 ? '+' : ''}
                  {formatMoney(varianceUsd)}
                  {fxRate ? (
                    <span className="text-[10px] opacity-80">
                      ({varianceUsd >= 0 ? '+' : ''}
                      {formatMoney(usdToCdf(varianceUsd, fxRate), 'CDF')})
                    </span>
                  ) : null}
                </div>
              )}

              <div>
                <label className="mb-1 block text-xs font-medium text-zinc-500">
                  Notes de clôture
                </label>
                <textarea
                  value={closeForm.closeNotes}
                  onChange={(e) =>
                    setCloseForm((p) => ({ ...p, closeNotes: e.target.value }))
                  }
                  rows={2}
                  placeholder="Écarts, dépôt banque, observations…"
                  className="w-full resize-none rounded-lg border border-zinc-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
                />
              </div>
              {closeError ? (
                <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-500">{closeError}</p>
              ) : null}
              <button
                type="submit"
                disabled={closing}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
              >
                <Lock size={14} />
                {closing ? 'Clôture…' : 'Clôturer la session'}
              </button>
            </form>
          </motion.div>
        )}

        {/* Recent payments / details */}
        {hasOpenSession && (
          <motion.div
            variants={fadeUp}
            initial="hidden"
            animate="show"
            className="rounded-2xl border border-zinc-100 bg-white p-6 shadow-sm"
          >
            <div className="mb-4 flex items-center gap-2">
              <Banknote size={15} className="text-zinc-400" />
              <h2 className="text-sm font-semibold text-zinc-900">
                Mouvements de la session
              </h2>
            </div>
            {recentPayments.length === 0 ? (
              <p className="py-8 text-center text-xs text-zinc-400">
                Aucun paiement lié pour l’instant
              </p>
            ) : (
              <div className="max-h-80 divide-y divide-zinc-50 overflow-y-auto">
                {recentPayments.map((p) => (
                  <div
                    key={p.id}
                    className="flex items-center justify-between gap-3 py-2.5"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-xs font-medium text-zinc-800">
                        {p.studentName}
                      </p>
                      <p className="text-[10px] text-zinc-400">
                        #{p.id} · {METHOD_LABELS[p.method] ?? p.method} ·{' '}
                        {new Date(p.createdAt).toLocaleTimeString('fr-FR', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                    </div>
                    <span className="shrink-0 text-xs font-semibold tabular-nums text-emerald-700">
                      {formatMoney(Number(p.amount), (p.currency || 'USD') as 'USD' | 'CDF')}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </div>

      {/* History */}
      <motion.div
        variants={fadeUp}
        initial="hidden"
        animate="show"
        className="rounded-2xl border border-zinc-100 bg-white p-6 shadow-sm"
      >
        <div className="mb-4 flex items-center gap-2">
          <History size={15} className="text-zinc-400" />
          <h2 className="text-sm font-semibold text-zinc-900">Historique des sessions</h2>
          {history?.total ? (
            <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] font-medium text-zinc-500">
              {history.total}
            </span>
          ) : null}
        </div>
        {!history?.data?.length ? (
          <p className="py-6 text-center text-xs text-zinc-400">Pas encore de sessions</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-zinc-100 text-[10px] uppercase tracking-wide text-zinc-400">
                  <th className="pb-2 pr-3 font-medium">Session</th>
                  <th className="pb-2 pr-3 font-medium">Caissier</th>
                  <th className="pb-2 pr-3 font-medium">Ouverture</th>
                  <th className="pb-2 pr-3 font-medium">Espèces</th>
                  <th className="pb-2 pr-3 font-medium">Écart</th>
                  <th className="pb-2 pr-3 font-medium">Statut</th>
                  <th className="pb-2 font-medium">Rapport</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-50">
                {history.data.map((row) => {
                  const variance = row.variance != null ? Number(row.variance) : null
                  return (
                    <tr key={row.id} className="text-zinc-700">
                      <td className="py-2.5 pr-3 font-medium tabular-nums">#{row.id}</td>
                      <td className="py-2.5 pr-3">{row.cashierName ?? '—'}</td>
                      <td className="py-2.5 pr-3">
                        <span className="inline-flex items-center gap-1">
                          <Clock size={10} className="text-zinc-300" />
                          {new Date(row.openedAt).toLocaleString('fr-FR', {
                            day: '2-digit',
                            month: 'short',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </td>
                      <td className="py-2.5 pr-3 tabular-nums">
                        {formatMoney(Number(row.cashCollected ?? row.totalCollected ?? 0))}
                      </td>
                      <td
                        className={cn(
                          'py-2.5 pr-3 tabular-nums font-medium',
                          variance == null
                            ? 'text-zinc-400'
                            : Math.abs(variance) < 0.02
                              ? 'text-emerald-700'
                              : variance > 0
                                ? 'text-sky-700'
                                : 'text-amber-700',
                        )}
                      >
                        {variance == null
                          ? '—'
                          : `${variance >= 0 ? '+' : ''}${formatMoney(variance)}`}
                      </td>
                      <td className="py-2.5 pr-3">
                        <span
                          className={cn(
                            'rounded-full px-2 py-0.5 text-[10px] font-semibold',
                            row.status === 'OPEN'
                              ? 'bg-emerald-50 text-emerald-700'
                              : 'bg-zinc-100 text-zinc-500',
                          )}
                        >
                          {row.status === 'OPEN' ? 'Ouverte' : 'Clôturée'}
                        </span>
                      </td>
                      <td className="py-2.5">
                        <div className="flex flex-wrap items-center gap-1">
                          <button
                            type="button"
                            onClick={() => void handleReportPdf(row.id)}
                            disabled={exportReport.isPending}
                            className="inline-flex items-center gap-1 rounded-lg border border-zinc-200 px-2 py-1 text-[10px] font-medium text-zinc-600 hover:bg-zinc-50 disabled:opacity-40"
                            title="Rapport Z PDF"
                          >
                            <FileText size={11} /> PDF
                          </button>
                          {row.status === 'CLOSED' && !row.submittedToPromoter ? (
                            <button
                              type="button"
                              onClick={() => void handleSubmitToPromoter(row.id)}
                              disabled={submitting}
                              className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-2 py-1 text-[10px] font-medium text-white disabled:opacity-40"
                            >
                              Soumettre
                            </button>
                          ) : null}
                          {row.submittedToPromoter ? (
                            <span
                              className={cn(
                                'rounded-full px-2 py-0.5 text-[10px] font-semibold',
                                row.promoterAcknowledged
                                  ? 'bg-emerald-50 text-emerald-700'
                                  : 'bg-amber-50 text-amber-800',
                              )}
                            >
                              {row.promoterAcknowledged ? 'Visé' : 'Soumis'}
                            </span>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </motion.div>
    </FinancePageShell>
  )
}
