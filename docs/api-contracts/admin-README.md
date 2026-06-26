# Module Web Admin

**Préfixe API :** `/api/v1/admin/*` (via `modules/web/index.ts`)  
**Rôles :** `ADMIN`, `SUPER_ADMIN`, `FINANCE` (selon route)  
**Policy finance :** `FinancePolicy`

## Finance admin (`/admin/finance`)

| Section | Exemples | Rôles |
|---------|----------|-------|
| Reporting BI | `GET /reports/detailed`, `/dashboard/strategic` | ADMIN, SUPER_ADMIN, FINANCE |
| Audit & fraude | `GET /audit/ledger`, `/audit/fraud-alerts` | ADMIN, SUPER_ADMIN, FINANCE |
| Paiements | `GET /payments/pending-verifications` | ADMIN, SUPER_ADMIN, FINANCE |
| Moratoires | `GET/POST /moratoriums/*` | ADMIN, SUPER_ADMIN, FINANCE (lecture) |
| **Profil règlement (KYC)** | `GET/PUT /payment-profile` | ADMIN (écriture), FINANCE (lecture) |
| Fichiers | `POST/DELETE /files/upload`, `/files/delete` | ADMIN, FINANCE |
| Fraude | `POST /fraud/check` | ADMIN |
| Utilisateurs | `POST /users/staff` | ADMIN |
| Notifications | `POST /notifications/broadcast-group`, `/direct` | ADMIN |
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
| **Passation paiements / KYC (collègue front)** | `src/docs/web-admin-payment-handoff.md` | — |
| **REST admin (source de vérité)** | `swagger-docs/admin.json` | `/api-docs/admin` |
| **Profil règlement KYC** | `src/docs/school-payment-profile.md` | — |
| Temps réel Socket.io | `src/docs/openapi-admin.json` | `/api-docs/admin-realtime` |

**Régénération REST :** `npm run docs:admin-openapi` → exécute `scripts/generate-admin-swagger.js`.

Moratoires, profil KYC et modes pointage (`/admin/schools/{schoolId}/attendance-settings`) sont dans `swagger-docs/admin.json`.

## Temps réel (`realtime/`)

| Événement | Room | Service |
|-----------|------|---------|
| `payment.confirmed.admin` | `school:{id}:control-dashboard` | `admin-socket.service.ts` |
| `payment.failed.admin` | `school:{id}:control-dashboard` | `admin-socket.service.ts` |
| `payment.confirmed.finance` | `school:{id}:finance` | `finance-socket.service.ts` (module finance) |

Contrats : `openapi-admin.json` · `gateway/events/payment-event.types.ts`
