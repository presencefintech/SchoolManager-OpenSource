import Link from 'next/link'
import { ReceiptVerifyCard } from '@/components/receipt/ReceiptVerifyCard'
import type { ReceiptVerifyFailureReason, ReceiptVerifyResult } from '@/types/receipt-verify'

type PageProps = {
  params: { token: string }
}

async function loadVerification(token: string): Promise<ReceiptVerifyResult> {
  const trimmed = token?.trim()
  if (!trimmed) {
    return { valid: false, reason: 'INVALID_TOKEN' }
  }

  const apiBase = process.env.API_URL ?? 'http://localhost:5000'
  try {
    const res = await fetch(
      `${apiBase}/api/v1/receipts/verify/${encodeURIComponent(trimmed)}`,
      {
        cache: 'no-store',
        headers: { Accept: 'application/json' },
      },
    )

    const body = (await res.json().catch(() => ({}))) as {
      data?: ReceiptVerifyResult
      errors?: { reason?: ReceiptVerifyFailureReason }
    }

    if (res.ok && body.data?.valid) {
      return body.data
    }

    const reason =
      body.errors?.reason ??
      (body.data && !body.data.valid ? body.data.reason : undefined) ??
      'INVALID_TOKEN'

    return { valid: false, reason }
  } catch {
    return { valid: false, reason: 'NOT_FOUND' }
  }
}

export default async function ReceiptVerifyPage({ params }: PageProps) {
  const result = await loadVerification(params.token)

  return (
    <div className="relative min-h-screen flex items-center justify-center px-4 py-10 bg-[#f4f6fa]">
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-32 right-[-10%] h-[420px] w-[420px] rounded-full bg-emerald-200/40 blur-3xl" />
        <div className="absolute top-[30%] -left-24 h-[360px] w-[360px] rounded-full bg-teal-200/30 blur-3xl" />
      </div>

      <div className="w-full max-w-md space-y-4">
        <div className="text-center">
          <p className="text-xs font-semibold uppercase tracking-widest text-emerald-700">
            {result.valid ? result.schoolName : 'Vérification de reçu'}
          </p>
          <p className="mt-1 text-sm text-zinc-500">
            {result.valid ? 'Reçu scolaire authentifié' : 'Vérification de reçu scolaire'}
          </p>
        </div>

        <ReceiptVerifyCard result={result} />

        <p className="text-center text-[11px] text-zinc-400 leading-relaxed px-4">
          Scannez le QR code ou saisissez le numéro de reçu et le code PF sur{' '}
          <Link href="/verify" prefetch className="text-emerald-600 hover:underline">
            la page de vérification manuelle
          </Link>
          .
        </p>
      </div>
    </div>
  )
}

export const metadata = {
  title: 'Vérification de reçu scolaire',
  description: "Vérifiez l'authenticité d'un reçu de paiement scolaire.",
}
