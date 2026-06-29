'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import {
  FileSpreadsheet, FileText, FileDown, ShieldCheck,
  Calendar, Building2, Download, Loader2, AlertCircle,
} from 'lucide-react'
import { useSchools, useFinanceReport } from '@/lib/hooks/use-super-admin'
import { exportApi, type ExportPayload } from '@/lib/superAdmin/api/export.api'
import { cn } from '@/lib/utils'
import { Skeleton } from '@/components/ui/skeleton'

const fmt = (n: number) =>
  new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'XOF', maximumFractionDigits: 0 }).format(n)

const METHOD_LABELS: Record<string, string> = {
  CASH: 'Espèces',
  ORANGE_MONEY: 'Orange Money',
  MPESA: 'M-Pesa',
  AIRTEL_MONEY: 'Airtel Money',
  BANK: 'Virement',
  CARD: 'Carte',
}

function Sk({ className }: { className?: string }) {
  return <div className={cn('rounded-xl bg-zinc-100 animate-pulse', className)} />
}


const FORMATS = [
  {
    key: 'excel' as const,
    label: 'Excel',
    ext: '.xlsx',
    desc: 'Tableau complet avec totaux',
    icon: FileSpreadsheet,
    color: 'text-emerald-600',
    bg: 'bg-emerald-50',
    ring: 'ring-emerald-200',
    hover: 'hover:bg-emerald-50',
  },
  {
    key: 'pdf' as const,
    label: 'PDF',
    ext: '.pdf',
    desc: 'Rapport mis en page',
    icon: FileText,
    color: 'text-red-500',
    bg: 'bg-red-50',
    ring: 'ring-red-200',
    hover: 'hover:bg-red-50',
  },
  {
    key: 'csv' as const,
    label: 'CSV',
    ext: '.csv',
    desc: 'Données brutes pour intégration',
    icon: FileDown,
    color: 'text-sky-600',
    bg: 'bg-sky-50',
    ring: 'ring-sky-200',
    hover: 'hover:bg-sky-50',
  },
  {
    key: 'secured' as const,
    label: 'Sécurisé',
    ext: '.xlsx',
    desc: 'Export avec contrôle d\'accès',
    icon: ShieldCheck,
    color: 'text-indigo-600',
    bg: 'bg-indigo-50',
    ring: 'ring-indigo-200',
    hover: 'hover:bg-indigo-50',
  },
]

export default function ExportPage() {
  const { data: schools } = useSchools()

  const [schoolId, setSchoolId] = useState<number | null>(null)
  const [from, setFrom] = useState(() => new Date(Date.now() - 30 * 86400_000).toISOString().slice(0, 10))
  const [to, setTo] = useState(() => new Date().toISOString().slice(0, 10))
  const [loading, setLoading] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const revenueParams = schoolId
    ? { schoolId, startDate: from + 'T00:00:00.000Z', endDate: to + 'T23:59:59.999Z' }
    : null

  const { data: report, isLoading: loadingReport } = useFinanceReport(revenueParams)

  const schoolName = schools?.find((s) => s.id === schoolId)?.name ?? ''

  const buildPayload = (format?: 'excel' | 'pdf' | 'csv'): ExportPayload => ({
    ...(report as ExportPayload),
    schoolId: schoolId!,
    format,
    period: { from: from + 'T00:00:00.000Z', to: to + 'T23:59:59.999Z' },
  })

  const handleExport = async (fmt: typeof FORMATS[number]) => {
    if (!report || !schoolId) return
    setLoading(fmt.key)
    setError(null)
    try {
      const payload = buildPayload(fmt.key === 'secured' ? 'excel' : fmt.key)
      if (fmt.key === 'excel')   await exportApi.excel(payload)
      else if (fmt.key === 'pdf')    await exportApi.pdf(payload)
      else if (fmt.key === 'csv')    await exportApi.csv(payload)
      else                           await exportApi.secured(payload)
    } catch {
      setError('Erreur lors de la génération du fichier. Réessayez.')
    } finally {
      setLoading(null)
    }
  }

  const hasData = !!report?.details?.length

  return (
    <div className="min-h-screen bg-zinc-50">

      {/* Header */}
      <motion.div className="bg-white border-b border-zinc-200" initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
        <div className="max-w-5xl mx-auto px-8 py-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-semibold text-zinc-900 tracking-tight">Exports</h1>
            <p className="text-sm text-zinc-400 mt-1">Génération de rapports financiers</p>
          </div>
          {report && (
            <div className="text-right">
              <p className="text-2xl font-bold text-zinc-900 tabular-nums">{fmt(report.summary.TOTAL)}</p>
              <p className="text-xs text-zinc-400 mt-0.5">{report.totalTransactions} transactions chargées</p>
            </div>
          )}
        </div>
      </motion.div>

      <div className="max-w-5xl mx-auto px-8 py-8 space-y-6">

        {/* ── 1. Sélection ── */}
        <div className="bg-white rounded-2xl border border-zinc-200 shadow-[0_2px_12px_rgba(0,0,0,0.06)] p-7">
          <h2 className="text-sm font-semibold text-zinc-500 uppercase tracking-wider mb-5">Paramètres</h2>
          <div className="flex flex-wrap gap-3">
            {/* École */}
            <div className="flex items-center gap-2 border border-zinc-200 rounded-xl px-4 py-2.5">
              <Building2 size={14} className="text-zinc-400 flex-shrink-0" />
              <select
                value={schoolId ?? ''}
                onChange={(e) => setSchoolId(e.target.value ? Number(e.target.value) : null)}
                className="text-sm text-zinc-700 bg-transparent focus:outline-none min-w-[200px]"
              >
                <option value="">Choisir un établissement…</option>
                {schools?.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>

            {/* Date début */}
            <div className="flex items-center gap-2 border border-zinc-200 rounded-xl px-4 py-2.5">
              <Calendar size={14} className="text-zinc-400 flex-shrink-0" />
              <input
                type="date"
                value={from}
                max={to}
                onChange={(e) => setFrom(e.target.value)}
                className="text-sm text-zinc-700 bg-transparent focus:outline-none"
              />
            </div>

            {/* Date fin */}
            <div className="flex items-center gap-2 border border-zinc-200 rounded-xl px-4 py-2.5">
              <Calendar size={14} className="text-zinc-400 flex-shrink-0" />
              <input
                type="date"
                value={to}
                min={from}
                max={new Date().toISOString().slice(0, 10)}
                onChange={(e) => setTo(e.target.value)}
                className="text-sm text-zinc-700 bg-transparent focus:outline-none"
              />
            </div>
          </div>

          {!schoolId && (
            <p className="text-xs text-zinc-400 mt-4 flex items-center gap-1.5">
              <AlertCircle size={12} />
              Sélectionnez un établissement pour charger les données
            </p>
          )}
        </div>

        {/* ── 2. Résumé ── */}
        {schoolId && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {loadingReport ? (
              [...Array(4)].map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)
            ) : report ? (
              <>
                <div className="bg-white rounded-xl border border-zinc-200 shadow-[0_1px_4px_rgba(0,0,0,0.06)] px-5 py-4">
                  <p className="text-xs text-zinc-400 mb-2">Total encaissé</p>
                  <p className="text-lg font-bold text-zinc-900 tabular-nums leading-none">{fmt(report.summary.TOTAL)}</p>
                </div>
                <div className="bg-white rounded-xl border border-zinc-200 shadow-[0_1px_4px_rgba(0,0,0,0.06)] px-5 py-4">
                  <p className="text-xs text-zinc-400 mb-2">Transactions</p>
                  <p className="text-lg font-bold text-zinc-900 tabular-nums leading-none">{report.totalTransactions.toLocaleString('fr-FR')}</p>
                </div>
                <div className="bg-white rounded-xl border border-zinc-200 shadow-[0_1px_4px_rgba(0,0,0,0.06)] px-5 py-4">
                  <p className="text-xs text-zinc-400 mb-2">Mobile Money</p>
                  <p className="text-lg font-bold text-zinc-900 tabular-nums leading-none">{fmt(report.summary.MOBILE_MONEY)}</p>
                </div>
                <div className="bg-white rounded-xl border border-zinc-200 shadow-[0_1px_4px_rgba(0,0,0,0.06)] px-5 py-4">
                  <p className="text-xs text-zinc-400 mb-2">Espèces</p>
                  <p className="text-lg font-bold text-zinc-900 tabular-nums leading-none">{fmt(report.summary.CASH)}</p>
                </div>
              </>
            ) : (
              <div className="col-span-4 bg-white rounded-xl border border-zinc-200 px-6 py-5 text-sm text-zinc-400 text-center">
                Aucun paiement confirmé sur cette période
              </div>
            )}
          </div>
        )}

        {/* ── 3. Formats d'export ── */}
        {schoolId && (
          <div className="bg-white rounded-2xl border border-zinc-200 shadow-[0_2px_12px_rgba(0,0,0,0.06)] p-7">
            <h2 className="text-sm font-semibold text-zinc-500 uppercase tracking-wider mb-5">Format d'export</h2>

            {error && (
              <div className="mb-4 flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
                <AlertCircle size={14} className="flex-shrink-0" />
                {error}
              </div>
            )}

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {FORMATS.map((f) => {
                const isLoading = loading === f.key
                const disabled = !hasData || !!loading
                const Icon = f.icon
                return (
                  <button
                    key={f.key}
                    onClick={() => handleExport(f)}
                    disabled={disabled}
                    className={cn(
                      'relative flex flex-col items-start gap-3 p-5 rounded-xl border transition-all text-left',
                      'border-zinc-200 bg-white',
                      !disabled && f.hover,
                      !disabled && 'hover:border-zinc-300 hover:shadow-sm',
                      disabled && 'opacity-50 cursor-not-allowed',
                      isLoading && 'ring-2 ' + f.ring,
                    )}
                  >
                    <div className={cn('w-9 h-9 rounded-lg flex items-center justify-center', f.bg)}>
                      {isLoading
                        ? <Loader2 size={18} className={cn('animate-spin', f.color)} />
                        : <Icon size={18} className={f.color} />
                      }
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-zinc-900">{f.label}</p>
                      <p className="text-xs text-zinc-400 mt-0.5">{f.desc}</p>
                    </div>
                    <span className="mt-auto inline-flex items-center gap-1 text-xs font-medium text-zinc-400">
                      <Download size={10} />
                      {f.ext}
                    </span>
                  </button>
                )
              })}
            </div>

            {!hasData && !loadingReport && schoolId && (
              <p className="text-xs text-zinc-400 mt-4 flex items-center gap-1.5">
                <AlertCircle size={12} />
                Aucune donnée à exporter pour cette sélection
              </p>
            )}
          </div>
        )}

        {/* ── 4. Aperçu des transactions ── */}
        {hasData && (
          <div className="bg-white rounded-2xl border border-zinc-200 shadow-[0_2px_12px_rgba(0,0,0,0.06)] overflow-hidden">
            <div className="flex items-center justify-between px-7 py-5 border-b border-zinc-100">
              <h2 className="text-sm font-semibold text-zinc-500 uppercase tracking-wider">
                Aperçu — {schoolName}
              </h2>
              <span className="text-xs text-zinc-400 tabular-nums">
                {from} → {to} · {report!.details.length} lignes
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-zinc-100">
                    {['Référence', 'Élève', 'Classe', 'Montant', 'Méthode', 'Date'].map((h) => (
                      <th key={h} className="px-5 py-3 text-left text-xs font-semibold text-zinc-400 uppercase tracking-wide whitespace-nowrap">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-50">
                  {report!.details.slice(0, 10).map((row) => (
                    <tr key={row.id} className="hover:bg-zinc-50 transition-colors">
                      <td className="px-5 py-3 font-mono text-xs text-zinc-400 whitespace-nowrap">
                        {row.reference.slice(0, 14)}…
                      </td>
                      <td className="px-5 py-3 text-zinc-700 font-medium whitespace-nowrap">{row.student}</td>
                      <td className="px-5 py-3 text-zinc-400 whitespace-nowrap">{row.class ?? '—'}</td>
                      <td className="px-5 py-3 font-semibold text-zinc-900 tabular-nums whitespace-nowrap">
                        {fmt(row.amount)}
                      </td>
                      <td className="px-5 py-3 whitespace-nowrap">
                        <span className="text-xs bg-zinc-100 text-zinc-600 px-2 py-0.5 rounded-full">
                          {METHOD_LABELS[row.method] ?? row.method}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-zinc-400 tabular-nums whitespace-nowrap">
                        {row.confirmedAt
                          ? new Date(row.confirmedAt).toLocaleDateString('fr-FR')
                          : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {report!.details.length > 10 && (
                <div className="px-7 py-3 border-t border-zinc-100 text-xs text-zinc-400">
                  + {(report!.details.length - 10).toLocaleString('fr-FR')} autres transactions dans l'export
                </div>
              )}
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
