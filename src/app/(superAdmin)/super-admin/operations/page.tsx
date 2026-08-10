'use client'

import { Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Activity, Download, Loader2, ScrollText, ShieldAlert } from 'lucide-react'
import { cn } from '@/lib/utils'
import { MonitoringView } from '../monitoring/page'
import { AuditView } from '../audit/page'
import { FraudView } from '../fraud/page'
import { superAdminApi } from '@/lib/superAdmin/api'
import { useState } from 'react'

const TABS = [
  { id: 'monitoring', label: 'Monitoring', icon: Activity },
  { id: 'audit', label: 'Audit & logs', icon: ScrollText },
  { id: 'fraud', label: 'Fraude', icon: ShieldAlert },
] as const

type TabId = (typeof TABS)[number]['id']

function OperationsContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const tabParam = searchParams.get('tab')
  const tab: TabId =
    tabParam === 'audit' || tabParam === 'fraud' || tabParam === 'monitoring' ? tabParam : 'monitoring'

  const [exporting, setExporting] = useState(false)

  const setTab = (id: TabId) => {
    router.replace(`/super-admin/operations?tab=${id}`, { scroll: false })
  }

  const handleExport = async () => {
    setExporting(true)
    try {
      const blob = await superAdminApi.exportAuditCSV()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `audit_logs_${new Date().toISOString().slice(0, 10)}.csv`
      a.click()
      URL.revokeObjectURL(url)
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className="min-h-screen bg-zinc-50">
      <div className="bg-white border-b border-zinc-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-5 space-y-4">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-indigo-600">Propriétaire</p>
              <h1 className="text-2xl font-bold text-zinc-900 mt-0.5">Centre opérations</h1>
              <p className="text-sm text-zinc-400 mt-1">
                Monitoring, audit infrastructure et détection fraude — vue unifiée
              </p>
            </div>
            {tab === 'audit' ? (
              <button
                type="button"
                onClick={handleExport}
                disabled={exporting}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-xl border border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50 disabled:opacity-50"
              >
                {exporting ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
                Export CSV audit
              </button>
            ) : null}
          </div>

          <div className="flex gap-1 rounded-xl border border-zinc-200 bg-zinc-50 p-1 w-fit">
            {TABS.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                type="button"
                onClick={() => setTab(id)}
                className={cn(
                  'inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors',
                  tab === id
                    ? 'bg-white text-indigo-700 shadow-sm ring-1 ring-indigo-100'
                    : 'text-zinc-500 hover:text-zinc-800',
                )}
              >
                <Icon size={15} />
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto">
        {tab === 'monitoring' ? <MonitoringView embedded /> : null}
        {tab === 'audit' ? <AuditView embedded /> : null}
        {tab === 'fraud' ? <FraudView embedded /> : null}
      </div>
    </div>
  )
}

export default function OperationsPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center text-sm text-zinc-400">
          Chargement…
        </div>
      }
    >
      <OperationsContent />
    </Suspense>
  )
}
