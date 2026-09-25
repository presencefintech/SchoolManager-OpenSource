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
  cashDeskId?: number | null
  cashDesk?: CashDesk | null
  forceClosed?: boolean
  forceClosedById?: number | null
  forceCloseReason?: string | null
  adminReviewedAt?: string | null
  adminReviewNotes?: string | null
  correctionUnlockedUntil?: string | null
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

export type CashDeskSpecialty = 'ENROLLMENT' | 'TUITION' | 'MOBILE_MONEY' | 'GENERAL'

export interface CashDesk {
  id: number
  uuid?: string
  schoolId?: number
  code: string
  name: string
  specialty: CashDeskSpecialty
  sortOrder?: number
  isActive?: boolean
  printerHint?: string | null
  locationHint?: string | null
  notes?: string | null
  allowedChannels?: SchoolPaymentChannelKey[] | null
  assignedUserIds?: number[]
  resolvedChannels?: SchoolPaymentChannelKey[]
  canOpen?: boolean
  occupiedBy?: { cashierId: number; cashierName: string } | null
}

export type CashDeskLiveMethods = {
  cashUsd: number
  cashCdf: number
  mobileMoney: number
  bank: number
  card: number
  other: number
  count: number
  collectedUsd?: number
  cashCdfConsolidatedUsd?: number
  consolidatedUsd?: number
  consolidatedCdf?: number
  fxRate?: number
}

export type CashDrawerReconciliation = {
  openingFloatUsd: number
  cashCollectedUsd: number
  pettyCashUsd: number
  ledgerNetUsd: number
  expectedCashUsd: number
  countedUsd: number | null
  varianceUsd: number | null
  formula: string
  alert: 'NONE' | 'WARN' | 'DANGER'
  alertLabel: string | null
}

export type CashDeskLiveRow = {
  desk: CashDesk
  session: {
    id: number
    status: 'OPEN' | 'CLOSED'
    openedAt: string
    closedAt: string | null
    cashierId: number
    cashierName: string | null
    openingFloat: number
    cashCollected: number
    expectedCash: number
    closingCounted: number | null
    variance: number | null
    forceClosed: boolean
    forceClosedByName: string | null
    adminReviewedAt: string | null
    correctionUnlockedUntil: string | null
    reconciliation?: CashDrawerReconciliation | null
  } | null
  methods: CashDeskLiveMethods
}

export type CashDeskLiveSnapshot = {
  date: string
  generatedAt: string
  currency: string
  multiCounterEnabled?: boolean
  openDesks: number
  deskCount: number
  schoolTotals: CashDeskLiveMethods & {
    unassignedCount?: number
    unassignedUsd?: number
  }
  recentPayments?: {
    id: number
    amount: number
    method: string
    reference: string
    paidAt: string
    studentId: number | null
    studentName: string | null
    cashierId: number | null
    cashierName: string | null
    cashDesk: { id: number; name: string } | null
  }[]
  varianceAlertCount: number
  desks: CashDeskLiveRow[]
}

export type SchoolPaymentChannelKey =
  | 'CASH_USD'
  | 'CASH_CDF'
  | 'ORANGE_MONEY'
  | 'MPESA'
  | 'AIRTEL_MONEY'
  | 'BANK'
  | 'CARD'

export type SchoolPaymentChannelCatalogItem = {
  key: SchoolPaymentChannelKey
  method: 'CASH' | 'ORANGE_MONEY' | 'MPESA' | 'AIRTEL_MONEY' | 'BANK' | 'CARD'
  tenderCurrency?: 'USD' | 'CDF'
  label: string
  needsPhone: boolean
  enabled: boolean
}

export type SchoolCashOps = {
  multiCounterEnabled: boolean
  channels: Record<SchoolPaymentChannelKey, boolean>
  catalog: SchoolPaymentChannelCatalogItem[]
  enabledMethods: Array<'CASH' | 'ORANGE_MONEY' | 'MPESA' | 'AIRTEL_MONEY' | 'BANK' | 'CARD'>
  desks: CashDesk[]
  cashiers?: { id: number; name: string; email?: string | null }[]
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
  /** true : ce caissier doit reprendre le montant de sa dernière clôture. */
  lockedToLastClose?: boolean
  label: string
  currency: string
  suggestedCdf: number | null
  pendingPromoterReview?: {
    cashSessionId: number
    variance: number
    blocking: false
    message: string
  } | null
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

export interface NetworkTreasurySite extends NetworkSite {
  sessionOpen: boolean
  cashSessionId: number | null
  cashInDrawer: number
  drawerCurrency: string
  sessionOpenedAt: string | null
  cashierName: string | null
  collectedToday: number
  paymentCountToday: number
  collectedMonth: number
  paymentCountMonth: number
  cashToday: number
  mobileToday: number
  lastPaymentAt: string | null
  studentCount: number
  debtorCount: number
  feesPaid: number
  feesBalance: number
  collectionRate: number
  pendingSms: number
  presentToday: number
  shareOfGroupPct: number
  collectedYesterday?: number
  vsYesterdayPct?: number | null
  collected7d?: number
  avgTicketToday?: number
  digitalSharePct?: number
  attendanceRate?: number
  lastClosedAt?: string | null
  healthScore?: number
  minutesSinceLastPayment?: number | null
  sessionOpenMinutes?: number | null
  oldestPendingSmsMinutes?: number | null
}

export interface NetworkTreasuryAlert {
  code: string
  severity: 'info' | 'warn' | 'critical'
  message: string
  schoolId?: number
  schoolName?: string
}

export interface NetworkTreasuryMethodSplit {
  method: string
  amount: number
  count: number
}

export interface NetworkTreasuryLeader {
  schoolId: number
  schoolName: string
  value: number
}

export interface NetworkTreasuryLive {
  groupId: number | null
  groupName: string | null
  generatedAt: string
  sites: NetworkTreasurySite[]
  totals: {
    collectedToday: number
    paymentCountToday: number
    collectedMonth: number
    paymentCountMonth: number
    cashToday: number
    mobileToday: number
    sitesOpen: number
    siteCount: number
    studentCount: number
    debtorCount: number
    feesPaid: number
    feesBalance: number
    collectionRate: number
    pendingSms: number
    presentToday: number
    collectedYesterday?: number
    vsYesterdayPct?: number | null
    collected7d?: number
    avgTicketToday?: number
    digitalSharePct?: number
    attendanceRate?: number
    healthScore?: number
    oldestPendingSmsMinutes?: number | null
    focusSchoolId?: number | null
    focusSchoolName?: string | null
  }
  methodsToday: NetworkTreasuryMethodSplit[]
  alerts: NetworkTreasuryAlert[]
  leaders?: {
    topCollector: NetworkTreasuryLeader | null
    weakestRate: NetworkTreasuryLeader | null
    bestHealth: NetworkTreasuryLeader | null
  }
}

export type NetworkOpsSeverity = 'critical' | 'warn' | 'info'

export type NetworkOpsQueueKind =
  | 'SMS_PENDING'
  | 'SMS_REJECTED'
  | 'ROLL_MISSING'
  | 'ROLL_DRAFT'
  | 'TILL_CLOSED'
  | 'SILENT_SITE'
  | 'OPEN_NO_CASH'
  | 'PRESENT_UNPAID'

export interface NetworkOpsRollMissing {
  schoolId: number
  schoolName: string
  classId: number
  className: string
  status: 'MISSING' | 'DRAFT' | string
  teacherName?: string | null
  waitingMinutes?: number | null
}

export interface NetworkOpsSmsPending {
  id: number
  schoolId: number
  schoolName: string
  studentName: string
  amount: number
  currency?: string
  provider: string
  waitingMinutes: number
  severity?: NetworkOpsSeverity
}

export interface NetworkOpsPresentUnpaid {
  schoolId: number
  schoolName: string
  studentId: number
  studentName: string
  matricule?: string
  className: string | null
  feesBalance: number
}

export interface NetworkOpsTillClosed {
  schoolId: number
  schoolName: string
}

export interface NetworkOpsQueueItem {
  id: string
  kind: NetworkOpsQueueKind
  severity: NetworkOpsSeverity
  schoolId: number
  schoolName: string
  title: string
  detail: string
  ageMinutes: number | null
  href: string
}

export interface NetworkOpsSiteDigest {
  schoolId: number
  schoolName: string
  isPaymentHub: boolean
  actionCount: number
  rollsMissing: number
  pendingSms: number
  presentUnpaid: number
  tillClosed: boolean
  silent: boolean
  openNoCash: boolean
  oldestSmsMinutes: number | null
}

export interface NetworkOpsNextAction {
  title: string
  detail: string
  severity: NetworkOpsSeverity
  href: string
}

export interface NetworkOpsBriefing {
  groupId: number | null
  groupName: string | null
  generatedAt: string
  date?: string
  summary: {
    classesWithoutSheet: number
    pendingSms: number
    presentUnpaid: number
    tillsClosed: number
    silentSites?: number
    rejectedSmsToday?: number
    openNoCash?: number
    actionCount: number
    criticalCount?: number
    oldestSmsMinutes?: number | null
  }
  nextAction?: NetworkOpsNextAction | null
  queue?: NetworkOpsQueueItem[]
  sites?: NetworkOpsSiteDigest[]
  classesWithoutSheet: NetworkOpsRollMissing[]
  pendingSms: NetworkOpsSmsPending[]
  presentUnpaid: NetworkOpsPresentUnpaid[]
  tillsClosed: NetworkOpsTillClosed[]
  silentSites?: NetworkOpsTillClosed[]
  rejectedSmsToday?: Array<{
    id: number
    schoolId: number
    schoolName: string
    studentName: string
    amount: number
    currency: string
    reason: string | null
  }>
  whatsappText: string
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
  totalFees?: number | null
  feesPaid?: number | null
  balance?: number | null
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
    totalBalance?: number | null
    totalExpectedLoss?: number | null
  }
  amountsHidden?: boolean
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
    totalBalance?: number | null
    totalFees?: number | null
    totalPaid?: number | null
    totalExpectedLoss?: number | null
  }
  columns: string[]
  amountsHidden?: boolean
  rows: Array<{
    matricule: string
    eleve: string
    classe: string
    section: string
    option: string
    fraisTotaux?: number | null
    dejaPaye?: number | null
    solde?: number | null
    statut: string
    risque?: number | null
    dpd?: number
    ecl?: number | null
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

export type ExpenseKind = 'OPERATING' | 'INVESTMENT'
export type ExpenseStatus = 'DRAFT' | 'POSTED' | 'VOID'

export interface FinanceExpense {
  id: number
  uuid: string
  schoolId: number
  kind: ExpenseKind
  status: ExpenseStatus
  category: string
  label: string
  amount: number
  currency: string
  occurredAt: string
  affectsCash: boolean
  cashSessionId: number | null
  vendor: string | null
  reference: string | null
  notes: string | null
  createdById: number
  voidedById: number | null
  voidedAt: string | null
  postedAt: string | null
  createdAt: string
  updatedAt: string
}

export type CreateExpensePayload = {
  kind: ExpenseKind
  category: string
  label: string
  amount: number
  currency?: string
  occurredAt: string
  affectsCash?: boolean
  cashSessionId?: number | null
  vendor?: string | null
  reference?: string | null
  notes?: string | null
  postImmediately?: boolean
}

export type CreateExpenseBatchPayload = {
  occurredAt: string
  affectsCash?: boolean
  postImmediately?: boolean
  currency?: string
  vendor?: string | null
  cashSessionId?: number | null
  lines: Array<{
    kind: ExpenseKind
    category: string
    label: string
    amount: number
    reference?: string | null
    notes?: string | null
  }>
}

export type DataBadge = 'prisma_certified' | 'catalog_estimate' | 'untracked' | 'manual_entry'

export type SituationLine = {
  key: string
  label: string
  amount: number | null
  source: 'computed' | 'estimated' | 'untracked'
  badge: DataBadge
  note?: string
}

export type VarianceLine = {
  key: string
  label: string
  category: 'revenue' | 'expense'
  expected: number | null
  actual: number | null
  varianceAmount: number | null
  variancePercent: number | null
  sourceExpected: 'estimated' | 'untracked' | 'n/a'
  sourceActual: 'computed' | 'untracked'
  badgeExpected: DataBadge
  badgeActual: DataBadge
  note?: string
}

export type KpiMetric = {
  key: string
  label: string
  value: number | null
  unit: 'ratio' | 'percent' | 'currency' | 'unavailable'
  formula: string
  note: string
  status: 'ok' | 'watch' | 'alert' | 'unavailable'
  badge: DataBadge
}

export type ManagementAlert = {
  severity: 'attention' | 'critique' | 'info'
  code: string
  title: string
  message: string
  blocking?: boolean
}

export type CashReconciliation = {
  status: 'balanced' | 'mismatch' | 'incomplete'
  equation: string
  openingCarry: number
  collectedRevenue: number
  renflouements: number
  expensesCashImpact: number | null
  bankDeposits: number
  treasuryWithdrawals: number
  expectedClosing: number | null
  actualClosing: number | null
  gap: number | null
  tolerance: number
  blocking: boolean
  note: string
  badge: DataBadge
}

export type ArrearsRisk = {
  monthFees: number
  arrearsFees: number
  advanceFees: number
  weightVsMonth: number | null
  arrearsShareOfTuition: number | null
  advanceShareOfTuition: number | null
  badge: DataBadge
  note: string
}

export interface MonthlySituationReport {
  school: {
    id: number
    name: string
    city: string | null
    currency: string
  }
  period: {
    from: string
    to: string
    reportMonth: string
    reportMonthLabel: string
    title: string
    documentKind?: 'executive_synthesis'
  }
  generatedAt: string
  generatedBy: { id: number; name: string }
  headcount: {
    studentsActive: number
    studentsPrivate: number
    teachers: number
    note: string
    badge: DataBadge
  }
  expectedRevenue: { lines: SituationLine[]; total: number; note: string }
  actualRevenue: {
    lines: SituationLine[]
    total: number
    collectedTotal: number
    byMethod: Array<{ method: string; amount: number; count: number }>
    paymentCount: number
  }
  operationalExpenses: {
    lines: SituationLine[]
    total: number | null
    tracked: boolean
    note: string
  }
  investmentExpenses: {
    lines?: SituationLine[]
    total: number | null
    tracked: boolean
    note: string
  }
  bankDeposits: {
    lines: Array<{
      label: string
      amount: number
      ref: string | null
      at: string
      badge: DataBadge
    }>
    total: number
    source: 'cash_movements' | 'ledger_json_fallback'
    badge: DataBadge
  }
  cashBalance: {
    openingCarry: number
    closingBalance: number | null
    closingSource: string | null
    badge: DataBadge
  }
  credits: { lines: SituationLine[]; totalOutstanding: number; note: string }
  variance: { lines: VarianceLine[]; note: string }
  kpis: {
    burnRate: KpiMetric
    liquidityRatio: KpiMetric
    collectionEfficiency: KpiMetric
    revenuePerStudent: KpiMetric
  }
  arrearsRisk: ArrearsRisk
  cashReconciliation: CashReconciliation
  alerts: ManagementAlert[]
  document: {
    productName: string
    audience: string
    signatureSlots: Array<{ role: string; label: string }>
  }
  integrity: {
    computedOnly: boolean
    warnings: string[]
    coherent?: boolean
    identities?: {
      revenuePartsOk: boolean
      methodVsCollectedOk: boolean
      actualLinesOk: boolean
      expectedLinesOk: boolean
      creditsPartitionOk: boolean
      opexLinesOk: boolean
      capexLinesOk: boolean
      depositLinesOk: boolean
      cashEquationOk: boolean | null
    }
  }
}

export type ClassYearFeeLine = {
  categoryId: number
  categoryCode: string
  categoryName: string
  billingPeriod: string
  catalogUnitAmount: number
  catalogYearAmount: number
  expected: number
  paid: number
  remaining: number
}

export type ClassYearFeeTotals = {
  expected: number
  paid: number
  remaining: number
  unallocatedPaid: number
  collectionRatePct: number
}

export type ClassYearFeeStudentFee = {
  categoryId: number
  categoryCode: string
  categoryName: string
  expected: number
  paid: number
  remaining: number
}

export type ClassYearFeeStudent = {
  studentId: number
  matricule: string | null
  fullName: string
  expected: number
  paid: number
  remaining: number
  fees: ClassYearFeeStudentFee[]
}

export type ClassYearFeeClass = {
  classId: number
  className: string
  level: string | null
  studentCount: number
  debtorCount: number
  clearedCount: number
  totals: ClassYearFeeTotals
  fees: ClassYearFeeLine[]
  students?: ClassYearFeeStudent[]
}

export type ClassYearFeeDashboard = {
  sessionId: number
  sessionLabel: string
  billingStart: string
  billingEnd: string
  billingMonths: number
  currency: string
  schoolTotals: ClassYearFeeTotals & { studentCount: number; debtorCount: number }
  feeColumns: Array<{
    categoryId: number
    categoryCode: string
    categoryName: string
    billingPeriod: string
  }>
  classes: ClassYearFeeClass[]
}

/** Déclaration parent (module isolé payment-declaration) — file caisse. */
export type PaymentDeclarationReceiptDto = {
  number: string | null
  kind: 'PROVISIONAL' | 'OFFICIAL'
  watermark: string | null
  downloadable: boolean
  label: string
  qrPayload?: string | null
}

export type PaymentDeclarationAllocationDto = {
  id: number
  studentId: number
  studentName: string | null
  matricule: string | null
  paymentCode: string | null
  amount: number
  currency: string
  reprintCount?: number
  lastReprintedAt?: string | null
  receipt: PaymentDeclarationReceiptDto
}

export type PaymentDeclarationDto = {
  id: number
  uuid: string
  studentId: number
  parentId: number
  provider: string
  providerLabel: string
  transactionRef: string
  amount: number
  currency: string
  paidAt: string
  payerPhone: string | null
  payerName: string | null
  note: string | null
  proofImageUrl: string | null
  studentName: string | null
  studentMatricule?: string | null
  paymentCode?: string | null
  splitMode?: 'EQUAL' | 'CUSTOM'
  expectedFeesTotal?: number
  surplusAmount?: number
  surplusDestination?: 'RESERVE_ADVANCE' | 'WITHDRAWAL_FEE' | null
  surplusStudentId?: number | null
  allocations?: PaymentDeclarationAllocationDto[]
  status: 'PENDING' | 'APPROVED' | 'REJECTED'
  validationMode: 'SEMI_AUTOMATIC' | 'INSTANT'
  receipt: PaymentDeclarationReceiptDto
  cashSessionId: number | null
  journalPosted: boolean
  rejectionReason: string | null
  reviewedAt: string | null
  approvedAt: string | null
  createdAt: string
  fraudAlert?: {
    label: string
    declarationCount: number
    expiresAt: string
  } | null
}

export type PaymentDeclarationPage = {
  items: PaymentDeclarationDto[]
  page: number
  limit: number
  total: number
}

export type PaymentDeclarationStudentLookup = {
  student: {
    studentId: number
    studentName: string
    matricule: string | null
    paymentCode: string
    className: string | null
    feesBalance: number
  }
  pendingCount: number
}
