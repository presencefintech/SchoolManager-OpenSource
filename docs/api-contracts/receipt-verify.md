# Vérification de reçu — PresenceFintech (PF-VERIFY-v1)

> **Public :** parents, guichet, direction, contrôle externe  
> **Sans authentification** — rate limit 60 req / 15 min / IP (prod)

---

## Rôles & accès

| Acteur | Rôle app | Page / API | Action |
|--------|----------|------------|--------|
| Parent / tuteur | — (public) | `/verify/receipt/{token}` | Scan QR sur ticket |
| Parent / tuteur | — (public) | `/verify` | Saisie N° reçu + code PF |
| Caissier | `FINANCE` | Nav guichet → **Vérifier reçu** → `/verify` | Contrôle au guichet |
| Direction | `ADMIN` | Nav admin Finance → **Vérifier reçu** → `/verify` | Litige / audit |
| SuperAdmin | `SUPER_ADMIN` | `/verify` (public) | Multi-écoles via code PF (`PF-{schoolId}-…`) |
| App mobile parent | `PARENT` | QR natif (caméra) | Ouvre URL web — **aucune app dédiée requise** |

---

## API backend

Préfixe : `/api/v1/receipts`

### QR (scan)

```http
GET /api/v1/receipts/verify/{token}
Accept: application/json
```

Token : `p{paymentId base36}_{hmac32}` (encodé dans le QR du ticket thermique).

Redirect HTML (navigateur) : `302` → `{WEB_FRONTEND_URL}/verify/receipt/{token}`

### Saisie manuelle (code PF)

```http
GET /api/v1/receipts/lookup?receiptNumber=REC-2026-01-0042&code=PF-0001-2601-A7F3
Accept: application/json
```

Redirect HTML : `302` → `/verify?receiptNumber=…&code=…`

### Format code PF

```
PF-{école 4 digits}-{YYMM période}-{checksum 4}
Exemple : PF-0001-2601-A7F3
```

- `{école}` = `schoolId` zero-padded (isolation multi-tenant RDC)
- Imprimé en bas du ticket thermique + visible sur la page de résultat

---

## Réponse succès (extrait)

```json
{
  "success": true,
  "data": {
    "valid": true,
    "algorithm": "PF-VERIFY-v1",
    "integrityLevel": "CERTIFIED",
    "publicVerifyCode": "PF-0001-2601-A7F3",
    "receiptNumber": "REC-2026-01-0042",
    "amount": "150.00",
    "currency": "USD",
    "cdfEquivalent": 427500,
    "exchangeRate": 2850,
    "schoolName": "Complexe Scolaire Excellence",
    "schoolLogoUrl": "https://…",
    "feeLines": [{ "label": "Minerval", "amount": "150.00", "periodLabel": "Mensuel" }],
    "hmacValid": true
  }
}
```

### Niveaux d'intégrité

| Valeur | Signification |
|--------|---------------|
| `CERTIFIED` | Token/code + signature HMAC valides |
| `SUSPECT` | Reçu trouvé, signature à contrôler |
| `REJECTED` | Token/code invalide |

### Raisons d'échec

`INVALID_TOKEN` · `INVALID_CODE` · `NOT_FOUND` · `NOT_CONFIRMED` · `SIGNATURE_MISMATCH` · `RECEIPT_INCOMPLETE`

---

## Frontend (Next.js)

| Route | Fichier | Description |
|-------|---------|-------------|
| `/verify` | `src/app/verify/page.tsx` | Formulaire N° reçu + code PF |
| `/verify/receipt/[token]` | `src/app/verify/receipt/[token]/page.tsx` | Résultat scan QR |

Middleware : chemins publics `/verify*` (pas de JWT).

Client : `src/lib/receipt/verify-receipt.ts` · UI : `src/components/receipt/ReceiptVerifyCard.tsx`

---

## Branches Git

| Branche | Contenu |
|---------|---------|
| `feat/finance-payment-modal` | Ticket thermique, branding école, verify web |
| `feat/receipt-verify-pf` | Algorithme PF-VERIFY-v1, lookup, snapshots |

---

## Voir aussi

- Backend : [`backend/src/docs/flutter-parent-receipt.md`](../../../backend/src/docs/flutter-parent-receipt.md)
- Routes : [`backend/docs/routes-finance.md`](../../../backend/docs/routes-finance.md) §0
