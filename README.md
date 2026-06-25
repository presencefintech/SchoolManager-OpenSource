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
│   └── hooks/                  → hooks React Query
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

---

## Authentification

**Flux de connexion**

1. Formulaire `/login` soumis
2. `POST /api/v1/auth/login` appelé
3. JWT + rôle stockés en `localStorage` **et** en cookie (requis par le middleware)
4. Redirect automatique vers la home du rôle

**Protection des routes** — `src/middleware.ts`

| Situation | Comportement |
| --- | --- |
| Non authentifié sur route protégée | → `/login` |
| Authentifié sur `/login` | → home du rôle |
| Authentifié sur section d'un autre rôle | → sa propre home |
| Authentifié sur `/` | → home du rôle |

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

# Vérifications
npm run type-check
npm run lint
```

**Variables d'environnement** — copier `.env.example` vers `.env.local` à la racine :

```env
API_URL=http://localhost:5000
```

| Service | URL locale |
| --- | --- |
| Frontend Next.js | http://localhost:3001 |
| Backend Presence API (`dev:local`) | http://localhost:5000 |

Le proxy Next.js réécrit `/api/*` vers `${API_URL}/api/*` (voir `next.config.js`). Redémarrer `npm run dev` après toute modification de `.env.local`.

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
