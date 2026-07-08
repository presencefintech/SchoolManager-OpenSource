# PresenceFintech — Audit architecture & plan d'amélioration

> Document de référence pour le module financier et le système de notifications.
> Dernière mise à jour : juillet 2026.
> Statut : **à reprendre** — audit initial, implémentation partielle en codebase.

---

## Table des matières

1. [Contexte](#1-contexte)
2. [Schéma SQL relationnel (PostgreSQL)](#2-schéma-sql-relationnel-postgresql)
3. [Gestion financière et transactionnelle](#3-gestion-financière-et-transactionnelle)
4. [Notifications et validation téléphone (RDC)](#4-notifications-et-validation-téléphone-rdc)
5. [Dashboard temps réel, audit JSONB et RBAC](#5-dashboard-temps-réel-audit-jsonb-et-rbac)
6. [Auditer le caissier depuis l'interface admin](#6-auditer-le-caissier-depuis-linterface-admin)
7. [Synthèse des écarts à combler](#7-synthèse-des-écarts-à-combler)
8. [Références codebase](#8-références-codebase)

---

## 1. Contexte

Ce document formalise l'architecture cible du module financier PresenceFintech pour l'ERP scolaire. Il s'aligne sur le backend existant (`presence-app/backend`, Express + Prisma + PostgreSQL + Redis/BullMQ) et le frontend Next.js (`presence-app/frontend_web`).

**Points clés du modèle métier :**

- Le rôle guichet est **`FINANCE`** (pas `CASHIER`).
- Les paiements manuels suivent un workflow : enregistrement par le guichet → validation par l'administrateur (surtout pour le CASH).
- Chaque transaction validée génère un **reçu numérique unique** (`receipt_number`).
- Toute modification de paiement est tracée via **`audit_logs`** (`before` / `after` en JSONB).

### Correspondance sémantique (spec initiale ↔ codebase)

| Spec demandée | PresenceFintech (existant) |
|---|---|
| `pending` | `PENDING` |
| `completed` | `CONFIRMED` |
| `verified` | `RECONCILED` (+ `PaymentVerification.adminCheck`) |
| `cancelled` | `FAILED` / `REFUNDED` |
| `mobile_money` | `ORANGE_MONEY`, `MPESA`, `AIRTEL_MONEY` |
| `bank` | `BANK` |
| `cash` | `CASH` |

---

## 2. Schéma SQL relationnel (PostgreSQL)

### ENUMS

```sql
CREATE TYPE payment_status AS ENUM (
  'PENDING',
  'CONFIRMED',
  'RECONCILED',
  'FAILED',
  'REFUNDED',
  'SUSPICIOUS'
);

CREATE TYPE payment_method AS ENUM (
  'CASH',
  'ORANGE_MONEY',
  'MPESA',
  'AIRTEL_MONEY',
  'BANK',
  'CARD'
);

CREATE TYPE user_role AS ENUM (
  'SUPER_ADMIN', 'ADMIN', 'FINANCE', 'TEACHER', 'PARENT', 'STUDENT'
);
```

### Table `users` (acteurs : caissier, admin, parent…)

```sql
CREATE TABLE users (
  id              SERIAL PRIMARY KEY,
  uuid            UUID NOT NULL DEFAULT gen_random_uuid() UNIQUE,
  school_id       INT NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  email           VARCHAR(255) UNIQUE,
  phone           VARCHAR(20),                    -- E.164 +243…
  phone_verified  BOOLEAN NOT NULL DEFAULT FALSE,
  role            user_role NOT NULL,
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_users_school_role ON users(school_id, role);
CREATE INDEX idx_users_phone ON users(phone);
```

### Tables `classes` et `students`

```sql
CREATE TABLE classes (
  id          SERIAL PRIMARY KEY,
  school_id   INT NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  name        VARCHAR(100) NOT NULL,
  level       VARCHAR(50),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (school_id, name)
);

CREATE TABLE students (
  id            SERIAL PRIMARY KEY,
  school_id     INT NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  class_id      INT REFERENCES classes(id) ON DELETE SET NULL,
  matricule     VARCHAR(50) NOT NULL,
  first_name    VARCHAR(100) NOT NULL,
  last_name     VARCHAR(100) NOT NULL,
  fees_balance  NUMERIC(20,2) NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (school_id, matricule)
);
```

### Table `payments` (cœur comptable)

```sql
CREATE TABLE payments (
  id                SERIAL PRIMARY KEY,
  student_id        INT NOT NULL REFERENCES students(id) ON DELETE RESTRICT,
  school_id         INT NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  session_id        INT REFERENCES academic_sessions(id),

  -- Traçabilité acteurs
  created_by_id     INT REFERENCES users(id) ON DELETE SET NULL,   -- guichet FINANCE
  confirmed_by_id   INT REFERENCES users(id) ON DELETE SET NULL,   -- validateur
  verified_at       TIMESTAMPTZ,

  amount            NUMERIC(20,2) NOT NULL CHECK (amount > 0),
  amount_in_base    NUMERIC(20,2) NOT NULL,
  currency          VARCHAR(3) NOT NULL DEFAULT 'USD',
  method            payment_method NOT NULL,
  status            payment_status NOT NULL DEFAULT 'PENDING',

  reference         VARCHAR(64) NOT NULL UNIQUE,       -- ref métier PAY-…
  provider_ref      VARCHAR(128) UNIQUE,
  idempotency_key   VARCHAR(128) UNIQUE,               -- anti double-clic
  receipt_number    VARCHAR(64) UNIQUE,                -- reçu numérique unique
  receipt_hmac      VARCHAR(128),                      -- intégrité reçu
  receipt_url       TEXT,

  phone             VARCHAR(20),
  audit_trail       JSONB NOT NULL DEFAULT '[]',       -- historique inline
  locked_at         TIMESTAMPTZ,                        -- scellé comptable

  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_payments_school_status ON payments(school_id, status);
CREATE INDEX idx_payments_student ON payments(student_id, created_at DESC);
CREATE INDEX idx_payments_created_by ON payments(created_by_id);
```

### Table `payment_verifications` (workflow caissier → admin)

```sql
CREATE TABLE payment_verifications (
  id                  SERIAL PRIMARY KEY,
  payment_id          INT NOT NULL UNIQUE REFERENCES payments(id) ON DELETE CASCADE,
  status              VARCHAR(20) NOT NULL DEFAULT 'PENDING',
  finance_check       BOOLEAN NOT NULL DEFAULT FALSE,
  finance_check_by    INT REFERENCES users(id),
  finance_check_at    TIMESTAMPTZ,
  admin_check         BOOLEAN NOT NULL DEFAULT FALSE,
  admin_check_by      INT REFERENCES users(id),
  admin_check_at      TIMESTAMPTZ,
  suspicion           BOOLEAN NOT NULL DEFAULT FALSE,
  fraud_score         FLOAT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### Table `audit_logs` (traçabilité immuable)

```sql
CREATE TABLE audit_logs (
  id            SERIAL PRIMARY KEY,
  school_id     INT NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  actor_id      INT REFERENCES users(id) ON DELETE SET NULL,
  payment_id    INT REFERENCES payments(id) ON DELETE CASCADE,

  action        VARCHAR(64) NOT NULL,     -- CREATE_PAYMENT, VERIFY_PAYMENT…
  resource      VARCHAR(64) NOT NULL,     -- Payment, Student…
  resource_id   INT,

  before        JSONB,                    -- état précédent
  after         JSONB,                    -- état actuel
  payload       JSONB,                    -- contexte (IP, montant, etc.)
  ip_address    INET,
  user_agent    TEXT,
  severity      VARCHAR(16) NOT NULL DEFAULT 'INFO',

  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_audit_school_created ON audit_logs(school_id, created_at DESC);
CREATE INDEX idx_audit_payment ON audit_logs(payment_id);
CREATE INDEX idx_audit_actor ON audit_logs(actor_id, created_at DESC);
CREATE INDEX idx_audit_before_gin ON audit_logs USING GIN (before);
CREATE INDEX idx_audit_after_gin ON audit_logs USING GIN (after);
```

### Règles d'intégrité référentielle

| Règle | Justification |
|---|---|
| `ON DELETE RESTRICT` sur `payments.student_id` | Impossible de supprimer un élève avec des paiements |
| `created_by_id` / `confirmed_by_id` | Traçabilité caissier vs validateur |
| `idempotency_key UNIQUE` | Idempotence réseau (guichet) |
| `receipt_number UNIQUE` | Reçu numérique unique par transaction validée |
| `audit_logs.before/after JSONB` | Snapshot immuable à chaque mutation |

> **Note :** Ce schéma est déjà modélisé dans `backend/prisma/schema.prisma` (`Payment`, `AuditLog`, `PaymentVerification`, etc.).

---

## 3. Gestion financière et transactionnelle

### PaymentService — transactions ACID

Exemple canonique du flux manuel (guichet → admin) :

```typescript
// payment.service.ts — flux manuel ACID
import prisma from '../config/prisma';
import { PaymentMethod, PaymentStatus, Prisma } from '@prisma/client';
import { PaymentUtils } from '../utils/payment.utils';
import { FinancePolicy } from '../policies/FinancePolicy';
import type { UserSession } from '../types/express';

interface ManualPaymentInput {
  studentId: number;
  amount: number;
  method: PaymentMethod;
  feeStructureId?: number;
  monthYear?: string;
  idempotencyKey?: string;
  manualJustification?: string;
}

export class PaymentService {
  static async registerManualPayment(
    session: UserSession,
    dto: ManualPaymentInput
  ) {
    FinancePolicy.enforce(session, 'create', {
      schoolId: session.schoolId,
      method: dto.method,
      __typename: 'Payment',
    });

    if (dto.idempotencyKey) {
      const existing = await prisma.payment.findFirst({
        where: { idempotencyKey: dto.idempotencyKey, schoolId: session.schoolId },
      });
      if (existing) return existing;
    }

    const reference = PaymentUtils.generateSecureReference('PAY');
    const isCash = dto.method === PaymentMethod.CASH;

    return prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const student = await tx.student.findFirst({
        where: { id: dto.studentId, schoolId: session.schoolId },
      });
      if (!student) throw new Error('STUDENT_NOT_FOUND');

      const payment = await tx.payment.create({
        data: {
          studentId: dto.studentId,
          schoolId: session.schoolId,
          amount: dto.amount,
          amountInBase: dto.amount,
          method: dto.method,
          reference,
          idempotencyKey: dto.idempotencyKey,
          createdById: session.id,
          status: isCash ? PaymentStatus.CONFIRMED : PaymentStatus.PENDING,
          confirmedById: isCash ? session.id : null,
          confirmedAt: isCash ? new Date() : null,
          reconciliationNote: dto.manualJustification,
          auditTrail: [{ action: 'PAYMENT_CREATED', actorId: session.id, at: new Date() }],
          paymentFees: dto.feeStructureId
            ? { create: [{ feeStructureId: dto.feeStructureId, amount: dto.amount, monthYear: dto.monthYear }] }
            : undefined,
        },
      });

      if (!isCash) {
        await tx.paymentVerification.create({
          data: { paymentId: payment.id, status: 'PENDING' },
        });
      }

      await tx.auditLog.create({
        data: {
          schoolId: session.schoolId,
          actorId: session.id,
          paymentId: payment.id,
          action: 'CREATE_PAYMENT',
          resource: 'Payment',
          resourceId: payment.id,
          before: Prisma.JsonNull,
          after: payment as unknown as Prisma.InputJsonValue,
        },
      });

      if (isCash) {
        await this.applyConfirmedEffects(tx, payment, session);
      }

      return payment;
    }, {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      timeout: 15_000,
    });
  }

  static async verifyPayment(session: UserSession, paymentId: number) {
    FinancePolicy.enforce(session, 'verify', {
      schoolId: session.schoolId,
      method: PaymentMethod.CASH,
      __typename: 'Payment',
    });

    return prisma.$transaction(async (tx) => {
      const before = await tx.payment.findFirstOrThrow({
        where: { id: paymentId, schoolId: session.schoolId, status: PaymentStatus.PENDING },
      });

      const after = await tx.payment.update({
        where: { id: paymentId },
        data: {
          status: PaymentStatus.CONFIRMED,
          confirmedById: session.id,
          confirmedAt: new Date(),
          verifiedAt: new Date(),
          receiptNumber: PaymentUtils.generateReceiptNumber(paymentId),
        },
      });

      await tx.paymentVerification.update({
        where: { paymentId },
        data: {
          adminCheck: true,
          adminCheckBy: session.id,
          adminCheckAt: new Date(),
          status: 'VERIFIED',
        },
      });

      await tx.auditLog.create({
        data: {
          schoolId: session.schoolId,
          actorId: session.id,
          paymentId,
          action: 'VERIFY_PAYMENT',
          resource: 'Payment',
          resourceId: paymentId,
          before: before as unknown as Prisma.InputJsonValue,
          after: after as unknown as Prisma.InputJsonValue,
        },
      });

      await this.applyConfirmedEffects(tx, after, session);
      return after;
    });
  }

  private static async applyConfirmedEffects(
    tx: Prisma.TransactionClient,
    payment: { id: number; studentId: number; amount: Prisma.Decimal; schoolId: number },
    session: UserSession
  ) {
    // Décrémenter solde élève, générer reçu PDF (async via BullMQ)
    // → PaymentConfirmationService.confirmPayment() dans la codebase
  }
}
```

### Workflow caissier → administrateur

```
FINANCE (guichet)
  → POST /payments/process (PENDING + preuve)
  → payment + payment_verification + audit_log
  → retour : reference + statut PENDING

ADMIN
  → PATCH /payments/:id/verify
  → status=CONFIRMED, receipt_number, audit before/after
  → solde élève, scellé comptable
  → notification parent (async BullMQ)
  → dashboard WebSocket mis à jour
```

**Règle métier codée dans `FinancePolicy` :** le rôle `FINANCE` ne peut **pas** valider les paiements `CASH` — seul un `ADMIN` le peut.

### Reçu numérique unique

Champs concernés sur `payments` :

- `receipt_number` — identifiant unique du reçu
- `receipt_hmac` — intégrité cryptographique
- `receipt_url` — lien PDF généré
- `receipt_generated_at` — horodatage

Service existant : `backend/src/services/receipt.service.ts`

---

## 4. Notifications et validation téléphone (RDC)

### libphonenumber-js (à intégrer)

Aujourd'hui, `backend/src/utils/phone.util.ts` normalise les variantes RDC manuellement. Pour une validation stricte E.164 :

```typescript
// utils/phone-rdc.util.ts (proposé)
import { parsePhoneNumberFromString, CountryCode } from 'libphonenumber-js';

const RDC: CountryCode = 'CD';

export function validateRdcPhone(raw: string): { valid: boolean; e164: string | null } {
  const parsed = parsePhoneNumberFromString(raw, RDC);
  if (!parsed?.isValid() || parsed.country !== 'CD') {
    return { valid: false, e164: null };
  }
  return { valid: true, e164: parsed.format('E.164') }; // +24381XXXXXXX
}
```

**Points d'intégration :** inscription parent, `OtpService.requestOtp`, `PaymentModal` (numéro mobile money).

### Flux OTP (existant)

```
POST /api/v1/auth/request-otp  { phone, schoolId }
  → validation utilisateur actif
  → code 6 chiffres en Redis (TTL 5 min, max 5 tentatives)
  → envoi SMS via provider (Twilio / mock local)

POST /api/v1/auth/verify-otp   { phone, code }
  → secureCompare + marquer phone_verified
  → audit AUTH_OTP_VERIFIED
```

Service existant : `backend/src/services/sms/otp.service.ts`

### notification.service.ts — envoi asynchrone

Architecture **Outbox + BullMQ** déjà en place :

```
Controller/Service
    ↓
NotificationOutboxRepository.createOrGet()
    ↓
BullMQ queue (notification-outbox)
    ↓
Worker → Twilio SMS / SMTP Email
    ↓
DLQ si échec (notification-dlq.service.ts)
```

Facade proposée :

```typescript
export class NotificationService {
  static async sendSms(userId: number, template: string, vars: Record<string, string>, lang = 'fr') {
    await dispatchDirect(userId, {
      type: 'PAYMENT_SUCCESS',
      title: 'Paiement confirmé',
      body: template,
      schoolId: vars.schoolId,
      correlationId: vars.paymentId,
    }, lang);
  }

  static async sendEmail(userId: number, subject: string, html: string) {
    // même outbox, canal EMAIL
  }

  static async fanout(recipients: FanoutRecipient[], payload: NotificationPayload) {
    return dispatchMany(recipients, payload);
  }
}
```

**Garanties :** at-least-once delivery, retry exponentiel, DLQ pour rejeu manuel depuis l'admin.

Fichiers existants :

- `backend/src/services/notifications/notification-dispatch.service.ts`
- `backend/src/services/notifications/notification-outbox.repository.ts`
- `backend/src/services/notifications/notification-dlq.service.ts`

---

## 5. Dashboard temps réel, audit JSONB et RBAC

### Synchronisation dashboard

Approche hybride implémentée dans `DashboardRealtimeService` :

| Mécanisme | Usage |
|---|---|
| **WebSocket (Socket.IO)** | Événements instantanés : `payment:confirmed`, `verification:pending` |
| **Polling TanStack Query** | Fallback + invalidation ciblée (`['fee-schedule', studentId]`) |
| **Broadcast périodique** | Snapshot toutes les 3 s pour les rooms `control-dashboard:{schoolId}` |

Pattern frontend recommandé :

```typescript
useQuery({
  queryKey: ['admin-finance-dashboard', schoolId],
  staleTime: 5_000,
  refetchInterval: 10_000,
});

useEffect(() => {
  socket.on('finance:payment:updated', () => {
    queryClient.invalidateQueries({ queryKey: ['admin-finance-dashboard'] });
    queryClient.invalidateQueries({ queryKey: ['pending-verifications'] });
  });
}, []);
```

### RBAC middleware

```typescript
export const requireAbility = (action: FinanceAction, subject: FinanceSubject) =>
  (req: Request, res: Response, next: NextFunction) => {
    try {
      FinancePolicy.enforce(req.session, action, {
        schoolId: req.session.schoolId,
        __typename: subject,
      });
      next();
    } catch {
      res.status(403).json({ error: 'FORBIDDEN' });
    }
  };

router.post('/payments/process',
  authenticate,
  requireVerifiedStaff,
  requireAbility('create', 'Payment'),
  PaymentController.process
);

router.patch('/payments/:id/verify',
  authenticate,
  requireAbility('verify', 'Payment'),
  PaymentController.verify
);
```

### Matrice des droits clés

| Action | FINANCE | ADMIN | SUPER_ADMIN |
|---|---|---|---|
| Enregistrer paiement manuel | ✅ | ✅ | ✅ |
| Valider CASH | ❌ | ✅ | ✅ |
| Valider mobile/bank | ✅ | ✅ | ✅ |
| Modifier paiement scellé | ❌ | ❌ | override only |
| Lire audit_logs | ✅ (read) | ✅ (audit) | ✅ |

Policy existante : `backend/src/policies/FinancePolicy.ts`

---

## 6. Auditer le caissier depuis l'interface admin

### Sources de données

| Source | Contenu |
|---|---|
| `audit_logs` | `before` / `after` JSONB + `actor_id` + `action` |
| `payments.audit_trail` | Journal inline par paiement |
| `payment_verifications` | Qui a validé (`finance_check_by`, `admin_check_by`) |
| `ManualPaymentLog` | Preuves justificatives du guichet |

### Requête admin typique

```sql
SELECT
  al.created_at,
  u.first_name || ' ' || u.last_name AS caissier,
  al.action,
  al.before->>'status'   AS statut_avant,
  al.after->>'status'    AS statut_apres,
  al.after->>'amount'    AS montant,
  al.after->>'reference' AS reference,
  al.ip_address
FROM audit_logs al
JOIN users u ON u.id = al.actor_id
WHERE al.school_id = :schoolId
  AND al.resource = 'Payment'
  AND al.actor_id = :cashierUserId
  AND al.created_at BETWEEN :from AND :to
ORDER BY al.created_at DESC
LIMIT 50;
```

### Interface admin recommandée

Page cible : **`/admin/finance/audit`**

| Colonne UI | Source |
|---|---|
| Date/heure | `audit_logs.created_at` |
| Caissier | `users` via `actor_id` |
| Action | `CREATE_PAYMENT`, `VERIFY_PAYMENT`… |
| Référence | `after.reference` |
| Montant | `after.amount` |
| Avant → Après | diff `before.status` → `after.status` |
| IP / User-Agent | traçabilité fraude |
| Lien preuve | `ManualPaymentLog.attachmentUrl` |

### Endpoints API proposés

```
GET /api/v1/admin/finance/audit?actorId=&from=&to=&action=CREATE_PAYMENT
GET /api/v1/admin/finance/audit/:paymentId/timeline
```

### Détection d'anomalies

- Paiements `SUSPICIOUS` ou `fraud_score > seuil`
- Caissier avec volume anormal (> N paiements/heure)
- Écart montant `before.amount` vs `after.amount` (modification interdite post-scellé)
- CASH validé sans `admin_check_by` (violation workflow)

---

## 7. Synthèse des écarts à combler

| Besoin | État actuel | Action recommandée |
|---|---|---|
| Schéma SQL + ENUM | ✅ Prisma/schema.prisma | Documenter mapping sémantique (fait ici) |
| Transactions ACID | ✅ `PaymentService.createPayment` | Renforcer `Serializable` sur confirm |
| Workflow guichet→admin | ✅ `PaymentVerification` + `FinancePolicy` | Compléter UI admin validation |
| Reçu unique | ✅ `receiptNumber` + `ReceiptService` | — |
| libphonenumber-js RDC | ⚠️ normalisation manuelle | Ajouter `libphonenumber-js` |
| OTP inscription | ✅ `OtpService` | Lier à `phone_verified` |
| Notifications async | ✅ Outbox + BullMQ | — |
| WebSocket dashboard | ✅ `DashboardRealtimeService` | Brancher invalidations frontend |
| Audit JSONB before/after | ✅ `AuditLog.before/after` | Page admin timeline |

---

## 8. Références codebase

### Backend

| Fichier | Rôle |
|---|---|
| `prisma/schema.prisma` | Modèles `Payment`, `AuditLog`, `PaymentVerification` |
| `src/services/payment.service.ts` | Création paiement ACID |
| `src/services/payment-confirmation.service.ts` | Conséquences CONFIRMED (solde, reçu) |
| `src/services/finances/payment-verification.service.ts` | File de validation guichet |
| `src/policies/FinancePolicy.ts` | RBAC finance |
| `src/services/dashboard/dashboard-realtime.service.ts` | WebSocket dashboard |
| `src/services/sms/otp.service.ts` | OTP SMS |
| `src/utils/phone.util.ts` | Normalisation téléphone RDC (à remplacer/enrichir) |
| `src/services/receipt.service.ts` | Génération reçus PDF |

### Frontend

| Fichier | Rôle |
|---|---|
| `src/components/finance/student-dashboard/PaymentModal/` | Paiement guichet |
| `src/components/finance/student-dashboard/receipts/PrintReceiptButton.tsx` | Impression reçu |
| `src/lib/hooks/use-finance.ts` | Hooks TanStack Query finance |
| `src/app/(admin)/admin/finance/` | Pages admin finance |
| `docs/FINANCE_WORK_GUIDE.md` | Guide opérationnel existant |

### Endpoints API pertinents

```
GET  /api/v1/finance/students/:studentId/fee-schedule
POST /api/v1/finance/payments/process
GET  /api/v1/finance/payments/receipts/:paymentId/download
POST /api/v1/auth/request-otp
POST /api/v1/auth/verify-otp
POST /api/v1/auth/verify-email
```

---

## Prochaines étapes (à reprendre)

- [ ] Intégrer `libphonenumber-js` dans le backend et le `PaymentModal`
- [ ] Renforcer isolation `Serializable` sur `verifyPayment`
- [ ] Implémenter page `/admin/finance/audit` avec timeline JSONB
- [ ] Brancher invalidations WebSocket côté frontend admin
- [ ] Commit + push branche `feat/finance-payment-modal`
- [ ] Rebase sur `main` après merge `feat/security-identity`
