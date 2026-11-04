import { useMounted } from '@/lib/hooks/use-mounted'

/** Attend l'hydratation avant d'afficher un état chargé/erreur (évite mismatch SSR). */
export function useQueryLoading(isPending: boolean) {
  const mounted = useMounted()
  return !mounted || isPending
}
