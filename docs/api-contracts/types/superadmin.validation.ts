import { z } from 'zod';
import { Role, StudentStatus } from './prisma-enums';
import { SuperAdminCreateStudentBodySchema } from './enrollment.validation';

/**
 * 🛡️ ATOMES RÉUTILISABLES
 */
const idParam = z.string().regex(/^\d+$/).transform(Number);
const dateISO = z.string().datetime({ message: "Format ISO 8601 requis" });
const faceVector = z.array(z.number()).min(128).max(512);

const paginationBase = {
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(1000).default(50),
  offset: z.coerce.number().min(0).default(0),
};

/**
 * 🚀 SUPERADMIN ROBUST VALIDATION SCHEMAS
 */
export const SuperAdminSchema = {
  
  // --- 📊 CORE & DASHBOARD ---

  /** @error Fix: Property 'listSchools' */
  listSchools: z.object({
    query: z.object({
      ...paginationBase,
      search: z.string().optional(), // Correspond au 'q' dans votre controller
      q: z.string().optional(),
    })
  }),

  /** @error Fix: Property 'listUsers' */
  listUsers: z.object({
    query: z.object({
      ...paginationBase,
      role: z.string().optional(),
      q: z.string().optional(),
    })
  }),

  // --- 💰 FINANCE & REPORTING ---
  getReport: z.object({
    query: z.object({
      schoolId: z.coerce.number(),
      startDate: dateISO,
      endDate: dateISO,
      classId: z.coerce.number().optional(),
      ...paginationBase
    })
  }),

  exportData: z.object({
    body: z.object({
      schoolId: z.number().int().positive(),
      format: z.enum(['pdf', 'excel', 'csv']),
      filters: z.record(z.any()).optional(),
      columns: z.array(z.string()).min(1).optional(),
      role: z.string().optional(),
    })
  }),

  // --- 🧬 BIOMÉTRIE & IDENTITY ---
  updateBiometrics: z.object({
    params: z.object({ id: idParam }),
    body: z.object({ faceVector })
  }),

  testFacialID: z.object({
    body: z.object({ schoolId: z.number().int(), faceVector })
  }),

  // --- 🏗️ FEE & SCHOOL MGMT ---
  upsertFee: z.object({
    body: z.object({
      id: z.number().optional(),
      schoolId: z.number().int(),
      name: z.string().min(3).max(100),
      amount: z.number().positive(),
      type: z.enum(['TUITION', 'TRANSPORT', 'CANTEEN', 'OTHER']),
      levelId: z.number().int().optional(),
    })
  }),

  bulkApplyFees: z.object({
    body: z.object({ ids: z.array(z.number().int()).min(1) })
  }),

  // --- 🎓 STUDENT MGMT ---

  /** @error Fix: Property 'listStudents' (Unified with params or query schoolId) */
  listStudents: z.object({
    params: z.object({ schoolId: idParam }).optional(), // Optionnel pour supporter /core/students
    query: z.object({
      ...paginationBase,
      q: z.string().optional(),
      search: z.string().optional(),
      schoolId: z.coerce.number().optional(),
      classId: z.coerce.number().optional(),
      sessionId: z.coerce.number().optional(),
      status: z.nativeEnum(StudentStatus).optional(),
    })
  }),

  // Analyse spécifique d'un étudiant (Dettes/Profil)
  studentIdDetails: z.object({
    params: z.object({ studentId: idParam }),
    query: z.object({
      limit: z.coerce.number().default(15),
      minDebt: z.coerce.number().default(1)
    }).optional()
  }),

  schoolStats: z.object({
    params: z.object({ id: idParam })
  }),

  /** GET routes with :schoolId path param only (no body) */
  schoolIdParam: z.object({
    params: z.object({ schoolId: idParam }),
  }),

  toggleLock: z.object({
    params: z.object({ id: idParam }),
    body: z.object({ isLocked: z.boolean() })
  }),

  setGracePeriod: z.object({
    params: z.object({ id: idParam }),
    body: z.object({ until: z.string().datetime().nullable() })
  }),

  // --- 🕒 PRESENCE & SYNC ---

  /** @error Fix: Property 'listPresences' */
  listPresences: z.object({
    query: z.object({
      ...paginationBase,
      q: z.string().optional(),
      from: z.string().optional(),
      to: z.string().optional(),
      schoolId: z.coerce.number().optional(),
    })
  }),

  recordPresence: z.object({
    params: z.object({ schoolId: idParam, studentId: idParam }),
    body: z.object({
      scanMethod: z.enum(['QR_CODE', 'BIOMETRIC', 'MANUAL']),
      scannedAt: z.string().datetime().optional(),
      deviceId: z.string().max(100).optional(),
      gpsLat: z.number().optional(),
      gpsLng: z.number().optional(),
      settings: z.object({
        biometricStrategy: z.string(),
        lateThreshold: z.number().min(0)
      })
    })
  }),

  bulkSyncPresence: z.object({
    params: z.object({ schoolId: idParam }),
    body: z.object({
      settings: z.any(),
      ops: z.array(z.object({
        studentId: z.number().int(),
        scanMethod: z.string(),
        scannedAt: z.string().datetime(),
        syncMode: z.boolean().optional()
      })).max(500)
    })
  }),

  // --- 🔐 SECURITY & ANOMALY ---
  forceSuspend: z.object({
    body: z.object({
      studentId: z.number().int().positive(),
      schoolId: z.number().int().positive(),
      reason: z.string().min(10),
    })
  }),

  forceUnblock: z.object({
    params: z.object({ studentId: idParam, schoolId: idParam })
  }),

  reportFraud: z.object({
    body: z.object({
      studentId: z.number().int().positive(),
      schoolId: z.number().int().positive(),
      fraudScore: z.number().min(0).max(100),
      reason: z.string().min(5),
      metadata: z.record(z.any()).optional(),
    })
  }),

  auditPII: z.object({
    body: z.object({
      studentId: z.number().int().positive(),
      schoolId: z.number().int().positive(),
      dataType: z.enum(['BIOMETRIC', 'PERSONAL_DOCS', 'FINANCIAL_FULL']),
    })
  }),

  analyzeBehavior: z.object({
    params: z.object({ studentId: idParam }),
    body: z.object({
      deviceId: z.string().min(1),
      ipAddress: z.string().ip().optional(),
      gps: z.object({
        lat: z.number().min(-90).max(90),
        lng: z.number().min(-180).max(180),
      }).optional(),
    })
  }),

  anomalyReportQuery: z.object({
    query: z.object({
      minScore: z.coerce.number().min(0).max(1).default(0.5),
      limit: z.coerce.number().min(1).max(100).default(50),
      schoolId: z.coerce.number().optional(),
    })
  }),

  securitySettings: z.object({
    body: z.object({
      schoolId: z.number(),
      settings: z.object({
        geofencingEnabled: z.boolean(),
        maxVelocity: z.number().min(50).max(1000),
        requireFaceAuth: z.boolean(),
        trustScoreThreshold: z.number().min(0.1).max(0.9),
      })
    })
  }),

  securitySnapshot: z.object({
    query: z.object({
      schoolId: z.coerce.number().int().positive().optional(),
      days: z.coerce.number().int().min(1).max(365).default(7),
    }),
  }),

  studentIntegrity: z.object({
    params: z.object({
      studentId: z.coerce.number().int().positive(),
      schoolId: z.coerce.number().int().positive(),
    }),
  }),

  resourceHistory: z.object({
    query: z.object({
      schoolId: z.coerce.number().int().positive(),
      resourceId: z.coerce.number().int().positive(),
    }),
  }),

  paymentFlags: z.object({
    query: z.object({
      schoolId: z.coerce.number().int().positive().optional(),
      limit: z.coerce.number().int().min(1).max(100).default(50),
    }),
  }),

  userTargetParams: z.object({
    params: z.object({ 
      userId: idParam 
    })
  }),

  passwordResetTrigger: z.object({
    body: z.object({
      email: z.string().email("Format email invalide")
    })
  }),

  sessionCleanup: z.object({
    query: z.object({
      days: z.coerce.number().int().min(1).max(365).default(30)
    })
  }),

  activeSessionsQuery: z.object({
    query: z.object({
      schoolId: z.coerce.number().int().positive().optional(),
      ...paginationBase 
    })
  }),

  // --- 🎫 INVITATIONS ---

  generateInvite: z.object({
    body: z.object({
      studentId: z.number().int().positive(),
      schoolId: z.number().int().positive()
    })
  }),

  createStudent: z.object({
    body: SuperAdminCreateStudentBodySchema,
  }),

  // Exemple pour la période de grâce si pas encore fait

  // --- 💳 PAYMENTS ---

  forceSync: z.object({
    params: z.object({
      id: z.coerce.number().int().positive(), // Alias paymentId
      paymentId: z.coerce.number().int().positive().optional()
    }),
    body: z.object({
      providerRef: z.string().optional()
    }).optional()
  }),

  inspect: z.object({
    body: z.object({
      providerRef: z.string().min(5),
      method: z.enum(['UBA', 'EQUITY', 'RAWBANK', 'ECOBANK'])
    })
  }),

  checkFraud: z.object({
    body: z.object({
      studentId: z.number().int().positive(),
      amount: z.number().positive(),
      method: z.enum(['CARD', 'MOBILE_MONEY', 'CASH', 'BANK_TRANSFER']), // Ajustez selon votre Prisma
      paymentId: z.number().int().positive().optional(),
      deviceId: z.string().optional(),
    })
  }),

  /**
   * Analyse globale pour le SuperAdmin
   * Permet de spécifier le schoolId manuellement
   */
  analyzeGlobalFraud: z.object({
    body: z.object({
      schoolId: z.number().int().positive(),
      studentId: z.number().int().positive(),
      amount: z.number().positive(),
      method: z.enum(['CARD', 'MOBILE_MONEY', 'CASH', 'BANK_TRANSFER']),
      paymentId: z.number().int().positive().optional(),
    })
  }),

  // --- 🎫 INVITATIONS ---
  inviteStaff: z.object({
    body: z.object({
      email: z.string().email(),
      role: z.nativeEnum(Role),
      schoolId: z.number().positive(),
      firstName: z.string().min(2),
      lastName: z.string().min(2),
    })
  }),

  generateStudentCode: z.object({
    body: z.object({
      studentId: z.number().positive(),
      schoolId: z.number().positive(),
      email: z.string().email().optional(),
    })
  }),

  /** @description Validation pour : GET /api/sa/mm/metrics */
  getMetrics: z.object({
    query: z.object({
      limit: z.string().optional().transform(val => val ? parseInt(val) : 100),
      schoolId: z.string().optional().transform(val => val ? parseInt(val) : undefined)
    })
  }),

  /** @description Validation pour : POST /api/sa/mm/reconcile/:paymentId */
  forceReconcile: z.object({
    params: z.object({
      paymentId: z.string().regex(/^\d+$/, "L'ID doit être numérique").transform(Number)
    })
  }),

  /** @description Surveillance des logs techniques et erreurs API */
  monitoring: z.object({
    query: z.object({
      ...paginationBase,
      severity: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).optional(),
      startDate: z.string().datetime().optional(),
      endDate: z.string().datetime().optional(),
      provider: z.string().optional(),
    })
  }),
};