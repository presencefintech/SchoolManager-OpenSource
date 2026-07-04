# Module Web SuperAdmin

**Préfixe API :** `/api/v1/superadmin/*` (via `modules/web/index.ts`)  
**Rôle :** `SUPER_ADMIN` uniquement  
**Isolation :** accès plateforme multi-écoles — tenant levé

## Domaines principaux

| Domaine | Exemples | Notes |
|---------|----------|-------|
| Core | `GET /core/stats`, `/core/schools` | Dashboard global SaaS |
| Auth & sécurité | `POST /auth/force-logout/{userId}` | Sessions, MFA, invitations |
| Finance plateforme | `GET /finance/report`, `/finance/audit-full/{schoolId}` | BI cross-school |
| **Profil règlement KYC** | `GET/POST /finance/payment-profiles/*` | Validation onboarding école — voir `src/docs/school-payment-profile.md` |
| Fees | `POST /fees/upsert`, `/fees/bulk-apply` | Barèmes et facturation |
| Enrollment | `POST /enrollment`, `/enrollment/{id}/purge` | Inscription forcée (schéma unifié), audit SECURITY, GDPR |
| Students | `GET /students-management/students/{id}/dashboard` | Vue 360° · panel latéral · audit consultation |
| Monitoring | `GET /monitoring/alerts`, `/monitoring/reconciliation` | Santé gateways |
| Mobile Money | `GET /mm/fraud-radar`, `POST /mm/reconcile/{paymentId}` | Réconciliation réseau |
| **Notifications** | `POST /notifications/broadcast`, **`GET /notifications/queue-status`** | Fan-out plateforme · métriques outbox/fanout |

## Documentation

| Spec | Fichier | Swagger UI |
|------|---------|------------|
| **Architecture inscription** | [enrollment-architecture.md](./enrollment-architecture.md) | — |
| **Architecture élèves SuperAdmin** | [students-management-architecture.md](./students-management-architecture.md) | — |
| **Passation KYC / paiements (collègue front)** | [web-admin-payment-handoff.md](./web-admin-payment-handoff.md) | — |
| **REST superadmin (source de vérité)** | [openapi/superadmin.json](./openapi/superadmin.json) | `/api-docs/superadmin` |
| **Notifications outbox / DLQ** | [notification-architecture.md](./notification-architecture.md) | — |
| Temps réel paiements (supervision) | [openapi/admin-sockets.json](./openapi/admin-sockets.json) | `/api-docs/admin-realtime` |

**Régénération REST :** `npm run docs:superadmin-openapi` → `scripts/generate-superadmin-swagger.js` → `swagger-docs/superadmin.json`

Toutes les routes superadmin REST sont documentées **uniquement** dans `swagger-docs/superadmin.json` (`/api-docs/superadmin`).

## Contrats TypeScript (référence)

- [types/enrollment.validation.ts](./types/enrollment.validation.ts) — schémas inscription (admin + super-admin)
- [types/students-management.validation.ts](./types/students-management.validation.ts) — schémas réponses élèves (dashboard, dossier, activité)
- [types/superadmin.validation.ts](./types/superadmin.validation.ts) — schémas Zod requêtes super-admin
- [types/notification.types.ts](./types/notification.types.ts) — DLQ, queue metrics, settings parent SMS
- `Dto/audit.dto.ts`, `Dto/anomaly.dto.ts` — query/body parsing
- `utils/analytics.types.ts` — réponses dashboard analytics
