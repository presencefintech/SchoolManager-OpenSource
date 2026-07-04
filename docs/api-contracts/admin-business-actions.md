# Actions métier Admin — Contrats API (juin 2026)

**Public :** équipe frontend web admin  
**Préfixe :** `/api/v1/admin/*`  
**Spec OpenAPI :** [`openapi/admin.json`](./openapi/admin.json)  
**Schémas Zod :** [`types/enrollment.validation.ts`](./types/enrollment.validation.ts)

Routes ajoutées pour l'étape **Actions Métier & UX Simplifiée** : inscription session, profil administratif, clôture vérifications paiement, export CSV, actions alertes présence.

---

## Authentification & stack commune

Toutes les routes ci-dessous exigent :

```http
Authorization: Bearer <JWT>
Content-Type: application/json
```

| Middleware | Effet |
|------------|-------|
| `authenticate` | JWT valide |
| `permitRoles` | Voir tableau par route |
| `setSchoolContext` | Isolation `schoolId` (RLS) |
| `securityShield` | Protection IP / device |
| `authorize(Policy, action, resource)` | RBAC fin |
| `validate(ZodSchema)` | Corps / params typés |

Format succès standard :

```json
{
  "success": true,
  "message": "…",
  "data": { },
  "timestamp": "2026-06-26T12:00:00.000Z",
  "statusCode": 200
}
```

Erreurs : `400` validation · `401` JWT · `403` policy · `404` ressource absente · `409` conflit métier.

---

## 1. Inscriptions — Sessions académiques

### `GET /admin/enrollments/sessions`

Liste les sessions académiques de l'école (formulaire « Inscrire à une session »).

| | |
|--|--|
| **Rôles** | `ADMIN`, `SUPER_ADMIN` |
| **Policy** | `AcademicPolicy.read` → `Class` |
| **Query** | — |

**Réponse `200` — `data` :**

```typescript
Array<{
  id: number
  label: string
  startDate: string      // ISO date
  endDate: string
  isCurrent: boolean
  status: string
}>
```

**Frontend :** `enrollmentsApi.listSessions()` · hook `useAcademicSessions()`

---

### `POST /admin/enrollments/{studentId}/sessions`

Inscrit un élève **existant** à une session académique. Crée un enregistrement `Enrollment` avec barèmes agrégés.

| | |
|--|--|
| **Rôles** | `ADMIN`, `SUPER_ADMIN` |
| **Policy** | `AcademicPolicy.update` → élève cible |
| **Params** | `studentId` (integer, path) |

**Corps (JSON) — `EnrollSessionSchema` :**

```typescript
{
  sessionId: number          // requis — ID AcademicSession
  classId?: number           // optionnel — défaut : classe actuelle de l'élève
  type?: 'NEW' | 'RE_ENROLLMENT' | 'TRANSFER'  // défaut RE_ENROLLMENT
}
```

**Réponse `201` — `data` :** objet `Enrollment` (session, classe, `totalAmount`, `paidAmount`, `balance`, `status: ENROLLED`).

**Erreurs métier :**

| Code | Message typique |
|------|-----------------|
| `400` | Élève déjà inscrit à cette session |
| `400` | Classe requise si l'élève n'en a pas |
| `404` | Session ou élève introuvable (hors école) |

**Frontend :** `enrollmentsApi.enrollInSession(studentId, payload)` · `useEnrollInSession()`

---

### `PATCH /admin/enrollments/{studentId}/admin-profile`

Met à jour le profil administratif / médical (hors biométrie).

| | |
|--|--|
| **Rôles** | `ADMIN`, `SUPER_ADMIN` |
| **Policy** | `AcademicPolicy.update` → élève cible |
| **Params** | `studentId` (integer, path) |

**Corps (JSON) — `AdminAdministrativeProfileSchema` (tous optionnels, au moins un champ) :**

```typescript
{
  placeOfBirth?: string       // min 2, max 120
  nationality?: string        // min 2, max 80
  emergencyContactName?: string
  emergencyContactPhone?: string  // min 6, max 20
  bloodGroup?: string         // max 10
  allergies?: string          // max 500
  medicalNotes?: string       // max 1000
  paymentNotes?: string       // max 500
  scholarshipPercent?: number // 0–100
}
```

**Réponse `200` — `data` :** objet `Student` mis à jour.

**Audit :** action `STUDENT_ADMIN_PROFILE_UPDATE`.

**Frontend :** `enrollmentsApi.updateAdministrativeProfile(studentId, payload)` · `useUpdateAdministrativeProfile()`

---

## 2. Finance — Vérifications paiement

Workflow UI recommandé :

```
Finance ✓  →  Admin ✓  →  Marquer traité  →  (retiré de la file)
     POST verify-step          POST mark-processed
```

### `GET /admin/finance/payments/pending-verifications/export`

Exporte la file de vérifications en attente.

| | |
|--|--|
| **Rôles** | `ADMIN`, `SUPER_ADMIN`, `FINANCE` |
| **Policy** | `FinancePolicy.export` → `FinanceReport` |
| **Query** | `format` : `csv` (défaut) \| `json` |

**Réponse `format=csv` :**

- `Content-Type: text/csv; charset=utf-8`
- `Content-Disposition: attachment; filename="verifications-en-attente-{timestamp}.csv"`
- BOM UTF-8 (`\uFEFF`) + en-tête :
  `verificationId,paymentId,studentName,amount,currency,method,reference,status,fraudScore,suspicion,queuedAt`

**Réponse `format=json` :** enveloppe `ApiSuccess` avec `{ items, total }` (même shape que la liste pending).

**Frontend :** `financeApi.exportPendingVerifications('csv')` · `useExportPendingVerifications()` — traiter `responseType: 'blob'`.

---

### `POST /admin/finance/payments/verifications/{verificationId}/mark-processed`

Clôture une vérification après validation Finance **et** Admin. Équivalent à une validation admin finale avec note d'audit.

| | |
|--|--|
| **Rôles** | `ADMIN`, `SUPER_ADMIN` uniquement (pas `FINANCE`) |
| **Policy** | `FinancePolicy.verify` → `Payment` |
| **Params** | `verificationId` (integer, path) |

**Corps (JSON) :**

```typescript
{
  notes?: string   // défaut : "Marqué comme traité par l'administration"
}
```

**Réponse `200` :** résultat `PaymentVerificationService.adminVerify`.

**Audit :** action `PAYMENT_MARK_PROCESSED` sur ressource `PaymentVerification`.

**Frontend :** `financeApi.markVerificationProcessed(verificationId, notes?)` · `useMarkVerificationProcessed()`

> **Note intégration :** n'afficher le bouton « Marquer traité » que si `financeCheck === true && adminCheck === true` sur l'item pending.

---

## 3. Présences — Actions alertes sécurité

> **Périmètre rôles :** tout le routeur `/api/v1/admin/presences/*` est réservé à `ADMIN` et `SUPER_ADMIN` (`permitRoles`). Le rôle `FINANCE` n'y a pas accès.

Ces routes opèrent sur `PresenceSecurityEvent` (feed `GET /admin/presences/alerts`), pas directement sur la présence seule.

### `PATCH /admin/presences/security-events/{eventId}/dismiss`

Archive une alerte sans valider la présence.

| | |
|--|--|
| **Rôles** | `ADMIN`, `SUPER_ADMIN` |
| **Policy** | `PresencePolicy.update` → `FraudAlert` |
| **Params** | `eventId` (integer, path) |

**Corps (JSON) :**

```typescript
{ note?: string }   // défaut : "Alerte ignorée par l'administration"
```

**Effet serveur :** `isSuspectedFraud → false`, append `[IGNORÉ] {note}` dans `fraudReasons`.

**Audit :** `PRESENCE_ALERT_DISMISSED` · log activité `PRESENCE_ALERT_DISMISS`.

**Réponse `200` :** `data: null`, message « Alerte ignorée. »

---

### `PATCH /admin/presences/security-events/{eventId}/validate`

Valide la présence liée et lève l'alerte.

| | |
|--|--|
| **Rôles** | `ADMIN`, `SUPER_ADMIN` |
| **Policy** | `PresencePolicy.validate` → `Presence` |
| **Params** | `eventId` (integer, path) |
| **Corps** | `{}` (vide accepté) |

**Effet serveur :** `StudentPresence.adminValidate` + `isSuspectedFraud → false`.

**Audit :** `PRESENCE_ALERT_VALIDATED` · log `PRESENCE_ALERT_VALIDATE`.

**Réponse `200` :** objet présence validée.

---

### `POST /admin/presences/security-events/{eventId}/notify`

Envoie une notification aux parents et un rappel interne admin/finance.

| | |
|--|--|
| **Rôles** | `ADMIN`, `SUPER_ADMIN` |
| **Policy** | `PresencePolicy.update` → `FraudAlert` |
| **Params** | `eventId` (integer, path) |

**Corps (JSON) :**

```typescript
{
  message?: string   // défaut : "Une anomalie de présence a été détectée pour votre enfant…"
}
```

**Effet serveur :** `NotificationService.sendToParents` (type `FRAUD_ALERT`, outbox + idempotence) + broadcast admin/finance via fan-out si seuil atteint.

**Audit :** `PRESENCE_ALERT_NOTIFIED` · log `PRESENCE_ALERT_NOTIFY`.

**Réponse `200` :** `data: null`, message « Notification envoyée. »

**Frontend :** `presencesApi.dismissSecurityAlert` · `validateSecurityAlert` · `notifySecurityAlert` · hooks `useDismissSecurityAlert`, `useValidateSecurityAlert`, `useNotifySecurityAlert`.

---

## Cahier d'appel — export registre scellé

### `GET /admin/presences/sheets/{sheetId}/export?format=pdf|csv`

**Prérequis :** feuille `SEALED` avec `sheetAuditSeal` (après `POST …/sheets/{sheetId}/seal`).

| Format | `Content-Type` | Usage |
|--------|----------------|-------|
| `pdf` (défaut) | `application/pdf` | Inspection terrain, archives papier |
| `csv` | `text/csv; charset=utf-8` | Compta / direction (Excel) |

**Réponse `200` :** fichier binaire — **pas** de wrapper JSON. Header `Content-Disposition: attachment`.

**Erreurs :** `SHEET_NOT_SEALED` · `SHEET_SEAL_INCOMPLETE` (400) · 404 feuille hors école.

**Audit :** `ATTENDANCE_SHEET_EXPORTED`.

**Archives :** `GET /admin/presences/sheets/pending?status=SEALED` liste les feuilles téléchargeables.

**Frontend :** `presencesApi.exportSheetRegister` · `useExportAttendanceSheet` · `AttendanceSheetExportButtons` (modale scellée + onglet Archives).

Voir aussi : `docs/ATTENDANCE_SHEET_WORKFLOW.md` · `frontend_web/docs/ADMIN_PRESENCE_INTEGRATION.md`.

---

## Libellés métier (UI)

Le frontend ne doit **pas** exposer `fraudScore`, `isLocked`, `isPaymentLocked` bruts. Utiliser `src/lib/business-labels.ts` :

| Technique | Libellé utilisateur |
|-----------|---------------------|
| `fraudScore >= 70` ou `suspicion` | Vérification requise |
| `fraudScore >= 40` | Contrôle recommandé |
| `isPaymentLocked` | Paiement suspendu |
| `biometricStatus !== READY` | Enrôlement en attente / à reprendre |

---

## Notifications — DLQ & broadcast (juil. 2026)

> Détail architecture : [notification-architecture.md](./notification-architecture.md) · OpenAPI : `openapi/admin.json`

### `GET /admin/notifications/dlq`

Liste les livraisons **DEAD** (SMS, email, push) pour l'école de l'admin.

| | |
|--|--|
| **Rôles** | `ADMIN` |
| **Query** | `limit` (défaut 50, max 200) |

**Réponse `200` :** `data: NotificationDlqItem[]` — voir [types/notification.types.ts](./types/notification.types.ts).

### `POST /admin/notifications/dlq/{deliveryId}/retry`

Relance manuelle : remet la livraison et l'outbox en `PENDING`, reprogramme le worker.

| | |
|--|--|
| **Rôles** | `ADMIN` |
| **Params** | `deliveryId` (cuid, path) |

**Réponse `404` :** livraison hors école ou non DEAD.

### `POST /admin/notifications/broadcast-group`

Annonce à un ou plusieurs rôles. **≥ 3 destinataires** → file BullMQ `notification-fanout`. Canaux : WebSocket, email, push, SMS (si préférence active).

---

## Matrice RBAC récapitulative

| Route | ADMIN | SUPER_ADMIN | FINANCE |
|-------|:-----:|:-----------:|:-------:|
| `GET …/enrollments/sessions` | ✓ | ✓ | — |
| `POST …/enrollments/{id}/sessions` | ✓ | ✓ | — |
| `PATCH …/enrollments/{id}/admin-profile` | ✓ | ✓ | — |
| `GET …/pending-verifications/export` | ✓ | ✓ | ✓ |
| `POST …/verifications/{id}/mark-processed` | ✓ | ✓ | — |
| `PATCH/POST …/security-events/{id}/*` | ✓ | ✓ | — |
| `GET/POST …/admin/notifications/dlq*` | ✓ | — | — |
| `GET/POST …/admin/presences/*` (module) | ✓ | ✓ | — |
| `GET …/presences/sheets/{id}/export` | ✓ | ✓ | — |

---

## Fichiers frontend associés

| Couche | Fichier |
|--------|---------|
| API | `src/lib/admin/api/enrollments.api.ts`, `finance.api.ts`, `presences.api.ts` |
| Hooks | `src/lib/hooks/use-admin.ts` |
| Schémas UI | `src/lib/schemas/enrollment-actions.ts` |
| Composants | `enrollment-business-drawers.tsx`, `admin-profile-modal.tsx`, `AttendanceSheetExportButtons.tsx` |
| Pages | `admin/enrollments`, `admin/students/[id]`, `admin/finance/paiements`, `admin/presences` |

---

## Voir aussi

- [`enrollment-architecture.md`](./enrollment-architecture.md) — flux inscription global
- [`web-admin-payment-handoff.md`](./web-admin-payment-handoff.md) — workflow vérification paiement
- [`admin-README.md`](./admin-README.md) — index module admin
- [`notification-architecture.md`](./notification-architecture.md) — outbox, SMS, DLQ, fan-out
