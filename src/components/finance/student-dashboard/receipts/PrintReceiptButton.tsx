'use client'

import { Download, Loader2 } from 'lucide-react'
import { useDownloadReceipt } from '@/lib/hooks/use-finance'
import { downloadBlob } from '@/lib/finance/download-blob'
import { cn } from '@/lib/utils'

interface PrintReceiptButtonProps {
  paymentId: number
  className?: string
}

export function PrintReceiptButton({ paymentId, className }: PrintReceiptButtonProps) {
  const downloadReceipt = useDownloadReceipt()

  async function handleDownload() {
    try {
      const blob = await downloadReceipt.mutateAsync(paymentId)
      downloadBlob(blob, `recu-${paymentId}.pdf`)
    } catch {
      /* toast géré par l'appelant si besoin */
    }
  }

  return (
    <button
      type="button"
      onClick={() => void handleDownload()}
      disabled={downloadReceipt.isPending}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-50',
        className,
      )}
    >
      {downloadReceipt.isPending ? (
        <Loader2 size={13} className="animate-spin" />
      ) : (
        <Download size={13} />
      )}
      Ticket caisse
    </button>
  )
}
