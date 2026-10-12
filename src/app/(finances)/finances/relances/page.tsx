'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import {
  Bell, Activity, Save, Play, Eye, AlertTriangle, MessageCircle,
  Percent, RefreshCw, Users,
} from 'lucide-react'
import {
  useDebtReminderPolicy,
  useUpdateDebtReminderPolicy,
  useDebtReminderJournal,
  useDebtReminderHealth,
  useTriggerDebtReminders,
  useRunLateFees,
} from '@/lib/hooks/use-finance'
import { FinancePageHeader, FinancePageShell, FinancePanel } from '@/components/finance/finance-page-shell'
import { fadeUp, stagger } from '@/lib/animations'
import { getApiErrorMessage } from '@/lib/api/client'
import { useSchoolMoney } from '@/lib/finance/use-school-money'
import type { DebtReminderPolicy, DebtReminderTriggerResult } from '@/types/finance'
import { cn } from '@/lib/utils'

function StatusPill({ status }: { status: string }) {
  const tone =
    status === 'SENT' || status === 'QUEUED'
      ? 'bg-emerald-50 text-emerald-700 ring-emerald-100'
      : status === 'FAILED'
        ? 'bg-red-50 text-red-700 ring-red-100'
        : status === 'SKIPPED'
          ? 'bg-amber-50 text-amber-700 ring-amber-100'
          : 'bg-zinc-50 text-zinc-600 ring-zinc-100'
  return (
    <span className={cn('inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1', tone)}>
      {status}
    </span>
  )
}

export default function RelancesPage() {
  const { format: formatMoney } = useSchoolMoney()
  const { data: policy, isLoading: loadingPolicy } = useDebtReminderPolicy()
  const { data: health, isLoading: loadingHealth, refetch: refetchHealth } = useDebtReminderHealth()
  const { data: journal, isLoading: loadingJournal, refetch: refetchJournal } = useDebtReminderJournal({ limit: 40 })
  const updatePolicy = useUpdateDebtReminderPolicy()
  const trigger = useTriggerDebtReminders()
  const lateFees = useRunLateFees()

  const [form, setForm] = useState<Partial<DebtReminderPolicy>>({})
  const [offsetsInput, setOffsetsInput] = useState('3,7,15')
  const [feedback, setFeedback] = useState<{ type: 'ok' | 'err'; message: string } | null>(null)
  const [preview, setPreview] = useState<DebtReminderTriggerResult | null>(null)

  useEffect(() => {
    if (!policy) return
    setForm(policy)
    setOffsetsInput((policy.offsetsDays ?? [3, 7, 15]).join(','))
  }, [policy])

  const journalItems = journal?.items ?? []

  const healthStats = useMemo(() => {
    if (!health) return []
    return Object.entries(health.last24h ?? {}).map(([k, v]) => ({ k, v }))
  }, [health])

  function parseOffsets(): number[] {
    return offsetsInput
      .split(/[,\s]+/)
      .map((s) => Number(s.trim()))
      .filter((n) => Number.isFinite(n) && n >= 0 && n <= 60)
      .slice(0, 10)
  }

  async function handleSavePolicy() {
    setFeedback(null)
    try {
      const offsetsDays = parseOffsets()
      if (!offsetsDays.length) {
        setFeedback({ type: 'err', message: 'Indiquez au moins un jour d’offset (ex. 3,7,15).' })
        return
      }
      await updatePolicy.mutateAsync({
        enabled: form.enabled,
        offsetsDays,
        quietStartHour: form.quietStartHour ?? null,
        quietEndHour: form.quietEndHour ?? null,
        lateFeeEnabled: form.lateFeeEnabled,
        lateFeeAnnualRatePercent: Number(form.lateFeeAnnualRatePercent ?? 0),
        debtReminderWhatsAppEnabled: form.debtReminderWhatsAppEnabled,
      })
      setFeedback({ type: 'ok', message: 'Politique enregistrée.' })
    } catch (e) {
      setFeedback({ type: 'err', message: getApiErrorMessage(e) })
    }
  }

  async function handleDryRun() {
    setFeedback(null)
    try {
      const result = await trigger.mutateAsync({ dryRun: true })
      setPreview(result)
      setFeedback({
        type: 'ok',
        message: `Prévisualisation : ${result.queued} candidat(s) à relancer.`,
      })
      void refetchJournal()
    } catch (e) {
      setFeedback({ type: 'err', message: getApiErrorMessage(e) })
    }
  }

  async function handleSend() {
    if (!window.confirm('Envoyer les relances dette maintenant ?')) return
    setFeedback(null)
    try {
      const result = await trigger.mutateAsync({ dryRun: false })
      setPreview(result)
      setFeedback({
        type: 'ok',
        message: `${result.queued} relance(s) mise(s) en file.`,
      })
      void refetchJournal()
      void refetchHealth()
    } catch (e) {
      setFeedback({ type: 'err', message: getApiErrorMessage(e) })
    }
  }

  async function handleLateFees() {
    if (!window.confirm('Calculer les pénalités de retard pour aujourd’hui ?')) return
    setFeedback(null)
    try {
      const result = await lateFees.mutateAsync()
      setFeedback({
        type: 'ok',
        message: `Pénalités : ${result.processed} élève(s), total ${formatMoney(result.accruedTotal)} (ignorés : ${result.skipped}).`,
      })
    } catch (e) {
      setFeedback({ type: 'err', message: getApiErrorMessage(e) })
    }
  }

  return (
    <FinancePageShell>
      <FinancePageHeader
        title="Relances dette"
        subtitle="Politique, WhatsApp, journal et santé de la file — guichet finance"
        actions={
          <>
            <Link
              href="/finances/debiteurs"
              className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50 shadow-sm"
            >
              <Users size={13} />
              Débiteurs
            </Link>
            <button
              type="button"
              onClick={() => { void refetchHealth(); void refetchJournal() }}
              className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-200 px-3 py-1.5 text-xs text-zinc-600 hover:bg-zinc-50"
            >
              <RefreshCw size={12} /> Actualiser
            </button>
          </>
        }
      />

      {feedback && (
        <div
          className={cn(
            'rounded-xl px-4 py-3 text-sm',
            feedback.type === 'ok' ? 'bg-emerald-50 text-emerald-800' : 'bg-red-50 text-red-700',
          )}
        >
          {feedback.message}
        </div>
      )}

      <motion.div className="grid gap-4 lg:grid-cols-3" variants={stagger} initial="hidden" animate="show">
        {/* Health */}
        <motion.div variants={fadeUp} className="lg:col-span-1">
          <FinancePanel>
            <div className="flex items-center gap-2 mb-4">
              <Activity size={15} className="text-emerald-600" />
              <h2 className="text-sm font-semibold text-zinc-900">Santé file</h2>
            </div>
            {loadingHealth ? (
              <div className="h-28 rounded-xl bg-zinc-100 animate-pulse" />
            ) : health ? (
              <div className="space-y-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-zinc-500">Redis / file</span>
                  <span className={health.queueAvailable ? 'text-emerald-700 font-medium' : 'text-red-600 font-medium'}>
                    {health.queueAvailable ? 'OK' : 'Indisponible'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-zinc-500">Politique</span>
                  <span>{health.policyEnabled ? 'Activée' : 'Désactivée'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-zinc-500">DLQ relances</span>
                  <span className={health.dlqDebtReminders > 0 ? 'text-amber-700 font-medium' : ''}>
                    {health.dlqDebtReminders}
                  </span>
                </div>
                {healthStats.length > 0 && (
                  <div className="pt-2 border-t border-zinc-100 space-y-1">
                    <p className="text-[11px] uppercase tracking-wide text-zinc-400">24 h</p>
                    {healthStats.map(({ k, v }) => (
                      <div key={k} className="flex justify-between text-xs">
                        <span className="text-zinc-500">{k}</span>
                        <span className="tabular-nums">{v}</span>
                      </div>
                    ))}
                  </div>
                )}
                <p className="text-[11px] text-zinc-400 leading-relaxed pt-1">{health.workerHint}</p>
              </div>
            ) : (
              <p className="text-sm text-zinc-400">Santé indisponible</p>
            )}
          </FinancePanel>
        </motion.div>

        {/* Policy */}
        <motion.div variants={fadeUp} className="lg:col-span-2">
          <FinancePanel>
            <div className="flex items-center gap-2 mb-4">
              <Bell size={15} className="text-emerald-600" />
              <h2 className="text-sm font-semibold text-zinc-900">Politique</h2>
            </div>
            {loadingPolicy ? (
              <div className="h-40 rounded-xl bg-zinc-100 animate-pulse" />
            ) : (
              <div className="space-y-4">
                <div className="grid sm:grid-cols-2 gap-3">
                  <label className="flex items-center gap-2 text-sm text-zinc-700">
                    <input
                      type="checkbox"
                      checked={Boolean(form.enabled)}
                      onChange={(e) => setForm((f) => ({ ...f, enabled: e.target.checked }))}
                      className="rounded border-zinc-300"
                    />
                    Relances activées (cron)
                  </label>
                  <label className="flex items-center gap-2 text-sm text-zinc-700">
                    <MessageCircle size={14} className="text-emerald-600" />
                    <input
                      type="checkbox"
                      checked={Boolean(form.debtReminderWhatsAppEnabled)}
                      onChange={(e) => setForm((f) => ({ ...f, debtReminderWhatsAppEnabled: e.target.checked }))}
                      className="rounded border-zinc-300"
                    />
                    Canal WhatsApp
                  </label>
                </div>

                <div>
                  <label className="block text-xs font-medium text-zinc-500 mb-1">
                    Jours d’offset (après échéance)
                  </label>
                  <input
                    value={offsetsInput}
                    onChange={(e) => setOffsetsInput(e.target.value)}
                    placeholder="3,7,15"
                    className="w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm"
                  />
                </div>

                <div className="grid sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-zinc-500 mb-1">Heure calme début</label>
                    <input
                      type="number"
                      min={0}
                      max={23}
                      value={form.quietStartHour ?? ''}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          quietStartHour: e.target.value === '' ? null : Number(e.target.value),
                        }))
                      }
                      className="w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm"
                      placeholder="22"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-zinc-500 mb-1">Heure calme fin</label>
                    <input
                      type="number"
                      min={0}
                      max={23}
                      value={form.quietEndHour ?? ''}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          quietEndHour: e.target.value === '' ? null : Number(e.target.value),
                        }))
                      }
                      className="w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm"
                      placeholder="7"
                    />
                  </div>
                </div>

                <div className="rounded-xl border border-zinc-100 bg-zinc-50/80 p-3 space-y-3">
                  <label className="flex items-center gap-2 text-sm text-zinc-700">
                    <Percent size={14} className="text-amber-600" />
                    <input
                      type="checkbox"
                      checked={Boolean(form.lateFeeEnabled)}
                      onChange={(e) => setForm((f) => ({ ...f, lateFeeEnabled: e.target.checked }))}
                      className="rounded border-zinc-300"
                    />
                    Pénalités de retard
                  </label>
                  <div>
                    <label className="block text-xs font-medium text-zinc-500 mb-1">Taux annuel (%)</label>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      step={0.1}
                      value={form.lateFeeAnnualRatePercent ?? 0}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, lateFeeAnnualRatePercent: Number(e.target.value) }))
                      }
                      className="w-full max-w-xs rounded-xl border border-zinc-200 px-3 py-2 text-sm bg-white"
                    />
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => void handleSavePolicy()}
                    disabled={updatePolicy.isPending}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-2 text-xs font-medium text-white hover:bg-emerald-500 disabled:opacity-40"
                  >
                    <Save size={13} /> Enregistrer
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleDryRun()}
                    disabled={trigger.isPending}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-40"
                  >
                    <Eye size={13} /> Prévisualiser
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleSend()}
                    disabled={trigger.isPending}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-800 hover:bg-emerald-100 disabled:opacity-40"
                  >
                    <Play size={13} /> Envoyer maintenant
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleLateFees()}
                    disabled={lateFees.isPending || !form.lateFeeEnabled}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-800 hover:bg-amber-100 disabled:opacity-40"
                  >
                    <AlertTriangle size={13} /> Calculer pénalités
                  </button>
                </div>
              </div>
            )}
          </FinancePanel>
        </motion.div>
      </motion.div>

      {preview && (
        <FinancePanel>
          <h2 className="text-sm font-semibold text-zinc-900 mb-3">
            {preview.dryRun ? 'Résultat prévisualisation' : 'Résultat envoi'}
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm mb-3">
            <div className="rounded-xl bg-emerald-50 px-3 py-2">
              <p className="text-[11px] text-emerald-700">File / candidats</p>
              <p className="text-lg font-semibold tabular-nums text-emerald-900">{preview.queued}</p>
            </div>
            <div className="rounded-xl bg-zinc-50 px-3 py-2">
              <p className="text-[11px] text-zinc-500">Déjà envoyé</p>
              <p className="text-lg font-semibold tabular-nums">{preview.skippedAlreadySent}</p>
            </div>
            <div className="rounded-xl bg-zinc-50 px-3 py-2">
              <p className="text-[11px] text-zinc-500">Heures calmes</p>
              <p className="text-lg font-semibold tabular-nums">{preview.skippedQuietHours}</p>
            </div>
            <div className="rounded-xl bg-zinc-50 px-3 py-2">
              <p className="text-[11px] text-zinc-500">Paiement en cours</p>
              <p className="text-lg font-semibold tabular-nums">{preview.skippedPendingPayment}</p>
            </div>
          </div>
          {preview.candidates?.length > 0 && (
            <p className="text-xs text-zinc-500">
              Ex. : {preview.candidates.slice(0, 5).map((c) => `${c.firstName} (#${c.studentId})`).join(', ')}
              {preview.candidates.length > 5 ? '…' : ''}
            </p>
          )}
        </FinancePanel>
      )}

      <FinancePanel>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-zinc-900">Journal des relances</h2>
          <span className="text-xs text-zinc-400">{journalItems.length} ligne(s)</span>
        </div>
        {loadingJournal ? (
          <div className="h-32 rounded-xl bg-zinc-100 animate-pulse" />
        ) : journalItems.length === 0 ? (
          <p className="text-sm text-zinc-400 py-6 text-center">Aucune entrée pour le moment</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-zinc-100 text-[11px] uppercase tracking-wide text-zinc-400">
                  <th className="py-2 pr-3 font-medium">Élève</th>
                  <th className="py-2 pr-3 font-medium">Campagne</th>
                  <th className="py-2 pr-3 font-medium">Priorité</th>
                  <th className="py-2 pr-3 font-medium">Statut</th>
                  <th className="py-2 pr-3 font-medium">Solde</th>
                  <th className="py-2 font-medium">Date</th>
                </tr>
              </thead>
              <tbody>
                {journalItems.map((row) => (
                  <tr key={row.id} className="border-b border-zinc-50">
                    <td className="py-2.5 pr-3">
                      <p className="font-medium text-zinc-800">{row.studentName}</p>
                      <p className="text-[11px] text-zinc-400">{row.matricule}</p>
                    </td>
                    <td className="py-2.5 pr-3 text-xs text-zinc-600">{row.campaignKey}</td>
                    <td className="py-2.5 pr-3 text-xs">{row.priority}</td>
                    <td className="py-2.5 pr-3">
                      <StatusPill status={row.status} />
                      {row.skipReason && (
                        <p className="text-[10px] text-zinc-400 mt-0.5">{row.skipReason}</p>
                      )}
                    </td>
                    <td className="py-2.5 pr-3 tabular-nums text-xs">
                      {row.balanceSnapshot != null ? formatMoney(row.balanceSnapshot) : '—'}
                    </td>
                    <td className="py-2.5 text-xs text-zinc-500">
                      {new Date(row.createdAt).toLocaleString('fr-FR')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </FinancePanel>
    </FinancePageShell>
  )
}
