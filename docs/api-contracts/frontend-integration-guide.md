# Guide d'intégration Frontend — Presence

**Public :** équipes Flutter (parent), React/Vue (admin / finance)  
**Dernière mise à jour :** 26 juin 2026  
**Backend production (Render) :** `https://gestion-presence-et-paiement-mobile.onrender.com`

> **Collègue web (admin / superadmin / finance) :** pack de passation dédié → **[web-admin-payment-handoff.md](./web-admin-payment-handoff.md)** (message Slack copiable + écrans + OpenAPI).

---

## 1. URLs et environnements

| Environnement | API REST | Socket.io |
|---------------|----------|-----------|
| **Production** | `https://gestion-presence-et-paiement-mobile.onrender.com/api/v1` | même host (sans `/api/v1`) |
| **Local** | `http://127.0.0.1:5000/api/v1` | `http://127.0.0.1:5000` |
| **Local (téléphone même Wi‑Fi)** | `http://<IP-LAN-PC>:5000/api/v1` | `http://<IP-LAN-PC>:5000` |
| **Émulateur Android** | `http://10.0.2.2:5000/api/v1` | `http://10.0.2.2:5000` |

### Brancher l’app mobile parent existante (Flutter)

1. **Backend** : copier `.env.mobile-dev.example` → compléter `.env` (FLW clés TEST, `APP_PUBLIC_URL` = IP LAN)
2. **Démarrer** : `npm run dev:local` → noter les URLs affichées au boot (`API parent mobile`)
3. **Vérifier** : `npm run mobile:dev-check` (login parent + catalogue FLUTTERWAVE)
4. **Dans Flutter** — constantes typiques :

```dart
static const apiBaseUrl = 'http://192.168.1.42:5000/api/v1';
static const socketUrl = 'http://192.168.1.42:5000';
// Préfixe routes parent : /mobile/parents
```

5. **Paiement carte** : `method: "CARD"`, `provider: "FLUTTERWAVE"` → ouvrir `redirectUrl` en WebView
6. **Webhook FLW** (confirmation auto) : URL publique HTTPS obligatoire  
   `ngrok http 5000` → dashboard Flutterwave →  
   `https://xxxx.ngrok-free.app/api/v1/payments/webhook/FLUTTERWAVE`  
   Dev sans ngrok : `FLW_WEBHOOK_SKIP_VERIFY=true` + `npm run test:flw-webhook -- <providerRef>`

**Deep link retour checkout :** `FLW_REDIRECT_URL=presence://payment/success` (schéma de votre app).

### Préfixes par application

| App | Préfixe | Rôle JWT |
|-----|---------|----------|
| **Parent mobile** | `/api/v1/mobile/parents` | `PARENT` |
| **Auth (OTP / login)** | `/api/v1/auth` | — |
| **Payment Intent (2 étapes)** | `/api/v1/mobile/parents/finance` ou `/api/v1/finance` | `PARENT` |
| **Admin web** | `/api/v1/admin/*` | `ADMIN`, `SUPER_ADMIN` |
| **Finance web** | `/api/v1/admin/finance/*`, `/api/v1/finance/*` | `ADMIN`, `FINANCE` |

### Admin web — Dashboard (`/admin/dashboard`)

Page : `src/app/(admin)/admin/dashboard` · contrat : **`types/dashboard.types.ts`**

| Hook | API | Refresh |
|------|-----|---------|
| `useAdminStats()` | `GET /admin/stats` | 60s |
| `useLiveFeed()` | `GET /admin/live-feed?limit=25` | 15s |
| `useHeatmap()` | `GET /admin/heatmap` | cache 5 min |
| `useFraudAlerts()` | `GET /admin/fraud-alerts` | 60s |
| `useControlStats()` | `GET /admin/dashboard/stats` | 30s |
| `useClasses()` | `GET /admin/classes?limit=100` | 60s |

**Champ clé juin 2026 :** `data.weeklyTrend[]` sur `/admin/stats` — `{ date, label, present, rate }` pour le graphique tendance 7 jours.

**Auth :** refresh automatique sur 401 via `POST /auth/refresh-token` (`src/lib/api/client.ts`).

**Structure inscription :** `GET/POST /admin/structure/sections` · `GET/POST /admin/structure/options?sectionId=` — voir `admin-README.md` § Structure scolaire.

**Swagger / OpenAPI :**

- **Web admin / finance :** **[web-admin-payment-handoff.md](./web-admin-payment-handoff.md)** · `swagger-docs/admin.json` · `/api-docs/admin`
- **Web superadmin :** `swagger-docs/superadmin.json` · `/api-docs/superadmin`
- **Flutter :** [`flutter-parent-guide.md`](./flutter-parent-guide.md) · [`flutter-parent-moratorium.md`](./flutter-parent-moratorium.md) · [`FLUTTER_AI_PROMPT.md`](./FLUTTER_AI_PROMPT.md)
- Parent : `src/docs/openapi-parent-finances.json` (+ `openapi-parent-mobile.json`)
- Auth : `src/docs/openapi-auth.json`
- Admin temps réel : `src/docs/openapi-admin.json`

---

## 2. Authentification parent (Flutter)

### Flux OTP (production)

```
POST /api/v1/auth/request-otp   { phone, schoolId }
POST /api/v1/auth/verify-otp    { phone, code, schoolId }
→ JWT dans response.token
```

### Flux mot de passe (recette / debug)

```
POST /api/v1/auth/login   { identifier, password }
```

Header sur toutes les requêtes protégées :

```http
Authorization: Bearer <JWT>
X-Tenant-Id: <tenant-uuid>
```

Optionnel : `X-Correlation-Id: <uuid>` (paiements / traçabilité).

### Control Plane — tenant UUID (après login)

```http
GET /api/v1/mobile/parents/control-plane/tenant/config?schoolId=1
Authorization: Bearer <JWT>
```

Mettre en cache `data.tenant.id` (~1 h) et l’envoyer sur chaque requête REST (`X-Tenant-Id`) et au handshake Socket (`auth.tenantId`). Détail : [`docs/ADR-002-tenant-context.md`](../../docs/ADR-002-tenant-context.md).

### Socket.io

```dart
// Pseudo-code Flutter
final socket = io(
  'https://gestion-presence-et-paiement-mobile.onrender.com',
  OptionBuilder()
    .setAuth({
      'token': jwt,
      'tenantId': cachedTenantUuid,
    })
    .setTransports(['websocket'])
    .build(),
);
socket.on('payment.settled', (data) => ...);
```

Rooms automatiques : `user_{parentUserId}` · `tenant_{tenantId}` (si tenant résolu).

---

## 3. Paiements — règle de sécurité montant (obligatoire)

> **Le montant affiché ou saisi côté client n'est jamais la source de vérité.**

Le serveur résout le montant depuis le **barème** (`FeeStructure`) ou une **PaymentIntent** existante. Un client qui envoie `amount: 0.01` sera ignoré ; le paiement est créé au montant du barème.

| Champ client | Statut | Rôle frontend |
|--------------|--------|----------------|
| `feeStructureId` | **Requis** | Identifiant du barème choisi par le parent |
| `amount` | **Déprécié** | Affichage UI seulement — ne pas faire confiance à la réponse si différent |
| `serverAmount` (réponse) | **Source de vérité UI** | Montant réellement appliqué par le serveur |
| `idempotencyKey` | **Requis** | UUID unique par tentative de paiement |

### Flag serveur (info)

`PAYMENT_STRICT_AMOUNT=true` en production renforce le rejet des paiements admin sans `feeStructureId`. Le mobile parent est déjà sécurisé via `PaymentIntent`.

`PAYMENT_ONLINE_SKIP_KYC=true` (**dev uniquement**) désactive le blocage parent si le profil de règlement n’est pas `VERIFIED`.

---

## 3bis. Profil de règlement multitenant (KYC) — juin 2026

Chaque école doit configurer **une fois** son compte de règlement avant que les parents puissent payer en ligne.

> **Guide complet collabo :** [`school-payment-profile.md`](./school-payment-profile.md)

### Rôles

| Rôle | Action |
|------|--------|
| **Admin école** | `PUT /api/v1/admin/finance/payment-profile` (RIB, banque, contacts) |
| **Superadmin (proprio SaaS)** | `POST /api/v1/superadmin/finance/payment-profiles/:schoolId/verify` |
| **Parent mobile** | Lit `online_enabled` — ne configure jamais de RIB |

### Tenant config — champs ajoutés

```json
"features": {
  "payments": {
    "flutterwave": true,
    "mobile_money": true,
    "online_enabled": false,
    "kyc_status": "NOT_CONFIGURED"
  }
}
```

**Flutter :** masquer le bouton « Payer en ligne » si `online_enabled === false`.

### Erreurs gate parent (`POST /payments/pay`)

| `errorCode` | UI suggérée |
|-------------|-------------|
| `PAYMENT_PROFILE_NOT_CONFIGURED` | « Paiement en ligne non encore activé pour cette école » |
| `PAYMENT_PROFILE_PENDING_KYC` | « Validation du compte école en cours » |
| `PAYMENT_PROFILE_REJECTED` | « Contactez le secrétariat de l’école » |
| `PAYMENT_PROVIDER_NOT_ALLOWED` | « Méthode non disponible » — recharger `GET /payments/methods` |

Le **guichet** (cash, confirmation manuelle) reste disponible sans profil KYC.

---

### Étape A — Lister les barèmes

```http
GET /api/v1/mobile/parents/students/{studentId}/fee-structures
Authorization: Bearer <JWT>
```

**Réponse `data` (extrait) :**

```json
{
  "session": { "id": 1, "label": "2025-2026" },
  "feeStructures": [
    {
      "id": 4,
      "amount": 50,
      "label": "Frais scolaires",
      "categoryName": "Scolarité",
      "description": "..."
    }
  ],
  "defaultFeeStructureId": 4
}
```

**UI :** afficher `amount` du barème sélectionné. Conserver `id` → `feeStructureId`.

### Étape B — Initier le paiement

**Option 1 — Legacy (un seul appel, compatible Flutter actuel)**

```http
POST /api/v1/mobile/parents/payments/pay
Content-Type: application/json

{
  "studentId": 3,
  "feeStructureId": 4,
  "method": "CARD",
  "provider": "FLUTTERWAVE",
  "idempotencyKey": "550e8400-e29b-41d4-a716-446655440000",
  "channel": "PARENT_MOBILE_APP"
}
```

**Flutterwave sandbox (backend local) :**

1. `.env` : `FLW_SECRET_KEY=FLWSECK_TEST-...`, `FLW_WEBHOOK_SKIP_VERIFY=true`, `FLW_REDIRECT_URL=...`
2. `npm run dev:local` + `npm run seed:smoke-student`
3. `npm run test:parent-flw-sandbox` → ouvrir `redirectUrl` dans le navigateur
4. Après paiement : webhook FLW ou `npm run test:flw-webhook -- <providerRef>`

Exemple banque UBA (legacy) :

```http
POST /api/v1/mobile/parents/payments/pay
Content-Type: application/json

{
  "studentId": 3,
  "feeStructureId": 4,
  "method": "BANK",
  "provider": "UBA",
  "idempotencyKey": "550e8400-e29b-41d4-a716-446655440000",
  "phone": "+243810000000",
  "currency": "USD",
  "channel": "PARENT_MOBILE_APP"
}
```

> `amount` est **optionnel** et ignoré si différent du barème.

**Réponse 201 `data` (champs clés) :**

```json
{
  "paymentId": 12,
  "reference": "INT-...",
  "status": "PENDING",
  "provider": "UBA",
  "providerRef": "UBA_...",
  "nextStep": "REDIRECT_TO_BANK",
  "serverAmount": 50,
  "currency": "USD",
  "risk": "LOW",
  "correlationId": "pay-..."
}
```

**Option 2 — Payment Intent (2 étapes, recommandé long terme)**

```http
# 1. Créer l'intention (montant figé serveur)
POST /api/v1/mobile/parents/finance/intents
{ "studentId": 3, "feeStructureId": 4, "idempotencyKey": "..." }

# 2. Exécuter gateway (sans montant)
POST /api/v1/mobile/parents/finance/intents/{intentId}/execute
{ "method": "BANK", "gateway": "UBA", "phone": "+243..." }
```

### Étape C — Catalogue providers

```http
GET /api/v1/mobile/parents/payments/methods
```

Utiliser `data.banks`, `data.mobileMoney`, `data.recommended.bank` et **`data.recommended.card`** (`FLUTTERWAVE`) pour les pickers UI.

### Étape D — Suivi du paiement

Interpréter `nextStep` :

| `nextStep` | Action UI |
|------------|-----------|
| `REDIRECT_TO_BANK` | WebView banque |
| `REDIRECT_TO_PROVIDER` | Ouvrir `redirectUrl` |
| `WAITING_FOR_PROVIDER` / `PROCESSING` | Polling |
| `COMPLETE` | Écran succès + reçu |
| `FAILED` | Erreur + réessai |

Polling :

```http
GET /api/v1/mobile/parents/payments/{paymentId}
```

Ou attendre l'événement socket `payment.settled` (confirmation webhook).

### Étape E — Confirmation temps réel

Événement `payment.settled` (schéma `PaymentSettledEvent` dans OpenAPI) :

- `paymentId`, `studentId`, `amount`, `receiptUrl`, `receiptNumber`, `remainingBalance`, `nextStep`

### Étape F — Reçu sécurisé (PDF)

> **Guide détaillé :** [`flutter-parent-receipt.md`](./flutter-parent-receipt.md)

```http
GET /api/v1/mobile/parents/payments/{paymentId}/receipt
```

| Réponse | Type | Action |
|---------|------|--------|
| PDF | `application/pdf` (stream) | Télécharger / afficher |
| Pas prêt | JSON 200 `data.reason` | Polling si `RECEIPT_NOT_GENERATED` |

**Vérification QR (public, sans JWT) :**

```http
GET /api/v1/receipts/verify/{token}
```

Le token est encodé dans le QR du PDF (`p{paymentId}_{hmac32}`).

---

## 4 bis. Moratoires parent (Flutter)

> **Guide détaillé :** [`flutter-parent-moratorium.md`](./flutter-parent-moratorium.md)

Politique **par école** (pas de constantes 14/3 jours dans l’app). Le parent demande un délai ; le serveur auto-approuve ou met en attente selon `SchoolSettings`.

### Lire statut + politique

```http
GET /api/v1/mobile/parents/students/{studentId}/moratorium
Authorization: Bearer <JWT>
X-Tenant-Id: <uuid>
```

Utiliser `data.policy.parentMaxRequestDays` pour le slider et `data.policy.parentRequestEnabled` pour afficher le CTA.

Le champ `data.moratorium` dans `GET .../finances` et `GET .../wallet` reprend `active`, `pendingApproval`, `remindersOnHold`, `endDate`.

### Soumettre une demande

```http
POST /api/v1/mobile/parents/students/{studentId}/moratorium-request
Content-Type: application/json

{
  "requestedDays": 7,
  "reason": "Retard de salaire — paiement prévu la semaine prochaine."
}
```

| HTTP | UI |
|------|-----|
| `201` | Moratoire actif — bandeau succès |
| `202` | En attente validation école |
| `409` | Déjà un moratoire / demande en cours |
| `400` | Quota session, durée > plafond, etc. |

### Legacy (DEPRECATED — suppression après observation)

`POST .../request-grace` `{ "days": 3 }` — alias uniquement ; logs `[DEPRECATED]` côté serveur. **Ne plus appeler depuis Flutter.** Voir [`moratorium-legacy-purge.md`](./moratorium-legacy-purge.md).

### Admin (validation)

`POST /api/v1/admin/finance/moratoriums/{id}/approve` — rôle ADMIN (hors scope app parent).

---

## 5. Erreurs HTTP à gérer (parent paiement)

| Code | Signification | Action UI |
|------|---------------|-----------|
| `400` | Validation / barème invalide | Message erreur champ |
| `403` | Fraude bloquée / policy | Contact école |
| `409` | Barème déjà réglé ce mois | Proposer autre frais |
| `429` | Rate limit | Réessayer plus tard |
| `503` | SMS indisponible (OTP) | Retry ou support |

Code métier strict (admin, futur parent si étendu) : `PAYMENT_AMOUNT_TRUST` → paiement refusé sans barème.

---

## 6. Admin / Finance web — encaissement manuel

> **KYC & profil règlement (nouveau juin 2026) :** avant les paiements en ligne parent, implémenter les écrans décrits dans **[web-admin-payment-handoff.md](./web-admin-payment-handoff.md)** (`GET/PUT /admin/finance/payment-profile` + superadmin verify/reject).

```http
POST /api/v1/admin/finance/payments/manual
Authorization: Bearer <JWT>
x-idempotency-key: <uuid>

{
  "studentId": 3,
  "sessionId": 1,
  "feeStructureId": 4,
  "method": "CASH",
  "amount": 50,
  "channel": "ADMIN_MANUAL"
}
```

| Champ | Note |
|-------|------|
| `feeStructureId` | **Recommandé** — montant résolu côté serveur |
| `amount` | Ignoré si différent du barème (warning serveur) |

Socket admin après confirmation :

- `payment.confirmed.admin` → room `school:{id}:control-dashboard`
- `payment.confirmed.finance` → room `school:{id}:finance`

### Liaison transaction orpheline (admin)

```http
POST /api/v1/admin/finance/payments/link-orphan
Authorization: Bearer <JWT>

{
  "providerRef": "FLW-ORPHAN-123",
  "studentId": 3,
  "method": "MPESA",
  "feeStructureId": 4,
  "monthYear": "2025-06"
}
```

| Champ | Note |
|-------|------|
| `feeStructureId` | **Obligatoire** — montant résolu par `PaymentAmountResolver` |
| `amount` | **Non accepté** — ne pas envoyer |
| `monthYear` | Optionnel — période de facturation `YYYY-MM` |

Après succès : settlement + génération PDF async + `scheduleReceiptPdf`.

### Finance web — téléchargement reçu (guichet)

```http
GET /api/v1/finance/payments/receipts/{paymentId}/download?format=A4
GET /api/v1/finance/payments/receipts/{paymentId}/thermal
Authorization: Bearer <JWT>   (FINANCE / ADMIN)
```

Réponse : `application/pdf` streamé (même moteur que le parent). Voir **[flutter-parent-receipt.md](./flutter-parent-receipt.md)** §2.3.

Voir `openapi-admin.json` → `x-socket-events`.

---

## 7. Modèles TypeScript / Dart suggérés

### Dart — barème

```dart
class FeeStructureOption {
  final int id;
  final double amount;
  final String label;
  // from GET fee-structures
}
```

### Dart — initiation paiement

```dart
class PayFeesRequest {
  final int studentId;
  final int feeStructureId;
  final String method;
  final String provider;
  final String idempotencyKey;
  final String? phone;
  // NE PAS envoyer amount comme source de vérité
}

class PayFeesResponse {
  final int paymentId;
  final double serverAmount; // afficher ce montant
  final String currency;
  final String nextStep;
  final String? redirectUrl;
}
```

### Dart — reçu

```dart
class ReceiptPendingResponse {
  final String status; // "PENDING"
  final String message;
  final String paymentStatus;
  final String reason; // RECEIPT_NOT_GENERATED, ...
}

class ReceiptVerificationResult {
  final bool valid;
  final String receiptNumber;
  final String amount;
  final String currency;
  final String studentName;
  final String schoolName;
  final bool hmacValid;
}
```

Voir **[flutter-parent-receipt.md](./flutter-parent-receipt.md)** pour le service de téléchargement (stream PDF).

---

## 8. Checklist intégration Flutter

- [ ] `GET fee-structures` avant l'écran de paiement
- [ ] Lire `features.payments.online_enabled` depuis tenant config avant le bouton Payer
- [ ] Gérer 422 `PAYMENT_PROFILE_*` (profil KYC école)
- [ ] UI affiche le montant du barème (`feeStructures[].amount`)
- [ ] `POST /payments/pay` envoie `feeStructureId` + `idempotencyKey` (UUID)
- [ ] Réponse : utiliser `serverAmount` pour confirmation à l'écran
- [ ] Gérer `nextStep` + polling / socket
- [ ] Ne pas coder en dur les providers → `GET /payments/methods`
- [ ] Gérer 409 (déjà payé) et 403 (fraude)
- [ ] Socket `payment.settled` branché sur JWT parent
- [ ] Après `COMPLETE` : afficher `receiptNumber` + bouton télécharger reçu
- [ ] `GET /payments/{id}/receipt` — gérer PDF stream vs JSON `RECEIPT_NOT_GENERATED` (polling)
- [ ] Optionnel : écran vérif. QR via `GET /receipts/verify/{token}` (public)

---

## 9. Recette backend (équipe QA)

```powershell
npm run seed:smoke-student
npm run test:smoke:payment-amount:render
```

Valide que le montant falsifié `0.01` est ignoré au profit du barème serveur.

---

## 10. Documents liés

| Document | Audience / usage |
|----------|------------------|
| **[web-admin-payment-handoff.md](./web-admin-payment-handoff.md)** | **Passation collègue web** — KYC, OpenAPI, sockets, message à copier |
| [school-payment-profile.md](./school-payment-profile.md) | KYC multitenant (détail métier) |
| [api-coverage.md](./api-coverage.md) | Matrice complète API + sockets |
| [flutter-parent-receipt.md](./flutter-parent-receipt.md) | Reçus PDF + QR verify |
| [flutter-parent-moratorium.md](./flutter-parent-moratorium.md) | Moratoires parent |
| [FLUTTER_AI_PROMPT.md](./FLUTTER_AI_PROMPT.md) | Prompt IA copier-coller |
| [openapi-parent-finances.json](./openapi-parent-finances.json) | Contrat OpenAPI finances parent |
| [openapi-admin.json](./openapi-admin.json) | Socket admin / finance |
| [staging-deploy.md](./staging-deploy.md) | Déploiement et smoke tests |
| [modules/mobile/parent/README.md](../modules/mobile/parent/README.md) | Module parent backend |
| [modules/web/admin/README.md](../modules/web/admin/README.md) | Module admin backend |

---

*Pour toute divergence entre ce guide et le code, le code backend et les fichiers OpenAPI font foi — signaler les écarts pour mise à jour.*
