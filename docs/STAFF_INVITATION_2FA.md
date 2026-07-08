# Invitation staff sécurisée — Email + SMS (2FA)

> Flux d'invitation personnel PresenceFintech avec validation transactionnelle.
> Complète `SECURITY_IDENTITY.md` et `FINANCE_AMELIORATION.md`.

## Vue d'ensemble

Seul le personnel **invité et vérifié** (`UserStatus.ACTIVE`) peut se connecter.

```
Admin invite (email + phone)
  → User PENDING_VERIFICATION + StaffInvitation INVITED
  → Email (lien /activate) + SMS (OTP 6 chiffres) — async

Staff /activate?token=…
  → Étape 1 : mot de passe → AWAITING_VERIFICATION
  → Étape 2 : POST /auth/verify-account { token, otp } → ACTIVE (transaction ACID)
```

## Schéma SQL (PostgreSQL)

Migration : `backend/prisma/migrations/20260705120000_staff_invitation_2fa/migration.sql`

| Colonne / ENUM | Table | Rôle |
|---|---|---|
| `UserStatus` | `users.status` | `PENDING_VERIFICATION`, `ACTIVE`, `SUSPENDED` |
| `phoneOtp` | `users` | Hash SHA-256 du code SMS (jamais en clair) |
| `phoneOtpExpiresAt` | `users` | Expiration OTP invitation (15 min) |
| `emailVerificationToken` | `users` | *(existant)* Token email |
| `StaffInvitationVerificationStep` | `staff_invitations.verificationStep` | `INVITED` → `AWAITING_VERIFICATION` → `COMPLETED` |

## AuthService (backend)

| Méthode | Rôle |
|---|---|
| `inviteUser(actor, data)` | Transaction : user + invitation + audit ; notifications async |
| `activateStaffAccount(token, password)` | Étape 1 : mot de passe, reste `PENDING_VERIFICATION` |
| `verifyAccount(token, otp)` | Étape 2 : transaction ACID token + OTP → `ACTIVE` |
| `resendInvitation(actor, userId, schoolId)` | Régénère token + OTP, renvoie email/SMS |

**Séparation des responsabilités :**

- `AuthService` — logique métier et transactions
- `StaffInvitationNotificationService` — envoi email/SMS (fire-and-forget)
- `StaffInvitationRepository` — résolution token / labels dashboard

## API

| Méthode | Route | Auth |
|---|---|---|
| POST | `/api/v1/auth/activate` | Public |
| POST | `/api/v1/auth/verify-account` | Public |
| POST | `/api/v1/web/admin/invitations/staff` | Admin (+ `phone`) |
| POST | `/api/v1/web/admin/invitations/staff/resend` | Admin |
| GET | `/api/v1/web/admin/invitations/status` | Admin |

## Dashboard admin

Colonne **Étape** (`verificationLabel`) :

| Label | Signification |
|---|---|
| En attente activation | Invitation envoyée, mot de passe non défini |
| En attente vérification (email + SMS) | Mot de passe OK, OTP non validé |
| Compte actif | `UserStatus.ACTIVE` |

## Middleware

- `authenticate` : exige `isActive === true` **et** `status === ACTIVE`
- `requireVerifiedStaff` : inchangé (`isEmailConfirmed` pour mutations finance)
- Login : rejette `PENDING_VERIFICATION` et `SUSPENDED`

## Dépannage TypeScript / Prisma

Si l'IDE affiche `UserStatus does not exist` ou `status does not exist on User` :

```powershell
cd backend
npm run types:sync          # = prisma generate
npm run types:check         # generate + tsc src
```

Puis dans Cursor : **Ctrl+Shift+P** → `TypeScript: Restart TS Server`.

**Workspace recommandé** : ouvrir `presence.code-workspace` (dossiers `frontend` + `backend`) pour que TypeScript résolve `@prisma/client` depuis `backend/node_modules`.

**Migrations locales** (sans `DATABASE_URL` dans `.env`) :

```powershell
npm run prisma:deploy:local
npm run seed:local
npm run dev:local
```


| Variable | Usage |
|---|---|
| `FRONTEND_URL` | Liens d'activation |
| `JWT_SECRET` | Sessions |
| Config SMS (`config.sms`, `config.jobs.smsProviderEnabled`) | Envoi OTP invitation |
| SMTP / email templates | Email invitation |

## Frontend

- `/admin/invitations` — champ téléphone, étape, bouton renvoyer
- `/activate` — 2 étapes : mot de passe puis OTP SMS
- Proxy : `/api/auth/verify-account`
