# Architecture Attendance — Sprint 0

## Objectif

Extension additive du module présence existant (`Presence`, `StudentPresence`, `PresenceStrategyFactory`) sans rupture des APIs production.

## Couche domaine

- `AttendanceMethod` — méthodes de collecte (sans GPS)
- `AttendanceValidationRules` — GPS, offline, liveness (règles contextuelles)
- `AttendanceSubjectType` — `STUDENT` (actif), `STAFF` (préparé)

## Mapping legacy

`AttendanceMethodMapper` traduit vers `PresenceScanMethod` :

| AttendanceMethod | PresenceScanMethod |
|---|---|
| MANUAL | MANUAL / MANUAL_ADMIN |
| QR_CODE | QR_CODE |
| RFID | NFC |
| FACIAL_RECOGNITION | FACIAL |
| FINGERPRINT | BIOMETRIC (empreinte) |

## Configuration école

`SchoolAttendanceSettings` (table additive) avec fallback :

1. Ligne DB `school_attendance_settings`
2. `SchoolPresenceSettings.enabledPresenceModes`
3. `DEFAULT_ENABLED_PRESENCE_MODES`

**Enrichissement pointage (Step 2.7) :** `SchoolAttendanceSettingsService.applyDbSettingsToPresenceSettings` fusionne la DB dans `enabledPresenceModes` avant `PresenceStrategyFactory.assertModeAllowed`. Appelé depuis `PresenceQueryService.resolveSettingsForRecord` et `TeacherService.getSettings`. Rollback : `ATTENDANCE_SETTINGS_DB_ENABLED=false`.

**OpenAPI admin :** `swagger-docs/admin.json` → `/api-docs/admin` (`/admin/schools/{schoolId}/attendance-settings`)  
**Passation front web :** [`web-admin-attendance-handoff.md`](./web-admin-attendance-handoff.md) — horaires (`scheduleSettings`), géofence, EXIT, notifs départ.

## Point d'entrée enseignant (module teacher)

```
POST /api/v1/mobile/teachers/scan/qr   ← TeacherService.processQrScan → QrCodeAttendanceStrategy
POST /api/v1/mobile/teachers/scan      ← legacy (v1 matricule / modes existants)
POST /api/v1/mobile/teachers/pickup/preview  ← carte parent — AUCUNE présence
POST /api/v1/mobile/teachers/pickup/confirm
```

QR `{ "kind": "pickup" }` refusé sur `/scan/qr` (`PICKUP_USE_REMISE_MODE`). Guide : [`flutter-teacher-pickup.md`](./flutter-teacher-pickup.md).

**Token QR v2 :** `keyId:schoolId:studentId:timestamp:signature` — voir `QrAttendanceTokenUtil`.

**Registre :** `PresenceStrategyFactory.getAttendanceStrategy(AttendanceMethod.QR_CODE)`.

## Phase 3 — Events (en cours)

| Step | Statut | Livrable |
|------|--------|----------|
| 3.1 | ✅ | `AttendanceEventFactory` — `fromPresencePostProcess`, `fromValidation` |
| 3.2 | ✅ | `ATTENDANCE_MARKED_ABSENT` + `fromMarkedAbsent` |
| 3.3 | ✅ | `emitPresencePostProcessAttendanceEvent` dans `presence.worker.ts` |
| 3.4 | ✅ | `ATTENDANCE_VALIDATED` dans `presences.controller.validatePresence` |
| 3.5 | ✅ | Handlers audit + analytics (`handlers/`) |
| 3.6 | ✅ | `attendance.bootstrap.ts` → `initializeAttendanceSystem()` + import `server.ts` |
| 3.7 | ✅ | `attendance-worker-flow.integration.test.ts` — factory + worker + handlers |

## Point d'entrée unifié (service)

```
AttendanceProcessingService
  → SchoolAttendanceSettingsService (modes)
  → PresenceQueryService (horaires / geo)
  → StudentPresence.recordPresenceAdvanced()
      → PresencePolicy
      → PresenceStrategyFactory
```

## Événements (infrastructure)

`AttendanceEventDispatcher` — modèle identique à `PaymentEventDispatcher`. Handlers branchés Sprint 1+.

## Notifications (abstractions)

`AttendanceNotificationChannel` + adaptateurs PUSH/SMS/EMAIL/WHATSAPP déléguant à `NotificationService`.

## Phase 4 — Orchestrateur notifs (livré)

| Step | Statut | Livrable |
|------|--------|----------|
| 4.1 | ✅ | Tables `parent_notification_preferences`, `attendance_notification_deliveries` |
| 4.2 | ✅ | `AttendanceNotificationOrchestrator` — fallback Push→SMS→WhatsApp→Email |
| 4.3 | ✅ | `AttendanceNotificationHandler` sur `ATTENDANCE_RECORDED` / `ATTENDANCE_MARKED_ABSENT` |
| 4.4 | ✅ | Enregistrement dans `attendance.bootstrap.ts` |
| 4.5 | ✅ | `ATTENDANCE_NOTIFICATION_HANDLER_ENABLED` (défaut `false`) |
| 4.6 | ✅ | Parent `PATCH .../attendance-notifications/:id/read|acknowledge` |
| 4.7 | ✅ | Admin `GET .../attendance-notifications` |
| 4.8 | ✅ | Tests orchestrateur + handler |

**Activation prod :** `ATTENDANCE_NOTIFICATION_HANDLER_ENABLED=true` — le worker legacy `notifyArrival` est alors désactivé.

## Phase 5 — Dashboard temps réel (livré)

| Step | Statut | Livrable |
|------|--------|----------|
| 5.1 | ✅ | `SocketAttendanceDashboardPublisher` |
| 5.2 | ✅ | `AttendanceDashboardHandler` — RECORDED, REJECTED, MARKED_ABSENT |
| 5.3 | ✅ | Events `attendance.recorded`, `attendance.statistics.updated`, `attendance.activity` |
| 5.4 | ✅ | Room `school:{schoolId}:control-dashboard` |
| 5.5 | ✅ | Flag `ATTENDANCE_DASHBOARD_PUBLISHER_ENABLED` |

## Phase 6 — Absences automatiques (livré)

| Step | Statut | Livrable |
|------|--------|----------|
| 6.1 | ✅ | `absenceSettings` JSON (`autoMarkEnabled`, cutoff, timezone) |
| 6.2 | ✅ | `attendance-absence.job.ts` — cron `*/15 * * * *` |
| 6.3 | ✅ | Verrou advisory PostgreSQL `1005` |
| 6.4 | ✅ | `AttendanceAbsenceService` |
| 6.5 | ✅ | `Presence` ABSENT `MANUAL_ADMIN` + idempotence |
| 6.6 | ✅ | Dispatch `ATTENDANCE_MARKED_ABSENT` |
| 6.7 | ✅ | Flag `ATTENDANCE_AUTO_ABSENCE_ENABLED` |
| 6.8 | ✅ | Script recette `npm run attendance:pilot-e2e` |

**Intégration frontend :** voir `docs/FRONTEND_ATTENDANCE_INTEGRATION.md`.  
**Admin web (horaires / EXIT) :** [`web-admin-attendance-handoff.md`](./web-admin-attendance-handoff.md).

## Phase 7 — Fenêtre horaire & sortie (livré juillet 2026)

| Step | Statut | Livrable |
|------|--------|----------|
| 7.1 | ✅ | `School.endHour/endMinute`, `lateToleranceMinutes`, `scanWindowStrict`, `exitScanEnabled` |
| 7.2 | ✅ | `ScanWindowService` + `PresencePolicy` (`SCAN_BEFORE_WINDOW` / `SCAN_AFTER_WINDOW`) |
| 7.3 | ✅ | Direction `ARRIVAL` / `EXIT` + unique journalière |
| 7.4 | ✅ | Notifs départ + job fin de journée |
| 7.5 | ✅ | Admin GET/PATCH `scheduleSettings` + `parentDepartureNotificationsEnabled` |
| 7.6 | ✅ | XOR EOD : orchestrateur **ou** legacy (`notifyEndOfDay`) — pas de double fan-out |

**Idempotence notifs :** arrivée/départ via post-process (legacy off si handler on) ; EOD via XOR dans `notifyEndOfDay` ; livraisons dédupliquées par `correlationId`+`userId`.

## Migration

`20260608220000_school_attendance_settings` — CREATE TABLE uniquement, aucune altération destructive.
`20260710130000_attendance_absence_settings` — colonne `absenceSettings` JSON.
`20260728180000_presence_attendance_date_unique` — `attendanceDate` + unicité jour.
`20260728190000_scan_window_and_exit_direction` — horaires école + `direction` ARRIVAL/EXIT.
