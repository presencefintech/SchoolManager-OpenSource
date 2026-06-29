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
  "duplicates": []
}
```

> Même forme que l’admin `POST /api/v1/admin/presences/bulk`. Le frontend web admin consomme ce contrat via `src/lib/presence/presence-response.utils.ts`.

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
    { "studentId": 43, "status": "LATE" },
    { "studentId": 44, "status": "ABSENT" }
  ]
}
```

| Champ | Règles |
|-------|--------|
| `entries` | 1 à 200 lignes `{ studentId, status }` |
| `sessionDate` | optionnel, max 30 jours rétroactif |
| `idempotencyKey` | optionnel ; clé par élève = `{key}:{studentId}` |

**Réponses**

- **201** → `data: BulkPresenceRecordResult` (tout nouveau)
- **202** → `data` avec `failed` et/ou `duplicates` non vides
- **400** → validation

**Exemple UI Flutter**

1. Charger les élèves : `GET /classes/{classId}/students`
2. Construire `entries` depuis la grille PRESENT / LATE / ABSENT
3. Envoyer le batch ; afficher le résumé `{ succeeded, failed, duplicates }`
4. Sur **202**, surligner les lignes en échec (rouge) et doublons (ambre) — même logique que `BulkPresenceGrid` admin

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
