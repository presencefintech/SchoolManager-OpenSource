'use client'

import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Copy, MessageCircle } from 'lucide-react'
import { financeRoleApi } from '@/lib/finance/api/finance.api'
import {
  deskReminderShareUrl,
  filterDeskReminderRows,
  formatReminderDay,
  planBulkReminders,
  planSelectedReminders,
  toggleVisibleSelection,
  type ReminderChannel,
} from '@/lib/finance/desk-reminders'
import type { DeskReminderDispatch, DeskReminderList, DeskReminderRow } from '@/types/finance'

function emptyHint(list: DeskReminderList | undefined): string | null {
  if (!list) return null
  if (list.reason === 'disabled') return 'Les relances sont désactivées pour cette école.'
  if (list.reason === 'no-policy') return 'Pas de calendrier de relance configuré pour cette école.'
  if (list.reason === 'off-schedule' && list.total === 0) {
    const when = formatReminderDay(list.nextReminderOn)
    return when
      ? `Pas de relance prévue aujourd’hui. Prochaine vague le ${when}.`
      : 'Pas de relance prévue aujourd’hui selon le calendrier de l’école.'
  }
  if (list.rows.length === 0 && list.reason === 'ready') {
    if (list.deadlinePassed === false && list.deadlineDay) {
      return `L'échéance est le ${list.deadlineDay} du mois. La relance part le lendemain.`
    }
    return 'Aucun solde à relancer aujourd’hui.'
  }
  return null
}

export function DeskReminders() {
  const queryClient = useQueryClient()
  const [hint, setHint] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [onlyMissing, setOnlyMissing] = useState(false)
  const [copiedId, setCopiedId] = useState<number | null>(null)
  const [queueOpen, setQueueOpen] = useState(false)
  const [queueIndex, setQueueIndex] = useState(0)
  const [queueItems, setQueueItems] = useState<DeskReminderRow[]>([])
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [channels, setChannels] = useState<Record<number, ReminderChannel>>({})
  const [busy, setBusy] = useState(false)
  const [report, setReport] = useState<DeskReminderDispatch | null>(null)
  const { data, isLoading } = useQuery({
    queryKey: ['finance', 'desk-reminders'],
    queryFn: () => financeRoleApi.listDeskReminders(),
    staleTime: 30_000,
  })

  const note = emptyHint(data)
  const rows = filterDeskReminderRows(data?.rows ?? [], query, onlyMissing)
  const shareUrl = deskReminderShareUrl(data?.digest)
  const nextLabel = formatReminderDay(data?.nextReminderOn)
  const showWaiting = data?.reason === 'off-schedule' && (data.total ?? 0) > 0
  const bulk = planBulkReminders(data?.rows ?? [], Boolean(data?.messagingReady))
  const visibleIds = rows.map((row) => row.studentId)
  const allVisibleSelected = visibleIds.length > 0 && visibleIds.every((id) => selected.has(id))
  const selectedCount = rows.filter((row) => selected.has(row.studentId)).length
  const current = queueItems[queueIndex] ?? null

  function channelOf(row: DeskReminderRow): ReminderChannel {
    return channels[row.studentId] ?? row.preferredChannel ?? (row.whatsappUrl ? 'whatsapp' : 'sms')
  }

  function urlOf(row: DeskReminderRow): string | null {
    return channelOf(row) === 'sms' ? row.smsUrl ?? null : row.whatsappUrl
  }

  async function relance(studentId: number, url: string) {
    const popup = window.open(url, '_blank', 'noopener,noreferrer')
    if (!popup) {
      setHint('Autorisez l’ouverture de WhatsApp dans le navigateur, ou copiez le message.')
      return
    }
    setHint(null)
    try {
      await financeRoleApi.markDeskReminderOpened(studentId)
      await queryClient.invalidateQueries({ queryKey: ['finance', 'desk-reminders'] })
    } catch {
      setHint('WhatsApp est ouvert. La liste n’a pas pu être mise à jour.')
    }
  }

  function markFromLink(studentId: number) {
    void financeRoleApi.markDeskReminderOpened(studentId).then(() =>
      queryClient.invalidateQueries({ queryKey: ['finance', 'desk-reminders'] }),
    ).catch(() => {
      setHint('WhatsApp est ouvert. La liste n’a pas pu être mise à jour.')
    })
  }

  async function relanceAll() {
    if (!data) return
    setReport(null)
    if (bulk.mode === 'api') {
      setBusy(true)
      try {
        const studentIds = data.rows.flatMap((row) =>
          row.studentIds?.length ? row.studentIds : [row.studentId],
        )
        const outcome = await financeRoleApi.dispatchDeskReminders(studentIds)
        if (outcome.mode !== 'api') {
          setQueueOpen(true)
          setQueueIndex(0)
          setHint(outcome.error ?? 'La messagerie n’est pas active. Ouvrez les liens un par un.')
          return
        }
        setReport(outcome)
        setHint(null)
        await queryClient.invalidateQueries({ queryKey: ['finance', 'desk-reminders'] })
      } catch {
        setQueueOpen(true)
        setQueueIndex(0)
        setHint('L’envoi automatique a échoué. La file manuelle reste ouverte.')
      } finally {
        setBusy(false)
      }
      return
    }
    if (bulk.reachable.length === 0) {
      setHint('Aucun numéro utilisable dans cette vague.')
      return
    }
    setQueueItems(bulk.reachable)
    setQueueOpen(true)
    setQueueIndex(0)
    setHint(null)
  }

  function relanceSelection() {
    if (!data) return
    const plan = planSelectedReminders(rows, selected, new Map(Object.entries(channels).map(([id, channel]) => [Number(id), channel])))
    if (plan.reachable.length === 0) {
      setHint(selectedCount === 0 ? 'Cochez au moins un parent.' : 'Aucun numéro utilisable dans la sélection.')
      return
    }
    setQueueItems(plan.reachable.map((item) => item.row))
    setQueueOpen(true)
    setQueueIndex(0)
    setHint(null)
  }

  async function copyMessage(studentId: number, message: string) {
    try {
      await navigator.clipboard.writeText(message)
      setCopiedId(studentId)
      window.setTimeout(() => setCopiedId((current) => (current === studentId ? null : current)), 2000)
    } catch {
      setHint('Le message n’a pas pu être copié.')
    }
  }

  return (
    <section className="rounded-2xl border border-zinc-200/80 bg-white shadow-sm">
      <div className="border-b border-zinc-100 px-4 py-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-zinc-900">Relances du jour</h2>
            <p className="text-[11px] text-zinc-400">
              Élèves dont c’est le tour, selon le calendrier de l’école
              {data?.campaignKey && data.dueToday ? ` · ${data.campaignKey}` : ''}
            </p>
          </div>
          {shareUrl ? (
            <a
              href={shareUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-zinc-200 px-2.5 py-1.5 text-[11px] font-semibold text-zinc-700 hover:bg-zinc-50"
            >
              <MessageCircle size={12} />
              Envoyer au promoteur
            </a>
          ) : null}
        </div>
      </div>

      {data?.dueToday && data.totalLabel ? (
        <div className="mx-4 mt-3 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2.5">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <p className="text-sm font-semibold text-emerald-950">
                À relancer : {data.total} {data.total > 1 ? 'parents' : 'parent'} · {data.totalLabel}
              </p>
              {data.totalCdfLabel ? (
                <p className="text-[11px] font-medium tabular-nums text-emerald-800">{data.totalCdfLabel}</p>
              ) : null}
              {data.missingPhone > 0 ? (
                <p className="mt-0.5 text-[11px] text-emerald-900/70">
                  {data.missingPhone} sans numéro utilisable
                </p>
              ) : null}
              <p className="mt-0.5 text-[11px] text-emerald-900/70">
                Sans WhatsApp, le bouton SMS ouvre le message dans l’application de ce téléphone.
              </p>
            </div>
            {data.rows.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setSelected((current) => toggleVisibleSelection(visibleIds, current))}
                  className="inline-flex shrink-0 items-center rounded-lg border border-emerald-300 bg-white px-2.5 py-1.5 text-[11px] font-semibold text-emerald-900 hover:bg-emerald-100"
                >
                  {allVisibleSelected ? 'Tout retirer' : 'Tout sélectionner'}
                </button>
                <button
                  type="button"
                  disabled={selectedCount === 0}
                  onClick={relanceSelection}
                  className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-emerald-800 px-2.5 py-1.5 text-[11px] font-semibold text-white hover:bg-emerald-900 disabled:opacity-60"
                >
                  <MessageCircle size={12} />
                  Relancer la sélection{selectedCount > 0 ? ` (${selectedCount})` : ''}
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => {
                    void relanceAll()
                  }}
                  className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-emerald-800 px-2.5 py-1.5 text-[11px] font-semibold text-emerald-900 hover:bg-emerald-100 disabled:opacity-60"
                >
                  {busy ? 'Envoi…' : 'Relancer tous'}
                </button>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}

      {report?.mode === 'api' ? (
        <p className="mx-4 mt-2 text-[11px] text-emerald-900">
          {report.queued} mis en file
          {report.skippedInvalidPhone > 0 ? ` · ${report.skippedInvalidPhone} numéro invalide` : ''}
          {report.skippedAlreadySent > 0 ? ` · ${report.skippedAlreadySent} déjà relancé` : ''}
          {report.failed > 0 ? ` · ${report.failed} en échec, les autres ont continué` : ''}
        </p>
      ) : null}

      {queueOpen && current ? (
        <div className="mx-4 mt-3 rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-3">
          <div className="flex items-center justify-between gap-2">
            <p className="text-[11px] font-semibold text-zinc-700">
              File {queueIndex + 1} / {queueItems.length}
            </p>
            <button
              type="button"
              onClick={() => setQueueOpen(false)}
              className="text-[11px] font-medium text-zinc-500"
            >
              Fermer
            </button>
          </div>
          <p className="mt-1 text-sm font-medium text-zinc-900">{current.parentName ?? current.studentName}</p>
          <pre className="mt-2 whitespace-pre-wrap font-sans text-[11px] leading-relaxed text-zinc-600">{current.message}</pre>
          <div className="mt-2 flex flex-wrap gap-2">
            <a
              href={urlOf(current) ?? undefined}
              target="_blank"
              rel="noreferrer"
              onClick={() => markFromLink(current.studentId)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-700 px-2.5 py-1.5 text-[11px] font-semibold text-white hover:bg-emerald-800"
            >
              <MessageCircle size={12} />
              {channelOf(current) === 'sms' ? 'Ouvrir SMS' : 'Ouvrir WhatsApp'}
            </a>
            <button
              type="button"
              disabled={queueIndex >= queueItems.length - 1}
              onClick={() => setQueueIndex((index) => index + 1)}
              className="rounded-lg border border-zinc-200 bg-white px-2.5 py-1.5 text-[11px] font-semibold text-zinc-700 disabled:opacity-40"
            >
              Suivant
            </button>
          </div>
          <ul className="mt-3 max-h-36 space-y-1 overflow-y-auto">
            {queueItems.map((row: DeskReminderRow, index) => (
              <li key={row.studentId}>
                <a
                  href={urlOf(row) ?? undefined}
                  target="_blank"
                  rel="noreferrer"
                  onClick={() => {
                    setQueueIndex(index)
                    markFromLink(row.studentId)
                  }}
                  className={
                    index === queueIndex
                      ? 'block truncate text-[11px] font-semibold text-emerald-800'
                      : 'block truncate text-[11px] text-zinc-600 hover:text-zinc-900'
                  }
                >
                  {row.parentName ?? row.studentName} · {row.balanceLabel}
                </a>
              </li>
            ))}
          </ul>
          {queueItems.length < selectedCount ? (
            <p className="mt-2 text-[11px] text-zinc-500">
              {selectedCount - queueItems.length} sans numéro, laissés de côté.
            </p>
          ) : null}
        </div>
      ) : null}

      {isLoading ? (
        <p className="px-4 py-8 text-center text-sm text-zinc-400">Chargement des relances…</p>
      ) : note ? (
        <p className="px-4 py-8 text-center text-sm text-zinc-400">{note}</p>
      ) : showWaiting ? (
        <div className="px-4 py-6 text-center">
          <p className="text-sm text-zinc-500">
            Pas de relance prévue aujourd’hui.
            {nextLabel ? ` Prochaine vague le ${nextLabel}.` : ''}
          </p>
          <p className="mt-1 text-sm font-semibold text-zinc-800">
            {data?.total} soldes en attente · {data?.totalLabel}
          </p>
          {data?.totalCdfLabel ? (
            <p className="text-[11px] tabular-nums text-zinc-500">{data.totalCdfLabel}</p>
          ) : null}
        </div>
      ) : (
        <>
          <div className="flex items-center gap-2 px-4 pt-3">
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Élève, parent ou classe"
              className="w-full rounded-lg border border-zinc-200 px-2.5 py-1.5 text-xs text-zinc-800 outline-none focus:border-zinc-400"
            />
            {data && data.missingPhone > 0 ? (
              <button
                type="button"
                onClick={() => setOnlyMissing((value) => !value)}
                className={
                  onlyMissing
                    ? 'shrink-0 rounded-lg bg-zinc-900 px-2.5 py-1.5 text-[11px] font-semibold text-white'
                    : 'shrink-0 rounded-lg border border-zinc-200 px-2.5 py-1.5 text-[11px] font-semibold text-zinc-600'
                }
              >
                Sans numéro
              </button>
            ) : null}
          </div>
          {rows.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-zinc-400">Aucun résultat pour cette recherche.</p>
          ) : (
            <ul className="mt-2 max-h-96 divide-y divide-zinc-50 overflow-y-auto">
              {rows.map((row) => {
                const channel = channelOf(row)
                const outbound = urlOf(row)
                return (
                <li key={row.studentId} className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="flex min-w-0 gap-2">
                    <input
                      type="checkbox"
                      checked={selected.has(row.studentId)}
                      aria-label={`Sélectionner ${row.parentName ?? row.studentName}`}
                      onChange={() => {
                        setSelected((current) => {
                          const next = new Set(current)
                          if (next.has(row.studentId)) next.delete(row.studentId)
                          else next.add(row.studentId)
                          return next
                        })
                      }}
                      className="mt-1"
                    />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-zinc-900">
                      {row.parentName ?? row.studentName}
                      {row.childCount && row.childCount > 1 ? ` · ${row.childCount} enfants` : ''}
                    </p>
                    {row.lines && row.lines.length > 0 ? (
                      <ul className="mt-1 space-y-0.5">
                        {row.lines.map((line) => (
                          <li key={`${line.studentId}-${line.feeLabel}`} className="truncate text-[11px] text-zinc-500">
                            {line.feeLabel} — {line.studentName} : {line.amountLabel}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="truncate text-[11px] text-zinc-500">{row.studentName}</p>
                    )}
                    <p className="truncate text-[11px] text-zinc-400">
                      {row.className ? `${row.className} · ` : ''}
                      {row.phoneMasked ?? 'Numéro absent'}
                    </p>
                    <pre className="mt-2 whitespace-pre-wrap rounded-lg bg-zinc-50 px-2.5 py-2 font-sans text-[11px] leading-relaxed text-zinc-600">{row.message}</pre>
                  </div>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-2">
                    <div className="flex rounded-lg border border-zinc-200 p-0.5 text-[11px] font-semibold">
                      <button
                        type="button"
                        disabled={!row.whatsappUrl}
                        onClick={() => setChannels((current) => ({ ...current, [row.studentId]: 'whatsapp' }))}
                        className={channel === 'whatsapp' ? 'rounded-md bg-emerald-700 px-2 py-1 text-white' : 'rounded-md px-2 py-1 text-zinc-600 disabled:opacity-40'}
                      >
                        WhatsApp
                      </button>
                      <button
                        type="button"
                        disabled={!row.smsUrl}
                        onClick={() => setChannels((current) => ({ ...current, [row.studentId]: 'sms' }))}
                        className={channel === 'sms' ? 'rounded-md bg-zinc-900 px-2 py-1 text-white' : 'rounded-md px-2 py-1 text-zinc-600 disabled:opacity-40'}
                      >
                        SMS
                      </button>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold tabular-nums text-zinc-900">{row.balanceLabel}</p>
                      {row.balanceCdfLabel ? (
                        <p className="text-[11px] tabular-nums text-zinc-500">{row.balanceCdfLabel}</p>
                      ) : null}
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        void copyMessage(row.studentId, row.message)
                      }}
                      className="inline-flex items-center gap-1 rounded-lg border border-zinc-200 px-2 py-1.5 text-[11px] font-semibold text-zinc-600 hover:bg-zinc-50"
                    >
                      <Copy size={12} />
                      {copiedId === row.studentId ? 'Copié' : 'Copier'}
                    </button>
                    {outbound ? (
                      <button
                        type="button"
                        onClick={() => {
                          void relance(row.studentId, outbound)
                        }}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-700 px-2.5 py-1.5 text-[11px] font-semibold text-white hover:bg-emerald-800"
                      >
                        <MessageCircle size={12} />
                        {channel === 'sms' ? 'Relancer SMS' : 'Relancer WhatsApp'}
                      </button>
                    ) : (
                      <span className="text-[11px] text-zinc-400">Numéro absent</span>
                    )}
                  </div>
                </li>
                )
              })}
            </ul>
          )}
        </>
      )}

      {data && data.dueToday && data.total > data.rows.length ? (
        <p className="border-t border-zinc-100 px-4 py-2 text-[11px] text-zinc-400">
          {data.rows.length} affichés sur {data.total}. Le total couvre toute la vague.
        </p>
      ) : null}
      {data && data.remindedToday > 0 ? (
        <p className="border-t border-zinc-100 px-4 py-2 text-[11px] text-zinc-400">
          {data.remindedToday} relance{data.remindedToday > 1 ? 's' : ''} déjà ouverte
          {data.remindedToday > 1 ? 's' : ''} aujourd’hui
        </p>
      ) : null}
      {hint ? <p className="px-4 pb-3 text-[11px] text-amber-800">{hint}</p> : null}
    </section>
  )
}
