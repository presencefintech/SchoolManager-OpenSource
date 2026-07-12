# Module Web Finance (Guichet)

**Guide de travail (étapes F-01 → F-16) :** [`../FINANCE_WORK_GUIDE.md`](../FINANCE_WORK_GUIDE.md)

**Préfixe API :** `/api/v1/finance/*`  
**Rôles :** `FINANCE`, `ADMIN` (selon route)  
**Policy :** `FinancePolicy` + isolation `schoolId` (JWT)

## Authentification

```http
POST /api/v1/auth/login
Content-Type: application/json

{ "email": "finance@ecole.test", "password": "..." }
```

Réponse : `{ data: { token: "..." } }` — utiliser ensuite :

```http
Authorization: Bearer <token>
```

## Format de réponse

### Succès (JSON)

```json
{
  "success": true,
  "message": "Opération réussie",
  "data": { },
  "timestamp": "2026-06-20T12:00:00.000Z",
  "statusCode": 200
}
```

### Erreur (JSON)

```json
{
  "success": false,
  "message": "Données invalides ou manquantes",
  "statusCode": 400,
  "errors": { "validation": [{ "field": "body.amount", "message": "..." }] },
  "code": "BAD_REQUEST",
  "path": "/api/v1/finance/payments/process"
}
```

Codes courants : `400` validation · `401` JWT · `403` rôle/policy · `404` ressource · `409` doublon · `500` serveur.

## Routes guichet (`/finance/payments`)

| Méthode | Chemin | Rôle | Policy |
|---------|--------|------|--------|
| `GET` | `/pending` | FINANCE | read Payment |
| `POST` | `/{id}/verify-step` | FINANCE | verify Payment |
| `POST` | `/process` | FINANCE | `create` Payment |
| `POST` | `/verify/{providerRef}` | FINANCE | `verify` Payment |
| `GET` | `/reports/daily-cash` | FINANCE | read |
| `GET` | `/analytics/executive` | FINANCE, ADMIN | read |
| `GET` | `/analytics/collection` | FINANCE | read |
| `GET` | `/debtors/list` | FINANCE | read |
| `GET` | `/risks/high-risk` | FINANCE | read |
| `GET` | `/student/{id}/profile` | FINANCE | read FinanceReport *(legacy — préférer wallet)* |
| `GET` | `/transactions/search` | FINANCE | read Payment |
| `GET` | `/receipts/{paymentId}/download` | FINANCE | `print` Receipt → **PDF binaire** |
| `GET` | `/receipts/{paymentId}/thermal` | FINANCE | `read` Receipt → **JSON** `{ url, whatsapp }` |
| `GET` | `/audit/integrity` | FINANCE, ADMIN | audit |

## Routes élèves guichet (`/finance/students`)

| Méthode | Chemin | Description |
|---------|--------|-------------|
| `GET` | `/search?q=&limit=` | Recherche matricule / nom / ref paiement (sans PII parent) |
| `GET` | `/{id}/wallet` | Solde, moratoire, barèmes applicables, 10 derniers paiements |

## Catalogue (`/finance`)

| Méthode | Chemin | Description |
|---------|--------|-------------|
| `GET` | `/fee-structures?classId=&sessionId=` | Barèmes lecture seule |
| `GET` | `/moratoriums?status=&studentId=` | Moratoires actifs (sans `internalNote`) |

## Session caisse (`/finance/cash-sessions`) — Phase 1

| Méthode | Chemin | Description |
|---------|--------|-------------|
| `POST` | `/open` | Ouvre la session (`openingFloat`, `openNotes?`) |
| `GET` | `/current` | Session OPEN du guichetier (`null` si aucune) |
| `GET` | `/{id}/summary` | Récap avant clôture (fond + encaissements CASH) |
| `POST` | `/{id}/close` | Clôture avec `closingCounted` → calcule `variance` |

Workflow guichet :

1. `POST /cash-sessions/open` avec fond de caisse
2. Encaissements `CASH` liés automatiquement à la session
3. `GET /cash-sessions/{id}/summary` pour vérifier le théorique
4. `POST /cash-sessions/{id}/close` avec le montant compté

Variable d'environnement :

- **`FINANCE_REQUIRE_CASH_SESSION=true`** (staging/prod) — refuse `POST /payments/process` en CASH sans session ouverte

## Workflows guichet (Phase 2)

| Méthode | Chemin | Description |
|---------|--------|-------------|
| `GET` | `/closing/preview` | Aperçu clôture journalière (sans persistance) |
| `POST` | `/closing/finalize` | Finalise → `FinancialSnapshot` |
| `GET` | `/refunds` | Liste demandes remboursement |
| `POST` | `/refunds` | Créer demande (admin valide via `/admin/finance/refunds/{id}/review`) |
| `GET` | `/refunds/{id}` | Détail demande |
| `POST` | `/debt-reminders/trigger` | Relances dette manuelles (Redis requis) |
| `GET` | `/exports/payments` | CSV paiements confirmés |
| `GET` | `/exports/debtors` | CSV débiteurs |
| `GET` | `/exports/cash-sessions/{id}` | CSV session caisse |

File vérification enrichie : `GET /payments/pending?method=&suspicion=&page=&limit=`

## Phase 3 — Exécution remboursements & dashboard

| Méthode | Chemin | Description |
|---------|--------|-------------|
| `POST` | `/refunds/{id}/process` | Exécute remboursement APPROVED (reverse settlement) |
| `GET` | `/dashboard/guichet` | KPIs journaliers guichet |

Workflow remboursement complet :
```
Guichet POST /refunds → Admin POST /admin/finance/refunds/{id}/review → Guichet POST /refunds/{id}/process
```

### Socket.io (guichet)

| Event | Déclencheur |
|-------|-------------|
| `refund.requested.finance` | Création demande |
| `refund.approved.finance` | Validation admin |
| `refund.processed.finance` | Exécution guichet |
| `guichet.dashboard.refresh` | Après process remboursement |
| `payment.confirmed.finance` | Paiement confirmé (existant) |

## Phase 4 — Remboursement gateway MM/BANK

| Méthode | Chemin | Description |
|---------|--------|-------------|
| `POST` | `/refunds/{id}/process` | Appel opérateur (FLW, MPESA…) + reverse settlement si synchrone |
| `POST` | `/refunds/{id}/sync-gateway` | Polling statut pour demandes `PROCESSING` |

### Providers implémentés

| Provider | Remboursement API | Mode sandbox |
|----------|-------------------|--------------|
| **FLUTTERWAVE** | `POST /transactions/{id}/refund` | Sans `FLW_SECRET_KEY` → COMPLETED immédiat |
| **MPESA** | Daraja Reversal | Sans credentials → COMPLETED immédiat |
| **UBA** | `POST /payments/{providerRef}/refunds` | Sans `UBA_API_KEY` / OAuth → COMPLETED immédiat |
| **ORANGE** | `POST {ORANGE_REFUND_PATH}` | Sans `ORANGE_CLIENT_ID` → COMPLETED immédiat |
| **AIRTEL** | `POST /standard/v1/payments/{id}/refunds` | Sans `AIRTEL_CLIENT_ID` → COMPLETED immédiat |
| **CASH** | N/A (reverse comptable seul) | — |
| **EQUITY, RAWBANK, ECOBANK, FINCA, ACCESSBANK** | `POST {API_URL}/payments/{ref}/refunds` | Sandbox sans `{CODE}_API_KEY` → COMPLETED |

### Workflow gateway

```
APPROVED → process
  ├─ CASH / sans providerRef → reverse comptable → PROCESSED
  ├─ Gateway COMPLETED → reverse comptable → PROCESSED
  ├─ Gateway PENDING → PROCESSING → webhook ou sync-gateway → PROCESSED
  └─ Gateway FAILED / NOT_SUPPORTED (sans fallback) → FAILED / erreur 400
```

Webhooks remboursement : `POST /api/v1/payments/webhook/FLUTTERWAVE` · `.../MPESA` · `.../UBA` · `.../ORANGE` · `.../AIRTEL`.

Variables env :

```env
REFUND_ALLOW_MANUAL_FALLBACK=false   # true = reverse comptable si provider NOT_SUPPORTED
FLW_SECRET_KEY=                      # Flutterwave refund prod
MPESA_CONSUMER_KEY=                  # Daraja reversal
MPESA_CONSUMER_SECRET=
MPESA_SHORTCODE=
MPESA_REVERSAL_INITIATOR=
MPESA_REVERSAL_SECURITY_CREDENTIAL=
MPESA_REVERSAL_RESULT_URL=
MPESA_REVERSAL_TIMEOUT_URL=
UBA_API_URL=
UBA_CLIENT_ID=
UBA_CLIENT_SECRET=
UBA_API_KEY=                         # alternative à OAuth
UBA_PUBLIC_KEY=                      # signature webhook RSA
ORANGE_CLIENT_ID=
ORANGE_CLIENT_SECRET=
ORANGE_REFUND_PATH=                  # ex. /orange-money-webpay/cd/v1/transaction/refund
AIRTEL_CLIENT_ID=
AIRTEL_CLIENT_SECRET=
AIRTEL_COUNTRY=CD
```

URL complète exemple : `POST /api/v1/finance/payments/process`

### Encaissement — exemple

```http
POST /api/v1/finance/payments/process
Authorization: Bearer <token>
X-Idempotency-Key: guichet-20260620-001
Content-Type: application/json

{
  "studentId": 42,
  "sessionId": 1,
  "feeStructureId": 15,
  "amount": 150,
  "method": "CASH",
  "comment": "Frais juin"
}
```

- **`feeStructureId`** recommandé : le serveur recalcule le montant depuis le barème.
- Si **`PAYMENT_STRICT_AMOUNT=true`** (staging/prod), `feeStructureId` est **obligatoire**.
- **`reference`** obligatoire si `method` ≠ `CASH`.
- **`X-Idempotency-Key`** : évite double encaissement en cas de retry réseau.

Réponse **201** (Phase 0.5) :

```json
{
  "success": true,
  "data": {
    "payment": { "id": 99, "amount": 150, "method": "CASH", "status": "CONFIRMED" },
    "serverAmount": 150,
    "feeStructureId": 15,
    "resolvedFrom": "fee_structure"
  }
}
```

Le frontend doit afficher **`serverAmount`** (pas le montant saisi) comme montant officiel.

### Enums (Prisma)

**PaymentMethod :** `CASH` · `ORANGE_MONEY` · `MPESA` · `AIRTEL_MONEY` · `BANK` · `CARD`  
**PaymentStatus :** `PENDING` · `CONFIRMED` · `FAILED` · `RECONCILED` · `REFUNDED` · `SUSPICIOUS`

## Classes (`/finance/classes`)

| Route | Rôle | Description |
|-------|------|-------------|
| `GET /classes` | FINANCE, ADMIN | Liste classes (recouvrement) |
| `GET /classes/{id}` | FINANCE, ADMIN | Détails classe |
| `GET /classes/{id}/financial-status` | FINANCE, ADMIN | Statut financier |
| `GET /classes/{id}/export-payments` | FINANCE, ADMIN | Export solvabilité |
| `GET /classes/{id}/audit` | FINANCE, ADMIN | Audit trail |

## Complément admin (UI finance complète)

Ces endpoints sont documentés dans **`swagger-docs/finance.json`** (lecture KYC) ou **`swagger-docs/admin.json`** (écriture) :

| Besoin | Route | Spec |
|--------|-------|------|
| **Statut KYC / paiements en ligne parent** | `GET /admin/finance/payment-profile` | `finance.json` (lecture FINANCE) |
| Configuration RIB (admin uniquement) | `PUT /admin/finance/payment-profile` | `admin.json` |
| Moratoires CRUD | `/admin/finance/moratoriums/*` | `admin.json` |
| **Export vérifications pending** | `GET /admin/finance/payments/pending-verifications/export?format=csv` | `admin-business-actions.md` |
| **Clôture vérification** | `POST /admin/finance/payments/verifications/{id}/mark-processed` | `admin-business-actions.md` |
| Validation remboursements | `/admin/finance/refunds/{id}/review` | `admin.json` |
| **Rapports agrégés (ReportingEngine)** | `GET /admin/finance/reports/aggregate` | `admin.json` |
| **Config devise / taux** | `GET/PATCH /admin/finance/currency-config` · `GET/POST /admin/finance/exchange-rates` | `admin.json` |
| Barèmes / tarifs (écriture) | routes admin finance | `admin.json` |

Guide KYC : `src/docs/school-payment-profile.md` · passation front : `src/docs/web-admin-payment-handoff.md`

## Documentation OpenAPI

| Spec | Fichier | Swagger UI |
|------|---------|------------|
| **REST finance** | `swagger-docs/finance.json` | `/api-docs/finance` |
| Finance admin | `swagger-docs/admin.json` | `/api-docs/admin` |
| Temps réel | `src/docs/openapi-admin.json` | `/api-docs/admin-realtime` |

**Régénération :** `npm run docs:admin-openapi` · `docs:finance-openapi` (ou `docs:openapi` pour tout).

## Temps réel (Socket.io)

```typescript
const socket = io(host, { auth: { token: jwt }, transports: ['websocket'] });
// Room jointe automatiquement pour FINANCE : school:{schoolId}:finance
socket.on('payment.confirmed.finance', (payload) => { /* PaymentConfirmedFinancePayload */ });
```

Contrats : `openapi-admin.json` · `gateway/events/payment-event.types.ts`

## Contrats TypeScript (référence)

- `finance.validation.ts` — schémas Zod requêtes
