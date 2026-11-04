import type { Metadata } from 'next'
import { LegalPageLayout } from '@/components/legal/legal-page-layout'

export const metadata: Metadata = {
  title: "Conditions Générales d'Utilisation — SchoolManager",
  description:
    "Conditions générales d'utilisation des applications et de la plateforme SchoolManager (PresenceFintech).",
}

export default function CguPage() {
  return (
    <LegalPageLayout
      title="Conditions Générales d'Utilisation"
      lastUpdated="28 octobre 2026"
      otherDocHref="/confidentialite"
      otherDocLabel="Politique de confidentialité"
    >
      <section>
        <h3>1. Éditeur et champ d’application</h3>
        <p>
          Les présentes Conditions Générales d’Utilisation (« CGU ») régissent l’accès et
          l’utilisation de la plateforme SchoolManager, éditée sous le nom commercial{' '}
          <strong>PresenceFintech</strong> (ci-après « l’Éditeur »), dont le siège d’exploitation
          est situé à Kinshasa, République Démocratique du Congo.
        </p>
        <p>
          Elles s’appliquent à l’ensemble des interfaces : portail web d’établissement, applications
          mobiles parent et enseignant (Android / iOS), API et services associés (notifications,
          paiements, documents scolaires).
        </p>
        <p>
          Contact :{' '}
          <a href="mailto:support@presence-fintech.com">support@presence-fintech.com</a>
          {' '}— site :{' '}
          <a href="https://app.presencefintech.com">https://app.presencefintech.com</a>.
        </p>
      </section>

      <section>
        <h3>2. Objet du service</h3>
        <p>
          SchoolManager est un service logiciel destiné aux établissements scolaires. Il permet,
          selon les modules souscrits par l’établissement :
        </p>
        <ul>
          <li>le suivi des présences et des retards (scan de carte, QR, saisie, biométrie faciale le cas échéant) ;</li>
          <li>l’information des parents (arrivée, sortie, vie scolaire, infirmerie, discipline) ;</li>
          <li>la gestion des frais de scolarité, échéanciers, encaissements et reçus ;</li>
          <li>les notes, bulletins, devoirs et communications établissement–famille ;</li>
          <li>l’administration du personnel, des classes et des dossiers élèves.</li>
        </ul>
        <p>
          L’Éditeur fournit un outil technique. L’établissement reste responsable de ses décisions
          pédagogiques, disciplinaires, financières et de l’accueil des élèves. Une créance de
          scolarité n’autorise pas, via le service, à bloquer l’entrée d’un enfant à l’école.
        </p>
      </section>

      <section>
        <h3>3. Acceptation</h3>
        <p>
          L’utilisation du service implique l’acceptation pleine et entière des présentes CGU et de
          la Politique de confidentialité. Si vous n’acceptez pas ces documents, vous ne devez pas
          créer de compte ni utiliser les applications.
        </p>
        <p>
          Lorsque l’utilisateur est un parent ou tuteur, il déclare agir pour un mineur dont il a
          la responsabilité légale. L’établissement client garantit disposer des bases légales et
          autorisations nécessaires (dont, le cas échéant, le consentement pour la biométrie).
        </p>
      </section>

      <section>
        <h3>4. Comptes et accès</h3>
        <p>
          L’accès est nominatif. Les comptes (administrateur, directeur, enseignant, caisse, parent,
          etc.) sont créés ou validés par l’établissement ou par l’Éditeur. Chaque utilisateur :
        </p>
        <ul>
          <li>veille à la confidentialité de ses identifiants, code PIN et appareil ;</li>
          <li>est responsable des actions effectuées depuis son compte ;</li>
          <li>signale sans délai toute utilisation non autorisée à l’établissement et à l’Éditeur ;</li>
          <li>n’utilise le service que dans le cadre de son rôle (parent : ses enfants liés ; enseignant : ses classes).</li>
        </ul>
        <p>
          L’Éditeur peut suspendre un accès en cas de fraude, de tentative d’intrusion, de non-paiement
          du contrat établissement, ou de manquement grave aux présentes CGU.
        </p>
      </section>

      <section>
        <h3>5. Obligations de l’utilisateur</h3>
        <ul>
          <li>Respecter les lois de la République Démocratique du Congo et les règlements internes de l’école.</li>
          <li>Ne pas contourner les contrôles de sécurité, ni extraire illicitement des données.</li>
          <li>Ne pas usurper d’identité, ni faire de fausse déclaration de paiement.</li>
          <li>Fournir des informations exactes (identité, contacts, justificatifs).</li>
          <li>Utiliser la caméra, la localisation et les notifications uniquement aux fins prévues (scan de présence, dépôt de photo, alertes scolaires).</li>
        </ul>
      </section>

      <section>
        <h3>6. Applications mobiles et services Google</h3>
        <p>
          Les applications SchoolManager peuvent être distribuées via Google Play. Elles peuvent
          demander, selon l’usage : appareil photo, stockage, notifications push (Firebase Cloud
          Messaging), position approximative au moment d’un scan de présence, et un compte Google
          uniquement si l’utilisateur choisit une connexion tierce le cas échéant.
        </p>
        <p>
          Ces autorisations ne sont pas utilisées à des fins publicitaires. Le refus d’une
          permission non essentielle n’empêche pas, en principe, les fonctions de consultation
          (notes, échéancier, messages), sous réserve des modules activés par l’école.
        </p>
      </section>

      <section>
        <h3>7. Paiements</h3>
        <p>
          Les encaissements (Mobile Money, caisse) sont traités par l’établissement et/ou des
          prestataires de paiement (opérateurs Mobile Money et agrégateur de l’école). L’Éditeur
          n’est pas banque. Un reçu émis par
          SchoolManager atteste d’une opération enregistrée dans le système ; les délais, rejets
          ou indisponibilités imputables à un opérateur tiers n’engagent pas l’Éditeur.
        </p>
        <p>
          Toute contestation de paiement doit d’abord être adressée au secrétariat / à la caisse
          de l’établissement, puis, si besoin, à{' '}
          <a href="mailto:support@presence-fintech.com">support@presence-fintech.com</a>.
        </p>
      </section>

      <section>
        <h3>8. Données, biométrie et communications</h3>
        <p>
          Le traitement des données personnelles (identité, scolarité, présence, finance, photo,
          vecteur facial le cas échéant, journaux techniques) est décrit dans la Politique de
          confidentialité. Les notifications (application, WhatsApp, SMS) sont envoyées à la
          demande de l’établissement pour informer les familles, et non à des fins commerciales
          de l’Éditeur.
        </p>
      </section>

      <section>
        <h3>9. Propriété intellectuelle</h3>
        <p>
          Le logiciel, les marques SchoolManager et PresenceFintech, les interfaces et la
          documentation restent la propriété de l’Éditeur. L’établissement et les utilisateurs
          reçoivent un droit d’usage personnel, non exclusif et non cessable, limité à la durée
          du contrat. Toute rétro-ingénierie, revente ou copie non autorisée est interdite.
        </p>
      </section>

      <section>
        <h3>10. Disponibilité et responsabilité</h3>
        <p>
          L’Éditeur met en œuvre des moyens raisonnables de disponibilité et de sauvegarde, sans
          garantir une absence totale d’interruption (maintenance, réseau, force majeure). La
          responsabilité de l’Éditeur est limitée, dans la mesure permise par la loi, aux dommages
          directs et au montant des redevances effectivement payées par l’établissement au cours
          des douze (12) derniers mois. Sont exclus les dommages indirects (perte de chance, trouble
          commercial, préjudice d’image).
        </p>
      </section>

      <section>
        <h3>11. Durée, résiliation</h3>
        <p>
          Les CGU s’appliquent tant que le compte est actif. L’établissement peut demander la
          clôture selon son contrat. L’utilisateur parent peut cesser d’utiliser l’application et
          demander la suppression de son compte via l’établissement ou le support, sous réserve des
          obligations légales de conservation (comptabilité, archives scolaires).
        </p>
      </section>

      <section>
        <h3>12. Modification</h3>
        <p>
          L’Éditeur peut modifier les CGU pour tenir compte de l’évolution du service ou de la
          loi. La date de mise à jour figure en tête du document. Une modification substantielle
          est signalée dans l’application ou par message. La poursuite d’utilisation après
          notification vaut acceptation.
        </p>
      </section>

      <section>
        <h3>13. Droit applicable</h3>
        <p>
          Les présentes CGU sont régies par le droit de la République Démocratique du Congo. Tout
          litige non résolu à l’amiable relève des juridictions compétentes de Kinshasa.
        </p>
      </section>
    </LegalPageLayout>
  )
}
