// src/modules/web/superadmin/dtos/audit.dto.ts

/**
 * DTO pour les requêtes de listes et snapshots (Dashboard, History, RedFlags)
 * Centralise la conversion des query strings en types utilisables par Prisma
 */
export class AuditQueryDTO {
  schoolId?: number;
  days: number;
  limit: number;
  resourceId?: number;
  resourceType: string;

  constructor(query: any) {
    this.schoolId = query.schoolId ? Number(query.schoolId) : undefined;
    this.days = query.days ? Number(query.days) : 7;
    this.limit = query.limit ? Number(query.limit) : 20;
    this.resourceId = query.resourceId ? Number(query.resourceId) : undefined;
    this.resourceType = query.resourceType || 'Student';
  }
}

/**
 * DTO pour les actions spécifiques à un étudiant (Vérification d'intégrité)
 */
export class StudentAuditParamsDTO {
  studentId: number;
  schoolId: number;

  constructor(params: any) {
    this.studentId = Number(params.studentId);
    this.schoolId = Number(params.schoolId);
  }
}