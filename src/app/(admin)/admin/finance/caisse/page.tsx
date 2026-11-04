'use client'

import { useEffect, useState } from 'react'
import {
  AlertTriangle,
  Banknote,
  CheckCircle2,
  Clock,
  FileText,
  Loader2,
  RefreshCw,
  Save,
  Send,
  MessageSquare,
  TrendingDown,
  TrendingUp,
  Wallet,
} from 'lucide-react'
import {
  useCashFloatPolicy,
  useCashFundTraceability,
  useUpdateCashFloatPolicy,
  useDownloadAdminCashSessionReport,
  useAcknowledgeCashSessionReport,
  useSchoolDayDigest,
  useDownloadSchoolDayDigestPdf,
  useDemoValuePanel,
  useGoLiveReadiness,
  useWeeklyPromoterDigest,
  useSendWeeklyPromoterDigest,
  useCashDesksLive,
  useForceCloseCashSession,
  useUnlockCashSessionCorrections,
  useReviewCashSession,
  useAdminCashOps,
  useUpdateCashOps,
  useCreateCashDesk,
  useUpdateCashDesk,
} from '@/lib/hooks/use-admin'
import type { CashDesk, CashDeskSpecialty, CashFloatPolicy, SchoolCashOps, SchoolPaymentChannelKey } from '@/types/finance'
import { formatMoney } from '@/lib/finance/currency'
import { useSchoolMoney } from '@/lib/finance/use-school-money'
import { cn } from '@/lib/utils'
import { formatDurationMinutes } from '@/lib/finance/cash-session.utils'
import { useAdminRealtimeStatus } from '@/lib/admin/hooks/admin-realtime-provider'
import { CashLiveTape } from '@/components/finance/cash-live-tape'

type Tab = 'guichets' | 'valeur' | 'journee' | 'suivi' | 'promoteur' | 'ecarts' | 'politique'

const DESK_SPECIALTY_LABEL: Record<string, string> = {
  ENROLLMENT: 'Inscriptions',
  TUITION: 'Scolarité',
  MOBILE_MONEY: 'Mobile money / banque',
  GENERAL: 'Général',
}

const SPECIALTY_CHANNEL_PRESETS: Record<CashDeskSpecialty, SchoolPaymentChannelKey[]> = {
  ENROLLMENT: ['CASH_USD', 'CASH_CDF'],
  TUITION: ['CASH_USD', 'CASH_CDF', 'BANK'],
  MOBILE_MONEY: ['ORANGE_MONEY', 'MPESA', 'AIRTEL_MONEY', 'BANK', 'CARD'],
  GENERAL: [],
}

function DeskEditor({
  desk,
  catalog,
  cashiers,
  saving,
  onSave,
  onToggleActive,
}: {
  desk: CashDesk
  catalog: SchoolCashOps['catalog']
  cashiers: NonNullable<SchoolCashOps['cashiers']>
  saving: boolean
  onSave: (patch: {
    name: string
    specialty: CashDeskSpecialty
    locationHint: string | null
    notes: string | null
    allowedChannels: SchoolPaymentChannelKey[] | null
    assignedUserIds: number[]
  }) => void
  onToggleActive: () => void
}) {
  const [name, setName] = useState(desk.name)
  const [specialty, setSpecialty] = useState<CashDeskSpecialty>(desk.specialty)
  const [locationHint, setLocationHint] = useState(desk.locationHint ?? '')
  const [notes, setNotes] = useState(desk.notes ?? '')
  const inherit = desk.allowedChannels == null || desk.allowedChannels.length === 0
  const [inheritSchool, setInheritSchool] = useState(inherit)
  const [channels, setChannels] = useState<SchoolPaymentChannelKey[]>(desk.allowedChannels ?? [])
  const [assigned, setAssigned] = useState<number[]>(desk.assignedUserIds ?? [])

  useEffect(() => {
    setName(desk.name)
    setSpecialty(desk.specialty)
    setLocationHint(desk.locationHint ?? '')
    setNotes(desk.notes ?? '')
    setInheritSchool(desk.allowedChannels == null || desk.allowedChannels.length === 0)
    setChannels(desk.allowedChannels ?? [])
    setAssigned(desk.assignedUserIds ?? [])
  }, [desk])

  return (
    <li className="space-y-3 px-3 py-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-[180px] flex-1 space-y-2">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-lg border border-zinc-200 px-2.5 py-1.5 text-sm font-medium text-zinc-900"
          />
          <div className="grid gap-2 sm:grid-cols-2">
            <select
              value={specialty}
              onChange={(e) => {
                const next = e.target.value as CashDeskSpecialty
                setSpecialty(next)
                const preset = SPECIALTY_CHANNEL_PRESETS[next] ?? []
                if (preset.length) {
                  setInheritSchool(false)
                  setChannels(preset)
                } else {
                  setInheritSchool(true)
                  setChannels([])
                }
              }}
              className="rounded-lg border border-zinc-200 px-2 py-1.5 text-xs text-zinc-700"
            >
              {Object.entries(DESK_SPECIALTY_LABEL).map(([id, label]) => (
                <option key={id} value={id}>
                  {label}
                </option>
              ))}
            </select>
            <input
              value={locationHint}
              onChange={(e) => setLocationHint(e.target.value)}
              placeholder="Lieu (hall, bâtiment…)"
              className="rounded-lg border border-zinc-200 px-2 py-1.5 text-xs"
            />
          </div>
        </div>
        <button
          type="button"
          onClick={onToggleActive}
          className="rounded-lg border border-zinc-200 px-2.5 py-1 text-[11px] font-medium text-zinc-600 hover:bg-zinc-50"
        >
          {desk.isActive === false ? 'Réactiver' : 'Désactiver'}
        </button>
      </div>

      <label className="flex items-center gap-2 text-xs text-zinc-600">
        <input
          type="checkbox"
          checked={inheritSchool}
          onChange={(e) => setInheritSchool(e.target.checked)}
          className="rounded border-zinc-300"
        />
        Accepter tous les modes autorisés par l’école
      </label>
      {!inheritSchool ? (
        <div className="grid gap-1.5 sm:grid-cols-2">
          {catalog.map((ch) => (
            <label key={ch.key} className="flex items-center gap-2 text-xs text-zinc-700">
              <input
                type="checkbox"
                disabled={!ch.enabled}
                checked={channels.includes(ch.key)}
                onChange={(e) =>
                  setChannels((prev) =>
                    e.target.checked ? [...prev, ch.key] : prev.filter((k) => k !== ch.key),
                  )
                }
                className="rounded border-zinc-300"
              />
              {ch.label}
              {!ch.enabled ? <span className="text-zinc-400">(école)</span> : null}
            </label>
          ))}
        </div>
      ) : null}

      {cashiers.length > 0 ? (
        <div>
          <p className="mb-1 text-[11px] font-medium text-zinc-500">
            Caissiers habilités (vide = tous)
          </p>
          <p className="mb-1.5 text-[10px] leading-snug text-zinc-400">
            Plusieurs caissiers peuvent partager le même bureau (rotation). À un instant T, une
            seule session ouverte par guichet.
          </p>
          <div className="flex flex-wrap gap-2">
            {cashiers.map((c) => (
              <label
                key={c.id}
                className="inline-flex items-center gap-1.5 rounded-full border border-zinc-200 px-2 py-1 text-[11px]"
              >
                <input
                  type="checkbox"
                  checked={assigned.includes(c.id)}
                  onChange={(e) =>
                    setAssigned((prev) =>
                      e.target.checked ? [...prev, c.id] : prev.filter((id) => id !== c.id),
                    )
                  }
                  className="rounded border-zinc-300"
                />
                {c.name}
              </label>
            ))}
          </div>
        </div>
      ) : null}

      <input
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="Consigne interne (optionnel)"
        className="w-full rounded-lg border border-zinc-200 px-2.5 py-1.5 text-xs"
      />

      <button
        type="button"
        disabled={saving || name.trim().length < 2}
        onClick={() =>
          onSave({
            name: name.trim(),
            specialty,
            locationHint: locationHint.trim() || null,
            notes: notes.trim() || null,
            allowedChannels: inheritSchool ? null : channels,
            assignedUserIds: assigned,
          })
        }
        className="rounded-lg bg-zinc-900 px-3 py-1.5 text-[11px] font-medium text-white disabled:opacity-50"
      >
        Enregistrer ce guichet
      </button>
    </li>
  )
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

function Kpi({
  label,
  value,
  hint,
  tone,
}: {
  label: string
  value: string
  hint?: string
  tone?: 'neutral' | 'warn' | 'danger' | 'ok'
}) {
  return (
    <div
      className={cn(
        'rounded-2xl border p-4 shadow-sm',
        tone === 'warn' && 'border-amber-100 bg-amber-50/50',
        tone === 'danger' && 'border-red-100 bg-red-50/50',
        tone === 'ok' && 'border-emerald-100 bg-emerald-50/50',
        (!tone || tone === 'neutral') && 'border-zinc-100 bg-white',
      )}
    >
      <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-400">{label}</p>
      <p className="mt-1 text-lg font-semibold tabular-nums text-zinc-900">{value}</p>
      {hint ? <p className="mt-1 text-[11px] text-zinc-500">{hint}</p> : null}
    </div>
  )
}

export default function AdminCashFloatPolicyPage() {
  const { format: formatLedger } = useSchoolMoney()
  const money = (amount: number, currency?: string) =>
    currency === 'CDF' ? formatMoney(amount, 'CDF') : formatLedger(amount, currency)
  const [tab, setTab] = useState<Tab>('guichets')
  const [digestDate, setDigestDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [copied, setCopied] = useState(false)
  const [copiedWeek, setCopiedWeek] = useState(false)
  const [deskAction, setDeskAction] = useState<{
    type: 'force' | 'unlock' | 'review'
    sessionId: number
    deskCode: string
  } | null>(null)
  const [actionReason, setActionReason] = useState('')
  const { data: policy, isLoading: policyLoading } = useCashFloatPolicy()
  const { mutateAsync: save, isPending } = useUpdateCashFloatPolicy()
  const {
    data: trace,
    isLoading: traceLoading,
    isFetching,
    refetch,
  } = useCashFundTraceability({ varianceDays: 30, varianceOnly: false, limit: 40 })
  const {
    data: digest,
    isLoading: digestLoading,
    refetch: refetchDigest,
  } = useSchoolDayDigest(digestDate)
  const {
    data: liveDesks,
    isLoading: liveDesksLoading,
    refetch: refetchLiveDesks,
  } = useCashDesksLive(digestDate)
  const forceClose = useForceCloseCashSession()
  const unlockCorrections = useUnlockCashSessionCorrections()
  const reviewSession = useReviewCashSession()
  const { data: cashOps, isLoading: cashOpsLoading } = useAdminCashOps()
  const updateCashOps = useUpdateCashOps()
  const createDesk = useCreateCashDesk()
  const updateDesk = useUpdateCashDesk()
  const [newDeskName, setNewDeskName] = useState('')
  const [newDeskSpecialty, setNewDeskSpecialty] = useState<CashDeskSpecialty>('GENERAL')
  const [newDeskLocation, setNewDeskLocation] = useState('')
  const { data: valuePanel, isLoading: valueLoading } = useDemoValuePanel()
  const { data: goLive, isLoading: goLiveLoading } = useGoLiveReadiness()
  const { data: weekDigest, isLoading: weekLoading } = useWeeklyPromoterDigest()
  const sendWeekDigest = useSendWeeklyPromoterDigest()
  const downloadReport = useDownloadAdminCashSessionReport()
  const downloadDigestPdf = useDownloadSchoolDayDigestPdf()
  const acknowledge = useAcknowledgeCashSessionReport()
  const [form, setForm] = useState<CashFloatPolicy | null>(null)

  useEffect(() => {
    if (policy) setForm(policy)
  }, [policy])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form) return
    await save(form)
  }

  async function handleDeskAction() {
    if (!deskAction) return
    if (deskAction.type === 'force') {
      const reason = actionReason.trim()
      if (reason.length < 8) return
      await forceClose.mutateAsync({ sessionId: deskAction.sessionId, reason })
    } else if (deskAction.type === 'unlock') {
      const notes = actionReason.trim()
      if (notes.length < 8) return
      await unlockCorrections.mutateAsync({
        sessionId: deskAction.sessionId,
        notes,
      })
    } else {
      await reviewSession.mutateAsync({
        sessionId: deskAction.sessionId,
        notes: actionReason.trim() || undefined,
      })
    }
    setDeskAction(null)
    setActionReason('')
  }

  const kpis = trace?.kpis
  const { status: liveStatus, lastUpdate, recentCashActivity } = useAdminRealtimeStatus()

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50">
            <Banknote size={18} className="text-emerald-700" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-zinc-900">Caisse &amp; fonds</h1>
            <p className="mt-1 text-sm text-zinc-500">
              Caisse du jour, synthèse et suivi des fonds pour la direction.
              {liveStatus === 'live'
                ? ' Les mouvements du guichet apparaissent ici tout de suite.'
                : ' Connexion temps réel en cours — les totaux se rafraîchissent aussi à l’intervalle.'}
            </p>
            {lastUpdate ? (
              <p className="mt-1 text-[11px] text-zinc-400">
                Dernier mouvement : {lastUpdate.toLocaleTimeString('fr-FR')}
              </p>
            ) : null}
          </div>
        </div>
        <button
          type="button"
          onClick={() => {
            void refetch()
            void refetchDigest()
            void refetchLiveDesks()
          }}
          className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-200 px-3 py-2 text-xs text-zinc-600 hover:bg-zinc-50"
        >
          <RefreshCw size={12} className={isFetching ? 'animate-spin' : ''} /> Actualiser
        </button>
      </div>

      <CashLiveTape
        items={recentCashActivity}
        live={liveStatus === 'live'}
        showSchool
        hrefBase="admin"
        emptyHint="Espèces, mobile money, SMS et clôtures du guichet apparaissent ici en direct."
      />

      <div className="flex gap-1 overflow-x-auto rounded-xl bg-zinc-100 p-1">
        {(
          [
            ['guichets', 'Guichets live'],
            ['valeur', 'Vue d’ensemble'],
            ['journee', 'Synthèse journée'],
            ['suivi', 'Suivi fonds'],
            ['promoteur', 'Visas direction'],
            ['ecarts', 'Écarts'],
            ['politique', 'Politique'],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={cn(
              'shrink-0 rounded-lg px-3 py-2 text-xs font-semibold',
              tab === id ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-500',
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'guichets' && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-zinc-900">
                {liveDesks?.multiCounterEnabled ? 'Mur des guichets' : 'Caisse du jour'}
              </p>
              <p className="text-xs text-zinc-500">
                Ouverts {liveDesks?.openDesks ?? 0}/{liveDesks?.deskCount ?? 0}
                {liveDesks?.varianceAlertCount
                  ? ` · ${liveDesks.varianceAlertCount} écart${liveDesks.varianceAlertCount > 1 ? 's' : ''}`
                  : ''}
              </p>
            </div>
            <label className="text-xs text-zinc-500">
              Date
              <input
                type="date"
                value={digestDate}
                onChange={(e) => setDigestDate(e.target.value)}
                className="ml-2 rounded-lg border border-zinc-200 px-2 py-1 text-xs text-zinc-800"
              />
            </label>
          </div>

          {liveDesks?.varianceAlertCount ? (
            <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-800">
              {liveDesks.varianceAlertCount} écart{liveDesks.varianceAlertCount > 1 ? 's' : ''}{' '}
              théorique / physique — identifier l’origine avant que ça ne dégénère.
            </p>
          ) : null}

          {liveDesks?.schoolTotals ? (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Kpi
                label="Encaissé USD"
                value={money(liveDesks.schoolTotals.consolidatedUsd ?? liveDesks.schoolTotals.collectedUsd ?? 0)}
                hint={
                  liveDesks.schoolTotals.consolidatedCdf
                    ? `${money(liveDesks.schoolTotals.consolidatedCdf, 'CDF')} FC consolidés`
                    : `${liveDesks.schoolTotals.count} paiement${liveDesks.schoolTotals.count > 1 ? 's' : ''}`
                }
                tone="ok"
              />
              <Kpi
                label="Espèces USD"
                value={money(liveDesks.schoolTotals.cashUsd)}
                hint={
                  liveDesks.schoolTotals.cashCdf > 0
                    ? `+ ${money(liveDesks.schoolTotals.cashCdf, 'CDF')} FC`
                    : undefined
                }
              />
              <Kpi label="Mobile money" value={money(liveDesks.schoolTotals.mobileMoney)} />
              <Kpi
                label="Banque / carte"
                value={money(liveDesks.schoolTotals.bank + liveDesks.schoolTotals.card)}
              />
            </div>
          ) : null}

          {(liveDesks?.recentPayments?.length ?? 0) > 0 ? (
            <div className="rounded-2xl border border-zinc-100 bg-white p-4 shadow-sm">
              <p className="text-sm font-semibold text-zinc-900">Derniers paiements (école)</p>
              <p className="mb-3 text-[11px] text-zinc-500">
                Tous les guichets · y compris mobile / hors caisse
              </p>
              <ul className="divide-y divide-zinc-50">
                {liveDesks!.recentPayments!.slice(0, 12).map((p) => (
                  <li key={p.id} className="flex items-start justify-between gap-3 py-2 text-xs">
                    <div className="min-w-0">
                      <p className="truncate font-medium text-zinc-800">
                        {p.studentName ?? `Élève #${p.studentId ?? p.id}`}
                      </p>
                      <p className="text-[11px] text-zinc-500">
                        {p.cashDesk?.name ?? 'Hors guichet'}
                        {p.cashierName ? ` · ${p.cashierName}` : ''}
                        {p.reference ? ` · ${p.reference}` : ''}
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="font-semibold tabular-nums text-zinc-900">{money(p.amount)}</p>
                      <p className="text-[10px] text-zinc-400">{p.method}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {liveDesksLoading ? (
            <div className="flex items-center justify-center gap-2 py-16 text-sm text-zinc-500">
              <Loader2 size={16} className="animate-spin" /> Chargement des guichets…
            </div>
          ) : (
            <div className="grid gap-3 lg:grid-cols-3">
              {(liveDesks?.desks ?? []).map((row) => {
                const open = row.session?.status === 'OPEN'
                const variance = row.session?.variance
                const varianceTone =
                  variance == null
                    ? undefined
                    : Math.abs(variance) < 0.02
                      ? 'ok'
                      : Math.abs(variance) < 5
                        ? 'warn'
                        : 'danger'
                return (
                  <div
                    key={row.desk.id}
                    className={cn(
                      'rounded-2xl border bg-white p-4 shadow-sm space-y-3',
                      open ? 'border-emerald-200' : 'border-zinc-100',
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-lg font-semibold text-zinc-900">{row.desk.name}</p>
                        <p className="text-xs text-zinc-500">
                          {row.desk.locationHint || row.desk.code}
                        </p>
                        <p className="mt-0.5 text-[10px] font-medium uppercase tracking-wide text-zinc-400">
                          {DESK_SPECIALTY_LABEL[row.desk.specialty] ?? row.desk.specialty}
                        </p>
                      </div>
                      <span
                        className={cn(
                          'rounded-full px-2 py-0.5 text-[10px] font-semibold',
                          open
                            ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100'
                            : 'bg-zinc-100 text-zinc-500',
                        )}
                      >
                        {open ? 'OUVERT' : 'FERMÉ'}
                      </span>
                    </div>

                    {row.session ? (
                      <>
                        <p className="text-xs text-zinc-600">
                          Caissier :{' '}
                          <span className="font-medium text-zinc-900">
                            {row.session.cashierName ?? `#${row.session.cashierId}`}
                          </span>
                          {row.session.forceClosed ? ' · clôture admin' : ''}
                        </p>
                        {row.session.reconciliation?.alert &&
                        row.session.reconciliation.alert !== 'NONE' ? (
                          <p
                            className={cn(
                              'rounded-lg px-2.5 py-1.5 text-[11px] font-semibold',
                              row.session.reconciliation.alert === 'DANGER'
                                ? 'bg-red-50 text-red-800 ring-1 ring-red-200'
                                : 'bg-amber-50 text-amber-900 ring-1 ring-amber-200',
                            )}
                          >
                            {row.session.reconciliation.alertLabel}
                          </p>
                        ) : null}
                        <div className="grid grid-cols-2 gap-2">
                          <Kpi
                            label="Espèces USD"
                            value={money(row.methods.cashUsd)}
                            hint={
                              row.methods.cashCdf > 0
                                ? `${money(row.methods.cashCdf, 'CDF')} FC`
                                : `${row.methods.count} tx`
                            }
                          />
                          <Kpi
                            label="Attendu tiroir"
                            value={money(row.session.expectedCash)}
                            hint={`Fond ${money(row.session.openingFloat)}`}
                            tone={open ? 'ok' : varianceTone}
                          />
                        </div>
                        <p className="text-[11px] leading-snug text-zinc-500">
                          Fond {money(row.session.reconciliation?.openingFloatUsd ?? row.session.openingFloat)}
                          {' + encaissé '}
                          {money(row.session.reconciliation?.cashCollectedUsd ?? row.session.cashCollected)}
                          {' − sorties '}
                          {money(
                            (row.session.reconciliation?.pettyCashUsd ?? 0) -
                              Math.min(0, row.session.reconciliation?.ledgerNetUsd ?? 0),
                          )}
                          {' = '}
                          <span className="font-medium text-zinc-800">
                            {money(row.session.expectedCash)}
                          </span>
                        </p>
                        <p className="text-[11px] text-zinc-500">
                          MM {money(row.methods.mobileMoney)} · Banque {money(row.methods.bank)} ·
                          Carte {money(row.methods.card)}
                          {variance != null
                            ? ` · Écart ${variance >= 0 ? '+' : ''}${money(variance)}`
                            : ''}
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {open ? (
                            <button
                              type="button"
                              onClick={() => {
                                setActionReason('')
                                setDeskAction({
                                  type: 'force',
                                  sessionId: row.session!.id,
                                  deskCode: row.desk.code,
                                })
                              }}
                              className="rounded-lg border border-red-200 bg-red-50 px-2.5 py-1 text-[11px] font-medium text-red-700 hover:bg-red-100"
                            >
                              Forcer clôture
                            </button>
                          ) : (
                            <>
                              <button
                                type="button"
                                onClick={() => {
                                  setActionReason('')
                                  setDeskAction({
                                    type: 'unlock',
                                    sessionId: row.session!.id,
                                    deskCode: row.desk.code,
                                  })
                                }}
                                className="rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-1 text-[11px] font-medium text-amber-800 hover:bg-amber-100"
                              >
                                Déverrouiller
                              </button>
                              {!row.session.adminReviewedAt ? (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setActionReason('')
                                    setDeskAction({
                                      type: 'review',
                                      sessionId: row.session!.id,
                                      deskCode: row.desk.code,
                                    })
                                  }}
                                  className="rounded-lg border border-zinc-200 bg-white px-2.5 py-1 text-[11px] font-medium text-zinc-700 hover:bg-zinc-50"
                                >
                                  Viser
                                </button>
                              ) : (
                                <span className="rounded-lg bg-emerald-50 px-2.5 py-1 text-[11px] font-medium text-emerald-700">
                                  Visé
                                </span>
                              )}
                            </>
                          )}
                        </div>
                      </>
                    ) : (
                      <p className="text-xs text-zinc-400">Aucune session ce jour.</p>
                    )}
                  </div>
                )
              })}
            </div>
          )}

          {deskAction ? (
            <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4 space-y-3">
              <p className="text-sm font-semibold text-zinc-900">
                {deskAction.type === 'force'
                  ? `Forcer la clôture de ${deskAction.deskCode}`
                  : deskAction.type === 'unlock'
                    ? `Déverrouiller les corrections de ${deskAction.deskCode}`
                    : `Viser la session ${deskAction.deskCode}`}
              </p>
              <textarea
                value={actionReason}
                onChange={(e) => setActionReason(e.target.value)}
                rows={2}
                placeholder={
                  deskAction.type === 'force' || deskAction.type === 'unlock'
                    ? 'Motif obligatoire (min. 8 caractères)'
                    : 'Note optionnelle'
                }
                className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => void handleDeskAction()}
                  disabled={
                    forceClose.isPending ||
                    unlockCorrections.isPending ||
                    reviewSession.isPending ||
                    (deskAction.type === 'force' || deskAction.type === 'unlock') &&
                    actionReason.trim().length < 8
                  }
                  className="rounded-lg bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50"
                >
                  Confirmer
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setDeskAction(null)
                    setActionReason('')
                  }}
                  className="rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-600"
                >
                  Annuler
                </button>
              </div>
            </div>
          ) : null}
        </div>
      )}

      {tab === 'valeur' && (
        <div className="space-y-5">
          {valueLoading || goLiveLoading || weekLoading ? (
            <div className="flex items-center justify-center gap-2 py-16 text-sm text-zinc-500">
              <Loader2 size={16} className="animate-spin" /> Chargement…
            </div>
          ) : (
            <>
              {valuePanel ? (
                <div className="space-y-3">
                  <div className="rounded-2xl border border-emerald-100 bg-emerald-50/70 px-4 py-3">
                    <p className="text-sm font-semibold text-emerald-950">{valuePanel.headline}</p>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {valuePanel.cards.map((c) => (
                      <div
                        key={c.key}
                        className={cn(
                          'rounded-2xl border p-4 shadow-sm',
                          c.tone === 'ok' && 'border-emerald-100 bg-emerald-50/40',
                          c.tone === 'warn' && 'border-amber-100 bg-amber-50/40',
                          c.tone === 'danger' && 'border-red-100 bg-red-50/40',
                          c.tone === 'neutral' && 'border-zinc-100 bg-white',
                        )}
                      >
                        <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-400">
                          {c.label}
                        </p>
                        <p className="mt-1 text-lg font-semibold tabular-nums text-zinc-900">
                          {c.value}
                        </p>
                        {c.hint ? <p className="mt-1 text-[11px] text-zinc-500">{c.hint}</p> : null}
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}

              {goLive ? (
                <div className="rounded-2xl border border-zinc-100 bg-white p-4 shadow-sm space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold text-zinc-900">Checklist de mise en service</p>
                      <p className="text-xs text-zinc-500">
                        {goLive.ready
                          ? 'La caisse et les paiements sont prêts.'
                          : 'Complétez les points restants pour activer la caisse.'}
                      </p>
                    </div>
                    <div
                      className={cn(
                        'rounded-full px-3 py-1 text-xs font-semibold',
                        goLive.ready
                          ? 'bg-emerald-50 text-emerald-700'
                          : 'bg-amber-50 text-amber-800',
                      )}
                    >
                      {goLive.score}% · {goLive.completedCount}/{goLive.totalCount}
                    </div>
                  </div>
                  {goLive.nextAction ? (
                    <p className="rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-900">
                      Prochaine action : {goLive.nextAction}
                    </p>
                  ) : null}
                  <ul className="divide-y divide-zinc-50">
                    {goLive.checks.map((c) => (
                      <li
                        key={c.key}
                        className="flex items-start justify-between gap-3 py-2.5 text-xs"
                      >
                        <div>
                          <p className="font-medium text-zinc-800">{c.label}</p>
                          <p className="text-zinc-500">{c.detail}</p>
                        </div>
                        <span
                          className={cn(
                            'shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold',
                            c.status === 'DONE' && 'bg-emerald-50 text-emerald-700',
                            c.status === 'PENDING' && 'bg-amber-50 text-amber-800',
                            c.status === 'BLOCKED' && 'bg-red-50 text-red-700',
                          )}
                        >
                          {c.status === 'DONE' ? 'OK' : c.status === 'BLOCKED' ? 'Bloqué' : 'À faire'}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              {weekDigest ? (
                <div className="rounded-2xl border border-zinc-100 bg-white p-4 shadow-sm space-y-3">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold text-zinc-900">
                        Bilan hebdo — {weekDigest.label}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={async () => {
                          await navigator.clipboard.writeText(weekDigest.whatsappText)
                          setCopiedWeek(true)
                          setTimeout(() => setCopiedWeek(false), 2000)
                        }}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-200 px-3 py-2 text-xs font-medium text-zinc-700 hover:bg-zinc-50"
                      >
                        <MessageSquare size={12} />
                        {copiedWeek ? 'Copié !' : 'Copier le bilan'}
                      </button>
                      <button
                        type="button"
                        disabled={sendWeekDigest.isPending}
                        onClick={() => sendWeekDigest.mutate()}
                        className="inline-flex items-center gap-1.5 rounded-xl bg-zinc-900 px-3 py-2 text-xs font-medium text-white hover:bg-zinc-800 disabled:opacity-60"
                      >
                        {sendWeekDigest.isPending ? (
                          <Loader2 size={12} className="animate-spin" />
                        ) : (
                          <Send size={12} />
                        )}
                        Notifier la direction
                      </button>
                    </div>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-3">
                    <Kpi
                      label="Recettes semaine"
                      value={money(weekDigest.totals.collected)}
                      hint={`${weekDigest.totals.paymentCount} paiements`}
                      tone="ok"
                    />
                    <Kpi
                      label="Clôtures / écarts"
                      value={String(weekDigest.totals.closedSessions)}
                      hint={`${weekDigest.totals.shortCount} manq. · ${weekDigest.totals.overCount} exc.`}
                      tone={weekDigest.totals.shortCount > 0 ? 'warn' : 'ok'}
                    />
                    <Kpi
                      label="À viser"
                      value={String(weekDigest.totals.pendingPromoterReviews)}
                      hint="Rapports de clôture en attente"
                    />
                  </div>
                  <pre className="whitespace-pre-wrap rounded-xl bg-zinc-50 p-3 text-xs text-zinc-700">
                    {weekDigest.whatsappText}
                  </pre>
                </div>
              ) : null}
            </>
          )}
        </div>
      )}

      {tab === 'journee' && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-end gap-3">
            <div>
              <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-zinc-400">
                Date
              </label>
              <input
                type="date"
                value={digestDate}
                onChange={(e) => setDigestDate(e.target.value)}
                className="rounded-xl border border-zinc-200 px-3 py-2 text-sm"
              />
            </div>
            <button
              type="button"
              onClick={() => void refetchDigest()}
              className="rounded-xl border border-zinc-200 px-3 py-2 text-xs text-zinc-600 hover:bg-zinc-50"
            >
              Actualiser
            </button>
            <button
              type="button"
              disabled={downloadDigestPdf.isPending}
              onClick={async () => {
                const blob = await downloadDigestPdf.mutateAsync(digestDate)
                downloadBlob(blob, `synthese-journee-${digestDate}.pdf`)
              }}
              className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-2 text-xs font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
            >
              <FileText size={12} /> PDF journée
            </button>
            <button
              type="button"
              disabled={!digest?.whatsappText}
              onClick={async () => {
                if (!digest?.whatsappText) return
                await navigator.clipboard.writeText(digest.whatsappText)
                setCopied(true)
                setTimeout(() => setCopied(false), 2000)
              }}
              className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-200 px-3 py-2 text-xs font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-50"
            >
              <MessageSquare size={12} /> {copied ? 'Copié !' : 'Copier le message'}
            </button>
          </div>

          {digestLoading ? (
            <div className="flex items-center justify-center gap-2 py-16 text-sm text-zinc-500">
              <Loader2 size={16} className="animate-spin" /> Chargement…
            </div>
          ) : digest ? (
            <>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <Kpi
                  label="Recettes du jour"
                  value={money(digest.totals.collected)}
                  hint={`${digest.totals.paymentCount} paiements`}
                  tone="ok"
                />
                <Kpi
                  label="Espèces"
                  value={money(digest.totals.cash)}
                  hint={`Digital ${money(digest.totals.digital)} · Banque ${money(digest.totals.bank)}`}
                />
                <Kpi
                  label="Versements"
                  value={money(digest.totals.versements)}
                  hint={`${digest.totals.sessionCount} guichet(s)`}
                />
                <Kpi
                  label="Écarts / à viser"
                  value={`${digest.totals.shortCount} manq.`}
                  hint={`${digest.totals.overCount} exc. · ${digest.totals.pendingPromoterReviews} rapport(s) à viser`}
                  tone={
                    digest.totals.shortCount > 0 || digest.totals.pendingPromoterReviews > 0
                      ? 'warn'
                      : 'ok'
                  }
                />
              </div>

              <div className="overflow-x-auto rounded-2xl border border-zinc-100 bg-white shadow-sm">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-zinc-100 text-[10px] uppercase tracking-wide text-zinc-400">
                      <th className="px-4 py-3 font-medium">Session</th>
                      <th className="px-4 py-3 font-medium">Caissier</th>
                      <th className="px-4 py-3 font-medium">Statut</th>
                      <th className="px-4 py-3 font-medium">Encaissé</th>
                      <th className="px-4 py-3 font-medium">Écart</th>
                      <th className="px-4 py-3 font-medium">Visa</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-50">
                    {digest.sessions.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-4 py-10 text-center text-zinc-400">
                          Aucune session ce jour
                        </td>
                      </tr>
                    ) : (
                      digest.sessions.map((s) => (
                        <tr key={s.id} className="text-zinc-700">
                          <td className="px-4 py-3 font-medium">#{s.id}</td>
                          <td className="px-4 py-3">{s.cashierName}</td>
                          <td className="px-4 py-3">{s.status}</td>
                          <td className="px-4 py-3 tabular-nums">{money(s.collected)}</td>
                          <td className="px-4 py-3 tabular-nums">
                            {s.variance == null
                              ? '—'
                              : `${s.variance >= 0 ? '+' : ''}${money(s.variance)}`}
                          </td>
                          <td className="px-4 py-3">
                            {s.acknowledged ? 'Visé' : s.submitted ? 'Soumis' : '—'}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              <div className="rounded-2xl border border-zinc-100 bg-white p-4 shadow-sm">
                <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-zinc-400">
                  Message pour la direction
                </p>
                <pre className="whitespace-pre-wrap text-xs leading-relaxed text-zinc-700">
                  {digest.whatsappText}
                </pre>
              </div>
            </>
          ) : null}
        </div>
      )}

      {tab === 'suivi' && (
        <div className="space-y-4">
          {traceLoading ? (
            <div className="flex items-center justify-center gap-2 py-16 text-sm text-zinc-500">
              <Loader2 size={16} className="animate-spin" /> Chargement…
            </div>
          ) : (
            <>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <Kpi
                  label="Caisses ouvertes"
                  value={String(kpis?.openTillCount ?? 0)}
                  hint="Guichets actifs maintenant"
                  tone={(kpis?.openTillCount ?? 0) > 0 ? 'ok' : 'neutral'}
                />
                <Kpi
                  label="Fonds d’ouverture"
                  value={money(kpis?.floatOutstandingUsd ?? 0)}
                  hint={
                    (kpis?.floatOutstandingCdf ?? 0) > 0
                      ? `+ ${money(kpis!.floatOutstandingCdf, 'CDF')} FC`
                      : 'USD en circulation'
                  }
                />
                <Kpi
                  label="Cash attendu en tiroirs"
                  value={money(kpis?.cashInTillsUsd ?? 0)}
                  hint="Fond + encaissements ± mouvements"
                />
                <Kpi
                  label="Versements enregistrés"
                  value={String(kpis?.versementCountOpenSessions ?? 0)}
                  hint="Sur sessions encore ouvertes"
                />
                <Kpi
                  label="À viser (direction)"
                  value={String(kpis?.pendingPromoterReviews ?? 0)}
                  hint="Rapports Z soumis en attente"
                  tone={(kpis?.pendingPromoterReviews ?? 0) > 0 ? 'warn' : 'ok'}
                />
              </div>

              <div className="overflow-x-auto rounded-2xl border border-zinc-100 bg-white shadow-sm">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-zinc-100 text-[10px] uppercase tracking-wide text-zinc-400">
                      <th className="px-4 py-3 font-medium">Caissier</th>
                      <th className="px-4 py-3 font-medium">Ouverture</th>
                      <th className="px-4 py-3 font-medium">Fond</th>
                      <th className="px-4 py-3 font-medium">Espèces</th>
                      <th className="px-4 py-3 font-medium">Attendu</th>
                      <th className="px-4 py-3 font-medium">Mouvements</th>
                      <th className="px-4 py-3 font-medium">Durée</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-50">
                    {(trace?.openSessions ?? []).length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-4 py-10 text-center text-zinc-400">
                          Aucune caisse ouverte
                        </td>
                      </tr>
                    ) : (
                      trace!.openSessions.map((s) => (
                        <tr key={s.id} className="text-zinc-700">
                          <td className="px-4 py-3">
                            <p className="font-medium">{s.cashierName ?? '—'}</p>
                            <p className="text-[10px] text-zinc-400">#{s.id}</p>
                          </td>
                          <td className="px-4 py-3">
                            <span className="inline-flex items-center gap-1">
                              <Clock size={10} className="text-zinc-300" />
                              {new Date(s.openedAt).toLocaleString('fr-FR', {
                                day: '2-digit',
                                month: 'short',
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                          </td>
                          <td className="px-4 py-3 tabular-nums">
                            {money(Number(s.openingFloat ?? 0))}
                            {s.openingFloatCdf ? (
                              <span className="block text-[10px] text-zinc-400">
                                + {money(s.openingFloatCdf, 'CDF')}
                              </span>
                            ) : null}
                          </td>
                          <td className="px-4 py-3 tabular-nums">
                            {money(Number(s.cashCollected ?? 0))}
                          </td>
                          <td className="px-4 py-3 font-semibold tabular-nums text-emerald-700">
                            {money(Number(s.expectedCash ?? 0))}
                          </td>
                          <td className="px-4 py-3 text-[10px] text-zinc-500">
                            V {money(s.ledgerTotals?.versements ?? 0)} · R{' '}
                            {money(s.ledgerTotals?.renflouements ?? 0)}
                            {(s.ledgerTotals?.retraits ?? 0) > 0 ? (
                              <> · T {money(s.ledgerTotals!.retraits)}</>
                            ) : null}
                          </td>
                          <td className="px-4 py-3">
                            {formatDurationMinutes(s.durationMinutes)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      )}

      {tab === 'promoteur' && (
        <div className="space-y-4">
          {(trace?.promoterInbox ?? []).length === 0 ? (
            <div className="rounded-2xl border border-zinc-100 bg-white px-4 py-12 text-center text-sm text-zinc-400 shadow-sm">
              Aucun rapport en attente de visa
            </div>
          ) : (
            <div className="space-y-3">
              {trace!.promoterInbox!.map((s) => {
                const snap = s.promoterSubmission?.snapshot
                return (
                  <div
                    key={s.id}
                    className="rounded-2xl border border-zinc-100 bg-white p-4 shadow-sm"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-zinc-900">
                          Session #{s.id} · {s.cashierName ?? 'Caissier'}
                        </p>
                        <p className="mt-0.5 text-xs text-zinc-500">
                          Soumis le{' '}
                          {s.promoterSubmission?.submittedAt
                            ? new Date(s.promoterSubmission.submittedAt).toLocaleString('fr-FR')
                            : '—'}{' '}
                          par {s.promoterSubmission?.submittedByName ?? '—'}
                        </p>
                        <p className="mt-2 text-sm font-medium text-zinc-800">
                          {snap?.verdictTitle ?? 'Rapport soumis'}
                        </p>
                        <p className="mt-1 text-xs text-zinc-500">
                          Recettes {money(snap?.totalSession ?? 0)} ·{' '}
                          {snap?.paymentCount ?? 0} paiements · écart{' '}
                          {snap?.variance == null
                            ? '—'
                            : `${snap.variance >= 0 ? '+' : ''}${money(snap.variance)}`}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          disabled={downloadReport.isPending}
                          onClick={async () => {
                            const blob = await downloadReport.mutateAsync(s.id)
                            downloadBlob(blob, `rapport-caisse-${s.id}.pdf`)
                          }}
                          className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-200 px-3 py-2 text-xs font-medium text-zinc-700 hover:bg-zinc-50"
                        >
                          <FileText size={12} /> PDF
                        </button>
                        <button
                          type="button"
                          disabled={acknowledge.isPending}
                          onClick={() => void acknowledge.mutateAsync(s.id)}
                          className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-2 text-xs font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
                        >
                          <CheckCircle2 size={12} /> Viser
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
          <p className="flex items-center gap-1.5 text-[11px] text-zinc-400">
            <Send size={11} /> Les caissières soumettent depuis le guichet après clôture.
          </p>
        </div>
      )}

      {tab === 'ecarts' && (
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <Kpi
              label="Manquants (30 j)"
              value={String(kpis?.shortCount ?? 0)}
              tone={(kpis?.shortCount ?? 0) > 0 ? 'danger' : 'ok'}
            />
            <Kpi
              label="Excédents (30 j)"
              value={String(kpis?.overCount ?? 0)}
              tone={(kpis?.overCount ?? 0) > 0 ? 'warn' : 'ok'}
            />
            <Kpi
              label="|Écarts| cumulés"
              value={money(kpis?.absVarianceSum ?? 0)}
              hint="Somme absolue des écarts de clôture"
            />
          </div>
          <div className="overflow-x-auto rounded-2xl border border-zinc-100 bg-white shadow-sm">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-zinc-100 text-[10px] uppercase tracking-wide text-zinc-400">
                  <th className="px-4 py-3 font-medium">Session</th>
                  <th className="px-4 py-3 font-medium">Caissier</th>
                  <th className="px-4 py-3 font-medium">Clôture</th>
                  <th className="px-4 py-3 font-medium">Attendu</th>
                  <th className="px-4 py-3 font-medium">Compté</th>
                  <th className="px-4 py-3 font-medium">Écart</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-50">
                {(trace?.varianceLedger ?? []).length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-10 text-center text-zinc-400">
                      Aucune clôture récente
                    </td>
                  </tr>
                ) : (
                  trace!.varianceLedger.map((row) => {
                    const v = Number(row.variance ?? 0)
                    return (
                      <tr key={row.id} className="text-zinc-700">
                        <td className="px-4 py-3 font-medium tabular-nums">#{row.id}</td>
                        <td className="px-4 py-3">{row.cashierName ?? '—'}</td>
                        <td className="px-4 py-3">
                          {row.closedAt
                            ? new Date(row.closedAt).toLocaleString('fr-FR', {
                                day: '2-digit',
                                month: 'short',
                                hour: '2-digit',
                                minute: '2-digit',
                              })
                            : '—'}
                        </td>
                        <td className="px-4 py-3 tabular-nums">
                          {money(Number(row.expectedCash ?? 0))}
                        </td>
                        <td className="px-4 py-3 tabular-nums">
                          {money(Number(row.closingCounted ?? 0))}
                        </td>
                        <td
                          className={cn(
                            'px-4 py-3 font-semibold tabular-nums',
                            Math.abs(v) < 0.02
                              ? 'text-emerald-700'
                              : v > 0
                                ? 'text-sky-700'
                                : 'text-amber-700',
                          )}
                        >
                          <span className="inline-flex items-center gap-1">
                            {Math.abs(v) < 0.02 ? null : v > 0 ? (
                              <TrendingUp size={12} />
                            ) : (
                              <TrendingDown size={12} />
                            )}
                            {v >= 0 ? '+' : ''}
                            {money(v)}
                            {row.varianceStatus === 'SHORT' ? (
                              <AlertTriangle size={11} className="text-amber-500" />
                            ) : null}
                          </span>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'politique' && (
        <div className="space-y-5">
          <div className="space-y-4 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
            <div>
              <p className="text-sm font-semibold text-zinc-800">Guichets et modes de paiement</p>
              <p className="mt-1 text-xs text-zinc-500">
                Chaque école active le multi-guichets et choisit les canaux qu’elle accepte.
              </p>
            </div>
            {cashOpsLoading || !cashOps ? (
              <div className="flex items-center gap-2 py-6 text-sm text-zinc-500">
                <Loader2 size={16} className="animate-spin" /> Chargement…
              </div>
            ) : (
              <>
                <label className="flex items-start gap-3 rounded-xl border border-zinc-100 bg-zinc-50 px-3 py-3 text-sm text-zinc-800">
                  <input
                    type="checkbox"
                    checked={cashOps.multiCounterEnabled}
                    onChange={(e) =>
                      void updateCashOps.mutateAsync({ multiCounterEnabled: e.target.checked })
                    }
                    className="mt-0.5 rounded border-zinc-300"
                  />
                  <span>
                    <span className="font-medium">Mode multi-guichets</span>
                    <span className="mt-0.5 block text-xs text-zinc-500">
                      Désactivé : une caisse unique liée au caissier. Activé : l’école crée et nomme
                      ses propres guichets.
                    </span>
                  </span>
                </label>

                <div>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-400">
                    Modes acceptés
                  </p>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {(cashOps.catalog ?? []).map((ch) => (
                      <label
                        key={ch.key}
                        className="flex items-center gap-2 rounded-lg border border-zinc-100 px-3 py-2 text-sm text-zinc-700"
                      >
                        <input
                          type="checkbox"
                          checked={cashOps.channels[ch.key]}
                          onChange={(e) =>
                            void updateCashOps.mutateAsync({
                              channels: { [ch.key]: e.target.checked },
                            })
                          }
                          className="rounded border-zinc-300"
                        />
                        {ch.label}
                      </label>
                    ))}
                  </div>
                </div>

                {cashOps.multiCounterEnabled ? (
                  <div className="space-y-3 border-t border-zinc-100 pt-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
                      Guichets de l’école
                    </p>
                    {(cashOps.desks ?? []).length === 0 ? (
                      <p className="text-xs text-amber-800">
                        Créez au moins un guichet (ex. « Guichet Inscription », « Guichet Secondaire »).
                      </p>
                    ) : (
                      <ul className="divide-y divide-zinc-50 rounded-xl border border-zinc-100">
                        {(cashOps.desks ?? []).map((desk) => (
                          <DeskEditor
                            key={desk.id}
                            desk={desk}
                            catalog={cashOps.catalog ?? []}
                            cashiers={cashOps.cashiers ?? []}
                            saving={updateDesk.isPending}
                            onSave={(patch) => void updateDesk.mutateAsync({ id: desk.id, ...patch })}
                            onToggleActive={() =>
                              void updateDesk.mutateAsync({
                                id: desk.id,
                                isActive: desk.isActive === false,
                              })
                            }
                          />
                        ))}
                      </ul>
                    )}
                    <form
                      className="grid gap-2 sm:grid-cols-3"
                      onSubmit={(e) => {
                        e.preventDefault()
                        const name = newDeskName.trim()
                        if (name.length < 2) return
                        void createDesk
                          .mutateAsync({
                            name,
                            specialty: newDeskSpecialty,
                            locationHint: newDeskLocation.trim() || undefined,
                          })
                          .then(() => {
                            setNewDeskName('')
                            setNewDeskLocation('')
                          })
                      }}
                    >
                      <input
                        value={newDeskName}
                        onChange={(e) => setNewDeskName(e.target.value)}
                        placeholder="Nom du guichet"
                        className="rounded-lg border border-zinc-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
                      />
                      <select
                        value={newDeskSpecialty}
                        onChange={(e) => setNewDeskSpecialty(e.target.value as CashDeskSpecialty)}
                        className="rounded-lg border border-zinc-200 px-3 py-2 text-sm"
                      >
                        {Object.entries(DESK_SPECIALTY_LABEL).map(([id, label]) => (
                          <option key={id} value={id}>
                            {label}
                          </option>
                        ))}
                      </select>
                      <div className="flex gap-2">
                        <input
                          value={newDeskLocation}
                          onChange={(e) => setNewDeskLocation(e.target.value)}
                          placeholder="Lieu"
                          className="min-w-0 flex-1 rounded-lg border border-zinc-200 px-3 py-2 text-sm"
                        />
                        <button
                          type="submit"
                          disabled={createDesk.isPending || newDeskName.trim().length < 2}
                          className="rounded-lg bg-zinc-900 px-3 py-2 text-xs font-medium text-white disabled:opacity-50"
                        >
                          Ajouter
                        </button>
                      </div>
                    </form>
                  </div>
                ) : null}
              </>
            )}
          </div>

          {policyLoading || !form ? (
            <div className="flex items-center justify-center gap-2 py-16 text-sm text-zinc-500">
              <Loader2 size={16} className="animate-spin" /> Chargement politique…
            </div>
          ) : (
            <form
              onSubmit={handleSubmit}
              className="space-y-5 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm"
            >
              <div className="flex items-center gap-2 text-sm font-semibold text-zinc-800">
                <Wallet size={15} className="text-zinc-400" /> Politique fond d’ouverture
              </div>
              <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
                Tiroir USD
              </p>
              <div className="grid gap-4 sm:grid-cols-3">
                {(
                  [
                    ['defaultOpeningFloat', 'Défaut'],
                    ['minOpeningFloat', 'Minimum'],
                    ['maxOpeningFloat', 'Maximum'],
                  ] as const
                ).map(([key, label]) => (
                  <label key={key} className="block">
                    <span className="mb-1 block text-xs font-medium text-zinc-500">
                      {label} ($)
                    </span>
                    <input
                      type="number"
                      min={0}
                      step="0.01"
                      value={form[key]}
                      onChange={(e) =>
                        setForm((p) => (p ? { ...p, [key]: Number(e.target.value) || 0 } : p))
                      }
                      className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm tabular-nums focus:outline-none focus:ring-2 focus:ring-emerald-400"
                    />
                  </label>
                ))}
              </div>

              <label className="flex items-center gap-2 text-sm text-zinc-700">
                <input
                  type="checkbox"
                  checked={form.enableDualCurrencyFloat}
                  onChange={(e) =>
                    setForm((p) =>
                      p ? { ...p, enableDualCurrencyFloat: e.target.checked } : p,
                    )
                  }
                  className="rounded border-zinc-300"
                />
                Deux devises (USD et FC)
              </label>

              {form.enableDualCurrencyFloat ? (
                <div className="grid gap-4 sm:grid-cols-3">
                  {(
                    [
                      ['defaultOpeningFloatCdf', 'Défaut FC'],
                      ['minOpeningFloatCdf', 'Min FC'],
                      ['maxOpeningFloatCdf', 'Max FC'],
                    ] as const
                  ).map(([key, label]) => (
                    <label key={key} className="block">
                      <span className="mb-1 block text-xs font-medium text-zinc-500">
                        {label}
                      </span>
                      <input
                        type="number"
                        min={0}
                        step="1"
                        value={form[key]}
                        onChange={(e) =>
                          setForm((p) =>
                            p ? { ...p, [key]: Number(e.target.value) || 0 } : p,
                          )
                        }
                        className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm tabular-nums focus:outline-none focus:ring-2 focus:ring-emerald-400"
                      />
                    </label>
                  ))}
                </div>
              ) : null}

              <div className="space-y-2 rounded-xl bg-zinc-50 px-4 py-3">
                {(
                  [
                    ['requireDenominationOnOpen', 'Billetage obligatoire à l’ouverture'],
                    ['suggestFromLastClose', 'Suggestion dernière clôture'],
                    ['suggestBalancedAverage', 'Suggestion moyenne sessions justes'],
                  ] as const
                ).map(([key, label]) => (
                  <label key={key} className="flex items-center gap-2 text-sm text-zinc-700">
                    <input
                      type="checkbox"
                      checked={form[key]}
                      onChange={(e) =>
                        setForm((p) => (p ? { ...p, [key]: e.target.checked } : p))
                      }
                      className="rounded border-zinc-300"
                    />
                    {label}
                  </label>
                ))}
              </div>

              <button
                type="submit"
                disabled={isPending}
                className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
              >
                {isPending ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <Save size={14} />
                )}
                Enregistrer
              </button>
            </form>
          )}
        </div>
      )}
    </div>
  )
}
