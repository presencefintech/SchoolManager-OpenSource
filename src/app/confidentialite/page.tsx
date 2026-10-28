import type { Metadata } from 'next'
import { LegalPageLayout } from '@/components/legal/legal-page-layout'

export const metadata: Metadata = {
  title: 'Politique de Confidentialité — SchoolManager',
  description:
    'Politique de confidentialité de SchoolManager (PresenceFintech) : données scolaires, présence, paiements et applications mobiles.',
}

export default function ConfidentialitePage() {
  return (
    <LegalPageLayout
      title="Politique de Confidentialité"
      lastUpdated="28 octobre 2026"
      otherDocHref="/cgu"
      otherDocLabel="Conditions Générales d'Utilisation"
    >
      <section>
        <h3>1. Responsable du traitement</h3>
        <p>
          PresenceFintech, éditeur de la plateforme SchoolManager, est responsable du traitement
          des données décrites ci-dessous, pour le compte des établissements scolaires clients
          (responsables conjoints ou sous-traitant selon le module). Exploitation : Kinshasa,
          République Démocratique du Congo.
        </p>
        <p>
          Contact :{' '}
          <a href="mailto:support@presence-fintech.com">support@presence-fintech.com</a>.
        </p>
      </section>

      <section>
        <h3>2. Données collectées</h3>
        <ul>
          <li>
            Identification : nom, postnom, prénom, sexe, date de naissance, contacts, rôle
            (parent, enseignant, direction, caisse, etc.).
          </li>
          <li>
            Scolarité : classe, présence, retards, notes, bulletins, discipline, infirmerie,
            autorisations de sortie.
          </li>
          <li>
            Finance : échéancier, paiements, reçus, moratoires — hors numéros de carte complets,
            conservés par le prestataire de paiement.
          </li>
          <li>
            Biométrie (si l’école active le module) : photographie et vecteur facial utilisés
            uniquement pour vérifier l’identité à l’entrée ; pas de revente, pas de publicité.
          </li>
          <li>
            Techniques : journaux de connexion, identifiant d’appareil, jetons de notification
            push, traces de sécurité.
          </li>
        </ul>
      </section>

      <section>
        <h3>3. Finalités</h3>
        <ul>
          <li>Fournir le service SchoolManager à l’établissement et aux familles.</li>
          <li>Informer les parents (arrivée, sortie, dette, vie scolaire, infirmerie).</li>
          <li>Encaisser et justifier les frais de scolarité.</li>
          <li>Sécuriser les comptes (fraude, accès non autorisé).</li>
          <li>Produire des rapports à l’usage exclusif de l’établissement client.</li>
        </ul>
      </section>

      <section>
        <h3>4. Base légale</h3>
        <p>
          Exécution du contrat avec l’établissement ; intérêt légitime (sécurité, continuité du
          service) ; obligations comptables ; consentement lorsqu’il est requis (biométrie,
          canaux WhatsApp/SMS selon les réglages de l’école et les préférences du parent).
        </p>
      </section>

      <section>
        <h3>5. Destinataires</h3>
        <p>
          Personnel habilité de l’école, équipes techniques de l’Éditeur, hébergeurs (notamment
          infrastructure cloud de type Railway) et prestataires de paiement / messagerie
          strictement nécessaires. Aucune vente de données à des annonceurs.
        </p>
      </section>

      <section>
        <h3>6. Applications mobiles et Google</h3>
        <p>
          L’application peut utiliser Firebase Cloud Messaging (notifications), l’appareil photo
          (scan, photo d’élève, liveness) et, au scan de présence, une position pour vérifier que
          l’appareil est bien sur le site de l’école. Ces traitements sont liés au service, pas à
          de la publicité Google.
        </p>
      </section>

      <section>
        <h3>7. Conservation</h3>
        <p>
          Les données sont conservées pendant la relation contractuelle avec l’établissement, puis
          pour les durées légales (notamment pièces comptables). Les vecteurs faciaux peuvent être
          désactivés par l’école ; un parent peut demander, via l’établissement, la suppression
          de la photo biométrique de son enfant lorsque le module n’est plus utilisé.
        </p>
      </section>

      <section>
        <h3>8. Sécurité</h3>
        <p>
          Chiffrement en transit, contrôle d’accès par rôle, isolation par établissement,
          journalisation et reçus signés. Aucun système n’est infaillible ; l’utilisateur
          protège également son téléphone et son mot de passe.
        </p>
      </section>

      <section>
        <h3>9. Droits</h3>
        <p>
          Accès, rectification, opposition, limitation et, lorsque la loi le permet, effacement
          ou portabilité. Exercice : auprès du secrétariat de l’école, ou à{' '}
          <a href="mailto:support@presence-fintech.com">support@presence-fintech.com</a>.
        </p>
      </section>

      <section>
        <h3>10. Cookies</h3>
        <p>
          Cookies et stockage local strictement nécessaires à la session et à la sécurité du
          portail. Pas de cookies publicitaires tiers.
        </p>
      </section>

      <section>
        <h3>11. Modifications</h3>
        <p>
          La date en tête de page fait foi. Une évolution substantielle est indiquée dans
          l’application ou par message.
        </p>
      </section>
    </LegalPageLayout>
  )
}
