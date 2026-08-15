# Intégration Frontend — Sprint 1 Attendance

**Public :** Flutter parent, Flutter enseignant (à venir), Admin web (React/Vue)  
**Backend :** `src/modules/attendance/`  
**Recette pilote :** `npm run attendance:pilot-e2e`

---

## Feature flags backend (.env)

| Variable | Défaut | Effet |
|----------|--------|--------|
| `ATTENDANCE_NOTIFICATION_HANDLER_ENABLED` | `false` | Orchestrateur notifs parent (remplace `notifyArrival` worker) |
| `ATTENDANCE_DASHBOARD_PUBLISHER_ENABLED` | `false` | Events socket admin `attendance.*` |
| `ATTENDANCE_AUTO_ABSENCE_ENABLED` | `false` | Job cron absences après cutoff |

---

## Par rôle

### Parent mobile (Flutter — `frontend/`)

| Besoin | REST | Socket |
|--------|------|--------|
| Fil présence élève | `GET /mobile/parents/students/{id}/attendance` | `attendance.recorded` (catalogue Empire) |
| Notifications générales | `GET /mobile/parents/notifications` | `notification` |
| **Livraisons présence (Sprint 1)** | `GET /mobile/parents/attendance-notifications` | invalider liste sur `attendance.recorded` |
| Marquer lu | `PATCH .../attendance-notifications/{id}/read` | — |
| Accusé réception | `PATCH .../attendance-notifications/{id}/acknowledge` | — |
| Préférences canaux | `PATCH /mobile/parents/settings/notifications` | — |

**Code Flutter :**

- `lib/features/parent/repositories/attendance_notification_repository.dart`
- `lib/features/parent/providers/attendance_notification_providers.dart`
- `lib/features/parent/screens/notification_list_screen.dart` (onglet Présence)
- `lib/core/events/empire_realtime_providers.dart` — invalidation sur événement

### Enseignant mobile (contrat — app séparée)

| Besoin | REST | Socket |
|--------|------|--------|
| Scan QR / manuel | `POST /mobile/teachers/scan`, `/scan/qr` | — |
| **Remise (carte parent, 15 h)** | `POST /mobile/teachers/pickup/preview` + `/confirm` — **aucune présence** | — |
| Cahier d'appel | routes `attendance-sheet` | — |
| Modes autorisés | dérivés de `GET .../attendance-settings` (admin) | — |

QR parent `{ kind:"pickup" }` refusé sur `/scan/qr` (`PICKUP_USE_REMISE_MODE`). Passation : `src/docs/flutter-teacher-pickup.md`.

Pas de socket `control-dashboard` côté enseignant.

### Admin web (priorité passation)

| Besoin | REST | Socket.io |
|--------|------|-----------|
| Réglages pointage | `GET/PATCH /admin/schools/{id}/attendance-settings` | — |
| **Horaires / fenêtre / EXIT** | `scheduleSettings` dans GET/PATCH | — |
| **Notifs départ parents** | `notificationSettings.parentDepartureNotificationsEnabled` | — |
| Géofence | `geofence` dans GET/PATCH | — |
| Absences auto | `absenceSettings` dans PATCH | — |
| Monitoring livraisons | `GET /admin/schools/{id}/attendance-notifications` | — |
| Dashboard temps réel | — | Room `school:{id}:control-dashboard` |
| Paiements (existant) | — | `payment.confirmed.admin`, `control_dashboard` |
| **Présence (Sprint 1)** | — | `attendance.recorded`, `attendance.statistics.updated`, `attendance.activity` |

**Auth socket :** `io(host, { auth: { token: jwt } })` — JWT ADMIN/SUPER_ADMIN.

**Passation dédiée (écrans + message Slack + exemples TS) :**  
`src/docs/web-admin-attendance-handoff.md`

---

## Contrats OpenAPI

| Rôle | Fichier |
|------|---------|
| Parent | `src/docs/openapi-parent-mobile.json` |
| Admin REST | `swagger-docs/admin.json` (`npm run docs:admin-openapi`) |
| Admin socket | `src/docs/openapi-admin.json` |

---

## Événements socket admin (Sprint 1)

Room : `school:{schoolId}:control-dashboard`

```typescript
socket.on('attendance.recorded', (payload) => {
  // { event, presenceId, studentId, studentName, status, scannedAt, method }
});
socket.on('attendance.statistics.updated', (payload) => {
  // { present, absent, late, attendancePercentage, updatedAt }
});
socket.on('attendance.activity', (payload) => {
  // flux activité (scan, rejet, etc.)
});
```

Requiert `ATTENDANCE_DASHBOARD_PUBLISHER_ENABLED=true` côté serveur.

---

## Checklist déploiement école pilote

1. Migrations Neon à jour
2. Flags `.env` activés
3. `PATCH attendance-settings` — `absenceSettings.autoMarkEnabled`, géofence
4. Session académique OPEN couvrant la date du jour
5. `npm run attendance:pilot-e2e`
6. Redémarrer backend (`npm run dev`)
7. Parent : vérifier onglet Présence + socket
8. Admin web : brancher listeners `attendance.*` (quand UI disponible)
