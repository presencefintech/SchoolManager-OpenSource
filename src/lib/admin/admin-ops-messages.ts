/** Libellés UI — codes métier GET /admin/dashboard/stats, devices, DLQ. */
export const ADMIN_OPS_UI = {
  STATS_OK: 'Statistiques école à jour.',
  STATS_FETCH_FAILED: 'Impossible de charger les statistiques. Vérifiez la connexion puis réessayez.',
  ADMIN_UNAUTHORIZED: 'Votre rôle ne permet pas d’accéder à ce tableau de bord.',
  DEVICES_OK: 'État des tablettes à jour.',
  DEVICE_NOT_FOUND: 'Cette tablette n’est pas enregistrée pour l’établissement.',
  DEVICES_FETCH_FAILED: 'Impossible de charger l’état des tablettes. Réessayez.',
  DLQ_LIST_OK: 'File d’échecs chargée.',
  DLQ_JOB_REPLAYED: 'Notification relancée vers WhatsApp / SMS.',
  DLQ_JOB_PURGED: 'Job retiré définitivement de la file d’échecs.',
  DLQ_JOB_NOT_FOUND: 'Ce job n’existe plus dans la file d’échecs.',
  DLQ_UNAVAILABLE: 'File d’échecs indisponible (Redis). Réessayez plus tard.',
  GATEWAY_DELIVERY_FAILED: 'Échec de livraison sur la passerelle WhatsApp / SMS.',
} as const

export type AdminOpsUiCode = keyof typeof ADMIN_OPS_UI

export const TABLET_STATUS_LABEL: Record<'ONLINE' | 'OFFLINE' | 'SYNCING', string> = {
  ONLINE: 'En ligne',
  OFFLINE: 'Hors-ligne',
  SYNCING: 'Synchronisation…',
}

export function adminOpsMessage(code?: string | null, fallback?: string): string {
  if (code && code in ADMIN_OPS_UI) {
    return ADMIN_OPS_UI[code as AdminOpsUiCode]
  }
  return fallback || 'Une erreur est survenue. Réessayez.'
}
