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
