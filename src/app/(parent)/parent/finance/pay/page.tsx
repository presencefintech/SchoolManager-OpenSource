'use client'

import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { CheckCircle2, ExternalLink } from 'lucide-react'
import { getApiErrorMessage } from '@/lib/api/client'
import { parentApi, formatMoney, type FeeStructure, type PaymentResult } from '@/lib/parent/api'
import { parentKeys, useSelectedStudent } from '@/lib/parent/hooks'
import { buildCatalogOptions, resolveGateway } from '@/lib/parent/payment-catalog'
import { newIdempotencyKey } from '@/lib/idempotency'
import {
  Card,
  ErrorState,
  ListSkeleton,
  NoStudent,
  PageHeader,
  Pill,
  Spinner,
  StudentSwitcher,
  statusTone,
} from '@/components/parent/ui'
import { cn } from '@/lib/utils'
import Link from 'next/link'

const POLL_MS = 3000
const POLL_MAX = 40

export default function PayFeesPage() {
  const { studentId, isLoading: studentsLoading } = useSelectedStudent()
  const fees = useQuery({
    queryKey: parentKeys.feeStructures(studentId ?? 0),
    queryFn: () => parentApi.feeStructures(studentId as number),
    enabled: studentId != null,
  })
  const methods = useQuery({ queryKey: parentKeys.methods, queryFn: parentApi.paymentMethods, staleTime: 5 * 60_000 })

  const [feeId, setFeeId] = useState<number | null>(null)
  const [month, setMonth] = useState<string>('')
  const [code, setCode] = useState<string | null>(null)
  const [phone, setPhone] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState<PaymentResult | null>(null)

  const options = useMemo(() => buildCatalogOptions(methods.data), [methods.data])
  const structures = fees.data?.feeStructures ?? []
  const selectedFee: FeeStructure | undefined =
    structures.find((f) => f.id === feeId) ??
    structures.find((f) => f.id === fees.data?.defaultFeeStructureId) ??
    structures[0]
  const selectedOption = options.find((o) => o.code === code) ?? options[0]

  const periods = useQuery({
    queryKey: parentKeys.feePeriods(studentId ?? 0, selectedFee?.id ?? 0),
    queryFn: () => parentApi.feePeriods(studentId as number, selectedFee!.id),
    enabled: studentId != null && selectedFee?.billingPeriod === 'MONTHLY',
  })

  if (studentsLoading) return <ListSkeleton />
  if (studentId == null) return <NoStudent />

  const monthly = selectedFee?.billingPeriod === 'MONTHLY'
  const monthYear = monthly ? month || periods.data?.allowedMonthYear || periods.data?.nextDueMonth || '' : undefined
  const phoneOk = !selectedOption?.needsPhone || phone.replace(/\D/g, '').length >= 9
  const canSubmit = !!selectedFee && !!selectedOption && phoneOk && (!monthly || !!monthYear) && !busy

  async function pollUntilSettled(paymentId: number) {
    for (let i = 0; i < POLL_MAX; i++) {
      await new Promise((r) => setTimeout(r, POLL_MS))
      const p = await parentApi.payment(paymentId)
      setResult(p)
      if (p.status !== 'PENDING') return
    }
  }

  async function onPay() {
    if (!selectedFee || !selectedOption) return
    setBusy(true)
    setError('')
    try {
      // Le montant est toujours calculé côté serveur (intent) — jamais envoyé par le client.
      const intent = await parentApi.createIntent({
        studentId: studentId as number,
        feeStructureId: selectedFee.id,
        monthYear,
        idempotencyKey: newIdempotencyKey(),
      })
      if (!intent.paymentIntentId) throw new Error("Intention de paiement invalide")
      const executed = await parentApi.executeIntent(intent.paymentIntentId, {
        method: selectedOption.method,
        gateway: resolveGateway(selectedOption, methods.data),
        phone: selectedOption.needsPhone ? phone.trim() : undefined,
        idempotencyKey: newIdempotencyKey(),
      })
      setResult(executed)
      if (executed.redirectUrl) window.open(executed.redirectUrl, '_blank', 'noopener,noreferrer')
      if (executed.status === 'PENDING') void pollUntilSettled(executed.paymentId).catch(() => undefined)
    } catch (err) {
      setError(getApiErrorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  if (result) {
    const done = result.status === 'CONFIRMED' || result.status === 'RECONCILED'
    return (
      <>
        <PageHeader title="Paiement" />
        <Card className="space-y-3 text-center">
          {done ? (
            <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-600" />
          ) : result.status === 'PENDING' ? (
            <Spinner className="mx-auto h-8 w-8" />
          ) : null}
          <Pill tone={statusTone(result.status)}>{result.status}</Pill>
          <p className="text-2xl font-bold">{formatMoney(result.serverAmount ?? result.amount, result.currency)}</p>
          <p className="text-sm text-zinc-500">Référence {result.reference}</p>
          {result.status === 'PENDING' && (
            <p className="text-sm text-zinc-500" aria-live="polite">
              {result.redirectUrl
                ? 'Terminez le paiement dans la fenêtre ouverte, nous vérifions automatiquement.'
                : 'En attente de confirmation de votre opérateur — validez la demande sur votre téléphone.'}
            </p>
          )}
          {result.redirectUrl && result.status === 'PENDING' && (
            <a
              href={result.redirectUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-sm font-medium text-teal-700"
            >
              Rouvrir la page de paiement <ExternalLink className="h-4 w-4" />
            </a>
          )}
          <div className="flex justify-center gap-3 pt-2">
            {done && (
              <Link
                href={`/parent/finance/receipt/${result.paymentId}`}
                className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white"
              >
                Voir le reçu
              </Link>
            )}
            <Link href="/parent/finance" className="rounded-lg border border-line px-4 py-2 text-sm font-medium">
              Retour
            </Link>
          </div>
        </Card>
      </>
    )
  }

  return (
    <>
      <PageHeader title="Payer les frais" />
      <StudentSwitcher />

      {fees.isLoading || methods.isLoading ? (
        <ListSkeleton />
      ) : fees.isError || methods.isError ? (
        <ErrorState onRetry={() => { void fees.refetch(); void methods.refetch() }} />
      ) : (
        <div className="space-y-5">
          <section aria-label="Frais à payer" className="space-y-2">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">1. Frais</h2>
            {structures.length === 0 && <p className="text-sm text-zinc-500">Aucun frais payable pour le moment.</p>}
            {structures.map((f) => (
              <ChoiceCard key={f.id} active={f.id === selectedFee?.id} onClick={() => setFeeId(f.id)}>
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-medium">{f.label}</p>
                    {f.categoryName && <p className="text-xs text-zinc-500">{f.categoryName}</p>}
                  </div>
                  <p className="font-semibold">{formatMoney(f.amount)}</p>
                </div>
              </ChoiceCard>
            ))}
          </section>

          {monthly && (
            <section aria-label="Mois à payer" className="space-y-2">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">Mois</h2>
              {periods.isLoading ? (
                <Spinner />
              ) : (
                <select
                  value={monthYear}
                  onChange={(e) => setMonth(e.target.value)}
                  className="w-full rounded-xl border border-line bg-surface px-3 py-2.5"
                  aria-label="Mois à payer"
                >
                  {(periods.data?.unpaidMonths ?? []).map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                  {!periods.data?.unpaidMonths?.length && monthYear && <option value={monthYear}>{monthYear}</option>}
                </select>
              )}
            </section>
          )}

          <section aria-label="Moyen de paiement" className="space-y-2">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">2. Moyen de paiement</h2>
            {options.length === 0 && (
              <p className="text-sm text-zinc-500">
                Aucun moyen de paiement en ligne disponible — réglez au guichet de l&apos;école.
              </p>
            )}
            {options.map((o) => (
              <ChoiceCard key={o.code} active={o.code === selectedOption?.code} onClick={() => setCode(o.code)}>
                <p className="font-medium">{o.label}</p>
                <p className="text-xs text-zinc-500">{o.subtitle}</p>
              </ChoiceCard>
            ))}
            {selectedOption?.needsPhone && (
              <div className="pt-1">
                <label htmlFor="pay-phone" className="mb-1 block text-sm font-medium">
                  Numéro Mobile Money
                </label>
                <input
                  id="pay-phone"
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+243 8X XXX XXXX"
                  className="w-full rounded-xl border border-line bg-surface px-3 py-2.5"
                />
              </div>
            )}
          </section>

          {error && (
            <p role="alert" className="text-sm text-red-600">
              {error}
            </p>
          )}
          <button
            type="button"
            disabled={!canSubmit}
            onClick={() => void onPay()}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-teal-600 px-4 py-3 font-medium text-white disabled:opacity-50"
          >
            {busy && <Spinner />}
            {selectedFee ? `Payer ${formatMoney(selectedFee.amount)}` : 'Payer'}
          </button>
          <p className="text-center text-xs text-zinc-500">
            Le montant final est confirmé par le serveur avant tout débit.
          </p>
        </div>
      )}
    </>
  )
}

function ChoiceCard({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        'w-full rounded-2xl border p-3 text-left transition',
        active ? 'border-teal-600 bg-teal-50 dark:bg-teal-950/40' : 'border-line bg-surface hover:shadow-sm',
      )}
    >
      {children}
    </button>
  )
}
