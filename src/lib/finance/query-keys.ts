/** Clés TanStack Query — module finance élève / échéancier */
export const financeQueryKeys = {
  guichetDashboard: () => ['finance', 'guichet-dashboard'] as const,
  collectionAnalytics: (sessionId: number) => ['finance', 'collection', sessionId] as const,
  feeSchedule: (studentId: number, sessionId?: number) =>
    sessionId != null && sessionId > 0
      ? (['fee-schedule', studentId, sessionId] as const)
      : (['fee-schedule', studentId] as const),
} as const
