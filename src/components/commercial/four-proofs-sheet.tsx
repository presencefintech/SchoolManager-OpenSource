'use client'

import Image from 'next/image'
import Link from 'next/link'

const PILLARS = [
  {
    title: 'Arrivé',
    promise: 'Le parent sait que l’enfant est à l’école.',
    bullets: [
      'Pointage carte, QR, code PIN ou biométrie — un élève n’est pas pointé deux fois.',
      'Mode hors-ligne : la grille continue, la synchro suit.',
      'WhatsApp en moins d’une minute : « Marie est entrée à 7 h 12, 6e A ».',
    ],
  },
  {
    title: 'Sorti',
    promise: 'On sait qui a récupéré l’enfant, et à quelle heure.',
    bullets: [
      'Remise uniquement à un adulte autorisé (nom, photo, QR).',
      'Le parent ajoute ou révoque Tatie en 30 secondes, sans le secrétariat.',
      'Message : « Marie est sortie à 16 h 04, récupérée par Tatie Marie ».',
    ],
  },
  {
    title: 'Payé',
    promise: 'L’argent est clair. L’enfant n’est jamais humilié à la grille.',
    bullets: [
      'Même échéancier au guichet, dans l’app parent et au scan (mois + montant).',
      'Parent : M-Pesa, Orange Money ou Airtel Money, CDF ou USD — ou espèces au guichet.',
      'Relance privée WhatsApp. Le surveillant voit la dette ; l’entrée n’est jamais bloquée.',
    ],
  },
  {
    title: 'Suivi',
    promise: 'Notes, discipline, infirmerie : plus de rumeur WhatsApp.',
    bullets: [
      'Bulletin de période publié, comme Pronote — format école RDC.',
      'Sanction close : décision + date, sans le dossier interne.',
      'Infirmerie horodatée (« fièvre à 10 h 20 ») et rapport ponctualité ~9 h.',
    ],
  },
] as const

export function FourProofsSheet() {
  return (
    <div className="min-h-screen bg-[#f1f5f4] print:bg-white">
      <div className="mx-auto flex max-w-[210mm] justify-end gap-3 px-4 py-4 print:hidden">
        <Link href="/login" className="text-sm text-zinc-500 hover:text-emerald-700">
          Connexion
        </Link>
        <button
          type="button"
          onClick={() => window.print()}
          className="rounded-full bg-emerald-700 px-4 py-1.5 text-sm font-semibold text-white hover:bg-emerald-800"
        >
          Imprimer / PDF
        </button>
      </div>

      <article className="mx-auto min-h-[277mm] max-w-[210mm] bg-white px-[16mm] py-[18mm] shadow-xl print:min-h-0 print:shadow-none">
        <header className="mb-4 flex items-end justify-between border-b-[3px] border-emerald-700 pb-3">
          <div>
            <div className="mb-2 flex items-center gap-2">
              <Image
                src="/logo-icon-transparent.png"
                alt=""
                width={28}
                height={28}
                className="h-7 w-7 object-contain"
              />
              <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-emerald-700">
                PresenceFintech · SchoolManager
              </p>
            </div>
            <h1 className="text-[26px] font-bold tracking-tight text-zinc-900">Les 4 preuves</h1>
            <p className="mt-1 text-[13px] text-zinc-600">
              Quatre preuves que les parents voient — et que le promoteur vend.
            </p>
          </div>
          <p className="text-right text-[11px] text-zinc-500">
            Arrivé · Sorti · Payé · Suivi
            <br />
            Kinshasa, RDC
          </p>
        </header>

        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
          {PILLARS.map((p) => (
            <section
              key={p.title}
              className="rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3"
            >
              <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-emerald-700">
                {p.title}
              </p>
              <h2 className="mt-0.5 text-xl font-bold text-zinc-900">{p.title}</h2>
              <p className="mt-1 text-[12.5px] font-semibold text-zinc-600">{p.promise}</p>
              <ul className="mt-2 list-disc space-y-1 pl-4 text-[11.5px] leading-snug text-zinc-600">
                {p.bullets.map((b) => (
                  <li key={b}>{b}</li>
                ))}
              </ul>
            </section>
          ))}
        </div>

        <section className="mt-3 rounded-xl border border-emerald-800/20 bg-emerald-50/80 px-3.5 py-3">
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-emerald-800">
            Kinshasa · RDC
          </p>
          <h2 className="mt-0.5 text-[17px] font-bold text-zinc-900">
            Comment on paie vraiment — et qui a le droit d’entrer dans l’app
          </h2>
          <ul className="mt-2 list-disc space-y-1 pl-4 text-[11.5px] leading-snug text-zinc-700">
            <li>
              Le parent paie comme d’habitude : <strong>Vodacom M-Pesa, Orange Money ou Airtel Money</strong>,
              en <strong>CDF ou USD</strong>. Pas de carte bancaire dans l’app parent. Pas d’IBAN école affiché.
            </li>
            <li>
              Au guichet : <strong>espèces</strong> + code caisse. Reçu PDF avec QR vérifiable.
            </li>
            <li>
              L’argent est versé sur <strong>le compte de l’école</strong>. Le parent ne voit jamais le RIB.
            </li>
            <li>
              Pas d’inscription libre. L’école remet un <strong>code à 8 caractères</strong> ; le parent active
              l’app Android avec son numéro <strong>+243</strong>.
            </li>
            <li>
              Un mois difficile : la direction peut accorder un <strong>moratoire</strong> (relances suspendues).
              Jamais d’enfant refusé à l’entrée pour une dette. Pas de chat dans l’app.
            </li>
          </ul>
        </section>

        <section className="mt-2.5 grid grid-cols-1 gap-2 sm:grid-cols-3">
          {[
            { n: '1', t: 'Démonstration', d: 'Vos classes, vos frais, vos opérateurs.' },
            { n: '2', t: 'Pilote 2 semaines', d: 'Codes parents, un flux présence, un flux paiement (guichet et/ou Mobile Money).' },
            { n: '3', t: 'Déploiement', d: 'Formation direction (~2 h) et caissier (~1 h).' },
          ].map((step) => (
            <div key={step.n} className="rounded-xl border border-slate-200 px-3 py-2.5">
              <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-emerald-700">
                Étape {step.n}
              </p>
              <p className="mt-0.5 text-[13px] font-bold text-zinc-900">{step.t}</p>
              <p className="mt-0.5 text-[11px] leading-snug text-zinc-600">{step.d}</p>
            </div>
          ))}
        </section>

        <footer className="mt-4 space-y-2 border-t border-slate-200 pt-3 text-[11px] leading-relaxed text-zinc-600">
          <p>
            Descartes utilise Pronote (notes, pas les frais). TASOK utilise ManageBac. Les écoles
            congolaises vivent sur WhatsApp, le bulletin et le Mobile Money. SchoolManager gagne
            sur le portail, l’argent et la remise — plus le bulletin.
          </p>
          <p className="font-bold text-zinc-800">
            Jamais de chat dans l’app. Jamais d’enfant refusé à l’entrée pour une dette.
          </p>
          <p className="text-emerald-800">
            support@presence-fintech.com · https://app.presencefintech.com
          </p>
        </footer>
      </article>
    </div>
  )
}
