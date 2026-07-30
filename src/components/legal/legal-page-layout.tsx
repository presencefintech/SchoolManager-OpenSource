import Link from 'next/link'
import { ShieldCheck } from 'lucide-react'

type LegalPageLayoutProps = {
  title: string
  lastUpdated: string
  otherDocHref: string
  otherDocLabel: string
  children: React.ReactNode
}

export function LegalPageLayout({
  title,
  lastUpdated,
  otherDocHref,
  otherDocLabel,
  children,
}: LegalPageLayoutProps) {
  return (
    <div className="relative min-h-screen bg-[#f4f6fa] px-4 py-12">
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-32 right-[-10%] h-[420px] w-[420px] rounded-full bg-emerald-200/40 blur-3xl" />
        <div className="absolute top-[30%] -left-24 h-[360px] w-[360px] rounded-full bg-teal-200/30 blur-3xl" />
      </div>

      <div className="relative mx-auto w-full max-w-3xl">
        {/* Brand lockup */}
        <div className="flex flex-col items-center text-center mb-8">
          <Link
            href="/login"
            className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/25 ring-4 ring-white mb-4"
          >
            <ShieldCheck size={24} className="text-white" />
          </Link>
          <h1 className="text-xl font-bold text-zinc-900 tracking-tight">presenceFintech</h1>
          <p className="text-sm text-zinc-500 mt-1">Gestion des présences &amp; finances scolaires</p>
        </div>

        {/* Document card */}
        <div className="rounded-3xl border border-slate-200/90 bg-white/90 backdrop-blur-sm shadow-xl shadow-slate-200/60 ring-1 ring-slate-100 p-8 sm:p-10">
          <div className="mb-6 pb-6 border-b border-zinc-100">
            <h2 className="text-lg font-semibold text-zinc-900">{title}</h2>
            <p className="text-xs text-zinc-400 mt-1">Dernière mise à jour : {lastUpdated}</p>
          </div>

          <div className="rounded-xl bg-amber-50 border border-amber-200 px-4 py-3 text-xs text-amber-800 mb-8">
            Modèle à personnaliser : remplacez les informations entre crochets par les données
            réelles de votre structure avant mise en production. Faites relire le document par un
            juriste si nécessaire.
          </div>

          <div className="prose prose-sm prose-zinc max-w-none space-y-6 [&_h3]:text-sm [&_h3]:font-semibold [&_h3]:text-zinc-900 [&_h3]:mb-2 [&_p]:text-sm [&_p]:text-zinc-600 [&_p]:leading-relaxed [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-1 [&_ul]:text-sm [&_ul]:text-zinc-600">
            {children}
          </div>
        </div>

        <div className="mt-6 flex items-center justify-center gap-4 text-xs text-zinc-400">
          <Link href="/login" className="hover:text-emerald-600 transition-colors">
            Retour à la connexion
          </Link>
          <span aria-hidden>·</span>
          <Link href={otherDocHref} className="hover:text-emerald-600 transition-colors">
            {otherDocLabel}
          </Link>
        </div>
        <p className="mt-2 text-center text-[11px] text-zinc-300">
          © 2026 presenceFintech · Tous droits réservés
        </p>
      </div>
    </div>
  )
}
