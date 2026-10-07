/**
 * Demande au navigateur de ne pas évincer IndexedDB (roster + file de scans)
 * pendant une coupure prolongée — critique pour le guichet hors ligne multi-jours.
 */
export async function requestGatePersistentStorage(): Promise<boolean> {
  if (typeof navigator === 'undefined' || !navigator.storage?.persist) {
    return false
  }
  try {
    const already = await navigator.storage.persisted?.()
    if (already) return true
    return await navigator.storage.persist()
  } catch {
    return false
  }
}
