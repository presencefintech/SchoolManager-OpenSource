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
} from '@/lib/hooks/use-admin'
import type { CashFloatPolicy } from '@/types/finance'
import { formatMoney } from '@/lib/finance/currency'
import { cn } from '@/lib/utils'
import { formatDurationMinutes } from '@/lib/finance/cash-session.utils'

type Tab = 'valeur' | 'journee' | 'suivi' | 'promoteur' | 'ecarts' | 'politique'

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
  const [tab, setTab] = useState<Tab>('valeur')
  const [digestDate, setDigestDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [copied, setCopied] = useState(false)
  const [copiedWeek, setCopiedWeek] = useState(false)
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

  const kpis = trace?.kpis

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
              Synthèse journalière, suivi des fonds et rapports pour la direction.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => {
            void refetch()
            void refetchDigest()
          }}
          className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-200 px-3 py-2 text-xs text-zinc-600 hover:bg-zinc-50"
        >
          <RefreshCw size={12} className={isFetching ? 'animate-spin' : ''} /> Actualiser
        </button>
      </div>

      <div className="flex gap-1 overflow-x-auto rounded-xl bg-zinc-100 p-1">
        {(
          [
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
                      value={formatMoney(weekDigest.totals.collected)}
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
                  value={formatMoney(digest.totals.collected)}
                  hint={`${digest.totals.paymentCount} paiements`}
                  tone="ok"
                />
                <Kpi
                  label="Espèces"
                  value={formatMoney(digest.totals.cash)}
                  hint={`Digital ${formatMoney(digest.totals.digital)} · Banque ${formatMoney(digest.totals.bank)}`}
                />
                <Kpi
                  label="Versements"
                  value={formatMoney(digest.totals.versements)}
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
                          <td className="px-4 py-3 tabular-nums">{formatMoney(s.collected)}</td>
                          <td className="px-4 py-3 tabular-nums">
                            {s.variance == null
                              ? '—'
                              : `${s.variance >= 0 ? '+' : ''}${formatMoney(s.variance)}`}
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
                  value={formatMoney(kpis?.floatOutstandingUsd ?? 0)}
                  hint={
                    (kpis?.floatOutstandingCdf ?? 0) > 0
                      ? `+ ${formatMoney(kpis!.floatOutstandingCdf, 'CDF')} FC`
                      : 'USD en circulation'
                  }
                />
                <Kpi
                  label="Cash attendu en tiroirs"
                  value={formatMoney(kpis?.cashInTillsUsd ?? 0)}
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
                            {formatMoney(Number(s.openingFloat ?? 0))}
                            {s.openingFloatCdf ? (
                              <span className="block text-[10px] text-zinc-400">
                                + {formatMoney(s.openingFloatCdf, 'CDF')}
                              </span>
                            ) : null}
                          </td>
                          <td className="px-4 py-3 tabular-nums">
                            {formatMoney(Number(s.cashCollected ?? 0))}
                          </td>
                          <td className="px-4 py-3 font-semibold tabular-nums text-emerald-700">
                            {formatMoney(Number(s.expectedCash ?? 0))}
                          </td>
                          <td className="px-4 py-3 text-[10px] text-zinc-500">
                            V {formatMoney(s.ledgerTotals?.versements ?? 0)} · R{' '}
                            {formatMoney(s.ledgerTotals?.renflouements ?? 0)}
                            {(s.ledgerTotals?.retraits ?? 0) > 0 ? (
                              <> · T {formatMoney(s.ledgerTotals!.retraits)}</>
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
                          Recettes {formatMoney(snap?.totalSession ?? 0)} ·{' '}
                          {snap?.paymentCount ?? 0} paiements · écart{' '}
                          {snap?.variance == null
                            ? '—'
                            : `${snap.variance >= 0 ? '+' : ''}${formatMoney(snap.variance)}`}
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
              value={formatMoney(kpis?.absVarianceSum ?? 0)}
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
                          {formatMoney(Number(row.expectedCash ?? 0))}
                        </td>
                        <td className="px-4 py-3 tabular-nums">
                          {formatMoney(Number(row.closingCounted ?? 0))}
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
                            {formatMoney(v)}
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
        <div>
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
