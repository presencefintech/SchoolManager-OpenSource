'use client'

import Link from 'next/link'
import {
  ArrowRight,
  AlertTriangle,
  Brain,
  ClipboardCheck,
  Phone,
  ShieldAlert,
  Sparkles,
  Target,
  Users,
} from 'lucide-react'
import {
  useFinanceRoleAiInsights,
  useFinanceRoleAuditLogs,
  useFinanceRoleEfficiency,
  useFinanceRoleFraudAlerts,
  useFinanceRoleHealthCheck,
  useFinanceRoleStrategic,
  useHighRisk,
  usePendingPayments,
} from '@/lib/hooks/use-finance'
import { FinanceAiInsightsPanel } from '@/components/admin/finance/FinanceAiInsightsPanel'
import { FinancePageHeader, FinancePageShell, FinancePanel } from '@/components/finance/finance-page-shell'
import { formatMoney } from '@/lib/finance/currency'
import { cn } from '@/lib/utils'
import type { FinanceAiCollectionAction } from '@/lib/admin/finance-ai.utils'

const PRIORITY_CLS = {
  HIGH: 'bg-rose-50 text-rose-700 ring-rose-200',
  MEDIUM: 'bg-amber-50 text-amber-800 ring-amber-200',
  LOW: 'bg-slate-50 text-slate-600 ring-slate-200',
} as const

function ActionRow({ action }: { action: FinanceAiCollectionAction }) {
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-xl border border-zinc-100 bg-white px-3 py-2.5">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-sm font-semibold text-zinc-900 truncate">{action.studentName}</p>
          <span
            className={cn(
              'rounded-full px-2 py-0.5 text-[10px] font-bold ring-1',
              PRIORITY_CLS[action.priority],
            )}
          >
            {action.priority}
          </span>
          <span className="text-[10px] text-zinc-400">risk {action.riskScore}</span>
        </div>
        <p className="text-[11px] text-zinc-500 mt-0.5">
          {action.className ?? 'Sans classe'} · dette {formatMoney(action.debtAmount)} · récup.{' '}
          {formatMoney(action.expectedRecovery)}
        </p>
        <p className="text-[11px] text-emerald-700 mt-0.5 flex items-center gap-1">
          <Phone size={11} />
          {action.recommendedAction}
        </p>
      </div>
      <Link
        href={`/finances/eleves/${action.studentId}`}
        className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-1.5 text-[11px] font-bold text-white hover:bg-emerald-500"
      >
        Traiter
        <ArrowRight size={11} />
      </Link>
    </div>
  )
}

export default function FinanceIntelligencePage() {
  const { data: health } = useFinanceRoleHealthCheck()
  const { data: strategic } = useFinanceRoleStrategic()
  const { data: efficiency } = useFinanceRoleEfficiency()
  const { data: fraud } = useFinanceRoleFraudAlerts()
  const { data: auditLogs = [] } = useFinanceRoleAuditLogs({ limit: 8 })
  const { data: highRiskData } = useHighRisk()
  const { data: pendingData } = usePendingPayments()
  const { data: ai } = useFinanceRoleAiInsights(30)

  const highRisk = (highRiskData as { data?: unknown[] } | unknown[] | undefined)
  const highRiskList = Array.isArray(highRisk)
    ? highRisk
    : Array.isArray((highRisk as { data?: unknown[] })?.data)
      ? ((highRisk as { data: unknown[] }).data)
      : []
  const pendingList = pendingData?.items ?? []
  const fraudCount = fraud?.length ?? 0
  const levels = Array.isArray(efficiency) ? efficiency : []
  const topLevel = levels
    .slice()
    .sort((a: { efficiency?: number }, b: { efficiency?: number }) => (a.efficiency ?? 100) - (b.efficiency ?? 100))[0] as
    | { levelName?: string; efficiency?: number; totalDue?: number }
    | undefined

  return (
    <FinancePageShell>
      <FinancePageHeader
        title="Intelligence financière"
        subtitle="Pilotage premium — prévisions, file d’actions, risques et santé portefeuille"
        accent="violet"
        badge={
          <span className="inline-flex items-center gap-1 rounded-full bg-violet-50 px-2 py-0.5 text-[10px] font-semibold text-violet-700 ring-1 ring-violet-100">
            <Sparkles size={10} />
            Premium
          </span>
        }
        actions={
          <>
            <Link
              href="/finances/relances"
              className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50"
            >
              <Users size={13} />
              Relances
            </Link>
            <Link
              href="/finances/verifications"
              className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50"
            >
              <ClipboardCheck size={13} />
              Vérifications
            </Link>
          </>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          {
            label: 'Santé',
            value: health ? String(health.healthScore) : '—',
            sub: health ? `${health.efficiency.toFixed(0)}% recouvrement` : 'Chargement…',
            tone: health?.isHealthy ? 'text-emerald-700 bg-emerald-50' : 'text-amber-700 bg-amber-50',
            icon: Brain,
          },
          {
            label: 'File vérif.',
            value: String(pendingList.length),
            sub: 'paiements en attente',
            tone: 'text-amber-700 bg-amber-50',
            icon: ClipboardCheck,
          },
          {
            label: 'Risque élevé',
            value: String(highRiskList.length),
            sub: 'profils à traiter',
            tone: 'text-rose-700 bg-rose-50',
            icon: AlertTriangle,
          },
          {
            label: 'Alertes fraude',
            value: String(fraudCount),
            sub: 'signaux audit',
            tone: 'text-violet-700 bg-violet-50',
            icon: ShieldAlert,
          },
        ].map((kpi) => {
          const Icon = kpi.icon
          return (
            <div key={kpi.label} className="rounded-2xl border border-zinc-200/80 bg-white px-4 py-4 shadow-sm">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-400">{kpi.label}</p>
                  <p className="mt-1 text-2xl font-bold tabular-nums text-zinc-900">{kpi.value}</p>
                  <p className="mt-0.5 text-[11px] text-zinc-500">{kpi.sub}</p>
                </div>
                <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center', kpi.tone)}>
                  <Icon size={16} />
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {(strategic || topLevel) && (
        <div className="grid gap-3 sm:grid-cols-3">
          <FinancePanel title="KPI stratégique" className="sm:col-span-2">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-5">
              {[
                { label: 'Collecté', value: formatMoney(Number(strategic?.totalPaid ?? 0)) },
                { label: 'Dû', value: formatMoney(Number(strategic?.totalDue ?? 0)) },
                { label: 'Efficacité', value: `${Number(strategic?.collectionRate ?? 0).toFixed(0)}%` },
                { label: 'Pending', value: String(strategic?.pendingPayments ?? pendingList.length) },
              ].map((row) => (
                <div key={row.label} className="rounded-xl bg-zinc-50 px-3 py-2">
                  <p className="text-[10px] uppercase text-zinc-400">{row.label}</p>
                  <p className="text-sm font-bold tabular-nums text-zinc-900 mt-0.5">{row.value}</p>
                </div>
              ))}
            </div>
          </FinancePanel>
          <FinancePanel title="Hotspot niveau">
            <div className="p-5">
              {topLevel ? (
                <div>
                  <p className="text-sm font-semibold text-zinc-900">{topLevel.levelName ?? '—'}</p>
                  <p className="text-xs text-zinc-500 mt-1">
                    Efficacité {Number(topLevel.efficiency ?? 0).toFixed(0)}% · dû{' '}
                    {formatMoney(Number(topLevel.totalDue ?? 0))}
                  </p>
                </div>
              ) : (
                <p className="text-xs text-zinc-400">Pas assez de données niveaux.</p>
              )}
            </div>
          </FinancePanel>
        </div>
      )}

      <FinanceAiInsightsPanel enabled source="finance" />

      <div className="grid gap-4 lg:grid-cols-2">
        <FinancePanel
          title="File d’actions scoring"
          headerRight={
            <Link href="/finances/debiteurs" className="text-[11px] font-semibold text-emerald-700 hover:underline">
              Voir débiteurs
            </Link>
          }
        >
          <div className="space-y-2 p-5">
            {(ai?.collectionActions ?? []).slice(0, 6).map((a) => (
              <ActionRow key={a.studentId} action={a} />
            ))}
            {(ai?.collectionActions?.length ?? 0) === 0 && (
              <p className="text-xs text-zinc-400 py-4 text-center">Aucune action prioritaire pour l’instant.</p>
            )}
          </div>
        </FinancePanel>

        <FinancePanel title="Journal audit récent">
          <div className="space-y-2 p-5">
            {(auditLogs as Array<Record<string, unknown>>).slice(0, 8).map((log, i) => (
              <div
                key={String(log.id ?? i)}
                className="flex items-start justify-between gap-2 rounded-xl border border-zinc-100 px-3 py-2"
              >
                <div className="min-w-0">
                  <p className="text-xs font-medium text-zinc-800 truncate">
                    {String(log.action ?? log.event ?? log.type ?? 'Événement')}
                  </p>
                  <p className="text-[10px] text-zinc-400 mt-0.5 truncate">
                    {String(log.entityType ?? log.resource ?? '')}
                    {log.createdAt ? ` · ${new Date(String(log.createdAt)).toLocaleString('fr-FR')}` : ''}
                  </p>
                </div>
                <Target size={12} className="text-zinc-300 shrink-0 mt-0.5" />
              </div>
            ))}
            {auditLogs.length === 0 && (
              <p className="text-xs text-zinc-400 py-4 text-center">Aucun log récent.</p>
            )}
          </div>
        </FinancePanel>
      </div>
    </FinancePageShell>
  )
}
