# Matrice de couverture API — Presence Platform

Document de référence pour les équipes d'intégration (mobile, web admin, finance) et les partenaires techniques.

**Dernière mise à jour :** 26 juin 2026 — dashboard admin ERP (weeklyTrend, heatmap), structure scolaire, refresh JWT

**ADR :** [`docs/ADR-002-tenant-context.md`](../../docs/ADR-002-tenant-context.md)

**Porte d'entrée documentation :** [`README_PLATFORM.md`](./README_PLATFORM.md) · **[Guide frontend](./frontend-integration-guide.md)**

---

## Contexte tenant (ADR-002)

Middleware global sur `/api/*` — résolution et propagation du tenant UUID.

| Header / source | Format | Usage |
|-----------------|--------|-------|
| **`X-Tenant-Id`** | UUID v4 (recommandé) | Valeur `data.tenant.id` de `GET /control-plane/tenant/config` |
| **`X-Tenant-Id`** | `school-{id}` | Transition / debug |
| **`x-school-id`** | entier | Fallback legacy |
| **JWT** | `user.schoolId` | Fallback si headers absents |
| **`X-Correlation-Id`** | UUID (optionnel) | Traçabilité logs + gateway paiement |

| Variable env | Effet |
|--------------|-------|
| `TENANT_ENFORCE_JWT_MATCH=true` | Header tenant ≠ JWT → **403** |
| `TENANT_ENFORCE_JWT_MATCH=false` | Mismatch → warn log seulement |
| `ENABLE_PG_RLS=1` | Active RLS tenant en dev |

**Socket.io :** `auth: { token, tenantId }` → room `tenant_{uuid}` en plus de `user_{userId}`.

**Tests :** `npm run test:tenant-middleware`

---

## Sécurité montant — résumé intégration client

| Canal | Requête | Montant affiché UI |
|-------|---------|-------------------|
| Parent `POST /payments/pay` | `feeStructureId` requis · `amount` déprécié | `data.serverAmount` |
| Parent `POST /finance/intents` | `feeStructureId` · pas de montant à l'execute | `data.amount` (intent) |
| Admin `POST /admin/finance/payments/manual` | `feeStructureId` recommandé | `data.amount` (réponse) |

Détail flux Flutter : **[frontend-integration-guide.md](./frontend-integration-guide.md)** §3–4.

---

## Vue d'ensemble par canal

| Domaine | Source de vérité | Typage client | Statut | Notes |
|---------|------------------|---------------|--------|-------|
| Onboarding & auth | **`openapi-auth.json`** | OpenAPI 3 | Complet | 13 routes · OTP 403/429/503 |
| Dashboard & élèves (parent) | **`openapi-parent-mobile.json`** | OpenAPI 3 | Complet | 22 routes · Control Plane tenant · hors finances |
| Présence & sécurité (parent) | **`openapi-parent-mobile.json`** | OpenAPI 3 | Complet | `GET /students/{id}/attendance` · `PresenceStatus`, `PresenceScanMethod` |
| Présence — prélèvement (teacher) | **`openapi-teacher-mobile.json`** | OpenAPI 3 | Complet | `POST /scan`, `/scan/qr`, `/sync`, validate |
| Config modes pointage (admin) | **`swagger-docs/admin.json`** → `/admin/schools/{schoolId}/attendance-settings` | OpenAPI 3 | Complet | `enabledPresenceModes` par école |
| Finance — compte élève | **`openapi-parent-finances.json`** | OpenAPI 3 | Complet | wallet, finances, invoices, pending |
| Finance — Paiements | **`openapi-parent-finances.json`** | OpenAPI 3 | Complet | `POST /payments/pay` · `serverAmount` · `GET /payments/{id}/receipt` |
| Finance — Reçus sécurisés | **`flutter-parent-receipt.md`** + **`receipt-verify.md`** | Guide + REST | Complet | PDF stream · verify QR · lookup PF · pages `/verify` |
| Finance — Payment Intent | **`openapi-parent-finances.json`** | OpenAPI 3 | Complet | `/finance/intents*` (18 routes finance) |
| **Finance — Profil règlement (KYC)** | **[school-payment-profile.md](./school-payment-profile.md)** · **[web-admin-payment-handoff.md](./web-admin-payment-handoff.md)** | Guide REST | Complet | Admin `payment-profile` · Superadmin `payment-profiles` · gate parent `online_enabled` |
| Finance — Moratoires | **`openapi-parent-finances.json`** + admin | OpenAPI 3 | Complet | `GET/POST .../moratorium*` parent · `MoratoriumPublicInfo` dans wallet/finances · admin `moratoriums/policy` |
| Notifications push | **`openapi-parent-mobile.json`** | OpenAPI 3 | Complet | register-token parent (pas auth) |
| SMS / OTP | **`openapi-auth.json`** | OpenAPI 3 | Validé staging | Twilio + mock |
| **Temps réel — Parent** | **`openapi-parent-mobile.json`** → `x-socket-events` | Hybride | Validé staging | Catalog v0 : `payment.settled`, `attendance.recorded` |
| **Temps réel — Admin / Finance** | `openapi-admin.json` → **`x-socket-events`** | OpenAPI 3 + TypeScript | **Validé staging** | `payment.confirmed.*`, `payment.failed.admin` |
| Admin / superadmin REST | **`openapi/admin.json`** | `/api/v1/admin/*` | ADMIN, SUPER_ADMIN, FINANCE | REST complet — moratoires, finance admin, **dashboard juin 2026** |
| **Admin — dashboard présence** | **`openapi/admin.json`** · `types/dashboard.types.ts` | `/admin/stats`, `/admin/heatmap`, `/admin/live-feed` | Guide + OpenAPI | `DashboardQuickStats.weeklyTrend` · graphiques Recharts |
| **Admin — structure scolaire** | **`openapi/admin.json`** | `/admin/structure/sections`, `/admin/structure/options` | OpenAPI 3 | Inscription + création classes |
| **Admin — actions métier UX** | **[admin-business-actions.md](./admin-business-actions.md)** | `/admin/enrollments/sessions`, `…/admin-profile`, export pending, alertes présence | Guide REST | Complet |
| Finance web (guichet) | **`swagger-docs/finance.json`** | OpenAPI 3 | Complet | `/api/v1/finance/*` + **lecture KYC** `GET /admin/finance/payment-profile` (**40 ops**) |
| **Reçus — vérification publique** | **`receipt-verify.md`** + **`flutter-parent-receipt.md`** | Guide | Complet | QR + code PF — sans auth |

---

## API publique — vérification reçu (QR + code PF)

| Méthode | Route | Auth | Description |
|---------|-------|------|-------------|
| `GET` | `/api/v1/receipts/verify/{token}` | Aucune | Scan QR — token `p{id}_{hmac32}` |
| `GET` | `/api/v1/receipts/lookup?receiptNumber=&code=` | Aucune | Saisie manuelle — code `PF-0001-2601-A7F3` |

**Pages web (public) :** `/verify` · `/verify/receipt/{token}`

**Rôles utilisateurs :** public (parents) · accès nav `FINANCE` / `ADMIN` → lien « Vérifier reçu »

Rate limit : 60 req / 15 min / IP.

Guides : **[receipt-verify.md](./receipt-verify.md)** · **[flutter-parent-receipt.md](./flutter-parent-receipt.md)** §2.2–2.3.

## Documentation OpenAPI — Admin & Finance

### Spécifications REST

| Fichier | Préfixe API | Rôles | Contenu principal |
|---------|-------------|-------|-------------------|
| **`swagger-docs/admin.json`** | `/api/v1/admin/*` | ADMIN, SUPER_ADMIN, FINANCE | REST complet (**136 ops**) — dashboard, structure, moratoires, finance admin, etc. |
| **`swagger-docs/superadmin.json`** | `/api/v1/superadmin/*` | SUPER_ADMIN | Plateforme SaaS (108 ops) |
| **`swagger-docs/finance.json`** | `/api/v1/finance/*` + lecture KYC admin | FINANCE, ADMIN | Guichet trésorerie (**40 ops**) — inclut `PaymentProfileDto` |
| **`openapi-admin.json`** | — (Socket.io) | ADMIN, FINANCE, SUPER_ADMIN | **Temps réel paiements** — `x-socket-events` |

**Swagger UI :** `/api-docs/admin` · `/api-docs/superadmin` · `/api-docs/finance` · `/api-docs/admin-realtime`

**Régénération :** `npm run docs:admin-openapi` · `docs:superadmin-openapi` · `docs:finance-openapi` (ou `docs:openapi` pour tout).

### Spécifications temps réel (Socket.io)

Contrat OpenAPI dédié : **`openapi-admin.json`** (extension `x-socket-events`).

| Fichier | Rôle |
|---------|------|
| `openapi-admin.json` | **Source de vérité front** — schémas + rooms + exemples |
| `payment-event.types.ts` | Miroir TypeScript backend (doit rester synchronisé) |
| `admin-socket.service.ts` / `finance-socket.service.ts` | Implémentation émission |

---

## Événements temps réel par rôle

### Connexion Socket.io

Tous les clients authentifiés se connectent avec le JWT et, pour le parent mobile, le tenant UUID (ADR-002) :

```typescript
const socket = io(host, {
  auth: {
    token: jwt,
    tenantId: cachedTenantUuid, // depuis GET /control-plane/tenant/config
  },
  transports: ['websocket'],
});
```

### Matrice rooms × rôles

| Rôle | Rooms jointes à la connexion |
|------|------------------------------|
| **PARENT** | `user_{userId}`, `tenant_{tenantId}` (si `auth.tenantId` résolu) |
| **ADMIN / SUPER_ADMIN** | `user_{userId}`, `school:{schoolId}:control-dashboard`, `school:{schoolId}:finance`, `admin-monitoring` |
| **FINANCE** | `user_{userId}`, `school:{schoolId}:finance` |

### Événements paiement

| Événement | Direction | Room | Rôle destinataire | Schéma | Statut |
|-----------|-----------|------|-------------------|--------|--------|
| `payment.settled` | Serveur → client | `user_{parentUserId}` | PARENT | `PaymentSettledEvent` (OpenAPI) | Validé |
| `payment.confirmed.admin` | Serveur → client | `school:{id}:control-dashboard` | ADMIN | `PaymentConfirmedAdminPayload` | Validé |
| `payment.confirmed.finance` | Serveur → client | `school:{id}:finance` | FINANCE · ADMIN (supervision) | `PaymentConfirmedFinancePayload` | Validé |
| `payment.failed.admin` | Serveur → client | `school:{id}:control-dashboard` | ADMIN | `PaymentFailedAdminPayload` | Validé |
| `notification` | Serveur → client | `user_{userId}` | Tous | `SocketNotificationPayload` · worker outbox | **Validé** (juil. 2026) |
| `attendance.recorded` | Serveur → client | `user_{parentUserId}` | PARENT | Catalog v0 | Validé |

### Détail des payloads paiement

#### Parent — `payment.settled`

Canal opérationnel mobile. Déclenché après webhook `PAYMENT_CONFIRMED` ou réconciliation.

| Champ clé | Description |
|-----------|-------------|
| `paymentId`, `studentId`, `schoolId` | Identifiants transaction |
| `amount`, `currency`, `remainingBalance` | Montants |
| `provider`, `providerRef`, `reference` | Traçabilité gateway |
| `receiptUrl`, `receiptNumber` | Reçu (lien téléchargement parent) |
| `receiptReady`, `receiptInProgress` | PDF généré ou en cours (historique paiements) |

**Téléchargement :** `GET /mobile/parents/payments/{id}/receipt` — PDF stream ou JSON pending (`reason`: `RECEIPT_NOT_GENERATED`, etc.).  
**Vérification reçu :** QR `GET /api/v1/receipts/verify/{token}` · lookup PF `GET /api/v1/receipts/lookup` · pages `/verify`. Voir [`receipt-verify.md`](./receipt-verify.md).
| `status` | `CONFIRMED` \| `RECONCILED` |
| `nextStep` | Toujours `COMPLETE` |

Source OpenAPI : `openapi-parent-mobile.json` → `components.schemas.PaymentSettledEvent`.

#### Admin — `payment.confirmed.admin`

Canal direction / promoteur. Payload riche pour le suivi opérationnel.

| Champ clé | Description |
|-----------|-------------|
| `studentId`, `studentName` | Élève concerné |
| `amount`, `currency`, `provider`, `providerRef` | Détail transaction |
| `reference`, `correlationId` | Traçabilité |
| `status` | `CONFIRMED` |
| `confirmedAt` | Horodatage métier |

**Exclus du payload finance :** pas de duplication vers la room finance avec ces champs identiques — le module finance émet son propre contrat.

#### Finance — `payment.confirmed.finance`

Canal comptable. Payload minimal pour réconciliation et trésorerie.

| Champ clé | Description |
|-----------|-------------|
| `paymentId`, `schoolId` | Identifiants |
| `transactionRef`, `providerRef` | Références comptables |
| `amount`, `currency`, `confirmedAt` | Montant et date |
| `reconciliationStatus` | `CONFIRMED` \| `RECONCILED` |

**Champs volontairement absents :** `studentName`, `correlationId`, `remainingBalance`, métriques présence.

#### Finance — remboursements & dashboard (phases 2–3)

| Événement | Déclencheur |
|-----------|-------------|
| `refund.requested.finance` | Guichet crée une demande |
| `refund.approved.finance` | Admin approuve |
| `refund.processed.finance` | Guichet exécute (reverse settlement) |
| `guichet.dashboard.refresh` | Après process remboursement — recharger KPIs |

Types : `payment-event.types.ts` · spec : `openapi-admin.json` → `x-socket-events`

#### Admin — `payment.failed.admin`

Alerte échec webhook ou settlement provider.

| Champ clé | Description |
|-----------|-------------|
| `paymentId`, `schoolId`, `provider` | Contexte |
| `correlationId` | Traçabilité gateway |
| `reason`, `message` | Diagnostic |

### Événements opérationnels (hors paiement)

| Événement | Room | Rôle | Description |
|-----------|------|------|-------------|
| `control_dashboard` | `school:{id}:control-dashboard` | ADMIN | Snapshot performance, sécurité, workers |
| `enrollment_approved` | `school:{id}:control-dashboard` | ADMIN | Inscription validée |
| `new_enrollment_request` | `school:{id}:control-dashboard` | ADMIN | Nouvelle demande |
| `reconciliation_event` | `admin-monitoring` | ADMIN | Résultats job réconciliation CRON |

---

## Stratégie de typage client

| Canal | REST | Temps réel |
|-------|------|------------|
| **Parent mobile** | OpenAPI 3 (`openapi-parent-mobile.json`) | Extension `x-socket-events` + `PaymentSettledEvent` |
| **Admin / Finance web** | OpenAPI 3 (`swagger-docs/admin.json`, `openapi-admin.json`) | REST + `x-socket-events` |
| **Auth** | OpenAPI 3 (`openapi-auth.json`) | — |

---

## Checklist développeur

### Mobile parent (Flutter)

1. Connexion Socket après login : `io(host, { auth: { token: jwt, tenantId } })`.
2. Écouter `payment.settled` sur la room personnelle (automatique à la connexion).
3. Filtrer par `studentId` si l'écran paiement est mono-enfant.
4. Fallback : polling `GET /payments/{id}` si socket déconnecté (< 60 s après `execute`).
5. Moratoire : `GET /students/{id}/moratorium` avant formulaire · `POST .../moratorium-request` · bandeau si `remindersOnHold` ([`flutter-parent-moratorium.md`](./flutter-parent-moratorium.md)).

### Web admin (promoteur)

1. Connexion Socket avec JWT ADMIN.
2. Écouter `payment.confirmed.admin` et `payment.failed.admin` (room `control-dashboard`).
3. Écouter `payment.confirmed.finance` pour supervision comptable (room finance).
4. Écouter `control_dashboard`, `enrollment_*` pour le pilotage ops.

### Web finance (comptable)

1. Connexion Socket avec JWT FINANCE.
2. Écouter `payment.confirmed.finance`, `refund.*.finance`, `guichet.dashboard.refresh` (room `school:{id}:finance`).
3. REST dashboard : `GET /api/v1/finance/dashboard/guichet` (fallback si socket déconnecté).
4. Ne pas s'abonner aux événements dashboard présence — non émis sur cette room.

---

## Recette automatisée

```bash
npm run test:smoke:staging
```

Parcours validé : auth parent + admin → sockets → paiement → webhook → `payment.settled` + `payment.confirmed.admin` + `payment.confirmed.finance`.

| Document | Contenu |
|----------|---------|
| [`README_PLATFORM.md`](./README_PLATFORM.md) | Vue d'ensemble plateforme |
| [`deployment-validation.md`](./deployment-validation.md) | Rapport validation staging |
| [`tests-report.md`](./tests-report.md) | Détail tests unitaires/intégration |
| [`school-payment-profile.md`](./school-payment-profile.md) | Profil règlement KYC multitenant |
| [`flutter-parent-receipt.md`](./flutter-parent-receipt.md) | Reçus sécurisés — PDF, QR, modèles Dart |
| [`receipt-verify.md`](./receipt-verify.md) | PF-VERIFY-v1 — QR, code PF, rôles, pages `/verify` |
| [`staging-deploy.md`](./staging-deploy.md) | Procédure déploiement |
| [`compliance-audit-staging.md`](./compliance-audit-staging.md) | Audit conformité |
