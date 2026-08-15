# API Admin — Routes complètes

> **Base URL** : `http://localhost:5000/api/v1`  
> **Auth** : Bearer JWT (`Authorization: Bearer <token>`)  
> **Rôle requis** : `ADMIN` (certaines routes acceptent aussi `FINANCE` ou `SUPER_ADMIN`)

---

## Connexion

```http
POST /auth/login
Content-Type: application/json

{
  "identifier": "admin@school1.local",
  "password": "Presence2026!"
}
```

**Réponse** :
```json
{
  "token": "eyJ...",
  "user": { "id": 2, "role": "ADMIN", "schoolId": 1 }
}
```

---

## Dashboard & Stats

| Méthode | Route | Description |
|---------|-------|-------------|
| `GET` | `/admin/stats` | Stats globales du dashboard |
| `GET` | `/admin/live-feed` | Flux présences en direct |
| `GET` | `/admin/heatmap` | Carte thermique des présences |
| `GET` | `/admin/fraud-alerts` | Alertes fraude globales |
| `GET` | `/admin/dashboard` | Dashboard temps réel (contrôle) |
| `POST` | `/admin/dashboard/reports/weekly` | Déclencher rapport hebdo |

---

## Staff

| Méthode | Route | Description |
|---------|-------|-------------|
| `GET` | `/admin/staff` | Liste le personnel de l'école |
| `POST` | `/admin/staff` | Créer un utilisateur |
| `DELETE` | `/admin/staff/:id` | Désactiver un membre |
| `POST` | `/admin/users/staff` | Créer staff (Finance / Enseignant) |

**Body `POST /admin/users/staff`** :
```json
{
  "email": "finance2@school1.local",
  "firstName": "Prénom",
  "lastName": "Nom",
  "role": "FINANCE"
}
```

---

## Élèves — `/admin/students`

| Méthode | Route | Description |
|---------|-------|-------------|
| `GET` | `/admin/students/dashboard/main` | Dashboard principal élèves |
| `GET` | `/admin/students` | Liste filtrée (pagination) |
| `GET` | `/admin/students/:id/detail` | Fiche complète 360° |
| `GET` | `/admin/students/:id/activity` | Timeline d'activité |
| `GET` | `/admin/students/:id/dossier-status` | État du dossier |
| `GET` | `/admin/students/reports/debtors` | Liste des débiteurs |
| `GET` | `/admin/students/applications` | File de pré-inscriptions |
| `POST` | `/admin/students/applications/:id/approve` | Approuver pré-inscription |
| `POST` | `/admin/students/applications/:id/reject` | Rejeter pré-inscription |
| `POST` | `/admin/students/:id/security-action` | Action sécurité (suspension…) |
| `POST` | `/admin/students/:id/log-pii-access` | Logger accès données sensibles |

**Query params `GET /admin/students`** :
```
?page=1&limit=20&classId=1&status=ACTIVE&search=Diallo
```

---

## Inscriptions — `/admin/enrollments`

| Méthode | Route | Description |
|---------|-------|-------------|
| `POST` | `/admin/enrollments` | Inscrire un nouvel élève |
| `GET` | `/admin/enrollments` | Liste tous les élèves |
| `GET` | `/admin/enrollments/class/:classId` | Liste par classe |
| `GET` | `/admin/enrollments/:studentId` | Détails d'un élève |
| `PUT` | `/admin/enrollments/:studentId` | Modifier les infos |
| `POST` | `/admin/enrollments/:studentId/approve` | Approuver pré-inscription |
| `PATCH` | `/admin/enrollments/:studentId/finalize` | Finaliser (génère matricule) |
| `POST` | `/admin/enrollments/:studentId/transfer` | Transférer vers autre école |
| `PUT` | `/admin/enrollments/:studentId/biometrics` | Mise à jour photo/facial |
| `POST` | `/admin/enrollments/face-search` | Recherche par visage |
| `PATCH` | `/admin/enrollments/:studentId/toggle-lock` | Verrouillage financier |
| `PATCH` | `/admin/enrollments/:studentId/promote` | Promotion de classe |
| `PATCH` | `/admin/enrollments/:studentId/reminder-pause` | Pause relances paiement |
| `DELETE` | `/admin/enrollments/:studentId/purge` | Suppression RGPD définitive |
| `GET` | `/admin/enrollments/:studentId/pickup` | Foyer + personnes autorisées (cartes remise) |
| `POST` | `/admin/enrollments/:studentId/pickup/adults` | Déclarer un adulte autorisé |
| `GET` | `/admin/enrollments/:studentId/pickup/cards/pdf` | PDF cartes remise du foyer |
| `PATCH` | `/admin/pickup/adults/:adultId` | Mettre à jour un adulte |
| `PUT` | `/admin/pickup/adults/:adultId/children` | Enfants autorisés pour cette carte |
| `POST` | `/admin/pickup/adults/:adultId/photo` | Photo adulte (avant impression) |
| `GET` | `/admin/pickup/adults/:adultId/card/pdf` | PDF 1 carte remise (`?reissue=1`) |
| `POST` | `/admin/pickup/adults/:adultId/revoke` | Révoquer — la carte ne fonctionne plus |

**Cartes remise ≠ cartes élèves.** QR `{ "kind": "pickup" }`. Voir `docs/PICKUP_CARDS.md`.

**Body `POST /admin/enrollments`** :
```json
{
  "firstName": "Ousmane",
  "lastName": "Diallo",
  "gender": "M",
  "dateOfBirth": "2012-03-15",
  "classId": 1,
  "academicYear": "2025-2026"
}
```

---

## Classes — `/admin/classes`

| Méthode | Route | Description |
|---------|-------|-------------|
| `GET` | `/admin/classes` | Liste des classes |
| `POST` | `/admin/classes` | Créer une classe |
| `GET` | `/admin/classes/:id` | Détails d'une classe |
| `PUT` | `/admin/classes/:id` | Modifier une classe |
| `PATCH` | `/admin/classes/:id/status` | Activer / désactiver |
| `POST` | `/admin/classes/:id/assign-students` | Assigner des élèves |
| `POST` | `/admin/classes/:id/transfer` | Transférer des élèves |
| `GET` | `/admin/classes/:id/stats` | Statistiques (présence + finance) |
| `GET` | `/admin/classes/:id/export` | Export CSV/JSON |
| `GET` | `/admin/classes/:id/audit` | Journal d'audit |
| `POST` | `/admin/classes/rollover` | Passage en nouvelle année scolaire |
| `GET` | `/admin/classes/conflicts/:teacherId` | Conflits d'affectation enseignant |

**Body `POST /admin/classes`** :
```json
{
  "name": "6ème A",
  "level": "6",
  "academicYear": "2025-2026",
  "sectionId": 1,
  "optionId": 1,
  "teacherId": 3,
  "maxStudents": 40
}
```

**Body `POST /admin/classes/rollover`** :
```json
{
  "fromYear": "2024-2025",
  "toYear": "2025-2026"
}
```

---

## Présences — `/admin/presences`

| Méthode | Route | Description |
|---------|-------|-------------|
| `GET` | `/admin/presences/health` | Santé du module (sans auth) |
| `GET` | `/admin/presences/live` | Flux en direct enrichi |
| `GET` | `/admin/presences/stats` | Statistiques de présence |
| `GET` | `/admin/presences/heatmap` | Carte thermique |
| `GET` | `/admin/presences/alerts` | Alertes fraude |
| `GET` | `/admin/presences/session-qr` | Générer QR Code kiosque |
| `POST` | `/admin/presences/record` | Enregistrement manuel individuel |
| `POST` | `/admin/presences/bulk` | Enregistrement groupé (toute une classe) |
| `PATCH` | `/admin/presences/:id/validate` | Valider présence suspecte |
| `DELETE` | `/admin/presences/:id` | Supprimer une présence (fraude) |

**Body `POST /admin/presences/record`** :
```json
{
  "studentId": 1,
  "classId": 1,
  "scanMethod": "MANUAL",
  "scannedAt": "2026-06-22T07:50:00.000Z"
}
```

**Body `POST /admin/presences/bulk`** :
```json
{
  "classId": 1,
  "studentIds": [1, 2, 3],
  "scanMethod": "MANUAL",
  "scannedAt": "2026-06-22T07:50:00.000Z"
}
```

---

## Finance — `/admin/finance`

### Dashboards & Rapports

| Méthode | Route | Description |
|---------|-------|-------------|
| `GET` | `/admin/finance/dashboard/strategic` | Dashboard stratégique (ADMIN) |
| `GET` | `/admin/finance/reports/detailed` | Rapport détaillé |
| `GET` | `/admin/finance/analytics/health-check` | Santé financière |
| `GET` | `/admin/finance/analytics/top-payers` | Meilleurs payeurs |
| `GET` | `/admin/finance/dashboard/insights` | Insights financiers |
| `GET` | `/admin/finance/dashboard/comparative` | Performance comparative |
| `GET` | `/admin/finance/dashboard/efficiency` | Taux de recouvrement |
| `GET` | `/admin/finance/closing/end-of-day` | Clôture fin de journée |

### Audit & Fraude

| Méthode | Route | Description |
|---------|-------|-------------|
| `GET` | `/admin/finance/audit/presence-security` | Sécurité des présences |
| `POST` | `/admin/finance/audit/trigger-manual` | Déclencher audit manuel |
| `GET` | `/admin/finance/audit/integrity-scan` | Scan d'intégrité des données |
| `GET` | `/admin/finance/audit/risk-profiles` | Profils de risque |
| `GET` | `/admin/finance/audit/fraud-alerts` | Alertes fraude financière |
| `GET` | `/admin/finance/audit/duplicates` | Détection doublons suspects |
| `POST` | `/admin/finance/audit/fraud-risk-analysis` | Analyse risque fraude |
| `GET` | `/admin/finance/audit/logs` | Journal d'audit global |
| `GET` | `/admin/finance/audit/ledger` | Historique du grand livre |
| `GET` | `/admin/finance/audit/cashier/:cashierId` | Audit session caissier |

### Paiements & Transactions

| Méthode | Route | Description |
|---------|-------|-------------|
| `GET` | `/admin/finance/payments/pending-verifications` | Paiements à vérifier |
| `POST` | `/admin/finance/payments/verify-step` | Valider étape de vérification |
| `POST` | `/admin/finance/payments/manual` | Enregistrer paiement manuel |
| `POST` | `/admin/finance/payments/link-orphan` | Rattacher transaction orpheline |
| `GET` | `/admin/finance/transactions/advanced-search` | Recherche avancée |
| `POST` | `/admin/finance/payments/:id/resend-receipt` | Renvoyer reçu |
| `POST` | `/admin/finance/payments/bank-confirm/:id` | Confirmer virement bancaire |
| `POST` | `/admin/finance/payments/mobile-confirm/:id` | Confirmer Mobile Money |
| `GET` | `/admin/finance/payments/mobile/pending` | Liste Mobile Money en attente |

**Body `POST /admin/finance/payments/manual`** :
```json
{
  "studentId": 1,
  "amount": 300,
  "method": "CASH",
  "sessionId": 1,
  "note": "Paiement partiel reçu en caisse"
}
```

### Frais & Facturation

| Méthode | Route | Description |
|---------|-------|-------------|
| `POST` | `/admin/finance/fee-structure` | Créer un barème de frais |
| `POST` | `/admin/finance/fee-structure/:id/apply-bulk` | Appliquer les frais en masse |
| `DELETE` | `/admin/finance/fee-structure/:id` | Supprimer un barème |
| `POST` | `/admin/finance/invoices/generate` | Générer une facture |
| `POST` | `/admin/finance/invoices/apply-discount` | Appliquer une remise |
| `GET` | `/admin/finance/invoices/student/:studentId` | Factures d'un élève |
| `POST` | `/admin/finance/enrollments/:id/sync-balance` | Synchroniser le solde |

---

## Moratoires — `/admin/finance/moratoriums`

| Méthode | Route | Description |
|---------|-------|-------------|
| `GET` | `/admin/finance/moratoriums/recovery-rate` | Taux de recouvrement |
| `GET` | `/admin/finance/moratoriums` | Liste des moratoires |
| `GET` | `/admin/finance/moratoriums/:id` | Détails d'un moratoire |
| `POST` | `/admin/finance/moratoriums` | Accorder un moratoire |
| `POST` | `/admin/finance/moratoriums/bulk` | Accorder en masse |
| `PATCH` | `/admin/finance/moratoriums/:id` | Modifier un moratoire |
| `DELETE` | `/admin/finance/moratoriums/:id` | Révoquer un moratoire |

**Body `POST /admin/finance/moratoriums`** :
```json
{
  "studentId": 5,
  "enrollmentId": 5,
  "type": "EXCEPTIONAL",
  "startDate": "2026-06-01",
  "endDate": "2026-07-31",
  "reason": "Difficultés financières familiales temporaires"
}
```

---

## Invitations — `/admin/invitations`

| Méthode | Route | Description |
|---------|-------|-------------|
| `POST` | `/admin/invitations/parent-code` | Générer un code d'invitation parent |
| `POST` | `/admin/invitations/staff` | Inviter un membre du staff |
| `GET` | `/admin/invitations/status` | Statut des invitations de l'école |
| `DELETE` | `/admin/invitations/staff/revoke` | Révoquer une invitation staff |
| `DELETE` | `/admin/invitations/parent-code/:codeId` | Révoquer un code parent |

**Body `POST /admin/invitations/parent-code`** :
```json
{
  "studentId": 3
}
```

**Body `POST /admin/invitations/staff`** :
```json
{
  "email": "nouveau.prof@school1.local",
  "role": "TEACHER",
  "firstName": "Ibrahima",
  "lastName": "Diallo"
}
```

---

## Enseignants — `/admin/teachers`

| Méthode | Route | Description |
|---------|-------|-------------|
| `GET` | `/admin/teachers/support/:teacherId/dashboard` | Vue dashboard d'un prof |
| `GET` | `/admin/teachers/support/:teacherId/scans` | Historique des scans |
| `PATCH` | `/admin/teachers/presence/:presenceId/force-validate` | Corriger une erreur de scan |
| `PUT` | `/admin/teachers/management/:teacherId/classes` | Modifier les affectations |

---

## Paramètres école — `/admin/schools`

| Méthode | Route | Description |
|---------|-------|-------------|
| `GET` | `/admin/schools/attendance-settings` | Lire les paramètres de présence |
| `PUT` | `/admin/schools/attendance-settings` | Modifier les paramètres |

---

## Présence manuelle rapide (legacy)

| Méthode | Route | Description |
|---------|-------|-------------|
| `POST` | `/admin/presence/manual` | Enregistrement manuel (alias) |
| `PATCH` | `/admin/presence/:id/validate` | Validation (alias) |

---

## Codes de réponse

| Code | Signification |
|------|---------------|
| `200` | Succès |
| `201` | Créé |
| `400` | Requête invalide (champ manquant) |
| `401` | Token manquant ou expiré |
| `403` | Accès refusé (rôle insuffisant) |
| `404` | Ressource introuvable |
| `409` | Conflit (doublon) |
| `500` | Erreur serveur |

---

## Comptes de test

| Rôle | Email | Mot de passe |
|------|-------|--------------|
| Admin école 1 | `admin@school1.local` | `Presence2026!` |
| Finance école 1 | `finance@school1.local` | `Presence2026!` |
| Admin école 2 | `admin@school2.local` | `Presence2026!` |
| SuperAdmin | `admin@ecole.sn` | `Admin1234!` |
