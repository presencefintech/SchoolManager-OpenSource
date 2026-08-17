'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Activity, Cpu, MemoryStick, Clock, RefreshCw, CheckCircle, AlertTriangle, XCircle } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { cn } from '@/lib/utils'
import { adminMonitoringApi } from '@/lib/admin/api'

const fadeUp = { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0, transition: { duration: 0.25 } } }

function Sk({ className }: { className?: string }) {
  return <div className={cn('rounded-xl bg-zinc-100 animate-pulse', className)} />
}

function useHealthDashboard() {
  return useQuery({
    queryKey: ['admin', 'monitoring', 'health'],
    queryFn: adminMonitoringApi.getHealth,
    staleTime: 30_000,
    refetchInterval: 60_000,
  })
}

function useSystemStats() {
  return useQuery({
    queryKey: ['admin', 'monitoring', 'stats'],
    queryFn: adminMonitoringApi.getStats,
    staleTime: 15_000,
    refetchInterval: 30_000,
  })
}

function statusConfig(status: string | undefined) {
  if (!status) return { label: 'Inconnu', cls: 'bg-zinc-50 text-zinc-500 border-zinc-100', icon: AlertTriangle }
  const s = status.toUpperCase()
  if (s === 'OK' || s === 'HEALTHY' || s === 'UP')
    return { label: 'Opérationnel', cls: 'bg-emerald-50 text-emerald-700 border-emerald-100', icon: CheckCircle }
  if (s === 'WARN' || s === 'DEGRADED')
    return { label: 'Dégradé', cls: 'bg-amber-50 text-amber-700 border-amber-100', icon: AlertTriangle }
  return { label: 'En erreur', cls: 'bg-red-50 text-red-700 border-red-100', icon: XCircle }
}

function GaugeBar({ value, max = 100, color }: { value: number; max?: number; color: string }) {
  const pct = Math.min(100, (value / max) * 100)
  return (
    <div className="h-2 w-full bg-zinc-100 rounded-full overflow-hidden">
      <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, backgroundColor: color }} />
    </div>
  )
}

function formatUptime(seconds: number) {
  const d = Math.floor(seconds / 86400)
  const h = Math.floor((seconds % 86400) / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  if (d > 0) return `${d}j ${h}h ${m}m`
  if (h > 0) return `${h}h ${m}m`
  return `${m}m`
}

export default function MonitoringPage() {
  const { data: health, isLoading: healthLoading, refetch: refetchHealth, dataUpdatedAt } = useHealthDashboard()
  const { data: stats, isLoading: statsLoading, refetch: refetchStats } = useSystemStats()
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null)

  useEffect(() => { if (dataUpdatedAt) setLastUpdate(new Date(dataUpdatedAt)) }, [dataUpdatedAt])

  const s = stats as any
  const cpu = Number(s?.cpu ?? s?.cpuUsage ?? 0)
  const mem = Number(s?.memory ?? s?.memoryUsage ?? 0)
  const uptime = Number(s?.uptime ?? 0)

  const healthMap: Record<string, any> = typeof health === 'object' && health !== null ? health as Record<string, any> : {}

  const services = Object.entries(healthMap).filter(([k]) =>
    !['timestamp', 'uptime', 'cpu', 'memory', 'version'].includes(k)
  )

  function refetchAll() { refetchHealth(); refetchStats() }

  return (
    <div className="min-h-screen bg-[#f5f7fb]">
      <div className="bg-white border-b border-zinc-200">
        <div className="max-w-6xl mx-auto flex items-center justify-between px-8 py-5">
          <div>
            <h1 className="text-2xl font-semibold text-zinc-900">État du système</h1>
            <p className="text-sm text-zinc-400 mt-0.5">
              {lastUpdate
                ? `Dernière mise à jour : ${lastUpdate.toLocaleTimeString('fr-FR')}`
                : 'Chargement…'}
            </p>
          </div>
          <button onClick={refetchAll} className="p-2.5 rounded-xl border border-zinc-200 text-zinc-400 hover:bg-zinc-50 transition-colors">
            <RefreshCw size={15} />
          </button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-8 py-8 space-y-6">
        <div className="grid grid-cols-3 gap-4">
          <motion.div variants={fadeUp} initial="hidden" animate="show"
            className="bg-white rounded-2xl border border-zinc-200 shadow-[0_1px_4px_rgba(0,0,0,0.06)] p-5">
            {statsLoading ? <Sk className="h-20" /> : (
              <>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-blue-50 flex items-center justify-center">
                      <Cpu size={14} className="text-blue-600" />
                    </div>
                    <span className="text-sm font-medium text-zinc-600">CPU</span>
                  </div>
                  <span className={cn('text-lg font-bold tabular-nums', cpu > 80 ? 'text-red-600' : cpu > 60 ? 'text-amber-600' : 'text-zinc-900')}>
                    {cpu.toFixed(1)}%
                  </span>
                </div>
                <GaugeBar value={cpu} color={cpu > 80 ? '#dc2626' : cpu > 60 ? '#d97706' : '#059669'} />
              </>
            )}
          </motion.div>

          <motion.div variants={fadeUp} initial="hidden" animate="show"
            className="bg-white rounded-2xl border border-zinc-200 shadow-[0_1px_4px_rgba(0,0,0,0.06)] p-5">
            {statsLoading ? <Sk className="h-20" /> : (
              <>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-purple-50 flex items-center justify-center">
                      <MemoryStick size={14} className="text-purple-600" />
                    </div>
                    <span className="text-sm font-medium text-zinc-600">Mémoire</span>
                  </div>
                  <span className={cn('text-lg font-bold tabular-nums', mem > 85 ? 'text-red-600' : mem > 70 ? 'text-amber-600' : 'text-zinc-900')}>
                    {mem.toFixed(1)}%
                  </span>
                </div>
                <GaugeBar value={mem} color={mem > 85 ? '#dc2626' : mem > 70 ? '#d97706' : '#7c3aed'} />
              </>
            )}
          </motion.div>

          <motion.div variants={fadeUp} initial="hidden" animate="show"
            className="bg-white rounded-2xl border border-zinc-200 shadow-[0_1px_4px_rgba(0,0,0,0.06)] p-5">
            {statsLoading ? <Sk className="h-20" /> : (
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-emerald-50 flex items-center justify-center">
                  <Clock size={14} className="text-emerald-600" />
                </div>
                <div>
                  <p className="text-xs text-zinc-400 font-medium">Disponibilité</p>
                  <p className="text-lg font-bold text-zinc-900">{uptime ? formatUptime(uptime) : '—'}</p>
                </div>
              </div>
            )}
          </motion.div>
        </div>

        <motion.div variants={fadeUp} initial="hidden" animate="show"
          className="bg-white rounded-2xl border border-zinc-200 shadow-[0_1px_4px_rgba(0,0,0,0.06)]">
          <div className="px-6 py-4 border-b border-zinc-100 flex items-center gap-2">
            <Activity size={14} className="text-zinc-400" />
            <h2 className="text-sm font-semibold text-zinc-900">État des services</h2>
          </div>

          {healthLoading ? (
            <div className="p-6 space-y-3">
              {Array.from({ length: 5 }).map((_, i) => <Sk key={i} className="h-12" />)}
            </div>
          ) : services.length === 0 ? (
            <div className="py-12 text-center">
              <Activity size={26} className="mx-auto text-zinc-200 mb-2" />
              <p className="text-sm text-zinc-400">Aucun service à afficher</p>
            </div>
          ) : (
            <div className="divide-y divide-zinc-50">
              {services.map(([name, val]) => {
                const status = typeof val === 'string' ? val : (val as any)?.status ?? (val as any)?.state
                const cfg = statusConfig(status)
                const Icon = cfg.icon
                const details = typeof val === 'object' && val !== null
                  ? Object.entries(val as Record<string, unknown>)
                      .filter(([k]) => k !== 'status' && k !== 'state')
                      .map(([k, v]) => `${k}: ${v}`)
                      .join(' · ')
                  : ''
                return (
                  <div key={name} className="flex items-center justify-between px-6 py-4">
                    <div>
                      <p className="text-sm font-medium text-zinc-900 capitalize">{name.replace(/_/g, ' ')}</p>
                      {details && <p className="text-xs text-zinc-400 mt-0.5">{details}</p>}
                    </div>
                    <span className={cn('flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full border', cfg.cls)}>
                      <Icon size={11} />
                      {cfg.label}
                    </span>
                  </div>
                )
              })}
            </div>
          )}
        </motion.div>

      </div>
    </div>
  )
}
