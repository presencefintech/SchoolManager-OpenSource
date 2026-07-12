import { ReceiptVerifyCard } from '@/components/receipt/ReceiptVerifyCard'
import { VerifyManualForm } from '@/components/receipt/VerifyManualForm'
import { fetchReceiptLookup } from '@/lib/receipt/verify-receipt'
import type { ReceiptVerifyResult } from '@/types/receipt-verify'

type PageProps = {
  searchParams: { receiptNumber?: string; code?: string }
}

async function loadLookup(
  receiptNumber?: string,
  code?: string,
): Promise<ReceiptVerifyResult | null> {
  const num = receiptNumber?.trim()
  const pf = code?.trim()
  if (!num || !pf) return null
  return fetchReceiptLookup(num, pf)
}

export default async function VerifyPage({ searchParams }: PageProps) {
  const result = await loadLookup(searchParams.receiptNumber, searchParams.code)
  const hasLookup = Boolean(searchParams.receiptNumber?.trim() && searchParams.code?.trim())

  return (
    <div className="relative min-h-screen flex items-center justify-center px-4 py-10 bg-[#f4f6fa]">
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-32 right-[-10%] h-[420px] w-[420px] rounded-full bg-emerald-200/40 blur-3xl" />
        <div className="absolute top-[30%] -left-24 h-[360px] w-[360px] rounded-full bg-teal-200/30 blur-3xl" />
      </div>

      <div className="w-full max-w-md space-y-4">
        <div className="text-center">
          <p className="text-xs font-semibold uppercase tracking-widest text-emerald-700">
            PresenceFintech
          </p>
          <p className="mt-1 text-sm text-zinc-500">Vérification de reçu scolaire — RDC</p>
        </div>

        {hasLookup && result ? <ReceiptVerifyCard result={result} /> : null}

        <VerifyManualForm
          initialReceiptNumber={searchParams.receiptNumber ?? ''}
          initialCode={searchParams.code ?? ''}
        />

        <p className="text-center text-[11px] text-zinc-400 leading-relaxed px-4">
          Chaque établissement possède un identifiant unique dans le code PF. Scannez le QR code ou
          saisissez le numéro de reçu et le code imprimé sur le ticket.
        </p>
      </div>
    </div>
  )
}

export const metadata = {
  title: 'Vérifier un reçu | PresenceFintech',
  description: 'Vérifiez l\'authenticité d\'un reçu de paiement scolaire en RDC.',
}
