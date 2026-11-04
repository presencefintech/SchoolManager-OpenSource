import { DocumentVerifyCard } from '@/components/document/DocumentVerifyCard'
import { ReceiptVerifyCard } from '@/components/receipt/ReceiptVerifyCard'
import { VerifyManualForm } from '@/components/receipt/VerifyManualForm'
import { fetchDocumentLookup } from '@/lib/document/verify-document'
import { fetchReceiptLookup } from '@/lib/receipt/verify-receipt'
import type { DocumentVerifyResult } from '@/types/document-verify'
import type { ReceiptVerifyResult } from '@/types/receipt-verify'

type PageProps = {
  searchParams: Promise<{
    receiptNumber?: string
    documentRef?: string
    code?: string
  }>
}

export default async function VerifyPage(props: PageProps) {
  const searchParams = await props.searchParams
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
    <div className="relative min-h-screen flex items-center justify-center px-4 py-8 bg-[#f4f6fa]">
      <div className="w-full max-w-xl space-y-4">
        <div className="text-center">
          <p className="text-xs font-semibold uppercase tracking-widest text-emerald-700">
            {schoolName ?? 'Vérification SchoolManager'}
          </p>
          <p className="mt-1 text-sm text-zinc-500">
            {documentResult?.valid
              ? 'Fiche scolaire authentifiée'
              : receiptResult?.valid
                ? 'Reçu scolaire authentifié'
                : 'Vérifiez un reçu (PF) ou un document scolaire (SM)'}
          </p>
        </div>

        {hasLookup && documentResult ? <DocumentVerifyCard result={documentResult} /> : null}
        {hasLookup && receiptResult ? (
          <ReceiptVerifyCard
            result={receiptResult}
            proofQuery={
              receiptNumber && code
                ? `code=${encodeURIComponent(code)}`
                : ''
            }
          />
        ) : null}

        <VerifyManualForm
          initialReceiptNumber={receiptNumber}
          initialDocumentRef={documentRef}
          initialCode={code}
          initialKind={isDocumentLookup || (!receiptNumber && Boolean(documentRef)) ? 'document' : 'receipt'}
        />

        <p className="text-center text-[11px] text-zinc-400 leading-relaxed px-4">
          Scannez le QR imprimé, ou saisissez le numéro et le code (PF pour les reçus, SM pour les
          documents scolaires). Accessible au guichet, à l&apos;IT, à l&apos;admin et à la direction.
        </p>
      </div>
    </div>
  )
}
export const metadata = {
  title: 'Vérifier un document scolaire',
  description: "Vérifiez l'authenticité d'un reçu ou d'une fiche d'inscription SchoolManager.",
}
