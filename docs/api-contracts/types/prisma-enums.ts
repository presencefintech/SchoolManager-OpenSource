/**
 * Enums de référence — alignés sur prisma/schema.prisma (backend).
 * Copie lecture seule pour docs/api-contracts ; pas de dépendance @prisma/client dans le front.
 */

export const RefundRequestStatuses = {
  PENDING: 'PENDING',
  APPROVED: 'APPROVED',
  PROCESSING: 'PROCESSING',
  REJECTED: 'REJECTED',
  PROCESSED: 'PROCESSED',
  FAILED: 'FAILED',
} as const

export type RefundRequestStatusValue =
  (typeof RefundRequestStatuses)[keyof typeof RefundRequestStatuses]

export const GatewayRefundStatuses = {
  SKIPPED: 'SKIPPED',
  PENDING: 'PENDING',
  COMPLETED: 'COMPLETED',
  FAILED: 'FAILED',
  MANUAL: 'MANUAL',
  NOT_SUPPORTED: 'NOT_SUPPORTED',
} as const

export type GatewayRefundStatusValue =
  (typeof GatewayRefundStatuses)[keyof typeof GatewayRefundStatuses]

export type RefundRequestStatus = RefundRequestStatusValue
export type GatewayRefundStatus = GatewayRefundStatusValue

export function asRefundStatus(value: RefundRequestStatusValue): RefundRequestStatus {
  return value
}

export function asGatewayRefundStatus(value: GatewayRefundStatusValue): GatewayRefundStatus {
  return value
}

/** Champs Phase 4 — présents en DB */
export type RefundRequestGatewayFields = {
  gatewayProvider: string | null
  gatewayRefundRef: string | null
  gatewayStatus: GatewayRefundStatus | null
  correlationId: string | null
  processedAt: Date | null
}

export const Role = {
  SUPER_ADMIN: 'SUPER_ADMIN',
  ADMIN: 'ADMIN',
  FINANCE: 'FINANCE',
  TEACHER: 'TEACHER',
  PARENT: 'PARENT',
  DIRECTOR: 'DIRECTOR',
  IT: 'IT',
} as const

export type RoleValue = (typeof Role)[keyof typeof Role]

export const StudentStatus = {
  ACTIVE: 'ACTIVE',
  SUSPENDED: 'SUSPENDED',
  GRADUATED: 'GRADUATED',
  INACTIVE: 'INACTIVE',
  DROPPED: 'DROPPED',
  PENDING_ENROLLMENT: 'PENDING_ENROLLMENT',
  DELETED: 'DELETED',
} as const

export type StudentStatusValue = (typeof StudentStatus)[keyof typeof StudentStatus]
