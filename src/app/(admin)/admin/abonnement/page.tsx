'use client'

import Link from 'next/link'
import {
  AlertTriangle,
  BadgeCheck,
  CalendarClock,
  Check,
  ClipboardList,
  Gauge,
  MessageCircle,
  RefreshCw,
  Sparkles,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { getApiErrorMessage } from '@/lib/api/client'
import { AdminModuleHero } from '@/components/admin/shared/admin-module-hero'
import { useAssignmentUsage, useBillingPlans, useSchoolSubscription } from '@/lib/hooks/use-admin'
import {
  PLAN_ORDER,
  upgradeWhatsAppUrl,
  type PlanCatalogEntry,
  type PlanTier,
} from '@/lib/admin/billing.utils'

const STATUS_LABELS: Record<string, { label: string; className: string }> = {
  ACTIVE: { label: 'Actif', className: 'bg-emerald-50 text-emerald-700 ring-emerald-200' },
  TRIAL: { label: 'Essai', className: 'bg-sky-50 text-sky-700 ring-sky-200' },
  PAST_DUE: { label: 'Paiement en retard', className: 'bg-amber-50 text-amber-800 ring-amber-200' },
  CANCELLED: { label: 'Résilié', className: 'bg-zinc-100 text-zinc-600 ring-zinc-200' },
  EXPIRED: { label: 'Expiré', className: 'bg-red-50 text-red-700 ring-red-200' },
}

function formatDate(value: string | null | undefined): string | null {
  if (!value) return null
  const d = new Date(value)
  return Number.isNaN(d.getTime())
    ? null
    : d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
}

function formatPeriod(period: string | null): string {
  if (!period) return 'ce mois'
  const [y, m] = period.split('-').map(Number)
  if (!y || !m) return period
  return new Date(y, m - 1, 1).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })
}

function assignmentsLabel(plan: PlanCatalogEntry): string {
  return plan.unlimited || plan.maxAssignmentsPerMonth == null
    ? 'Devoirs illimités'
    : `${plan.maxAssignmentsPerMonth} devoirs / mois`
}

export default function SubscriptionPage() {
  const subscription = useSchoolSubscription()
  const plans = useBillingPlans()
  const usage = useAssignmentUsage()

  const current = subscription.data?.plan ?? null
  const currentCode: PlanTier | null = current?.code ?? usage.data?.planCode ?? null
  const currentRank = currentCode ? PLAN_ORDER.indexOf(currentCode) : -1
  const suggested = usage.data?.suggestedPlan ?? current?.suggestedUpgrade ?? null
  const schoolName = subscription.data?.school?.name ?? null
  const schoolId = subscription.data?.school?.id ?? null
  const status = subscription.data?.subscription?.status ?? null
  const statusMeta = status ? STATUS_LABELS[status] : null
  const periodEnd = formatDate(subscription.data?.subscription?.currentPeriodEnd)
  const trialEnd = formatDate(subscription.data?.subscription?.trialEndsAt)

  const u = usage.data
  const pct = u?.utilizationPct ?? 0
  const barColor = pct >= 100 ? 'bg-red-500' : pct >= 80 ? 'bg-amber-500' : 'bg-emerald-500'
  const anyLoading = subscription.isLoading || plans.isLoading || usage.isLoading
  const loadError = subscription.error ?? plans.error ?? usage.error

  function refresh() {
    void subscription.refetch()
    void plans.refetch()
    void usage.refetch()
  }

  function whatsapp(target: PlanCatalogEntry) {
    return upgradeWhatsAppUrl({
      schoolName,
      schoolId,
      currentPlan: current?.name ?? currentCode,
      targetPlan: target.name,
    })
  }

  return (
    <div className="min-h-full bg-[#e8ecf4]">
      <AdminModuleHero
        eyebrow="Établissement"
        title="Mon abonnement"
        subtitle={
          schoolName
            ? `${schoolName} · offre SchoolManager et consommation du mois`
            : 'Offre SchoolManager de votre établissement et consommation du mois'
        }
        actions={
          <button
            type="button"
            onClick={refresh}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-sm font-medium rounded-lg bg-white/10 text-white ring-1 ring-white/15 hover:bg-white/15 transition-colors"
          >
            <RefreshCw size={14} className={cn(anyLoading && 'animate-spin')} />
            Actualiser
          </button>
        }
        quickLinks={[{ href: '/admin/devoirs', label: 'Devoirs', icon: ClipboardList }]}
        metrics={[
          { label: 'Plan actuel', value: current?.name ?? u?.planName ?? '—', loading: subscription.isLoading, icon: BadgeCheck },
          {
            label: `Devoirs · ${formatPeriod(u?.period ?? null)}`,
            value: u ? (u.assignmentsLimit != null ? `${u.assignmentsCreated} / ${u.assignmentsLimit}` : u.assignmentsCreated) : '—',
            loading: usage.isLoading,
            icon: ClipboardList,
          },
          {
            label: 'Restant',
            value: u ? (u.assignmentsRemaining == null ? 'Illimité' : u.assignmentsRemaining) : '—',
            loading: usage.isLoading,
            icon: Gauge,
          },
        ]}
      />

      <div className="max-w-6xl mx-auto px-6 lg:px-8 py-6 space-y-5">
        {loadError ? (
          <div role="alert" className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <p>Impossible de charger l&apos;abonnement : {getApiErrorMessage(loadError)}</p>
          </div>
        ) : null}

        {u?.upsellRequired || u?.upsellSuggested ? (
          <div
            className={cn(
              'flex flex-col gap-3 rounded-xl border px-4 py-3 sm:flex-row sm:items-center sm:justify-between',
              u.upsellRequired ? 'border-red-200 bg-red-50 text-red-900' : 'border-amber-200 bg-amber-50 text-amber-900',
            )}
          >
            <div className="flex items-start gap-3">
              <Sparkles className="mt-0.5 h-4 w-4 shrink-0" />
              <div className="text-sm">
                <p className="font-semibold">
                  {u.upsellRequired
                    ? 'Quota de devoirs atteint : les enseignants ne peuvent plus en créer ce mois-ci.'
                    : `Vous avez utilisé ${pct} % de votre quota de devoirs.`}
                </p>
                {suggested ? (
                  <p className="text-xs mt-0.5 opacity-80">
                    Le plan {plans.data?.find((p) => p.code === suggested)?.name ?? suggested} couvrirait votre usage.
                  </p>
                ) : null}
              </div>
            </div>
            {suggested && plans.data?.find((p) => p.code === suggested) ? (
              <a
                href={whatsapp(plans.data.find((p) => p.code === suggested) as PlanCatalogEntry)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg bg-emerald-600 px-3.5 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
              >
                <MessageCircle size={15} />
                Demander l&apos;upgrade
              </a>
            ) : null}
          </div>
        ) : null}

        <div className="grid gap-5 lg:grid-cols-[1fr_1.4fr]">
          {/* Abonnement */}
          <section className="rounded-xl border border-zinc-200 bg-white p-5 space-y-4">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-sm font-semibold text-zinc-900">Votre abonnement</h2>
              {statusMeta ? (
                <span className={cn('rounded-full px-2.5 py-0.5 text-xs font-medium ring-1', statusMeta.className)}>
                  {statusMeta.label}
                </span>
              ) : null}
            </div>
            {subscription.isLoading ? (
              <div className="h-20 rounded-lg bg-zinc-100 animate-pulse" />
            ) : (
              <dl className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <dt className="text-xs text-zinc-500">Plan</dt>
                  <dd className="mt-0.5 font-semibold text-zinc-900">{current?.name ?? '—'}</dd>
                </div>
                <div>
                  <dt className="text-xs text-zinc-500">Devoirs inclus</dt>
                  <dd className="mt-0.5 font-semibold text-zinc-900">
                    {current ? (current.maxAssignmentsPerMonth == null ? 'Illimités' : `${current.maxAssignmentsPerMonth} / mois`) : '—'}
                  </dd>
                </div>
                {trialEnd ? (
                  <div>
                    <dt className="text-xs text-zinc-500">Fin de l&apos;essai</dt>
                    <dd className="mt-0.5 text-zinc-900">{trialEnd}</dd>
                  </div>
                ) : null}
                <div>
                  <dt className="text-xs text-zinc-500">Renouvellement</dt>
                  <dd className="mt-0.5 text-zinc-900 flex items-center gap-1.5">
                    <CalendarClock size={13} className="text-zinc-400" />
                    {periodEnd ?? (subscription.data?.subscription ? 'Sans échéance' : 'Offre par défaut')}
                  </dd>
                </div>
              </dl>
            )}

            <div className="border-t border-zinc-100 pt-4 space-y-2">
              <div className="flex items-baseline justify-between text-sm">
                <span className="font-medium text-zinc-700">Devoirs publiés · {formatPeriod(u?.period ?? null)}</span>
                <span className="tabular-nums text-zinc-500">
                  {u ? (u.assignmentsLimit != null ? `${u.assignmentsCreated} / ${u.assignmentsLimit}` : `${u.assignmentsCreated} (illimité)`) : '—'}
                </span>
              </div>
              {u?.assignmentsLimit != null ? (
                <div className="h-2.5 rounded-full bg-zinc-100 overflow-hidden" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
                  <div className={cn('h-full rounded-full transition-all', barColor)} style={{ width: `${pct}%` }} />
                </div>
              ) : null}
              {u ? (
                <p className="text-xs text-zinc-500">
                  {u.publishedOrClosedActive} devoir{u.publishedOrClosedActive > 1 ? 's' : ''} en cours ·{' '}
                  {u.submissionsThisMonth} rendu{u.submissionsThisMonth > 1 ? 's' : ''} ce mois-ci ·{' '}
                  <Link href="/admin/devoirs" className="font-medium text-emerald-700 hover:text-emerald-900">
                    voir les devoirs
                  </Link>
                </p>
              ) : null}
            </div>
          </section>

          {/* Comparatif */}
          <section className="rounded-xl border border-zinc-200 bg-white p-5 space-y-4">
            <h2 className="text-sm font-semibold text-zinc-900">Comparer les offres</h2>
            {plans.isLoading ? (
              <div className="grid gap-3 sm:grid-cols-3">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="h-40 rounded-lg bg-zinc-100 animate-pulse" />
                ))}
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-3">
                {(plans.data ?? []).map((plan) => {
                  const rank = PLAN_ORDER.indexOf(plan.code)
                  const isCurrent = plan.code === currentCode
                  const isUpgrade = currentRank >= 0 && rank > currentRank
                  const isSuggested = plan.code === suggested && isUpgrade
                  return (
                    <div
                      key={plan.code}
                      className={cn(
                        'flex flex-col rounded-lg border p-4',
                        isCurrent ? 'border-emerald-400 bg-emerald-50/50 ring-1 ring-emerald-400' : 'border-zinc-200',
                      )}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-semibold text-zinc-900">{plan.name}</p>
                        {isCurrent ? (
                          <span className="rounded-full bg-emerald-600 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">Actuel</span>
                        ) : isSuggested ? (
                          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-800">Conseillé</span>
                        ) : null}
                      </div>
                      {plan.priceUsdMonthly != null ? (
                        <p className="mt-1 text-sm text-zinc-500">{plan.priceUsdMonthly} $ / mois</p>
                      ) : null}
                      <ul className="mt-3 flex-1 space-y-1.5 text-sm text-zinc-700">
                        <li className="flex items-start gap-2">
                          <Check size={14} className="mt-0.5 shrink-0 text-emerald-600" />
                          {assignmentsLabel(plan)}
                        </li>
                        <li className="flex items-start gap-2">
                          <Check size={14} className="mt-0.5 shrink-0 text-emerald-600" />
                          {plan.maxHomeworkNotifsPerDay == null
                            ? 'Notifications devoirs illimitées'
                            : `${plan.maxHomeworkNotifsPerDay} notifications devoirs / jour`}
                        </li>
                      </ul>
                      {isUpgrade ? (
                        <a
                          href={whatsapp(plan)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={cn(
                            'mt-4 inline-flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold',
                            isSuggested
                              ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                              : 'border border-zinc-200 text-zinc-700 hover:bg-zinc-50',
                          )}
                        >
                          <MessageCircle size={14} />
                          Passer à {plan.name}
                        </a>
                      ) : null}
                    </div>
                  )
                })}
                {!plans.isLoading && !plans.data?.length ? (
                  <p className="text-sm text-zinc-500 sm:col-span-3">Aucune offre disponible pour le moment.</p>
                ) : null}
              </div>
            )}
            <p className="text-xs text-zinc-500">
              Le changement d&apos;offre est traité par l&apos;équipe SchoolManager : le bouton ouvre une conversation
              WhatsApp avec votre demande pré-remplie.
            </p>
          </section>
        </div>
      </div>
    </div>
  )
}
