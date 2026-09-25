# Routes Admin & Super-Admin

> Base URL : `/api/v1`  
> Toutes les routes nécessitent un Bearer token JWT.  
> Légende rôles : `A` = ADMIN | `SA` = SUPER_ADMIN | `F` = FINANCE

---

## TABLE DES MATIÈRES

- [Dashboard & Contrôle](#dashboard--contrôle)
- [Élèves & Inscriptions](#élèves--inscriptions)
- [Classes & Structure](#classes--structure)
- [Présences](#présences)
- [Finance Admin](#finance-admin)
- [Moratoires](#moratoires)
- [Personnel & Utilisateurs](#personnel--utilisateurs)
- [Invitations](#invitations)
- [Notifications](#notifications)
- [Fraude](#fraude)
- [Sanctions](#sanctions)
- [Fichiers & Médias](#fichiers--médias)
- [PDF & Reçus](#pdf--reçus)
- [Emails](#emails)
- [Import en masse](#import-en-masse)
- [Monitoring](#monitoring)
- [SuperAdmin — Core & Établissements](#superadmin--core--établissements)
- [SuperAdmin — Auth & Sessions](#superadmin--auth--sessions)
- [SuperAdmin — Finance](#superadmin--finance)
- [SuperAdmin — Élèves (cross-school)](#superadmin--élèves-cross-school)
- [SuperAdmin — Inscriptions](#superadmin--inscriptions)
- [SuperAdmin — Présences](#superadmin--présences)
- [SuperAdmin — Classes](#superadmin--classes)
- [SuperAdmin — Frais & Structures](#superadmin--frais--structures)
- [SuperAdmin — Paiements & Banque](#superadmin--paiements--banque)
- [SuperAdmin — Audit & Anomalies](#superadmin--audit--anomalies)
- [SuperAdmin — Sécurité & Fraude](#superadmin--sécurité--fraude)
- [SuperAdmin — Invitations & Utilisateurs](#superadmin--invitations--utilisateurs)
- [SuperAdmin — Notifications](#superadmin--notifications)
- [SuperAdmin — Fichiers & Médias](#superadmin--fichiers--médias)
- [SuperAdmin — PDF & QRCode](#superadmin--pdf--qrcode)
- [SuperAdmin — Mobile Money](#superadmin--mobile-money)
- [SuperAdmin — Emails](#superadmin--emails)

---

## Dashboard & Contrôle

**Base :** `/api/v1/admin/dashboard`  
**Rôles :** A, SA

| Méthode | Route | Description |
|---------|-------|-------------|
| `GET` | `/api/v1/admin/dashboard/stats` | Agrégation pipeline / sécurité / intégrité / workers |
| `GET` | `/api/v1/admin/dashboard/stream` | Server-Sent Events — métriques en continu |
| `POST` | `/api/v1/admin/dashboard/reports/weekly` | Déclenche un job BullMQ de rapport hebdomadaire |

---

## Élèves & Inscriptions

**Base :** `/api/v1/admin/students` et `/api/v1/admin/enrollments`  
**Rôles :** A, SA

### Dashboard Élèves

| Méthode | Route | Description |
|---------|-------|-------------|
| `GET` | `/api/v1/admin/students/dashboard/main` | Dashboard principal élèves |
| `GET` | `/api/v1/admin/students/` | Liste filtrée multi-tenant |
| `GET` | `/api/v1/admin/students/:id/detail` | Vue 360° d'un élève |
| `GET` | `/api/v1/admin/students/:id/activity` | Timeline d'activité |
| `GET` | `/api/v1/admin/students/:id/dossier-status` | Vérification complétude du dossier |
| `GET` | `/api/v1/admin/students/reports/debtors` | Rapport des impayés |
| `GET` | `/api/v1/admin/students/applications` | File d'attente des candidatures |
| `POST` | `/api/v1/admin/students/applications/:id/approve` | Approuver une candidature |
| `POST` | `/api/v1/admin/students/applications/:id/reject` | Rejeter une candidature |
| `POST` | `/api/v1/admin/students/:id/security-action` | Actions de sécurité sur un élève |
| `POST` | `/api/v1/admin/students/:id/log-pii-access` | Audit accès données PII (RGPD) |

### Inscriptions (Enrollment)

| Méthode | Route | Description |
|---------|-------|-------------|
| `POST` | `/api/v1/admin/enrollments/` | Inscrire un nouvel élève (avec photo) |
| `GET` | `/api/v1/admin/enrollments/sessions` | Liste des sessions académiques |
| `GET` | `/api/v1/admin/enrollments/` | Liste tous les élèves (avec recherche) |
| `GET` | `/api/v1/admin/enrollments/class/:classId` | Élèves d'une classe |
| `GET` | `/api/v1/admin/enrollments/:studentId` | Détails complets d'un élève |
| `POST` | `/api/v1/admin/enrollments/:studentId/sessions` | Inscrire à une session |
| `PATCH` | `/api/v1/admin/enrollments/:studentId/admin-profile` | Profil administratif/médical |
| `PUT` | `/api/v1/admin/enrollments/:studentId` | Modifier les infos d'un élève |
| `POST` | `/api/v1/admin/enrollments/:studentId/approve` | Approuver une pré-inscription (1 clic) |
| `PATCH` | `/api/v1/admin/enrollments/:studentId/finalize` | Valider / générer matricule final |
| `POST` | `/api/v1/admin/enrollments/:studentId/transfer` | Transférer vers une autre école |
| `PUT` | `/api/v1/admin/enrollments/:studentId/biometrics` | Mettre à jour le template facial |
| `PUT` | `/api/v1/admin/enrollments/:studentId/biometrics/fingerprint` | Enrôlement empreinte digitale |
| `POST` | `/api/v1/admin/enrollments/face-search` | Recherche par reconnaissance faciale (1:N) |
| `PATCH` | `/api/v1/admin/enrollments/:studentId/toggle-lock` | Verrouillage/déverrouillage financier |
| `PATCH` | `/api/v1/admin/enrollments/:studentId/promote` | Promotion de classe |
| `PATCH` | `/api/v1/admin/enrollments/:studentId/reminder-pause` | Pause des relances de paiement |
| `DELETE` | `/api/v1/admin/enrollments/:studentId/purge` | Suppression définitive (RGPD) |

---

## Classes & Structure

**Base :** `/api/v1/admin/classes` et `/api/v1/admin/structure`  
**Rôles :** A (classes), A+SA (structure)

### Classes

| Méthode | Route | Description |
|---------|-------|-------------|
| `GET` | `/api/v1/admin/classes/` | Liste des classes (filtrable) |
| `POST` | `/api/v1/admin/classes/` | Créer une classe |
| `GET` | `/api/v1/admin/classes/:id` | Détails d'une classe |
| `PUT` | `/api/v1/admin/classes/:id` | Modifier une classe |
| `PATCH` | `/api/v1/admin/classes/:id/status` | Activer/désactiver une classe |
| `POST` | `/api/v1/admin/classes/:id/assign-students` | Affecter des élèves en masse |
| `POST` | `/api/v1/admin/classes/:id/transfer` | Transférer des élèves |
| `GET` | `/api/v1/admin/classes/:id/stats` | Statistiques d'une classe |
| `GET` | `/api/v1/admin/classes/:id/export` | Exporter les données |
| `GET` | `/api/v1/admin/classes/:id/audit` | Audit trail |
| `POST` | `/api/v1/admin/classes/rollover` | Rollover annuel (toutes les classes) |
| `GET` | `/api/v1/admin/classes/conflicts/:teacherId` | Conflits d'emploi du temps d'un prof |

### Structure (Sections & Options)

| Méthode | Route | Description |
|---------|-------|-------------|
| `GET` | `/api/v1/admin/structure/sections` | Lister les sections |
| `POST` | `/api/v1/admin/structure/sections` | Créer une section |
| `GET` | `/api/v1/admin/structure/options` | Lister les options |
| `POST` | `/api/v1/admin/structure/options` | Créer une option |

---

## Présences

**Base :** `/api/v1/admin/presences`  
**Rôles :** A, SA, F (lecture) | A, SA (mutations)

| Méthode | Route | Description |
|---------|-------|-------------|
| `GET` | `/api/v1/admin/presences/health` | Vérification du module (sans auth) |
| `GET` | `/api/v1/admin/presences/live` | Flux en direct enrichi avec QR Codes |
| `GET` | `/api/v1/admin/presences/stats` | Statistiques dashboard |
| `GET` | `/api/v1/admin/presences/heatmap` | Carte thermique des présences |
| `GET` | `/api/v1/admin/presences/alerts` | Alertes de fraude |
| `GET` | `/api/v1/admin/presences/session-qr` | Générer un QR Code kiosque |
| `POST` | `/api/v1/admin/presences/record` | Enregistrement manuel individuel |
| `POST` | `/api/v1/admin/presences/bulk` | Enregistrement groupé (toute une classe) |
| `PATCH` | `/api/v1/admin/presences/:id/validate` | Valider une présence suspecte |
| `DELETE` | `/api/v1/admin/presences/:id` | Supprimer une présence |
| `PATCH` | `/api/v1/admin/presences/security-events/:eventId/dismiss` | Ignorer une alerte sécurité |
| `PATCH` | `/api/v1/admin/presences/security-events/:eventId/validate` | Valider une alerte sécurité |
| `POST` | `/api/v1/admin/presences/security-events/:eventId/notify` | Notifier sur une alerte sécurité |

---

## Finance Admin

**Base :** `/api/v1/admin/finance`  
**Rôles :** A, SA, F (lecture) | A, SA (mutations)

### Dashboards & Analytics

| Méthode | Route | Description |
|---------|-------|-------------|
| `GET` | `/api/v1/admin/finance/dashboard/strategic` | Dashboard stratégique BI |
| `GET` | `/api/v1/admin/finance/dashboard/insights` | Insights financiers |
| `GET` | `/api/v1/admin/finance/dashboard/comparative` | Performance comparative |
| `GET` | `/api/v1/admin/finance/dashboard/efficiency` | Efficacité de recouvrement |
| `GET` | `/api/v1/admin/finance/reports/detailed` | Rapport détaillé |
| `GET` | `/api/v1/admin/finance/analytics/health-check` | Bilan de santé financière |
| `GET` | `/api/v1/admin/finance/analytics/top-payers` | Meilleurs payeurs |

### Audit & Anti-fraude

| Méthode | Route | Description |
|---------|-------|-------------|
| `GET` | `/api/v1/admin/finance/audit/presence-security` | Statut sécurité présences |
| `POST` | `/api/v1/admin/finance/audit/trigger-manual` | Déclencher un audit manuel |
| `GET` | `/api/v1/admin/finance/audit/integrity-scan` | Scanner l'intégrité des données |
| `GET` | `/api/v1/admin/finance/audit/risk-profiles` | Profils de risque |
| `GET` | `/api/v1/admin/finance/audit/fraud-alerts` | Alertes de fraude |
| `GET` | `/api/v1/admin/finance/audit/duplicates` | Suspects de doublons |
| `POST` | `/api/v1/admin/finance/audit/fraud-risk-analysis` | Analyse de risque de fraude |
| `GET` | `/api/v1/admin/finance/audit/logs` | Logs d'audit globaux |
| `GET` | `/api/v1/admin/finance/audit/ledger` | Historique du grand livre |
| `GET` | `/api/v1/admin/finance/audit/cashier/:cashierId` | Audit session caissier |

### Paiements & Transactions

| Méthode | Route | Description |
|---------|-------|-------------|
| `GET` | `/api/v1/admin/finance/payments/pending-verifications` | Vérifications en attente |
| `GET` | `/api/v1/admin/finance/payments/pending-verifications/export` | Exporter les vérifications |
| `POST` | `/api/v1/admin/finance/payments/verifications/:verificationId/mark-processed` | Marquer comme traité |
| `POST` | `/api/v1/admin/finance/payments/verify-step` | Vérifier une étape de paiement |
| `POST` | `/api/v1/admin/finance/payments/manual` | Paiement manuel |
| `POST` | `/api/v1/admin/finance/payments/link-orphan` | Lier une transaction orpheline |
| `POST` | `/api/v1/admin/finance/payments/bank-confirm/:paymentId` | Confirmer un paiement bancaire |
| `POST` | `/api/v1/admin/finance/payments/mobile-confirm/:paymentId` | Confirmer un paiement mobile |
| `GET` | `/api/v1/admin/finance/payments/mobile/pending` | Paiements mobile en attente |
| `POST` | `/api/v1/admin/finance/payments/:paymentId/resend-receipt` | Renvoyer un reçu |
| `GET` | `/api/v1/admin/finance/transactions/advanced-search` | Recherche avancée de transactions |

### Facturation & Frais

| Méthode | Route | Description |
|---------|-------|-------------|
| `POST` | `/api/v1/admin/finance/invoices/generate` | Générer une facture |
| `POST` | `/api/v1/admin/finance/invoices/apply-discount` | Appliquer une remise |
| `GET` | `/api/v1/admin/finance/invoices/student/:studentId` | Factures d'un élève |
| `POST` | `/api/v1/admin/finance/fee-structure` | Créer une structure de frais |
| `POST` | `/api/v1/admin/finance/fee-structure/:feeStructureId/apply-bulk` | Appliquer en masse |
| `DELETE` | `/api/v1/admin/finance/fee-structure/:feeId` | Supprimer une structure |
| `POST` | `/api/v1/admin/finance/enrollments/:enrollmentId/sync-balance` | Synchroniser la balance |
| `GET` | `/api/v1/admin/finance/closing/end-of-day` | Clôture de journée |
| `POST` | `/api/v1/admin/finance/refunds/:id/review` | Examiner une demande de remboursement |

### Profil de règlement

| Méthode | Route | Description |
|---------|-------|-------------|
| `GET` | `/api/v1/admin/finance/payment-profile` | Profil de paiement de l'école |
| `PUT` | `/api/v1/admin/finance/payment-profile` | Créer/modifier le profil |

---

## Moratoires

**Base :** `/api/v1/admin/finance/moratoriums`  
**Rôles :** A, SA, F (lecture) | A, SA (mutations)

| Méthode | Route | Description |
|---------|-------|-------------|
| `GET` | `/api/v1/admin/finance/moratoriums/recovery-rate` | Taux de recouvrement |
| `GET` | `/api/v1/admin/finance/moratoriums/policy` | Politique de moratoire |
| `PATCH` | `/api/v1/admin/finance/moratoriums/policy` | Mettre à jour la politique |
| `GET` | `/api/v1/admin/finance/moratoriums/` | Liste des moratoires |
| `GET` | `/api/v1/admin/finance/moratoriums/:id` | Détails d'un moratoire |
| `POST` | `/api/v1/admin/finance/moratoriums/` | Accorder un moratoire |
| `POST` | `/api/v1/admin/finance/moratoriums/bulk` | Accorder en masse |
| `PATCH` | `/api/v1/admin/finance/moratoriums/:id` | Modifier un moratoire |
| `POST` | `/api/v1/admin/finance/moratoriums/:id/approve` | Approuver |
| `POST` | `/api/v1/admin/finance/moratoriums/:id/reject` | Rejeter |
| `DELETE` | `/api/v1/admin/finance/moratoriums/:id` | Révoquer |

---

## Personnel & Utilisateurs

**Base :** `/api/v1/admin` et `/api/v1/admin/users` et `/api/v1/admin/teachers`  
**Rôles :** A, SA

### Gestion du staff

| Méthode | Route | Description |
|---------|-------|-------------|
| `GET` | `/api/v1/admin/staff` | Liste du personnel de l'école |
| `POST` | `/api/v1/admin/staff` | Créer un utilisateur |
| `DELETE` | `/api/v1/admin/staff/:id` | Désactiver un membre |
| `POST` | `/api/v1/admin/users/staff` | Créer un membre (Finance, Enseignant) |

### Gestion des enseignants

| Méthode | Route | Description |
|---------|-------|-------------|
| `GET` | `/api/v1/admin/teachers/support/:teacherId/dashboard` | Vue mobile d'un enseignant |
| `GET` | `/api/v1/admin/teachers/support/:teacherId/scans` | Historique des scans |
| `PATCH` | `/api/v1/admin/teachers/presence/:presenceId/force-validate` | Corriger un scan manuellement |
| `PUT` | `/api/v1/admin/teachers/management/:teacherId/classes` | Modifier les affectations de classes |

---

## Invitations

**Base :** `/api/v1/admin/invitations`  
**Rôle :** A

| Méthode | Route | Description |
|---------|-------|-------------|
| `POST` | `/api/v1/admin/invitations/parent-code` | Générer un code de liaison parent |
| `POST` | `/api/v1/admin/invitations/staff` | Inviter un membre du staff |
| `GET` | `/api/v1/admin/invitations/status` | Statut des invitations de l'école |
| `DELETE` | `/api/v1/admin/invitations/staff/revoke` | Révoquer une invitation staff |
| `DELETE` | `/api/v1/admin/invitations/parent-code/:codeId` | Révoquer un code parent |

---

## Notifications

**Base :** `/api/v1/admin/notifications`  
**Rôle :** A

| Méthode | Route | Description |
|---------|-------|-------------|
| `POST` | `/api/v1/admin/notifications/broadcast-group` | Envoyer à un groupe (PARENT, TEACHER…) |
| `POST` | `/api/v1/admin/notifications/direct` | Envoyer à un utilisateur précis |
| `GET` | `/api/v1/admin/notifications/history` | Historique des notifications de l'école |

---

## Fraude

**Base :** `/api/v1/admin/fraud`  
**Rôle :** A

| Méthode | Route | Description |
|---------|-------|-------------|
| `POST` | `/api/v1/admin/fraud/check` | Évaluation sécurité locale (paiement/élève) |
| `GET` | `/api/v1/admin/fraud-alerts` | Alertes de fraude (via hub `/admin`) |

---

## Sanctions

**Base :** `/api/v1/admin/sanctions`  
**Rôles :** A, SA

| Méthode | Route | Description |
|---------|-------|-------------|
| `POST` | `/api/v1/admin/sanctions/analyze` | Analyser et appliquer une sanction |

---

## Fichiers & Médias

**Base :** `/api/v1/admin/files` et `/api/v1/admin/cloudinary`

| Méthode | Route | Rôles | Description |
|---------|-------|-------|-------------|
| `POST` | `/api/v1/admin/files/upload` | A, F | Uploader un document (preuve de paiement, photo…) |
| `DELETE` | `/api/v1/admin/files/delete` | A, F | Supprimer un document |
| `POST` | `/api/v1/admin/cloudinary/students/:studentId/photo` | A, SA | Upload photo d'un élève |
| `POST` | `/api/v1/admin/cloudinary/students/:studentId/documents/:documentType` | A, SA | Upload certificat/bulletin |
| `DELETE` | `/api/v1/admin/cloudinary/files/:studentId/:publicId` | A, SA | Supprimer un fichier Cloudinary |

---

## PDF & Reçus

**Base :** `/api/v1/admin/pdf`  
**Rôle :** A

| Méthode | Route | Description |
|---------|-------|-------------|
| `GET` | `/api/v1/admin/pdf/receipts/:paymentId` | Générer un reçu de paiement |

---

## Emails

**Base :** `/api/v1/emails`  
**Rôles :** A, SA

| Méthode | Route | Description |
|---------|-------|-------------|
| `POST` | `/api/v1/emails/send-template` | Envoyer un email via template (avec quota) |

---

## Import en masse

**Base :** `/api/v1/admin/import`  
**Rôles :** A, SA

| Méthode | Route | Description |
|---------|-------|-------------|
| `POST` | `/api/v1/admin/import/:type` | Lancer un import (`students` / `parents` / `structure` / `fees`) |
| `GET` | `/api/v1/admin/import/:jobId` | Suivre la progression d'un job d'import |

**Colonnes par type :**

| Type | Colonnes requises | Colonnes optionnelles |
|------|-------------------|-----------------------|
| `students` | `firstName`, `lastName`, `className`, `totalAmount` | `gender`, `dateOfBirth`, `paidAmount`, `matricule`, `scholarshipPercent` |
| `parents` | `firstName`, `lastName`, `phone`, `studentMatricule` | `email`, `relationship`, `isPrimary` |
| `structure` | `sectionName`, `optionName`, `className`, `level`, `academicYear` | — |
| `fees` | `categoryName`, `className`, `amount` | `description` |

---

## Monitoring

**Base :** `/api/v1/admin/monitoring`  
**Rôles :** A, SA

| Méthode | Route | Description |
|---------|-------|-------------|
| `GET` | `/api/v1/admin/monitoring/health` | Santé applicative (Réconciliation, Alertes) |
| `GET` | `/api/v1/admin/monitoring/stats` | Signes vitaux serveur (CPU, RAM, Uptime) |

---

---

# SUPERADMIN

> Base URL : `/api/v1/superadmin`  
> **Rôle exclusif : SUPER_ADMIN** (sauf mention contraire)

---

## SuperAdmin — Core & Établissements

**Base :** `/api/v1/superadmin/core`

| Méthode | Route | Description |
|---------|-------|-------------|
| `GET` | `/api/v1/superadmin/core/stats` | Dashboard global de la plateforme |
| `GET` | `/api/v1/superadmin/core/schools` | Liste de tous les établissements |
| `GET` | `/api/v1/superadmin/core/schools/:id` | Détails d'un établissement |
| `POST` | `/api/v1/superadmin/core/schools/:id/suspend` | Suspendre un établissement (insolvabilité, rupture contrat…) |
| `POST` | `/api/v1/superadmin/core/schools/:id/reactivate` | Réactiver un établissement suspendu |
| `GET` | `/api/v1/superadmin/core/users` | Liste de tous les utilisateurs |
| `GET` | `/api/v1/superadmin/core/students` | Monitoring étudiants (transverse) |
| `GET` | `/api/v1/superadmin/core/presences` | Monitoring présences (transverse) |
| `POST` | `/api/v1/superadmin/core/reconcile/:id` | Forcer la réconciliation d'un paiement |
| `GET` | `/api/v1/superadmin/core/audit-logs` | Logs d'audit globaux |
| `GET` | `/api/v1/superadmin/core/export-audit` | Exporter les logs d'audit en CSV |

---

## SuperAdmin — Auth & Sessions

**Base :** `/api/v1/superadmin/auth`

| Méthode | Route | Description |
|---------|-------|-------------|
| `POST` | `/api/v1/superadmin/auth/force-logout/:userId` | Forcer la déconnexion d'un utilisateur |
| `POST` | `/api/v1/superadmin/auth/reset-mfa/:userId` | Réinitialiser le MFA d'un utilisateur |
| `GET` | `/api/v1/superadmin/auth/sessions/active` | Rapport des sessions actives |
| `DELETE` | `/api/v1/superadmin/auth/sessions/cleanup` | Nettoyer les sessions expirées |
| `POST` | `/api/v1/superadmin/auth/trigger-reset` | Déclencher une réinitialisation de mot de passe |
| `POST` | `/api/v1/superadmin/auth/regenerate-password/:userId` | Régénérer un mot de passe temporaire (cf. `super-admin/accounts`) |
| `POST` | `/api/v1/superadmin/auth/generate-invite` | Générer un code d'invitation |

---

## SuperAdmin — Finance

**Base :** `/api/v1/superadmin/finance`

| Méthode | Route | Description |
|---------|-------|-------------|
| `GET` | `/api/v1/superadmin/finance/report` | Rapport BI complexe multi-critères |
| `GET` | `/api/v1/superadmin/finance/performance/:schoolId` | KPI globaux et seuil de rentabilité |
| `GET` | `/api/v1/superadmin/finance/efficiency/:schoolId` | Analyse recouvrement par niveaux |
| `GET` | `/api/v1/superadmin/finance/top-payers/:schoolId` | Meilleurs payeurs d'une école |
| `GET` | `/api/v1/superadmin/finance/audit-full/:schoolId` | Audit 360° (intégrité + risques + Benford) |
| `GET` | `/api/v1/superadmin/finance/anomalies/:schoolId` | Anomalies statistiques |
| `GET` | `/api/v1/superadmin/finance/reconciliation/:schoolId` | Snapshot fin de journée |
| `GET` | `/api/v1/superadmin/finance/payment-profiles` | Liste des profils de règlement |
| `GET` | `/api/v1/superadmin/finance/payment-profiles/:schoolId` | Profil de règlement d'une école |
| `POST` | `/api/v1/superadmin/finance/payment-profiles/:schoolId/verify` | Vérifier un profil (KYC) |
| `POST` | `/api/v1/superadmin/finance/payment-profiles/:schoolId/reject` | Rejeter un profil |
| `GET` | `/api/v1/superadmin/finance/group-dashboard` | Dashboard finance agrégé multi-écoles |
| `GET` | `/api/v1/superadmin/finance/benchmarks/:schoolId` | Benchmark de collecte vs. écoles comparables |
| `POST` | `/api/v1/superadmin/finance/fee-catalog/clone` | Cloner un catalogue de frais (session/école source → cible) |

---

## SuperAdmin — Réseaux d'écoles

**Base :** `/api/v1/superadmin/school-networks`

| Méthode | Route | Description |
|---------|-------|-------------|
| `GET` | `/api/v1/superadmin/school-networks` | Liste des groupes (réseaux) d'écoles |
| `GET` | `/api/v1/superadmin/school-networks/schools` | Écoles disponibles pour affectation à un réseau |
| `GET` | `/api/v1/superadmin/school-networks/:groupId/overview` | Vue d'ensemble d'un réseau (hub, clearing 30j) |
| `POST` | `/api/v1/superadmin/school-networks` | Créer un groupe |
| `PATCH` | `/api/v1/superadmin/school-networks/:groupId` | Modifier un groupe (nom, actif) |
| `POST` | `/api/v1/superadmin/school-networks/assign` | Affecter une école à un groupe |
| `DELETE` | `/api/v1/superadmin/school-networks/schools/:schoolId` | Retirer une école d'un groupe |
| `POST` | `/api/v1/superadmin/school-networks/schools/:schoolId/payment-hub` | Désigner l'école comme hub de paiement du réseau |

---

## SuperAdmin — Facturation (billing)

**Base :** `/api/v1/superadmin/billing`

| Méthode | Route | Description |
|---------|-------|-------------|
| `GET` | `/api/v1/superadmin/billing/plans` | Liste des plans produit (Starter/Pro/Enterprise) |
| `GET` | `/api/v1/superadmin/billing/schools/:schoolId` | Abonnement/plan résolu d'une école |
| `PUT` | `/api/v1/superadmin/billing/schools/:schoolId` | Assigner/modifier le plan d'une école |
| `POST` | `/api/v1/superadmin/billing/schools/:schoolId/cancel` | Annuler l'abonnement d'une école |

---

## SuperAdmin — Élèves (cross-school)

**Base :** `/api/v1/superadmin/students-management`

| Méthode | Route | Description |
|---------|-------|-------------|
| `GET` | `/api/v1/superadmin/students-management/schools/:id/students/stats` | Statistiques élèves d'une école |
| `GET` | `/api/v1/superadmin/students-management/schools/:schoolId/students/debtors` | Élèves débiteurs |
| `GET` | `/api/v1/superadmin/students-management/schools/:schoolId/students` | Liste paginée avec filtres |
| `GET` | `/api/v1/superadmin/students-management/students/:studentId/dashboard` | Vue 360° d'un élève |
| `GET` | `/api/v1/superadmin/students-management/students/:studentId/activity` | Timeline d'activité |
| `GET` | `/api/v1/superadmin/students-management/students/:studentId/dossier` | Complétude du dossier |
| `DELETE` | `/api/v1/superadmin/students-management/schools/:schoolId/students/stats/invalidate` | Invalider le cache des stats |

---

## SuperAdmin — Inscriptions

**Base :** `/api/v1/superadmin/enrollment`

| Méthode | Route | Description |
|---------|-------|-------------|
| `POST` | `/api/v1/superadmin/enrollment/` | Créer un élève (IA + Cloudinary + PDF) |
| `GET` | `/api/v1/superadmin/enrollment/audit/finance/:schoolId` | Audit intégrité financière d'une école |
| `GET` | `/api/v1/superadmin/enrollment/audit/worker/:schoolId` | Santé des workers d'une école |
| `POST` | `/api/v1/superadmin/enrollment/audit/test-face-id` | Tester la reconnaissance faciale |
| `GET` | `/api/v1/superadmin/enrollment/:id/integrity` | Vérifier la signature cryptographique |
| `PATCH` | `/api/v1/superadmin/enrollment/:id/lock` | Verrouillage/déverrouillage financier |
| `PUT` | `/api/v1/superadmin/enrollment/:id/biometrics` | Injection manuelle de vecteur facial |
| `PATCH` | `/api/v1/superadmin/enrollment/:id/grace-period` | Gérer la période de grâce |
| `DELETE` | `/api/v1/superadmin/enrollment/:id/purge` | Purge physique RGPD |

---

## SuperAdmin — Présences

**Base :** `/api/v1/superadmin/presence`

| Méthode | Route | Description |
|---------|-------|-------------|
| `GET` | `/api/v1/superadmin/presence/dashboard/:schoolId` | Dashboard live (Redis temps réel) |
| `POST` | `/api/v1/superadmin/presence/sync/:schoolId` | Synchronisation massive (offline→online) |
| `POST` | `/api/v1/superadmin/presence/record/:schoolId/:studentId` | Enregistrement forcé |
| `PATCH` | `/api/v1/superadmin/presence/validate/:schoolId/:presenceId` | Validation manuelle |

---

## SuperAdmin — Classes

**Base :** `/api/v1/superadmin/classes`

| Méthode | Route | Description |
|---------|-------|-------------|
| `GET` | `/api/v1/superadmin/classes/` | Liste globale (filtrable par schoolId) |
| `GET` | `/api/v1/superadmin/classes/alerts/capacity` | Alertes de capacité critiques |
| `POST` | `/api/v1/superadmin/classes/maintenance/rollover` | Rollover annuel |
| `POST` | `/api/v1/superadmin/classes/:id/duplicate` | Dupliquer une structure |
| `GET` | `/api/v1/superadmin/classes/:id/validate-setup` | Validation de configuration |
| `GET` | `/api/v1/superadmin/classes/:id/audit-trail` | Audit trail |
| `GET` | `/api/v1/superadmin/classes/teachers/:teacherId/conflicts` | Conflits emploi du temps |
| `GET` | `/api/v1/superadmin/classes/:id/export-full` | Export complet |
| `GET` | `/api/v1/superadmin/classes/:id/performance-stats` | Stats de performance |

---

## SuperAdmin — Frais & Structures

**Base :** `/api/v1/superadmin/fees`

| Méthode | Route | Description |
|---------|-------|-------------|
| `POST` | `/api/v1/superadmin/fees/upsert` | Créer/modifier une structure de frais |
| `DELETE` | `/api/v1/superadmin/fees/:id` | Supprimer une structure |
| `GET` | `/api/v1/superadmin/fees/:id/history` | Historique des modifications |
| `POST` | `/api/v1/superadmin/fees/bulk-apply` | Appliquer en masse (centaines d'élèves) |
| `POST` | `/api/v1/superadmin/fees/apply/:id` | Forcer l'application pour une inscription |
| `POST` | `/api/v1/superadmin/fees/reconcile/:enrollmentId` | Recalculer la balance d'un élève |
| `POST` | `/api/v1/superadmin/fees/categories` | Créer une catégorie de frais |
| `GET` | `/api/v1/superadmin/fees/schools/:schoolId/structures` | Catalogue des tarifs d'une école |
| `POST` | `/api/v1/superadmin/fees/invoices/force-generate` | Forcer la génération d'une facture |
| `PATCH` | `/api/v1/superadmin/fees/invoices/apply-global-discount` | Remise exceptionnelle |
| `GET` | `/api/v1/superadmin/fees/schools/:schoolId/students/:studentId/audit` | Historique financier complet d'un élève |

---

## SuperAdmin — Paiements & Banque

**Base :** `/api/v1/superadmin/payment-stats` et `/api/v1/superadmin/bank`

### Stats paiements

| Méthode | Route | Description |
|---------|-------|-------------|
| `GET` | `/api/v1/superadmin/payment-stats/dashboard/:id` | Dashboard financier d'un établissement |
| `GET` | `/api/v1/superadmin/payment-stats/security-audit/:id` | Audit croisé paiements/présences |
| `GET` | `/api/v1/superadmin/payment-stats/high-risk/:id` | Profils à haut risque de défaut |

### Banque

| Méthode | Route | Description |
|---------|-------|-------------|
| `POST` | `/api/v1/superadmin/bank/force-sync/:id` | Forcer la réconciliation bancaire |
| `POST` | `/api/v1/superadmin/bank/inspect` | Vérifier une référence (audit sans impact) |

### Export

| Méthode | Route | Description |
|---------|-------|-------------|
| `POST` | `/api/v1/superadmin/export/excel` | Générer un fichier Excel |
| `POST` | `/api/v1/superadmin/export/pdf` | Générer un document PDF |
| `POST` | `/api/v1/superadmin/export/csv` | Dump de données CSV |
| `POST` | `/api/v1/superadmin/export/secured` | Export avec filigrane sécurisé |

---

## SuperAdmin — Audit & Anomalies

**Base :** `/api/v1/superadmin/audit` et `/api/v1/superadmin/anomalies` et `/api/v1/superadmin/monitoring`

### Audit

| Méthode | Route | Description |
|---------|-------|-------------|
| `GET` | `/api/v1/superadmin/audit/snapshot` | Vue panoramique des alertes sécurité |
| `GET` | `/api/v1/superadmin/audit/integrity/:schoolId/:studentId` | Validité de la signature financière |
| `GET` | `/api/v1/superadmin/audit/payments/flags` | Transactions financières suspectes |
| `GET` | `/api/v1/superadmin/audit/trail` | Historique complet des modifications |

### Anomalies

| Méthode | Route | Description |
|---------|-------|-------------|
| `GET` | `/api/v1/superadmin/anomalies/dashboard` | Rapport global des événements de sécurité |
| `POST` | `/api/v1/superadmin/anomalies/analyze/:studentId` | Analyse comportementale manuelle |
| `PATCH` | `/api/v1/superadmin/anomalies/thresholds` | Mettre à jour les seuils de détection |

### Monitoring infrastructure

| Méthode | Route | Description |
|---------|-------|-------------|
| `GET` | `/api/v1/superadmin/monitoring/reconciliation` | Santé de la réconciliation |
| `GET` | `/api/v1/superadmin/monitoring/providers` | Performance des gateways (SMS, paiements) |
| `GET` | `/api/v1/superadmin/monitoring/alerts` | Journal des alertes de sécurité |
| `GET` | `/api/v1/superadmin/monitoring/sms` | Statut de l'intégration SMS |
| `POST` | `/api/v1/superadmin/monitoring/sms/test` | Envoyer un SMS/WhatsApp de test |

---

## SuperAdmin — Sécurité & Fraude

**Base :** `/api/v1/superadmin/security` et `/api/v1/superadmin/fraud`

### Sécurité étudiants

| Méthode | Route | Description |
|---------|-------|-------------|
| `POST` | `/api/v1/superadmin/security/suspend` | Suspension forcée (fraude/incident grave) |
| `PATCH` | `/api/v1/superadmin/security/unblock/:schoolId/:studentId` | Réactiver un compte bloqué |
| `POST` | `/api/v1/superadmin/security/report-fraud` | Enregistrer une suspicion de fraude |
| `POST` | `/api/v1/superadmin/security/audit-access` | Audit accès données PII (RGPD) |

### Fraude

| Méthode | Route | Description |
|---------|-------|-------------|
| `POST` | `/api/v1/superadmin/fraud/analyze` | Analyse globale de fraude (cross-school) |
| `GET` | `/api/v1/superadmin/fraud/flags` | Alias vers `/audit/payments/flags` |

---

## SuperAdmin — Invitations & Utilisateurs

**Base :** `/api/v1/superadmin/invitations` et `/api/v1/superadmin/users`

### Invitations

| Méthode | Route | Description |
|---------|-------|-------------|
| `POST` | `/api/v1/superadmin/invitations/staff` | Inviter un Admin/Manager dans une école |
| `POST` | `/api/v1/superadmin/invitations/parent-code` | Générer un code de liaison parent |
| `GET` | `/api/v1/superadmin/invitations/school/:schoolId` | Invitations d'une école |
| `POST` | `/api/v1/superadmin/invitations/staff/resend` | Renvoyer une invitation (email + SMS) |
| `DELETE` | `/api/v1/superadmin/invitations/staff/revoke` | Révoquer une invitation |

### Utilisateurs

| Méthode | Route | Description |
|---------|-------|-------------|
| `POST` | `/api/v1/superadmin/users/create-admin` | Créer un administrateur pour une école |
| `POST` | `/api/v1/superadmin/users/suspend` | Suspendre un compte utilisateur |
| `POST` | `/api/v1/superadmin/users/reactivate` | Réactiver un compte utilisateur |

---

## SuperAdmin — Notifications

**Base :** `/api/v1/superadmin/notifications`

| Méthode | Route | Description |
|---------|-------|-------------|
| `GET` | `/api/v1/superadmin/notifications/queue-status` | Statut de la file d'attente (BullMQ/Redis) |
| `POST` | `/api/v1/superadmin/notifications/broadcast` | Diffusion massive sur toute la plateforme |
| `GET` | `/api/v1/superadmin/notifications/logs` | Logs globaux des notifications |
| `DELETE` | `/api/v1/superadmin/notifications/cleanup` | Nettoyage / maintenance |

---

## SuperAdmin — Fichiers & Médias

**Base :** `/api/v1/superadmin/files` et `/api/v1/superadmin/storage`

| Méthode | Route | Rôles | Description |
|---------|-------|-------|-------------|
| `POST` | `/api/v1/superadmin/files/upload` | SA, A | Uploader un document (toutes écoles) |
| `DELETE` | `/api/v1/superadmin/files/delete` | SA | Supprimer un fichier (forçage support) |
| `POST` | `/api/v1/superadmin/storage/force-upload` | SA | Uploader pour n'importe quel élève (support) |
| `GET` | `/api/v1/superadmin/storage/stats` | SA | Statistiques globales de stockage |

---

## SuperAdmin — PDF & QRCode

**Base :** `/api/v1/superadmin/pdf` et `/api/v1/superadmin/qrcode`

| Méthode | Route | Description |
|---------|-------|-------------|
| `GET` | `/api/v1/superadmin/pdf/receipts/:paymentId` | Générer un reçu (accès global) |
| `GET` | `/api/v1/superadmin/pdf/audit/global` | Audit global du SaaS (PDF) |
| `POST` | `/api/v1/superadmin/qrcode/test` | Tester le moteur QR Code |
| `POST` | `/api/v1/superadmin/qrcode/generate-support` | Générer un QR pour un élève (support) |

---

## SuperAdmin — Mobile Money

**Base :** `/api/v1/superadmin/mm`

| Méthode | Route | Description |
|---------|-------|-------------|
| `GET` | `/api/v1/superadmin/mm/metrics` | 100 derniers paiements PENDING de la plateforme |
| `GET` | `/api/v1/superadmin/mm/fraud-radar` | Anomalies et scores de fraude élevés (>70) |
| `POST` | `/api/v1/superadmin/mm/reconcile/:paymentId` | Réconciliation manuelle d'un litige mobile |

---

## SuperAdmin — Emails

**Base :** `/api/v1/superadmin/emails`

| Méthode | Route | Description |
|---------|-------|-------------|
| `POST` | `/api/v1/superadmin/emails/broadcast` | Envoyer un email système (plateforme entière) |

---

*Généré le 2026-06-30 — projet Presence & Paiement Mobile*
