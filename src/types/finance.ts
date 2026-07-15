export interface FinancePerformance {
  monthlyRevenue: number
  projectedRevenue: number
  collectionEfficiency: number
  arpu: number
  digitalAdoption: number
}

export interface FinanceAuditData {
  pendingVerifications: number
  daysSalesOutstanding: number
  suspiciousActivity: boolean
  isBenfordValid: boolean
  highRiskProfiles: RiskEntry[]
  highRiskCount?: number
  devianceLevel?: number
}

export interface FinanceTreasury {
  totalUnpaid: number
  badDebtEstimate: number
}

export interface ExecutiveDashboard {
  performance: FinancePerformance
  audit: FinanceAuditData
  treasury: FinanceTreasury
}

export interface IntegrityReport {
  status: string
  anomalies?: unknown[]
}

export interface DebtorEntry {
  studentId?: number
  firstName: string
  lastName: string
  className?: string
  balance: number
  totalDue?: number
  totalPaid?: number
  lastPaymentDate?: string
}

export interface RiskEntry {
  studentId?: number
  firstName: string
  lastName: string
  tuitionBalance: number
  balance?: number
  riskLevel?: 'HIGH' | 'MEDIUM' | 'LOW'
  riskScore?: number
  className?: string
  _count?: { presences: number }
}

export interface DailyCashEntry {
  method?: string
  _sum?: { amount: number }
  _count?: { id: number }
}

export type CollectionReport = Record<string, number | string | null>

export interface CashSession {
  id: number
  status: 'OPEN' | 'CLOSED'
  openingBalance?: number
  closingBalance?: number
  openedAt: string
  closedAt?: string
  notes?: string
  totalCollected?: number
  transactionCount?: number
  cashierId?: number
  cashierName?: string
}

export interface CashSessionSummary {
  session: CashSession
  byMethod: { method: string; amount: number; count: number }[]
  totalCollected: number
  transactionCount: number
}

export interface RefundRequest {
  id: number
  uuid?: string
  paymentId: number
  amount: number
  reason: string
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'PROCESSING' | 'PROCESSED' | 'FAILED' | 'CANCELLED' | 'SYNCED'
  reviewNotes?: string
  reviewedAt?: string
  processedAt?: string
  createdAt: string
  requestedBy?: { id: number; name: string } | null
  reviewedBy?: { id: number; name: string } | null
  gateway?: {
    provider?: string
    refundRef?: string
    status?: string
    correlationId?: string
  }
  payment?: {
    reference?: string
    method?: string
    channel?: string
    studentName?: string
    matricule?: string
  }
}

export interface FinanceStudentResult {
  id: number
  name: string
  matricule: string
  className: string | null
}

export interface FeeStructure {
  id: number
  label: string
  amount: number
  description?: string
  classId?: number
  dueDate?: string
}

export interface PendingPayment {
  id: number
  amount: number
  method: string
  reference?: string
  comment?: string
  status: string
  createdAt: string
  createdById?: number
  student?: {
    id: number
    firstName: string
    lastName: string
    matricule?: string
    class?: { name: string }
  }
}

export interface StudentWallet {
  balance: number
  totalPaid: number
  totalDue: number
  lastPaymentAt?: string
  transactions?: { id: number; amount: number; method: string; status: string; createdAt: string }[]
}

export interface ClosingPreview {
  date: string
  totalCash: number
  totalByMethod: Record<string, number>
  sessionId?: number
  transactionCount: number
  pendingCount: number
  canFinalize: boolean
}

// ── Échéancier élève (FeeBillingScheduleService / OpenAPI StudentFeeScheduleDto) ──

export type FeeScheduleLineStatus = 'PAID' | 'PARTIALLY_PAID' | 'DUE' | 'UPCOMING' | 'OVERDUE'

export type FeeBillingPeriod = 'ONE_TIME' | 'MONTHLY' | 'TERM' | 'ANNUAL'

/** Mois facturé YYYY-MM */
export type MonthYear = string

export interface FeeScheduleLineDto {
  feeStructureId: number
  categoryId: number
  categoryCode: string | null
  categoryName: string
  billingPeriod: FeeBillingPeriod
  amount: number
  amountPaid?: number
  amountRemaining?: number
  currency: string
  monthYear: MonthYear | null
  dueDate: string | null
  status: FeeScheduleLineStatus
  paid: boolean
}

export interface PaymentFeeLinePayload {
  feeStructureId: number
  monthYear?: MonthYear
  amount: number
}

export interface FeeScheduleSummaryDto {
  lineCount: number
  paidCount: number
  dueCount: number
  overdueCount: number
  upcomingCount: number
  totalAmountDue: number
  totalAmountPaid: number
  nextDueDate: string | null
  nextDueMonthYear: MonthYear | null
}

export interface StudentFeeScheduleDto {
  studentId: number
  sessionId: number
  sessionLabel: string
  billingStartMonth: MonthYear
  billingEndMonth: MonthYear
  currency: string
  lines: FeeScheduleLineDto[]
  summary: FeeScheduleSummaryDto
}

/** GET /finance/students/:id/fee-periods?feeStructureId= */
export interface StudentFeePeriodStatusDto {
  feeStructureId: number
  billingPeriod: FeeBillingPeriod
  categoryName: string
  sessionLabel: string
  paidMonths: MonthYear[]
  unpaidMonths: MonthYear[]
  nextDueMonth: MonthYear | null
  allowedMonthYear: MonthYear | null
  annualPaid?: boolean
  oneTimePaid?: boolean
}

// ── Paiement manuel (OpenAPI ManualPaymentBody) ─────────────────────────────

export type PaymentMethod =
  | 'CASH'
  | 'BANK'
  | 'BANK_TRANSFER'
  | 'MOBILE_MONEY'
  | 'ORANGE_MONEY'
  | 'MPESA'
  | 'AIRTEL_MONEY'
  | 'CARD'
  | 'CHEQUE'

export interface ManualPaymentRequest {
  studentId: number
  amount: number
  method: PaymentMethod
  sessionId?: number
  feeStructureId?: number
  monthYear?: MonthYear
  reference?: string
  comment?: string
  payerPhone?: string
}

export interface ProcessPaymentResponse {
  payment?: {
    id: number
    status?: string
    amount?: number | string
    reference?: string
    method?: string
  }
  paymentId?: number
  id?: number
  serverAmount?: number
  status?: string
  amount?: number
  reference?: string
}

export type StudentFinancialStatus = 'DEBTOR' | 'PAID'

export interface StudentFinancialRow {
  id: number
  matricule: string
  firstName: string
  lastName: string
  fullName: string
  classId: number | null
  className: string | null
  sectionId: number | null
  sectionName: string | null
  optionId: number | null
  optionName: string | null
  totalFees: number
  feesPaid: number
  balance: number
  financialStatus: StudentFinancialStatus
}

export interface StudentsFinancialListResponse {
  data: StudentFinancialRow[]
  meta: {
    total: number
    page: number
    limit: number
    totalPages: number
    debtors: number
    paid: number
    totalBalance: number
  }
  filters: {
    classId?: number
    sectionId?: number
    optionId?: number
    status?: StudentFinancialStatus
    page?: number
    limit?: number
  }
}

export interface StudentsFinancialPrintReport {
  generatedAt: string
  schoolName: string
  filters: StudentsFinancialListResponse['filters']
  summary: {
    total: number
    debtors: number
    paid: number
    totalBalance: number
    totalFees: number
    totalPaid: number
  }
  columns: string[]
  rows: Array<{
    matricule: string
    eleve: string
    classe: string
    section: string
    option: string
    fraisTotaux: number
    dejaPaye: number
    solde: number
    statut: string
  }>
}

/** Politique relances dette + pénalités (SchoolSettings). */
export interface DebtReminderPolicy {
  enabled: boolean
  offsetsDays: number[]
  quietStartHour: number | null
  quietEndHour: number | null
  deadlineDay: number
  exclusionDay: number
  minDebtThreshold: number
  moratoriumBehavior: string
  lateFeeEnabled: boolean
  lateFeeAnnualRatePercent: number
  debtReminderWhatsAppEnabled: boolean
}

export type DebtReminderPolicyUpdate = Partial<{
  enabled: boolean
  offsetsDays: number[]
  quietStartHour: number | null
  quietEndHour: number | null
  lateFeeEnabled: boolean
  lateFeeAnnualRatePercent: number
  debtReminderWhatsAppEnabled: boolean
}>

export interface DebtReminderTriggerInput {
  dryRun?: boolean
  classId?: number
  studentIds?: number[]
}

export interface DebtReminderCandidate {
  studentId: number
  firstName: string
  lastName?: string
  balance?: number
  priority?: string
}

export interface DebtReminderTriggerResult {
  schoolId: number
  queued: number
  skippedAlreadySent: number
  skippedPendingPayment: number
  skippedQuietHours: number
  skippedCampaignDay: number
  skippedDisabled: number
  dryRun: boolean
  candidates: DebtReminderCandidate[]
}

export interface DebtReminderJournalItem {
  id: number
  studentId: number
  studentName: string
  matricule: string
  campaignKey: string
  priority: string
  status: string
  skipReason: string | null
  balanceSnapshot: number | null
  createdAt: string
}

export interface DebtReminderJournalPage {
  items: DebtReminderJournalItem[]
  nextCursor: number | null
}

export interface DebtReminderHealth {
  queueAvailable: boolean
  queueName: string
  policyEnabled: boolean
  last24h: Record<string, number>
  dlqDebtReminders: number
  workerHint: string
}

export interface LateFeeRunResult {
  schoolId: number
  processed: number
  accruedTotal: number
  skipped: number
}
