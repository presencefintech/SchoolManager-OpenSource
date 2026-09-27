'use client'

import Link from 'next/link'
import { AlertTriangle, RefreshCw, ShieldAlert, Gavel } from 'lucide-react'
import { motion } from 'framer-motion'
import { useQuery } from '@tanstack/react-query'
import { cn } from '@/lib/utils'
import { directorFraudApi } from '@/lib/admin/api/director-fraud.api'
import { DirectorPageHeader, DirectorEmptyState, DirectorKpiCard } from '@/components/director/director-ui'

const HIGH_RISK_THRESHOLD = 0.7

export default function DirectorFraudePage() {
  const listQuery = useQuery({
    queryKey: ['director', 'fraud-alerts'],
    queryFn: () => directorFraudApi.list(),
    staleTime: 20_000,
  })

  const alerts = listQuery.data ?? []
  const highRisk = alerts.filter((a) => (a.fraudScore ?? 0) >= HIGH_RISK_THRESHOLD).length

  return (
    <div className="min-h-screen bg-zinc-50">
      <DirectorPageHeader
        title="Alertes de fraude"
        subtitle="Présences suspectes de votre périmètre — lecture seule, la résolution reste Admin"
        actions={
          <button
            type="button"
            onClick={() => listQuery.refetch()}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-sm rounded-xl border border-zinc-200 bg-white hover:bg-zinc-50"
          >
            <RefreshCw size={14} className={cn(listQuery.isFetching && 'animate-spin')} />
            Actualiser
          </button>
        }
      />

      <div className="max-w-5xl mx-auto px-6 sm:px-8 py-8 space-y-6">
        <div className="grid grid-cols-2 gap-3 max-w-md">
          <DirectorKpiCard label="Alertes" value={alerts.length} icon={ShieldAlert} tone="amber" />
          <DirectorKpiCard label="Risque élevé" value={highRisk} icon={AlertTriangle} tone="indigo" />
        </div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl border border-zinc-200 bg-white overflow-hidden"
        >
          {listQuery.isLoading ? (
            <div className="p-8 text-center text-sm text-zinc-400">Chargement…</div>
          ) : alerts.length === 0 ? (
            <DirectorEmptyState
              icon={ShieldAlert}
              title="Aucune alerte"
              description="Les présences suspectes de vos classes apparaîtront ici."
            />
          ) : (
            <ul className="divide-y divide-zinc-100">
              {alerts.map((alert) => (
                <li key={alert.id} className="px-4 py-3 hover:bg-zinc-50/80">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className={cn(
                            'text-[11px] font-semibold px-2 py-0.5 rounded-full',
                            (alert.fraudScore ?? 0) >= HIGH_RISK_THRESHOLD
                              ? 'bg-red-50 text-red-700'
                              : 'bg-amber-50 text-amber-800'
                          )}
                        >
                          Score {alert.fraudScore != null ? Math.round(alert.fraudScore * 100) : '—'}%
                        </span>
                        <span className="text-[11px] text-zinc-400">
                          {new Date(alert.createdAt).toLocaleString('fr-FR')}
                        </span>
                      </div>
                      <p className="mt-1 text-sm font-semibold text-zinc-900">
                        {alert.student ? `${alert.student.lastName} ${alert.student.firstName}` : `Élève #${alert.studentId}`}
                        {alert.className ? ` · ${alert.className}` : ''}
                      </p>
                      {alert.fraudReasons && (
                        <p className="text-xs text-zinc-500 mt-0.5">{alert.fraudReasons}</p>
                      )}
                    </div>
                    <Link
                      href={`/director/discipline?studentId=${alert.studentId}${alert.classId ? `&classId=${alert.classId}` : ''}`}
                      className="flex-shrink-0 inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-lg border border-indigo-200 text-indigo-700 hover:bg-indigo-50"
                    >
                      <Gavel size={12} /> Ouvrir un dossier
                    </Link>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </motion.div>
      </div>
    </div>
  )
}
