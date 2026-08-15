# Rôle IT (guichet inscriptions)

L’administrateur d’école n’est pas forcément devant les élèves. **IT** est l’agent de secrétariat / guichet : inscriptions, confirmation des demandes, attribution des frais, et tâches de comptoir (codes parent, photos, consultation). Ce n’est **pas** un second admin (pas de caisse, pas de config école, pas de gestion du personnel).

## Modèle

- `Role.IT` dans l’enum Prisma `Role`
- Pas de table profil dédiée (contrairement à `Finance` / `Teacher`)
- Invitable / créable par un `ADMIN` d’école, comme TEACHER / FINANCE / DIRECTOR

Migration : `prisma/migrations/20260814120000_role_it/`

Constantes : `src/policies/staff-roles.ts`

| Constante | Rôles |
|-----------|--------|
| `ENROLLMENT_DESK_ROLES` | ADMIN, SUPER_ADMIN, **IT** |
| `FEE_ATTRIBUTION_ROLES` | ADMIN, SUPER_ADMIN, FINANCE, **IT** |
| `SCHOOL_ADMIN_ROLES` | ADMIN, SUPER_ADMIN (config, purge, staff) |
| `INVITABLE_STAFF_ROLES` | TEACHER, FINANCE, DIRECTOR, **IT** |

## Ce que l’IT peut faire

- Inscrire / mettre à jour un élève, pack rentrée, session, biométrie, cartes PDF
- Boîte d’entrée, pré-inscriptions, candidatures : confirmer / refuser
- Fiche élève 360° + **attribution des frais** (ASSIGN / OVERRIDE / EXEMPT)
- Lier un parent (lookup téléphone, **générer / révoquer un code parent**)
- Photos et documents élève (Cloudinary) + upload fichiers guichet
- **Imprimer les cartes élèves** (une fiche, une classe, une sélection — PDF A4, 8 cartes/page)
- Lire classes / sections / options (pas créer la structure)
- Consulter l’emploi du temps (pas créer / modifier les créneaux)
- Consulter les présences (live, historique, heatmap) — pas de saisie, kiosque, validation, fraude
- Lire les communiqués parents ; **préparer un brouillon** (un admin / directeur publie)
- Vérifier un reçu (`/verify`, page publique)
- Import Excel (listes de rentrée)
- Promouvoir / réinscrire en session
- **Attestation de scolarité PDF** (élève ou classe entière)
- **Fiche administrative A4** (identité, parent, pièces)
- **Justificatif de présence** (période, défaut = mois en cours)
- **Certificat de radiation / sortie PDF** (identité RDC, scolarité, n° de pièce, impression seule — n’inactive pas le dossier)
- **Convocation parent PDF** (impression seule — n’envoie pas de SMS / notification)
- **Autorisation de sortie PDF** (laissez-passer du jour — n’enregistre pas de présence)
- **Personnes autorisées / cartes remise** (déclarer les adultes, photo, pièce, enfants ; imprimer 1 carte/adulte — n’est pas un scan présence)
- **Liste de classe CSV** et **contacts parents CSV**
- Affecter / transférer des élèves **entre classes de la même école**
- **Annuaire enseignants** (lecture : nom, email, téléphone)
- **Accueil guichet** : recherche + file des dossiers incomplets
- **Situation financière (lecture)** : statut **en ordre / dette** par classe, impression et CSV **sans montants** (FLS). Les montants restent ADMIN / FINANCE.

## Ce que l’IT ne peut pas faire

- Caisse, encaissements, remboursements, moratoires, lots scellés
- Créer / modifier le catalogue de frais (barèmes école)
- Purge élève, transfert d’école, verrouillage dossier
- Personnel (création / désactivation), invitations staff, paramètres
- Fraude, sanctions, alertes présence, saisie / kiosque / cahier d’appel
- Modifier l’emploi du temps, créer / désactiver une classe, rollover
- Publier / archiver des communiqués
- Dashboard admin global, stats financières de classe, audit classe

## API (extrait)

| Zone | Routes | Rôles |
|------|--------|--------|
| Inscriptions | `/admin/enrollments/*` | desk |
| Pré-inscriptions | `/pre-enrollments/*` | desk |
| Élèves | `/admin/students/*` | desk |
| Attribution frais | `/admin/finance/students/:id/fee-assignments*` | fee desk |
| Catalogue (lecture) | `GET /admin/finance/fee-structures` | fee desk |
| Structure (lecture) | `GET /admin/structure/*`, `GET /school/*` | desk |
| Classes (lecture) | `GET /admin/classes` | desk |
| Affectation / transfert classe | `POST /admin/classes/:id/assign-students`, `POST .../transfer` | desk |
| Liste de classe CSV | `GET /admin/classes/:id/export?format=csv` | desk |
| Annuaire enseignants | `GET /admin/staff` (IT = TEACHER seulement) | desk |
| Emploi du temps | `GET /admin/class-periods` | desk (write = admin) |
| Présences (lecture) | `GET /admin/presences/live\|history\|stats\|heatmap` | desk |
| Présences (mutations) | record, bulk, validate, QR, alertes, seal | **admin only** |
| Codes parent | `POST/DELETE /admin/invitations/parent-code*` | desk |
| Invitations staff | `/admin/invitations/staff*` | **admin only** |
| Photos élèves | `/admin/cloudinary/students/*` | desk |
| Cartes PDF | `GET /admin/enrollments/:id/card/pdf`, `GET .../class/:id/cards/pdf`, `POST .../cards/pdf` | desk |
| Attestation PDF | `GET /admin/enrollments/:id/certificate/pdf`, `GET .../class/:id/certificates/pdf` | desk |
| Fiche admin PDF | `GET /admin/enrollments/:id/fiche/pdf` | desk |
| Justificatif présence | `GET /admin/enrollments/:id/attendance-certificate/pdf` | desk |
| Certificat de radiation | `GET /admin/enrollments/:id/exit-certificate/pdf` (`reason`, `destination`, `destinationCity`, `exitDate`, `observations`, `nothingToReport`) | desk |
| Convocation parent | `GET /admin/enrollments/:id/parent-summons/pdf` (`reason`, `meetingDate`, `meetingTime`, `location`, `note`) | desk |
| Autorisation de sortie | `GET /admin/enrollments/:id/exit-pass/pdf` (`parentVisa`, `pickerKind=LINKED\|MANDATED`, pièce d’identité si mandaté / maternelle) | desk |
| Remise (adultes / cartes) | `GET/POST /admin/enrollments/:id/pickup*`, `GET /admin/pickup/adults/:id/card/pdf` | desk |
| Dossiers incomplets | `GET /admin/students/desk/incomplete` | desk |
| Situation financière (lecture) | `GET /finance/students`, `GET /finance/students/export/print` | desk + finance |
| Contacts classe | `GET /admin/classes/:id/contacts?format=csv` | desk |
| Fichiers | `POST/DELETE /admin/files/*` | ADMIN, FINANCE, IT |
| Communiqués (lecture) | `GET /admin/announcements` | school staff + IT |
| Communiqués (brouillon) | `POST /admin/announcements`, `POST .../preview` | desk (IT forcé DRAFT) |
| Communiqués (publish) | `POST /admin/announcements/:id/publish` | **admin / director** |
| Purge / transfert / lock | mêmes routes enrollments | **admin only** |

## Seed local

```
it@ecole-demo.sn  →  IT
```

Même mot de passe que les autres comptes seed.

## Frontend (`frontend_web`)

- Accueil : `/admin/desk` (filtre **Remise**, compteur sans tuteur)
- Fiche 360 : `/admin/students/:id?doc=pickup` — panel personnes autorisées + impression cartes parent
- Menu « Guichet » + « Consultation » (présences, EDT, codes parents, communiqués, fichiers, **cartes élèves** ≠ **cartes remise**, **annuaire enseignants**, **dettes / en ordre**, **radiation**, **convocation**, **autorisation de sortie**, vérifier reçu)
- `/admin/cards` = cartes **élèves** (présence matin) uniquement
- Middleware : sous-ensemble de `/admin/*` uniquement
- Mutations masquées (EDT, présences, publication communiqués, onglet staff des invitations, création classe, rollover)
- Création / invitation staff : option **IT / Guichet**

Passation UI : `frontend_web/docs/api-contracts/web-admin-pickup-handoff.md` · produit [`PICKUP_CARDS.md`](./PICKUP_CARDS.md)
