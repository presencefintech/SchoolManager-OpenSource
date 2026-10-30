/**
 * Libellés d’affichage FR pour enums / codes techniques.
 * Les valeurs API restent en SCREAMING_SNAKE — seul le rendu UI est humanisé.
 */

export function humanizeEnum(value: string | null | undefined): string {
  if (!value) return '—'
  const cleaned = value.replace(/[_-]+/g, ' ').trim()
  if (!cleaned) return '—'
  return cleaned.charAt(0).toUpperCase() + cleaned.slice(1).toLowerCase()
}

const SEVERITY_LABELS: Record<string, string> = {
  INFO: 'Info',
  WARNING: 'Avertissement',
  CRITICAL: 'Critique',
  SECURITY: 'Sécurité',
  HIGH: 'Élevé',
  MEDIUM: 'Moyen',
  LOW: 'Faible',
}

export function severityLabel(value: string | null | undefined): string {
  if (!value) return '—'
  return SEVERITY_LABELS[value.toUpperCase()] ?? humanizeEnum(value)
}

const AUDIT_ACTION_LABELS: Record<string, string> = {
  ACCESS_DENIED: 'Accès refusé',
  START_IMPERSONATION: 'Démarrage d’impersonation',
  END_IMPERSONATION: 'Fin d’impersonation',
  SUPPORT_PASSWORD_RESET: 'Réinitialisation mot de passe (support)',
  EMERGENCY_ADMIN_BOOTSTRAP: 'Bootstrap d’urgence admin école',
  SCHOOL_ONBOARDED: 'École onboardée',
  STAFF_INVITED: 'Invitation staff envoyée',
  STAFF_INVITE_WHATSAPP_LINK: 'Lien WhatsApp invitation (manuel)',
  STAFF_INVITATION_RESENT: 'Invitation staff renvoyée',
  SUPPORT_CASH_PAYMENT: 'Paiement cash (support)',
  PLATFORM_BROADCAST: 'Diffusion plateforme',
  PLATFORM_BROADCAST_READ: 'Diffusion lue',
  LOGIN: 'Connexion',
  LOGOUT: 'Déconnexion',
  CREATE: 'Création',
  UPDATE: 'Mise à jour',
  DELETE: 'Suppression',
  SUSPEND_SCHOOL: 'Suspension d’école',
  ACTIVATE_SCHOOL: 'Activation d’école',
  PASSWORD_RESET: 'Réinitialisation mot de passe',
  IMPERSONATE: 'Impersonation',
}

export function auditActionLabel(value: string | null | undefined): string {
  if (!value) return '—'
  return AUDIT_ACTION_LABELS[value] ?? AUDIT_ACTION_LABELS[value.toUpperCase()] ?? humanizeEnum(value)
}

const PAYMENT_STATUS_LABELS: Record<string, string> = {
  PENDING: 'En attente',
  COMPLETED: 'Réussi',
  CONFIRMED: 'Confirmé',
  RECONCILED: 'Confirmé',
  FAILED: 'Échoué',
  CANCELLED: 'Annulé',
  CANCELED: 'Annulé',
  REFUNDED: 'Remboursé',
  PROCESSING: 'En cours',
  SUSPICIOUS: 'À contrôler',
}

export function paymentStatusLabel(value: string | null | undefined): string {
  if (!value) return '—'
  return PAYMENT_STATUS_LABELS[value.toUpperCase()] ?? humanizeEnum(value)
}

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  CASH: 'Espèces',
  MOBILE_MONEY: 'Mobile Money',
  MPESA: 'M-Pesa',
  M_PESA: 'M-Pesa',
  AIRTEL_MONEY: 'Airtel Money',
  ORANGE_MONEY: 'Orange Money',
  CARD: 'Carte',
  BANK_TRANSFER: 'Virement',
  FLUTTERWAVE: 'Opérateur',
  OTHER: 'Autre',
}

const PAYMENT_PROVIDER_LABELS: Record<string, string> = {
  FLUTTERWAVE: 'Opérateur',
  PAWAPAY: 'PawaPay',
  MAXICASH: 'Maxicash',
  MPESA: 'M-Pesa',
  ORANGE: 'Orange Money',
  AIRTEL: 'Airtel Money',
}

export function paymentProviderLabel(value: string | null | undefined): string {
  if (!value) return '—'
  const key = value.toUpperCase()
  return PAYMENT_PROVIDER_LABELS[key] ?? paymentMethodLabel(value)
}

export function paymentMethodLabel(value: string | null | undefined): string {
  if (!value) return '—'
  return PAYMENT_METHOD_LABELS[value.toUpperCase()] ?? humanizeEnum(value)
}

const LIFECYCLE_LABELS: Record<string, string> = {
  ACTIVE: 'Actif',
  SUSPENDED: 'Suspendu',
  PENDING: 'En attente',
  EXPIRED: 'Expiré',
  INACTIVE: 'Inactif',
  AT_RISK: 'À risque',
}

export function lifecycleStatusLabel(value: string | null | undefined): string {
  if (!value) return '—'
  return LIFECYCLE_LABELS[value.toUpperCase()] ?? humanizeEnum(value)
}

const TIER_LABELS: Record<string, string> = {
  BASIC: 'Basique',
  PREMIUM: 'Premium',
  ENTERPRISE: 'Entreprise',
}

export function subscriptionTierLabel(value: string | null | undefined): string {
  if (!value) return 'Basique'
  return TIER_LABELS[value.toUpperCase()] ?? humanizeEnum(value)
}

const KYC_STATUS_LABELS: Record<string, string> = {
  VERIFIED: 'Vérifié',
  REJECTED: 'Rejeté',
  PENDING: 'En attente',
  NOT_CONFIGURED: 'Non configuré',
  UNVERIFIED: 'Non vérifié',
}

export function kycStatusLabel(value: string | null | undefined): string {
  if (!value) return '—'
  return KYC_STATUS_LABELS[value.toUpperCase()] ?? humanizeEnum(value)
}

const STUDENT_STATUS_LABELS: Record<string, string> = {
  ACTIVE: 'Actif',
  INACTIVE: 'Inactif',
  SUSPENDED: 'Suspendu',
  GRADUATED: 'Diplômé',
  TRANSFERRED: 'Transféré',
  WITHDRAWN: 'Retiré',
  PENDING: 'En attente',
}

export function studentStatusLabel(value: string | null | undefined): string {
  if (!value) return '—'
  return STUDENT_STATUS_LABELS[value.toUpperCase()] ?? humanizeEnum(value)
}

const DELIVERY_STATUS_LABELS: Record<string, string> = {
  SENT: 'Envoyé',
  FAILED: 'Échoué',
  PENDING: 'En attente',
  QUEUED: 'En file',
  DELIVERED: 'Distribué',
  BOUNCED: 'Rejeté',
  READ: 'Lu',
  PAID: 'Payée',
  UNPAID: 'Impayée',
  OVERDUE: 'En retard',
  DRAFT: 'Brouillon',
  CANCELLED: 'Annulée',
  ACCEPTED: 'Acceptée',
  EXPIRED: 'Expirée',
  REVOKED: 'Révoquée',
}

export function deliveryStatusLabel(value: string | null | undefined): string {
  if (!value) return '—'
  return DELIVERY_STATUS_LABELS[value.toUpperCase()] ?? humanizeEnum(value)
}

const ROLE_LABELS: Record<string, string> = {
  SUPER_ADMIN: 'Superadmin',
  ADMIN: 'Administrateur',
  DIRECTOR: 'Directeur',
  TEACHER: 'Enseignant',
  PARENT: 'Parent',
  FINANCE: 'Finance',
  MANAGER: 'Gérant',
  CASHIER: 'Caissier',
  STAFF: 'Personnel',
}

export function roleLabel(value: string | null | undefined): string {
  if (!value) return '—'
  return ROLE_LABELS[value.toUpperCase()] ?? humanizeEnum(value)
}

const RISK_LABELS: Record<string, string> = {
  LOW: 'Faible',
  MEDIUM: 'Moyen',
  HIGH: 'Élevé',
  CRITICAL: 'Critique',
}

export function riskLevelLabel(value: string | null | undefined): string {
  if (!value) return '—'
  return RISK_LABELS[value.toUpperCase()] ?? humanizeEnum(value)
}

const HEALTH_STATUS_LABELS: Record<string, string> = {
  ok: 'Opérationnel',
  degraded: 'Dégradé',
  down: 'Hors service',
  healthy: 'Opérationnel',
  unhealthy: 'Hors service',
  up: 'Opérationnel',
}

export function healthStatusLabel(value: string | null | undefined): string {
  if (!value) return '—'
  return HEALTH_STATUS_LABELS[value.toLowerCase()] ?? humanizeEnum(value)
}

const SERVICE_LABELS: Record<string, string> = {
  db: 'Base de données',
  database: 'Base de données',
  redis: 'Cache',
  notifications: 'Notifications push',
  biometrics: 'Biométrie',
  sms: 'SMS',
  whatsapp: 'WhatsApp',
  queue: 'File de traitement',
  storage: 'Stockage',
}

export function serviceLabel(value: string | null | undefined): string {
  if (!value) return '—'
  return SERVICE_LABELS[value.toLowerCase()] ?? humanizeEnum(value)
}

const ENV_LABELS: Record<string, string> = {
  production: 'Production',
  prod: 'Production',
  staging: 'Préproduction',
  development: 'Développement',
  dev: 'Développement',
  test: 'Test',
}

export function environmentLabel(value: string | null | undefined): string {
  if (!value) return '—'
  return ENV_LABELS[value.toLowerCase()] ?? humanizeEnum(value)
}

const QUEUE_STATE_LABELS: Record<string, string> = {
  waiting: 'En attente',
  active: 'En cours',
  completed: 'Terminés',
  failed: 'Échoués',
  delayed: 'Différés',
  paused: 'En pause',
}

export function queueStateLabel(value: string | null | undefined): string {
  if (!value) return '—'
  return QUEUE_STATE_LABELS[value.toLowerCase()] ?? humanizeEnum(value)
}

/** Formate une valeur technique (bool, date ISO, enum) pour affichage secondaire. */
export function formatDetailValue(value: unknown): string {
  if (value == null) return '—'
  if (typeof value === 'boolean') return value ? 'Oui' : 'Non'
  if (typeof value === 'number') return value.toLocaleString('fr-FR')
  if (typeof value === 'string') {
    if (/^\d{4}-\d{2}-\d{2}T/.test(value)) {
      try {
        return new Date(value).toLocaleString('fr-FR', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        })
      } catch {
        return value
      }
    }
    if (/^[A-Z][A-Z0-9_]+$/.test(value)) return humanizeEnum(value)
    return value
  }
  if (Array.isArray(value)) return value.map(formatDetailValue).join(', ')
  try {
    return JSON.stringify(value)
  } catch {
    return String(value)
  }
}
