# Passation intégration web — Présence & horaires (juillet 2026)

**Pour :** développeur front **app web** (admin école)  
**Backend :** Presence — repo `backend`  
**Dernière mise à jour :** 28 juillet 2026

---

## Objectif UI

Écran **Réglages présence** (admin école) pour configurer :

1. **Modes de pointage** (QR, manuel, RFID, face, empreinte)
2. **Géofence** (lat / lng / rayon)
3. **Horaires de scan** (début / fin) — strict comme le GPS
4. **Tolérance retard** (minutes)
5. **Sortie (EXIT)** — 2e scan du jour + notifs parents
6. **Absences automatiques** (cutoff)
7. **Notifications parents** (arrivée + sortie / fin de journée)

---

## Message type à envoyer au collègue front

```
Salut,

Backend présence / horaires prêt pour l’écran admin web « Réglages présence ».

📄 src/docs/web-admin-attendance-handoff.md  (ce guide)
📄 docs/FRONTEND_ATTENDANCE_INTEGRATION.md
📄 src/docs/attendance-architecture.md
📄 src/docs/web-admin-payment-handoff.md     (même app — paiements)

🔌 OpenAPI : swagger-docs/admin.json
Swagger UI : {API}/api-docs/admin
API        : https://gestion-presence-et-paiement-mobile.onrender.com/api/v1

Endpoints :
  GET  /admin/schools/attendance-settings          (école de la session)
  PUT  /admin/schools/attendance-settings
  GET  /admin/schools/{schoolId}/attendance-settings
  PATCH /admin/schools/{schoolId}/attendance-settings

Auth : Bearer JWT (ADMIN / SUPER_ADMIN write ; FINANCE read)
Nouveau bloc response/body : scheduleSettings + notificationSettings.parentDepartureNotificationsEnabled

Écran cible :
1. Formulaire horaires (début / fin / retard)
2. Toggle fenêtre stricte + sortie EXIT
3. Géofence (carte ou champs lat/lng)
4. Modes de scan + absences auto + notifs parents
```

---

## Endpoints

| Méthode | Path | Rôles |
|---------|------|-------|
| `GET` | `/api/v1/admin/schools/attendance-settings` | ADMIN, SUPER_ADMIN, FINANCE |
| `PUT` | `/api/v1/admin/schools/attendance-settings` | ADMIN, SUPER_ADMIN |
| `GET` | `/api/v1/admin/schools/{schoolId}/attendance-settings` | ADMIN, SUPER_ADMIN, FINANCE |
| `PATCH` | `/api/v1/admin/schools/{schoolId}/attendance-settings` | ADMIN, SUPER_ADMIN |
| `GET` | `/api/v1/admin/schools/attendance-readiness` | ADMIN, SUPER_ADMIN, FINANCE |
| `POST` | `/api/v1/admin/schools/attendance-settings/provision` | ADMIN, SUPER_ADMIN |

**Headers :**

```http
Authorization: Bearer <jwt>
Content-Type: application/json
X-School-Id: <uuid-ou-id>   # selon middleware tenant (si multi-école)
```

**Réponse standard :** `{ success, message, data, timestamp, statusCode }`

---

## Contrat `data` (GET)

```typescript
type AttendanceSettingsResponse = {
  schoolId: number;
  source: 'database' | 'legacy';
  methods: {
    manual: boolean;
    qrCode: boolean;
    rfid: boolean;
    facialRecognition: boolean;
    fingerprint: boolean;
  };
  enabledPresenceModes: string[]; // dérivé des methods
  offlineSyncEnabled: boolean;
  validationRules: {
    requireGPS: boolean;
    allowOffline: boolean;
    requireLiveness: boolean;
    dualQrRequired?: boolean;
    maxClockSkewMs?: number;
    enforceSchoolGeofence?: boolean;
  };
  geofence: {
    latitude: number | null;
    longitude: number | null;
    radiusKm: number;
    radiusMeters: number;
    configured: boolean;
  };
  /** NOUVEAU — horaires école (table School) */
  scheduleSettings: {
    startHour: number;              // 0–23, défaut 8
    startMinute: number;            // 0–59, défaut 0
    endHour: number;                // 0–23, défaut 17
    endMinute: number;              // 0–59, défaut 0
    lateToleranceMinutes: number;   // minutes après début → LATE
    scanWindowStrict: boolean;      // refuse hors [début, fin]
    exitScanEnabled: boolean;       // 2e scan du jour = EXIT
  };
  notificationSettings: {
    parentPresenceNotificationsEnabled: boolean;   // arrivée
    parentDepartureNotificationsEnabled: boolean;  // sortie / fin de journée
  };
  absenceSettings: {
    autoMarkEnabled: boolean;
    cutoffHour: number;
    cutoffMinute: number;
    timezone: string; // ex. Africa/Kinshasa
  };
  updatedAt: string | null;
};
```

---

## PATCH / PUT — body partiel

Tous les blocs sont optionnels ; au moins un champ requis.

```json
{
  "scheduleSettings": {
    "startHour": 7,
    "startMinute": 30,
    "endHour": 17,
    "endMinute": 0,
    "lateToleranceMinutes": 15,
    "scanWindowStrict": true,
    "exitScanEnabled": true
  },
  "notificationSettings": {
    "parentPresenceNotificationsEnabled": true,
    "parentDepartureNotificationsEnabled": true
  },
  "geofence": {
    "latitude": -4.325,
    "longitude": 15.314,
    "radiusKm": 0.2
  },
  "methods": {
    "manual": true,
    "qrCode": true,
    "rfid": false,
    "facialRecognition": false,
    "fingerprint": false
  },
  "validationRules": {
    "requireGPS": true,
    "allowOffline": false,
    "requireLiveness": false,
    "enforceSchoolGeofence": true
  },
  "absenceSettings": {
    "autoMarkEnabled": true,
    "cutoffHour": 9,
    "cutoffMinute": 0,
    "timezone": "Africa/Kinshasa"
  }
}
```

### Règles de validation (400)

| Cas | Message / code |
|-----|----------------|
| Fin ≤ début (si les 4 champs horaires sont fournis) | « La fin de fenêtre doit être après le début. » |
| Body vide | « Au moins un champ doit être fourni… » |
| Tous les modes désactivés | « Au moins un mode de pointage doit rester activé… » |
| Géofence invalide | lat/lng hors bornes, radiusKm > 50 |

---

## Comportement métier (à refléter dans l’UI)

| Réglage | Effet runtime (scan mobile enseignant) |
|---------|----------------------------------------|
| `scanWindowStrict=true` | Scan avant début → `SCAN_BEFORE_WINDOW` ; après fin → `SCAN_AFTER_WINDOW` |
| `lateToleranceMinutes` | Après `start + tolérance` → statut `LATE` |
| `exitScanEnabled=true` | 1er scan jour = `ARRIVAL` ; 2e = `EXIT` (`EXITED`) + notif sortie |
| `exitScanEnabled=false` | 2e scan = doublon (déjà pointé) |
| Fin de journée | Job cron après `endHour` : notif parents si ARRIVAL sans EXIT |
| Géofence | Comme avant : GPS requis / hors périmètre |

**Messages UX suggérés (admin) :**

- Fenêtre stricte : « Les enseignants ne pourront pointer qu’entre HH:MM et HH:MM. »
- Sortie : « Un second scan le même jour enregistre la sortie et notifie les parents. »
- Retard : « Après X minutes, le pointage est marqué en retard. »

---

## Wireframe minimal (sections)

```
┌─ Réglages présence ─────────────────────────────────────┐
│  [Modes]  QR ☑  Manuel ☑  RFID ☐  Face ☐  Empreinte ☐   │
│                                                          │
│  [Horaires]                                              │
│   Ouverture  [07:30]     Fermeture  [17:00]              │
│   Tolérance retard  [15] min                             │
│   ☑ Fenêtre stricte (refuser hors plage)                 │
│   ☑ Autoriser scan de sortie (2e scan du jour)           │
│                                                          │
│  [Géolocalisation]                                       │
│   Lat / Lng / Rayon (km)  ·  badge « configuré »         │
│                                                          │
│  [Notifications parents]                                 │
│   ☑ Arrivée   ☑ Sortie / fin de journée                  │
│                                                          │
│  [Absences auto]                                         │
│   ☑ Activer · Cutoff [09:00] · TZ Africa/Kinshasa        │
│                                                          │
│                              [Enregistrer]               │
└──────────────────────────────────────────────────────────┘
```

---

## Exemple fetch (TypeScript)

```typescript
const base = import.meta.env.VITE_API_URL; // .../api/v1

async function loadAttendanceSettings(token: string) {
  const res = await fetch(`${base}/admin/schools/attendance-settings`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const json = await res.json();
  if (!json.success) throw new Error(json.message);
  return json.data as AttendanceSettingsResponse;
}

async function saveSchedule(
  token: string,
  scheduleSettings: AttendanceSettingsResponse['scheduleSettings']
) {
  const res = await fetch(`${base}/admin/schools/attendance-settings`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ scheduleSettings }),
  });
  const json = await res.json();
  if (!json.success) throw new Error(json.message);
  return json.data;
}
```

---

## Checklist front

- [x] Écran admin « Réglages présence » (routing rôle `ADMIN`)
- [x] Formulaire contrôlé + validation client (fin > début)
- [x] Afficher `geofence.configured` / readiness
- [x] Toggle `scanWindowStrict` + `exitScanEnabled`
- [x] Champs `lateToleranceMinutes`
- [x] Notifs : arrivée + départ
- [x] Absences auto (existant)
- [ ] Types générés depuis `swagger-docs/admin.json` (après regen)
- [x] Toast succès / erreur API (`message` + `code` si présent)

---

## Compte seed local

- Admin : `admin@ecole-demo.sn` / `Admin123!`
- École id `1` — horaires seed : 08:00–17:00, `scanWindowStrict=true`, `exitScanEnabled=true`

---

## Liens

| Doc | Rôle |
|-----|------|
| `swagger-docs/admin.json` | Contrat OpenAPI |
| `src/docs/attendance-architecture.md` | Architecture backend |
| `docs/FRONTEND_ATTENDANCE_INTEGRATION.md` | Vue multi-rôles (parent / teacher / admin) |
| `src/docs/web-admin-payment-handoff.md` | Passation paiements (même app web) |
