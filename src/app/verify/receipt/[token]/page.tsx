import { cache } from 'react'
import type { Metadata } from 'next'
import Link from 'next/link'
import { ReceiptVerifyCard } from '@/components/receipt/ReceiptVerifyCard'
import type { ReceiptVerifyFailureReason, ReceiptVerifyResult } from '@/types/receipt-verify'

type PageProps = {
  params: Promise<{ token: string }>
}

const loadVerification = cache(async (token: string): Promise<ReceiptVerifyResult> => {
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
})

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const result = await loadVerification((await params).token)
  if (!result.valid) {
    return {
      title: 'Reçu non vérifiable',
      robots: { index: false, follow: false },
    }
  }

  return {
    title: result.ogTitle ?? `Reçu officiel — ${result.schoolName}`,
    description: result.ogDescription ?? `Reçu certifié PresenceFintech — ${result.schoolName}`,
    robots: { index: false, follow: false },
    openGraph: {
      title: result.ogTitle ?? `Reçu officiel — ${result.schoolName}`,
      description: result.ogDescription,
      url: result.verifyUrl,
      siteName: 'PresenceFintech',
      type: 'website',
      images: result.ogImageUrl
        ? [{ url: result.ogImageUrl, width: 1200, height: 630, alt: result.schoolName }]
        : [],
    },
    twitter: {
      card: 'summary_large_image',
      title: result.ogTitle,
      description: result.ogDescription,
      images: result.ogImageUrl ? [result.ogImageUrl] : undefined,
    },
  }
}

export default async function ReceiptVerifyPage({ params }: PageProps) {
  const { token } = await params
  const result = await loadVerification(token)

  return (
    <div className="relative min-h-screen flex items-center justify-center px-4 py-8 bg-[#f4f6fa]">
      <div className="w-full max-w-xl space-y-4">
        <div className="text-center">
          <p className="text-xs font-semibold uppercase tracking-widest text-emerald-700">
            {result.valid ? result.schoolName : 'Vérification de reçu'}
          </p>
          <p className="mt-1 text-sm text-zinc-500">
            {result.valid ? 'Reçu scolaire authentifié' : 'Vérification de reçu scolaire'}
          </p>
        </div>

        <ReceiptVerifyCard
          result={result}
          proofQuery={token ? `t=${encodeURIComponent(token)}` : ''}
        />

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
