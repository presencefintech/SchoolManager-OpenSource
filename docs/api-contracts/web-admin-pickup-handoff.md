# Passation web — Cartes remise (guichet)

**Pour :** app web (`frontend_web`) — rôles `ADMIN`, `IT`  
**Statut UI :** **livré** (août 2026)  
**Produit :** [`docs/PICKUP_CARDS.md`](../../docs/PICKUP_CARDS.md)  
**OpenAPI :** `swagger-docs/admin.json` · `/api-docs/admin`

---

## Ce qui est en production code

Le secrétariat déclare les personnes autorisées **avant** d’imprimer. 1 carte CR80 par adulte (photo + QR `kind:pickup`). Ce n’est **pas** la page `/admin/cards` (cartes élèves / présence du matin).

| Écran | Route UI | Comportement |
|-------|----------|----------------|
| Fiche élève 360 | `/admin/students/:id` · `?doc=pickup` | Bloc **Remise — personnes autorisées** |
| Accueil guichet | `/admin/desk` | Filtre **Remise**, compteur **Sans remise** |
| Liste élèves | menu → `?doc=pickup` | Raccourci fiche |
| Cartes élèves | `/admin/cards` | Bandeau : cartes parent = fiche élève |
| Exception | bouton **Sortie** | Laissez-passer ; pas une carte remise |

Fichiers :

| Couche | Fichier |
|--------|---------|
| API | `src/lib/admin/api/pickup.api.ts` |
| Panel | `src/components/admin/students/PickupAdultsPanel.tsx` |
| Fiche 360 | `src/app/(admin)/admin/students/[id]/page.tsx` (bouton Remise + Sortie) |
| Guichet | `src/app/(admin)/admin/desk/page.tsx` (`gap=pickup`) |
| Inscription | `enrollment-create-modal.tsx` (rappel après foyer) |

---

## API (déjà consommée par le panel)

Préfixe `/api/v1` · JWT `ADMIN` / `IT` / `SUPER_ADMIN`.

| Méthode | Path |
|---------|------|
| `GET` | `/admin/enrollments/{studentId}/pickup` |
| `POST` | `/admin/enrollments/{studentId}/pickup/adults` |
| `GET` | `/admin/enrollments/{studentId}/pickup/cards/pdf` |
| `PATCH` | `/admin/pickup/adults/{adultId}` |
| `PUT` | `/admin/pickup/adults/{adultId}/children` `{ studentIds }` |
| `POST` | `/admin/pickup/adults/{adultId}/photo` multipart `photo` |
| `GET` | `/admin/pickup/adults/{adultId}/card/pdf?reissue=1` |
| `POST` | `/admin/pickup/adults/{adultId}/revoke` |
| `GET` | `/admin/students/desk/incomplete?gap=pickup` → `counts.pickup` |

Impression : photo + ≥ 1 enfant, sinon `PICKUP_PHOTO_REQUIRED` / `PICKUP_NO_CHILDREN`.

File **Tous** : ne liste pas les élèves qui n’ont *que* le manque remise (écoles existantes). Le chip **Remise** le fait.

---

## Règles métier à ne pas casser

1. Ne pas forcer l’élève courant sur un nouvel adulte (un chauffeur déclaré sur Marie peut n’autoriser que Nathan).
2. Le foyer (fratrie `ParentStudent`) sert à cocher les enfants — pas à dupliquer le chauffeur.
3. QR parent ≠ QR élève. Ne jamais envoyer un payload pickup à une route carte élève.
4. Personne non déclarée → **Sortie**, pas une carte.
5. Frais / duplicatas : hors scope (ADMIN / FINANCE plus tard).

---

## Flutter (repo `frontend/`)

Le scan du soir est l’app enseignant : `docs/flutter-teacher-pickup.md` (sync `npm run docs:sync-frontend`).
