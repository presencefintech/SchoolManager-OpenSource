# Module Web Admin

**Préfixe API :** `/api/v1/admin/*` (via `modules/web/index.ts`)  
**Rôles :** `ADMIN`, `SUPER_ADMIN`, `FINANCE` (selon route)  
**Policy finance :** `FinancePolicy`

## Finance admin (`/admin/finance`)

| Section | Exemples | Rôles |
|---------|----------|-------|
| Reporting BI | `GET /reports/detailed`, `/dashboard/strategic` | ADMIN, SUPER_ADMIN, FINANCE |
| Audit & fraude | `GET /audit/ledger`, `/audit/fraud-alerts` | ADMIN, SUPER_ADMIN, FINANCE |
| Paiements | `GET /payments/pending-verifications`, export CSV, mark-processed | ADMIN, SUPER_ADMIN, FINANCE |
| Moratoires | `GET/POST /moratoriums/*` | ADMIN, SUPER_ADMIN, FINANCE (lecture) |
| **Profil règlement (KYC)** | `GET/PUT /payment-profile` | ADMIN (écriture), FINANCE (lecture) |
| Fichiers | `POST/DELETE /files/upload`, `/files/delete` | ADMIN, FINANCE |
| Fraude | `POST /fraud/check` | ADMIN |
| Utilisateurs | `POST /users/staff` | ADMIN |
| Notifications | `POST /notifications/broadcast-group`, `/direct`, `GET /history`, **`GET /dlq`**, **`POST /dlq/{deliveryId}/retry`** | ADMIN |
| PDF / reçus | `GET /pdf/receipts/{paymentId}` | ADMIN |
| Sanctions | `POST /sanctions/analyze` | ADMIN, SUPER_ADMIN |
| Médias (Cloudinary) | `POST /cloudinary/students/{id}/photo` | ADMIN, SUPER_ADMIN |
| Emails | `POST /emails/send-template` | ADMIN, SUPER_ADMIN |

**Stack de sécurité :** `requireAuth` → `securityRateLimiter` → `setSchoolContext` → `securityShield` → `permitRoles` → `authorize(FinancePolicy)`.

## Isolation

- **ADMIN / FINANCE :** cloisonnés par `schoolId` (RLS policy).
- **SUPER_ADMIN :** `FinancePolicy.can('manage', 'all')` + bypass isolation dans `BasePolicy`.
- **PARENT :** aucune route de ce module — accès refusé par `permitRoles`.

## Documentation

| Spec | Fichier | Swagger UI |
|------|---------|------------|
| **Passation paiements / KYC (collègue front)** | `web-admin-payment-handoff.md` | — |
| **Actions métier admin (juin 2026)** | `admin-business-actions.md` | — |
| **REST admin (source de vérité)** | `openapi/admin.json` | `/api-docs/admin` |
| **Profil règlement KYC** | `src/docs/school-payment-profile.md` | — |
| Temps réel Socket.io | `src/docs/openapi-admin.json` | `/api-docs/admin-realtime` |

**Régénération REST :** `npm run docs:admin-openapi` → exécute `scripts/generate-admin-swagger.js`.

Moratoires, profil KYC, modes pointage et **notifications outbox/DLQ** sont dans `openapi/admin.json`.

**Architecture notifications (juil. 2026) :** [notification-architecture.md](./notification-architecture.md) · types [types/notification.types.ts](./types/notification.types.ts)

## Dashboard & analytics (`/admin/stats`, `/admin/heatmap`, …)

| Route | Description | Schéma OpenAPI |
|-------|-------------|----------------|
| `GET /admin/stats` | KPIs présence du jour + **`weeklyTrend`** (7 jours) | `DashboardQuickStats` |
| `GET /admin/heatmap` | Scans horaires (jour courant) | `HeatmapHourBucket[]` |
| `GET /admin/live-feed` | Flux présence paginé (refresh 15s côté UI) | pagination + entries |
| `GET /admin/fraud-alerts` | Alertes fraude actives | array |
| `GET /admin/dashboard/stats` | Santé système (workers, pipeline) | `ControlDashboardStats` |

**Types front :** `docs/api-contracts/types/dashboard.types.ts` · implémentation `src/types/admin.ts` · hooks `useAdminStats`, `useHeatmap`, `useLiveFeed`.

## Structure scolaire (`/admin/structure`)

| Route | Description |
|-------|-------------|
| `GET/POST /admin/structure/sections` | Sections (ex. Secondaire, Primaire) |
| `GET/POST /admin/structure/options?sectionId=` | Options par section (ex. Scientifique) |

Utilisé par le formulaire d'inscription admin (cascade Section → Option → Classe). Création de classe : `POST /admin/classes` requiert `sectionId`, `optionId`, `academicYear`.

## Temps réel (`realtime/`)

| Événement | Room | Service |
|-----------|------|---------|
| `payment.confirmed.admin` | `school:{id}:control-dashboard` | `admin-socket.service.ts` |
| `payment.failed.admin` | `school:{id}:control-dashboard` | `admin-socket.service.ts` |
| `payment.confirmed.finance` | `school:{id}:finance` | `finance-socket.service.ts` (module finance) |
| `notification` | `user_{userId}` | Worker outbox WEBSOCKET (alertes DLQ admin) |

Contrats : `openapi/admin-sockets.json` · `gateway/events/payment-event.types.ts`
