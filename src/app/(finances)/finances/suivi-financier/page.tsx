'use client'

import { Suspense, useMemo, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { Filter, Printer, Download, RefreshCw, Users, CheckCircle2, AlertTriangle } from 'lucide-react'
import { StudentFeeScheduleLink } from '@/components/finance/student-fee-schedule-link'
import {
  useStudentsFinancial,
  useExportStudentsFinancialPrint,
  useFinanceClasses,
} from '@/lib/hooks/use-finance'
import { formatMoney } from '@/lib/finance/currency'
import { cn } from '@/lib/utils'
import type { StudentFinancialRow, StudentsFinancialPrintReport } from '@/types/finance'
import { FinancePageHeader, FinancePageShell } from '@/components/finance/finance-page-shell'

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

function openPrintReport(report: StudentsFinancialPrintReport) {
  const w = window.open('', '_blank', 'noopener,noreferrer,width=900,height=700')
  if (!w) return

  const rows = report.rows
    .map(
      (r) => `
      <tr>
        <td>${r.matricule}</td>
        <td>${r.eleve}</td>
        <td>${r.classe}</td>
        <td>${r.section}</td>
        <td>${r.option}</td>
        <td class="num">${formatMoney(r.fraisTotaux)}</td>
        <td class="num">${formatMoney(r.dejaPaye)}</td>
        <td class="num">${formatMoney(r.solde)}</td>
        <td>${r.statut}</td>
      </tr>`,
    )
    .join('')

  w.document.write(`<!DOCTYPE html>
<html><head><meta charset="utf-8"/><title>Suivi financier — ${report.schoolName}</title>
<style>
  body{font-family:system-ui,sans-serif;padding:24px;color:#18181b;font-size:12px}
  h1{font-size:18px;margin:0 0 4px} .meta{color:#71717a;margin-bottom:16px}
  table{width:100%;border-collapse:collapse} th,td{border:1px solid #e4e4e7;padding:6px 8px;text-align:left}
  th{background:#f4f4f5;font-size:11px;text-transform:uppercase;letter-spacing:.03em}
  .num{text-align:right;font-variant-numeric:tabular-nums}
  .summary{display:flex;gap:16px;margin:16px 0 20px;flex-wrap:wrap}
  .summary div{padding:10px 14px;border:1px solid #e4e4e7;border-radius:8px;min-width:120px}
  .summary strong{display:block;font-size:16px;margin-top:2px}
  @media print{body{padding:12px}}
</style></head><body>
  <h1>Suivi financier — ${report.schoolName}</h1>
  <p class="meta">Généré le ${new Date(report.generatedAt).toLocaleString('fr-FR')}</p>
  <div class="summary">
    <div>Élèves<strong>${report.summary.total}</strong></div>
    <div>Débiteurs<strong>${report.summary.debtors}</strong></div>
    <div>En ordre<strong>${report.summary.paid}</strong></div>
    <div>Solde total<strong>${formatMoney(report.summary.totalBalance)}</strong></div>
  </div>
  <table>
    <thead><tr>${report.columns.map((c) => `<th>${c}</th>`).join('')}</tr></thead>
    <tbody>${rows}</tbody>
  </table>
  <script>window.onload=()=>window.print()</script>
</body></html>`)
  w.document.close()
}

export default function SuiviFinancierPage() {
  return (
    <Suspense fallback={null}>
      <SuiviFinancierContent />
    </Suspense>
  )
}

function SuiviFinancierContent() {
  const searchParams = useSearchParams()
  const initialStatus = searchParams.get('status') === 'DEBTOR' || searchParams.get('status') === 'PAID'
    ? (searchParams.get('status') as 'DEBTOR' | 'PAID')
    : ''

  const [classId, setClassId] = useState(0)
  const [sectionId, setSectionId] = useState(0)
  const [optionId, setOptionId] = useState(0)
  const [status, setStatus] = useState<'' | 'DEBTOR' | 'PAID'>(initialStatus)
  const [page, setPage] = useState(1)

  const filters = useMemo(
    () => ({
      classId: classId > 0 ? classId : undefined,
      sectionId: sectionId > 0 ? sectionId : undefined,
      optionId: optionId > 0 ? optionId : undefined,
      status: status || undefined,
      page,
      limit: 50,
    }),
    [classId, sectionId, optionId, status, page],
  )

  const { data, isLoading, isFetching, refetch } = useStudentsFinancial(filters)
  const { data: classesRaw } = useFinanceClasses()
  const exportPrint = useExportStudentsFinancialPrint()

  const classes: Array<{
    id: number
    name: string
    sectionId?: number
    optionId?: number
    section?: { id: number; name: string }
    option?: { id: number; name: string }
  }> = Array.isArray(classesRaw) ? classesRaw : (classesRaw as { data?: unknown[] })?.data ?? []

  const sections = useMemo(() => {
    const map = new Map<number, string>()
    for (const c of classes) {
      const id = c.sectionId ?? c.section?.id
      const name = c.section?.name
      if (id && name) map.set(id, name)
    }
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }))
  }, [classes])

  const options = useMemo(() => {
    const map = new Map<number, string>()
    for (const c of classes) {
      if (sectionId > 0 && (c.sectionId ?? c.section?.id) !== sectionId) continue
      const id = c.optionId ?? c.option?.id
      const name = c.option?.name
      if (id && name) map.set(id, name)
    }
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }))
  }, [classes, sectionId])

  const filteredClasses = useMemo(() => {
    return classes.filter((c) => {
      if (sectionId > 0 && (c.sectionId ?? c.section?.id) !== sectionId) return false
      if (optionId > 0 && (c.optionId ?? c.option?.id) !== optionId) return false
      return true
    })
  }, [classes, sectionId, optionId])

  const rows = data?.data ?? []
  const meta = data?.meta

  async function handleExport(format: 'json' | 'csv') {
    const { page: _page, limit: _limit, ...exportFilters } = filters
    const result = await exportPrint.mutateAsync({
      ...exportFilters,
      format,
    })
    if (result.type === 'csv') {
      downloadBlob(result.blob, `suivi-financier-${new Date().toISOString().slice(0, 10)}.csv`)
    } else {
      openPrintReport(result.report)
    }
  }

  const selectCls =
    'rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400/40 min-w-[140px]'

  return (
    <FinancePageShell>
      <FinancePageHeader
        title="Suivi financier"
        subtitle="Filtrage par classe, section, option et statut — registre ERP RDC"
        actions={
          <>
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
              onClick={() => handleExport('csv')}
              className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-700 hover:bg-zinc-50 disabled:opacity-50"
            >
              <Download size={14} />
              Export CSV
            </button>
            <button
              type="button"
              disabled={exportPrint.isPending}
              onClick={() => handleExport('json')}
              className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
            >
              <Printer size={14} />
              Exporter pour impression
            </button>
          </>
        }
      />

      {meta && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="rounded-xl border border-zinc-200 bg-white p-4">
            <p className="text-xs text-zinc-500">Résultats</p>
            <p className="text-2xl font-bold text-zinc-900">{meta.total}</p>
          </div>
          <button
            type="button"
            onClick={() => { setStatus('DEBTOR'); setPage(1) }}
            className="rounded-xl border border-red-100 bg-red-50/50 p-4 text-left hover:bg-red-50 transition-colors"
          >
            <p className="text-xs text-red-600 flex items-center gap-1"><AlertTriangle size={12} /> Débiteurs</p>
            <p className="text-2xl font-bold text-red-800">{meta.debtors}</p>
          </button>
          <button
            type="button"
            onClick={() => { setStatus('PAID'); setPage(1) }}
            className="rounded-xl border border-emerald-100 bg-emerald-50/50 p-4 text-left hover:bg-emerald-50 transition-colors"
          >
            <p className="text-xs text-emerald-700 flex items-center gap-1"><CheckCircle2 size={12} /> En ordre</p>
            <p className="text-2xl font-bold text-emerald-800">{meta.paid}</p>
          </button>
          <div className="rounded-xl border border-zinc-200 bg-white p-4">
            <p className="text-xs text-zinc-500">Solde total</p>
            <p className="text-2xl font-bold text-zinc-900 tabular-nums">{formatMoney(meta.totalBalance)}</p>
          </div>
        </div>
      )}

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
            disabled={sections.length > 0 && !sectionId}
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
              setStatus(e.target.value as '' | 'DEBTOR' | 'PAID')
              setPage(1)
            }}
          >
            <option value="">Tous statuts</option>
            <option value="DEBTOR">Débiteurs</option>
            <option value="PAID">En ordre</option>
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
          <table className="w-full">
            <thead>
              <tr className="border-b border-zinc-100 bg-zinc-50/80">
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-zinc-400">Élève</th>
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-zinc-400">Classe</th>
                <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wide text-zinc-400">Frais</th>
                <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wide text-zinc-400">Payé</th>
                <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wide text-zinc-400">Solde</th>
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-zinc-400">Statut</th>
                <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wide text-zinc-400">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-50">
              {rows.map((row: StudentFinancialRow) => (
                <tr key={row.id} className="hover:bg-zinc-50/80 transition-colors">
                  <td className="px-5 py-3">
                    <Link
                      href={`/finances/eleves/${row.id}`}
                      className="block group"
                    >
                      <p className="text-sm font-medium text-zinc-900 group-hover:text-emerald-700">{row.fullName}</p>
                      <p className="text-xs text-zinc-400">{row.matricule}</p>
                    </Link>
                  </td>
                  <td className="px-5 py-3 text-sm text-zinc-600">
                    {row.className ?? '—'}
                    {(row.sectionName || row.optionName) && (
                      <p className="text-[10px] text-zinc-400">
                        {[row.sectionName, row.optionName].filter(Boolean).join(' · ')}
                      </p>
                    )}
                  </td>
                  <td className="px-5 py-3 text-sm text-right tabular-nums text-zinc-700">{formatMoney(row.totalFees)}</td>
                  <td className="px-5 py-3 text-sm text-right tabular-nums text-emerald-700">{formatMoney(row.feesPaid)}</td>
                  <td className={cn(
                    'px-5 py-3 text-sm text-right font-semibold tabular-nums',
                    row.balance > 0 ? 'text-red-600' : 'text-zinc-700',
                  )}>
                    {formatMoney(row.balance)}
                  </td>
                  <td className="px-5 py-3">
                    <span className={cn(
                      'text-xs font-medium px-2 py-0.5 rounded-full',
                      row.financialStatus === 'DEBTOR'
                        ? 'bg-red-50 text-red-700'
                        : 'bg-emerald-50 text-emerald-700',
                    )}>
                      {row.financialStatus === 'DEBTOR' ? 'Débiteur' : 'En ordre'}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-right">
                    <StudentFeeScheduleLink studentId={row.id} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
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
    </FinancePageShell>
  )
}
