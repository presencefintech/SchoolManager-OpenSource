# Cartes remise (parents / personnes autorisées)

Source de vérité produit + API.  
Passation Flutter : `src/docs/flutter-teacher-pickup.md` (sync : `frontend/docs/flutter-teacher-pickup.md`)  
Passation web : `src/docs/web-admin-pickup-handoff.md` · `frontend_web/docs/PICKUP_CARDS.md`

**Dernière mise à jour :** 15 août 2026

---

## Produit

**Déclarer d’abord, imprimer ensuite.** Sans liste d’adultes autorisés, aucune carte n’est générée.

1. Au guichet, le parent déclare les enfants de l’école et les personnes autorisées : nom, photo, téléphone, pièce, quels enfants.
2. Une carte CR80 **par adulte** (pas par enfant) : photo de l’adulte + QR `{ "v": 1, "kind": "pickup", "t": "<publicToken>" }`.
3. Le soir, l’enseignant ouvre le **mode Remise** de l’app — **pas** le scan présence du matin — vise le QR, coche les enfants qui sortent, valide.
4. Exception (personne non déclarée) : laissez-passer du jour (bouton **Sortie**) + appel au parent + pièce.

Exemples :

- Maman → Marie + Nathan
- Chauffeur → Nathan seulement (Marie n’apparaît pas)
- Tante → Marie seulement

## Règle d’or

| Mode | QR | Effet |
|------|-----|--------|
| Présence (matin) | carte **élève** `{ v:1, studentId }` | Pointage `Presence` |
| Remise (15 h) | carte **parent** `{ v:1, kind:"pickup", t }` | Liste d’enfants, **aucune présence** |

Un QR parent scanné en présence → `400 PICKUP_USE_REMISE_MODE`.  
Un QR élève scanné en remise → `400 PICKUP_USE_PRESENCE_MODE`.

Deux boutons distincts. Même caméra, autre écran.

---

## API guichet (IT / ADMIN)

Préfixe : `/api/v1`

| Action | Route |
|--------|--------|
| Liste foyer + adultes | `GET /admin/enrollments/:studentId/pickup` |
| Déclarer un adulte | `POST /admin/enrollments/:studentId/pickup/adults` |
| Photo | `POST /admin/pickup/adults/:id/photo` (multipart `photo`, JPEG/PNG/WebP, max 2 Mo) |
| Enfants autorisés | `PUT /admin/pickup/adults/:id/children` `{ studentIds }` |
| Carte PDF | `GET /admin/pickup/adults/:id/card/pdf` (`?reissue=1` si perdue) |
| Toutes les cartes du foyer | `GET /admin/enrollments/:studentId/pickup/cards/pdf` |
| Révoquer | `POST /admin/pickup/adults/:id/revoke` |
| Dossiers sans tuteur remise | `GET /admin/students/desk/incomplete?gap=pickup` |

Impression refusée sans photo (`PICKUP_PHOTO_REQUIRED`) ou sans enfant (`PICKUP_NO_CHILDREN`).

OpenAPI : `swagger-docs/admin.json` · Swagger UI `/api-docs/admin`.

## API enseignant

Base : `/api/v1/mobile/teachers`  
Rôle : `TEACHER` · JWT Bearer

Le QR lu par la caméra se transmet tel quel (`qrPayload`, ou `qrToken` / `scanData`).

| Action | Route | HTTP | Effet |
|--------|--------|------|--------|
| Aperçu | `POST /pickup/preview` `{ qrPayload }` | 200 | Enfants **autorisés pour cette carte seulement**. Aucune présence. |
| Confirmer | `POST /pickup/confirm` `{ qrPayload, studentIds }` | 201 | Enregistre la remise. Aucune présence. |

Rate limit : 45 scans / min (prod), 180 (dev) → `429` / `PICKUP_RATE_LIMIT`.

OpenAPI : `src/docs/openapi-teacher-mobile.json` · Swagger UI `/api-docs/teacher-mobile`.

### Codes d’erreur

| Code | Quand | UI |
|------|--------|-----|
| `PICKUP_USE_REMISE_MODE` | QR parent dans `/scan/qr` | « Ouvrez le mode Remise » |
| `PICKUP_USE_PRESENCE_MODE` | QR élève en Remise | « Utilisez le scan présence du matin » |
| `PICKUP_QR_INVALID` | JSON illisible / pas `kind:pickup` | « Visez le QR de la carte adulte » |
| `PICKUP_CARD_REVOKED` | Carte ou adulte révoqué | « Cette carte n’est plus valable » |
| `PICKUP_NO_CHILDREN` | Aucun enfant actif sur la carte | « Aucun enfant autorisé » |
| `PICKUP_CHILD_NOT_AUTHORIZED` | `studentIds` hors de la carte | Ne pas proposer ces ids |
| `PICKUP_RATE_LIMIT` | Trop de scans | Réessayer dans 1 min |
| `PICKUP_PHOTO_REQUIRED` | Impression guichet sans photo | Guichet seulement |
| `PICKUP_ADULT_REVOKED` | Mutation sur adulte révoqué | Guichet seulement |

Le champ `code` (ou `errorCode`) de l’enveloppe d’erreur est la clé à afficher. Le `message` FR peut être montré tel quel.

---

## UI guichet (`frontend_web`) — livré

| Écran | Fichier | Rôle |
|-------|---------|------|
| Fiche 360 | `PickupAdultsPanel` · `?doc=pickup` | Déclarer, photo, enfants, imprimer, révoquer |
| Accueil guichet | `/admin/desk` filtre **Remise** | Élèves sans adulte déclaré |
| Cartes élèves | `/admin/cards` | **Présence du matin seulement** — pas les cartes parent |
| Exception | bouton **Sortie** | Laissez-passer du jour |

Client API : `src/lib/admin/api/pickup.api.ts`.

## UI Flutter — à brancher

Écran **`TeacherPickupReleaseScreen`** — **ne pas** réutiliser `TeacherQrScanScreen` / `POST /scan/qr`.

Détail écran par écran, JSON, checklist : `src/docs/flutter-teacher-pickup.md` (repo Flutter : `docs/flutter-teacher-pickup.md`).

---

## Frais (plus tard)

Ne pas vendre « du plastique ». Offre école : sécurité + temps (pack rentrée : 2 badges ; personne supplémentaire / duplicata payants). Catalogue frais = ADMIN / FINANCE, pas l’IT.
