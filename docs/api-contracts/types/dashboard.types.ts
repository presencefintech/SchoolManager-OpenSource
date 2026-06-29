/**
 * Contrats dashboard admin — alignés sur :
 * - `GET /admin/stats` → `DashboardQuickStats` (openapi/admin.json)
 * - `GET /admin/heatmap` → `HeatmapHourBucket[]`
 * - `GET /admin/live-feed` · `GET /admin/fraud-alerts` · `GET /admin/dashboard/stats`
 * - `src/types/admin.ts` · `src/lib/admin/api/dashboard.api.ts`
 */

/** Point de tendance sur 7 jours — champ `weeklyTrend` de DashboardQuickStats */
export interface WeeklyTrendPoint {
  date: string
  label: string
  present: number
  rate: number
}

/** Réponse normalisée côté front après `dashboardApi.getStats()` */
export interface DashboardStats {
  totalStudents: number
  presentToday: number
  absentToday: number
  lateToday: number
  attendanceRate: number
  fraudAlerts: number
  weeklyTrend?: WeeklyTrendPoint[]
}

/** Payload brut API `GET /admin/stats` (champ `data`) */
export interface DashboardQuickStats {
  overview: {
    present: number
    late: number
    absent: number
    totalStudents: number
  }
  alerts: {
    criticalFraud: number
  }
  attendanceRate: number
  weeklyTrend?: WeeklyTrendPoint[]
}

/** Bucket horaire — `GET /admin/heatmap` */
export interface HeatmapHourBucket {
  hour: string
  count: number
}

export interface LiveFeedEntry {
  id: number
  studentId: number
  studentName: string
  className: string
  status: 'PRESENT' | 'ABSENT' | 'LATE'
  timestamp: string
  method?: string
}

export interface FraudAlert {
  id: number
  type: string
  description: string
  studentId?: number
  studentName?: string
  severity: 'LOW' | 'MEDIUM' | 'HIGH'
  createdAt: string
  resolved: boolean
}

export interface ControlDashboardStats {
  pipeline: { healthy: boolean; queueDepth: number }
  security: { alerts: number; blockedIPs: number }
  integrity: { errors: number }
  workers: { active: number; failed: number }
}

/** Structure scolaire — `GET/POST /admin/structure/*` */
export interface SectionRef {
  id: number
  name: string
  code?: string | null
  schoolId?: number
}

export interface OptionRef {
  id: number
  name: string
  sectionId: number
  code?: string | null
  schoolId?: number
}

export interface CreateSectionBody {
  name: string
  code?: string
}

export interface CreateOptionBody {
  sectionId: number
  name: string
  code?: string
}

/** Classe — création alignée sur ClassSchema.save (backend) */
export interface CreateClassPayload {
  name: string
  academicYear: string
  sectionId: number
  optionId: number
  level?: string
  capacity?: number
  teacherId?: number
  description?: string
}
