'use client'

import { useState } from 'react'
import { Download, FileSpreadsheet, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useExportAttendanceSheet } from '@/lib/hooks/use-admin'

type Props = {
  sheetId: number
  className?: string
  compact?: boolean
}

export function AttendanceSheetExportButtons({ sheetId, className, compact }: Props) {
  const exportSheet = useExportAttendanceSheet()
  const [activeFormat, setActiveFormat] = useState<'pdf' | 'csv' | null>(null)

  function download(format: 'pdf' | 'csv') {
    setActiveFormat(format)
    exportSheet.mutate(
      { sheetId, format },
      { onSettled: () => setActiveFormat(null) },
    )
  }

  const busy = exportSheet.isPending

  if (compact) {
    return (
      <div className={cn('inline-flex gap-1', className)}>
        <button
          type="button"
          disabled={busy}
          onClick={() => download('pdf')}
          title="Télécharger le registre PDF"
          className="inline-flex items-center gap-1 rounded-lg border border-zinc-200 bg-white px-2 py-1 text-[11px] font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-50"
        >
          {busy && activeFormat === 'pdf' ? (
            <Loader2 size={12} className="animate-spin" />
          ) : (
            <Download size={12} />
          )}
          PDF
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => download('csv')}
          title="Exporter en CSV"
          className="inline-flex items-center gap-1 rounded-lg border border-zinc-200 bg-white px-2 py-1 text-[11px] font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-50"
        >
          {busy && activeFormat === 'csv' ? (
            <Loader2 size={12} className="animate-spin" />
          ) : (
            <FileSpreadsheet size={12} />
          )}
          CSV
        </button>
      </div>
    )
  }

  return (
    <div className={cn('flex flex-col gap-2 sm:flex-row', className)}>
      <button
        type="button"
        disabled={busy}
        onClick={() => download('pdf')}
        className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-700 disabled:opacity-50"
      >
        {busy && activeFormat === 'pdf' ? (
          <Loader2 size={16} className="animate-spin" />
        ) : (
          <Download size={16} />
        )}
        Télécharger le registre (PDF)
      </button>
      <button
        type="button"
        disabled={busy}
        onClick={() => download('csv')}
        className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 disabled:opacity-50"
      >
        {busy && activeFormat === 'csv' ? (
          <Loader2 size={16} className="animate-spin" />
        ) : (
          <FileSpreadsheet size={16} />
        )}
        Export CSV
      </button>
    </div>
  )
}
