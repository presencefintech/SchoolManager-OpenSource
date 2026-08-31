'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  BookOpen,
  Copy,
  MessageSquare,
  Smartphone,
  Users,
  Wallet,
} from 'lucide-react'
import { formatMoney } from '@/lib/finance/currency'
import type { NetworkOpsBriefing, NetworkOpsSeverity } from '@/types/finance'
import { cn } from '@/lib/utils'

export function NetworkOpsBriefingPanel({
  briefing,
  variant = 'light',
  linkable = true,
}: {
  briefing: NetworkOpsBriefing
  variant?: 'light' | 'dark'
  linkable?: boolean
}) {
  const [copied, setCopied] = useState(false)
  const dark = variant === 'dark'
  const { summary } = briefing
  const queue = briefing.queue ?? []
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
            À traiter aujourd&apos;hui{briefing.date ? ` · ${briefing.date}` : ''}
          </p>
          <p className={cn('text-sm font-semibold mt-0.5', dark ? 'text-white' : 'text-zinc-900')}>
            {clean
              ? 'Journée propre — rien de bloquant sur le groupe'
              : `${summary.actionCount} action${summary.actionCount > 1 ? 's' : ''} à suivre${summary.criticalCount ? ` · ${summary.criticalCount} critique${summary.criticalCount > 1 ? 's' : ''}` : ''}`}
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

      {briefing.nextAction && !clean ? (
        <NextActionCard
          title={briefing.nextAction.title}
          detail={briefing.nextAction.detail}
          severity={briefing.nextAction.severity}
          href={briefing.nextAction.href}
          linkable={linkable}
          dark={dark}
        />
      ) : null}

      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
        <BriefingStat
          icon={BookOpen}
          label="Cahiers non soumis"
          value={summary.classesWithoutSheet}
          dark={dark}
        />
        <BriefingStat
          icon={Smartphone}
          label="SMS en attente"
          value={summary.pendingSms}
          hint={
            summary.oldestSmsMinutes != null
              ? `plus ancien ${summary.oldestSmsMinutes} min`
              : undefined
          }
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
          label="Caisses / silence"
          value={summary.tillsClosed + (summary.silentSites ?? 0)}
          hint={
            (summary.silentSites ?? 0) > 0
              ? `${summary.tillsClosed} fermée(s) · ${summary.silentSites} silencieux`
              : undefined
          }
          dark={dark}
        />
      </div>

      {briefing.sites && briefing.sites.some((s) => s.actionCount > 0) ? (
        <div className="flex flex-wrap gap-1.5">
          {briefing.sites
            .filter((s) => s.actionCount > 0)
            .sort((a, b) => b.actionCount - a.actionCount)
            .map((site) => (
              <span
                key={site.schoolId}
                className={cn(
                  'rounded-full px-2 py-0.5 text-[10px] font-medium',
                  dark ? 'bg-white/10 text-slate-200' : 'bg-white border border-zinc-200 text-zinc-700',
                )}
              >
                {site.schoolName}
                <span className="tabular-nums text-amber-700 ml-1">{site.actionCount}</span>
              </span>
            ))}
        </div>
      ) : null}

      {queue.length > 0 ? (
        <ul
          className={cn(
            'divide-y rounded-xl overflow-hidden',
            dark ? 'divide-white/10 border border-white/10' : 'divide-zinc-100 border border-zinc-100 bg-white',
          )}
        >
          {queue.slice(0, 10).map((item) => (
            <li key={item.id}>
              <QueueRow item={item} dark={dark} linkable={linkable} />
            </li>
          ))}
        </ul>
      ) : null}

      {briefing.classesWithoutSheet.length > 0 ? (
        <BriefingList
          title="Cahiers d’appel"
          dark={dark}
          items={briefing.classesWithoutSheet.slice(0, 6).map((row) => ({
            key: `${row.schoolId}-${row.classId}`,
            title: `${row.className} · ${row.schoolName}`,
            hint: [
              row.status === 'DRAFT' ? 'Brouillon — à soumettre' : 'Non ouvert',
              row.teacherName ? `titulaire ${row.teacherName}` : null,
              row.waitingMinutes != null ? `${row.waitingMinutes} min` : null,
            ]
              .filter(Boolean)
              .join(' · '),
          }))}
        />
      ) : null}

      {briefing.pendingSms.length > 0 ? (
        <BriefingList
          title="SMS parents (élève pas encore crédité)"
          dark={dark}
          items={briefing.pendingSms.slice(0, 6).map((row) => ({
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
            title: `${row.studentName} · ${row.className ?? 'Classe'}`,
            hint: `${row.schoolName} · reste ${formatMoney(row.feesBalance)}`,
          }))}
        />
      ) : null}

      {briefing.tillsClosed.length > 0 ? (
        <BriefingList
          title="Caisse fermée alors qu’il y a de la présence"
          dark={dark}
          items={briefing.tillsClosed.map((row) => ({
            key: String(row.schoolId),
            title: row.schoolName,
            hint: 'Ouvrir la caisse du site',
          }))}
        />
      ) : null}

      {(briefing.silentSites ?? []).length > 0 ? (
        <BriefingList
          title="Sites encore silencieux"
          dark={dark}
          items={(briefing.silentSites ?? []).map((row) => ({
            key: `silent-${row.schoolId}`,
            title: row.schoolName,
            hint: 'Ni présence ni encaissement — les autres sites ont déjà commencé',
          }))}
        />
      ) : null}

      <p className={cn('text-[11px] flex items-center gap-1', dark ? 'text-slate-500' : 'text-zinc-400')}>
        <MessageSquare size={11} />
        Isolation groupe · {briefing.groupName ?? '—'}
      </p>
    </div>
  )
}

function NextActionCard({
  title,
  detail,
  severity,
  href,
  linkable,
  dark,
}: {
  title: string
  detail: string
  severity: NetworkOpsSeverity
  href: string
  linkable: boolean
  dark: boolean
}) {
  const body = (
    <>
      <p className="text-[10px] font-semibold uppercase tracking-wide text-amber-800/80">
        Faire maintenant
      </p>
      <p className={cn('text-sm font-semibold mt-0.5', dark ? 'text-white' : 'text-zinc-900')}>{title}</p>
      <p className={cn('text-[11px] mt-0.5', dark ? 'text-slate-400' : 'text-zinc-500')}>{detail}</p>
    </>
  )
  const cls = cn(
    'block rounded-xl px-3 py-2.5',
    severity === 'critical'
      ? 'bg-red-50 border border-red-200'
      : 'bg-white border border-amber-200',
    dark && 'bg-black/20 border-white/10',
  )
  if (linkable) {
    return (
      <Link href={href} className={cls}>
        {body}
      </Link>
    )
  }
  return <div className={cls}>{body}</div>
}

function QueueRow({
  item,
  dark,
  linkable,
}: {
  item: NonNullable<NetworkOpsBriefing['queue']>[number]
  dark: boolean
  linkable: boolean
}) {
  const inner = (
    <div className="px-3 py-2 flex items-start justify-between gap-2">
      <div className="min-w-0">
        <p className={cn('text-[12px] font-medium', dark ? 'text-white' : 'text-zinc-800')}>{item.title}</p>
        <p className={cn('text-[10px] truncate', dark ? 'text-slate-400' : 'text-zinc-500')}>{item.detail}</p>
      </div>
      <span
        className={cn(
          'shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-semibold uppercase',
          item.severity === 'critical' && 'bg-red-100 text-red-800',
          item.severity === 'warn' && 'bg-amber-100 text-amber-900',
          item.severity === 'info' && (dark ? 'bg-white/10 text-slate-300' : 'bg-zinc-100 text-zinc-600'),
        )}
      >
        {item.severity === 'critical' ? 'Critique' : item.severity === 'warn' ? 'Urgent' : 'Suivi'}
      </span>
    </div>
  )
  if (linkable) {
    return (
      <Link href={item.href} className="block hover:bg-zinc-50/80">
        {inner}
      </Link>
    )
  }
  return inner
}

function BriefingStat({
  icon: Icon,
  label,
  value,
  hint,
  dark,
}: {
  icon: typeof BookOpen
  label: string
  value: number
  hint?: string
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
      <p
        className={cn(
          'text-lg font-bold tabular-nums mt-0.5',
          value > 0 ? (dark ? 'text-amber-300' : 'text-amber-800') : dark ? 'text-emerald-300' : 'text-emerald-700',
        )}
      >
        {value}
      </p>
      {hint ? (
        <p className={cn('text-[10px]', dark ? 'text-slate-500' : 'text-zinc-400')}>{hint}</p>
      ) : null}
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
      <ul
        className={cn(
          'divide-y rounded-lg overflow-hidden',
          dark ? 'divide-white/10 border border-white/10' : 'divide-zinc-100 border border-zinc-100 bg-white',
        )}
      >
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
