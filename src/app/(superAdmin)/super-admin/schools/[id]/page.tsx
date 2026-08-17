'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import {
  ArrowLeft, GraduationCap, BookOpen, Banknote, Users,
  TrendingUp, TrendingDown, AlertTriangle, ShieldCheck,
  CreditCard, Clock, Target, Activity, TriangleAlert,
  Building2, MapPin, Mail, BarChart3, PieChart as PieIcon,
  UserCheck, UserX, Wallet, ExternalLink, Sparkles,
} from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from 'recharts'
import {
  useSchool,
  useSchoolPerformance,
  useSchoolPaymentDashboard,
  useSchoolAnomalies,
  useClasses,
  useCapacityAlerts,
  usePresenceDashboard,
  useStudentSchoolStats,
  useFinanceEfficiency,
} from '@/lib/hooks/use-super-admin'
import { cn } from '@/lib/utils'
import { Skeleton } from '@/components/ui/skeleton'
import { formatMoney } from '@/lib/finance/currency'
import { SchoolSuspensionPanel } from '@/components/super-admin/school-suspension-panel'
import { SchoolGodModePanel } from '@/components/super-admin/school-god-mode-panel'

/* ── helpers ──────────────────────────────────────────────────────────────── */
const fmt = (n: number) => formatMoney(n)

const fmtShort = (n: number) => {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}k`
  return String(n)
}

const pct = (n: number) => `${Math.round(n)}%`

const CHART_COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899', '#84cc16']

function Sk({ className }: { className?: string }) {
  return <div className={cn('rounded-2xl bg-zinc-100/80 animate-pulse', className)} />
}

function Panel({
  children, className, padding = true,
}: { children: React.ReactNode; className?: string; padding?: boolean }) {
  return (
    <div className={cn(
      'bg-white rounded-2xl border border-zinc-200/80 shadow-[0_1px_3px_rgba(0,0,0,0.04)]',
      padding && 'p-6',
      className,
    )}>
      {children}
    </div>
  )
}

function PanelHeader({
  icon: Icon, iconClass, title, description, action,
}: {
  icon: React.ElementType
  iconClass?: string
  title: string
  description?: string
  action?: React.ReactNode
}) {
  return (
    <div className="flex items-start justify-between gap-4 mb-5">
      <div className="flex items-start gap-3">
        <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0', iconClass ?? 'bg-indigo-50 text-indigo-600')}>
          <Icon size={18} />
        </div>
        <div>
          <h2 className="text-sm font-semibold text-zinc-900">{title}</h2>
          {description && <p className="text-xs text-zinc-500 mt-0.5 leading-relaxed max-w-prose">{description}</p>}
        </div>
      </div>
      {action}
    </div>
  )
}

function KpiCard({
  label, value, sub, icon: Icon, tone = 'neutral',
}: {
  label: string; value: string | number; sub?: string
  icon: React.ElementType; tone?: 'neutral' | 'ok' | 'warn' | 'danger'
}) {
  const tones = {
    neutral: { ring: 'ring-zinc-500/5', icon: 'bg-zinc-100 text-zinc-600', val: 'text-zinc-900' },
    ok: { ring: 'ring-emerald-500/10', icon: 'bg-emerald-50 text-emerald-600', val: 'text-emerald-700' },
    warn: { ring: 'ring-amber-500/10', icon: 'bg-amber-50 text-amber-600', val: 'text-amber-700' },
    danger: { ring: 'ring-red-500/10', icon: 'bg-red-50 text-red-600', val: 'text-red-600' },
  }[tone]

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn('rounded-2xl border border-zinc-200/80 bg-white p-5 shadow-sm ring-1', tones.ring)}
    >
      <div className="flex items-center justify-between mb-3">
        <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">{label}</span>
        <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center', tones.icon)}>
          <Icon size={15} />
        </div>
      </div>
      <p className={cn('text-2xl font-bold tabular-nums tracking-tight', tones.val)}>{value}</p>
      {sub && <p className="text-[11px] text-zinc-400 mt-1.5">{sub}</p>}
    </motion.div>
  )
}

function ChartTooltip({ active, payload, label, formatter }: {
  active?: boolean
  payload?: Array<{ name: string; value: number; color: string }>
  label?: string
  formatter?: (v: number) => string
}) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-zinc-900/95 text-white text-xs rounded-lg px-3 py-2 shadow-xl border border-zinc-700/50">
      {label && <p className="text-zinc-400 mb-1">{label}</p>}
      {payload.map((p) => (
        <p key={p.name} className="font-medium tabular-nums">
          <span className="inline-block w-2 h-2 rounded-full mr-1.5" style={{ backgroundColor: p.color }} />
          {p.name} : {formatter ? formatter(p.value) : p.value}
        </p>
      ))}
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
  const { data: classes, isLoading: loadingClasses } = useClasses(id)
  const { data: capacityAlerts, isLoading: loadingCapacity } = useCapacityAlerts(id)
  const { data: presence, isLoading: loadingPresence } = usePresenceDashboard(id)
  const { data: studentStats, isLoading: loadingStats } = useStudentSchoolStats(id)
  const { data: efficiencyLevels, isLoading: loadingEfficiency } = useFinanceEfficiency(id)

  /* ── chart datasets (real API data) ── */
  const financePie = perf && (perf.collected > 0 || perf.remaining > 0)
    ? [
        { name: 'Encaissé', value: perf.collected, color: '#10b981' },
        { name: 'Reste à encaisser', value: perf.remaining, color: '#f59e0b' },
      ]
    : []

  const presencePie = studentStats
    ? [
        { name: 'Présents', value: studentStats.presentToday, color: '#10b981' },
        { name: 'Retards', value: studentStats.lateToday, color: '#f59e0b' },
        {
          name: 'Absents',
          value: Math.max(0, studentStats.totalStudents - studentStats.presentToday),
          color: '#ef4444',
        },
      ].filter((d) => d.value > 0)
    : presence
      ? [
          { name: 'Présents', value: presence.stats.presentCount, color: '#10b981' },
          { name: 'Absents', value: presence.stats.absentCount, color: '#ef4444' },
        ].filter((d) => d.value > 0)
      : []

  const classBarData = (classes?.data ?? [])
    .slice(0, 8)
    .map((cls) => ({
      name: cls.name.length > 14 ? `${cls.name.slice(0, 14)}…` : cls.name,
      élèves: cls._count.students,
      capacité: cls.maxStudents ?? cls._count.students,
      taux: cls.maxStudents
        ? Math.round((cls._count.students / cls.maxStudents) * 100)
        : 100,
    }))

  const treasuryBar = payDash
    ? [
        { label: 'Mois en cours', montant: payDash.performance.monthlyRevenue },
        { label: 'Projection', montant: payDash.performance.projectedRevenue },
        { label: 'Impayés', montant: payDash.treasury.totalUnpaid },
        { label: 'ARPU', montant: payDash.performance.arpu },
      ]
    : []

  const efficiencyBar = (efficiencyLevels ?? []).map((lvl) => ({
    name: lvl.levelName.length > 12 ? `${lvl.levelName.slice(0, 12)}…` : lvl.levelName,
    efficacité: Math.round(lvl.efficiency),
    élèves: lvl.studentCount,
  }))

  const quickLinks = [
    { href: `/super-admin/students`, label: 'Élèves', icon: GraduationCap },
    { href: `/super-admin/presence`, label: 'Présence', icon: UserCheck },
    { href: `/super-admin/finance`, label: 'Finance', icon: Wallet },
    { href: `/super-admin/enrollment`, label: 'Inscriptions', icon: Sparkles },
  ]

  return (
    <div className="min-h-screen bg-gradient-to-b from-zinc-50 via-white to-zinc-50/80">

      {/* ── HEADER ─────────────────────────────────────────────────────────── */}
      <div className="bg-white border-b border-zinc-200/80">
        <div className="max-w-7xl mx-auto px-6 py-5">
          <Link
            href="/super-admin/schools"
            className="inline-flex items-center gap-1.5 text-xs text-zinc-400 hover:text-zinc-600 transition-colors mb-4"
          >
            <ArrowLeft size={12} />
            Retour aux établissements
          </Link>

          {isError && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600 mb-4">
              Impossible de charger cet établissement.
            </div>
          )}

          {loadingSchool ? (
            <Skeleton className="h-12 w-80" />
          ) : school && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-xl bg-zinc-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Building2 size={17} className="text-zinc-500" />
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h1 className="text-base font-semibold text-zinc-900">{school.name}</h1>
                      {school.deletedAt ? (
                        <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-md bg-red-50 text-red-600 border border-red-100">
                          Supprimée
                        </span>
                      ) : school.active === false ? (
                        <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-md bg-red-50 text-red-600 border border-red-100">
                          Suspendue
                        </span>
                      ) : (
                        <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-md bg-emerald-50 text-emerald-600 border border-emerald-100">
                          Active
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-zinc-400 mt-1">
                      {school.city && (
                        <span className="inline-flex items-center gap-1">
                          <MapPin size={11} /> {school.city}
                        </span>
                      )}
                      {school.email && (
                        <span className="inline-flex items-center gap-1">
                          <Mail size={11} /> {school.email}
                        </span>
                      )}
                      <span>ID #{school.id}</span>
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  {quickLinks.map((link) => (
                    <Link
                      key={link.href}
                      href={link.href}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-zinc-600 bg-white border border-zinc-200 hover:bg-zinc-50 hover:text-zinc-800 transition-colors"
                    >
                      <link.icon size={12} />
                      {link.label}
                    </Link>
                  ))}
                </div>
              </div>

              {/* KPI strip */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5 pt-5 border-t border-zinc-100">
                {[
                  {
                    label: 'Élèves inscrits',
                    value: school._count.students,
                    sub: studentStats?.presentToday != null ? `${studentStats.presentToday} présents auj.` : undefined,
                    icon: GraduationCap,
                  },
                  {
                    label: 'Taux présence',
                    value: studentStats?.attendanceRate != null ? `${Math.round(studentStats.attendanceRate)}%` : `${school._count.classes} classes`,
                    sub: studentStats?.attendanceRate != null
                      ? (studentStats.attendanceRate >= 70 ? 'Objectif atteint' : 'Sous l\'objectif')
                      : undefined,
                    icon: studentStats ? Activity : BookOpen,
                  },
                  {
                    label: 'Recouvrement',
                    value: perf?.efficiency != null ? `${Math.round(perf.efficiency)}%` : `${school._count.payments} paiements`,
                    sub: perf?.isHealthy != null ? (perf.isHealthy ? 'Objectif atteint' : 'Sous le seuil') : undefined,
                    icon: perf ? Target : Banknote,
                  },
                  {
                    label: 'Admins',
                    value: school.admins.length,
                    sub:
                      school.active === false
                        ? 'Établissement suspendu'
                        : school.deletedAt === null
                          ? 'Établissement actif'
                          : 'Supprimé',
                    icon: Users,
                  },
                ].map((kpi) => (
                  <div key={kpi.label} className="bg-zinc-50 border border-zinc-100 rounded-xl px-4 py-3">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider">{kpi.label}</span>
                      <kpi.icon size={13} className="text-zinc-400" />
                    </div>
                    <p className="text-xl font-bold text-zinc-800 tabular-nums">{kpi.value}</p>
                    {kpi.sub && <p className="text-[10px] text-zinc-400 mt-0.5">{kpi.sub}</p>}
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 pt-6 pb-10 space-y-6">

        {school ? <SchoolSuspensionPanel school={school} /> : null}

        <Panel>
          <PanelHeader
            icon={CreditCard}
            iconClass="bg-zinc-900 text-white"
            title="God Mode — Impression PVC"
            description="Batch ZIP HD, modules SaaS et journal des impressions."
          />
          <SchoolGodModePanel schoolId={id} />
        </Panel>

        {/* ── KPI opérationnels ─────────────────────────────────────────── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {loadingStats || loadingPerf
            ? Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28" />)
            : (
              <>
                <KpiCard
                  label="Taux présence (jour)"
                  value={studentStats ? pct(studentStats.attendanceRate) : '—'}
                  sub={studentStats ? `${studentStats.presentToday} / ${studentStats.totalStudents} élèves` : undefined}
                  icon={UserCheck}
                  tone={studentStats && studentStats.attendanceRate >= 70 ? 'ok' : 'warn'}
                />
                <KpiCard
                  label="Recouvrement"
                  value={perf ? pct(perf.efficiency) : '—'}
                  sub={perf?.isHealthy ? 'Objectif atteint' : 'Sous le seuil'}
                  icon={Target}
                  tone={perf?.isHealthy ? 'ok' : 'danger'}
                />
                <KpiCard
                  label="Revenus du mois"
                  value={payDash ? fmtShort(payDash.performance.monthlyRevenue) : '—'}
                  sub={payDash ? `ARPU ${fmtShort(payDash.performance.arpu)}` : undefined}
                  icon={TrendingUp}
                  tone="ok"
                />
                <KpiCard
                  label="Impayés"
                  value={payDash ? fmtShort(payDash.treasury.totalUnpaid) : '—'}
                  sub={payDash && payDash.audit.pendingVerifications > 0
                    ? `${payDash.audit.pendingVerifications} vérif. en attente`
                    : 'Trésorerie'}
                  icon={CreditCard}
                  tone={payDash && payDash.treasury.totalUnpaid > 0 ? 'danger' : 'neutral'}
                />
              </>
            )}
        </div>

        {/* ── GRAPHIQUES ────────────────────────────────────────────────── */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 size={16} className="text-indigo-600" />
            <h2 className="text-sm font-semibold text-zinc-800">Analytique en temps réel</h2>
            <span className="text-[10px] text-zinc-400 ml-1">— données API live</span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

            {/* Finance donut */}
            <Panel>
              <PanelHeader
                icon={PieIcon}
                iconClass="bg-emerald-50 text-emerald-600"
                title="Répartition financière"
                description="Encaissé vs reste à recouvrer (performance école)"
              />
              {loadingPerf ? (
                <Skeleton className="h-52" />
              ) : financePie.length ? (
                <div className="flex flex-col sm:flex-row items-center gap-6">
                  <div className="relative w-44 h-44 flex-shrink-0">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={financePie}
                          cx="50%" cy="50%"
                          innerRadius={52} outerRadius={78}
                          paddingAngle={3}
                          dataKey="value"
                          strokeWidth={0}
                        >
                          {financePie.map((entry) => (
                            <Cell key={entry.name} fill={entry.color} />
                          ))}
                        </Pie>
                        <RechartsTooltip
                          content={({ active, payload }) => (
                            <ChartTooltip
                              active={active}
                              payload={payload?.map((p) => ({
                                name: String(p.name),
                                value: Number(p.value),
                                color: String(p.payload?.color ?? '#6366f1'),
                              }))}
                              formatter={(v) => fmt(v)}
                            />
                          )}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                      <span className="text-lg font-bold text-zinc-900 tabular-nums">
                        {perf ? pct(perf.efficiency) : '—'}
                      </span>
                      <span className="text-[10px] text-zinc-400 uppercase">efficacité</span>
                    </div>
                  </div>
                  <div className="flex-1 w-full space-y-3">
                    {financePie.map((d) => (
                      <div key={d.name} className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: d.color }} />
                          <span className="text-zinc-600">{d.name}</span>
                        </div>
                        <span className="font-semibold tabular-nums text-zinc-900">{fmt(d.value)}</span>
                      </div>
                    ))}
                    {perf && (
                      <div className={cn(
                        'mt-2 px-3 py-2 rounded-lg text-xs font-medium flex items-center gap-2',
                        perf.isHealthy ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700',
                      )}>
                        {perf.isHealthy ? <ShieldCheck size={13} /> : <AlertTriangle size={13} />}
                        {perf.isHealthy ? 'Santé financière OK' : 'Recouvrement insuffisant'}
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <p className="text-sm text-zinc-400 text-center py-12">Aucune donnée financière disponible</p>
              )}
            </Panel>

            {/* Présence donut */}
            <Panel>
              <PanelHeader
                icon={UserCheck}
                iconClass="bg-indigo-50 text-indigo-600"
                title="Présence du jour"
                description="Répartition présents, retards et absents"
              />
              {loadingStats && loadingPresence ? (
                <Skeleton className="h-52" />
              ) : presencePie.length ? (
                <div className="flex flex-col sm:flex-row items-center gap-6">
                  <div className="relative w-44 h-44 flex-shrink-0">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={presencePie}
                          cx="50%" cy="50%"
                          innerRadius={52} outerRadius={78}
                          paddingAngle={3}
                          dataKey="value"
                          strokeWidth={0}
                        >
                          {presencePie.map((entry) => (
                            <Cell key={entry.name} fill={entry.color} />
                          ))}
                        </Pie>
                        <RechartsTooltip
                          content={({ active, payload }) => (
                            <ChartTooltip active={active} payload={payload?.map((p) => ({
                              name: String(p.name),
                              value: Number(p.value),
                              color: String(p.payload?.color ?? '#6366f1'),
                            }))} />
                          )}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                      <span className="text-lg font-bold text-zinc-900 tabular-nums">
                        {studentStats ? pct(studentStats.attendanceRate) : '—'}
                      </span>
                      <span className="text-[10px] text-zinc-400 uppercase">taux</span>
                    </div>
                  </div>
                  <div className="flex-1 w-full space-y-2">
                    {presencePie.map((d) => (
                      <div key={d.name} className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: d.color }} />
                          <span className="text-zinc-600">{d.name}</span>
                        </div>
                        <span className="font-semibold tabular-nums">{d.value}</span>
                      </div>
                    ))}
                    {studentStats?.lastUpdate && (
                      <p className="text-[10px] text-zinc-400 pt-2">
                        MAJ {new Date(studentStats.lastUpdate).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    )}
                  </div>
                </div>
              ) : (
                <p className="text-sm text-zinc-400 text-center py-12">Aucun pointage aujourd&apos;hui</p>
              )}
            </Panel>

            {/* Classes bar chart */}
            <Panel>
              <PanelHeader
                icon={BookOpen}
                iconClass="bg-violet-50 text-violet-600"
                title="Effectifs par classe"
                description="Élèves inscrits vs capacité maximale"
              />
              {loadingClasses ? (
                <Skeleton className="h-52" />
              ) : classBarData.length ? (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={classBarData} margin={{ top: 4, right: 4, left: -16, bottom: 0 }} barGap={2}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f4f4f5" vertical={false} />
                    <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#a1a1aa' }} tickLine={false} axisLine={false} />
                    <YAxis tick={{ fontSize: 10, fill: '#a1a1aa' }} tickLine={false} axisLine={false} />
                    <RechartsTooltip
                      content={({ active, payload, label }) => {
                        if (!active || !payload?.length) return null
                        const row = payload[0]?.payload as typeof classBarData[0]
                        return (
                          <div className="bg-zinc-900/95 text-white text-xs rounded-lg px-3 py-2 shadow-xl">
                            <p className="font-medium mb-1">{label}</p>
                            <p>{row.élèves} élèves / {row.capacité} places ({row.taux}%)</p>
                          </div>
                        )
                      }}
                    />
                    <Bar dataKey="élèves" fill="#6366f1" radius={[4, 4, 0, 0]} maxBarSize={28} />
                    <Bar dataKey="capacité" fill="#e4e4e7" radius={[4, 4, 0, 0]} maxBarSize={28} />
                    <Legend
                      wrapperStyle={{ fontSize: 11, paddingTop: 8 }}
                      formatter={(v) => <span className="text-zinc-500">{v === 'élèves' ? 'Inscrits' : 'Capacité'}</span>}
                    />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-sm text-zinc-400 text-center py-12">Aucune classe configurée</p>
              )}
            </Panel>

            {/* Treasury bar */}
            <Panel>
              <PanelHeader
                icon={Wallet}
                iconClass="bg-amber-50 text-amber-600"
                title="Indicateurs trésorerie"
                description="Revenus, projections et impayés (dashboard paiements)"
              />
              {loadingPay ? (
                <Skeleton className="h-52" />
              ) : treasuryBar.length ? (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={treasuryBar} layout="vertical" margin={{ top: 0, right: 16, left: 4, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f4f4f5" horizontal={false} />
                    <XAxis type="number" tick={{ fontSize: 10, fill: '#a1a1aa' }} tickFormatter={fmtShort} tickLine={false} axisLine={false} />
                    <YAxis type="category" dataKey="label" tick={{ fontSize: 10, fill: '#71717a' }} width={90} tickLine={false} axisLine={false} />
                    <RechartsTooltip
                      content={({ active, payload }) => (
                        <ChartTooltip
                          active={active}
                          payload={payload?.map((p) => ({
                            name: String(p.payload?.label ?? ''),
                            value: Number(p.value),
                            color: '#6366f1',
                          }))}
                          formatter={(v) => fmt(v)}
                        />
                      )}
                    />
                    <Bar dataKey="montant" radius={[0, 4, 4, 0]} maxBarSize={22}>
                      {treasuryBar.map((_, i) => (
                        <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-sm text-zinc-400 text-center py-12">Données trésorerie indisponibles</p>
              )}
            </Panel>

            {/* Efficiency by level — full width on large screens */}
            {(loadingEfficiency || efficiencyBar.length > 0) && (
              <Panel className="lg:col-span-2">
                <PanelHeader
                  icon={BarChart3}
                  iconClass="bg-sky-50 text-sky-600"
                  title="Efficacité par niveau"
                  description="Taux de recouvrement segmenté par niveau scolaire"
                />
                {loadingEfficiency ? (
                  <Skeleton className="h-48" />
                ) : efficiencyBar.length ? (
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={efficiencyBar} margin={{ top: 4, right: 4, left: -16, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f4f4f5" vertical={false} />
                      <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#a1a1aa' }} tickLine={false} axisLine={false} />
                      <YAxis tick={{ fontSize: 10, fill: '#a1a1aa' }} tickLine={false} axisLine={false} domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
                      <RechartsTooltip
                        content={({ active, payload, label }) => {
                          if (!active || !payload?.length) return null
                          const row = payload[0]?.payload as typeof efficiencyBar[0]
                          return (
                            <div className="bg-zinc-900/95 text-white text-xs rounded-lg px-3 py-2 shadow-xl">
                              <p className="font-medium mb-1">{label}</p>
                              <p>Efficacité : {row.efficacité}%</p>
                              <p>{row.élèves} élèves</p>
                            </div>
                          )
                        }}
                      />
                      <Bar dataKey="efficacité" fill="#06b6d4" radius={[4, 4, 0, 0]} maxBarSize={36} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-sm text-zinc-400 text-center py-8">Pas de segmentation par niveau</p>
                )}
              </Panel>
            )}
          </div>
        </div>

        {/* ── CLASSES & CAPACITÉ ──────────────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Panel padding={false} className="overflow-hidden">
            <div className="px-6 pt-6">
              <PanelHeader
                icon={BookOpen}
                title="Classes"
                description={`${classes?.meta.total ?? 0} classes actives`}
              />
            </div>
            {loadingClasses ? (
              <Skeleton className="h-40 mx-6 mb-6 rounded-xl" />
            ) : classes && classes.data.length > 0 ? (
              <div className="divide-y divide-zinc-50 border-t border-zinc-100">
                {classes.data.slice(0, 6).map((cls) => {
                  const fill = cls.maxStudents ? Math.round((cls._count.students / cls.maxStudents) * 100) : null
                  return (
                    <div key={cls.id} className="flex items-center justify-between px-6 py-3.5 hover:bg-zinc-50/50 transition-colors">
                      <div className="min-w-0 flex-1 mr-4">
                        <p className="text-sm font-medium text-zinc-800 truncate">{cls.name}</p>
                        <p className="text-[11px] text-zinc-400 mt-0.5">{cls.academicYear}</p>
                        {fill !== null && (
                          <div className="mt-2 h-1 bg-zinc-100 rounded-full overflow-hidden max-w-[180px]">
                            <div
                              className={cn('h-full rounded-full transition-all',
                                fill >= 100 ? 'bg-red-500' : fill >= 90 ? 'bg-amber-400' : 'bg-indigo-500',
                              )}
                              style={{ width: `${Math.min(fill, 100)}%` }}
                            />
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className="text-xs tabular-nums text-zinc-600">
                          {cls._count.students}{cls.maxStudents ? `/${cls.maxStudents}` : ''}
                        </span>
                        {fill !== null && (
                          <span className={cn(
                            'text-[10px] font-semibold px-1.5 py-0.5 rounded tabular-nums',
                            fill >= 100 ? 'bg-red-50 text-red-600' : fill >= 90 ? 'bg-amber-50 text-amber-600' : 'bg-zinc-100 text-zinc-500',
                          )}>
                            {fill}%
                          </span>
                        )}
                      </div>
                    </div>
                  )
                })}
                {classes.meta.total > 6 && (
                  <p className="text-[11px] text-zinc-400 px-6 py-3">+ {classes.meta.total - 6} autres classes</p>
                )}
              </div>
            ) : (
              <p className="text-sm text-zinc-400 px-6 pb-6">Aucune classe active.</p>
            )}
          </Panel>

          <Panel padding={false} className="overflow-hidden">
            <div className="px-6 pt-6">
              <PanelHeader
                icon={TriangleAlert}
                iconClass={capacityAlerts?.length ? 'bg-amber-50 text-amber-600' : 'bg-zinc-100 text-zinc-400'}
                title="Alertes capacité"
                description="Classes proches ou au-delà de la capacité"
              />
            </div>
            {loadingCapacity ? (
              <Skeleton className="h-40 mx-6 mb-6 rounded-xl" />
            ) : capacityAlerts && capacityAlerts.length > 0 ? (
              <div className="divide-y divide-zinc-50 border-t border-zinc-100">
                {capacityAlerts.map((alert) => (
                  <div key={alert.id} className="flex items-center justify-between px-6 py-3.5">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-zinc-800 truncate">{alert.name}</p>
                      <p className="text-[11px] text-zinc-400 mt-0.5">{alert.currentCount} / {alert.capacity} élèves</p>
                    </div>
                    <span className={cn(
                      'inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium flex-shrink-0 ml-3',
                      alert.status === 'FULL' ? 'bg-red-50 text-red-700 ring-1 ring-red-100' : 'bg-amber-50 text-amber-700 ring-1 ring-amber-100',
                    )}>
                      <span className={cn('w-1.5 h-1.5 rounded-full', alert.status === 'FULL' ? 'bg-red-500' : 'bg-amber-400')} />
                      {alert.occupancyRate}% — {alert.status === 'FULL' ? 'Complet' : 'Quasi-plein'}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="px-6 pb-8 pt-2 text-center">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center mx-auto mb-2">
                  <ShieldCheck size={18} className="text-emerald-500" />
                </div>
                <p className="text-sm text-zinc-500">Aucune surcharge détectée</p>
              </div>
            )}
          </Panel>
        </div>

        {/* ── PERFORMANCE FINANCIÈRE ─────────────────────────────────────── */}
        {perf && (
          <Panel>
            <PanelHeader
              icon={TrendingUp}
              iconClass="bg-emerald-50 text-emerald-600"
              title="Performance financière"
              description="Synthèse recouvrement et seuil de rentabilité"
            />
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 mb-5">
              <KpiCard label="Encaissé" value={fmt(perf.collected)} icon={TrendingUp} tone="ok" />
              <KpiCard label="Reste à encaisser" value={fmt(perf.remaining)} icon={TrendingDown} tone="warn" />
              <KpiCard
                label="Seuil rentabilité"
                value={`${perf.breakEvenThreshold} él.`}
                sub={`${perf.studentCount} élèves actifs`}
                icon={Target}
                tone="neutral"
              />
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-zinc-500">Progression recouvrement</span>
                <span className="text-xs font-bold text-zinc-900 tabular-nums">{pct(perf.efficiency)}</span>
              </div>
              <div className="h-2 bg-zinc-100 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min(perf.efficiency, 100)}%` }}
                  transition={{ duration: 0.8, ease: 'easeOut' }}
                  className={cn(
                    'h-full rounded-full',
                    perf.efficiency >= 70 ? 'bg-emerald-500' : perf.efficiency >= 40 ? 'bg-amber-400' : 'bg-red-500',
                  )}
                />
              </div>
              <div className="flex justify-between mt-1.5 text-[10px] text-zinc-400">
                <span>0%</span><span>Objectif 70%</span><span>100%</span>
              </div>
            </div>
          </Panel>
        )}

        {/* ── DASHBOARD PAIEMENTS ──────────────────────────────────────────── */}
        {payDash && (
          <Panel>
            <PanelHeader
              icon={Banknote}
              iconClass="bg-indigo-50 text-indigo-600"
              title="Dashboard paiements"
              description="Indicateurs de performance et audit"
            />
            {payDash.audit.suspiciousActivity && (
              <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-red-50 border border-red-100 text-sm text-red-700 font-medium mb-4">
                <AlertTriangle size={14} />
                Activité suspecte détectée — audit recommandé
              </div>
            )}
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
              <KpiCard label="Revenus projetés" value={fmt(payDash.performance.projectedRevenue)} sub="Fin de mois" icon={TrendingUp} />
              <KpiCard label="Adoption digitale" value={pct(payDash.performance.digitalAdoption)} sub="Paiements non-cash" icon={ShieldCheck} tone="ok" />
              <KpiCard
                label="Vérifications"
                value={payDash.audit.pendingVerifications}
                icon={Clock}
                tone={payDash.audit.pendingVerifications > 0 ? 'warn' : 'neutral'}
              />
              <KpiCard label="DSO" value={`${payDash.audit.daysSalesOutstanding} j`} sub="Délai encaissement" icon={Activity} />
              <KpiCard label="Créances douteuses" value={fmt(payDash.treasury.badDebtEstimate)} icon={UserX} tone="danger" />
              <KpiCard
                label="Benford"
                value={payDash.audit.isBenfordValid ? 'Valide' : 'Invalide'}
                icon={ShieldCheck}
                tone={payDash.audit.isBenfordValid ? 'ok' : 'danger'}
              />
            </div>
          </Panel>
        )}

        {/* ── ANOMALIES ───────────────────────────────────────────────────── */}
        <Panel>
          <PanelHeader
            icon={AlertTriangle}
            iconClass="bg-red-50 text-red-600"
            title="Détection d'anomalies"
            description="Analyse statistique des transactions"
          />
          {loadingAno ? (
            <Skeleton className="h-28" />
          ) : anomalies && (
            <div className="space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-3 px-4 py-3 rounded-xl bg-zinc-50 border border-zinc-100">
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

              {anomalies.reason ? (
                <p className="text-sm text-zinc-500">{anomalies.reason}</p>
              ) : anomalies.anomalies.length === 0 ? (
                <p className="text-sm text-zinc-400">Aucune transaction suspecte détectée.</p>
              ) : (
                <div className="divide-y divide-zinc-50 border border-zinc-100 rounded-xl overflow-hidden">
                  {anomalies.anomalies.slice(0, 8).map((a) => (
                    <div key={a.id} className="flex items-center justify-between px-5 py-3.5 hover:bg-zinc-50/50">
                      <div>
                        <p className="text-sm font-semibold text-zinc-900 tabular-nums">{fmt(a.amount)}</p>
                        <p className="text-xs text-zinc-400 capitalize mt-0.5">{a.method.toLowerCase().replace(/_/g, ' ')}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-zinc-400 tabular-nums">dev. {a.audit.deviance.toFixed(1)}</span>
                        <span className="w-2 h-2 rounded-full bg-red-500 flex-shrink-0" />
                      </div>
                    </div>
                  ))}
                  {anomalies.anomalies.length > 8 && (
                    <p className="text-xs text-zinc-400 px-5 py-3 bg-zinc-50">
                      + {anomalies.anomalies.length - 8} autres transactions suspectes
                    </p>
                  )}
                </div>
              )}
            </div>
          )}
        </Panel>

        {/* ── ADMINISTRATEURS ─────────────────────────────────────────────── */}
        <Panel>
          <PanelHeader
            icon={Users}
            iconClass="bg-zinc-100 text-zinc-600"
            title="Administrateurs"
            description="Comptes avec accès à cet établissement"
          />
          {loadingSchool ? (
            <div className="space-y-2">{Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} className="h-14" />)}</div>
          ) : school?.admins.length ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {school.admins.map((admin) => (
                <div
                  key={admin.id}
                  className="flex items-center justify-between p-4 rounded-xl border border-zinc-100 bg-zinc-50/50 hover:border-zinc-200 transition-colors"
                >
                  <div>
                    <p className="text-sm font-medium text-zinc-900">
                      {admin.user.firstName} {admin.user.lastName}
                    </p>
                    <p className="text-xs text-zinc-400 mt-0.5">{admin.user.email}</p>
                  </div>
                  <span className="text-[10px] font-semibold text-indigo-600 bg-indigo-50 ring-1 ring-indigo-100 px-2 py-0.5 rounded-full">
                    {admin.roleName}
                  </span>
                </div>
              ))}
            </div>
          ) : school ? (
            <p className="text-sm text-zinc-400">Aucun administrateur assigné.</p>
          ) : null}
        </Panel>

      </div>
    </div>
  )
}
