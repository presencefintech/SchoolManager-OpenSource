# Profil de règlement par école — Paiements multitenant (KYC)

Guide d’intégration pour les équipes **web admin**, **superadmin SaaS** et **mobile parent**.

**Passation front web (message + écrans + OpenAPI) :** [web-admin-payment-handoff.md](./web-admin-payment-handoff.md)

**Dernière mise à jour :** 24 juin 2026  
**Code :** `SchoolPaymentProfile` · `SchoolPaymentProfileService` · routes admin + superadmin  
**Migration :** `prisma/migrations/20260624120000_school_payment_profile`

---

## 1. Problème résolu

En multitenant, chaque école doit recevoir les paiements parents sur **son propre compte** (RIB / subaccount Flutterwave), sans exposer ce numéro dans l’app mobile.

| Acteur | Voit le RIB école ? | Rôle |
|--------|---------------------|------|
| **Parent mobile** | Non | Paie via checkout Flutterwave |
| **Admin école** | Oui (masqué `****1234` après enregistrement) | Configure une fois à l’onboarding |
| **Superadmin (proprio SaaS)** | Oui (liste + validation) | Valide le KYC avant activation |
| **Flutterwave** | Oui (subaccount) | Settlement automatique vers l’école |

---

## 2. Modèle opérationnel (hybride)

```
1. Superadmin crée l’école + tenant
2. Admin école → PUT /admin/finance/payment-profile (RIB, banque, contacts)
3. Backend → crée subaccount Flutterwave (ou simulé sandbox) → kycStatus: PENDING
4. Superadmin → POST .../payment-profiles/:schoolId/verify
5. Parents → POST /payments/pay autorisé · FLW split vers flwSubaccountId
```

**Sans étape 4 :** paiements en ligne **bloqués** (422). Le **guichet** (cash, `bank-confirm`) reste possible.

---

## 3. Routes API

### 3.1 Admin école — `/api/v1/admin/finance/payment-profile`

| Méthode | Rôle | Description |
|---------|------|-------------|
| `GET` | ADMIN, SUPER_ADMIN, FINANCE | Statut KYC + compte masqué |
| `PUT` | ADMIN, SUPER_ADMIN | Enregistrer / mettre à jour le profil → `PENDING` |

**Body `PUT` :**

```json
{
  "legalName": "École Sainte-Marie",
  "settlementBankCode": "044",
  "settlementAccountNumber": "0123456789",
  "settlementAccountName": "École Sainte-Marie SPRL",
  "contactEmail": "finance@ecole.cd",
  "contactPhone": "+243810000000",
  "mobileMoneyBusinessId": "OPTIONNEL",
  "provider": "FLUTTERWAVE"
}
```

**Réponse `data` (extrait) :**

```json
{
  "schoolId": 1,
  "legalName": "École Sainte-Marie",
  "settlementAccountMasked": "****6789",
  "flwSubaccountId": "RS_SCHOOL_1_...",
  "kycStatus": "PENDING",
  "onlinePaymentsEnabled": false,
  "verifiedAt": null
}
```

> Le numéro de compte complet n’est **jamais** renvoyé en clair après enregistrement.

### 3.2 Superadmin — `/api/v1/superadmin/finance/payment-profiles`

> **Contrat OpenAPI (source de vérité) :** `swagger-docs/superadmin.json` — schémas `PaymentProfileDto`, `VerifyPaymentProfileBody`, `RejectPaymentProfileBody`.  
> Swagger UI : `/api-docs/superadmin` · régénération : `npm run docs:superadmin-openapi`

| Méthode | Description |
|---------|-------------|
| `GET /payment-profiles` | Liste (`?kycStatus=PENDING&schoolId=1&limit=50`) |
| `GET /payment-profiles/:schoolId` | Détail d’une école |
| `POST /payment-profiles/:schoolId/verify` | Activer paiements en ligne (`{ "note": "..." }` optionnel) |
| `POST /payment-profiles/:schoolId/reject` | Refuser (`{ "note": "RIB invalide" }` **obligatoire**) |

### 3.3 Parent mobile — gate + tenant config

**Avant paiement**, l’app doit lire :

```http
GET /api/v1/mobile/parents/control-plane/tenant/config?schoolId=1
```

**Nouveaux champs `data.features.payments` :**

```json
{
  "flutterwave": true,
  "mobile_money": true,
  "online_enabled": false,
  "kyc_status": "PENDING"
}
```

| `kyc_status` | `online_enabled` | UI parent |
|--------------|------------------|-----------|
| `NOT_CONFIGURED` | `false` | « Paiement en ligne bientôt disponible » / guichet |
| `PENDING` | `false` | « Validation en cours par l’école » |
| `VERIFIED` | `true` | Bouton payer + checkout FLW |
| `REJECTED` | `false` | « Contactez l’école » |

**Si le parent tente quand même `POST /payments/pay` :**

| HTTP | `errorCode` | Message type |
|------|-------------|--------------|
| 422 | `PAYMENT_PROFILE_NOT_CONFIGURED` | Non configuré |
| 422 | `PAYMENT_PROFILE_PENDING_KYC` | En attente validation |
| 422 | `PAYMENT_PROFILE_REJECTED` | Profil refusé |
| 422 | `PAYMENT_PROVIDER_NOT_ALLOWED` | `gateway` absent de `GET /payments/methods` (KYC, tenant ou provider désactivé) |

---

## 4. Flutterwave — routage des fonds

- **Une clé plateforme** : `FLW_SECRET_KEY` (compte maître PresenceFintech).
- **Par école** : `flwSubaccountId` stocké en base après `PUT /payment-profile`.
- **À l’initiation** (`flutterwave-gateway.provider.ts`) : si profil `VERIFIED`, le body FLW inclut :

```json
{
  "subaccounts": [{ "id": "<flwSubaccountId>", "transaction_split_ratio": 1 }]
}
```

Le parent ne voit **pas** le compte récepteur sur le checkout Flutterwave — c’est normal.

---

## 5. Variables d’environnement

| Variable | Usage |
|----------|--------|
| `FLW_SECRET_KEY` | API Flutterwave (prod ou sandbox TEST) |
| `FLW_SECRET_HASH` | Signature webhooks |
| `FLW_DEFAULT_EMAIL` | Email fallback checkout |
| `ENCRYPTION_KEY` ou `PAYMENT_PROFILE_ENCRYPTION_KEY` | Chiffrement AES-256-GCM du RIB en base |
| `PAYMENT_ONLINE_SKIP_KYC=true` | **Dev uniquement** — désactive le gate parent |

---

## 6. Sécurité

- RIB chiffré au repos (`FieldEncryptionUtil`).
- API mobile : jamais de RIB complet.
- Admin : compte masqué `****{4 derniers chiffres}`.
- Audit log : création / verify / reject (logs service `school-payment-profile`).
- Ré-enregistrement admin → repasse en `PENDING` (re-validation superadmin requise).

---

## 7. Checklist intégration

### Back-office web (admin école)

> Détail écrans + message Slack : **[web-admin-payment-handoff.md](./web-admin-payment-handoff.md)**

- [ ] Écran « Paiements en ligne » avec formulaire RIB
- [ ] Afficher `kycStatus` + message selon tableau §3.3
- [ ] Masquer le champ compte après enregistrement (afficher `settlementAccountMasked`)

### Back-office superadmin (proprio SaaS)

- [ ] Liste des profils `PENDING`
- [ ] Actions Valider / Refuser avec motif
- [ ] Filtre par `schoolId`

### Flutter parent

- [ ] Lire `online_enabled` depuis tenant config **avant** d’afficher le bouton Payer
- [ ] Gérer les 422 `PAYMENT_PROFILE_*` avec messages utilisateur
- [ ] Ne **pas** demander de « numéro récepteur » au parent

### Backend / ops

- [ ] `npx prisma migrate deploy` + `npx prisma generate`
- [ ] Pilote : superadmin `verify` manuellement les 2–3 premières écoles
- [ ] Prod : `PAYMENT_ONLINE_SKIP_KYC` **absent** ou `false`

---

## 8. Tests

```powershell
npx jest src/services/finances/__tests__/school-payment-profile.service.test.ts --forceExit
```

**Scénario manuel :**

1. Admin `PUT /admin/finance/payment-profile`
2. Superadmin `POST .../verify`
3. Parent `POST /payments/pay` → checkout FLW OK
4. Sans verify → 422 `PAYMENT_PROFILE_PENDING_KYC`

---

## 9. Fichiers code

| Fichier | Rôle |
|---------|------|
| `prisma/schema.prisma` | Modèle `SchoolPaymentProfile` |
| `src/types/school-payment-profile.types.ts` | Enums / DTO types |
| `src/repositories/school-payment-profile.repository.ts` | Accès DB |
| `src/services/finances/school-payment-profile.service.ts` | Métier + gate KYC |
| `src/services/finances/flutterwave-subaccount.service.ts` | API subaccount FLW |
| `src/modules/web/admin/school-payment-profile.controller.ts` | Routes admin |
| `src/modules/web/superadmin/school-payment-profile-sa.controller.ts` | Routes superadmin |
| `src/schemas/school-payment-profile.validation.ts` | Zod |
| `src/providers/payment/flutterwave-gateway.provider.ts` | Split subaccount |

---

## 10. Documents liés

| Document | Audience |
|----------|----------|
| **[web-admin-payment-handoff.md](./web-admin-payment-handoff.md)** | **Collègue web** — passation admin + superadmin |
| [frontend-integration-guide.md](./frontend-integration-guide.md) | Flutter + web |
| [FRONTEND_PAYMENT_INTEGRATION.md](../../docs/FRONTEND_PAYMENT_INTEGRATION.md) | Contrat paiement parent |
| [api-coverage.md](./api-coverage.md) | Matrice API |
| [ADR-002-tenant-context.md](../../docs/ADR-002-tenant-context.md) | Multitenant |
| [modules/web/admin/README.md](../modules/web/admin/README.md) | Module admin |

### OpenAPI (Swagger UI)

| Spec | Périmètre | Régénération |
|------|-----------|--------------|
| **`swagger-docs/superadmin.json`** | **Toutes routes superadmin** dont `payment-profiles/*` | `npm run docs:superadmin-openapi` |
| `swagger-docs/admin.json` | Admin école : `GET/PUT /admin/finance/payment-profile` | `npm run docs:admin-openapi` |
| `src/docs/openapi-parent-mobile.json` | Parent : `features.payments.online_enabled`, `kyc_status` | manuel |

**Swagger UI :** `/api-docs/superadmin` (superadmin) · `/api-docs/admin` (admin école)

Schémas KYC partagés : `scripts/swagger-openapi-shared.js` → `paymentProfileSchemas` (injectés dans `admin.json` et `superadmin.json`).

---

*Pour toute divergence, le code backend et ce document font foi après revue PR.*
