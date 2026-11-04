'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { QRCodeSVG } from 'qrcode.react'
import { RefreshCw } from 'lucide-react'
import { parentApi, studentDisplayName } from '@/lib/parent/api'
import { parentKeys, useSelectedStudent } from '@/lib/parent/hooks'
import { Card, ErrorState, PageHeader, Spinner } from '@/components/parent/ui'

/** Pass numérique (QR) — miroir de `digital_pass_screen.dart`, renouvelé à l'expiration. */
export default function StudentPassPage() {
  const { studentId: raw } = useParams<{ studentId: string }>()
  const studentId = Number(raw)
  const { students } = useSelectedStudent()
  const student = students.find((s) => s.id === studentId)
  const pass = useQuery({
    queryKey: parentKeys.pass(studentId),
    queryFn: () => parentApi.pass(studentId),
    enabled: Number.isFinite(studentId),
    staleTime: 0,
  })

  const expiresAt = pass.data?.expiresAt ? new Date(pass.data.expiresAt).getTime() : null
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(t)
  }, [])

  const remaining = expiresAt ? Math.max(0, Math.floor((expiresAt - now) / 1000)) : null

  useEffect(() => {
    if (remaining === 0) void pass.refetch()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [remaining === 0])

  return (
    <>
      <PageHeader title="Pass numérique" subtitle={student ? studentDisplayName(student) : undefined} />
      <Card className="mx-auto flex max-w-sm flex-col items-center gap-4 py-8">
        {pass.isLoading ? (
          <Spinner className="h-8 w-8" />
        ) : pass.isError || !pass.data?.qrCodeString ? (
          <ErrorState message="Pass indisponible pour le moment." onRetry={() => void pass.refetch()} />
        ) : (
          <>
            <div className="rounded-2xl bg-white p-4">
              <QRCodeSVG value={pass.data.qrCodeString} size={224} level="M" />
            </div>
            {remaining != null && (
              <p className="text-sm text-zinc-500" aria-live="polite">
                Expire dans {Math.floor(remaining / 60)}:{String(remaining % 60).padStart(2, '0')}
              </p>
            )}
            <button
              type="button"
              onClick={() => void pass.refetch()}
              className="inline-flex items-center gap-2 text-sm font-medium text-teal-700"
            >
              <RefreshCw className={`h-4 w-4 ${pass.isFetching ? 'animate-spin' : ''}`} /> Renouveler
            </button>
            <p className="text-center text-xs text-zinc-500">
              Présentez ce code au portail de l&apos;école pour l&apos;entrée ou la remise de l&apos;enfant.
            </p>
          </>
        )}
      </Card>
    </>
  )
}
