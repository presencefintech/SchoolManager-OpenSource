# Dette technique — Notifications & communication parent-école

> **Document de référence** — audit architecture distribuée (juillet 2026)  
> **Périmètre** : notifications présence/absence, invitations parent, OTP, rate limiting passerelles  
> **Backend analysé** : `presence-app/backend`  
> **Frontend (doc)** : `presence-app/frontend_web`

Ce document consolide l'audit réalisé pour valider la capacité de la plateforme à servir sa valeur métier principale : **communication instantanée parents ↔ écoles** (invitations, présences, absences). À consulter avant toute refonte du pipeline notification.

---

## Table des matières

1. [Vue d'ensemble du pipeline actuel](#1-vue-densemble-du-pipeline-actuel)
2. [Scalabilité — 500 parents notifiés simultanément](#2-scalabilité--500-parents-notifiés-simultanément)
3. [Flux invitation parent (Pull vs Push)](#3-flux-invitation-parent-pull-vs-push)
4. [Intégrité présence / atomicité notification](#4-intégrité-présence--atomicité-notification)
5. [Rate limiting passerelles SMS / Email](#5-rate-limiting-passerelles-sms--email)
6. [OTP — fonctionnement actuel](#6-otp--fonctionnement-actuel)
7. [Fichiers clés du codebase](#7-fichiers-clés-du-codebase)
8. [Dettes identifiées (checklist)](#8-dettes-identifiées-checklist)
9. [Architecture cible proposée](#9-architecture-cible-proposée)
10. [Plan d'implémentation priorisé](#10-plan-dimplémentation-priorisé)
11. [Synthèse exécutive](#11-synthèse-exécutive)

---

## 1. Vue d'ensemble du pipeline actuel

### Schéma de flux

```
Scan présence
    │
    ▼
Transaction SQL ──► Presence persistée (commit)
    │
    ▼ (async, hors transaction)
setImmediate → enqueuePresencePostProcess()
    │
    ▼
File BullMQ `presence-processing`
    │  concurrency: 15, limiter: 100 jobs/s, retries: 3
    ▼
PresenceWorker
    ├── Audit seal, cache invalidation, stats
    ├── NotificationService.sendToParents()
    │       │
    │       ▼
    │   File BullMQ `notifications`
    │       │  concurrency: 10, retries: 5, backoff exp. 2s
    │       ▼
    │   NotifWorker → sendInternal()
    │       ├── prisma.notification.create (DB)
    │       ├── Socket.io → parentUserRoom
    │       ├── sendEmail() si emailNotifications
    │       └── PushService si pushNotifications
    │       ✗ SMS : smsNotifications lu mais jamais envoyé
    │
    └── emitPresencePostProcessAttendanceEvent()
            │
            ▼
        ParentAttendanceSocketEmitter
            └── événement `attendance.recorded` (idempotence Redis 24h)
```

### Principe architectural

| Couche | Pattern | Verdict |
|--------|---------|---------|
| Enregistrement présence | **Synchrone**, transaction SQL | ✅ Correct (hot path non bloqué) |
| Post-traitement | **Asynchrone**, BullMQ | ✅ Correct en principe |
| Notification parent | **Asynchrone**, outbox DB + BullMQ | ✅ Outbox transactionnelle (juillet 2026) |
| Temps réel WebSocket | **Push** via Socket.io | ✅ Bien câblé (idempotence) |

**Point clé** : la présence est **commitée avant** toute notification. C'est le bon pattern distribué — mais ce n'est **pas atomique** avec l'envoi SMS/email.

---

## 2. Scalabilité — 500 parents notifiés simultanément

### Composants existants

| Composant | File Redis | Configuration |
|-----------|------------|---------------|
| Post-traitement présence | `presence-processing` | concurrency **15**, limiter **100/s**, **3** retries |
| Envoi notification | `notifications` | concurrency **10**, **5** retries, backoff exponentiel **2 s** |
| Worker démarré au boot | `NotificationService.startWorker()` | dans `server.ts` |

### Scénario : 500 scans quasi simultanés (rentrée)

500 scans → ~500 jobs `presence-processing` → ~500–1000 jobs `notifications` (1–2 parents/élève).

| Effet | Verdict |
|-------|---------|
| Saturation HTTP/API scan | **Protégé** — réponse après commit SQL |
| Saturation Redis/BullMQ | **Partiellement** — files absorbent, mais `Promise.all` sur N× `queue.add()` peut créer un pic CPU Redis |
| Saturation SMTP | **Risque élevé** — pool Nodemailer `maxConnections: 5`, `maxMessages: 100` |
| SMS présence | **Non concerné** — canal SMS **non branché** dans `sendInternal` |

### Failles critiques identifiées

#### F1 — Silence total si Redis indisponible

```typescript
// backend/src/services/notifications.service.ts
private static async enqueue(...) {
  if (!notificationQueue) return;  // ← retour silencieux, aucune notification
}
```

Conséquence : présence en base OK, **zéro notification** sans alerte opérationnelle.

#### F2 — Pas de file dédiée « bulk absence »

Pas de batching, pas de priorité (présence vs marketing vs fraude).

#### F3 — Fan-out non optimisé

`sendToParents` et `sendToUsers` utilisent `Promise.all` sur chaque `enqueue()` individuel — pic Redis sous charge massive.

#### F4 — Goulot SMTP

5 connexions simultanées max → backlog email si 500 parents ont `emailNotifications: true`.

### Verdict scalabilité

Architecture **BullMQ correcte en principe**, mais **pas production-grade** pour un pic massif (500+) sans :
- outbox canal traçable,
- DLQ monitorée,
- rate limit passerelle unifié,
- mode dégradé sans Redis.

---

## 3. Flux invitation parent (Pull vs Push)

### Modèle actuel : **hybride, activation Pull**

| Étape | Mécanisme | Fichier |
|-------|-----------|---------|
| Génération code | Admin → `InvitationService.generateStudentCode()` | `invitation.service.ts` |
| Stockage | `InvitationCode` — `code` **@unique**, expiry **48 h** | `schema.prisma` |
| Invalidation anciens codes | `updateMany` atomique dans transaction | `invitation.service.ts` |
| Livraison | **Push optionnel** (email HTML) **ou** remise manuelle école | `invitation.service.ts` |
| Activation compte | **Pull** — parent saisit téléphone + code + MDP | `activateParentAccess()` |

### Sécurité du code d'invitation

| Contrôle | Implémentation | Évaluation |
|----------|----------------|------------|
| Entropie | 8 caractères, alphabet `23456789ABCDEFGHJKLMNPQRSTUVWXYZ` (~40 bits) | ✅ Acceptable (usage unique + 48 h) |
| Unicité | Contrainte DB `@unique` sur `code` | ✅ |
| Usage unique | `usedById` + transaction atomique | ✅ |
| Rate limit activation | 5 tentatives / 15 min / téléphone (Redis) | ✅ |
| Mot de passe parent | 12 car., complexité (`InvitationUtils.isPasswordRobust`) | ✅ |
| Compte pré-importé | `isActive: false` jusqu'à activation réussie | ✅ |

### Ce qui manque (dette invitation)

| ID | Dette | Impact |
|----|-------|--------|
| INV-1 | Pas de SMS push automatique du code parent (contrairement à l'OTP login) | Onboarding lent |
| INV-2 | Pas de deep link mobile (`presence://activate?code=…`) | UX mobile |
| INV-3 | Email invitation envoyé en fire-and-forget (`.catch()` seulement) | Pas de retry |
| INV-4 | Pas de notification « invitation en attente » si parent a déjà l'app | Engagement |

### Flux staff (référence)

Les invitations staff utilisent un token **haché SHA-256** (`hashResetToken`) — niveau sécurité supérieur au code parent 8 chars. Voir `SECURITY_IDENTITY.md`.

---

## 4. Intégrité présence / atomicité notification

### Séparation intentionnelle (eventual consistency)

```typescript
// backend/src/services/student/student.presence.ts
/** Post-traitement asynchrone (BullMQ) — hors transaction SQL. */
private static enqueuePostProcessJob(...) {
  setImmediate(() => {
    void enqueuePresencePostProcess(payload);
  });
}
```

| Couche | Atomicité | Retry |
|--------|-----------|-------|
| Enregistrement présence | **Oui** (transaction SQL + idempotency key) | N/A |
| Post-process (cache, audit, notif) | **Non** | 3 tentatives → audit `PRESENCE_POST_PROCESS_FAILED` |
| Job notification individuel | **Non** lié à la présence | 5 tentatives BullMQ |

### Canal temps réel (mieux câblé que SMS)

`ParentAttendanceSocketEmitter` :
- Idempotence Redis 24 h (`attendance_recorded_emitted:{presenceId}`)
- Événement catalogué `attendance.recorded`
- Fichier : `backend/src/modules/mobile/parent/realtime/parent-attendance-socket.handler.ts`

### Problèmes d'intégrité notification

#### N1 — Échecs canal non propagés

`sendInternal` utilise `Promise.allSettled(deliveries)` sans relance par canal → le job BullMQ peut être marqué **completed** alors qu'un email a échoué.

#### N2 — `sentAt` jamais renseigné

Champ Prisma `Notification.sentAt` existe (`schema.prisma`) mais **jamais écrit** dans `sendInternal` → pas de statut de livraison exploitable.

#### N3 — Pas de table `NotificationDelivery`

Aucune trace par canal (EMAIL | SMS | PUSH | WEBSOCKET) avec `attempts`, `nextRetryAt`, `providerMessageId`, `lastError`.

#### N4 — SMS présence non opérationnel

```typescript
// backend/src/modules/attendance/notifications/channels/sms-channel.adapter.ts
/** Sprint 0 — délègue à NotificationService (SMS présence câblé en Sprint 1+). */
```

L'adapter existe mais `NotificationService.sendInternal` **ne lit pas `smsNotifications`** pour envoyer un SMS.

#### N5 — Préférence user ignorée pour SMS

```typescript
// sendInternal — smsNotifications récupéré en select mais jamais utilisé
select: { ..., smsNotifications: true }
// Seuls emailNotifications et pushNotifications déclenchent un envoi
```

### Verdict intégrité

Traçabilité **partielle** (audit présence, `EmailLog` pour emails admin), **pas de retry automatique fiable par canal** pour les notifications parent.

---

## 5. Rate limiting passerelles SMS / Email

| Canal | Rate limit actuel | Conforme SaaS ? |
|-------|-------------------|-----------------|
| **OTP SMS** | 5 req / 15 min, cooldown 60 s, 5 verify / 15 min | ✅ Oui |
| **Email admin manuel** | Quota journalier par école (`checkEmailQuota`) | ⚠️ Partiel |
| **Email notification système** | Retry 3× dans `sendEmail`, pool SMTP 5 conn. | ❌ Insuffisant |
| **SMS notification** | **Absent** (non implémenté) | ❌ Non conforme |
| **Push FCM** | Aucun throttle | ⚠️ Dépend batching FCM |

### Risques opérationnels

- **Blacklist opérateurs locaux** (Africa's Talking, etc.) si SMS masse branché sans throttle par école/seconde.
- **Saturation SMTP** : 500 emails simultanés avec 5 connexions → délais importants ou rejet provider.
- **Pas de circuit breaker** sur le provider SMS en cas d'erreurs répétées.

### Fichiers rate limit existants

| Fichier | Rôle |
|---------|------|
| `backend/src/services/sms/otp.service.ts` | Rate limit OTP (référence à réutiliser) |
| `backend/src/middlewares/emailQuota.middleware.ts` | Quota email admin |
| `backend/src/services/email.service.ts` | Pool SMTP + retry interne |

---

## 6. OTP — fonctionnement actuel

L'OTP est un flux **distinct** des notifications présence — dédié au **login parent mobile**.

### Endpoints

```
POST /auth/request-otp  →  OtpService.requestOtp()
POST /auth/verify-otp   →  OtpService.verifyCode() + session AuthService
```

### Contrôles de sécurité

| Contrôle | Valeur | Implémentation |
|----------|--------|----------------|
| Code | 6 chiffres | `crypto.randomInt(100000, 999999)` |
| Stockage | Redis `otp:{phone}` | TTL **5 min** (`OTP_EXPIRY_SECONDS = 300`) |
| Provider SMS | Africa's Talking ou mock | `sms.factory.ts` → `createSmsProvider()` |
| Rate limit demande | 5 / 15 min / téléphone | Redis `otp_limit:{phone}` |
| Cooldown entre demandes | 60 s | Redis `otp_cooldown:{phone}` |
| Rate limit vérification | 5 échecs / 15 min | Redis `otp_verify:{phone}` |
| Comparaison code | Timing-safe | `secureCompare()` |
| Échec envoi SMS | OTP supprimé de Redis | + audit `OTP_SMS_FAILED` |
| Succès login | `phoneVerifiedAt` renseigné | Phase B identité (voir `SECURITY_IDENTITY.md`) |

### Message SMS OTP

```
Votre code de connexion Presence est: {code}. Valide 5 minutes. Ne le partagez pas.
```

### Distinction OTP vs notification présence

| | OTP | Notification présence |
|---|-----|----------------------|
| Pipeline | Direct `OtpService` → `SmsProvider` | BullMQ → `NotificationService` |
| SMS réellement envoyé | ✅ Oui | ❌ Non (préférence ignorée) |
| Rate limit | ✅ Complet | ❌ Absent |
| Retry | Non (échec = nouvelle demande) | BullMQ 5× (mais sans SMS) |

**Conclusion OTP** : seul flux SMS **production-ready** aujourd'hui. L'infrastructure (`sms.factory`, `SmsProvider`, rate limit Redis) doit être **réutilisée** pour les notifications présence.

---

## 7. Fichiers clés du codebase

### Notifications & files

| Fichier | Rôle |
|---------|------|
| `backend/src/services/notifications.service.ts` | Queue `notifications`, worker, `sendInternal`, fan-out |
| `backend/src/modules/presence/queues/presence.queue.ts` | Queue `presence-processing`, enqueue post-process |
| `backend/src/modules/presence/queues/presence.worker.ts` | Worker présence → `sendToParents` |
| `backend/src/services/student/student.presence.ts` | Commit SQL + enqueue async |
| `backend/src/services/email.service.ts` | SMTP, pool, retry |
| `backend/src/services/push.service.ts` | FCM push |
| `backend/src/config/redis.ts` | `redisEnabled`, connexion BullMQ |

### Attendance / adapters (préparés, SMS non câblé)

| Fichier | Rôle |
|---------|------|
| `backend/src/modules/attendance/notifications/channels/sms-channel.adapter.ts` | Adapter SMS (Sprint 1+ commenté) |
| `backend/src/modules/attendance/notifications/channels/` | Autres canaux (email, push, websocket) |
| `backend/src/modules/attendance/events/attendance-event.emitter.ts` | Émission événements post-présence |

### Temps réel parent

| Fichier | Rôle |
|---------|------|
| `backend/src/modules/mobile/parent/realtime/parent-attendance-socket.handler.ts` | Push `attendance.recorded`, idempotence 24 h |
| `backend/src/modules/mobile/parent/realtime/parent-socket.service.ts` | Rooms Socket.io parent |

### Invitation & OTP

| Fichier | Rôle |
|---------|------|
| `backend/src/services/invitation.service.ts` | Codes parent, activation, staff invitations |
| `backend/src/utils/invitation.utils.ts` | Génération code crypto, templates email |
| `backend/src/services/sms/otp.service.ts` | OTP login parent |
| `backend/src/services/sms/sms.factory.ts` | Provider SMS (Africa's Talking / mock) |

### Rate limit & quotas

| Fichier | Rôle |
|---------|------|
| `backend/src/middlewares/emailQuota.middleware.ts` | Quota email admin par école |
| `backend/src/services/sms/otp.service.ts` | Rate limit OTP (modèle à généraliser) |

### Schéma Prisma (champs pertinents)

```prisma
model Notification {
  // ...
  sentAt    DateTime?   // ← existe, jamais renseigné en code
}

model InvitationCode {
  code      String   @unique
  expiresAt DateTime
  usedById  Int?
}

model User {
  emailNotifications  Boolean
  pushNotifications   Boolean
  smsNotifications    Boolean   // ← lu mais SMS non envoyé
  phoneVerifiedAt     DateTime? // ← renseigné après OTP réussi
}
```

---

## 8. Dettes identifiées (checklist)

Cocher au fur et à mesure de la résolution.

> **Implémenté (juillet 2026)** — migration `20260704150000_notification_outbox`  
> Code : `backend/src/services/notifications/` + `backend/src/jobs/notification-outbox.poller.ts`  
> DLQ : `notification-dlq.service.ts` + `notification-dlq.poller.ts`  
> Fan-out : `notification-fanout.queue.ts` (file BullMQ `notification-fanout`)

### P0 — Bloquant valeur métier

- [x] **NOTIF-P0-1** : Ne plus silencier `enqueue()` si Redis down → fallback outbox DB + poller 15 s
- [x] **NOTIF-P0-2** : Brancher SMS dans delivery worker via `sms.factory` + respect `smsNotifications`
- [x] **NOTIF-P0-3** : Rate limit SMS notification (`NOTIF_SMS_MAX_PER_SCHOOL_PER_MIN`, cooldown téléphone)

### P1 — Traçabilité & retry fiable

- [x] **NOTIF-P1-1** : Table `NotificationOutbox` + `NotificationDelivery`
- [x] **NOTIF-P1-2** : Renseigner `Notification.sentAt` à la livraison SMS confirmée
- [x] **NOTIF-P1-3** : Échec job si canal critique (SMS/EMAIL) échoue → retry BullMQ + poller DB
- [x] **NOTIF-P1-4** : DLQ monitorée + alerte admin (`dlqAlertedAt`, poller 2 min, API admin `/dlq`)

### P2 — Scalabilité & UX

- [x] **NOTIF-P2-1** : File `notification-fanout` BullMQ + batch outbox 25 (seuil ≥ 3 destinataires)
- [ ] **NOTIF-P2-2** : Throttle SMTP global (éviter blacklist)
- [ ] **NOTIF-P2-3** : Circuit breaker provider SMS
- [ ] **INV-P2-1** : SMS invitation parent (push code à l'activation admin)
- [ ] **INV-P2-2** : Deep link mobile activation

### P3 — Observabilité

- [ ] **NOTIF-P3-1** : Métriques Prometheus : jobs en queue, latence delivery, taux échec par canal
- [ ] **NOTIF-P3-2** : Dashboard admin « état livraison notifications » (par école)

---

## 9. Architecture cible proposée

### Structure de service recommandée

```
backend/src/services/notifications/
├── notification-orchestrator.service.ts   # Point d'entrée unique
├── notification-outbox.repository.ts      # Persistance avant envoi
├── queues/
│   ├── notification-fanout.queue.ts       # 1 job → N destinataires (batch)
│   ├── notification-delivery.queue.ts   # 1 job → 1 user × 1 canal
│   └── workers/
│       ├── fanout.worker.ts
│       ├── email-delivery.worker.ts       # rate limit SMTP
│       ├── sms-delivery.worker.ts         # rate limit Africa's Talking
│       └── push-delivery.worker.ts
├── channels/
│   ├── email.channel.ts
│   ├── sms.channel.ts                     # réutilise sms.factory
│   ├── push.channel.ts
│   └── websocket.channel.ts
├── policies/
│   ├── channel-router.ts                  # prefs user + type notif
│   └── rate-limit.policy.ts               # par école, canal, fenêtre
└── types/
    └── delivery-status.enum.ts
```

### Modèle Prisma suggéré

```prisma
enum OutboxStatus {
  PENDING
  PROCESSING
  DONE
  FAILED
}

enum DeliveryStatus {
  PENDING
  SENT
  FAILED
  DEAD
}

model NotificationOutbox {
  id            String   @id @default(cuid())
  schoolId      Int
  userId        Int
  studentId     Int?
  type          NotificationType
  payload       Json
  status        OutboxStatus
  correlationId String   // presenceId, paymentId, invitationId…
  createdAt     DateTime @default(now())
  deliveries    NotificationDelivery[]
}

model NotificationDelivery {
  id           String         @id @default(cuid())
  outboxId     String
  channel      String         // EMAIL | SMS | PUSH | WEBSOCKET
  status       DeliveryStatus
  attempts     Int            @default(0)
  nextRetryAt  DateTime?
  providerRef  String?
  lastError    String?
  sentAt       DateTime?
}
```

### Flux cible (500 absences)

```
1. Scan → commit présence (inchangé)
2. Fan-out job unique par événement (correlationId = presenceId)
   → crée N lignes NotificationOutbox
3. Delivery workers par canal avec limiter BullMQ
   ex. SMS : 10/s/école, email : 5/s global
4. Échec canal → retry exponentiel + DLQ + alerte si DEAD
5. Fallback sans Redis : outbox DB + cron NotificationDispatcher
```

---

## 10. Plan d'implémentation priorisé

| Priorité | Action | Effort estimé | Impact |
|----------|--------|---------------|--------|
| **P0** | Outbox DB fallback si Redis down | M | Fiabilité critique |
| **P0** | SMS delivery worker + rate limit | M | Parents sans smartphone |
| **P1** | `NotificationDelivery` + statuts | M | Traçabilité ops |
| **P1** | Échec job si email critique échoue | S | Retry fiable |
| **P2** | Fan-out queue bulk absences | L | Scalabilité 500+ |
| **P2** | SMS invitation parent | S | Onboarding |
| **P3** | Métriques + dashboard livraison | L | Observabilité SaaS |

---

## 11. Synthèse exécutive

| Question | Réponse |
|----------|---------|
| **500 notifs simultanées ?** | Outbox + **fan-out** BullMQ, rate limit SMS — goulot SMTP restant |
| **Atomicité présence/notif ?** | Présence **forte**, notification **outbox** + retry par canal |
| **Rate limit SaaS ?** | OTP **oui**, SMS notif **oui** (école/min + cooldown tel) |
| **OTP ?** | Login parent ; infra SMS réutilisée pour notifications présence |

### Verdict global (post-implémentation juillet 2026)

Pipeline **production-ready** pour MVP à grande communauté : outbox, SMS, DLQ, fan-out. Reste : throttle SMTP global (P2-2), dashboard DLQ frontend (P3-2).

---

## 12. Contrats API & Swagger (par rôle)

| Rôle | Spec OpenAPI | Routes / événements clés | Régénération |
|------|--------------|--------------------------|--------------|
| **ADMIN** | `backend/swagger-docs/admin.json` | `POST /admin/notifications/broadcast-group`, `/direct`, `GET /history`, **`GET /dlq`**, **`POST /dlq/{deliveryId}/retry`** | `npm run docs:admin-openapi` |
| **SUPER_ADMIN** | `backend/swagger-docs/superadmin.json` | `POST /notifications/broadcast` (fan-out plateforme), **`GET /notifications/queue-status`** (outbox + fanout) | `npm run docs:superadmin-openapi` |
| **PARENT** | `backend/src/docs/openapi-parent-mobile.json` | `PATCH /settings/notifications` (`sms`, `push`, `email`), socket `notification`, `attendance.recorded` | `npm run docs:parent-openapi` |
| **ADMIN/FINANCE** (temps réel) | `backend/src/docs/openapi-admin.json` | Socket `notification` sur `user_{userId}` (alertes DLQ) | manuel |

### Variables d'environnement (doc ops)

```env
NOTIF_FANOUT_THRESHOLD=3
NOTIF_FANOUT_BATCH_SIZE=25
NOTIF_SMS_MAX_PER_SCHOOL_PER_MIN=30
NOTIF_SMS_PHONE_COOLDOWN_SECONDS=10
```

### Migrations DB

```bash
cd backend
npm run prisma:deploy:local   # Docker local
# ou npm run prisma:deploy     # cloud DATABASE_URL
```

---

## Documents liés

- [`api-contracts/notification-architecture.md`](./api-contracts/notification-architecture.md) — contrats OpenAPI front (copie specs)
- [`api-contracts/types/notification.types.ts`](./api-contracts/types/notification.types.ts) — types TS front
- [`SECURITY_IDENTITY.md`](./SECURITY_IDENTITY.md) — audit identité, email verify, OTP `phoneVerifiedAt`, invitations staff
- [`ADMIN_PRESENCE_INTEGRATION.md`](./ADMIN_PRESENCE_INTEGRATION.md) — intégration présence côté admin
- [`FINANCE_WORK_GUIDE.md`](./FINANCE_WORK_GUIDE.md) — module finance (hors périmètre notification)

---

*Dernière mise à jour : juillet 2026 — audit architecture distribuée notifications parent-école.*
