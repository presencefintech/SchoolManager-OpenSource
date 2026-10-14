'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  ArrowLeft,
  ArrowRightLeft,
  Download,
  HelpCircle,
  Landmark,
  Network,
  RefreshCw,
  Wallet,
} from 'lucide-react'
import {
  exportClearingCsv,
  networkApi,
  type ClearingSettlementPosition,
} from '@/lib/network/network.api'
import { formatMoney } from '@/lib/finance/currency'
import { cn } from '@/lib/utils'
import { useAuth } from '@/providers/auth-provider'
import { getApiErrorMessage } from '@/lib/api/client'

function monthBounds(): { from: string; to: string } {
  const now = new Date()
  const from = new Date(now.getFullYear(), now.getMonth(), 1)
  const to = new Date(now.getFullYear(), now.getMonth() + 1, 0)
  return {
    from: from.toISOString().slice(0, 10),
    to: to.toISOString().slice(0, 10),
  }
}

function newIdempotencyKey(prefix: string): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return `${prefix}-${crypto.randomUUID()}`
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}

function Tip({ text }: { text: string }) {
  return (
    <span className="group relative inline-flex align-middle" title={text}>
      <HelpCircle size={13} className="text-zinc-400" />
      <span className="pointer-events-none absolute bottom-full left-1/2 z-20 mb-2 hidden w-56 -translate-x-1/2 rounded-lg bg-zinc-900 px-2.5 py-2 text-[11px] font-normal normal-case leading-snug text-white shadow-lg group-hover:block">
        {text}
      </span>
    </span>
  )
}

export default function NetworkCfoPage() {
  const { user } = useAuth()
  const qc = useQueryClient()
  const bounds = useMemo(() => monthBounds(), [])
  const [from, setFrom] = useState(bounds.from)
  const [to, setTo] = useState(bounds.to)
  const [settleTarget, setSettleTarget] = useState<ClearingSettlementPosition | null>(null)
  const [settleAmount, setSettleAmount] = useState('')
  const [settleNotes, setSettleNotes] = useState('')
  const [settleProof, setSettleProof] = useState('')

  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ['network', 'cfo', from, to],
    queryFn: () => networkApi.getCfoSummary({ from, to }),
    enabled: Boolean(user),
    staleTime: 20_000,
  })

  const settleMutation = useMutation({
    mutationFn: networkApi.settleClearing,
    onSuccess: async () => {
      setSettleTarget(null)
      setSettleAmount('')
      setSettleNotes('')
      setSettleProof('')
      await qc.invalidateQueries({ queryKey: ['network', 'cfo'] })
    },
  })

  if (isLoading) {
    return (
      <div className="mx-auto max-w-6xl space-y-4 p-4 sm:p-6">
        <div className="h-28 animate-pulse rounded-3xl bg-zinc-100" />
        <div className="h-64 animate-pulse rounded-2xl bg-zinc-100" />
      </div>
    )
  }

  if (isError || !data) {
    return (
      <div className="mx-auto max-w-lg space-y-4 p-6 text-center">
        <p className="text-sm font-semibold text-zinc-900">
          Tableau de bord Direction indisponible
        </p>
        <p className="text-xs text-zinc-500">
          Vérifiez que votre compte est rattaché à un groupe scolaire multi-établissements.
        </p>
        <button
          type="button"
          onClick={() => void refetch()}
          className="rounded-xl bg-zinc-900 px-3 py-2 text-sm text-white"
        >
          Réessayer
        </button>
      </div>
    )
  }

  const clearing = data.clearing
  const treasury = data.treasury
  const currency = clearing.currency || 'USD'

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-4 sm:p-6">
      <header className="relative overflow-hidden rounded-3xl border border-sky-200/70 bg-gradient-to-br from-sky-50 via-white to-emerald-50 px-5 py-6 sm:px-7">
        <div className="relative flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-2">
            <Link
              href="/admin/network"
              className="inline-flex items-center gap-1 text-xs font-medium text-zinc-500 hover:text-zinc-800"
            >
              <ArrowLeft size={12} />
              Groupe scolaire
            </Link>
            <div className="inline-flex items-center gap-2 rounded-full bg-sky-100/80 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-sky-800">
              <Landmark size={12} />
              Direction Générale / Présidence
            </div>
            <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 sm:text-3xl">
              {clearing.networkName}
            </h1>
            <p className="max-w-xl text-sm text-zinc-600">{clearing.summaryLabel}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void refetch()}
              disabled={isFetching}
              className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs font-medium text-zinc-700"
            >
              <RefreshCw size={13} className={cn(isFetching && 'animate-spin')} />
              Actualiser
            </button>
            <button
              type="button"
              onClick={() => exportClearingCsv(clearing)}
              className="inline-flex items-center gap-1.5 rounded-xl bg-zinc-900 px-3 py-2 text-xs font-semibold text-white"
            >
              <Download size={13} />
              Export comptable (CSV)
            </button>
            <Link
              href="/admin/network/transfers"
              className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-800"
            >
              <ArrowRightLeft size={13} />
              Registre des transferts
            </Link>
          </div>
        </div>
      </header>

      <div className="flex flex-wrap items-end gap-3 rounded-2xl border border-zinc-200 bg-white p-4">
        <label className="text-xs text-zinc-600">
          Du
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="mt-1 block rounded-lg border border-zinc-200 px-2 py-1.5 text-sm"
          />
        </label>
        <label className="text-xs text-zinc-600">
          Au
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="mt-1 block rounded-lg border border-zinc-200 px-2 py-1.5 text-sm"
          />
        </label>
      </div>

      <section className="grid gap-3 sm:grid-cols-3">
        <Kpi
          icon={Wallet}
          label="Frais perçus (période)"
          tip="Total des frais scolaires encaissés au guichet d’accueil pour le compte des autres établissements du groupe."
          value={formatMoney(clearing.totals.grossCollected, currency)}
        />
        <Kpi
          icon={Landmark}
          label="Déjà reversé"
          tip="Montants déjà couverts par un virement d’équilibrage (règlement de comptes) sur la période."
          value={formatMoney(clearing.totals.settledAmount, currency)}
        />
        <Kpi
          icon={Network}
          label="Reste à reverser"
          tip="Ce montant représente les frais perçus pour le compte d’un établissement et restant à lui reverser."
          value={formatMoney(clearing.totals.outstanding, currency)}
          emphasize
        />
      </section>

      {treasury && (
        <section className="rounded-2xl border border-zinc-200 bg-white p-4 sm:p-5">
          <h2 className="inline-flex items-center gap-1.5 text-sm font-semibold text-zinc-900">
            Trésorerie consolidée du groupe
            <Tip text="Vue d’ensemble des caisses ouvertes et des encaissements du jour dans tous les établissements du réseau." />
          </h2>
          <p className="mt-1 text-xs text-zinc-500">
            Aujourd’hui {formatMoney(treasury.totals.collectedToday, currency)} · mois{' '}
            {formatMoney(treasury.totals.collectedMonth, currency)} ·{' '}
            {treasury.totals.sitesOpen}/{treasury.totals.siteCount} guichets ouverts
          </p>
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="text-xs uppercase text-zinc-500">
                <tr>
                  <th className="pb-2 pr-3 font-medium">Établissement</th>
                  <th className="pb-2 pr-3 font-medium">Caisse</th>
                  <th className="pb-2 pr-3 font-medium">Encaissé aujourd’hui</th>
                  <th className="pb-2 font-medium">Guichet</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {treasury.sites.map((s) => (
                  <tr key={s.id}>
                    <td className="py-2.5 pr-3 font-medium text-zinc-900">
                      {s.name}
                      {s.isPaymentHub ? (
                        <span className="ml-2 rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-800">
                          Guichet central
                        </span>
                      ) : null}
                    </td>
                    <td className="py-2.5 pr-3 text-zinc-700">
                      {formatMoney(s.cashInDrawer, s.drawerCurrency || currency)}
                    </td>
                    <td className="py-2.5 pr-3 text-zinc-700">
                      {formatMoney(s.collectedToday, currency)}
                    </td>
                    <td className="py-2.5">
                      <span
                        className={cn(
                          'rounded-full px-2 py-0.5 text-[11px] font-semibold',
                          s.sessionOpen
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-zinc-100 text-zinc-600',
                        )}
                      >
                        {s.sessionOpen ? 'Ouvert' : 'Fermé'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <section className="rounded-2xl border border-zinc-200 bg-white p-4 sm:p-5">
        <h2 className="inline-flex items-center gap-1.5 text-sm font-semibold text-zinc-900">
          Rapprochement inter-écoles — balances d’équilibre
          <Tip text="Ce montant représente les frais perçus par le guichet d’accueil pour le compte de l’établissement d’origine de l’élève et restant à reverser." />
        </h2>
        <p className="mt-1 text-xs text-zinc-500">
          Guichet d’accueil {clearing.hubSchoolName ?? '—'} → établissement d’origine de l’élève
        </p>
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="text-xs uppercase text-zinc-500">
              <tr>
                <th className="pb-2 pr-3 font-medium">Guichet d’accueil</th>
                <th className="pb-2 pr-3 font-medium">Établissement d’origine</th>
                <th className="pb-2 pr-3 font-medium">Perçu</th>
                <th className="pb-2 pr-3 font-medium">Reversé</th>
                <th className="pb-2 pr-3 font-medium">Reste</th>
                <th className="pb-2 font-medium">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {clearing.positions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-6 text-center text-sm text-zinc-500">
                    Aucune balance d’équilibre sur la période.
                  </td>
                </tr>
              ) : (
                clearing.positions.map((p) => (
                  <tr key={`${p.fromSchoolId}-${p.toSchoolId}`}>
                    <td className="py-2.5 pr-3 text-zinc-800">{p.fromSchoolName}</td>
                    <td className="py-2.5 pr-3 font-medium text-zinc-900">{p.toSchoolName}</td>
                    <td className="py-2.5 pr-3">{formatMoney(p.grossCollected, p.currency)}</td>
                    <td className="py-2.5 pr-3">{formatMoney(p.settledAmount, p.currency)}</td>
                    <td className="py-2.5 pr-3 font-semibold text-emerald-800">
                      {formatMoney(p.outstanding, p.currency)}
                    </td>
                    <td className="py-2.5">
                      <button
                        type="button"
                        disabled={p.outstanding <= 0}
                        onClick={() => {
                          setSettleTarget(p)
                          setSettleAmount(String(p.outstanding))
                          setSettleNotes('')
                          setSettleProof('')
                        }}
                        className="rounded-lg bg-emerald-700 px-2.5 py-1.5 text-xs font-semibold text-white disabled:opacity-40"
                      >
                        Règlement de comptes
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {clearing.recentSettlements.length > 0 && (
        <section className="rounded-2xl border border-zinc-200 bg-white p-4 sm:p-5">
          <h2 className="text-sm font-semibold text-zinc-900">
            Journal des virements d’équilibrage
          </h2>
          <ul className="mt-3 divide-y divide-zinc-100 text-sm">
            {clearing.recentSettlements.map((s) => (
              <li key={s.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
                <div>
                  <p className="font-medium text-zinc-900">
                    {s.fromSchoolName} → {s.toSchoolName}
                  </p>
                  <p className="text-xs text-zinc-500">
                    Bordereau nº {s.id}
                    {s.settledAt
                      ? ` · ${new Date(s.settledAt).toLocaleString('fr-FR')}`
                      : ''}
                    {s.notes ? ` · ${s.notes}` : ''}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-zinc-800">
                    {formatMoney(s.amount, s.currency)}
                  </span>
                  <button
                    type="button"
                    onClick={() => void networkApi.downloadSettlementReceipt(s.id)}
                    className="rounded-lg border border-zinc-200 px-2 py-1 text-[11px] font-medium text-zinc-700"
                  >
                    Bordereau PDF
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {settleTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl">
            <h3 className="text-base font-semibold text-zinc-900">
              Virement d’équilibrage
            </h3>
            <p className="mt-1 text-sm text-zinc-600">
              {settleTarget.fromSchoolName} reverse à {settleTarget.toSchoolName}
            </p>
            <p className="mt-2 text-[11px] leading-relaxed text-zinc-500">
              Ce montant représente les frais perçus par le guichet d’accueil pour le compte de
              l’établissement d’origine et restant à reverser.
            </p>
            <label className="mt-4 block text-xs text-zinc-600">
              Montant ({settleTarget.currency})
              <input
                type="number"
                min={0.01}
                step="0.01"
                value={settleAmount}
                onChange={(e) => setSettleAmount(e.target.value)}
                className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
              />
            </label>
            <label className="mt-3 block text-xs text-zinc-600">
              Observations
              <textarea
                value={settleNotes}
                onChange={(e) => setSettleNotes(e.target.value)}
                rows={2}
                className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
              />
            </label>
            <label className="mt-3 block text-xs text-zinc-600">
              Bordereau ou pièce justificative (référence / lien)
              <input
                type="text"
                value={settleProof}
                onChange={(e) => setSettleProof(e.target.value)}
                placeholder="Ex. VIR-2026-041 / scan dépôt banque"
                className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
              />
            </label>
            {settleMutation.isError && (
              <p className="mt-2 text-xs text-rose-600">
                {getApiErrorMessage(settleMutation.error) ||
                  'Impossible d’enregistrer le règlement. Vérifiez le montant et réessayez.'}
              </p>
            )}
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setSettleTarget(null)}
                className="rounded-xl border border-zinc-200 px-3 py-2 text-sm"
              >
                Annuler
              </button>
              <button
                type="button"
                disabled={settleMutation.isPending || !(Number(settleAmount) > 0)}
                onClick={() =>
                  settleMutation.mutate({
                    fromSchoolId: settleTarget.fromSchoolId,
                    toSchoolId: settleTarget.toSchoolId,
                    amount: Number(settleAmount),
                    currency: settleTarget.currency,
                    notes: settleNotes || undefined,
                    proofUrl: settleProof || undefined,
                    periodFrom: from,
                    periodTo: to,
                    markSettled: true,
                    idempotencyKey: newIdempotencyKey('settle'),
                  })
                }
                className="rounded-xl bg-emerald-700 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
              >
                {settleMutation.isPending
                  ? 'Enregistrement…'
                  : 'Confirmer le virement d’équilibrage'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function Kpi({
  icon: Icon,
  label,
  value,
  tip,
  emphasize,
}: {
  icon: typeof Wallet
  label: string
  value: string
  tip?: string
  emphasize?: boolean
}) {
  return (
    <div
      className={cn(
        'rounded-2xl border p-4',
        emphasize ? 'border-emerald-200 bg-emerald-50' : 'border-zinc-200 bg-white',
      )}
    >
      <div className="flex items-center gap-2 text-xs font-medium text-zinc-500">
        <Icon size={14} />
        {label}
        {tip ? <Tip text={tip} /> : null}
      </div>
      <p className="mt-2 text-xl font-semibold tracking-tight text-zinc-900">{value}</p>
    </div>
  )
}
