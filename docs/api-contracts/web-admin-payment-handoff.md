# Passation intégration web — Paiements & KYC (juin 2026)

**Pour :** développeur front **app web unique** (admin école + finance guichet + superadmin SaaS)  
**Backend :** PresenceFintech — repo `backend`  
**Dernière mise à jour :** 24 juin 2026

---

## Architecture — une seule app web

Admin, finance et superadmin sont **dans la même application front** (même login, même base URL, routing par rôle JWT).

| Rôle JWT | Zone UI typique | Préfixe API principal | Spec OpenAPI |
|----------|-----------------|----------------------|--------------|
| `ADMIN` | Promoteur / direction | `/api/v1/admin/*` | `swagger-docs/admin.json` |
| `FINANCE` | Guichet / compta | `/api/v1/finance/*` (+ lecture KYC via admin) | `swagger-docs/finance.json` |
| `SUPER_ADMIN` | Plateforme SaaS | `/api/v1/superadmin/*` | `swagger-docs/superadmin.json` |

**Un seul client HTTP** : `Authorization: Bearer <token>` après `POST /api/v1/auth/login`.  
Le backend route selon `user.role` — pas trois apps ni trois URLs d’auth.

**Sockets** (tous rôles concernés) : un handshake Socket.io, rooms jointes selon le rôle — voir `src/docs/openapi-admin.json`.

**Types TypeScript** : générer depuis **les 3 JSON** (`admin` + `finance` + `superadmin`) dans le même repo front, ou un script qui fusionne les schémas `components`.

---

## Message type à envoyer au collègue

Tu peux copier-coller ceci (adapter l’URL staging si besoin) :

```
Salut,

Backend paiements KYC + Flutterwave prêt. On reste sur **une seule app web** (admin + finance + superadmin) — même login, routing par rôle JWT.

📄 docs/web-admin-payment-handoff.md  (guide principal)
📄 docs/school-payment-profile.md
📄 docs/frontend-integration-guide.md  (§3bis KYC + §6 guichet)

🔌 openapi/ — copier les 4 fichiers :
   admin.json · finance.json · superadmin.json · openapi-admin-sockets.json

Swagger : {API}/api-docs/admin · /finance · /superadmin · /admin-realtime
API     : https://gestion-presence-et-paiement-mobile.onrender.com/api/v1

Écrans (même codebase) :
1. ADMIN       — formulaire RIB + badge kycStatus
2. SUPER_ADMIN — file PENDING + verify/reject
3. FINANCE     — guichet + lecture KYC + socket payment.confirmed.finance

Auth : POST /auth/login → Bearer · schémas PaymentProfileDto dans les 3 JSON
```

---

## Fichiers à copier dans le repo web (pack unique)

**Automatique** (dépôt `collab-version`) :

```powershell
cd C:\Users\franc\Desktop\presence-app\backend
npm run docs:openapi
npm run sync:collab
```

Script : `migration-script.ps1` · destination par défaut : `C:\Users\franc\Desktop\collab_backend\collab-version`

| Backend | → collab-version (même arborescence) |
|---------|--------------------------------------|
| `src/docs/web-admin-payment-handoff.md` | `src/docs/` |
| `src/docs/school-payment-profile.md` | `src/docs/` |
| `src/docs/frontend-integration-guide.md` | `src/docs/` |
| `swagger-docs/admin.json` | `swagger-docs/` |
| `swagger-docs/finance.json` | `swagger-docs/` |
| `swagger-docs/superadmin.json` | `swagger-docs/` |
| `src/docs/openapi-admin.json` | `src/docs/` + alias `openapi-admin-sockets.json` |

**Ne pas copier** `openapi-parent-*.json` (app mobile, autre repo).

---

## 1. Contexte — ce qui a changé

| Avant | Maintenant |
|-------|------------|
| Paiement parent sans gate école | **KYC obligatoire** : profil `VERIFIED` pour paiements en ligne |
| Un seul compte FLW implicite | **Subaccount Flutterwave par école** (`flwSubaccountId`) |
| Catalogue providers fixe | Parent : catalogue filtré par KYC + flags tenant |
| — | Allowlist serveur : provider absent de `GET /payments/methods` → 422 `PAYMENT_PROVIDER_NOT_ALLOWED` (côté mobile, pas web) |

**Le guichet** (cash, virement manuel admin) **fonctionne sans KYC** — seul le paiement en ligne parent est bloqué tant que le superadmin n’a pas validé.

---

## 2. Écrans à implémenter

### 2.1 Admin école — « Paiements en ligne / Compte de règlement »

**Routes :** préfixe `/api/v1/admin/finance`

| Action | Méthode | Rôle |
|--------|---------|------|
| Lire le profil | `GET /payment-profile` | ADMIN, SUPER_ADMIN, FINANCE |
| Enregistrer / modifier | `PUT /payment-profile` | ADMIN, SUPER_ADMIN |

**Body `PUT` (tous les champs sauf `provider` requis pour la création) :**

```json
{
  "legalName": "Complexe Scolaire Excellence",
  "settlementBankCode": "044",
  "settlementAccountNumber": "0123456789",
  "settlementAccountName": "CSE SPRL",
  "contactEmail": "finance@ecole.cd",
  "contactPhone": "+243810000000",
  "provider": "FLUTTERWAVE"
}
```

**Réponse `data` — champs UI importants :**

| Champ | Usage front |
|-------|-------------|
| `kycStatus` | `NOT_CONFIGURED` \| `PENDING` \| `VERIFIED` \| `REJECTED` |
| `onlinePaymentsEnabled` | `true` seulement si `VERIFIED` — **badge « Paiements en ligne actifs »** |
| `settlementAccountMasked` | Afficher `****6789` — **ne jamais redemander le RIB complet** après save |
| `kycNote` | Motif de refus (si `REJECTED`) |
| `verifiedAt` / `rejectedAt` | Dates pour timeline |
| `flwSubaccountId` | Info technique (optionnel en UI, lecture seule) |

**Comportement après `PUT` :**

- Statut repasse **`PENDING`** (même si c’était `VERIFIED` avant).
- Message UI : « En attente de validation par la plateforme ».
- Les parents voient `online_enabled: false` jusqu’à validation superadmin.

**Codes banque :** utiliser les codes Flutterwave / locales (ex. `044` RAWBANK) — aligner avec votre sélecteur banque existant si présent.

### 2.2 Superadmin — « Validation KYC écoles »

**Routes :** `/api/v1/superadmin/finance/payment-profiles`

| Action | Méthode |
|--------|---------|
| Liste file d’attente | `GET /payment-profiles?kycStatus=PENDING&limit=50` |
| Détail école | `GET /payment-profiles/{schoolId}` |
| Valider | `POST /payment-profiles/{schoolId}/verify` body `{ "note": "..." }` optionnel |
| Refuser | `POST /payment-profiles/{schoolId}/reject` body `{ "note": "RIB illisible" }` **obligatoire** |

**UI suggérée :**

- Table : `schoolName`, `legalName`, `kycStatus`, `contactEmail`, `updatedAt`
- Filtres : `PENDING` (défaut), `VERIFIED`, `REJECTED`, `schoolId`
- Actions ligne : Valider (modal note) / Refuser (modal motif obligatoire)

### 2.3 Finance (module guichet — même app web)

Préfixe **`/api/v1/finance/*`** — utilisateur connecté avec rôle **`FINANCE`** (ou `ADMIN` sur certaines routes).

**Lecture KYC** (badge dans l’UI guichet) : même endpoint que l’admin, documenté dans `finance.json` :

```http
GET /api/v1/admin/finance/payment-profile
```

Encaissement guichet (existant) :

Voir [frontend-integration-guide.md §6](./frontend-integration-guide.md) :

- `POST /admin/finance/payments/manual` — inclure `feeStructureId` + `monthYear` (YYYY-MM) si barème `MONTHLY`
- `POST /admin/finance/payments/link-orphan` — idem (`feeStructureId`, `monthYear`)
- `GET /admin/finance/students/:studentId/fee-periods?feeStructureId=` — mois encaissable (`allowedMonthYear`)
- `GET /finance/payments/receipts/{paymentId}/download` ou alias `GET /finance/receipts/{paymentId}/download`

**Pas de KYC requis** pour l’encaissement manuel.

### 2.4 Temps réel (dashboard promoteur / compta)

Connexion Socket.io — même JWT que le REST :

```typescript
import { io } from 'socket.io-client';

const socket = io(API_ORIGIN, {
  auth: { token: jwt },
  transports: ['websocket'],
});

socket.on('payment.confirmed.admin', (payload) => {
  // room automatique : school:{schoolId}:control-dashboard
  // payload : paymentId, studentName, amount, provider, reference, correlationId
});

socket.on('payment.confirmed.finance', (payload) => {
  // room : school:{schoolId}:finance
});
```

**Contrat complet :** `src/docs/openapi-admin.json` → extension `x-socket-events`  
**Swagger UI :** `/api-docs/admin-realtime`

---

## 3. Authentification web

```http
POST /api/v1/auth/login
Content-Type: application/json

{ "identifier": "admin@test.com", "password": "..." }
```

Réponse : `token` + `user` (dont `schoolId`, `role`).

Headers sur les routes protégées :

```http
Authorization: Bearer <token>
X-Tenant-Id: <school-uuid>    # recommandé si votre app est multi-tenant
X-Correlation-Id: <uuid>      # optionnel — traçabilité paiements
```

| Rôle | Module | Préfixe |
|------|--------|---------|
| `ADMIN` | Admin école | `/api/v1/admin/*` |
| `FINANCE` | Comptabilité | `/api/v1/admin/finance/*`, `/api/v1/finance/*` |
| `SUPER_ADMIN` | Plateforme SaaS | `/api/v1/superadmin/*` |

---

## 4. OpenAPI — trois specs, une app front

Les fichiers sont **découpés par domaine backend**, pas par application front :

| Fichier | Quand l’utiliser dans l’app web |
|---------|--------------------------------|
| `admin.json` | Écrans promoteur, `PUT` payment-profile, moratoires admin, PDF… |
| `finance.json` | Module guichet `/finance/*`, dashboard guichet, **GET** payment-profile |
| `superadmin.json` | Espace SaaS propriétaire, validation KYC |
| `openapi-admin.json` | Hooks Socket.io (admin + finance + superadmin selon room) |

**Exemple structure front :**

```
src/
├── api/
│   ├── client.ts              # axios/fetch + Bearer
│   ├── types/                 # généré depuis openapi/*.json
│   └── hooks/
├── modules/
│   ├── admin/                 # role ADMIN
│   ├── finance/               # role FINANCE
│   └── superadmin/            # role SUPER_ADMIN
└── auth/                      # login unique → redirect par role
```

---

## 5. Maquettes d’états UI (admin école)

| `kycStatus` | Badge | Message | Actions |
|-------------|-------|---------|---------|
| `NOT_CONFIGURED` | Gris | « Configurez votre compte de règlement pour activer les paiements en ligne » | Formulaire complet |
| `PENDING` | Orange | « Validation plateforme en cours (24–48 h) » | Lecture seule + compte masqué |
| `VERIFIED` | Vert | « Paiements en ligne actifs » | Modifier → repasse `PENDING` |
| `REJECTED` | Rouge | Afficher `kycNote` | Bouton « Corriger et renvoyer » → `PUT` |

---

## 6. Enveloppe réponse standard

Toutes les routes REST :

```json
{
  "success": true,
  "message": "...",
  "data": { },
  "timestamp": "2026-06-24T...",
  "statusCode": 200
}
```

Erreur :

```json
{
  "success": false,
  "message": "Description lisible",
  "errors": null,
  "statusCode": 422
}
```

Les codes métier structurés (`errorCode`) sont surtout côté **mobile parent** ; côté admin, privilégier `message` + `statusCode` (400, 403, 404, 422).

---

## 7. Recette & comptes test (local)

```powershell
# Backend
npm run dev:local
npm run seed:smoke-student:local

# Vérifier le flux parent (optionnel — pour voir l’impact du KYC)
npm run test:flw-webhook:e2e
```

| Compte | Email | Mot de passe (défaut seed) |
|--------|-------|----------------------------|
| Admin école | `admin@test.com` | `Presence2026!` |
| Superadmin | (votre seed `.env`) | `SEED_SUPERADMIN_PASSWORD` |
| Parent (test mobile) | `parent@test.com` | `Parent123!` |

**Scénario manuel web :**

1. Admin `PUT /payment-profile` → `kycStatus: PENDING`
2. Superadmin `POST .../verify` → `VERIFIED`, `onlinePaymentsEnabled: true`
3. (Optionnel) Parent paie — bouton en ligne visible dans l’app mobile

---

## 8. Fichiers backend utiles (debug)

| Fichier | Rôle |
|---------|------|
| `src/modules/web/admin/school-payment-profile.controller.ts` | Routes admin |
| `src/modules/web/superadmin/school-payment-profile-sa.controller.ts` | Routes superadmin |
| `src/services/finances/school-payment-profile.service.ts` | Règles KYC |
| `src/schemas/school-payment-profile.validation.ts` | Zod — miroir du body front |
| `scripts/generate-admin-swagger.js` | Doc OpenAPI admin |

---

## 9. Documents liés (ne pas dupliquer)

| Document | Audience |
|----------|----------|
| [school-payment-profile.md](./school-payment-profile.md) | Métier KYC complet (tous canaux) |
| [frontend-integration-guide.md](./frontend-integration-guide.md) | Flutter + web — §3bis, §6 |
| [api-coverage.md](./api-coverage.md) | Matrice couverture API |
| [modules/web/admin/README.md](../modules/web/admin/README.md) | Index module admin |
| [modules/web/superadmin/README.md](../modules/web/superadmin/README.md) | Index superadmin |

**Mobile parent** (hors scope web, pour contexte) : `src/modules/mobile/parent/README.md`

---

## 10. Checklist livraison front web

- [ ] Page admin « Compte de règlement » (`GET` + `PUT`)
- [ ] Badge `kycStatus` + messages §5
- [ ] Champ compte masqué après enregistrement (pas de RIB en clair en réponse)
- [ ] Page superadmin liste `PENDING` + verify / reject
- [ ] Socket `payment.confirmed.admin` sur dashboard promoteur
- [ ] Socket `payment.confirmed.finance` sur module compta
- [ ] Types générés depuis `admin.json` + `superadmin.json`
- [ ] Test manuel : PUT → PENDING → verify → VERIFIED

---

*En cas de divergence API ↔ doc, faire foi : `swagger-docs/*.json` après `npm run docs:openapi`.*
