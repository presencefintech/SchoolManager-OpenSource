# Flutter — Mode Remise (cartes parent)

**Public :** app enseignant (`frontend/`)  
**Statut :** backend + écran Flutter branchés (`TeacherPickupReleaseScreen`)  
**Produit :** `docs/PICKUP_CARDS.md` (backend) — copié à côté de ce fichier dans le repo Flutter.  
**OpenAPI :** `openapi-teacher-mobile.json` → `POST /pickup/preview`, `POST /pickup/confirm` (`x-flutter-ui.screen` = `TeacherPickupReleaseScreen`)  
**Swagger :** `http://127.0.0.1:5000/api-docs/teacher-mobile`

**Dernière mise à jour :** 15 août 2026

---

## 1. Ce qu’il faut coder (et seulement ça)

Un **deuxième bouton** à côté du scan présence du matin.

| | Présence (existant) | Remise (branché) |
|--|---------------------|------------------|
| Écran | `TeacherQrScanScreen` / Dual-QR | **`TeacherPickupReleaseScreen`** (nouveau) |
| Route | `POST /scan/qr` | `POST /pickup/preview` puis `/pickup/confirm` |
| QR | `{ "v":1, "studentId": … }` | `{ "v":1, "kind":"pickup", "t":"…" }` |
| Effet | Ligne `Presence` | Liste d’enfants + enregistrement remise |
| Offline | file `sync` | **Pas d’offline** pour v1 (réseau requis) |

**Interdit :**

- Réutiliser `TeacherRepository.scanQr` / `POST /scan/qr` pour une carte parent.
- Pointer une présence, un EXIT, ou un cahier d’appel.
- Afficher tous les élèves de la classe : uniquement `data.children` de la carte.

L’agent au préau (enseignant) voit **tous** les enfants autorisés **de cette carte** dans l’école, pas seulement sa classe.

---

## 2. Flux écran

```
[Hub / dashboard]
    │  bouton « Remise » (15 h) — distinct de « Présence »
    ▼
[Caméra]  lire le QR tel quel (string JSON)
    │
    ▼
POST /pickup/preview  { "qrPayload": "<string caméra>" }
    │
    ├─ 400 PICKUP_USE_PRESENCE_MODE → « Carte élève — scan présence du matin »
    ├─ 400 PICKUP_QR_INVALID        → « Visez le QR de la carte adulte »
    ├─ 400 PICKUP_CARD_REVOKED      → « Cette carte n’est plus valable »
    └─ 200
         photo + nom adulte
         cases à cocher : children[] (name, className)
         alreadyReleasedToday = true → case cochable mais badge « déjà remis »
    │
    ▼  enseignant coche qui sort MAINTENANT
POST /pickup/confirm  { "qrPayload": "<même string>", "studentIds": [2, 5] }
    │
    └─ 201 → snackbar « Appelez les enfants » + reset caméra
```

Garder `qrPayload` en mémoire entre preview et confirm (même scan). Ne pas re-scanner pour confirmer.

---

## 3. API

Base : `{host}/api/v1/mobile/teachers`  
Auth : `Authorization: Bearer <JWT TEACHER>` (même client Dio que le scan).

Champs QR acceptés (le premier non vide gagne) : `qrPayload` · `qrToken` · `scanData`.  
Recommandé : **`qrPayload`** — aligné sur `TeacherRepository.scanQr`.

### `POST /pickup/preview` → 200

```json
{
  "success": true,
  "message": "Enfants autorisés pour cette carte",
  "statusCode": 200,
  "data": {
    "mode": "PICKUP",
    "cardId": 12,
    "adult": {
      "id": 4,
      "name": "MUKENDI Jeanne",
      "photoUrl": "https://…",
      "relationship": "Mère",
      "phone": "+243900000000"
    },
    "children": [
      {
        "id": 2,
        "name": "KABONGO Nathan",
        "className": "3e primaire",
        "status": "ACTIVE",
        "alreadyReleasedToday": false
      }
    ]
  }
}
```

### `POST /pickup/confirm` → 201

```json
{
  "qrPayload": "{\"v\":1,\"kind\":\"pickup\",\"t\":\"tokenPickup99xx\"}",
  "studentIds": [2]
}
```

```json
{
  "success": true,
  "message": "Remise enregistrée — appelez les enfants",
  "statusCode": 201,
  "data": {
    "mode": "PICKUP",
    "releaseId": 77,
    "releasedAt": "2026-08-15T16:05:00.000Z",
    "adult": { "id": 4, "name": "MUKENDI Jeanne", "relationship": "Mère" },
    "children": [{ "id": 2, "name": "KABONGO Nathan", "className": "3e primaire", "status": "ACTIVE" }]
  }
}
```

`studentIds` = sous-ensemble de `data.children[].id` du preview. Sinon `400 PICKUP_CHILD_NOT_AUTHORIZED`.

### Erreurs — afficher `message` + mapper `code`

| HTTP | `code` | Message type |
|------|--------|----------------|
| 400 | `PICKUP_USE_PRESENCE_MODE` | Carte élève — scan présence du matin |
| 400 | `PICKUP_QR_INVALID` | QR invalide pour une carte parent |
| 400 | `PICKUP_CARD_REVOKED` | Cette carte n’est plus valable |
| 400 | `PICKUP_NO_CHILDREN` | Aucun enfant actif autorisé |
| 400 | `PICKUP_CHILD_NOT_AUTHORIZED` | Un enfant n’est pas autorisé pour cette carte |
| 404 | — | Carte inconnue dans cet établissement |
| 429 | `PICKUP_RATE_LIMIT` | Trop de scans — réessayez dans une minute |

Si un parent présente sa carte dans le **mauvais** bouton (présence) : `POST /scan/qr` → `400 PICKUP_USE_REMISE_MODE` (« ouvrez le mode Remise »). C’est déjà le backend ; l’UI présence doit afficher ce message, pas un « QR invalide » générique.

---

## 4. Où brancher dans le code existant

Réutiliser Dio teacher (`TeacherRepository` / `_dio` déjà préfixé `/api/v1/mobile/teachers`).

```
lib/features/teacher/
  screens/teacher_pickup_release_screen.dart   ← NOUVEAU
  repositories/teacher_repository.dart         ← previewPickup + confirmPickup
  models/pickup_preview.dart                   ← Freezed optionnel
  routing/                                     ← entrée depuis hub / dashboard
```

Ne pas passer par `presence_teacher_api` SDK tant qu’il n’est pas régénéré : appels Dio comme `scanQr`.

Exemple d’appel (même style que `scanQr`) :

```dart
Future<Map<String, dynamic>> previewPickup(String qrPayload) async {
  final response = await _dio.post<Map<String, dynamic>>(
    '/pickup/preview',
    data: {'qrPayload': qrPayload},
  );
  return response.data?['data'] as Map<String, dynamic>;
}

Future<Map<String, dynamic>> confirmPickup({
  required String qrPayload,
  required List<int> studentIds,
}) async {
  final response = await _dio.post<Map<String, dynamic>>(
    '/pickup/confirm',
    data: {'qrPayload': qrPayload, 'studentIds': studentIds},
  );
  return response.data?['data'] as Map<String, dynamic>;
}
```

Caméra : même package que le scan présence. Après lecture, **si** le JSON contient `"kind":"pickup"` et qu’on est encore sur l’écran présence → toast `PICKUP_USE_REMISE_MODE` **sans** appeler `/scan/qr` (optionnel, le backend refuse déjà).

---

## 5. Compte de test

| | |
|--|--|
| Email | `teacher1@ecole-demo.sn` |
| Mot de passe | `Admin123!` |
| Seed | `npm run seed:local:full` (repo backend) |

Les cartes parent se déclarent au guichet web (`/admin/students/:id?doc=pickup`) puis s’impriment. Pour un test Flutter sans imprimante : copier le JSON QR généré (`kind: pickup`) dans un simulateur de scan.

Local Android émulateur : `http://10.0.2.2:5000/api/v1/mobile/teachers`.

---

## 6. Checklist

- [x] Bouton **Remise** visible, distinct de Présence / Dual-QR
- [x] Caméra → `preview` → liste **uniquement** `children`
- [x] Cases ; `alreadyReleasedToday` = badge, pas un blocage
- [x] Confirm avec les ids cochés + **même** `qrPayload`
- [x] 201 → « Appelez les enfants » puis nouvelle lecture
- [x] Messages `PICKUP_*` affichés (pas un toast générique)
- [x] `/scan/qr` affiche `PICKUP_USE_REMISE_MODE` si carte parent
- [x] Aucun appel `Presence` / `sync` / Dual-QR
- [x] Pas de file offline v1

---

## 7. Prompt IA (à coller dans Cursor sur le repo Flutter)

```
Tu intègres le mode Remise de l’app enseignant Presence (Flutter, repo frontend/).

Backend DÉJÀ prêt. Tu crées TeacherPickupReleaseScreen. Tu NE réutilises PAS TeacherQrScanScreen ni POST /scan/qr.

Contrat : docs/flutter-teacher-pickup.md (ce fichier, syncé depuis le backend).
OpenAPI : openapi-teacher-mobile.json → POST /pickup/preview + POST /pickup/confirm.
Produit : une carte parent = un adulte = N enfants. Le chauffeur ne voit que SES enfants.
Aucune présence n’est enregistrée.

Dio : même client que TeacherRepository.scanQr, chemins '/pickup/preview' et '/pickup/confirm'.
Body : { qrPayload } puis { qrPayload, studentIds }.
Affiche data.adult + cases data.children (name, className). Confirm = ids cochés.

Erreurs : afficher message + code PICKUP_USE_PRESENCE_MODE, PICKUP_QR_INVALID, PICKUP_CARD_REVOKED, PICKUP_CHILD_NOT_AUTHORIZED, PICKUP_RATE_LIMIT.
Sur l’écran présence existant, si /scan/qr renvoie PICKUP_USE_REMISE_MODE, montrer le message (« ouvrez le mode Remise »).

Pas d’offline. Pas de SDK OpenAPI à régénérer pour v1 (Dio suffit).
```
