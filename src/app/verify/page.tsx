import { DocumentVerifyCard } from '@/components/document/DocumentVerifyCard'
import { ReceiptVerifyCard } from '@/components/receipt/ReceiptVerifyCard'
import { VerifyManualForm } from '@/components/receipt/VerifyManualForm'
import { fetchDocumentLookup } from '@/lib/document/verify-document'
import { fetchReceiptLookup } from '@/lib/receipt/verify-receipt'
import type { DocumentVerifyResult } from '@/types/document-verify'
import type { ReceiptVerifyResult } from '@/types/receipt-verify'

type PageProps = {
  searchParams: {
    receiptNumber?: string
    documentRef?: string
    code?: string
  }
}

export default async function VerifyPage({ searchParams }: PageProps) {
  const code = searchParams.code?.trim() ?? ''
  const receiptNumber = searchParams.receiptNumber?.trim() ?? ''
  const documentRef = searchParams.documentRef?.trim() ?? ''

  const isDocumentLookup = Boolean(documentRef && code)
  const isReceiptLookup = Boolean(receiptNumber && code) && !isDocumentLookup

  let receiptResult: ReceiptVerifyResult | null = null
  let documentResult: DocumentVerifyResult | null = null

  if (isDocumentLookup) {
    documentResult = await fetchDocumentLookup(documentRef, code)
  } else if (isReceiptLookup) {
    receiptResult = await fetchReceiptLookup(receiptNumber, code)
  }

  const hasLookup = isDocumentLookup || isReceiptLookup
  const schoolName =
    (documentResult?.valid && documentResult.schoolName) ||
    (receiptResult?.valid && receiptResult.schoolName) ||
    null

  return (
    <div className="relative min-h-screen flex items-center justify-center px-4 py-10 bg-[#f4f6fa]">
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-32 right-[-10%] h-[420px] w-[420px] rounded-full bg-emerald-200/40 blur-3xl" />
        <div className="absolute top-[30%] -left-24 h-[360px] w-[360px] rounded-full bg-teal-200/30 blur-3xl" />
      </div>

      <div className="w-full max-w-md space-y-4">
        <div className="text-center">
          <p className="text-xs font-semibold uppercase tracking-widest text-emerald-700">
            {schoolName ?? 'Vérification SchoolManager'}
          </p>
          <p className="mt-1 text-sm text-zinc-500">
            {documentResult?.valid
              ? 'Fiche scolaire authentifiée'
              : receiptResult?.valid
                ? 'Reçu scolaire authentifié'
                : 'Vérifiez un reçu (PF) ou une fiche d’inscription (SM)'}
          </p>
        </div>

        {hasLookup && documentResult ? <DocumentVerifyCard result={documentResult} /> : null}
        {hasLookup && receiptResult ? <ReceiptVerifyCard result={receiptResult} /> : null}

        <VerifyManualForm
          initialReceiptNumber={receiptNumber}
          initialDocumentRef={documentRef}
          initialCode={code}
          initialKind={isDocumentLookup || (!receiptNumber && Boolean(documentRef)) ? 'document' : 'receipt'}
        />

        <p className="text-center text-[11px] text-zinc-400 leading-relaxed px-4">
          Scannez le QR imprimé, ou saisissez le numéro et le code (PF pour les reçus, SM pour les
          fiches). Accessible au guichet, à l&apos;IT et à la direction.
        </p>
      </div>
    </div>
  )
}

export const metadata = {
  title: 'Vérifier un document scolaire',
  description: "Vérifiez l'authenticité d'un reçu ou d'une fiche d'inscription SchoolManager.",
}
