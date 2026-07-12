'use client'

import { useState } from 'react'
import { CloudUpload, ChevronDown, ChevronUp, RefreshCw } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useSyncBatches, useSyncBatchDetail } from '@/lib/hooks/use-admin'

function Sk({ className }: { className?: string }) {
  return <div className={cn('rounded-lg bg-slate-100 animate-pulse', className)} />
}

function fmtDateTime(iso: string) {
  try {
    return new Date(iso).toLocaleString('fr-FR', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return iso
  }
}

function rateColor(rate: number) {
  if (rate >= 90) return 'bg-emerald-500'
  if (rate >= 70) return 'bg-amber-500'
  return 'bg-red-500'
}

function BatchDetail({ batchId }: { batchId: string }) {
  const { data, isLoading } = useSyncBatchDetail(batchId)
  if (isLoading) return <Sk className="h-12 mx-4 my-2" />
  if (!data?.results?.length) {
    return <p className="px-4 py-2 text-[11px] text-slate-400">Aucun détail item.</p>
  }
  return (
    <ul className="px-4 py-2 space-y-1 max-h-32 overflow-y-auto bg-slate-50/80 border-t border-slate-100">
      {data.results.slice(0, 20).map((r, i) => (
        <li key={i} className="flex justify-between gap-2 text-[10px]">
          <span className="text-slate-600">Élève #{r.studentId ?? '?'}</span>
          <span className={cn(r.duplicate ? 'text-amber-600' : r.error ? 'text-red-600' : 'text-emerald-600')}>
            {r.duplicate ? 'Doublon' : r.error ? r.error : r.status ?? 'OK'}
          </span>
        </li>
      ))}
    </ul>
  )
}

export function SyncBatchesPanel() {
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const { data, isLoading, refetch, isFetching } = useSyncBatches({ limit: 15 })
  const batches = data?.batches ?? []

  return (
    <div className="rounded-xl border border-slate-200/80 bg-white/90 shadow-[0_1px_3px_rgba(15,23,42,0.06)] overflow-hidden h-full flex flex-col">
      <div className="flex items-center justify-between gap-2 px-5 py-3.5 border-b border-slate-100 bg-slate-50/50">
        <div className="flex items-center gap-2">
          <CloudUpload size={16} className="text-sky-600" />
          <h3 className="text-sm font-semibold text-slate-800">Sync offline</h3>
          <span className="text-[10px] text-slate-400">lots récents</span>
        </div>
        <button
          type="button"
          onClick={() => void refetch()}
          disabled={isFetching}
          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-white disabled:opacity-50"
        >
          <RefreshCw size={14} className={cn(isFetching && 'animate-spin')} />
        </button>
      </div>

      <div className="flex-1 overflow-auto max-h-72">
        {isLoading ? (
          <div className="p-4 space-y-2">
            <Sk className="h-12" />
            <Sk className="h-12" />
          </div>
        ) : batches.length === 0 ? (
          <p className="px-5 py-10 text-center text-sm text-slate-400">
            Aucun lot de synchronisation enregistré.
          </p>
        ) : (
          <ul className="divide-y divide-slate-50">
            {batches.map((b) => {
              const open = expandedId === b.id
              return (
                <li key={b.id}>
                  <button
                    type="button"
                    onClick={() => setExpandedId(open ? null : b.id)}
                    className="w-full px-4 py-3 text-left hover:bg-slate-50/80 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-slate-800">
                          {b.itemCount} item{b.itemCount > 1 ? 's' : ''} · acteur #{b.actorId}
                        </p>
                        <p className="text-[10px] text-slate-400 mt-0.5">{fmtDateTime(b.createdAt)}</p>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className="text-xs font-bold tabular-nums text-slate-700">{b.successRate}%</span>
                        {open ? <ChevronUp size={14} className="text-slate-400" /> : <ChevronDown size={14} className="text-slate-400" />}
                      </div>
                    </div>
                    <div className="mt-2 h-1.5 rounded-full bg-slate-100 overflow-hidden">
                      <div
                        className={cn('h-full rounded-full transition-all', rateColor(b.successRate))}
                        style={{ width: `${Math.min(100, b.successRate)}%` }}
                      />
                    </div>
                    <div className="flex gap-3 mt-1.5 text-[10px] text-slate-500">
                      <span className="text-emerald-600">{b.successCount} OK</span>
                      <span className="text-red-600">{b.failedCount} échec</span>
                      <span className="text-amber-600">{b.duplicateCount} doublon</span>
                    </div>
                  </button>
                  {open && <BatchDetail batchId={b.id} />}
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </div>
  )
}
