# Account list + password regeneration (Admin & SuperAdmin)

## Problem

Today, on the SuperAdmin platform, resetting a user's password requires already knowing their email (`POST /superadmin/auth/trigger-reset`, email-only, sends a reset link) — there's no browsable list of accounts to trigger it from. On the Admin (school-level) platform there is no password-reset capability at all.

Goal: let an Admin (for their own school's staff) or a SuperAdmin (for any account on the platform) look up a user in a list and regenerate their password directly, for the case where the user forgot it and can't use the email-link flow (no email access, wrong/shared inbox, etc).

## Repos touched

- `Gestion-presence--et-paiement-mobile` (backend) — sibling directory to `frontend`, resolved via `frontend/.env.local` → `API_URL`.
- `frontend` (this repo) — UI + API client.

## Mechanism

Regenerating a password means: the backend generates a new random temporary password, saves it (hashed), and returns the **plaintext value once** to the admin/superadmin who triggered it, so they can hand it to the user through some out-of-band channel (in person, phone, etc). This does not require the user to have email access, unlike the existing trigger-reset flow (which stays as-is, unchanged, for when only the email is known).

On regeneration:
- All of the user's active sessions are revoked (forces re-login with the new password).
- The user receives the existing "password changed" notification email (informational only — it does **not** contain the new password).
- An audit log entry is written.

Out of scope: a "must change password on next login" flag. Would need a Prisma migration; not requested, skipped for v1.

## Backend changes (`Gestion-presence--et-paiement-mobile`)

### 1. Fix `IdentityPolicy.validateAccountAction` school scoping

`src/policies/IdentityPolicy.ts` already defines a school-scoped `reset_password` grant for `ADMIN`:

```ts
can(['read', 'block', 'reset_password'], 'User', {
  schoolId: user.schoolId,
  role: { $in: [Role.TEACHER, Role.PARENT, Role.FINANCE, Role.DIRECTOR] }
})
```

But every current call site of `validateAccountAction(actor, targetUserId, targetRole, action)` (in `src/services/auth.service.ts`, lines ~320, ~331, ~481) builds the resource passed to `can()` as `{ __typename: 'User', id, role }` — **no `schoolId`**. `enforceIsolation` and the CASL conditions matcher both compare against `resource.schoolId`, which is `undefined`, so the ADMIN-scoped grant can never match. This is a pre-existing gap (currently masked because none of the 3 existing call sites are reachable by an ADMIN actor — they're only hit from SuperAdmin-only routes). It must be fixed for the new Admin-facing endpoint to work at all.

Change:
- `validateAccountAction(actor, targetUserId, targetRole, action, targetSchoolId?: number)` — add the optional 5th param, include `schoolId: targetSchoolId` in the resource object passed to `can()`.
- Update the 3 existing call sites to pass `user.schoolId` (they already fetch `user` from Prisma before calling it — no extra query needed).
- New call site (below) passes it too.

### 2. `AuthService.adminRegeneratePassword`

New method in `src/services/auth.service.ts`, next to `resetPassword`/`changePassword`:

```ts
static async adminRegeneratePassword(actor: UserSession, targetUserId: number) {
  const user = await prisma.user.findUnique({ where: { id: targetUserId } });
  if (!user) throw new NotFoundError('USER_NOT_FOUND');
  await IdentityPolicy.validateAccountAction(actor, user.id, user.role, 'reset_password', user.schoolId ?? undefined);

  const tempPassword = generateTempPassword(); // new small helper, crypto-random, 12 chars, mixed case+digits, no ambiguous chars
  await prisma.$transaction([
    prisma.user.update({
      where: { id: user.id },
      data: {
        password: await this.hashPassword(tempPassword),
        passwordResetToken: null,
        tokenExpiresAt: null,
        failedLoginAttempts: 0,
      },
    }),
    prisma.userSession.updateMany({ where: { userId: user.id }, data: { isRevoked: true } }),
  ]);
  await redis.del(this.loginLockoutKey(user.id));
  await this.notifyPasswordChanged(user);

  await AuditService.log({
    schoolId: user.schoolId ?? 0,
    actorId: actor.id,
    action: AuditActions.ADMIN_PASSWORD_RESET,
    resource: 'User',
    resourceId: user.id,
    severity: 'WARNING',
    description: `Mot de passe régénéré pour l'utilisateur #${user.id} par #${actor.id}`,
  });

  return {
    tempPassword,
    user: { id: user.id, firstName: user.firstName, lastName: user.lastName, email: user.email },
  };
}
```

`generateTempPassword()` — small helper (in `auth.service.ts` or `utils/`), `crypto.randomBytes`-based, avoids ambiguous characters (`0/O`, `1/l/I`), ~12 chars, guarantees at least one upper, one lower, one digit.

### 3. Audit constant

`src/services/audit/audit.constants.ts` — add `ADMIN_PASSWORD_RESET: 'ADMIN_PASSWORD_RESET'` to `AuditActions`, and `ADMIN_PASSWORD_RESET: 'WARNING'` to `ActionSeverityMap`.

### 4. SuperAdmin route

- `src/modules/web/superadmin/auth.superadmin.controller.ts` — new `regeneratePassword` handler, mirrors `resetUserMFA`: calls `AuthService.adminRegeneratePassword(req.user, Number(req.params.userId))`, returns `ApiResponse.success(data, 'Mot de passe régénéré.')`.
- `src/modules/web/superadmin/routes/auth.routes.ts` — `router.post('/regenerate-password/:userId', validateAll(SuperAdminSchema.userTargetParams), SuperAdminAuthController.regeneratePassword)`. Reuses the existing `userTargetParams` validator (already used by `reset-mfa`).

### 5. Admin route

- `src/modules/web/admin/user.controller.ts` (`AdminUserController`) or `admin.controller.ts` (`AdminController`, wherever `listSchoolStaff`/`createUser`/`disableStaff` already live for `/admin/staff`) — new `resetStaffPassword` handler: calls `AuthService.adminRegeneratePassword(req.user, Number(req.params.id))`.
- `src/modules/web/admin/routes/admin.routes.ts` — next to the existing staff routes:
  ```ts
  router.post('/staff/:id/reset-password', AdminController.resetStaffPassword);
  ```
  No extra validation schema needed beyond a numeric `:id` (follow existing convention for that file — check whether sibling routes there use `validate(...)` or rely on the service's own `NotFoundError`).

The `IdentityPolicy` grant already restricts the admin's targets to `TEACHER | PARENT | FINANCE | DIRECTOR` in their own school, and denies self-targeting isn't an issue since `reset_password` isn't in the `cannot([...], { id: user.id })` block — but an admin resetting their own password via this endpoint isn't a real scenario (they're not in the target role list `TEACHER/PARENT/FINANCE/DIRECTOR` matched against their own role `ADMIN`), so it's naturally excluded.

## Frontend changes (`frontend`)

### API clients

- `src/lib/superAdmin/api/auth.api.ts` — add:
  ```ts
  regeneratePassword: (userId: number) =>
    apiClient
      .post<{ success: boolean; data: { tempPassword: string; user: { id: number; firstName: string; lastName: string; email: string } }; message: string }>(`/superadmin/auth/regenerate-password/${userId}`)
      .then((r) => r.data.data),
  ```
- `src/lib/admin/api/staff.api.ts` — add:
  ```ts
  resetPassword: (id: number) =>
    apiClient
      .post<{ success: boolean; data: { tempPassword: string; user: { id: number; firstName: string; lastName: string; email: string } } }>(`/admin/staff/${id}/reset-password`)
      .then((r) => r.data.data),
  ```

### Types

- `src/types/super-admin.ts` — add `RegeneratePasswordResult { tempPassword: string; user: { id: number; firstName: string; lastName: string; email: string } }`.
- `src/types/admin.ts` — same shape, local to that file (existing pattern: admin/superAdmin types are kept separate, not shared).

### Hooks

- `src/lib/hooks/use-super-admin.ts` — `useRegeneratePasswordSuperAdmin()`, a `useMutation` wrapping `authApi` (via `superAdminApi`) `.regeneratePassword`.
- `src/lib/hooks/use-admin.ts` — `useResetStaffPassword()`, a `useMutation` wrapping `staffApi.resetPassword`.

### Shared component: `TempPasswordRevealModal`

New file `src/components/ui/temp-password-reveal-modal.tsx`. Visual language matches `ConfirmDialog` (same overlay/card treatment). Props:

```ts
{ open: boolean; userName: string; tempPassword: string; onClose: () => void }
```

Shows: user name, the password in a monospace box with a copy button (reuse the `CopyInline`-style pattern already in `auth-management/page.tsx`), and a warning line: "Ce mot de passe ne sera plus affiché — transmettez-le maintenant à l'utilisateur."

### SuperAdmin: new "Comptes" page

`src/app/(superAdmin)/super-admin/accounts/page.tsx`:
- Table sourced from `coreApi.listCoreUsers({ page, take, role, q })` (already implemented in `src/lib/superAdmin/api/core.api.ts`, currently unused in any UI).
- Columns: Nom, Email, Rôle, École, Créé le, Actions.
- Search input (debounced, bound to `q`) + role filter `<select>` (reuse `ROLE_OPTIONS` pattern from `auth-management/page.tsx`, extended with `SUPER_ADMIN`/`PARENT` as read-only-looking rows if the API returns them — the regenerate action is still available for any role since the backend enforces the real restriction).
- Pagination (reuse whatever pagination UI pattern exists elsewhere in the SuperAdmin app, e.g. `students/page.tsx` — check at implementation time).
- Row action: `KeyRound` icon button → `ConfirmDialog` ("Régénérer le mot de passe de {name} ? Cette action déconnecte immédiatement tous ses appareils.") → on confirm, call `useRegeneratePasswordSuperAdmin` → on success, open `TempPasswordRevealModal` with the result; on error, inline feedback (reuse the `Feedback` component pattern from `auth-management/page.tsx`).

### SuperAdmin: nav entry

`src/components/layout/super-admin-nav.tsx` — add `{ label: 'Comptes', href: '/super-admin/accounts', icon: Users }` under the "Accès & sécurité" section (before or after "Accès").

### Admin: staff page action

`src/app/(admin)/admin/staff/page.tsx` — in the actions cell (currently holds the "Affecter les sections" and "Désactiver" buttons), add a `KeyRound` button, shown for all roles except `ADMIN` (same guard as the disable button), wired the same way: `ConfirmDialog` → `useResetStaffPassword` → `TempPasswordRevealModal`.

## Not doing

- Not modifying the existing SuperAdmin "Reset mot de passe" (email) card — kept as an alternate path.
- No "force password change on next login" schema flag.
- No Admin-side global list — the existing `/admin/staff` page already *is* the school's account list; only the action is added there.

## Testing

- Backend: unit test for `AuthService.adminRegeneratePassword` (temp password persisted+hashed, sessions revoked, audit log written) and a policy test confirming an `ADMIN` actor can regenerate a `TEACHER`'s password in their own school but not in another school, and cannot target a `SUPER_ADMIN`/`ADMIN` account. Given the near-zero existing test coverage on the frontend (per prior tech-debt audit) and the backend repo's existing `__tests__` conventions (e.g. `auth.service.security.test.ts`), follow the backend's existing test patterns; frontend changes get manual verification only (dev server, both platforms), consistent with current repo practice.
