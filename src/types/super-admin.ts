export interface PlatformStats {
  totalSchools: number
  totalStudents: number
  totalRevenue: string
  activeUsers: number
  arpu: string
}

export interface SchoolHealth {
  score: number
  level: 'CRITICAL' | 'STABLE' | 'EXCELLENT'
  label: string
}

export interface School {
  id: number
  name: string
  city: string
  email?: string
  deletedAt: null | string
  _count: {
    students: number
    admins: number
    payments: number
  }
  health: SchoolHealth
}

export interface SchoolAdminUser {
  firstName: string
  lastName: string
  email: string
}

export interface SchoolAdminRecord {
  id: number
  userId: number
  roleName: string
  user: SchoolAdminUser
}

export interface SchoolDetail {
  id: number
  name: string
  city: string
  email?: string
  deletedAt: null | string
  _count: {
    students: number
    classes: number
    payments: number
  }
  admins: SchoolAdminRecord[]
}

export interface SchoolPerformance {
  collected: number
  remaining: number
  efficiency: number
  studentCount: number
  breakEvenThreshold: number
  isHealthy: boolean
}

export interface SchoolPaymentDashboard {
  performance: {
    monthlyRevenue: number
    projectedRevenue: number
    arpu: number
    digitalAdoption: number
    collectionEfficiency: number
  }
  audit: {
    pendingVerifications: number
    isBenfordValid: boolean
    suspiciousActivity: boolean
    devianceLevel: number
    daysSalesOutstanding: number
  }
  treasury: {
    totalUnpaid: number
    breakEvenRequirement: number
    badDebtEstimate: number
  }
}

export interface AnomalyPayment {
  id: number
  amount: number
  method: string
  audit: { suspicious: boolean; deviance: number }
}

export interface SchoolAnomalies {
  severity: 'HIGH' | 'LOW'
  deviance?: number
  benfordValid?: boolean
  anomalies: AnomalyPayment[]
  reason?: string
}

/* ─── Dashboard global — Monitoring ────────────────────────── */
export interface ReconciliationHealth {
  lastRun: {
    startTime: string
    endTime: string | null
    reconciled: number
    errors: number
  } | null
  metrics: {
    successRate: number
    avgProcessTime: number
    totalErrors: number
  }
}

export interface ProviderStat {
  method: string
  reliabilityRate: number
  volume: number
}

export interface SecurityAlerts {
  count: number
  recent: Array<{
    id: number
    amount: number
    method: string
    createdAt: string
    studentId: number
  }>
}

/* ─── Dashboard global — Anomalies ─────────────────────────── */
export interface AnomalyEvent {
  id: number
  fraudScore: number
  createdAt: string
  presence: {
    student: { firstName: string; lastName: string }
    school: { name: string; city: string }
  } | null
}

export interface AnomalyDashboard {
  count: number
  data: AnomalyEvent[]
}

/* ─── Dashboard global — Mobile Money ──────────────────────── */
export interface PendingPayment {
  id: number
  amount: number
  method: string
  status: string
  createdAt: string
  school: { name: string }
}

export interface FraudRadarItem {
  id: number
  fraudScore: number
  createdAt: string
  payment: {
    amount: number
    method: string
    school: { name: string }
  }
}

/* ─── Dashboard global — Queue ──────────────────────────────── */
export interface QueueStatus {
  waiting: number
  active: number
  completed: number
  failed: number
  delayed: number
  total: number
  redisEnabled: boolean
}
