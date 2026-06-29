# Presence — Documentation technique de la plateforme

**Version documentaire :** juin 2026  
**Public :** partenaires techniques, équipes d'intégration, investisseurs  
**Périmètre :** backend API, temps réel, sécurité multi-rôles, déploiement staging

---

## Présentation

**Presence** est une plateforme SaaS B2B EdTech conçue pour la gestion scolaire en République Démocratique du Congo et en Afrique centrale. Elle couvre la **présence biométrique**, la **scolarité**, les **paiements multi-canaux** (Mobile Money, banques, cartes) et le **pilotage établissement** en temps réel.

### Architecture globale

La plateforme repose sur une architecture **multi-tenant** : chaque école (`schoolId`) constitue un tenant logique. Les données, les autorisations et les flux temps réel sont isolés par établissement.

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         Clients (Web · Mobile)                          │
│   Parent (Flutter)  ·  Admin / Promoteur  ·  Finance  ·  Super Admin   │
└───────────────┬─────────────────────┬───────────────────┬───────────────┘
                │ REST + JWT          │ Socket.io         │ Webhooks
                ▼                     ▼                   ▼
┌───────────────────────────────────────────────────────────────────────────┐
│                    API Presence — Express / TypeScript                    │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────────┐ │
│  │ Mobile      │  │ Web Admin   │  │ Web Finance │  │ Payment Gateway │ │
│  │ Parent      │  │ + Dashboard │  │ + Compta    │  │ (UBA, MPesa…)   │ │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────────┘ │
│         Policies CASL · FinancePolicy · ParentMobilePolicy              │
└───────────────┬─────────────────────┬───────────────────┬─────────────────┘
                │                     │                   │
                ▼                     ▼                   ▼
         PostgreSQL (Prisma)    Redis (OTP · idempotence)   Jobs CRON
                                BullMQ (présence)           (relances · réconciliation)
```

### Principes de conception

| Principe | Description |
|----------|-------------|
| **Modularité** | Domaines métier séparés : `modules/mobile/parent`, `modules/web/admin`, `modules/web/finance` |
| **Contrats API** | Spécifications OpenAPI 3 par canal (parent, auth, admin) |
| **Event-driven paiement** | Webhook provider → dispatcher → handlers découplés (wallet, email, socket, audit) |
| **Temps réel ciblé** | Rooms Socket.io scopées par rôle et par école — pas de broadcast global métier |

### Index de la documentation

| Document | Contenu |
|----------|---------|
| **[enrollment-architecture.md](./enrollment-architecture.md)** | **Inscription** — schéma unifié, défauts tenant, super-admin vs admin |
| **[admin-business-actions.md](./admin-business-actions.md)** | **Actions métier admin (juin 2026)** — sessions, profil admin, export vérifications, alertes présence |
| **[frontend-integration-guide.md](./frontend-integration-guide.md)** | **Guide équipes Flutter / web** — URLs Render, flux paiement, `serverAmount`, sockets, reçus |
| **[school-payment-profile.md](./school-payment-profile.md)** | **Profil règlement multitenant (KYC)** — admin, superadmin, gate parent |
| **[web-admin-payment-handoff.md](./web-admin-payment-handoff.md)** | **Passation collègue web** — écrans, OpenAPI, message Slack |
| **[flutter-parent-receipt.md](./flutter-parent-receipt.md)** | **Reçus sécurisés** — PDF stream parent, QR verify public, modèles Dart |
| **[flutter-parent-moratorium.md](./flutter-parent-moratorium.md)** | Moratoires parent — policy, demande, UI |
| **[api-coverage.md](./api-coverage.md)** | Matrice de couverture API et événements temps réel par rôle |
| **[staging-deploy.md](./staging-deploy.md)** | Procédure de déploiement staging (migrations, jobs, smoke test) |
| **[deployment-validation.md](./deployment-validation.md)** | Rapport de validation post-déploiement |
| **[compliance-audit-staging.md](./compliance-audit-staging.md)** | Audit conformité OpenAPI · isolation PARENT · policies |
| **[socket-rooms-audit.md](./socket-rooms-audit.md)** | Audit rooms Socket — bandeau état actuel + trace historique |
| **[../../docs/ADR-002-tenant-context.md](../../docs/ADR-002-tenant-context.md)** | Contexte tenant HTTP (`X-Tenant-Id`) & Socket (`auth.tenantId`) |
| **[../../docs/parent-socket-event-catalog-v0.md](../../docs/parent-socket-event-catalog-v0.md)** | Event catalog v0 Socket.io parent (Empire mobile) |
| **[tests-report.md](./tests-report.md)** | Recette technique automatisée (unitaires + intégration) |
| **OpenAPI** | `openapi-auth.json`, `openapi-parent-mobile.json`, **`swagger-docs/admin.json`** (REST), `openapi-admin.json` (Socket.io) |

---

## Sûreté et sécurité

### Modèle de rôles

| Rôle | Périmètre | Accès REST | Accès temps réel |
|------|-----------|------------|----------------|
| **PARENT** | Application mobile — ses enfants liés | `/api/v1/mobile/parents/*` uniquement | `user_{userId}`, `tenant_{tenantId}` |
| **ADMIN** | Promoteur / direction d'établissement | `/api/v1/admin/*` (école) | `school:{id}:control-dashboard`, `school:{id}:finance` (supervision), `admin-monitoring` |
| **FINANCE** | Comptabilité et trésorerie | `/api/v1/admin/finance/*`, `/api/v1/finance/*` | `school:{id}:finance` |
| **SUPER_ADMIN** | Opérations plateforme | Global (bypass isolation tenant) | Identique ADMIN + monitoring global |

### Isolation multi-tenant

- **Contexte tenant (ADR-002) :** middleware global sur `/api/*` résout `X-Tenant-Id` (UUID ou `school-{id}`), fallback `x-school-id` / JWT → `tenantId` UUID pour RLS, logs et rate-limit. Incohérence header/JWT → 403 en prod (`TENANT_ENFORCE_JWT_MATCH`).
- **REST :** chaque requête authentifiée est évaluée par des policies (CASL) avec contexte `schoolId`. Le rôle PARENT ne peut accéder qu'aux ressources de ses enfants ; ADMIN et FINANCE sont limités à leur établissement.
- **Socket.io :** handshake `auth.tenantId` + room `tenant_{uuid}` ; émissions vers `school:{id}:…` passent par une validation `schoolId` (`school-room.util.ts`).
- **Séparation physique des modules :** les routes admin/finance ne sont jamais montées sous le routeur parent mobile.

### Cloisonnement des payloads temps réel (paiements)

| Canal | Événement | Données exposées | Données exclues |
|-------|-----------|------------------|-----------------|
| Parent | `payment.settled` | Montant, élève, reçu, solde restant, provider | Données comptables internes |
| Admin | `payment.confirmed.admin` | Élève, montant, provider, référence, correlationId | Champs comptables sensibles |
| Finance | `payment.confirmed.finance` | Référence transaction, montant, date, statut réconciliation | Nom élève, correlationId, métriques présence |
| Admin | `payment.failed.admin` | Raison échec, provider, correlationId | — |

Le promoteur (ADMIN) rejoint également la room finance pour **superviser les entrées comptables** en tant que chef hiérarchique, sans recevoir les flux opérationnels du dashboard présence dans le canal finance.

### Mesures de sécurité complémentaires

- Authentification JWT sur REST et Socket.io (handshake `auth.token`)
- OTP SMS avec cooldown, rate limiting et fallback mock en staging (`SMS_FORCE_MOCK`)
- Idempotence des webhooks paiement et des émissions socket (`payment_settled_emitted:{paymentId}` en Redis)
- Webhooks provider : validation de signature (désactivable en staging via `*_WEBHOOK_SKIP_VERIFY`)
- Jobs CRON staging : relances de dette filtrées par `DEBT_REMINDER_STUDENT_IDS` pour éviter les envois massifs en recette

---

## Infrastructure et temps réel

### Stack technique

| Composant | Technologie | Rôle |
|-----------|-------------|------|
| API | Node.js · Express · TypeScript | Logique métier, REST, webhooks |
| Persistance | PostgreSQL · Prisma ORM | Données multi-tenant |
| Cache / files | Redis · BullMQ | OTP, idempotence, workers présence |
| Temps réel | Socket.io 4.x | Notifications live par rôle |
| Paiements | Gateway modulaire (UBA, MPesa, Flutterwave, banques RDC) | Initiation, webhook, réconciliation |

### Rooms Socket.io

| Room | Membres | Usage |
|------|---------|-------|
| `user_{userId}` | Tous les utilisateurs connectés | Canal personnel (parent : `payment.settled`, `notification`) |
| `tenant_{tenantId}` | Clients avec `auth.tenantId` résolu | Diffusion future scopée tenant UUID (ADR-002) |
| `school:{id}:control-dashboard` | ADMIN, SUPER_ADMIN | Pilotage ops, paiements confirmés/échoués, inscriptions |
| `school:{id}:finance` | FINANCE · ADMIN (supervision) | Flux comptables temps réel |
| `admin-monitoring` | ADMIN, SUPER_ADMIN | Monitoring global, réconciliation CRON, snapshots dashboard |

### Flux paiement temps réel

```
Provider webhook (SUCCESS)
        │
        ▼
PaymentGatewayService ──► PaymentEventDispatcher
        │
        ├──► Parent   : payment.settled        → user_{parentUserId}
        ├──► Admin    : payment.confirmed.admin → school:{id}:control-dashboard
        ├──► Admin    : payment.failed.admin    → school:{id}:control-dashboard
        └──► Finance  : payment.confirmed.finance → school:{id}:finance
```

**Services modulaires :**

- `modules/mobile/parent/realtime/` — émission parent
- `modules/web/admin/realtime/admin-socket.service.ts` — émission promoteur
- `modules/web/finance/realtime/finance-socket.service.ts` — émission comptable
- `gateway/events/payment-event.handlers.ts` — orchestration (délégation aux modules)

### Webhooks et réconciliation

- **Webhooks entrants :** `POST /api/v1/webhooks/{provider}` — confirmation ou échec provider en temps quasi-réel
- **Réconciliation nocturne :** job CRON 02h00 (Africa/Kinshasa) — vérification auprès des partenaires Mobile Money / banques
- **Relances de dette :** job CRON 08h00 — notifications parents (staging limité aux élèves de test)

### Déploiement staging

La procédure complète est décrite dans **[staging-deploy.md](./staging-deploy.md)** :

1. Migration Prisma (`npm run prisma:deploy`)
2. Build et redémarrage (PM2, systemd ou Docker)
3. Vérification des logs de boot (jobs ENABLED, mode staging)
4. Exécution du smoke test automatisé

Variables clés : voir [`.env.staging.example`](../../.env.staging.example).

---

## Validation

L'ensemble de la chaîne **authentification → paiement → webhook → temps réel multi-rôles** est validé par des **smoke tests automatisés** exécutables en local ou contre l'environnement staging.

### Commande

```bash
npm run test:smoke:staging
```

### Parcours validé (8 étapes)

| # | Étape | Critère de succès |
|---|-------|-------------------|
| 1 | Santé API | `GET /webhooks/health` → UP |
| 2 | Authentification | OTP parent + login admin promoteur |
| 3 | Socket parent | Connexion JWT · room `user_{parentUserId}` |
| 4 | Socket admin | Rooms `control-dashboard` + `finance` |
| 5 | Paiement mobile | `POST /payments/pay` → `paymentId` |
| 6 | Webhook provider | `POST /webhooks/UBA` → CONFIRMED |
| 7 | Temps réel parent | `payment.settled` < 15 s |
| 8 | Temps réel admin/finance | `payment.confirmed.admin` + `payment.confirmed.finance` |

### Couverture tests unitaires et intégration

| Domaine | Tests | Fichiers clés |
|---------|-------|---------------|
| Rooms & isolation `schoolId` | 3 | `config/__tests__/school-room.util.test.ts` |
| Socket admin | 5 | `modules/web/admin/realtime/__tests__/` |
| Socket finance | 3 | `modules/web/finance/realtime/__tests__/` |
| Dispatcher paiement | 3 | `gateway/__tests__/payment-settled.socket.integration.test.ts` |
| Émetteur parent | 3 | `modules/mobile/parent/realtime/__tests__/` |

**Total recette socket :** 14 tests automatisés + smoke test bout-en-bout.

### Statut de validation (juin 2026)

| Composant | Statut |
|-----------|--------|
| OTP / Authentification | Validé |
| Paiement mobile parent | Validé |
| Webhook provider | Validé |
| Socket parent (`payment.settled`) | Validé |
| Socket admin (`payment.confirmed.admin`) | Validé |
| Socket finance (`payment.confirmed.finance`) | Validé |
| Reçus sécurisés (PDF + verify QR) | Validé juin 2026 |
| Profil règlement KYC multitenant | Validé juin 2026 — gate parent + routes admin/superadmin |
| Conformité OpenAPI (auth, parent) | Audité — conforme |
| Isolation rôles PARENT / ADMIN / FINANCE | Audité — conforme |

Détails : **[deployment-validation.md](./deployment-validation.md)** · **[compliance-audit-staging.md](./compliance-audit-staging.md)**.

---

## Démarrage rapide pour un nouveau développeur

1. Lire ce document (**README_PLATFORM.md**) pour la vision d'ensemble.
2. Consulter **[api-coverage.md](./api-coverage.md)** pour les contrats API et Socket par canal.
3. Configurer l'environnement local ou staging via **`.env.staging.example`**.
4. Lancer la recette : `npm run test:smoke:staging`.
5. Approfondir par module :
   - Parent mobile : `src/modules/mobile/parent/README.md`
   - Reçus PDF / QR : **[flutter-parent-receipt.md](./flutter-parent-receipt.md)**
   - Admin web : `src/modules/web/admin/README.md`
   - SMS / OTP : `src/services/sms/README.md`

---

*Documentation maintenue par l'équipe backend Presence. Pour toute question d'intégration partenaire, commencer par ce fichier et la matrice [api-coverage.md](./api-coverage.md).*
