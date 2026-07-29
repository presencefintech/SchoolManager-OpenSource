# Guide de travail — Module Finance

> **Document partagé** — la version complète et à jour est maintenue dans le repo backend :  
> [`backend/docs/FINANCE_WORK_GUIDE.md`](../../backend/docs/FINANCE_WORK_GUIDE.md)

Utilisez ce guide pour avancer **une étape à la fois** (F-01, F-02, …).

## Étapes frontend (collaborateur)

| Étape | Titre | Fichiers principaux |
|-------|-------|---------------------|
| **F-01** | Dashboard admin KPI | `admin/finance/page.tsx`, `finance-dashboard.utils.ts` |
| **F-02** | Alertes fraude | `finance.api.ts`, `audit/page.tsx` |
| **F-04** | Analytics collection guichet | `(finances)/finances/dashboard/page.tsx` |
| **F-05** | Endpoints secondaires (efficiency, EOD, integrity) | `types/admin.ts`, `finance-dashboard.utils.ts`, pages finance |
| **F-06** | Méthodes paiement (données réelles) | `admin/finance/page.tsx` |
| **F-12** | Page remboursements admin | nouvelle page + `use-admin.ts` |
| **F-13** | Moratoires approve/reject/policy | `moratoriums/page.tsx` |
| **F-16** | Tests frontend | `__tests__/` |

## Branches suggérées

```bash
git checkout -b feat/finance-f01-dashboard-kpi
# … travail …
git push -u origin feat/finance-f01-dashboard-kpi
```

## Test local

```env
# .env.local
API_URL=http://localhost:5000
JWT_SECRET=<même valeur que backend .env>
```

```bash
npm run dev   # http://localhost:3001
```

**Pages à valider :**

- Admin : `/admin/finance`, `/admin/finance/paiements`, `/admin/finance/audit`, `/admin/settings` (branding école)
- Guichet : `/finances/dashboard`, `/finances/paiements`, `/finances/cloture`
- **Public (tous rôles + parents)** : `/verify`, `/verify/receipt/{token}`

## Branches Git — juillet 2026

| Branche | Périmètre | Rôles impactés |
|---------|-----------|----------------|
| `feat/finance-payment-modal` | Ticket thermique, modal paiement, branding | FINANCE, ADMIN |
| `feat/receipt-verify-pf` | PF-VERIFY-v1, pages `/verify` | Public, FINANCE, ADMIN |
| `feat/finance-reporting-api` | ReportingEngine HTTP (à venir) | ADMIN |
| `feat/exchange-rate-admin` | Taux de change historisés (à venir) | ADMIN |

## Rôles — vérification reçu

| Rôle | Accès app | Vérification reçu |
|------|-----------|-------------------|
| `FINANCE` | `/finances/*` | Nav → `/verify` (public) |
| `ADMIN` | `/admin/*` | Nav Finance → `/verify` (public) |
| `PARENT` | App mobile | Scan QR (caméra) → page web |
| Public | — | `/verify` sans login |

## Note produit — Pilotage multi-baremes (a conserver)

### Constat metier

Une ecole peut definir plusieurs frais selon ses realites (inscription, minerval, transport, examens, etc.).  
Tous les niveaux/classes/options ne paient pas les memes montants.  
Le dashboard admin doit donc piloter un **modele multi-baremes**, pas un montant global unique.

### Cible fonctionnelle

- **Baremes dynamiques par niveau/classe/option**
  - Creation libre de plusieurs types de frais
  - Rattachement a `niveau + classe + annee scolaire` (et `section/option` si besoin)
- **Facturation eleve selon profil**
  - Montants differencies selon classe/option/session
  - Echeances par type de frais : mensuel, trimestriel, one-shot
- **Dashboard admin segmente**
  - KPI globaux + drilldown par niveau, classe et type de frais
  - Indicateurs `du / encaisse / reste` par segment
- **Controle ADMIN vs FINANCE**
  - `FINANCE` encaisse au guichet
  - `ADMIN` garde le pouvoir de validation/override (annulation, remise, correction)
  - Audit logs obligatoires sur les operations sensibles
- **Garde-fous anti-erreur**
  - Interdire paiement sur frais non assigne
  - Verifier devise/methode/statut avant confirmation
  - Alertes fraude + anomalies par classe/niveau

### Gap actuel a combler (apres F-05)

- [x] Ajouter la vue **par type de frais** (en plus de la vue par niveau) — widgets dashboard
- Ajouter des filtres admin : `annee scolaire`, `niveau`, `classe`, `type de frais` (partiel : classe/section/option)
- [x] Ajouter un tableau de controle : qui a paye quoi, qui manque — `/finances/suivi-financier` (lignes dépliables) + `/admin/finance/controle`
- Qui a validé : file `/admin/finance/paiements` (prochaine enrichment noms validateurs)

### Plan d'execution recommande

- **Increment A (rapide)** ✅  
  Filtres + widgets "par type de frais" sur `/admin/finance`
- **Increment B (complet)** 🟡  
  Ecran "Controle admin" livré (`/admin/finance/controle`) — audit trail validateurs à enrichir

---

Pour le détail complet (backend, critères de done, tableau de suivi) → voir le fichier backend ci-dessus.
