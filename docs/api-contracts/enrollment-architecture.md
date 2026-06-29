# Architecture inscription (Enrollment)

**Version :** juin 2026  
**Public :** équipes frontend web (super-admin, admin école)  
**Backend :** `backend/src/docs/enrollment-architecture.md` (copie synchronisée)  
**Contrats :** `types/enrollment.validation.ts`, `openapi/superadmin.json`

---

## Vue d'ensemble

L'inscription suit un modèle **SaaS multi-tenant** : un schéma métier unique, des **défauts par école** (pas de constantes globales), et des **points d'entrée** distincts selon le rôle.

```
                    ┌─────────────────────────────────────┐
                    │  types/enrollment.validation.ts     │
                    │  AdminEnrollmentSchema              │
                    │  SuperAdminCreateStudentBodySchema  │
                    └──────────────┬──────────────────────┘
                                   │
          ┌────────────────────────┼────────────────────────┐
          ▼                        ▼
   POST /admin/enrollments   POST /superadmin/enrollment
          │                        │
          └────────────┬───────────┘
                       ▼
        EnrollmentDefaultsService (backend)
                       ▼
           EnrollmentOrchestrator → Student + QR + PDF
```

---

## Super-admin — ce que le frontend doit savoir

### Champs minimum (rétrocompatible)

Le formulaire actuel à 6 champs reste valide :

```typescript
{
  firstName, lastName, birthDate, gender, schoolId, classId
}
```

Les champs manquants sont complétés **côté serveur** depuis la config école.

### Champs recommandés à ajouter progressivement

| Champ UI | Pourquoi |
|----------|----------|
| `placeOfBirth` | Éviter le défaut automatique ville école |
| `nationality` | Éviter le défaut région tenant |
| `overrideReason` | Traçabilité intervention plateforme (**obligatoire dans l'UI super-admin**, min 10 car.) |
| `photo` | Carte élève PDF à la création |
| `totalFees` / `feesPaid` | Si override manuel des barèmes |

### Type TypeScript frontend

Importer depuis les contrats :

```typescript
import type { SuperAdminEnrollmentInput } from '@/docs/api-contracts/types/enrollment.validation'
// ou dupliquer dans src/types/super-admin.ts aligné sur le contrat
```

### Réponse `201`

```typescript
interface EnrollmentCreateResult {
  student: { id: number; firstName: string; lastName: string; matricule: string; ... }
  qrcode: string | null
  message: string
  pdfCard?: string        // base64 PDF
  pdfWarning?: string     // si génération carte échouée
}
```

---

## Configuration école (prérequis ops)

Avant de tester l'inscription super-admin sur une école :

1. `AcademicSession` avec `isCurrent: true`
2. Optionnel : `School.settings.enrollment` (nationalité, lieu de naissance)
3. Optionnel : `FeeStructure` pour pré-remplir `totalFees`

---

## Routes super-admin liées

| Méthode | Route | Usage |
|---------|-------|-------|
| `POST` | `/superadmin/enrollment` | Créer élève (intervention) |
| `GET` | `/superadmin/enrollment/audit/worker/{schoolId}` | Santé biométrie IA |
| `GET` | `/superadmin/enrollment/audit/finance/{schoolId}` | Intégrité financière |
| `GET` | `/superadmin/enrollment/{id}/integrity` | Détail élève + signature |
| `PUT` | `/superadmin/enrollment/{id}/biometrics` | Injection vecteur facial |
| `PATCH` | `/superadmin/enrollment/{id}/lock` | Verrou financier |
| `DELETE` | `/superadmin/enrollment/{id}/purge` | Purge RGPD |

OpenAPI détaillé : [`openapi/superadmin.json`](./openapi/superadmin.json).

---

## Admin école — actions métier (juin 2026)

Routes complémentaires pour le directeur d'école (inscription session, profil admin, paiements, alertes présence).

**Guide détaillé :** [`admin-business-actions.md`](./admin-business-actions.md)

| Méthode | Route | Usage UI |
|---------|-------|----------|
| `GET` | `/admin/enrollments/sessions` | Liste sessions (drawer inscription) |
| `POST` | `/admin/enrollments/{studentId}/sessions` | Inscrire à une session |
| `PATCH` | `/admin/enrollments/{studentId}/admin-profile` | Profil administratif / médical |
| `GET` | `/admin/finance/payments/pending-verifications/export` | Export CSV vérifications |
| `POST` | `/admin/finance/payments/verifications/{verificationId}/mark-processed` | Clôturer vérification |
| `PATCH` | `/admin/presences/security-events/{eventId}/dismiss` | Ignorer alerte |
| `PATCH` | `/admin/presences/security-events/{eventId}/validate` | Valider présence |
| `POST` | `/admin/presences/security-events/{eventId}/notify` | Notifier parent |

Schémas Zod : `EnrollSessionSchema`, `AdminAdministrativeProfileSchema` dans [`types/enrollment.validation.ts`](./types/enrollment.validation.ts).
