# API Mobile Enseignant — Spécification Présences

> **Audience :** app Flutter enseignant · **Base :** `{host}/api/v1/mobile/teachers`  
> **Auth :** Bearer JWT, rôle `TEACHER`  
> **OpenAPI machine-readable :** `backend/src/docs/openapi-teacher-mobile.json` (généré via `npm run docs:teacher-openapi`)

Dernière alignement : orchestrateur présences partagé admin / teacher (`PresenceRecordOrchestrator`).

---

## Enveloppe de réponse

Toutes les routes renvoient :

```json
{
  "success": true,
  "message": "Message métier",
  "data": { },
  "timestamp": "2026-06-29T08:00:00.000Z",
  "statusCode": 201
}
```

Erreurs de validation (**400**) :

```json
{
  "success": false,
  "message": "Données invalides",
  "errors": [{ "path": "entries.0.studentId", "message": "…" }]
}
```

---

## Statuts HTTP présences (201 / 202 / 400)

| Code | Signification |
|------|----------------|
| **201** | Succès complet — nouvelle présence ou batch entièrement créé |
| **202** | Succès partiel ou rejeu — doublon jour, idempotence, échecs partiels |
| **400** | Validation Zod ou échec métier total (ex. sync offline sans aucun succès) |

### Règles orchestrateur

| Endpoint | 201 | 202 | 400 |
|----------|-----|-----|-----|
| `POST /scan` | nouvelle présence | `idempotentReplay` ou `isSameDayDuplicate` | validation / erreur métier |
| `POST /scan/qr` | succès | — | token manquant / invalide |
| `POST /classes/:classId/attendance-sheet` | tous les élèves créés | échecs et/ou doublons | validation |
| `POST /sync` | batch entièrement OK | succès partiel | **échec total** (0 succès, 0 doublon) |

**Client Flutter :** traiter **201 et 202 comme succès HTTP** ; inspecter le corps (`data`, flags, buckets) pour l’UI.

---

## Types partagés

### `PresenceStatus`

`PRESENT` · `LATE` · `ABSENT`

### `PresenceRecordResult` (scan unitaire)

```json
{
  "id": 501,
  "status": "PRESENT",
  "studentName": "Jean Mukendi",
  "fraudScore": 0.1,
  "idempotentReplay": false,
  "isSameDayDuplicate": false
}
```

### `BulkPresenceRecordResult` (cahier d’appel + sync)

```json
{
  "succeeded": [
    {
      "studentId": 42,
      "presenceId": 501,
      "status": "PRESENT",
      "studentName": "Jean Mukendi",
      "idempotentReplay": false,
      "isSameDayDuplicate": false
    }
  ],
  "failed": [
    { "studentId": 99, "error": "Élève introuvable", "code": "BAD_REQUEST" }
  ],
  "duplicates": [],
  "sheetId": 12,
  "sheetStatus": "SUBMITTED"
}
```

> Même forme que l’admin `POST /api/v1/admin/presences/bulk`. Workflow **Phase B** : chaque bulk crée ou met à jour une `AttendanceSheet` (`DRAFT` → `SUBMITTED` → `SEALED`).

---

## Endpoints présences

### `POST /scan` — Pointage multi-mode

Pointage principal (QR legacy, NFC, biométrie, facial, manuel).

**Headers optionnels**

| Header | Description |
|--------|-------------|
| `Idempotency-Key` | UUID client (prioritaire sur le body) |
| `x-correlation-id` | Traçabilité logs |

**Body (champs requis :** `studentId`, `classId`, `scannedAt`, `deviceId`**)**

```json
{
  "studentId": 42,
  "classId": 7,
  "scanMethod": "QR_CODE",
  "scanData": "payload-optionnel",
  "scannedAt": "2026-06-29T08:00:00.000Z",
  "deviceId": "device-uuid",
  "gpsLat": -4.32,
  "gpsLng": 15.31,
  "gpsAccuracy": 10,
  "isOffline": false,
  "idempotencyKey": "uuid-10-a-128-caracteres",
  "note": "max 200 car."
}
```

`scanMethod` : `QR_CODE` | `NFC` | `BIOMETRIC` | `FACIAL` | `MANUAL`  
Le serveur vérifie que le mode est autorisé pour l’école (`enabledPresenceModes`).

**Réponses**

- **201** → `data: PresenceRecordResult` (nouveau pointage)
- **202** → `data` avec `idempotentReplay: true` et/ou `isSameDayDuplicate: true`
- **400** → validation ou refus métier

---

### `POST /scan/qr` — QR signé v2

**Body** (au moins un champ requis) :

```json
{
  "qrToken": "keyId:schoolId:studentId:timestamp:signature",
  "deviceId": "device-uuid"
}
```

Alias acceptés : `qrPayload`, `scanData`.

| Status | `data` |
|--------|--------|
| **201** | `PresenceRecordResult` |
| **400** | token absent / signature invalide |

---

### `GET /classes/{classId}/attendance-sheet/draft` — Brouillon cahier

Pré-remplit la feuille depuis les inscriptions actives (tous `PRESENT` par défaut), puis **hydrate** les lignes avec les présences déjà enregistrées ce jour (`presenceId`, statut réel).

**Query :** `sessionDate` (optionnel, ISO)

**Réponse 200 :** `data: AttendanceSheetDraft`

```json
{
  "id": 12,
  "classId": 7,
  "className": "3ème A",
  "sessionDate": "2026-06-29T00:00:00.000Z",
  "status": "DRAFT",
  "lines": [
    {
      "studentId": 42,
      "studentName": "Jean Mukendi",
      "matricule": "ELV-001",
      "status": "PRESENT",
      "reasonCode": "PRESENT_ON_TIME",
      "presenceId": 101
    }
  ]
}
```

> `presenceId` non null = élève déjà pointé aujourd'hui (live, QR, saisie antérieure ou soumission précédente).

---

### `POST /classes/{classId}/attendance-sheet` — Cahier d’appel

Enregistrement groupé manuel par classe (équivalent admin bulk, `scanMethod: MANUAL`).

**Path :** `classId` (entier > 0)

**Body**

```json
{
  "sessionDate": "2026-06-29T08:00:00.000Z",
  "idempotencyKey": "batch-uuid-optionnel",
  "entries": [
    { "studentId": 42, "status": "PRESENT" },
    { "studentId": 43, "status": "LATE", "reasonCode": "LATE_BEFORE_REGISTER" },
    { "studentId": 44, "status": "ABSENT", "reasonCode": "ABSENCE_UNAUTHORIZED" }
  ]
}
```

| Champ | Règles |
|-------|--------|
| `entries` | 1 à 200 lignes `{ studentId, status, reasonCode?, note? }` |
| `reasonCode` | **obligatoire** si `status` = `ABSENT` ou `LATE` (codes DfE/CEDS) |
| `sessionDate` | optionnel, max 30 jours rétroactif |
| `idempotencyKey` | optionnel ; idempotence **par feuille** |

**Réponses**

- **201** → `data: BulkPresenceRecordResult` + `sheetId`, `sheetStatus: SUBMITTED` (y compris replay sur lignes déjà liées)
- **202** → `data` avec `failed` et/ou `duplicates` non vides (tentative de recréation même jour)
- **400** → validation

**Exemple UI Flutter**

1. `GET /classes/{classId}/attendance-sheet/draft` — pré-remplissage + hydratation
2. Modifier exceptions (ABSENT/LATE + `reasonCode`) ; ignorer les lignes déjà `presenceId` si lecture seule
3. `POST /classes/{classId}/attendance-sheet` — soumettre (une fois)
4. `POST .../attendance-sheet/{sheetId}/seal` — clôturer la séance (ne pas re-soumettre si `SUBMITTED`)

---

### `POST /classes/{classId}/attendance-sheet/{sheetId}/seal` — Clôturer

Scelle la feuille (`SEALED`) + `sheetAuditSeal`. Lecture seule ensuite.

**Réponse 200 :** `data: { sheetId, status, sealedAt, sheetAuditSeal, lineCount, presenceCount }`

---

### `POST /sync` — Synchronisation offline

Jusqu’à **100** pointages en attente.

**Body**

```json
{
  "batch": [
    {
      "studentId": 42,
      "classId": 7,
      "scanMethod": "QR_CODE",
      "scannedAt": "2026-06-29T07:55:00.000Z",
      "deviceId": "device-uuid",
      "idempotencyKey": "offline-item-1"
    }
  ],
  "metadata": {
    "syncStartedAt": "2026-06-29T08:00:00.000Z",
    "totalItems": 1,
    "deviceId": "device-uuid",
    "batteryLevel": 85
  }
}
```

**Réponse `data` (`OfflineSyncSummary`)**

```json
{
  "batchId": "uuid",
  "total": 2,
  "processedAt": "2026-06-29T08:00:00.000Z",
  "deviceId": "device-uuid",
  "succeeded": [ ],
  "failed": [ ],
  "duplicates": [ ],
  "items": [
    { "ok": true, "presenceId": 501, "studentId": 42, "idempotentReplay": false, "reused": false },
    { "ok": false, "studentId": 99, "error": "Élève introuvable" }
  ]
}
```

| Status | Quand |
|--------|-------|
| **201** | Tous les items créés |
| **202** | Au moins un succès **et** des échecs ou doublons |
| **400** | Échec total du batch |

Chaque item du `batch` accepte `idempotencyKey` (même sémantique que `/scan`).

---

### `PATCH /presence/{presenceId}/validate` — Validation manuelle

Corrige une présence suspecte après contrôle humain.

- **Body :** optionnel (raison)
- **200** → présence validée dans `data`
- **401 / 403** → auth / classe non assignée

---

## Parité admin web (référence)

| Admin (`/api/v1/admin/presences`) | Teacher mobile |
|-----------------------------------|----------------|
| `POST /record` | `POST /scan` (unitaire) |
| `POST /bulk` | `POST /classes/:classId/attendance-sheet` |
| — | `POST /sync` (offline) |
| `PATCH /:id/validate` | `PATCH /presence/:presenceId/validate` |

Contrats Zod frontend : `docs/api-contracts/types/presence.validation.ts`  
Utilitaires UI admin : `src/lib/presence/presence-response.utils.ts`

---

## Idempotence — bonnes pratiques client

1. Générer un UUID par tentative de scan (`Idempotency-Key` header ou `body.idempotencyKey`).
2. Pour un cahier d’appel, une clé batch + suffixe `:{studentId}` côté serveur.
3. En cas de timeout réseau, **réessayer avec la même clé** → **202** + `idempotentReplay: true` (pas de doublon en base).
4. Ne pas confondre :
   - `idempotentReplay` → rejeu réseau (même requête)
   - `isSameDayDuplicate` → élève déjà pointé aujourd’hui

---

## Routes complémentaires (hors présences)

| Méthode | Route | Usage |
|---------|-------|-------|
| `GET` | `/dashboard` | Stats + classes assignées |
| `GET` | `/my-classes` | Alias classes |
| `GET` | `/classes/{classId}/students` | Liste élèves + dernier scan |
| `GET` | `/student/{id}/profile` | Fiche élève |
| `GET` | `/notifications` | Notifications |
| `GET` | `/notifications/unread-count` | Badge |

---

## 7. Mode Remise — cartes parent (aucune présence)

Base identique `{host}/api/v1/mobile/teachers`. **Écran distinct** du scan matin.

Passation : `backend/src/docs/flutter-teacher-pickup.md` · OpenAPI schémas `PickupPreview` / `PickupConfirm`.

| Endpoint | HTTP | Corps | Effet |
|----------|------|-------|--------|
| `POST /pickup/preview` | 200 | `{ "qrPayload": "<json caméra>" }` | Enfants autorisés pour **cette** carte |
| `POST /pickup/confirm` | 201 | `{ "qrPayload", "studentIds": [2] }` | Enregistre la remise |

QR parent : `{ "v": 1, "kind": "pickup", "t": "…" }`.  
QR élève dans Remise → `400 PICKUP_USE_PRESENCE_MODE`.  
QR parent dans `/scan/qr` → `400 PICKUP_USE_REMISE_MODE`.

**Client Flutter :** ne pas réutiliser `scanQr()`. Pas d’offline v1. Afficher `data.children[]` seulement.

---

## Environnements

| Env | Base URL |
|-----|----------|
| Local | `http://localhost:5000/api/v1/mobile/teachers` |
| Staging | `https://gestion-presence-et-paiement-mobile.onrender.com/api/v1/mobile/teachers` |

---

## Checklist intégration Flutter

- [ ] Intercepter **201** et **202** comme succès
- [ ] Parser `BulkPresenceRecordResult` pour attendance-sheet et sync
- [ ] Persister `idempotencyKey` localement avant envoi offline
- [ ] Afficher feedback par élève sur échecs / doublons
- [ ] Respecter `enabledPresenceModes` école avant d’activer un mode scan
- [ ] Tester rejeu réseau sur `/scan` (même clé → 202, pas de double insertion)
- [ ] **Remise :** bouton distinct · `POST /pickup/preview` + `/confirm` · ne jamais envoyer un QR `kind:pickup` à `/scan/qr`
