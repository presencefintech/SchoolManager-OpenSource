import type { Metadata } from 'next'
import { LegalPageLayout } from '@/components/legal/legal-page-layout'

export const metadata: Metadata = {
  title: 'Politique de Confidentialité — presenceFintech',
  description: 'Politique de confidentialité et de protection des données de presenceFintech.',
}

export default function ConfidentialitePage() {
  return (
    <LegalPageLayout
      title="Politique de Confidentialité"
      lastUpdated="[À COMPLÉTER]"
      otherDocHref="/cgu"
      otherDocLabel="Conditions Générales d'Utilisation"
    >
      <section>
        <h3>1. Responsable du traitement</h3>
        <p>
          [Nom de la société], [statut juridique], immatriculée sous le numéro [numéro RCCM /
          SIREN], dont le siège social est situé [adresse complète], est responsable du traitement
          des données décrites dans la présente politique. Contact : [email du responsable /
          délégué à la protection des données].
        </p>
      </section>

      <section>
        <h3>2. Données collectées</h3>
        <ul>
          <li>Données d&apos;identification : nom, prénom, email, téléphone, rôle (administrateur, directeur, personnel financier, élève/parent).</li>
          <li>Données de présence : horodatage, statut de présence, données biométriques le cas échéant [préciser : empreinte digitale / reconnaissance faciale / autre].</li>
          <li>Données financières : historique de paiements, montants dus, moyens de paiement utilisés (hors données bancaires complètes, traitées par les prestataires de paiement).</li>
          <li>Données techniques : adresse IP, journaux de connexion, données de navigation.</li>
        </ul>
      </section>

      <section>
        <h3>3. Finalités du traitement</h3>
        <ul>
          <li>Gestion des comptes utilisateurs et contrôle d&apos;accès.</li>
          <li>Suivi de la présence des élèves et du personnel.</li>
          <li>Gestion de la facturation, des encaissements et des remboursements.</li>
          <li>Prévention de la fraude et sécurité de la Plateforme.</li>
          <li>Production de statistiques et de rapports à destination des établissements clients.</li>
        </ul>
      </section>

      <section>
        <h3>4. Données biométriques</h3>
        <p>
          Lorsque la Plateforme est utilisée pour le suivi de présence biométrique, ces données sont
          traitées avec un niveau de protection renforcé, sur la base de [préciser la base légale :
          consentement / intérêt légitime / obligation contractuelle], et ne sont utilisées qu&apos;à
          la finalité exclusive de vérification de présence. [Préciser les modalités de stockage et
          de suppression.]
        </p>
      </section>

      <section>
        <h3>5. Base légale</h3>
        <p>
          Les traitements reposent selon les cas sur l&apos;exécution du contrat liant l&apos;Éditeur
          à l&apos;établissement scolaire, le respect d&apos;obligations légales, l&apos;intérêt
          légitime de l&apos;Éditeur (sécurité, prévention de la fraude) ou le consentement de la
          personne concernée.
        </p>
      </section>

      <section>
        <h3>6. Destinataires des données</h3>
        <p>
          Les données sont accessibles au personnel habilité de l&apos;établissement scolaire
          concerné et de l&apos;Éditeur, ainsi qu&apos;aux prestataires techniques nécessaires au
          fonctionnement de la Plateforme (hébergement, prestataires de paiement mobile money /
          bancaires — [préciser les prestataires]). Aucune donnée n&apos;est vendue à des tiers.
        </p>
      </section>

      <section>
        <h3>7. Hébergement et transfert de données</h3>
        <p>
          Les données sont hébergées chez [nom de l&apos;hébergeur, ex. Railway / Render], situé
          [pays/région d&apos;hébergement]. [Préciser si un transfert hors de l&apos;espace
          économique concerné a lieu et les garanties associées.]
        </p>
      </section>

      <section>
        <h3>8. Durée de conservation</h3>
        <p>
          Les données sont conservées pendant la durée nécessaire aux finalités décrites ci-dessus,
          et au maximum [durée] après la fin de la relation contractuelle avec l&apos;établissement,
          sous réserve des durées de conservation légales applicables (comptabilité, obligations
          fiscales).
        </p>
      </section>

      <section>
        <h3>9. Sécurité</h3>
        <p>
          L&apos;Éditeur met en œuvre des mesures techniques et organisationnelles raisonnables
          (chiffrement, contrôle d&apos;accès, journalisation) pour protéger les données contre tout
          accès non autorisé, perte ou altération.
        </p>
      </section>

      <section>
        <h3>10. Droits des personnes concernées</h3>
        <p>
          Conformément à la réglementation applicable, toute personne concernée dispose d&apos;un
          droit d&apos;accès, de rectification, d&apos;effacement, de limitation, d&apos;opposition
          et de portabilité de ses données. Ces droits peuvent être exercés en écrivant à
          [email de contact dédié].
        </p>
      </section>

      <section>
        <h3>11. Cookies et traceurs</h3>
        <p>
          La Plateforme utilise des cookies strictement nécessaires à son fonctionnement (session,
          authentification) [et, le cas échéant, des cookies de mesure d&apos;audience — préciser
          lesquels et proposer un mécanisme de consentement si requis].
        </p>
      </section>

      <section>
        <h3>12. Modification de la politique</h3>
        <p>
          La présente politique peut être mise à jour à tout moment. La date de dernière mise à jour
          figure en haut de ce document. En cas de changement substantiel, les utilisateurs en seront
          informés par [email / notification in-app].
        </p>
      </section>

      <section>
        <h3>13. Contact</h3>
        <p>
          Pour toute question relative à la présente politique ou pour exercer vos droits :
          [email de contact / délégué à la protection des données].
        </p>
      </section>
    </LegalPageLayout>
  )
}
