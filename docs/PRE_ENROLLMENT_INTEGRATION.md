# Pré-inscription web — frontend

Aligné sur `backend/docs/PRE_ENROLLMENT_INTEGRATION.md`.

## Identité RDC (studentInfo)

| Champ UI | Clé API | Requis |
|----------|---------|--------|
| Nom | `lastName` | Oui |
| Postnom | `postnom` | Oui |
| Prénom | `firstName` | Oui |
| Prénom administratif | `prenom` | Non |

Affichage liste : `formatRdcFullName()` · sous-titre legacy : `formatStudentFullName()`.

## Fichiers

- `src/types/pre-enrollment.ts`
- `src/app/(admin)/admin/pre-enrollments/page.tsx`
- `src/lib/admin/api/pre-enrollment.api.ts`

## Identité RDC (guide complet)

`docs/RDC_IDENTITY_INTEGRATION.md`
