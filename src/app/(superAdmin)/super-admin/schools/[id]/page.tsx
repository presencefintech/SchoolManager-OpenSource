'use client'

import Link from 'next/link'
import {
  ArrowLeft, GraduationCap, BookOpen, Banknote, Users,
  TrendingUp, TrendingDown, AlertTriangle, ShieldCheck,
  CreditCard, Clock, Target, Activity,
} from 'lucide-react'
import {
  useSchool,
  useSchoolPerformance,
  useSchoolPaymentDashboard,
  useSchoolAnomalies,
} from '@/lib/hooks/use-super-admin'
import { cn } from '@/lib/utils'

/* ── helpers ──────────────────────────────────────────────────────────────── */
const fmt = (n: number) =>
  new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'XOF', maximumFractionDigits: 0 }).format(n)

const pct = (n: number) => `${Math.round(n)}%`

function Sk({ className }: { className?: string }) {
  return <div className={cn('rounded-xl bg-zinc-100 animate-pulse', className)} />
}

function Stat({
  label, value, sub, icon: Icon, alert = false,
}: {
  label: string; value: string | number; sub?: string
  icon: React.ElementType; alert?: boolean
}) {
  return (
    <div className="bg-white rounded-2xl border border-zinc-100 shadow-sm px-5 py-4">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-medium text-zinc-400">{label}</span>
        <Icon size={13} className={alert ? 'text-red-300' : 'text-zinc-200'} />
      </div>
      <p className={cn('text-xl font-semibold tabular-nums', alert ? 'text-red-600' : 'text-zinc-900')}>
        {value}
      </p>
      {sub && <p className="text-[11px] text-zinc-400 mt-1.5">{sub}</p>}
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════ */
export default function SchoolDetailPage({ params }: { params: { id: string } }) {
  const id = Number(params.id)

  const { data: school, isLoading: loadingSchool, isError } = useSchool(id)
  const { data: perf, isLoading: loadingPerf } = useSchoolPerformance(id)
  const { data: payDash, isLoading: loadingPay } = useSchoolPaymentDashboard(id)
  const { data: anomalies, isLoading: loadingAno } = useSchoolAnomalies(id)

  return (
    <div className="min-h-screen bg-zinc-50">

      {/* ── PAGE HEADER ──────────────────────────────────────────────────────── */}
      <div className="bg-white border-b border-zinc-100">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <Link
            href="/super-admin/schools"
            className="inline-flex items-center gap-1.5 text-xs text-zinc-400 hover:text-zinc-700 transition-colors mb-4"
          >
            <ArrowLeft size={12} />
            Établissements
          </Link>
          {isError && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 mb-4">
              Impossible de charger cet établissement.
            </div>
          )}
          {loadingSchool
            ? <Sk className="h-12 w-72" />
            : school && (
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div>
                  <h1 className="text-[22px] font-semibold text-zinc-900 tracking-tight">{school.name}</h1>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    {school.city}
                    {school.email && ` · ${school.email}`}
                  </p>
                </div>
                {school.deletedAt && (
                  <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-red-50 text-red-600 ring-1 ring-red-200">
                    Désactivée
                  </span>
                )}
              </div>
            )}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-6 space-y-6">

        {/* ══ 1. VUE D'ENSEMBLE ═════════════════════════════════════════════ */}
        <div>
          <p className="text-xs font-medium text-zinc-400 mb-3">Vue d'ensemble</p>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {loadingSchool
              ? Array.from({ length: 4 }).map((_, i) => <Sk key={i} className="h-20" />)
              : school && (
                <>
                  <Stat label="Élèves" value={school._count.students} icon={GraduationCap} />
                  <Stat label="Classes" value={school._count.classes} icon={BookOpen} />
                  <Stat label="Paiements confirmés" value={school._count.payments} icon={Banknote} />
                  <Stat label="Administrateurs" value={school.admins.length} icon={Users} />
                </>
              )}
          </div>
        </div>

        {/* ══ 2. PERFORMANCE FINANCIÈRE ══════════════════════════════════════ */}
        <div>
          <p className="text-xs font-medium text-zinc-400 mb-3">Performance financière</p>
          {loadingPerf
            ? <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">{Array.from({ length: 4 }).map((_, i) => <Sk key={i} className="h-20" />)}</div>
            : perf && (
              <div className="space-y-3">
                {/* Santé banner */}
                <div className={cn(
                  'flex items-center gap-2 px-4 py-3 rounded-xl border text-sm font-medium',
                  perf.isHealthy
                    ? 'bg-emerald-50 border-emerald-100 text-emerald-700'
                    : 'bg-red-50 border-red-100 text-red-700',
                )}>
                  {perf.isHealthy
                    ? <ShieldCheck size={14} />
                    : <AlertTriangle size={14} />}
                  {perf.isHealthy
                    ? 'Taux de recouvrement sain — objectif atteint'
                    : 'Taux de recouvrement insuffisant — action requise'}
                </div>

                <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
                  <Stat label="Encaissé" value={fmt(perf.collected)} icon={TrendingUp} />
                  <Stat label="Reste à encaisser" value={fmt(perf.remaining)} icon={TrendingDown} />
                  <Stat
                    label="Efficacité recouvrement"
                    value={pct(perf.efficiency)}
                    sub={`Seuil rentabilité : ${perf.breakEvenThreshold} élèves`}
                    icon={Target}
                  />
                </div>

                {/* Progress */}
                <div className="bg-white rounded-2xl border border-zinc-100 shadow-sm p-5">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-medium text-zinc-500">Progression du recouvrement</span>
                    <span className="text-xs font-semibold text-zinc-900 tabular-nums">{pct(perf.efficiency)}</span>
                  </div>
                  <div className="h-1.5 bg-zinc-100 rounded-full overflow-hidden">
                    <div
                      className={cn(
                        'h-full rounded-full transition-all duration-500',
                        perf.efficiency >= 70 ? 'bg-emerald-500'
                        : perf.efficiency >= 40 ? 'bg-amber-400' : 'bg-red-500',
                      )}
                      style={{ width: `${Math.min(perf.efficiency, 100)}%` }}
                    />
                  </div>
                  <div className="flex justify-between mt-2 text-[11px] text-zinc-400">
                    <span>0%</span>
                    <span>Objectif 70%</span>
                    <span>100%</span>
                  </div>
                </div>
              </div>
            )}
        </div>

        {/* ══ 3. DASHBOARD PAIEMENTS ═════════════════════════════════════════ */}
        <div>
          <p className="text-xs font-medium text-zinc-400 mb-3">Dashboard paiements</p>
          {loadingPay
            ? <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">{Array.from({ length: 6 }).map((_, i) => <Sk key={i} className="h-20" />)}</div>
            : payDash && (
              <div className="space-y-3">
                {payDash.audit.suspiciousActivity && (
                  <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-red-50 border border-red-100 text-sm text-red-700 font-medium">
                    <AlertTriangle size={14} />
                    Activité suspecte détectée — audit recommandé
                  </div>
                )}
                <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
                  <Stat label="Revenus du mois" value={fmt(payDash.performance.monthlyRevenue)} icon={Banknote} />
                  <Stat
                    label="Revenus projetés"
                    value={fmt(payDash.performance.projectedRevenue)}
                    sub="Projection fin de mois"
                    icon={TrendingUp}
                  />
                  <Stat
                    label="ARPU"
                    value={fmt(payDash.performance.arpu)}
                    sub="Revenu moyen / élève"
                    icon={Activity}
                  />
                  <Stat label="Impayés total" value={fmt(payDash.treasury.totalUnpaid)} icon={CreditCard} alert />
                  <Stat
                    label="Vérifications en attente"
                    value={payDash.audit.pendingVerifications}
                    icon={Clock}
                    alert={payDash.audit.pendingVerifications > 0}
                  />
                  <Stat
                    label="Adoption digitale"
                    value={pct(payDash.performance.digitalAdoption)}
                    sub="Paiements non-cash"
                    icon={ShieldCheck}
                  />
                </div>
              </div>
            )}
        </div>

        {/* ══ 4. ANOMALIES ═══════════════════════════════════════════════════ */}
        <div>
          <p className="text-xs font-medium text-zinc-400 mb-3">Détection d'anomalies</p>
          {loadingAno
            ? <Sk className="h-28" />
            : anomalies && (
              <div className="space-y-3">
                <div className="bg-white rounded-2xl border border-zinc-100 shadow-sm px-5 py-4 flex items-center justify-between flex-wrap gap-3">
                  <div className="flex items-center gap-2">
                    {anomalies.severity === 'HIGH'
                      ? <AlertTriangle size={14} className="text-red-500" />
                      : <ShieldCheck size={14} className="text-emerald-500" />}
                    <span className="text-sm font-medium text-zinc-800">
                      Sévérité :{' '}
                      <span className={cn('font-semibold', anomalies.severity === 'HIGH' ? 'text-red-600' : 'text-emerald-600')}>
                        {anomalies.severity === 'HIGH' ? 'Élevée' : 'Faible'}
                      </span>
                    </span>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-zinc-500">
                    {anomalies.deviance !== undefined && (
                      <span>Déviance : <span className="font-mono font-semibold text-zinc-800">{anomalies.deviance.toFixed(2)}</span></span>
                    )}
                    {anomalies.benfordValid !== undefined && (
                      <span className={cn('font-medium', anomalies.benfordValid ? 'text-emerald-600' : 'text-red-600')}>
                        Benford : {anomalies.benfordValid ? '✓ valide' : '✗ invalide'}
                      </span>
                    )}
                  </div>
                </div>

                {anomalies.reason
                  ? <p className="text-sm text-zinc-500 px-1">{anomalies.reason}</p>
                  : anomalies.anomalies.length === 0
                    ? <p className="text-sm text-zinc-400 px-1">Aucune transaction suspecte détectée.</p>
                    : (
                      <div className="bg-white rounded-2xl border border-zinc-100 shadow-sm overflow-hidden">
                        <div className="divide-y divide-zinc-50">
                          {anomalies.anomalies.slice(0, 8).map((a) => (
                            <div key={a.id} className="flex items-center justify-between px-5 py-3.5">
                              <div>
                                <p className="text-sm font-semibold text-zinc-900 tabular-nums">{fmt(a.amount)}</p>
                                <p className="text-xs text-zinc-400 capitalize mt-0.5">
                                  {a.method.toLowerCase().replace(/_/g, ' ')}
                                </p>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-zinc-400 tabular-nums">dev. {a.audit.deviance.toFixed(1)}</span>
                                <span className="w-2 h-2 rounded-full bg-red-500 flex-shrink-0" />
                              </div>
                            </div>
                          ))}
                        </div>
                        {anomalies.anomalies.length > 8 && (
                          <p className="text-xs text-zinc-400 px-5 py-3 border-t border-zinc-50">
                            + {anomalies.anomalies.length - 8} autres transactions suspectes
                          </p>
                        )}
                      </div>
                    )}
              </div>
            )}
        </div>

        {/* ══ 5. ADMINISTRATEURS ═════════════════════════════════════════════ */}
        <div>
          <p className="text-xs font-medium text-zinc-400 mb-3">Administrateurs</p>
          {loadingSchool
            ? <div className="space-y-2">{Array.from({ length: 2 }).map((_, i) => <Sk key={i} className="h-14" />)}</div>
            : school?.admins.length
              ? (
                <div className="bg-white rounded-2xl border border-zinc-100 shadow-sm overflow-hidden">
                  <div className="divide-y divide-zinc-50">
                    {school.admins.map((admin) => (
                      <div key={admin.id} className="flex items-center justify-between px-5 py-3.5">
                        <div>
                          <p className="text-sm font-medium text-zinc-900">
                            {admin.user.firstName} {admin.user.lastName}
                          </p>
                          <p className="text-xs text-zinc-400 mt-0.5">{admin.user.email}</p>
                        </div>
                        <span className="text-[11px] font-medium text-zinc-500 bg-zinc-50 ring-1 ring-zinc-200 px-2 py-0.5 rounded-full">
                          {admin.roleName}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )
              : school
                ? <p className="text-sm text-zinc-400">Aucun administrateur assigné.</p>
                : null}
        </div>

      </div>
    </div>
  )
}
