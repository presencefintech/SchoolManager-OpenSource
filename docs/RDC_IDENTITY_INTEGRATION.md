# Frontend web — identité RDC

Guide d’intégration pour les formulaires admin (inscription, pré-inscription, listes).

---

## Règle d’affichage

| Usage | Helper | Exemple |
|-------|--------|---------|
| Tableaux, badges, toasts | `formatStudentFullName()` | `Jean KABONGO` |
| Exports, détail admin, cartes, reçus | `formatRdcFullName()` ou `formatStudentAdminName()` | `Jean KABONGO MULUMBA` |

Fichier : `src/lib/utils/student-name.util.ts`

---

## Formulaires — ordre des champs (RDC)

1. **Nom** → `lastName` (API)
2. **Postnom** → `postnom` (requis)
3. **Prénom** → `firstName` (requis legacy)
4. **Prénom administratif** → `prenom` (optionnel, si différent)

Si le champ `prenom` est vide à la soumission, ne pas l’envoyer : le backend recopie `firstName`.

---

## Fichiers frontend

| Fichier | Rôle |
|---------|------|
| `src/lib/schemas/enrollment-create.ts` | Zod + payload `POST /admin/enrollments` |
| `src/components/admin/enrollments/enrollment-create-modal.tsx` | Modal inscription |
| `src/app/(admin)/admin/pre-enrollments/page.tsx` | Pré-inscriptions |
| `src/types/pre-enrollment.ts` | Types API pré-inscription |
| `src/types/admin.ts` | `StudentListItem`, `CreateEnrollmentPayload` |
| `docs/api-contracts/types/enrollment.validation.ts` | Contrat partagé |

---

## Payload inscription admin

```typescript
{
  firstName: 'Jean',
  lastName: 'KABONGO',
  postnom: 'MULUMBA',
  prenom: 'Jean-Pierre', // optionnel
  gender: 'MALE',
  birthDate: '2012-05-15',
  classId: 12,
  sectionId: 1,
  optionId: 3,
}
```

---

## Types élève (listes)

```typescript
interface StudentListItem {
  firstName: string
  lastName: string
  postnom?: string | null
  prenom?: string | null
  // fullName calculé côté client si besoin :
  // formatStudentFullName(student)
}
```

---

## Temps réel admin

`parseNewEnrollmentRequest` accepte `fullName`, `legacyFullName`, ou `firstName`+`lastName`.

Préférer `legacyFullName` pour les notifications toast ; `fullName` pour le panneau détail.

---

## Backend

Contrat complet : `backend/docs/RDC_IDENTITY_INTEGRATION.md`
