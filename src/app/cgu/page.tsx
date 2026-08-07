import type { Metadata } from 'next'
import { LegalPageLayout } from '@/components/legal/legal-page-layout'

export const metadata: Metadata = {
  title: 'Conditions Générales d\'Utilisation — SchoolManager',
  description: "Conditions générales d'utilisation de la plateforme SchoolManager.",
}

export default function CguPage() {
  return (
    <LegalPageLayout
      title="Conditions Générales d'Utilisation"
      lastUpdated="[À COMPLÉTER]"
      otherDocHref="/confidentialite"
      otherDocLabel="Politique de confidentialité"
    >
      <section>
        <h3>1. Objet</h3>
        <p>
          Les présentes Conditions Générales d&apos;Utilisation (« CGU ») régissent l&apos;accès et
          l&apos;utilisation de la plateforme SchoolManager (« la Plateforme »), éditée par
          [Nom de la société / statut juridique], immatriculée sous le numéro [numéro RCCM / SIREN],
          dont le siège social est situé [adresse complète], ci-après « l&apos;Éditeur ».
        </p>
      </section>

      <section>
        <h3>2. Description du service</h3>
        <p>
          La Plateforme permet aux établissements scolaires de gérer le suivi des présences
          (y compris par des moyens biométriques), la facturation, l&apos;encaissement et le suivi
          financier des frais de scolarité, ainsi que l&apos;administration des utilisateurs
          (administrateurs, directeurs, personnel financier).
        </p>
      </section>

      <section>
        <h3>3. Accès à la Plateforme</h3>
        <p>
          L&apos;accès est réservé aux utilisateurs disposant d&apos;un compte créé ou validé par
          [Nom de la société] ou par un établissement client. Chaque utilisateur est responsable de
          la confidentialité de ses identifiants de connexion et de toute activité effectuée depuis
          son compte.
        </p>
      </section>

      <section>
        <h3>4. Obligations de l&apos;utilisateur</h3>
        <ul>
          <li>Utiliser la Plateforme conformément à sa destination et aux lois en vigueur.</li>
          <li>Ne pas tenter de contourner les mesures de sécurité de la Plateforme.</li>
          <li>Ne pas transmettre de données financières ou personnelles inexactes.</li>
          <li>Signaler sans délai toute utilisation non autorisée de son compte.</li>
        </ul>
      </section>

      <section>
        <h3>5. Données financières et transactions</h3>
        <p>
          Les opérations d&apos;encaissement, de remboursement et de rapprochement traitées via la
          Plateforme sont soumises aux conditions spécifiques des prestataires de paiement utilisés
          (mobile money, gateway bancaire — [préciser les prestataires]). L&apos;Éditeur ne saurait
          être tenu responsable des délais ou incidents imputables à ces tiers.
        </p>
      </section>

      <section>
        <h3>6. Disponibilité et responsabilité</h3>
        <p>
          L&apos;Éditeur met en œuvre les moyens raisonnables pour assurer la disponibilité de la
          Plateforme, sans garantie d&apos;absence d&apos;interruption. L&apos;Éditeur ne pourra être
          tenu responsable des dommages indirects résultant de l&apos;utilisation ou de
          l&apos;impossibilité d&apos;utiliser la Plateforme.
        </p>
      </section>

      <section>
        <h3>7. Propriété intellectuelle</h3>
        <p>
          L&apos;ensemble des éléments de la Plateforme (logiciel, marques, contenus, interfaces)
          demeure la propriété exclusive de [Nom de la société]. Toute reproduction non autorisée
          est interdite.
        </p>
      </section>

      <section>
        <h3>8. Modification des CGU</h3>
        <p>
          L&apos;Éditeur se réserve le droit de modifier les présentes CGU à tout moment. Les
          utilisateurs seront informés de toute modification substantielle par [email / notification
          in-app].
        </p>
      </section>

      <section>
        <h3>9. Droit applicable et litiges</h3>
        <p>
          Les présentes CGU sont soumises au droit [pays]. Tout litige relatif à leur interprétation
          ou leur exécution relève de la compétence exclusive des tribunaux de [ville].
        </p>
      </section>

      <section>
        <h3>10. Contact</h3>
        <p>
          Pour toute question relative aux présentes CGU : [email de contact].
        </p>
      </section>
    </LegalPageLayout>
  )
}
