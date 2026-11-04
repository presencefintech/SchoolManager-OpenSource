'use client'

import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { CreditCard, Crown, Sparkles, Zap } from 'lucide-react'
import { billingApi, type ProductPlan, type ProductPlanTier } from '@/lib/superAdmin/api/billing.api'
import { useSchools } from '@/lib/hooks/use-super-admin'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { cn } from '@/lib/utils'

const PLAN_ICONS: Record<ProductPlanTier, React.ElementType> = {
  STARTER: Sparkles,
  PRO: Zap,
  ENTERPRISE: Crown,
}

const STATUS_LABELS: Record<string, string> = {
  TRIAL: 'Essai',
  ACTIVE: 'Actif',
  PAST_DUE: 'Impayé',
  CANCELLED: 'Annulé',
  EXPIRED: 'Expiré',
  DEFAULT: 'Catalogue (Starter)',
}

function PlanCard({
  plan,
  current,
  onSelect,
  busy,
}: {
  plan: ProductPlan
  current: boolean
  onSelect: () => void
  busy: boolean
}) {
  const Icon = PLAN_ICONS[plan.code]
  return (
    <button
      type="button"
      disabled={busy || current}
      onClick={onSelect}
      className={cn(
        'rounded-2xl border p-5 text-left transition-all w-full',
        current
          ? 'border-indigo-300 bg-indigo-50/60 ring-2 ring-indigo-100'
          : 'border-zinc-200 bg-white hover:border-indigo-200 hover:shadow-sm',
        busy && 'opacity-60',
      )}
    >
      <div className="flex items-center gap-2 mb-2">
        <div className="w-9 h-9 rounded-xl bg-indigo-100 flex items-center justify-center text-indigo-700">
          <Icon size={16} />
        </div>
        <div>
          <p className="font-semibold text-zinc-900">{plan.name}</p>
          <p className="text-xs text-zinc-400">{plan.code}</p>
        </div>
      </div>
      <p className="text-2xl font-bold text-zinc-900 tabular-nums">
        {plan.priceUsdMonthly != null ? `${plan.priceUsdMonthly} USD` : 'Sur devis'}
        {plan.priceUsdMonthly != null ? (
          <span className="text-sm font-normal text-zinc-400"> / mois</span>
        ) : null}
      </p>
      <ul className="mt-3 space-y-1 text-xs text-zinc-600">
        <li>Devoirs / mois : {plan.maxAssignmentsPerMonth ?? 'Illimité'}</li>
        <li>Notifs / jour : {plan.maxHomeworkNotifsPerDay ?? 'Illimité'}</li>
      </ul>
      {current ? (
        <p className="mt-3 text-xs font-semibold text-indigo-700">Plan actuel</p>
      ) : (
        <p className="mt-3 text-xs font-medium text-indigo-600">Assigner →</p>
      )}
    </button>
  )
}

export default function SuperAdminBillingPage() {
  const qc = useQueryClient()
  const { data: schools = [] } = useSchools()
  const [schoolId, setSchoolId] = useState<number | ''>('')
  const [cancelReason, setCancelReason] = useState('')
  const [pendingPlan, setPendingPlan] = useState<ProductPlan | null>(null)
  const [cancelConfirmOpen, setCancelConfirmOpen] = useState(false)

  const { data: plans = [], isLoading: plansLoading } = useQuery({
    queryKey: ['superadmin', 'billing', 'plans'],
    queryFn: billingApi.listPlans,
  })

  const selectedId = schoolId === '' ? null : schoolId
  const { data: billing, isLoading: billingLoading } = useQuery({
    queryKey: ['superadmin', 'billing', 'school', selectedId],
    queryFn: () => billingApi.getSchoolBilling(selectedId!),
    enabled: selectedId != null,
  })

  const invalidate = () => {
    if (selectedId != null) {
      void qc.invalidateQueries({ queryKey: ['superadmin', 'billing', 'school', selectedId] })
    }
  }

  const assign = useMutation({
    mutationFn: (planCode: ProductPlanTier) =>
      billingApi.assignSchoolPlan(selectedId!, { planCode, status: 'ACTIVE' }),
    onSuccess: invalidate,
  })

  const cancel = useMutation({
    mutationFn: () => billingApi.cancelSchoolPlan(selectedId!, cancelReason.trim() || undefined),
    onSuccess: () => {
      setCancelReason('')
      invalidate()
    },
  })

  const currentCode = billing?.resolved.planCode
  const busy = assign.isPending || cancel.isPending

  return (
    <div className="max-w-6xl mx-auto px-6 py-8 space-y-8">
      <header>
        <p className="text-xs font-semibold uppercase tracking-wide text-indigo-600">Propriétaire</p>
        <h1 className="text-2xl font-bold text-slate-900 mt-1 flex items-center gap-2">
          <CreditCard size={22} className="text-indigo-600" />
          Abonnements SaaS
        </h1>
        <p className="text-sm text-slate-500 mt-1 max-w-2xl">
          Plans Starter / Pro / Enterprise — facturation produit Presence (distincte des paiements
          scolaires).
        </p>
      </header>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 space-y-3">
        <label className="block text-sm font-medium text-slate-700">
          Établissement
          <select
            value={schoolId}
            onChange={(e) => setSchoolId(e.target.value ? Number(e.target.value) : '')}
            className="mt-1 w-full max-w-md rounded-lg border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="">Choisir…</option>
            {schools.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
                {s.active === false ? ' (suspendu)' : ''}
              </option>
            ))}
          </select>
        </label>

        {selectedId != null && billingLoading ? (
          <p className="text-sm text-slate-400 animate-pulse">Chargement…</p>
        ) : billing ? (
          <div className="rounded-xl border border-indigo-100 bg-indigo-50/40 px-4 py-3 text-sm">
            <p className="font-medium text-indigo-950">{billing.school.name}</p>
            <p className="text-indigo-800/80 mt-1">
              Plan : <strong>{billing.resolved.planName}</strong> (
              {STATUS_LABELS[billing.resolved.subscriptionStatus] ?? billing.resolved.subscriptionStatus})
            </p>
          </div>
        ) : null}
      </section>

      {plansLoading ? (
        <p className="text-sm text-slate-400 animate-pulse">Catalogue…</p>
      ) : selectedId == null ? (
        <p className="text-sm text-slate-500">Sélectionnez un établissement.</p>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-3">
            {plans.map((plan) => (
              <PlanCard
                key={plan.id}
                plan={plan}
                current={currentCode === plan.code}
                busy={busy}
                onSelect={() => setPendingPlan(plan)}
              />
            ))}
          </div>

          {billing?.subscription && billing.subscription.status !== 'CANCELLED' ? (
            <section className="rounded-2xl border border-dashed border-red-200 bg-red-50/30 p-5 space-y-3">
              <h2 className="text-sm font-semibold text-red-900">Annuler l&apos;abonnement</h2>
              <textarea
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                rows={2}
                placeholder="Motif interne (optionnel)"
                className="w-full max-w-lg rounded-lg border border-red-200 px-3 py-2 text-sm"
              />
              <button
                type="button"
                disabled={busy}
                onClick={() => setCancelConfirmOpen(true)}
                className="rounded-lg border border-red-300 bg-white px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-50"
              >
                Annuler l&apos;abonnement
              </button>
            </section>
          ) : null}
        </>
      )}

      <ConfirmDialog
        open={pendingPlan != null}
        title="Assigner un plan"
        description={
          pendingPlan && billing
            ? `Assigner le plan ${pendingPlan.name} à ${billing.school.name} ?`
            : ''
        }
        impact={['Le plan sera actif immédiatement', 'Les quotas produit seront mis à jour']}
        confirmLabel="Assigner"
        loading={assign.isPending}
        onConfirm={() => {
          if (!pendingPlan) return
          assign.mutate(pendingPlan.code, { onSuccess: () => setPendingPlan(null) })
        }}
        onCancel={() => setPendingPlan(null)}
      />

      <ConfirmDialog
        open={cancelConfirmOpen}
        title="Annuler l'abonnement SaaS ?"
        description={
          billing
            ? `L'abonnement de ${billing.school.name} sera marqué comme annulé.`
            : ''
        }
        impact={['Les quotas produit reviendront au plan Starter', 'Action réversible via réassignation']}
        confirmLabel="Annuler l'abonnement"
        variant="danger"
        loading={cancel.isPending}
        onConfirm={() => {
          cancel.mutate(undefined, { onSuccess: () => setCancelConfirmOpen(false) })
        }}
        onCancel={() => setCancelConfirmOpen(false)}
      />
    </div>
  )
}
