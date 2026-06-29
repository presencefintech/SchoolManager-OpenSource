export interface HealthMetrics {
  status: string;
  metrics: {
    total: number;
    errorRate: string;
    errors: number;
    score: number;
  };
  topSchools: Array<{ name: string; requests: number }>;
  timestamp: Date;
}

export interface RetentionReport {
  schoolName: string;
  currentActivity: number;
  dropRate: string;
  status: 'AT_RISK' | 'STABLE';
}

export interface VipClient {
  id: number;
  name: string;
  revenue: string;
  students: number;
  tier: string;
  color: string;
}

export interface MasterDashboardView {
  summary: {
    totalRevenue: number;
    criticalAlerts: number;
    systemStatus: string;
    trends: { revenueGrowth: string; trend: string };
  };
  vips: VipClient[];
  churnRisks: RetentionReport[];
  marketAnalysis: any[];
  infrastructure: any;
}