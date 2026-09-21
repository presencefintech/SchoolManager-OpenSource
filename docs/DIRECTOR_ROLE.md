# Rôle Directeur

Le Directeur pilote la pédagogie, la discipline et la vie scolaire de **son périmètre**
(sections/classes qui lui sont affectées). Il **recommande / initie** ; l'Admin **exécute**
ce qui a un impact structurel ou légal (exclusion définitive, licenciement, paie, dossier
officiel) — même logique que le rôle IT (voir [`IT_ROLE.md`](./IT_ROLE.md)).

Il n'existe pas de portail web enseignant dans `frontend_web` (le cahier d'appel est soumis
depuis une autre application) : pour la RH légère, c'est donc le **Directeur qui saisit** les
congés/évaluations pour le compte de l'enseignant, comme cela se passe réellement dans une
école (demande verbale/papier), plutôt qu'un flux self-service.

## Ce que le Directeur peut déjà faire (existant)

- Dashboard de pilotage (KPIs sections/classes/présences/absences/communiqués)
- Consulter son périmètre (sections, classes affectées par l'Admin)
- Présences : live, historique, heatmap (lecture seule — pas de saisie/validation/kiosque)
- Absences du jour de son périmètre + contact d'urgence
- Communiqués : lire, préparer, **publier** (section ou école)
- Profil & sécurité

## Enrichissement (nouveau, cf. brainstorming 2026-09-21)

Quatre domaines, chacun avec un mini-workflow à statuts (pas de simple journal) :

| Domaine | Écran | Flux |
|---|---|---|
| Supervision pédagogique | `/director/pedagogie` | Fiche de visite `DRAFT` → `FINALIZED` (verrouillée) |
| Discipline élèves | `/director/discipline` | Incident `OPEN` → `DELIBERATED` (conseil de discipline) → `TRANSMITTED_TO_ADMIN` si sanction lourde → `CLOSED` |
| RH légère (enseignants) | `/director/personnel` | Congé `REQUESTED` (saisi par le directeur) → `APPROVED` / `REJECTED` / `FORWARDED_TO_ADMIN` ; Notes (`OBSERVATION` / `WARNING` / `COMMENDATION`) sans statut |
| Parents & inspection EPSP | `/director/parents-inspection` | Réunion `SCHEDULED` → `HELD` (compte-rendu) / `CANCELLED` ; Rapport `DRAFT` → `FINALIZED` → `SUBMITTED` (marqué envoyé, pas d'envoi réel depuis l'app) |

### Limites explicites

- Exécution des sanctions lourdes (exclusion définitive, radiation) reste **Admin**.
- Paie / contrat / embauche-licenciement restent **Admin**. Le Directeur transmet, n'exécute pas.
- Pas de génération PDF pour le rapport EPSP dans cette itération (texte structuré en base
  uniquement) — à ajouter si un jour un modèle de document est requis, sur le pattern
  `GET /admin/enrollments/:id/*.pdf` déjà utilisé ailleurs.
- Pas de portail enseignant : congés/notes RH sont saisis par le Directeur.

## Frontend (`frontend_web`)

Nouveaux clients API (`src/lib/admin/api/`) :

- `director-visits.api.ts` → `directorVisitsApi`
- `director-discipline.api.ts` → `directorDisciplineApi`
- `director-staff.api.ts` → `directorStaffApi`
- `director-outreach.api.ts` → `directorOutreachApi`

Nouvelles pages sous `src/app/(director)/director/` : `pedagogie/`, `discipline/`,
`personnel/` (onglets Congés / Notes), `parents-inspection/` (onglets Réunions / Rapports).
Nav mise à jour dans `src/app/(director)/layout.tsx`.

## Contrats API côté backend

Implémenté dans `Gestion-presence--et-paiement-mobile` (branche `feat/director-role-enrichment`,
migration `20260921120000_director_role_enrichment`) — pas dans ce repo. Toutes les routes sont
scopées au périmètre du Directeur connecté (mêmes sections/classes que `/admin/director/summary`).

Le rapport périodique réutilise l'enum Prisma `ReportPeriod` déjà utilisé côté finance :
valeurs `MONTHLY` / `QUARTERLY` / `SEMESTER` / `ANNUAL` (pas `TERM`).

| Zone | Route | Notes |
|---|---|---|
| Visites de classe | `GET/POST /admin/director/visits` | filtre `teacherId`, `classId`, `status` |
| Visites — finaliser | `POST /admin/director/visits/:id/finalize` | verrouille la fiche |
| Discipline | `GET/POST /admin/director/discipline` | filtre `studentId`, `classId`, `severity`, `status` |
| Discipline — délibérer | `POST /admin/director/discipline/:id/deliberate` | `{ decision, recommendation?, transmitToAdmin }` |
| Discipline — clôturer | `POST /admin/director/discipline/:id/close` | |
| Personnel — annuaire | `GET /admin/director/staff/teachers` | enseignants du périmètre uniquement |
| Congés | `GET/POST /admin/director/staff/leaves` | filtre `teacherId`, `status` |
| Congés — décision | `POST /admin/director/staff/leaves/:id/decide` | `{ decision, note? }` |
| Notes enseignant | `GET/POST /admin/director/staff/notes` | filtre `teacherId` |
| Réunions parents | `GET/POST /admin/director/meetings` | filtre `status` |
| Réunion — tenue | `POST /admin/director/meetings/:id/held` | `{ minutes, attendeeCount? }` |
| Réunion — annuler | `POST /admin/director/meetings/:id/cancel` | |
| Rapports EPSP | `GET/POST /admin/director/reports` | filtre `period`, `status` |
| Rapport — finaliser | `POST /admin/director/reports/:id/finalize` | |
| Rapport — envoyé | `POST /admin/director/reports/:id/submit` | déclaratif, pas d'envoi réel |

Modèles Prisma ajoutés côté backend : `ClassVisit`, `TeacherLeaveRequest`, `TeacherNote`,
`ParentMeeting`, `PeriodicReport` (nouveaux) + `DisciplinaryAction` (modèle existant mais
jamais câblé, étendu avec le workflow `status`/`severity`/`decision`/`recommendation`).
