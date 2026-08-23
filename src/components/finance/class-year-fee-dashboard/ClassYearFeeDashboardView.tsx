'use client'

import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import {
  AlertTriangle,
  ChevronDown,
  Download,
  Layers3,
  Search,
  Users,
  Wallet,
  CircleDollarSign,
  Landmark,
  RefreshCw,
  BadgeCheck,
  Scale,
} from 'lucide-react'
import { StudentFeeLedgerTable } from '@/components/finance/student-fee-ledger-table'
import {
  FinanceEmptyState,
  FinancePageHeader,
  FinancePageShell,
  FinancePanel,
} from '@/components/finance/finance-page-shell'
import { getApiErrorMessage } from '@/lib/api/client'
import { formatMoney } from '@/lib/finance/currency'
import {
  buildClassYearFeeCsv,
  downloadCsv,
  feeLineForClass,
  formatBillingWindow,
  rateTone,
} from '@/lib/finance/class-year-fee.utils'
import {
  useClassYearFeeDashboard,
  type ClassYearFeeSource,
} from '@/lib/hooks/use-class-year-fee-dashboard'
import { cn } from '@/lib/utils'
import type { ClassYearFeeClass } from '@/types/finance'

type SortKey = 'remaining' | 'name' | 'rate' | 'students'

export function ClassYearFeeDashboardView({ source }: { source: ClassYearFeeSource }) {
  const schoolQuery = useClassYearFeeDashboard(source)
  const [openId, setOpenId] = useState<number | null>(null)
  const [q, setQ] = useState('')
  const [hideEmpty, setHideEmpty] = useState(true)
  const [sort, setSort] = useState<SortKey>('remaining')

  const detailQuery = useClassYearFeeDashboard(
    source,
    { classId: openId ?? undefined },
    { enabled: openId != null },
  )

  const data = schoolQuery.data
  const currency = data?.currency ?? 'USD'
  const columns = data?.feeColumns ?? []

  const rows = useMemo(() => {
    if (!data) return []
    const needle = q.trim().toLowerCase()
    let list = data.classes.filter((cls) => {
      if (hideEmpty && cls.studentCount === 0) return false
      if (!needle) return true
      return `${cls.className} ${cls.level ?? ''}`.toLowerCase().includes(needle)
    })
    list = [...list].sort((a, b) => {
      if (sort === 'name') return a.className.localeCompare(b.className, 'fr')
      if (sort === 'rate') return b.totals.collectionRatePct - a.totals.collectionRatePct
      if (sort === 'students') return b.studentCount - a.studentCount
      return b.totals.remaining - a.totals.remaining
    })
    return list
  }, [data, hideEmpty, q, sort])

  const openClass = detailQuery.data?.classes[0]
  const attention = useMemo(
    () =>
      [...(data?.classes ?? [])]
        .filter((c) => c.studentCount > 0 && c.totals.remaining > 0)
        .sort((a, b) => b.totals.remaining - a.totals.remaining)
        .slice(0, 3),
    [data],
  )

  function toggleClass(classId: number) {
    setOpenId((cur) => (cur === classId ? null : classId))
  }

  function exportCsv() {
    if (!data) return
    downloadCsv(
      `frais-annuels-classes-${data.sessionLabel}.csv`,
      buildClassYearFeeCsv({ ...data, classes: rows }),
    )
  }

  return (
    <FinancePageShell>
      <FinancePageHeader
        title="Frais annuels par classe"
        subtitle="Ce que chaque classe doit percevoir cette année, ce qui est déjà encaissé, et le reste à recouvrer — frais par frais."
        badge={
          data ? (
            <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-800 ring-1 ring-emerald-100">
              Session {data.sessionLabel}
            </span>
          ) : null
        }
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => schoolQuery.refetch()}
              className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs font-medium text-zinc-600 hover:bg-zinc-50"
            >
              <RefreshCw size={13} className={schoolQuery.isFetching ? 'animate-spin' : ''} />
              Actualiser
            </button>
            <button
              type="button"
              onClick={exportCsv}
              disabled={!data}
              className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-2 text-xs font-semibold text-white shadow-sm hover:bg-emerald-700 disabled:opacity-50"
            >
              <Download size={13} />
              Exporter CSV
            </button>
          </div>
        }
      />

      {schoolQuery.isError && (
        <div className="flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
          <AlertTriangle size={16} className="mt-0.5 shrink-0" />
          <p>{getApiErrorMessage(schoolQuery.error) || 'Impossible de charger le recouvrement annuel.'}</p>
        </div>
      )}

      {schoolQuery.isLoading && <DashboardSkeleton />}

      {data && (
        <>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <Kpi
              label="Dû annuel"
              value={formatMoney(data.schoolTotals.expected, currency)}
              hint={`${data.schoolTotals.studentCount} élèves · ${data.billingMonths} mois`}
              icon={Landmark}
              tone="slate"
            />
            <Kpi
              label="Encaissé"
              value={formatMoney(data.schoolTotals.paid, currency)}
              hint={`${data.schoolTotals.collectionRatePct.toLocaleString('fr-FR')} % recouvré`}
              icon={CircleDollarSign}
              tone="emerald"
            />
            <Kpi
              label="Reste à recouvrer"
              value={formatMoney(data.schoolTotals.remaining, currency)}
              hint={`${data.schoolTotals.debtorCount} débiteur${data.schoolTotals.debtorCount > 1 ? 's' : ''}`}
              icon={Wallet}
              tone="rose"
            />
            <Kpi
              label="Fenêtre de facturation"
              value={formatBillingWindow(data.billingStart, data.billingEnd)}
              hint="Scolarité mensuelle × ces mois"
              icon={Layers3}
              tone="sky"
            />
          </div>

          <FinancePanel>
            <div className="px-5 py-4">
              <div className="mb-2 flex items-center justify-between text-xs text-zinc-500">
                <span>Taux de recouvrement école</span>
                <span className="font-semibold tabular-nums text-zinc-800">
                  {data.schoolTotals.collectionRatePct.toLocaleString('fr-FR')} %
                </span>
              </div>
              <div className="h-2.5 overflow-hidden rounded-full bg-zinc-100">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min(100, data.schoolTotals.collectionRatePct)}%` }}
                  className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-600"
                />
              </div>
            </div>
          </FinancePanel>

          {data.schoolTotals.unallocatedPaid > 0 && (
            <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              <AlertTriangle size={16} className="mt-0.5 shrink-0" />
              <p>
                {formatMoney(data.schoolTotals.unallocatedPaid, currency)} encaissés sans ventilation
                par frais. Ils n’apparaissent pas dans les colonnes ci-dessous.
              </p>
            </div>
          )}

          {attention.length > 0 && (
            <div className="grid gap-3 md:grid-cols-3">
              {attention.map((cls, i) => (
                <button
                  key={cls.classId}
                  type="button"
                  onClick={() => toggleClass(cls.classId)}
                  className="rounded-2xl border border-zinc-200/80 bg-white px-4 py-3 text-left shadow-sm transition hover:border-emerald-200 hover:shadow-md"
                >
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
                    Priorité {i + 1}
                  </p>
                  <p className="mt-1 text-sm font-semibold text-zinc-900">{cls.className}</p>
                  <p className="mt-1 text-lg font-bold tabular-nums text-rose-700">
                    {formatMoney(cls.totals.remaining, currency)}
                  </p>
                  <p className="text-xs text-zinc-500">
                    {cls.debtorCount} débiteur{cls.debtorCount > 1 ? 's' : ''} · {cls.totals.collectionRatePct.toLocaleString('fr-FR')} %
                  </p>
                </button>
              ))}
            </div>
          )}

          <FinancePanel
            title="Matrice annuelle"
            icon={Layers3}
            headerRight={
              <p className="text-[11px] text-zinc-400">
                Cliquez une classe pour voir les élèves
              </p>
            }
          >
            <div className="flex flex-wrap items-center gap-3 border-b border-zinc-100 px-5 py-3">
              <div className="relative min-w-[220px] flex-1">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Rechercher une classe…"
                  className="w-full rounded-xl border border-zinc-200 bg-zinc-50 py-2 pl-8 pr-3 text-sm outline-none focus:border-emerald-400 focus:bg-white"
                />
              </div>
              <label className="inline-flex items-center gap-2 text-xs text-zinc-600">
                <input
                  type="checkbox"
                  checked={hideEmpty}
                  onChange={(e) => setHideEmpty(e.target.checked)}
                  className="rounded border-zinc-300"
                />
                Masquer classes vides
              </label>
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value as SortKey)}
                className="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs text-zinc-700"
              >
                <option value="remaining">Trier : reste dû</option>
                <option value="rate">Trier : recouvrement</option>
                <option value="students">Trier : effectif</option>
                <option value="name">Trier : nom</option>
              </select>
            </div>

            {rows.length === 0 ? (
              <div className="p-6">
                <FinanceEmptyState
                  icon={Users}
                  title="Aucune classe à afficher"
                  description="Ajustez la recherche ou réaffichez les classes sans élèves."
                />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-left text-sm">
                  <thead className="bg-zinc-50 text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
                    <tr>
                      <th className="px-4 py-3">Classe</th>
                      <th className="px-3 py-3 text-right">Élèves</th>
                      {columns.map((col) => (
                        <th key={col.categoryId} className="px-3 py-3 text-right">
                          {col.categoryName}
                        </th>
                      ))}
                      <th className="px-3 py-3 text-right">
                        <span className="inline-flex items-center justify-end gap-1">
                          <Scale size={12} className="text-slate-400" /> Total dû
                        </span>
                      </th>
                      <th className="px-3 py-3 text-right">
                        <span className="inline-flex items-center justify-end gap-1">
                          <BadgeCheck size={12} className="text-emerald-500" /> Payé
                        </span>
                      </th>
                      <th className="px-3 py-3 text-right">
                        <span className="inline-flex items-center justify-end gap-1">
                          <Wallet size={12} className="text-rose-400" /> Reste
                        </span>
                      </th>
                      <th className="px-4 py-3 text-right">Taux</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100">
                    {rows.map((cls) => (
                      <ClassRows
                        key={cls.classId}
                        cls={cls}
                        columns={columns}
                        currency={currency}
                        open={openId === cls.classId}
                        onToggle={() => toggleClass(cls.classId)}
                        detail={openId === cls.classId ? openClass : undefined}
                        detailLoading={openId === cls.classId && detailQuery.isFetching}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </FinancePanel>
        </>
      )}
    </FinancePageShell>
  )
}

function Kpi({
  label,
  value,
  hint,
  icon: Icon,
  tone,
}: {
  label: string
  value: string
  hint: string
  icon: React.ElementType
  tone: 'slate' | 'emerald' | 'rose' | 'sky'
}) {
  const tones = {
    slate: 'bg-slate-50 text-slate-700',
    emerald: 'bg-emerald-50 text-emerald-700',
    rose: 'bg-rose-50 text-rose-700',
    sky: 'bg-sky-50 text-sky-700',
  }
  return (
    <div className="rounded-2xl border border-zinc-200/80 bg-white px-4 py-4 shadow-sm">
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">{label}</p>
        <span className={cn('flex h-8 w-8 items-center justify-center rounded-xl', tones[tone])}>
          <Icon size={15} />
        </span>
      </div>
      <p className="mt-2 text-xl font-bold tabular-nums tracking-tight text-zinc-900">{value}</p>
      <p className="mt-1 text-xs text-zinc-500">{hint}</p>
    </div>
  )
}

function ClassRows({
  cls,
  columns,
  currency,
  open,
  onToggle,
  detail,
  detailLoading,
}: {
  cls: ClassYearFeeClass
  columns: ClassYearFeeDashboardViewColumns
  currency: string
  open: boolean
  onToggle: () => void
  detail?: ClassYearFeeClass
  detailLoading: boolean
}) {
  const colSpan = 6 + columns.length
  return (
    <>
      <tr
        onClick={onToggle}
        className={cn(
          'cursor-pointer transition-colors hover:bg-emerald-50/40',
          open && 'bg-emerald-50/60',
        )}
      >
        <td className="px-4 py-3">
          <div className="flex items-center gap-2">
            <ChevronDown
              size={14}
              className={cn('text-zinc-400 transition-transform', open && 'rotate-180')}
            />
            <div>
              <p className="font-semibold text-zinc-900">{cls.className}</p>
              {cls.level && <p className="text-[11px] text-zinc-400">{cls.level}</p>}
            </div>
          </div>
        </td>
        <td className="px-3 py-3 text-right tabular-nums text-zinc-600">
          {cls.studentCount}
          {cls.debtorCount > 0 && (
            <span className="ml-1 text-[10px] text-rose-600">· {cls.debtorCount} dû</span>
          )}
        </td>
        {columns.map((col) => {
          const line = feeLineForClass(cls, col.categoryId)
          return (
            <td key={col.categoryId} className="px-3 py-3 text-right">
              <p className="tabular-nums font-medium text-zinc-800">
                {formatMoney(line?.expected ?? 0, currency)}
              </p>
              <p className="text-[10px] tabular-nums text-zinc-400">
                payé {formatMoney(line?.paid ?? 0, currency)}
              </p>
            </td>
          )
        })}
        <td className="px-3 py-3 text-right tabular-nums font-semibold text-zinc-900">
          {formatMoney(cls.totals.expected, currency)}
        </td>
        <td className="px-3 py-3 text-right tabular-nums text-emerald-700">
          {formatMoney(cls.totals.paid, currency)}
        </td>
        <td className="px-3 py-3 text-right tabular-nums font-semibold text-rose-700">
          {formatMoney(cls.totals.remaining, currency)}
        </td>
        <td className="px-4 py-3 text-right">
          <span
            className={cn(
              'inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 tabular-nums',
              rateTone(cls.totals.collectionRatePct),
            )}
          >
            {cls.totals.collectionRatePct.toLocaleString('fr-FR')} %
          </span>
        </td>
      </tr>
      {open && (
        <tr>
          <td colSpan={colSpan} className="bg-zinc-50/80 px-5 py-4">
            {detailLoading && !detail && (
              <p className="text-xs text-zinc-500">Chargement des élèves…</p>
            )}
            {detail && <ClassDetail cls={detail} currency={currency} />}
          </td>
        </tr>
      )}
    </>
  )
}

type ClassYearFeeDashboardViewColumns = Array<{
  categoryId: number
  categoryCode: string
  categoryName: string
  billingPeriod: string
}>

function ClassDetail({ cls, currency }: { cls: ClassYearFeeClass; currency: string }) {
  const students = cls.students ?? []
  const [openStudentId, setOpenStudentId] = useState<number | null>(students[0]?.studentId ?? null)

  return (
    <div className="space-y-5">
      <div>
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
          Synthèse de la classe
        </p>
        <StudentFeeLedgerTable
          currency={currency}
          totals={cls.totals}
          lines={cls.fees.map((fee) => ({
            id: `class-${fee.categoryId}`,
            name: fee.categoryName,
            billingPeriod: fee.billingPeriod,
            expected: fee.expected,
            paid: fee.paid,
            remaining: fee.remaining,
          }))}
        />
      </div>

      {students.length === 0 ? (
        <p className="text-xs text-zinc-500">Aucun élève actif dans cette classe.</p>
      ) : (
        <div className="space-y-3">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
            Détail par élève
          </p>
          {students.map((s) => {
            const open = openStudentId === s.studentId
            const cleared = s.remaining <= 0.01
            return (
              <div
                key={s.studentId}
                className={cn(
                  'overflow-hidden rounded-2xl border bg-white',
                  open ? 'border-emerald-200 shadow-sm' : 'border-zinc-200/80',
                )}
              >
                <button
                  type="button"
                  onClick={() => setOpenStudentId(open ? null : s.studentId)}
                  className="flex w-full items-center gap-3 px-4 py-3 text-left"
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-xs font-bold text-slate-600">
                    {s.fullName.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join('')}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-semibold text-zinc-900">{s.fullName}</span>
                    <span className="block text-[11px] text-zinc-400">{s.matricule ?? '—'}</span>
                  </span>
                  <span className="hidden text-right sm:block">
                    <span className="block text-[10px] uppercase tracking-wide text-zinc-400">Dû</span>
                    <span className="block text-sm tabular-nums font-medium text-slate-800">
                      {formatMoney(s.expected, currency)}
                    </span>
                  </span>
                  <span className="hidden text-right sm:block">
                    <span className="block text-[10px] uppercase tracking-wide text-zinc-400">Payé</span>
                    <span className="block text-sm tabular-nums font-semibold text-emerald-700">
                      {formatMoney(s.paid, currency)}
                    </span>
                  </span>
                  <span className="text-right">
                    <span className="block text-[10px] uppercase tracking-wide text-zinc-400">Reste</span>
                    <span
                      className={cn(
                        'block text-sm tabular-nums font-semibold',
                        cleared ? 'text-zinc-400' : 'text-rose-700',
                      )}
                    >
                      {formatMoney(s.remaining, currency)}
                    </span>
                  </span>
                  <span
                    className={cn(
                      'hidden rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 sm:inline-flex',
                      cleared
                        ? 'bg-emerald-50 text-emerald-700 ring-emerald-100'
                        : 'bg-rose-50 text-rose-700 ring-rose-100',
                    )}
                  >
                    {cleared ? 'Soldé' : 'À recouvrer'}
                  </span>
                  <ChevronDown
                    size={16}
                    className={cn('text-zinc-400 transition-transform', open && 'rotate-180')}
                  />
                </button>
                {open && (
                  <div className="border-t border-zinc-100 px-3 pb-3 pt-2">
                    <StudentFeeLedgerTable
                      currency={currency}
                      totals={{ expected: s.expected, paid: s.paid, remaining: s.remaining }}
                      lines={s.fees.map((fee) => ({
                        id: `${s.studentId}-${fee.categoryId}`,
                        name: fee.categoryName,
                        billingPeriod: cls.fees.find((f) => f.categoryId === fee.categoryId)?.billingPeriod,
                        expected: fee.expected,
                        paid: fee.paid,
                        remaining: fee.remaining,
                      }))}
                    />
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function DashboardSkeleton() {
  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-28 animate-pulse rounded-2xl bg-zinc-100" />
        ))}
      </div>
      <div className="h-64 animate-pulse rounded-2xl bg-zinc-100" />
    </div>
  )
}
