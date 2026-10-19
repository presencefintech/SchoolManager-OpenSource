'use client'

import Link from 'next/link'
import { useParams } from 'next/navigation'
import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Download, RefreshCw } from 'lucide-react'
import {
  DECLARATION_STATUS_LABEL,
  declarationsApi,
  formatPaymentCode,
  type DeclarationAllocation,
} from '@/lib/parent/declarations.api'
import { formatMoney } from '@/lib/parent/api'
import { getApiErrorMessage } from '@/lib/api/client'
import { Card, ErrorState, ListSkeleton, PageHeader, Pill, Spinner, statusTone } from '@/components/parent/ui'

function saveBlob(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = name
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export default function DeclarationStatusPage() {
  const params = useParams<{ id: string }>()
  const id = Number(params.id)
  const qc = useQueryClient()
  const [error, setError] = useState<string | null>(null)

  const q = useQuery({
    queryKey: ['parent', 'declarations', 'detail', id],
    queryFn: () => declarationsApi.get(id),
    refetchInterval: (query) => (query.state.data?.status === 'PENDING' ? 30_000 : false),
  })

  const resubmit = useMutation({
    mutationFn: (file: File) => declarationsApi.resubmit(id, file),
    onSuccess: () => {
      setError(null)
      void qc.invalidateQueries({ queryKey: ['parent', 'declarations'] })
    },
    onError: (err) => setError(getApiErrorMessage(err)),
  })

  const download = useMutation({
    mutationFn: (a: DeclarationAllocation) => declarationsApi.allocationReceipt(id, a.id),
    onSuccess: (blob, a) => saveBlob(blob, `recu-declaration-${a.id}.pdf`),
    onError: (err) => setError(getApiErrorMessage(err)),
  })

  const d = q.data

  return (
    <>
      <Link href="/parent/finance/declarations" className="mb-3 inline-flex items-center gap-1 text-sm text-zinc-500 hover:underline">
        <ArrowLeft className="h-4 w-4" /> Déclarations
      </Link>
      {q.isLoading ? (
        <ListSkeleton rows={3} />
      ) : q.isError || !d ? (
        <ErrorState message={getApiErrorMessage(q.error)} onRetry={() => void q.refetch()} />
      ) : (
        <>
          <PageHeader
            title={formatMoney(d.amount, d.currency)}
            subtitle={`${d.providerLabel} · réf. ${d.transactionRef}`}
            action={<Pill tone={statusTone(d.status)}>{DECLARATION_STATUS_LABEL[d.status]}</Pill>}
          />

          {d.status === 'PENDING' && (
            <Card className="mb-3 text-sm">
              {d.validationMode === 'INSTANT'
                ? 'Paiement pris en compte. Le reçu provisoire est disponible ci-dessous.'
                : 'L’école vérifie votre capture. Vous serez notifié dès la décision.'}
            </Card>
          )}
          {d.status === 'REJECTED' && (
            <Card className="mb-3 space-y-3 border-red-200 bg-red-50 text-sm text-red-900 dark:bg-red-950/30 dark:text-red-100">
              <p className="font-medium">Déclaration refusée</p>
              <p>{d.rejectionReason ?? 'Aucun motif communiqué.'}</p>
              <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-red-600 px-3 py-2 font-medium text-white hover:bg-red-700">
                {resubmit.isPending ? <Spinner /> : <RefreshCw className="h-4 w-4" />}
                Renvoyer une nouvelle capture
                <input
                  type="file"
                  accept="image/*"
                  className="sr-only"
                  onChange={(e) => {
                    const f = e.target.files?.[0]
                    if (f) resubmit.mutate(f)
                    e.target.value = ''
                  }}
                />
              </label>
            </Card>
          )}

          <Card className="mb-3">
            <dl className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
              {(
                [
                  ['Enfant', d.studentName],
                  ['Code paiement', d.paymentCode ? formatPaymentCode(d.paymentCode) : null],
                  ['Payé le', d.paidAt ? new Date(d.paidAt).toLocaleString('fr-FR') : null],
                  ['Payeur', [d.payerName, d.payerPhone].filter(Boolean).join(' · ') || null],
                  ['Note', d.note],
                  ['Reçu', d.receipt.label || d.receipt.number],
                ] as Array<[string, string | null]>
              )
                .filter(([, v]) => v)
                .map(([k, v]) => (
                  <div key={k} className="flex justify-between gap-3 border-b border-line py-1.5">
                    <dt className="text-zinc-500">{k}</dt>
                    <dd className="text-right font-medium">{v}</dd>
                  </div>
                ))}
            </dl>
          </Card>

          {d.allocations.length > 0 && (
            <Card className="mb-3 space-y-2">
              <h2 className="font-semibold">Répartition</h2>
              <ul className="divide-y divide-line">
                {d.allocations.map((a) => (
                  <li key={a.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                    <div className="min-w-0">
                      <p className="truncate font-medium">{a.studentName ?? 'Enfant'}</p>
                      <p className="truncate text-xs text-zinc-500">
                        {formatMoney(a.amount, a.currency)}
                        {a.receipt.label ? ` · ${a.receipt.label}` : ''}
                      </p>
                    </div>
                    {a.receipt.downloadable && (
                      <button
                        type="button"
                        onClick={() => download.mutate(a)}
                        disabled={download.isPending}
                        className="inline-flex items-center gap-1 text-teal-700 hover:underline disabled:opacity-60"
                      >
                        <Download className="h-4 w-4" /> Reçu
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            </Card>
          )}

          {d.proofImageUrl && (
            <Card className="mb-3 space-y-2">
              <h2 className="font-semibold">Capture envoyée</h2>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={d.proofImageUrl} alt="Capture du SMS" className="max-h-96 rounded-xl border border-line object-contain" />
            </Card>
          )}
          {error && (
            <p role="alert" className="text-sm text-red-600">
              {error}
            </p>
          )}
        </>
      )}
    </>
  )
}
