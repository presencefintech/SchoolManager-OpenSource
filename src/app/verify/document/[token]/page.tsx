import Link from 'next/link'
import { DocumentVerifyCard } from '@/components/document/DocumentVerifyCard'
import { fetchDocumentVerification } from '@/lib/document/verify-document'

type PageProps = {
  params: Promise<{ token: string }>
}

export default async function DocumentVerifyPage({ params }: PageProps) {
  const { token } = await params
  const result = await fetchDocumentVerification(token)

  return (
    <div className="relative min-h-screen flex items-center justify-center px-4 py-10 bg-[#f4f6fa]">
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-32 right-[-10%] h-[420px] w-[420px] rounded-full bg-emerald-200/40 blur-3xl" />
        <div className="absolute top-[30%] -left-24 h-[360px] w-[360px] rounded-full bg-teal-200/30 blur-3xl" />
      </div>

      <div className="w-full max-w-md space-y-4">
        <div className="text-center">
          <p className="text-xs font-semibold uppercase tracking-widest text-emerald-700">
            {result.valid ? result.schoolName : 'Vérification de document'}
          </p>
          <p className="mt-1 text-sm text-zinc-500">
            {result.valid
              ? 'Fiche scolaire authentifiée'
              : 'Vérification de fiche / document scolaire'}
          </p>
        </div>

        <DocumentVerifyCard result={result} />

        <p className="text-center text-[11px] text-zinc-400 leading-relaxed px-4">
          Scannez le QR ou saisissez le N° document et le code SM sur{' '}
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
  title: 'Vérification de document scolaire',
  description: "Vérifiez l'authenticité d'une fiche d'inscription SchoolManager.",
}
