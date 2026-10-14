'use client'

import { useRef, useState } from 'react'
import { useParams } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { Download, Upload } from 'lucide-react'
import { getApiErrorMessage } from '@/lib/api/client'
import { triggerBlobDownload } from '@/lib/download-blob'
import { parentApi, formatMoney } from '@/lib/parent/api'
import { parentKeys } from '@/lib/parent/hooks'
import { Card, ErrorState, ListSkeleton, PageHeader, Pill, Spinner, statusTone } from '@/components/parent/ui'

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(file)
  })
}

/** Détail d'un paiement : reçu PDF + dépôt d'une preuve de paiement. */
export default function ReceiptDetailPage() {
  const { paymentId } = useParams<{ paymentId: string }>()
  const payment = useQuery({
    queryKey: parentKeys.payment(paymentId),
    queryFn: () => parentApi.payment(paymentId),
  })
  const [busy, setBusy] = useState<'receipt' | 'proof' | null>(null)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  async function downloadReceipt() {
    setBusy('receipt')
    setError('')
    setMessage('')
    try {
      const blob = await parentApi.receiptPdf(paymentId)
      if (!blob) setMessage('Le reçu est en cours de génération, réessayez dans un instant.')
      else triggerBlobDownload(blob, `recu-${payment.data?.receiptNumber ?? paymentId}.pdf`)
    } catch (err) {
      setError(getApiErrorMessage(err))
    } finally {
      setBusy(null)
    }
  }

  async function uploadProof(file: File) {
    setBusy('proof')
    setError('')
    setMessage('')
    try {
      if (file.size > 5 * 1024 * 1024) throw new Error('Fichier trop volumineux (5 Mo maximum).')
      await parentApi.uploadProof(paymentId, await fileToDataUrl(file))
      setMessage('Preuve de paiement envoyée. L’école va la vérifier.')
    } catch (err) {
      setError(getApiErrorMessage(err))
    } finally {
      setBusy(null)
    }
  }

  if (payment.isLoading) return <ListSkeleton rows={2} />
  if (payment.isError || !payment.data) return <ErrorState onRetry={() => void payment.refetch()} />
  const p = payment.data
  const confirmed = p.status === 'CONFIRMED' || p.status === 'RECONCILED'

  return (
    <>
      <PageHeader title="Reçu de paiement" subtitle={p.reference} />
      <Card className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm text-zinc-500">Statut</span>
          <Pill tone={statusTone(p.status)}>{p.status}</Pill>
        </div>
        <Row label="Montant" value={formatMoney(p.serverAmount ?? p.amount, p.currency)} />
        {p.student?.name && <Row label="Élève" value={p.student.name} />}
        {p.method && <Row label="Méthode" value={p.method} />}
        {p.receiptNumber && <Row label="N° de reçu" value={p.receiptNumber} />}
        {p.confirmedAt && <Row label="Confirmé le" value={new Date(p.confirmedAt).toLocaleString('fr-FR')} />}
      </Card>

      <div className="mt-4 space-y-3">
        {confirmed && (
          <button
            type="button"
            onClick={() => void downloadReceipt()}
            disabled={busy !== null}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-teal-600 px-4 py-2.5 font-medium text-white disabled:opacity-50"
          >
            {busy === 'receipt' ? <Spinner /> : <Download className="h-4 w-4" />} Télécharger le reçu (PDF)
          </button>
        )}
        {!confirmed && (
          <>
            <input
              ref={fileRef}
              type="file"
              accept="image/*,application/pdf"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0]
                if (f) void uploadProof(f)
                e.target.value = ''
              }}
            />
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={busy !== null}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-line px-4 py-2.5 font-medium disabled:opacity-50"
            >
              {busy === 'proof' ? <Spinner /> : <Upload className="h-4 w-4" />} Joindre une preuve de paiement
            </button>
          </>
        )}
        {message && (
          <p role="status" className="text-sm text-emerald-700">
            {message}
          </p>
        )}
        {error && (
          <p role="alert" className="text-sm text-red-600">
            {error}
          </p>
        )}
      </div>
    </>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 text-sm">
      <span className="text-zinc-500">{label}</span>
      <span className="text-right font-medium">{value}</span>
    </div>
  )
}
