/** Factory de clés — invalidation ciblée sans désynchronisation */
export const queryKeys = {
  superadmin: {
    stats: () => ['superadmin', 'stats'] as const,

    schools: (params?: Record<string, unknown>) => ['superadmin', 'schools', params ?? 'all'] as const,
    school: (id: number) => ['superadmin', 'schools', id] as const,
    schoolPerformance: (id: number) => ['superadmin', 'schools', id, 'performance'] as const,
    schoolPaymentDashboard: (id: number) => ['superadmin', 'schools', id, 'payment-dashboard'] as const,
    schoolAnomalies: (id: number) => ['superadmin', 'schools', id, 'anomalies'] as const,

    core: {
      users: (params?: Record<string, unknown>) => ['superadmin', 'core', 'users', params] as const,
      students: (params?: Record<string, unknown>) => ['superadmin', 'core', 'students', params] as const,
      presences: (params?: Record<string, unknown>) => ['superadmin', 'core', 'presences', params] as const,
      auditLogs: (params?: Record<string, unknown>) => ['superadmin', 'core', 'audit-logs', params] as const,
    },

    monitoring: {
      reconciliation: () => ['superadmin', 'monitoring', 'reconciliation'] as const,
      providers: () => ['superadmin', 'monitoring', 'providers'] as const,
      alerts: () => ['superadmin', 'monitoring', 'alerts'] as const,
    },

    anomalies: {
      dashboard: () => ['superadmin', 'anomalies', 'dashboard'] as const,
      thresholds: (schoolId?: number) => ['superadmin', 'anomalies', 'thresholds', schoolId] as const,
    },

    mm: {
      metrics: () => ['superadmin', 'mm', 'metrics'] as const,
      fraudRadar: () => ['superadmin', 'mm', 'fraud-radar'] as const,
    },

    notifications: {
      queueStatus: () => ['superadmin', 'notifications', 'queue-status'] as const,
      logs: (params?: Record<string, unknown>) => ['superadmin', 'notifications', 'logs', params] as const,
    },

    auth: {
      sessions: () => ['superadmin', 'auth', 'sessions'] as const,
    },

    audit: {
      snapshot: () => ['superadmin', 'audit', 'snapshot'] as const,
      trail: () => ['superadmin', 'audit', 'trail'] as const,
    },

    storage: {
      stats: () => ['superadmin', 'storage', 'stats'] as const,
    },

    classes: {
      list: (schoolId: number, params?: Record<string, unknown>) => ['superadmin', 'classes', schoolId, params] as const,
      capacity: (schoolId: number) => ['superadmin', 'classes', 'capacity', schoolId] as const,
      setup: (classId: number) => ['superadmin', 'classes', 'setup', classId] as const,
      performance: (classId: number) => ['superadmin', 'classes', 'performance', classId] as const,
      auditTrail: (classId: number) => ['superadmin', 'classes', 'audit', classId] as const,
    },

    enrollment: {
      worker: (schoolId: number) => ['superadmin', 'enrollment', 'worker', schoolId] as const,
      financeAudit: (schoolId: number) => ['superadmin', 'enrollment', 'finance-audit', schoolId] as const,
    },

    finance: {
      report: (params: Record<string, unknown> | null) => ['superadmin', 'finance', 'report', params] as const,
      performance: (schoolId: number) => ['superadmin', 'finance', 'performance', schoolId] as const,
      efficiency: (schoolId: number) => ['superadmin', 'finance', 'efficiency', schoolId] as const,
      topPayers: (schoolId: number) => ['superadmin', 'finance', 'top-payers', schoolId] as const,
      anomalies: (schoolId: number) => ['superadmin', 'finance', 'anomalies', schoolId] as const,
      auditFull: (schoolId: number) => ['superadmin', 'finance', 'audit-full', schoolId] as const,
      snapshot: (schoolId: number) => ['superadmin', 'finance', 'snapshot', schoolId] as const,
      groupDashboard: (params?: Record<string, unknown>) =>
        ['superadmin', 'finance', 'group-dashboard', params] as const,
      benchmarks: (schoolId: number, params?: Record<string, unknown>) =>
        ['superadmin', 'finance', 'benchmarks', schoolId, params] as const,
    },

    presence: {
      dashboard: (schoolId: number) => ['superadmin', 'presence', 'dashboard', schoolId] as const,
    },

    students: {
      stats: (schoolId: number) => ['superadmin', 'students', 'stats', schoolId] as const,
      list: (schoolId: number, params?: Record<string, unknown>) =>
        ['superadmin', 'students', 'list', schoolId, params] as const,
      debtors: (schoolId: number) => ['superadmin', 'students', 'debtors', schoolId] as const,
      dashboard: (studentId: number) => ['superadmin', 'students', 'dashboard', studentId] as const,
      activity: (studentId: number) => ['superadmin', 'students', 'activity', studentId] as const,
      dossier: (studentId: number) => ['superadmin', 'students', 'dossier', studentId] as const,
    },

    fees: {
      structures: (schoolId: number) => ['superadmin', 'fees', 'structures', schoolId] as const,
      history: (feeId: number) => ['superadmin', 'fees', 'history', feeId] as const,
      invoices: (schoolId: number, studentId: number) => ['superadmin', 'fees', 'invoices', schoolId, studentId] as const,
    },

    invitations: {
      school: (schoolId: number) => ['superadmin', 'invitations', 'school', schoolId] as const,
    },

    fraud: {
      flags: (params?: Record<string, unknown>) => ['superadmin', 'fraud', 'flags', params] as const,
    },

    paymentStats: {
      securityAudit: (schoolId: number) => ['superadmin', 'payment-stats', 'security-audit', schoolId] as const,
      highRisk: (schoolId: number) => ['superadmin', 'payment-stats', 'high-risk', schoolId] as const,
    },
  },
} as const
