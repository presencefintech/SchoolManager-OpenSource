'use client'

import { useState } from 'react'
import { Download, Loader2, Printer } from 'lucide-react'
import { useDownloadReceipt } from '@/lib/hooks/use-finance'
import { financeRoleApi } from '@/lib/finance/api/finance.api'
import { downloadBlob } from '@/lib/finance/download-blob'
import { cn } from '@/lib/utils'

interface PrintReceiptButtonProps {
  paymentId: number
  className?: string
}

export function PrintReceiptButton({ paymentId, className }: PrintReceiptButtonProps) {
  const downloadReceipt = useDownloadReceipt()
  const [thermalLoading, setThermalLoading] = useState(false)

  async function handleDownload() {
    try {
      const blob = await downloadReceipt.mutateAsync(paymentId)
      downloadBlob(blob, `recu-${paymentId}.pdf`)
    } catch {
      /* toast géré par l'appelant si besoin */
    }
  }

  async function handleThermal() {
    setThermalLoading(true)
    try {
      const data = await financeRoleApi.getThermalReceipt(paymentId)
      const html =
        (data as { html?: string })?.html ??
        (typeof data === 'string' ? data : JSON.stringify(data, null, 2))
      const win = window.open('', '_blank')
      if (win) {
        win.document.write(html)
        win.document.close()
        win.print()
      }
    } catch {
      /* silencieux */
    } finally {
      setThermalLoading(false)
    }
  }

  return (
    <div className={cn('flex flex-wrap items-center gap-2', className)}>
      <button
        type="button"
        onClick={() => void handleDownload()}
        disabled={downloadReceipt.isPending}
        className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-50"
      >
        {downloadReceipt.isPending ? (
          <Loader2 size={13} className="animate-spin" />
        ) : (
          <Download size={13} />
        )}
        PDF
      </button>
      <button
        type="button"
        onClick={() => void handleThermal()}
        disabled={thermalLoading}
        className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-50"
      >
        {thermalLoading ? (
          <Loader2 size={13} className="animate-spin" />
        ) : (
          <Printer size={13} />
        )}
        Ticket
      </button>
    </div>
  )
}
