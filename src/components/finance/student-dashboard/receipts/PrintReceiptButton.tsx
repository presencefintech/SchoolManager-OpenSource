'use client'

import { Download, Loader2, Printer } from 'lucide-react'
import { useDownloadReceipt } from '@/lib/hooks/use-finance'
import { downloadBlob } from '@/lib/finance/download-blob'
import { useToast } from '@/providers/toast-provider'
import { cn } from '@/lib/utils'

interface PrintReceiptButtonProps {
  paymentId: number
  className?: string
  /** Affiche aussi le téléchargement A4 (défaut true). */
  showA4?: boolean
}

export function PrintReceiptButton({
  paymentId,
  className,
  showA4 = true,
}: PrintReceiptButtonProps) {
  const downloadReceipt = useDownloadReceipt()
  const toast = useToast()

  async function handleDownload(format: 'A4' | 'Thermal') {
    try {
      const blob = await downloadReceipt.mutateAsync({ paymentId, format })
      downloadBlob(
        blob,
        format === 'A4' ? `recu-${paymentId}-a4.pdf` : `recu-${paymentId}-ticket.pdf`,
      )
      toast.success(
        format === 'Thermal' ? 'Ticket caisse prêt' : 'Reçu A4 prêt',
        `Fichier reçu-${paymentId} téléchargé`,
      )
    } catch {
      toast.error('Impression impossible', 'Réessayez ou ouvrez le PDF depuis l’aperçu.')
    }
  }

  const pending = downloadReceipt.isPending

  return (
    <div className={cn('inline-flex flex-wrap items-center gap-2', className)}>
      <button
        type="button"
        onClick={() => void handleDownload('Thermal')}
        disabled={pending}
        className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-800 hover:bg-emerald-100 disabled:opacity-50"
      >
        {pending ? <Loader2 size={13} className="animate-spin" /> : <Printer size={13} />}
        Ticket caisse
      </button>
      {showA4 ? (
        <button
          type="button"
          onClick={() => void handleDownload('A4')}
          disabled={pending}
          className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-50"
        >
          {pending ? <Loader2 size={13} className="animate-spin" /> : <Download size={13} />}
          Reçu A4
        </button>
      ) : null}
    </div>
  )
}
