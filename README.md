# PresenceCollab — Frontend



---

## Stack

| Outil | Rôle |
| --- | --- |
| Next.js 14 App Router | Framework principal |
| TypeScript strict | Typage |
| Tailwind CSS | Styles |
| React Query v5 | State serveur & fetching |
| React Hook Form + Zod | Formulaires & validation |
| Axios | Client HTTP |
| Lucide React | Icônes |

---

## Structure du projet

```
src/
├── app/
│   ├── (auth)/                 → public
│   │   └── login/page.tsx      → /login
│   ├── (admin)/                → rôle ADMIN
│   │   └── admin/              → /admin/...
│   ├── (superAdmin)/           → rôle SUPER_ADMIN
│   │   └── super-admin/        → /super-admin/...
│   ├── (finances)/             → rôle FINANCE
│   │   └── finances/           → /finances/...
│   ├── (director)/             → rôle DIRECTOR
│   │   └── director/           → /director/...
│   ├── api/                    → proxy backend + routes auth (cookies httpOnly)
│   ├── layout.tsx              → root layout (providers)
│   └── globals.css
│
├── components/
│   ├── ui/                     → primitives réutilisables
│   └── layout/                 → sidebar, header
│
├── lib/
│   ├── api/                    → appels partagés (auth, client axios)
│   ├── admin/                  → appels API rôle ADMIN
│   ├── superAdmin/             → appels API rôle SUPER_ADMIN
│   ├── finances/               → appels API rôle FINANCE
│   └── hooks/                  → hooks React Query (use-admin.ts → admin/<domaine>.ts)
│
├── providers/
│   ├── auth-provider.tsx       → context auth
│   └── query-provider.tsx      → React Query
│
├── types/
│   └── auth.ts                 → types + ROLE_HOME (source unique)
│
└── middleware.ts               → protection & redirection par rôle
```

---

## Rôles & URLs

| Rôle | Valeur | Home |
| --- | --- | --- |
| Administrateur | `ADMIN` | `/admin/dashboard` |
| Super Administrateur | `SUPER_ADMIN` | `/super-admin/dashboard` |
| Finances | `FINANCE` | `/finances/dashboard` |
| Directeur (préfet / directeur d'études) | `DIRECTOR` | `/director/dashboard` |
| Guichet inscriptions | `IT` | `/admin/desk` |

---

## Authentification

**Flux de connexion**

1. Formulaire `/login` soumis
2. `POST /api/v1/auth/login` appelé
3. Le route handler `src/app/api/auth/login/route.ts` pose les tokens en cookies **httpOnly** (`auth_token`, `auth_refresh`) — jamais en `localStorage`
4. Redirect automatique vers la home du rôle

Les appels navigateur passent par le proxy `src/app/api/[...path]/route.ts`, qui ajoute le `Bearer` depuis le cookie. Si le backend est injoignable, il répond `502` (ou `504` après 90 s).

**Protection des routes** — `src/middleware.ts`

| Situation | Comportement |
| --- | --- |
| Non authentifié sur route protégée | → `/login` |
| Authentifié sur `/login` | → home du rôle |
| Authentifié sur section d'un autre rôle | → sa propre home |
| Authentifié sur `/` | → home du rôle |
| Access token expiré | refresh via `auth_refresh` (timeout 8 s) ; backend injoignable → `/login` sans perdre le refresh token |
| Rôle mobile (`TEACHER`, `PARENT`) | → `/login?error=role_not_supported` |

---

## Démarrage

**Prérequis** — le backend Presence API doit tourner en local (`npm run dev:local` dans `presence-app/backend`, port **5000**).

```bash
# Installation
npm install

# Développement (port 3001)
npm run dev

# Production
npm run build && npm run start

# Vérifications (également lancées par la CI GitHub Actions sur chaque PR)
npm run type-check
npm run lint
npm test
```

**Variables d'environnement** — copier `.env.example` vers `.env.local` à la racine :

```env
API_URL=http://localhost:5000
```

| Service | URL locale |
| --- | --- |
| Frontend Next.js | http://localhost:3001 |
| Backend Presence API (`dev:local`) | http://localhost:5000 |

Le route handler `src/app/api/[...path]/route.ts` relaie `/api/*` vers `${API_URL}/api/*`. Redémarrer `npm run dev` après toute modification de `.env.local`.

---

## Documentation (sync backend)

```bash
cd ../backend
npm run docs:sync-frontend
```

| Guide | Chemin |
| --- | --- |
| Cartes remise (produit + API) | `docs/PICKUP_CARDS.md` |
| Guichet IT | `docs/IT_ROLE.md` |
| Passation UI remise | `docs/api-contracts/web-admin-pickup-handoff.md` |
| OpenAPI admin (dont `/admin/pickup/*`) | `docs/api-contracts/openapi/admin.json` |
| Flutter Remise (référence, autre repo) | `docs/flutter-teacher-pickup.md` |

Client API déjà branché : `src/lib/admin/api/pickup.api.ts` · fiche `/admin/students/:id?doc=pickup`.

---

## Conventions

| Quoi | Où |
| --- | --- |
| Types partagés | `src/types/` |
| Client HTTP & auth API | `src/lib/api/` |
| Appels API par rôle | `src/lib/admin/` · `src/lib/superAdmin/` · `src/lib/finances/` |
| Hooks React Query | `src/lib/hooks/` |
| Composants UI | `src/components/ui/` |
| Layout (sidebar, header) | `src/components/layout/` |
| Source unique des redirections | `ROLE_HOME` dans `src/types/auth.ts` |
