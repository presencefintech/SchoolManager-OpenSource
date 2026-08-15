# Documentation OpenAPI — REST (swagger-docs/)

**Source de vérité** pour l’**app web unique** (admin + finance + superadmin) — trois specs REST + une spec Socket.io.  
Régénérer avant partage collaborateur : `npm run docs:openapi`

| Spec | Fichier | Rôle(s) front | Swagger UI |
|------|---------|---------------|------------|
| **Admin** | `admin.json` | `ADMIN`, `SUPER_ADMIN`, `FINANCE` (lecture) | `/api-docs/admin` |
| **Finance guichet** | `finance.json` | `FINANCE`, `ADMIN` | `/api-docs/finance` |
| **SuperAdmin** | `superadmin.json` | `SUPER_ADMIN` | `/api-docs/superadmin` |
| **Parent mobile** | `parent-mobile.json` | `PARENT` | `/api-docs/parent-mobile` |

> **Cartes remise (août 2026) :** `admin.json` → `/admin/enrollments/{id}/pickup*` et `/admin/pickup/adults/*`. Guide : [`../web-admin-pickup-handoff.md`](../web-admin-pickup-handoff.md) · produit [`../../PICKUP_CARDS.md`](../../PICKUP_CARDS.md).

> **Invitations admin (juil. 2026) :** `POST /admin/invitations/staff/resend` · revoke body `{ targetUserId? | invitationId? }` · staff invite avec `phone` E.164 · parent-code = **1 code / élève**.

> **Notifications (juil. 2026) :** outbox transactionnelle, DLQ admin, fan-out bulk, SMS parent — voir [notification-architecture.md](../notification-architecture.md).

> **Inscription :** schéma `SuperAdminCreateStudentBody` sur `POST /superadmin/enrollment` — voir [enrollment-architecture.md](../enrollment-architecture.md).

> **Dashboard admin :** `DashboardQuickStats` (`GET /admin/stats`, champ `weeklyTrend`) · `HeatmapHourBucket` (`GET /admin/heatmap`) — types TS : [types/dashboard.types.ts](../types/dashboard.types.ts).

> **Structure scolaire :** `GET/POST /admin/structure/sections` · `GET/POST /admin/structure/options` — schémas `SectionRef`, `OptionRef`.

> **Une seule app front** : copier les **3 JSON** dans le repo web. Le login est unique ; le routing UI se fait par `user.role` après `POST /auth/login`.

> **KYC :** `PUT` payment-profile → `admin.json` · `GET` (lecture FINANCE) → aussi dans `finance.json` · `verify`/`reject` → `superadmin.json`. Schémas partagés : `paymentProfileSchemas` dans `scripts/swagger-openapi-shared.js`.

**Compteur ops (août 2026) :** admin **178+** (dont cartes remise `/admin/pickup/*`) · superadmin **112** · finance **40**

> **Admin & SuperAdmin :** une seule spec REST chacun — `admin.json` et `superadmin.json`. Schémas KYC partagés via `scripts/swagger-openapi-shared.js` → `paymentProfileSchemas`.

Helpers partagés : `scripts/swagger-openapi-shared.js` (enums `PaymentMethod` / `PaymentStatus` = `prisma/schema.prisma`)

## Régénération complète

```bash
npm run docs:openapi
```

## Specs complémentaires (non générées par ces scripts)

| Fichier | Rôle | Emplacement front | Swagger UI |
|---------|------|-------------------|------------|
| `openapi/parent-mobile.json` | Parent Flutter | `docs/api-contracts/openapi/` | `/api-docs/parent-mobile` |
| `openapi/admin-sockets.json` | Socket.io admin/finance/parent | `docs/api-contracts/openapi/` | `/api-docs/admin-realtime` |
| `src/docs/openapi-parent-finances.json` | Finances parent (backend) | backend `src/docs/` | `/api-docs/parent-finances` |
| `src/docs/openapi-auth.json` | Auth OTP (backend) | backend `src/docs/` | `/api-docs/auth-mobile` |
| `src/docs/openapi-teacher-mobile.json` | App enseignant | backend `src/docs/` | `/api-docs/teacher-mobile` |

> **Parent :** deux specs REST complémentaires (`openapi-parent-mobile.json` + `openapi-parent-finances.json`) — une seule commande `npm run docs:parent-openapi`, pas de doublon avec les anciens fichiers settings/autogen.

## Déprécié / supprimé

| Fichier | Statut | Remplacé par |
|---------|--------|--------------|
| ~~`src/docs/admin-output.json`~~ | **supprimé** | `swagger-docs/admin.json` |
| ~~`src/docs/openapi-admin-moratorium.json`~~ | **supprimé** | `swagger-docs/admin.json` |
| ~~`src/docs/openapi-admin-attendance-settings.json`~~ | **supprimé** | `swagger-docs/admin.json` |
| ~~`src/docs/web-output.json`~~ | **supprimé** | `swagger-docs/admin.json` + `finance.json` |
| ~~`src/docs/openapi-parent-settings.json`~~ | **supprimé** | `openapi-parent-mobile.json` (`/settings/*`, `/dashboard`) |
| ~~`gestion_profilparent.json`~~ | **supprimé** | `openapi-parent-mobile.json` |
| ~~`auth-output.json`~~ | **supprimé** | `openapi-auth.json` |
| ~~`swagger-output.json`~~ | **supprimé** | specs générées (`docs:*-openapi`) |
| ~~`teacher-output.json`~~ | **supprimé** | `openapi-teacher-mobile.json` |
| ~~`student-academic.swagger.json`~~ | **supprimé** | `openapi-parent-mobile.json` |
| ~~`signatures/`~~ | **supprimé** | `dist/` (build TypeScript) |
| ~~`INDEX.md`**, docs paiement racine (`README_PAYMENT_SERVICE`, etc.) | **supprimés** | `src/docs/README_PLATFORM.md`, `docs/` |

Ne pas utiliser les anciens scripts `swagger:*` (supprimés) — préférer `npm run docs:*-openapi`.
