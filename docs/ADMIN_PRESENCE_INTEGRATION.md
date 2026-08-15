# Intégration frontend — Présences admin (Phase B)

Guide d'intégration du dashboard admin avec le workflow **cahier d'appel numérique** et les **motifs standardisés**.

---

## Architecture frontend

```
src/
├── lib/
│   ├── admin/api/presences.api.ts      # Client HTTP
│   ├── hooks/use-admin.ts              # React Query hooks
│   ├── presence/
│   │   ├── presence-reason-codes.ts    # Catalogue motifs (miroir backend)
│   │   ├── presence-response.utils.ts  # Interprétation 201/202
│   │   └── attendance-sheet.utils.ts   # Labels statuts feuille
├── components/admin/presences/
│   ├── AdminModal.tsx                  # Shell modal partagé
│   ├── PresenceStatusBadge.tsx         # Badges PRESENT/ABSENT/LATE
│   ├── QRKioskModal.tsx                # QR kiosque (sélecteur classe)
│   ├── ManualRecordModal.tsx           # Saisie individuelle + motifs
│   ├── BulkPresenceGrid.tsx            # Cahier d'appel + clôture
│   ├── PresenceReasonFields.tsx        # Dropdown motif + note
│   └── PendingSheetsPanel.tsx          # Vue manager + ouverture feuille
└── types/admin.ts                      # Types partagés
```

Contrats API : `docs/api-contracts/types/`

---

## Endpoints consommés

| Hook | API | Usage UI |
|------|-----|----------|
| `usePresenceReasonCodes` | `GET /reason-codes` | Catalogue serveur (optionnel) |
| `useAttendanceSheetDraft` | `GET /sheets/draft` | Pré-remplissage bulk + hydratation |
| `useBulkRecordPresence` | `POST /bulk` | Soumettre cahier |
| `useSealAttendanceSheet` | `POST /sheets/:id/seal` | Clôturer séance |
| `usePendingAttendanceSheets` | `GET /sheets/pending` | En cours ou `?status=SEALED` (archives) |
| `useExportAttendanceSheet` | `GET /sheets/:id/export` | Télécharger registre PDF/CSV |
| `useRecordPresence` | `POST /record` | Modal manuel |

---

## Flux cahier d'appel (BulkPresenceGrid)

1. **Sélection classe** → `useAttendanceSheetDraft(classId, sessionDate)`
2. **Pré-remplissage** → lignes `PRESENT` depuis enrollments
3. **Hydratation serveur** → si élève déjà pointé aujourd'hui, la ligne a `presenceId` et le statut réel (affiché en ambre)
4. **Barre récap** → présents / retards / absents / déjà pointés
5. **Exceptions** → `PresenceReasonFields` (motif + note si `OTHER`)
6. **Enregistrer** → `POST /bulk` → réponse avec `sheetId`, `sheetStatus: SUBMITTED`
7. **Clôturer la séance** → `POST /sheets/:sheetId/seal` → `SEALED` (+ sceau audit affiché en toast)
8. **Télécharger le registre** → `GET /sheets/:sheetId/export?format=pdf|csv` (boutons dans la modale scellée et onglet **Archives scellées**)

Ouverture depuis **Cahiers d'appel** : bouton « Ouvrir » / « Consulter » → `BulkPresenceGrid` pré-rempli (`initialClassId`, `initialSessionDate`).

### États UI par statut feuille

| `sheetStatus` | Comportement UI |
|---------------|-----------------|
| `DRAFT` | Grille éditable, bouton **Enregistrer** |
| `SUBMITTED` | Bandeau bleu, grille en lecture seule, **Enregistrer masqué**, bouton **Clôturer la séance** |
| `SEALED` | Bandeau vert, tout bloqué ; **Télécharger le registre** (PDF + CSV) |

Badge affiché : Brouillon / Soumis — en attente de clôture / Scellé.

### Archives scellées (`PendingSheetsPanel`)

Onglet **Archives scellées** : liste `GET /sheets/pending?status=SEALED` avec boutons PDF/CSV compacts par ligne. Après clôture depuis le panneau, bascule automatique vers cet onglet.

---

## Doublons et messages

### « Aucun nouvel enregistrement — 0 enregistré(s), N déjà pointé(s) aujourd'hui »

**Cause** : les élèves ont déjà une présence ce jour ; une nouvelle insertion est refusée.

**Actions utilisateur** :
- Si le cahier est `SUBMITTED` → cliquer **Clôturer la séance** (ne pas re-enregistrer)
- Si des lignes sont en ambre dès l'ouverture → les présences existent déjà ; passer à la clôture ou corriger via le flux audité

Interprétation côté code : `interpretBulkPresenceResult()` → kind `all_duplicates`.

Après backend récent : re-soumission sur lignes déjà liées (`presenceId` + même statut) renvoie `201` avec `succeeded` (replay), pas ce toast.

---

## Motifs de présence

Validation locale : `validatePresenceReason()` dans `presence-reason-codes.ts`

| Statut | Règle |
|--------|-------|
| PRESENT | Motif optionnel |
| ABSENT / LATE | `reasonCode` obligatoire |
| OTHER | `note` min. 3 caractères |

Composant réutilisable : `PresenceReasonFields`.

---

## Codes HTTP

| Code | Signification |
|------|---------------|
| `201` | Tout enregistré (ou replay idempotent sur lignes déjà liées) |
| `202` | Partiel ou doublons non gérés — voir `interpretBulkPresenceResult()` |
| `400` | Motif manquant / validation Zod |
| `403` | Feuille scellée ou hors périmètre |

---

## Page admin `/admin/presences`

Onglets :
- **Flux en direct** — polling 15s
- **Heatmap** — distribution horaire
- **Cahiers d'appel** — `PendingSheetsPanel` (en cours + archives scellées + export)
- **Alertes** — fraude

Actions header :
- QR Kiosque
- Enreg. groupé → `BulkPresenceGrid`
- Enregistrement manuel → `ManualRecordModal`

---

## Types principaux

Voir `src/types/admin.ts` :
- `AttendanceSheetDraft`, `AttendanceSheetStatus`
- `PendingAttendanceSheetSummary`
- `BulkPresenceRecordResult` (+ `sheetId`, `sheetStatus`)

Contrats documentaires (Zod + types feuille) :
- `docs/api-contracts/types/presence.validation.ts` — types feuille exportés ici
- `docs/api-contracts/types/attendance-sheet.types.ts` — types étendus (`SealedAttendanceSheetResult`, etc.)

---

## Sync contrats

Après changement backend :
1. Mettre à jour `docs/api-contracts/types/presence.validation.ts`
2. Réexporter depuis `attendance-sheet.types.ts` si besoin
3. Aligner `src/types/admin.ts`
4. Vérifier : `npm run type-check`

Backend workflow détaillé : `backend/docs/ATTENDANCE_SHEET_WORKFLOW.md`

---

## Teacher mobile

Spécification : `docs/teacher-api-spec.md`  
Mêmes concepts : draft → submit → seal, hydratation des présences du jour, motifs obligatoires.

**Mode Remise (cartes parent) :** distinct du scan présence — [`PICKUP_CARDS.md`](./PICKUP_CARDS.md). L’écran Flutter est documenté dans le repo mobile (`flutter-teacher-pickup.md`).
