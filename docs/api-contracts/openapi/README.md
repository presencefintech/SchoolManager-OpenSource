# Documentation OpenAPI — REST (swagger-docs/)

**Source de vérité** pour l’**app web unique** (admin + finance + superadmin) — trois specs REST + une spec Socket.io.  
Régénérer avant partage collaborateur : `npm run docs:openapi`

| Spec | Fichier | Rôle(s) front | Swagger UI |
|------|---------|---------------|------------|
| **Admin** | `admin.json` | `ADMIN`, `SUPER_ADMIN`, `FINANCE` (lecture) | `/api-docs/admin` |
| **Finance guichet** | `finance.json` | `FINANCE`, `ADMIN` | `/api-docs/finance` |
| **SuperAdmin** | `superadmin.json` | `SUPER_ADMIN` | `/api-docs/superadmin` |

> **Inscription :** schéma `SuperAdminCreateStudentBody` sur `POST /superadmin/enrollment` — voir [enrollment-architecture.md](../enrollment-architecture.md).

> **Dashboard admin :** `DashboardQuickStats` (`GET /admin/stats`, champ `weeklyTrend`) · `HeatmapHourBucket` (`GET /admin/heatmap`) — types TS : [types/dashboard.types.ts](../types/dashboard.types.ts).

> **Structure scolaire :** `GET/POST /admin/structure/sections` · `GET/POST /admin/structure/options` — schémas `SectionRef`, `OptionRef`.

> **Une seule app front** : copier les **3 JSON** dans le repo web. Le login est unique ; le routing UI se fait par `user.role` après `POST /auth/login`.

> **KYC :** `PUT` payment-profile → `admin.json` · `GET` (lecture FINANCE) → aussi dans `finance.json` · `verify`/`reject` → `superadmin.json`. Schémas partagés : `paymentProfileSchemas` dans `scripts/swagger-openapi-shared.js`.

**Compteur ops (juin 2026) :** admin **136** · superadmin **112** · finance **40**

> **Admin & SuperAdmin :** une seule spec REST chacun — `admin.json` et `superadmin.json`. Schémas KYC partagés via `scripts/swagger-openapi-shared.js` → `paymentProfileSchemas`.

Helpers partagés : `scripts/swagger-openapi-shared.js` (enums `PaymentMethod` / `PaymentStatus` = `prisma/schema.prisma`)

## Régénération complète

```bash
npm run docs:openapi
```

## Specs complémentaires (non générées par ces scripts)

| Fichier | Rôle | Script | Commande npm | Swagger UI |
|---------|------|--------|--------------|------------|
| `src/docs/openapi-parent-mobile.json` | Parent Flutter (hors finances + sockets) | `scripts/build-parent-openapi-docs.mjs` | `docs:parent-openapi` | `/api-docs/parent-mobile` |
| `src/docs/openapi-parent-finances.json` | Finances & paiements parent | `scripts/build-parent-openapi-docs.mjs` | `docs:parent-openapi` | `/api-docs/parent-finances` |
| `src/docs/openapi-auth.json` | Auth parent / OTP | `scripts/build-parent-openapi-docs.mjs` | `docs:parent-openapi` | `/api-docs/auth-mobile` |
| `src/docs/openapi-teacher-mobile.json` | App enseignant | `scripts/build-teacher-openapi-docs.mjs` | `docs:teacher-openapi` | `/api-docs/teacher-mobile` |
| `src/docs/openapi-admin.json` | Socket.io temps réel (admin + finance) | — | — | `/api-docs/admin-realtime` |

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
