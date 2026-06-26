/** Factory de clés — invalidation ciblée sans désynchronisation */
export const queryKeys = {
  superadmin: {
    schools: () => ['superadmin', 'schools'] as const,
    school: (id: number) => ['superadmin', 'schools', id] as const,
    students: {
      stats: (schoolId: number) => ['superadmin', 'students', 'stats', schoolId] as const,
      list: (schoolId: number, params?: Record<string, unknown>) =>
        ['superadmin', 'students', 'list', schoolId, params] as const,
      debtors: (schoolId: number) => ['superadmin', 'students', 'debtors', schoolId] as const,
      dashboard: (studentId: number) => ['superadmin', 'students', 'dashboard', studentId] as const,
      activity: (studentId: number) => ['superadmin', 'students', 'activity', studentId] as const,
      dossier: (studentId: number) => ['superadmin', 'students', 'dossier', studentId] as const,
    },
  },
} as const
