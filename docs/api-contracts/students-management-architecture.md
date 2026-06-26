# Architecture gestion élèves (SuperAdmin)

**Version :** juin 2026  
**Public :** équipe frontend super-admin  
**Backend :** `backend/src/docs/students-management-architecture.md`  
**Contrats :** `openapi/superadmin.json`, `types/super-admin.ts`

---

## Vue d'ensemble

Le module **students-management** expose une vue plateforme multi-écoles pour le rôle `SUPER_ADMIN`. L'isolation tenant est levée via `AcademicPolicy.allowIfSuperAdmin`, mais chaque consultation sensible est **journalisée** en base (`AuditLog`).

```
/super-admin/students?schoolId=1&studentId=35
        │
        ├─► GET .../schools/{schoolId}/students        (liste)
        ├─► GET .../schools/{id}/students/stats        (KPI école)
        │
        └─► Side panel (clic ligne)
              ├─► GET .../students/{id}/dashboard      → audit SUPERADMIN_STUDENT_PROFILE_VIEW
              ├─► GET .../students/{id}/dossier        → audit SUPERADMIN_STUDENT_DOSSIER_VIEW
              ├─► GET .../students/{id}/activity       → audit SUPERADMIN_STUDENT_ACTIVITY_VIEW
              └─► POST .../security/audit-access       (complément RGPD, fire-and-forget)
```

---

## Parcours UX (frontend)

| Action | Comportement |
|--------|----------------|
| Sélection école | `?schoolId=` dans l'URL |
| Clic élève / débiteur | `?schoolId=&studentId=` + ouverture panneau latéral |
| Fermeture panel | Retrait `studentId`, `Esc`, overlay |
| Partage lien | URL complète recharge la fiche |
| Lien Inscriptions | Panel → `/super-admin/enrollment?schoolId=&studentId=` (diagnostic prérempli) |

**Source de vérité navigation :** query params Next.js (`useSearchParams`), pas de store global pour l'ID élève.

---

## Données exposées vs filtrées

| Zone | API | UI panel |
|------|-----|----------|
| Identité (nom, matricule, classe) | `dashboard.profile` | ✅ |
| Photo URL | `dashboard.profile.photoUrl` | ✅ |
| Stats financières agrégées | `dashboard.stats` | ✅ |
| Historique paiements (10) | `dashboard.history.payments` | ✅ onglet Historique |
| Historique présences (30) | `dashboard.history.presences` | ✅ onglet Historique |
| Timeline fusionnée | `GET .../activity` | ✅ onglet Activité |
| Complétude dossier (booléens) | `GET .../dossier` | ✅ onglet Dossier |
| Vecteurs biométriques | **strip côté service** | ❌ |
| Signature financière | **strip côté service** | ❌ |

---

## Audit & conformité

### Serveur (autoritatif)

`SuperAdminStudentAuditService.logView()` — `schoolId` toujours résolu depuis la table `Student`, jamais depuis le seul body client.

| Action `AuditLog` | Déclencheur |
|-------------------|-------------|
| `SUPERADMIN_STUDENT_PROFILE_VIEW` | GET dashboard |
| `SUPERADMIN_STUDENT_DOSSIER_VIEW` | GET dossier |
| `SUPERADMIN_STUDENT_ACTIVITY_VIEW` | GET activity |

Sévérité : `WARNING`.

### Client (complément)

`POST /superadmin/security/audit-access` avec `dataType: PERSONAL_DOCS` à l'ouverture du panel.

### Lecture des logs

`GET /superadmin/core/audit-logs` — filtrer par `schoolId` de l'établissement concerné.

---

## Types TypeScript (frontend)

Voir `src/types/super-admin.ts` :

- `StudentGlobalStats`, `StudentListItem`, `StudentDashboard`, `StudentDossier`, `StudentActivityItem`

---

## Routes OpenAPI

Préfixe : `/api/v1/superadmin/students-management/`

| Méthode | Path |
|---------|------|
| GET | `/schools/{schoolId}/students` |
| GET | `/schools/{id}/students/stats` |
| GET | `/schools/{schoolId}/students/debtors` |
| DELETE | `/schools/{schoolId}/students/stats/invalidate` |
| GET | `/students/{studentId}/dashboard` |
| GET | `/students/{studentId}/dossier` |
| GET | `/students/{studentId}/activity` |
