'use client'

import { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { RefreshCw, Wallet, CheckCircle2, AlertTriangle, Printer } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { cn } from '@/lib/utils'
import { directorsApi } from '@/lib/admin/api/directors.api'
import { directorFinanceApi } from '@/lib/admin/api/director-finance.api'
import { StudentFinancialControlRows } from '@/components/finance/student-financial-control-rows'
import { CashJournalReport } from '@/components/finance/cash-journal-report'
import { openStudentsFinancialPrintReport } from '@/lib/finance/open-students-financial-print'
import { useSchoolMoney } from '@/lib/finance/use-school-money'
import { DirectorPageHeader, DirectorEmptyState, DirectorKpiCard } from '@/components/director/director-ui'
import type { StudentFinancialStatus } from '@/types/finance'

const STATUS_VALUES: StudentFinancialStatus[] = [
  'DEBTOR',
  'PAID',
  'OVERPAID',
  'DRIFT',
  'HIGH_RISK',
  'NPL_90',
  'AGING_0_30',
  'AGING_31_60',
  'AGING_61_90',
]

const STATUS_LABEL: Record<StudentFinancialStatus, string> = {
  DEBTOR: 'Débiteur',
  PAID: 'En ordre',
  OVERPAID: 'Sur-payé',
  DRIFT: 'Écart ledger',
  HIGH_RISK: 'Risque élevé',
  NPL_90: 'NPL 90+ j',
  AGING_0_30: 'Retard 0–30 j',
  AGING_31_60: 'Retard 31–60 j',
  AGING_61_90: 'Retard 61–90 j',
}

export default function DirectorFinancesPage() {
  const { displayCurrency } = useSchoolMoney()
  const classesQuery = useQuery({
    queryKey: ['director', 'classes'],
    queryFn: () => directorsApi.myClasses(),
    staleTime: 60_000,
  })

  const classes = useMemo(() => classesQuery.data ?? [], [classesQuery.data])
  const [classId, setClassId] = useState<number | null>(null)
  const [status, setStatus] = useState<'' | StudentFinancialStatus>('')
  const [exporting, setExporting] = useState(false)

  useEffect(() => {
    if (classId == null && classes.length > 0) setClassId(classes[0].id)
  }, [classes, classId])

  const filters = useMemo(
    () => (classId != null ? { classId, status: status || undefined, limit: 100 } : null),
    [classId, status]
  )

  const situationQuery = useQuery({
    queryKey: ['director', 'finance-situation', filters],
    queryFn: () => directorFinanceApi.listSituation(filters!),
    enabled: filters != null,
    staleTime: 20_000,
  })

  const data = situationQuery.data
  const rows = data?.data ?? []
  const hideAmounts = data?.amountsHidden ?? true

  async function handlePrint() {
    if (!filters) return
    setExporting(true)
    try {
      const report = await directorFinanceApi.exportSituationPrint(filters)
      openStudentsFinancialPrintReport(report, displayCurrency)
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className="min-h-screen bg-zinc-50">
      <DirectorPageHeader
        title="Situation financière"
        subtitle="En ordre / dette par classe de votre périmètre — sans montants"
        actions={
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              disabled={!filters || exporting}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-sm rounded-xl border border-zinc-200 bg-white hover:bg-zinc-50 disabled:opacity-50"
            >
              <Printer size={14} />
              Imprimer
            </button>
            <button
              type="button"
              onClick={() => situationQuery.refetch()}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-sm rounded-xl border border-zinc-200 bg-white hover:bg-zinc-50"
            >
              <RefreshCw size={14} className={cn(situationQuery.isFetching && 'animate-spin')} />
              Actualiser
            </button>
          </div>
        }
      />

      <div className="max-w-6xl mx-auto px-6 sm:px-8 py-8 space-y-6">
        <CashJournalReport />
        <div className="flex flex-wrap items-center gap-3">
          <select
            value={classId ?? ''}
            onChange={(e) => setClassId(e.target.value ? Number(e.target.value) : null)}
            className="px-3 py-2 text-sm border border-zinc-200 rounded-xl bg-white"
          >
            {classes.length === 0 && <option value="">Aucune classe</option>}
            {classes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as '' | StudentFinancialStatus)}
            className="px-3 py-2 text-sm border border-zinc-200 rounded-xl bg-white"
          >
            <option value="">Tous statuts</option>
            {STATUS_VALUES.map((s) => (
              <option key={s} value={s}>
                {STATUS_LABEL[s]}
              </option>
            ))}
          </select>
        </div>

        {data && (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-w-2xl">
            <DirectorKpiCard label="Élèves" value={data.meta.total} icon={Wallet} tone="sky" />
            <DirectorKpiCard label="En ordre" value={data.meta.paid} icon={CheckCircle2} tone="emerald" />
            <DirectorKpiCard label="Débiteurs" value={data.meta.debtors} icon={AlertTriangle} tone="amber" />
          </div>
        )}

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl border border-zinc-200 bg-white overflow-hidden"
        >
          {classId == null ? (
            <DirectorEmptyState
              icon={Wallet}
              title="Sélectionnez une classe"
              description="Choisissez une classe de votre périmètre pour voir sa situation financière."
            />
          ) : situationQuery.isLoading ? (
            <div className="p-8 text-center text-sm text-zinc-400">Chargement…</div>
          ) : rows.length === 0 ? (
            <DirectorEmptyState
              icon={Wallet}
              title="Aucun élève"
              description="Aucun élève ne correspond à ce filtre pour cette classe."
            />
          ) : (
            <div className="overflow-x-auto">
              <StudentFinancialControlRows
                rows={rows}
                studentHref={(id) => `/director/discipline?studentId=${id}${classId ? `&classId=${classId}` : ''}`}
                hideAmounts={hideAmounts}
              />
            </div>
          )}
        </motion.div>
      </div>
    </div>
  )
}
