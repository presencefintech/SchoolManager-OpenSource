# Notifications — contrats API & architecture (juillet 2026)

> **Copie front des contrats** — source backend : `presence-app/backend`  
> **Audit détaillé :** [`../DETTE_NOTIFICATION.md`](../DETTE_NOTIFICATION.md)

## Synthèse

| Couche | Mécanisme |
|--------|-----------|
| Persistance | `NotificationOutbox` + `NotificationDelivery` (transaction SQL) |
| Async | BullMQ `notification-outbox`, `notification-fanout` |
| Mode dégradé | Poller DB 15 s si Redis indisponible |
| SMS parent | Canal actif si `smsNotifications` / `settings.notifications.sms` |
| DLQ | Statut `DEAD` → alerte admin + API retry |

## Routes par rôle

### ADMIN — `openapi/admin.json`

| Méthode | Route | Description |
|---------|-------|-------------|
| POST | `/admin/notifications/broadcast-group` | Annonce par rôles (fan-out si ≥ 3 destinataires) |
| POST | `/admin/notifications/direct` | Message à un utilisateur |
| GET | `/admin/notifications/history` | Historique in-app école |
| GET | `/admin/notifications/dlq` | Livraisons en échec définitif |
| POST | `/admin/notifications/dlq/{deliveryId}/retry` | Relance manuelle |

### SUPER_ADMIN — `openapi/superadmin.json`

| Méthode | Route | Description |
|---------|-------|-------------|
| POST | `/superadmin/notifications/broadcast` | Broadcast plateforme (fan-out) |
| GET | `/superadmin/notifications/queue-status` | Métriques `outbox` + `fanout` |
| GET | `/superadmin/notifications/logs` | Logs in-app global |
| DELETE | `/superadmin/notifications/cleanup` | Purge notifications lues |

### PARENT — `openapi/parent-mobile.json`

| Méthode | Route | Description |
|---------|-------|-------------|
| PATCH | `/settings/notifications` | `email`, `push`, **`sms`** |
| GET | `/notifications` | Liste in-app |

## Temps réel — `openapi/admin-sockets.json`

| Événement | Room | Rôles |
|-----------|------|-------|
| `notification` | `user_{userId}` | ALL (alertes DLQ → admins) |
| `attendance.recorded` | `user_{parentUserId}` | PARENT |

## Types TypeScript front

[`types/notification.types.ts`](./types/notification.types.ts)

## Synchronisation des specs

Depuis le repo **backend** :

```bash
npm run docs:admin-openapi
npm run docs:superadmin-openapi
npm run docs:parent-openapi
```

Puis copier vers le front :

```powershell
Copy-Item backend\swagger-docs\admin.json frontend_web\docs\api-contracts\openapi\
Copy-Item backend\swagger-docs\superadmin.json frontend_web\docs\api-contracts\openapi\
Copy-Item backend\src\docs\openapi-admin.json frontend_web\docs\api-contracts\openapi\admin-sockets.json
Copy-Item backend\src\docs\openapi-parent-mobile.json frontend_web\docs\api-contracts\openapi\
```

## Variables ops (.env backend)

```env
NOTIF_FANOUT_THRESHOLD=3
NOTIF_FANOUT_BATCH_SIZE=25
NOTIF_SMS_MAX_PER_SCHOOL_PER_MIN=30
NOTIF_SMS_PHONE_COOLDOWN_SECONDS=10
```
