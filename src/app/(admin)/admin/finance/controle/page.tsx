'use client'

import { Suspense, useMemo, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { Filter, RefreshCw, Users, CheckCircle2, AlertTriangle, ClipboardList, ShieldCheck, Download, Printer, FileDown } from 'lucide-react'
import { StudentFinancialControlRows } from '@/components/finance/student-financial-control-rows'
import {
  useStudentsFinancial,
  useExportStudentsFinancialPrint,
} from '@/lib/hooks/use-finance'
import { useClasses, usePendingVerifications } from '@/lib/hooks/use-admin'
import { useSchoolMoney } from '@/lib/finance/use-school-money'
import { downloadBlob } from '@/lib/finance/download-blob'
import { openStudentsFinancialPrintReport } from '@/lib/finance/open-students-financial-print'
import { downloadStudentsFinancialPdf } from '@/lib/finance/export-students-financial-pdf'
import { VerificationStepper, fmtMoney } from '@/components/admin/finance/verification-ui'
import { useAuth } from '@/providers/auth-provider'
import { isItDesk } from '@/types/auth'
import type { StudentFinancialSort, StudentFinancialStatus } from '@/types/finance'

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

function ValidationsStrip() {
  const { data: pending = [], isLoading } = usePendingVerifications()
  const items = pending.slice(0, 8)

  return (
    <div className="rounded-xl border border-zinc-200 bg-white overflow-hidden">
      <div className="px-4 py-3 border-b border-zinc-100 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <ShieldCheck size={15} className="text-amber-600" />
          <div>
            <p className="text-sm font-semibold text-zinc-900">Qui a validé — file en cours</p>
            <p className="text-[11px] text-zinc-400">Étape Finance / Admin + nom du validateur</p>
          </div>
        </div>
        <Link
          href="/admin/finance/paiements"
          className="text-xs font-medium text-emerald-700 hover:underline"
        >
          Voir tout →
        </Link>
      </div>
      {isLoading ? (
        <p className="p-4 text-xs text-zinc-400">Chargement…</p>
      ) : items.length === 0 ? (
        <p className="p-4 text-xs text-zinc-400">Aucune vérification en attente</p>
      ) : (
        <ul className="divide-y divide-zinc-50">
          {items.map((item) => (
            <li key={item.verificationId} className="px-4 py-3 flex flex-wrap items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-medium text-zinc-900 truncate">{item.studentName}</p>
                <p className="text-[11px] text-zinc-400 truncate">
                  {fmtMoney(item.amount, item.currency)} · {item.method}
                  {item.reference ? ` · ${item.reference}` : ''}
                </p>
              </div>
              <VerificationStepper item={item} />
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function ControleContent() {
  const { format: formatMoney, displayCurrency } = useSchoolMoney()
  const { user } = useAuth()
  const deskOnly = isItDesk(user?.role)
  const searchParams = useSearchParams()
  const statusParam = searchParams.get('status')
  const classParam = Number(searchParams.get('classId') ?? 0)
  const initialStatus = STATUS_VALUES.includes(statusParam as StudentFinancialStatus)
    ? (statusParam as StudentFinancialStatus)
    : ''

  const [classId, setClassId] = useState(classParam > 0 ? classParam : 0)
  const [sectionId, setSectionId] = useState(0)
  const [optionId, setOptionId] = useState(0)
  const [status, setStatus] = useState<'' | StudentFinancialStatus>(initialStatus)
  const [sort, setSort] = useState<StudentFinancialSort>('balance_desc')
  const [page, setPage] = useState(1)

  const filters = useMemo(
    () => ({
      classId: classId > 0 ? classId : undefined,
      sectionId: sectionId > 0 ? sectionId : undefined,
      optionId: optionId > 0 ? optionId : undefined,
      status: status || undefined,
      sort,
      page,
      limit: 50,
    }),
    [classId, sectionId, optionId, status, sort, page],
  )

  const { data, isLoading, isFetching, refetch } = useStudentsFinancial(filters)
  const exportPrint = useExportStudentsFinancialPrint()
  const { data: classes = [] } = useClasses({ isActive: true })

  const sections = useMemo(() => {
    const map = new Map<number, string>()
    for (const c of classes) {
      if (c.sectionId && c.sectionName) map.set(c.sectionId, c.sectionName)
    }
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }))
  }, [classes])

  const options = useMemo(() => {
    const map = new Map<number, string>()
    for (const c of classes) {
      if (sectionId > 0 && c.sectionId !== sectionId) continue
      if (c.optionId && c.optionName) map.set(c.optionId, c.optionName)
    }
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }))
  }, [classes, sectionId])

  const filteredClasses = useMemo(() => {
    return classes.filter((c) => {
      if (sectionId > 0 && c.sectionId !== sectionId) return false
      if (optionId > 0 && c.optionId !== optionId) return false
      return true
    })
  }, [classes, sectionId, optionId])

  const rows = data?.data ?? []
  const meta = data?.meta
  const selectCls =
    'rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400/40 min-w-[140px]'

  async function handleExport(format: 'json' | 'csv') {
    const { page: _page, limit: _limit, ...exportFilters } = filters
    const result = await exportPrint.mutateAsync({
      ...exportFilters,
      format,
    })
    if (result.type === 'csv') {
      downloadBlob(result.blob, `situation-financiere-${new Date().toISOString().slice(0, 10)}.csv`)
    } else {
      openStudentsFinancialPrintReport(result.report, displayCurrency)
    }
  }

  async function handleDownloadPdf() {
    const { page: _page, limit: _limit, ...exportFilters } = filters
    const result = await exportPrint.mutateAsync({
      ...exportFilters,
      format: 'json',
    })
    if (result.type === 'json') {
      downloadStudentsFinancialPdf(result.report, displayCurrency)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-emerald-700 mb-1">
            <ClipboardList size={18} />
            <span className="text-xs font-semibold uppercase tracking-wide">
              {deskOnly ? 'Guichet' : 'Contrôle admin'}
            </span>
          </div>
          <h1 className="text-xl font-bold text-zinc-900">
            {deskOnly ? 'Dettes / en ordre' : 'Qui a payé quoi'}
          </h1>
          <p className="text-sm text-zinc-500 mt-0.5">
            {deskOnly
              ? 'Filtrer par classe et situation (en ordre / dette), puis imprimer. Les montants restent au service finance.'
              : (
                <>
                  Déplier une ligne pour le détail des frais · validations via{' '}
                  <Link href="/admin/finance/paiements" className="text-emerald-700 hover:underline">
                    Paiements
                  </Link>
                </>
              )}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => refetch()}
            className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-600 hover:bg-zinc-50"
          >
            <RefreshCw size={14} className={isFetching ? 'animate-spin' : ''} />
            Actualiser
          </button>
          <button
            type="button"
            disabled={exportPrint.isPending}
            onClick={() => void handleExport('csv')}
            className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-700 hover:bg-zinc-50 disabled:opacity-50"
          >
            <Download size={14} />
            Export CSV
          </button>
          <button
            type="button"
            disabled={exportPrint.isPending}
            onClick={() => void handleExport('json')}
            className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-700 hover:bg-zinc-50 disabled:opacity-50"
          >
            <Printer size={14} />
            Imprimer
          </button>
          <button
            type="button"
            disabled={exportPrint.isPending}
            onClick={() => void handleDownloadPdf()}
            className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
          >
            <FileDown size={14} />
            Télécharger PDF
          </button>
        </div>
      </div>

      {meta && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="rounded-xl border border-zinc-200 bg-white p-4">
            <p className="text-xs text-zinc-500">Résultats</p>
            <p className="text-2xl font-bold text-zinc-900">{meta.total}</p>
          </div>
          <button
            type="button"
            onClick={() => { setStatus('DEBTOR'); setPage(1) }}
            className="rounded-xl border border-red-100 bg-red-50/50 p-4 text-left hover:bg-red-50"
          >
            <p className="text-xs text-red-600 flex items-center gap-1"><AlertTriangle size={12} /> Dettes</p>
            <p className="text-2xl font-bold text-red-800">{meta.debtors}</p>
          </button>
          <button
            type="button"
            onClick={() => { setStatus('PAID'); setPage(1) }}
            className="rounded-xl border border-emerald-100 bg-emerald-50/50 p-4 text-left hover:bg-emerald-50"
          >
            <p className="text-xs text-emerald-700 flex items-center gap-1"><CheckCircle2 size={12} /> En ordre</p>
            <p className="text-2xl font-bold text-emerald-800">{meta.paid}</p>
          </button>
          {!deskOnly && (
          <div className="rounded-xl border border-zinc-200 bg-white p-4">
            <p className="text-xs text-zinc-500">Solde total</p>
            <p className="text-2xl font-bold text-zinc-900 tabular-nums">{formatMoney(meta.totalBalance ?? 0)}</p>
          </div>
          )}
        </div>
      )}

      {!deskOnly && <ValidationsStrip />}

      <div className="rounded-xl border border-zinc-200 bg-white p-4">
        <div className="flex items-center gap-2 mb-3 text-xs font-semibold uppercase tracking-wide text-zinc-400">
          <Filter size={13} />
          Filtres
        </div>
        <div className="flex flex-wrap gap-3">
          <select
            className={selectCls}
            value={sectionId || ''}
            onChange={(e) => {
              setSectionId(Number(e.target.value))
              setOptionId(0)
              setClassId(0)
              setPage(1)
            }}
          >
            <option value="">Toutes sections</option>
            {sections.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
          <select
            className={selectCls}
            value={optionId || ''}
            onChange={(e) => {
              setOptionId(Number(e.target.value))
              setClassId(0)
              setPage(1)
            }}
          >
            <option value="">Toutes options</option>
            {options.map((o) => (
              <option key={o.id} value={o.id}>{o.name}</option>
            ))}
          </select>
          <select
            className={selectCls}
            value={classId || ''}
            onChange={(e) => {
              setClassId(Number(e.target.value))
              setPage(1)
            }}
          >
            <option value="">Toutes classes</option>
            {filteredClasses.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          <select
            className={selectCls}
            value={status}
            onChange={(e) => {
              setStatus(e.target.value as '' | StudentFinancialStatus)
              setPage(1)
            }}
          >
            <option value="">Toutes situations</option>
            <option value="DEBTOR">Débiteurs</option>
            <option value="PAID">En ordre</option>
            <option value="OVERPAID">Sur-payés</option>
            <option value="DRIFT">Écart de solde</option>
            <option value="HIGH_RISK">Risque élevé</option>
            <option value="NPL_90">Impayés 90+ j</option>
          </select>
          <select
            className={selectCls}
            value={sort}
            onChange={(e) => {
              setSort(e.target.value as StudentFinancialSort)
              setPage(1)
            }}
          >
            <option value="balance_desc">Tri · solde ↓</option>
            <option value="risk_desc">Tri · risque ↓</option>
            <option value="dpd_desc">Tri · jours de retard</option>
            <option value="ecl_desc">Tri · perte estimée</option>
            <option value="name_asc">Tri · nom</option>
          </select>
        </div>
      </div>

      <div className="rounded-xl border border-zinc-200 bg-white overflow-hidden">
        {isLoading ? (
          <div className="p-10 text-center text-sm text-zinc-400">Chargement…</div>
        ) : rows.length === 0 ? (
          <div className="py-16 text-center">
            <Users size={28} className="mx-auto text-zinc-200 mb-2" />
            <p className="text-sm text-zinc-400">Aucun élève pour ces filtres</p>
          </div>
        ) : (
          <StudentFinancialControlRows
            rows={rows}
            studentHref={(id) => `/admin/students/${id}`}
            scheduleHref={(id) => `/admin/students/${id}`}
            hideAmounts={deskOnly}
          />
        )}
      </div>

      {meta && meta.totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            className="rounded-lg border border-zinc-200 px-3 py-1.5 text-sm disabled:opacity-40"
          >
            Précédent
          </button>
          <span className="text-sm text-zinc-500">
            Page {meta.page} / {meta.totalPages}
          </span>
          <button
            type="button"
            disabled={page >= meta.totalPages}
            onClick={() => setPage((p) => p + 1)}
            className="rounded-lg border border-zinc-200 px-3 py-1.5 text-sm disabled:opacity-40"
          >
            Suivant
          </button>
        </div>
      )}
    </div>
  )
}

export default function AdminFinanceControlePage() {
  return (
    <div className="p-6 max-w-7xl mx-auto">
      <Suspense fallback={<div className="text-sm text-zinc-400">Chargement…</div>}>
        <ControleContent />
      </Suspense>
    </div>
  )
}
