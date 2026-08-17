'use client'

import { useState } from 'react'
import { Archive, Loader2, Printer } from 'lucide-react'
import { coreApi } from '@/lib/superAdmin/api/core.api'
import { triggerBlobDownload } from '@/lib/download-blob'
import { useSchool, useSchoolPrintLogs, useUpdateSchoolSaas } from '@/lib/hooks/use-super-admin'
import { useToast } from '@/providers/toast-provider'
import { CapacityBar, StatusBadge } from '@/components/super-admin/school-saas-drawer'
import { cn } from '@/lib/utils'

export function SchoolGodModePanel({ schoolId }: { schoolId: number }) {
  const toast = useToast()
  const { data: school } = useSchool(schoolId)
  const { data: logs = [], refetch } = useSchoolPrintLogs(schoolId)
  const mutation = useUpdateSchoolSaas(schoolId)
  const [zipBusy, setZipBusy] = useState(false)

  if (!school) return null

  const studentCount = school.studentCount ?? school._count.students

  async function exportZip() {
    setZipBusy(true)
    try {
      const blob = await coreApi.exportSchoolCardsZip(schoolId)
      triggerBlobDownload(blob, `cartes-pvc-school-${schoolId}.zip`)
      toast.success('Batch Export ZIP prêt')
      void refetch()
    } catch {
      toast.error('Échec du Batch Export')
    } finally {
      setZipBusy(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <StatusBadge status={school.status ?? (school.active ? 'ACTIVE' : 'SUSPENDED')} />
          <span className="text-xs font-mono text-zinc-500">{school.subscriptionTier ?? 'BASIC'}</span>
        </div>
        <button
          type="button"
          disabled={zipBusy}
          onClick={() => void exportZip()}
          className="inline-flex items-center gap-2 rounded-xl bg-zinc-900 px-3.5 py-2 text-sm font-semibold text-white hover:bg-zinc-800 disabled:opacity-50"
        >
          {zipBusy ? <Loader2 size={15} className="animate-spin" /> : <Archive size={15} />}
          Batch Export ZIP
        </button>
      </div>

      <CapacityBar count={studentCount} capacity={school.studentCapacity} />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        {(
          [
            ['printing', 'Impression'],
            ['mobile_app', 'Mobile'],
            ['finance_reports', 'Finance'],
          ] as const
        ).map(([key, label]) => {
          const on = Boolean(school.features?.[key] ?? (key === 'printing' && school.cardPrintingAllowed))
          return (
            <button
              key={key}
              type="button"
              disabled={mutation.isPending}
              onClick={() =>
                void mutation.mutateAsync({
                  features: { [key]: !on },
                  ...(key === 'printing' ? { cardPrintingAllowed: !on } : {}),
                }).then(() => toast.success(`${label} mis à jour`))
              }
              className={cn(
                'rounded-xl border px-3 py-2 text-left text-xs font-medium',
                on
                  ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                  : 'border-zinc-200 bg-zinc-50 text-zinc-500',
              )}
            >
              {label}: {on ? 'ON' : 'OFF'}
            </button>
          )
        })}
      </div>

      <div>
        <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-400 mb-2 flex items-center gap-1.5">
          <Printer size={12} /> Journal impressions
        </h3>
        {logs.length === 0 ? (
          <p className="text-xs text-zinc-500">Aucune impression enregistrée.</p>
        ) : (
          <ul className="space-y-1.5 max-h-48 overflow-y-auto">
            {logs.map((log) => (
              <li
                key={log.id}
                className="flex items-center justify-between gap-2 rounded-lg bg-zinc-50 px-2.5 py-1.5 text-[11px] text-zinc-600"
              >
                <span className="font-medium">{log.channel}</span>
                <span>{log.studentCount} carte{log.studentCount > 1 ? 's' : ''}</span>
                <span className="text-zinc-400">
                  {new Date(log.createdAt).toLocaleString('fr-FR')}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
