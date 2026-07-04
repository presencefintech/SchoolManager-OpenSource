/** Clés TanStack Query — module finance élève / échéancier */
export const financeQueryKeys = {
  feeSchedule: (studentId: number, sessionId?: number) =>
    sessionId != null && sessionId > 0
      ? (['fee-schedule', studentId, sessionId] as const)
      : (['fee-schedule', studentId] as const),
} as const
