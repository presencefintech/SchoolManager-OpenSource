'use client'

import { useState } from 'react'
import { Copy, MessageCircle, RefreshCw } from 'lucide-react'
import { useResolvedCashSession } from '@/lib/hooks/use-finance'
import {
  buildDayCashCollectionsView,
  openTillSnapshotFromSession,
  type DayCashReportRow,
} from '@/lib/finance/day-cash-remittance'
import { useSchoolMoney } from '@/lib/finance/use-school-money'

function AmountStack({
  primary,
  secondary,
  hint,
  emphasis = false,
}: {
  primary: string
  secondary: string | null
  hint?: string | null
  emphasis?: boolean
}) {
  return (
    <div className="text-right">
      <p
        className={
          emphasis
            ? 'text-sm font-bold tabular-nums text-emerald-800'
            : 'text-sm font-semibold tabular-nums text-emerald-700'
        }
      >
        {primary}
      </p>
      {secondary ? (
        <p className="text-[11px] font-medium tabular-nums text-zinc-500">{secondary}</p>
      ) : null}
      {hint ? <p className="text-[10px] text-zinc-400">{hint}</p> : null}
    </div>
  )
}

export function DayCashCollectionsCard({
  rows,
  isFetching,
  onRefresh,
}: {
  rows: DayCashReportRow[]
  isFetching: boolean
  onRefresh: () => void
}) {
  const { rate, isFetched: isRateFetched } = useSchoolMoney()
  const { session } = useResolvedCashSession()
  const [copied, setCopied] = useState(false)
  const view = buildDayCashCollectionsView({
    rows,
    rate,
    till: openTillSnapshotFromSession(session),
  })

  async function copyShareText() {
    try {
      await navigator.clipboard.writeText(view.shareText)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
    } catch {
      setCopied(false)
    }
  }

  return (
    <div className="rounded-2xl border border-zinc-200/70 bg-white shadow-[0_1px_4px_rgba(0,0,0,0.06)]">
      <div className="flex items-center justify-between border-b border-zinc-100 px-5 py-4">
        <h2 className="text-sm font-semibold text-zinc-900">Encaissements du jour</h2>
        <button
          type="button"
          onClick={onRefresh}
          className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-100"
          title="Actualiser"
        >
          <RefreshCw size={13} className={isFetching ? 'animate-spin' : ''} />
        </button>
      </div>

      {view.showBanner ? (
        <div className="mx-4 mt-4 rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-3">
          <p className="text-sm font-semibold leading-snug text-emerald-950">{view.banner}</p>
          {view.rateLabel ? (
            <p className="mt-1 text-[11px] font-medium text-emerald-800/80">{view.rateLabel}</p>
          ) : isRateFetched ? (
            <p className="mt-1 text-[11px] text-amber-800">
              Taux du jour indisponible — équivalent en francs non affiché.
            </p>
          ) : null}

          {view.physical ? (
            <div className="mt-3">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-emerald-800/70">
                {view.physical.title}
              </p>
              <div className="mt-1.5 grid grid-cols-2 gap-2">
                <div className="rounded-lg border border-white/80 bg-white/80 px-2.5 py-2">
                  <p className="text-[10px] font-semibold text-emerald-800/70">Dollars reçus</p>
                  <p className="mt-0.5 text-sm font-bold tabular-nums text-emerald-950">
                    {view.physical.usd}
                  </p>
                </div>
                <div className="rounded-lg border border-white/80 bg-white/80 px-2.5 py-2">
                  <p className="text-[10px] font-semibold text-emerald-800/70">Francs reçus</p>
                  <p className="mt-0.5 text-sm font-bold tabular-nums text-emerald-950">
                    {view.physical.cdf}
                  </p>
                  {view.physical.cdfBookHint ? (
                    <p className="text-[10px] text-emerald-800/70">{view.physical.cdfBookHint}</p>
                  ) : null}
                </div>
              </div>
            </div>
          ) : null}

          {view.scopeNote ? (
            <p className="mt-2 text-[11px] text-emerald-900/70">{view.scopeNote}</p>
          ) : null}

          {view.breakdown.length > 0 ? (
            <ul className="mt-3 space-y-1 border-t border-emerald-200/80 pt-2">
              {view.breakdown.map((line) => (
                <li key={line.label} className="flex items-center justify-between gap-3 text-[11px]">
                  <span className="text-emerald-900/80">{line.label}</span>
                  <span className="font-semibold tabular-nums text-emerald-950">{line.primary}</span>
                </li>
              ))}
            </ul>
          ) : view.adjustmentNote ? (
            <p className="mt-1 text-[11px] text-emerald-900/70">{view.adjustmentNote}</p>
          ) : null}

          {view.floatNote ? (
            <p className="mt-2 text-[11px] text-emerald-900/80">{view.floatNote}</p>
          ) : null}

          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => {
                void copyShareText()
              }}
              className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-white px-2.5 py-1.5 text-[11px] font-semibold text-emerald-900 hover:bg-emerald-100/60"
            >
              <Copy size={12} />
              {copied ? 'Copié' : 'Copier'}
            </button>
            <a
              href={view.whatsappUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-700 px-2.5 py-1.5 text-[11px] font-semibold text-white hover:bg-emerald-800"
            >
              <MessageCircle size={12} />
              Envoyer au promoteur
            </a>
          </div>
        </div>
      ) : null}

      {view.rows.length === 0 ? (
        <div className="py-12 text-center">
          <p className="text-sm text-zinc-400">Aucun encaissement aujourd&apos;hui</p>
        </div>
      ) : (
        <>
          <div className="divide-y divide-zinc-50">
            {view.rows.map((row) => (
              <div key={row.key} className="flex items-center justify-between gap-3 px-5 py-3">
                <div>
                  <p className="text-sm font-medium text-zinc-900">{row.method}</p>
                  <p className="text-xs text-zinc-400">{row.countLabel}</p>
                </div>
                <AmountStack primary={row.amount.primary} secondary={row.amount.secondary} />
              </div>
            ))}
          </div>
          <div className="flex items-center justify-between gap-3 border-t border-zinc-100 bg-zinc-50/60 px-5 py-3">
            <span className="text-sm font-semibold text-zinc-700">Total</span>
            <AmountStack
              primary={view.total.primary}
              secondary={view.total.secondary}
              hint={view.totalHint}
              emphasis
            />
          </div>
        </>
      )}
    </div>
  )
}
