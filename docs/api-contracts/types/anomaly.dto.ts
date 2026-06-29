// src/modules/web/superadmin/dtos/anomaly.dto.ts

export class AnomalyDashboardQueryDTO {
  minScore: number;
  limit: number;
  schoolId?: number;

  constructor(query: any) {
    this.minScore = query.minScore ? Number(query.minScore) : 70;
    this.limit = query.limit ? Number(query.limit) : 50;
    this.schoolId = query.schoolId ? Number(query.schoolId) : undefined;
  }
}

export class ManualAnalysisDTO {
  studentId: number;
  gps?: { lat: number; lng: number };
  deviceId?: string;
  ipAddress?: string;

  constructor(params: any, body: any) {
    this.studentId = Number(params.studentId);
    this.gps = body.gps;
    this.deviceId = body.deviceId;
    this.ipAddress = body.ipAddress;
  }
}

export class SecurityThresholdDTO {
  schoolId: number;
  settings: {
    maxDistance?: number;
    maxTimeDifference?: number;
    [key: string]: any;
  };

  constructor(body: any) {
    this.schoolId = Number(body.schoolId);
    this.settings = body.settings || {};
  }
}