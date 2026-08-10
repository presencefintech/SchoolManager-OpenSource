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

/** @deprecated Use FinanceIntegrityScan from `@/types/admin` (F-05 normalizer). */
export type IntegrityReport = import('@/types/admin').FinanceIntegrityScan

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
  id?: number
  firstName?: string
  lastName?: string
  prenom?: string | null
  postnom?: string | null
  /** Nom déjà formaté (API legacy / audit) */
  studentName?: string
  matricule?: string | null
  tuitionBalance?: number
  balance?: number
  feesBalance?: number
  debtAmount?: number
  fraudAlertCount?: number
  riskLevel?: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW'
  riskScore?: number
  className?: string | null
  _count?: { presences: number }
}

export interface DailyCashEntry {
  method?: string
  _sum?: { amount: number }
  _count?: { id: number }
}

export type CollectionReport = Record<string, number | string | null>

/** GET /finance/payments/analytics/collection?sessionId= */
export interface CollectionAnalyticsSummary {
  monthlyRevenue: number
  growth: number
  collectionEfficiency: number
  totalReceivables: number
}

/** GET /finance/dashboard/guichet */
export interface GuichetDashboard {
  date: string
  currentAcademicSessionId: number | null
  collectionsToday: {
    total: number
    count: number
    byMethod: { method: string; amount: number; count: number }[]
  }
  network?: {
    groupId: number | null
    groupName: string | null
    isPaymentHub: boolean
    canCollectCrossSite: boolean
    sitesCount: number
    crossSiteToday: { amount: number; count: number }
    byEnrollmentCampusToday: Array<{
      enrollmentSchoolId: number
      enrollmentSchoolName: string
      amount: number
      count: number
    }>
  } | null
  pendingVerifications: number
  pendingRefunds: number
  approvedRefundsAwaitingProcess: number
  gatewayRefundsProcessing: number
  openCashSession: CashSession | null
  closingFinalizedToday: boolean
}

export interface CashSession {
  id: number
  status: 'OPEN' | 'CLOSED'
  /** Alias UI historique — préférer openingFloat (API). */
  openingBalance?: number
  openingFloat?: number
  closingBalance?: number
  closingCounted?: number | null
  cashCollected?: number
  expectedCash?: number | null
  variance?: number | null
  currency?: string
  openedAt: string
  closedAt?: string | null
  notes?: string | null
  openNotes?: string | null
  closeNotes?: string | null
  totalCollected?: number
  transactionCount?: number
  cashierId?: number
  openedById?: number
  cashierName?: string
  openingFloatCdf?: number | null
  openingSheet?: CashDenominationSheet | CashDenominationSheet[] | null
  closingSheet?: CashDenominationSheet | CashDenominationSheet[] | null
  fxRateAtClose?: number | null
  ledger?: { movements: CashLedgerMovement[] }
  ledgerTotals?: CashLedgerTotals
  promoterSubmission?: PromoterSubmission | null
  submittedToPromoter?: boolean
  promoterAcknowledged?: boolean
  summary?: CashSessionSummary
}

export type CashDenominationLine = { denom: number; count: number }
export type CashDenominationSheet = {
  currency: string
  lines: CashDenominationLine[]
  total: number
}

export interface CashSessionSummary {
  id?: number
  status?: 'OPEN' | 'CLOSED'
  session: CashSession
  byMethod: { method: string; amount: number; count: number }[]
  totalCollected: number
  transactionCount: number
  openingFloat?: number
  openingBalance?: number
  cashCollected?: number
  expectedCash?: number
  currency?: string
  cashierName?: string
  cashierId?: number
  notes?: string | null
  recentPayments?: {
    id: number
    amount: number
    currency: string
    method: string
    status: string
    reference: string
    studentName: string
    createdAt: string
  }[]
  durationMinutes?: number
  variance?: number | null
  closingCounted?: number | null
  ledger?: { movements: CashLedgerMovement[] }
  ledgerTotals?: CashLedgerTotals
}

export interface CashSessionHistoryPage {
  data: CashSession[]
  total: number
  page: number
  lastPage: number
}

export type CashFloatPolicy = {
  defaultOpeningFloat: number
  minOpeningFloat: number
  maxOpeningFloat: number
  enableDualCurrencyFloat: boolean
  defaultOpeningFloatCdf: number
  minOpeningFloatCdf: number
  maxOpeningFloatCdf: number
  requireDenominationOnOpen: boolean
  suggestFromLastClose: boolean
  suggestBalancedAverage: boolean
  balancedAverageWindow: number
  balancedVarianceTolerance: number
}

export type OpeningFloatSuggestion = {
  suggested: number
  source: 'LAST_CLOSE' | 'BALANCED_AVERAGE' | 'SCHOOL_DEFAULT'
  label: string
  currency: string
  suggestedCdf: number | null
  policy: CashFloatPolicy
  alternatives: Array<{
    amount: number
    source: 'LAST_CLOSE' | 'BALANCED_AVERAGE' | 'SCHOOL_DEFAULT'
    label: string
  }>
  lastClose: {
    sessionId: number
    closingCounted: number
    variance: number | null
    closedAt: string | null
    openingFloatCdf: number | null
  } | null
  balancedAverage: {
    amount: number
    sampleSize: number
  } | null
}

export type CashLedgerMovementType = 'VERSEMENT' | 'RENFLOUEMENT' | 'RETRAIT_TRESORERIE'

export type CashLedgerMovement = {
  id: string
  type: CashLedgerMovementType
  amount: number
  amountCdf?: number | null
  at: string
  byUserId: number
  byUserName?: string
  note?: string | null
  ref?: string | null
}

export type CashLedgerTotals = {
  versements: number
  renflouements: number
  retraits: number
  netUsd: number
  versementsCdf: number
  renflouementsCdf: number
  retraitsCdf: number
}

export type CashFundTraceability = {
  generatedAt: string
  kpis: {
    openTillCount: number
    floatOutstandingUsd: number
    floatOutstandingCdf: number
    cashInTillsUsd: number
    versementCountOpenSessions: number
    varianceWindowDays: number
    shortCount: number
    overCount: number
    absVarianceSum: number
    pendingPromoterReviews?: number
  }
  openSessions: Array<
    CashSession & {
      durationMinutes?: number
      ledgerTotals?: CashLedgerTotals
      ledger?: { movements: CashLedgerMovement[] }
    }
  >
  varianceLedger: Array<
    CashSession & {
      varianceStatus?: 'BALANCED' | 'OVER' | 'SHORT'
    }
  >
  promoterInbox?: Array<
    CashSession & {
      promoterSubmission?: PromoterSubmission | null
      submittedToPromoter?: boolean
      promoterAcknowledged?: boolean
    }
  >
}

export type PromoterSubmission = {
  submittedAt: string
  submittedById: number
  submittedByName: string
  note?: string | null
  snapshot: {
    verdictTitle: string
    verdictTone: 'ok' | 'warn' | 'danger'
    totalSession: number
    paymentCount: number
    cashCollected: number
    versements: number
    variance: number | null
    expectedCash: number
    collectionRatePct: number
    outstanding: number
    debtorCount: number
  }
  acknowledgedAt?: string | null
  acknowledgedById?: number | null
  acknowledgedByName?: string | null
}

export type SchoolDayDigest = {
  date: string
  schoolName: string
  currency: string
  totals: {
    collected: number
    paymentCount: number
    cash: number
    digital: number
    bank: number
    sessionCount: number
    closedCount: number
    openCount: number
    shortCount: number
    overCount: number
    balancedCount: number
    versements: number
    absVariance: number
    pendingPromoterReviews: number
  }
  byMethod: Array<{ label: string; amount: number; count: number; sharePct: string }>
  sessions: Array<{
    id: number
    cashierName: string
    status: string
    collected: number
    cashCollected: number
    variance: number | null
    varianceStatus: string | null
    submitted: boolean
    acknowledged: boolean
    verdict: string | null
  }>
  whatsappText: string
  pitchLine: string
}

export type DemoValueCard = {
  key: string
  label: string
  value: string
  hint: string
  tone: 'ok' | 'warn' | 'danger' | 'neutral'
  salesNarrative: string
  href?: string
}

export type DemoValuePanel = {
  schoolName: string
  generatedAt: string
  headline: string
  cards: DemoValueCard[]
  closingPitch: string
}

export type GoLiveReadiness = {
  schoolId: number
  score: number
  ready: boolean
  completedCount: number
  totalCount: number
  nextAction: string | null
  checks: Array<{
    key: string
    label: string
    status: 'DONE' | 'PENDING' | 'BLOCKED'
    detail: string
  }>
  salesNarrative: string
}

export type WeeklyPromoterDigest = {
  from: string
  to: string
  label: string
  schoolName: string
  currency: string
  totals: {
    collected: number
    paymentCount: number
    cash: number
    digital: number
    bank: number
    shortCount: number
    overCount: number
    absVariance: number
    pendingPromoterReviews: number
    closedSessions: number
  }
  whatsappText: string
  pitchLine: string
  dayDigests: Array<{ date: string; collected: number; paymentCount: number }>
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
  sectionName?: string | null
  optionName?: string | null
  feesBalance?: number
  schoolId?: number
  schoolName?: string
  isCrossSite?: boolean
}

export interface NetworkSite {
  id: number
  name: string
  city: string | null
  isPaymentHub: boolean
  isCurrentSite: boolean
}

export interface NetworkContext {
  groupId: number | null
  groupName: string | null
  collectionSiteId: number
  collectionSiteName: string
  isPaymentHub: boolean
  canCollectCrossSite?: boolean
  sites: NetworkSite[]
  ops?: {
    collectedToday: { amount: number; count: number }
    crossSiteToday: { amount: number; count: number }
    byEnrollmentCampusToday: Array<{
      enrollmentSchoolId: number
      enrollmentSchoolName: string
      amount: number
      count: number
    }>
    crossSiteMonth: { amount: number; count: number }
    canCollectCrossSite: boolean
  }
}

export interface NetworkClearingPosition {
  enrollmentSchoolId: number
  enrollmentSchoolName: string
  amountDueToCampus: number
  paymentCount: number
  currency: string
  direction: 'HUB_OWES_CAMPUS'
}

export interface NetworkClearing {
  groupId: number
  groupName: string
  collectionSiteId: number
  collectionSiteName: string
  isPaymentHub: boolean
  period: { from: string; to: string }
  currency: string
  localCollected: { amount: number; count: number }
  crossSiteTotal: { amount: number; count: number }
  positions: NetworkClearingPosition[]
  summaryLabel: string
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
  totalFees?: number
  feesPaid?: number
  lastPaymentAt?: string
  transactions?: { id: number; amount: number; method: string; status: string; createdAt: string; reference?: string; currency?: string }[]
  recentPayments?: { id: number; amount: number; method: string; status: string; createdAt: string; reference?: string; currency?: string }[]
  moratorium?: {
    active: boolean
    type?: string | null
    endDate?: string | null
  }
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
  baseAmount?: number
  attributionSource?: 'AUTOMATIC' | 'ASSIGN' | 'OVERRIDE' | 'EXEMPT'
  attributionReason?: string | null
}

export type StudentFeeAssignmentType = 'ASSIGN' | 'OVERRIDE' | 'EXEMPT'
export type FeeAssignmentMode = 'AUTOMATIC' | 'EXPLICIT'

export interface StudentFeeAssignmentDto {
  id: number
  studentId: number
  schoolId: number
  feeStructureId: number | null
  feeRuleId: number | null
  type: StudentFeeAssignmentType
  amountOverride: number | null
  percentOverride: number | null
  reason: string
  validFrom: string
  validTo: string | null
  revokedAt: string | null
  createdAt: string
  updatedAt: string
  feeStructure?: {
    id: number
    amount: number
    currency: string
    assignmentMode: FeeAssignmentMode
    sessionId: number
    category: {
      id: number
      name: string
      code: string
      billingPeriod: FeeBillingPeriod
    }
    class: { id: number; name: string } | null
  } | null
}

export interface CreateStudentFeeAssignmentPayload {
  feeStructureId: number
  type: StudentFeeAssignmentType
  reason: string
  amountOverride?: number | null
  percentOverride?: number | null
  validFrom?: string
  validTo?: string | null
}

export interface UpdateStudentFeeAssignmentPayload {
  reason?: string
  amountOverride?: number | null
  percentOverride?: number | null
  validFrom?: string
  validTo?: string | null
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

export type StudentFinancialStatus =
  | 'DEBTOR'
  | 'PAID'
  | 'OVERPAID'
  | 'DRIFT'
  | 'HIGH_RISK'
  | 'NPL_90'
  | 'AGING_0_30'
  | 'AGING_31_60'
  | 'AGING_61_90'

export type StudentFinancialSort =
  | 'balance_desc'
  | 'balance_asc'
  | 'risk_desc'
  | 'dpd_desc'
  | 'ecl_desc'
  | 'collection_asc'
  | 'name_asc'

export interface StudentFinancialRow {
  id: number
  matricule: string
  firstName: string
  lastName: string
  fullName: string
  rdcFullName?: string
  classId: number | null
  className: string | null
  sectionId: number | null
  sectionName: string | null
  optionId: number | null
  optionName: string | null
  totalFees: number
  feesPaid: number
  balance: number
  storedBalance?: number
  financialStatus: StudentFinancialStatus
  situation?: StudentFinancialStatus
  ledgerDrift?: number
  ledgerCoherent?: boolean
  collectionRatePct?: number
  overCollected?: boolean
  daysPastDue?: number
  agingBucket?: string | null
  riskScore?: number
  recoverabilityPct?: number
  expectedLoss?: number
  lastPaymentAt?: string | null
  reasonCodes?: string[]
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
    overpaid?: number
    drift?: number
    highRisk?: number
    npl90?: number
    totalBalance: number
    totalExpectedLoss?: number
  }
  filters: {
    classId?: number
    sectionId?: number
    optionId?: number
    status?: StudentFinancialStatus
    sort?: StudentFinancialSort
    minDebt?: number
    minRisk?: number
    page?: number
    limit?: number
  }
}

export interface StudentsFinancialPrintReport {
  generatedAt: string
  schoolName: string
  schoolAddress?: string | null
  schoolPhone?: string | null
  schoolEmail?: string | null
  schoolLogoUrl?: string | null
  filters: StudentsFinancialListResponse['filters']
  summary: {
    total: number
    debtors: number
    paid: number
    overpaid?: number
    drift?: number
    totalBalance: number
    totalFees: number
    totalPaid: number
    totalExpectedLoss?: number
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
    risque?: number
    dpd?: number
    ecl?: number
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
