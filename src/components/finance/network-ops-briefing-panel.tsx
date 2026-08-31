'use client'

import { useState } from 'react'
import { BookOpen, Copy, MessageSquare, Smartphone, Users, Wallet } from 'lucide-react'
import { formatMoney } from '@/lib/finance/currency'
import type { NetworkOpsBriefing } from '@/types/finance'
import { cn } from '@/lib/utils'

export function NetworkOpsBriefingPanel({
  briefing,
  variant = 'light',
}: {
  briefing: NetworkOpsBriefing
  variant?: 'light' | 'dark'
}) {
  const [copied, setCopied] = useState(false)
  const dark = variant === 'dark'
  const { summary } = briefing
  const clean = summary.actionCount === 0

  async function copyWhatsApp() {
    try {
      await navigator.clipboard.writeText(briefing.whatsappText)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
    } catch {
      setCopied(false)
    }
  }

  return (
    <div
      className={cn(
        'rounded-2xl border p-4 space-y-3',
        dark
          ? 'border-white/10 bg-white/5 text-white'
          : clean
            ? 'border-emerald-100 bg-emerald-50/40'
            : 'border-amber-100 bg-amber-50/40',
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p
            className={cn(
              'text-[10px] font-semibold uppercase tracking-[0.14em]',
              dark ? 'text-slate-400' : 'text-zinc-500',
            )}
          >
            À traiter aujourd&apos;hui
          </p>
          <p className={cn('text-sm font-semibold mt-0.5', dark ? 'text-white' : 'text-zinc-900')}>
            {clean
              ? 'Journée propre — rien de bloquant sur le groupe'
              : `${summary.actionCount} action${summary.actionCount > 1 ? 's' : ''} à suivre`}
          </p>
        </div>
        <button
          type="button"
          onClick={() => void copyWhatsApp()}
          className={cn(
            'inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[11px] font-medium',
            dark
              ? 'bg-white/10 text-slate-200 hover:bg-white/15'
              : 'bg-white border border-zinc-200 text-zinc-700 hover:bg-zinc-50',
          )}
        >
          <Copy size={12} />
          {copied ? 'Copié' : 'WhatsApp'}
        </button>
      </div>

      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
        <BriefingStat
          icon={BookOpen}
          label="Cahiers non soumis"
          value={summary.rollsNotSubmitted}
          dark={dark}
        />
        <BriefingStat
          icon={Smartphone}
          label="SMS en attente"
          value={summary.smsPending}
          dark={dark}
        />
        <BriefingStat
          icon={Users}
          label="Présents non soldés"
          value={summary.presentUnpaid}
          dark={dark}
        />
        <BriefingStat
          icon={Wallet}
          label="Caisses fermées (activité)"
          value={summary.tillsClosedWithActivity}
          dark={dark}
        />
      </div>

      {briefing.rollsNotSubmitted.length > 0 ? (
        <BriefingList
          title="Cahiers d’appel"
          dark={dark}
          items={briefing.rollsNotSubmitted.slice(0, 6).map((row) => ({
            key: `${row.schoolId}-${row.classId}`,
            title: `${row.className} · ${row.schoolName}`,
            hint: row.status === 'DRAFT' ? 'Brouillon — à soumettre' : 'Non ouvert',
          }))}
        />
      ) : null}

      {briefing.smsPending.length > 0 ? (
        <BriefingList
          title="SMS parents (élève pas encore crédité)"
          dark={dark}
          items={briefing.smsPending.slice(0, 6).map((row) => ({
            key: String(row.id),
            title: `${row.studentName} · ${row.schoolName}`,
            hint: `${formatMoney(row.amount)} · ${row.provider} · ${row.waitingMinutes} min`,
          }))}
        />
      ) : null}

      {briefing.presentUnpaid.length > 0 ? (
        <BriefingList
          title="Présents avec reste à payer"
          dark={dark}
          items={briefing.presentUnpaid.slice(0, 6).map((row) => ({
            key: `${row.schoolId}-${row.studentId}`,
            title: `${row.studentName} · ${row.className}`,
            hint: `${row.schoolName} · reste ${formatMoney(row.feesBalance)}`,
          }))}
        />
      ) : null}

      {briefing.tillsClosedWithActivity.length > 0 ? (
        <BriefingList
          title="Caisse fermée alors qu’il y a de la présence"
          dark={dark}
          items={briefing.tillsClosedWithActivity.map((row) => ({
            key: String(row.schoolId),
            title: row.schoolName,
            hint: 'Ouvrir la caisse du site',
          }))}
        />
      ) : null}

      <p className={cn('text-[11px] flex items-center gap-1', dark ? 'text-slate-500' : 'text-zinc-400')}>
        <MessageSquare size={11} />
        Isolation groupe · {briefing.groupName}
      </p>
    </div>
  )
}

function BriefingStat({
  icon: Icon,
  label,
  value,
  dark,
}: {
  icon: typeof BookOpen
  label: string
  value: number
  dark: boolean
}) {
  return (
    <div
      className={cn(
        'rounded-xl px-3 py-2',
        dark ? 'bg-black/20 border border-white/10' : 'bg-white border border-zinc-100',
      )}
    >
      <p
        className={cn(
          'text-[10px] uppercase tracking-wide font-semibold flex items-center gap-1',
          dark ? 'text-slate-400' : 'text-zinc-400',
        )}
      >
        <Icon size={11} /> {label}
      </p>
      <p className={cn('text-lg font-bold tabular-nums mt-0.5', value > 0 ? (dark ? 'text-amber-300' : 'text-amber-800') : dark ? 'text-emerald-300' : 'text-emerald-700')}>
        {value}
      </p>
    </div>
  )
}

function BriefingList({
  title,
  items,
  dark,
}: {
  title: string
  items: { key: string; title: string; hint: string }[]
  dark: boolean
}) {
  return (
    <div>
      <p className={cn('text-[11px] font-semibold mb-1', dark ? 'text-slate-300' : 'text-zinc-700')}>
        {title}
      </p>
      <ul className={cn('divide-y rounded-lg overflow-hidden', dark ? 'divide-white/10 border border-white/10' : 'divide-zinc-100 border border-zinc-100 bg-white')}>
        {items.map((item) => (
          <li key={item.key} className="px-3 py-1.5">
            <p className={cn('text-[12px] font-medium truncate', dark ? 'text-white' : 'text-zinc-800')}>
              {item.title}
            </p>
            <p className={cn('text-[10px]', dark ? 'text-slate-400' : 'text-zinc-500')}>{item.hint}</p>
          </li>
        ))}
      </ul>
    </div>
  )
}
