import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { financeApi } from '@/lib/admin/api'
import type { CreateFeePayload } from '@/types/finance'

/** Catégories de profil élève (Standard, Enfant du personnel…) pour cibler un frais. */
export function useStudentProfileCategories(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ['admin', 'finance', 'student-profile-categories'],
    queryFn: financeApi.listStudentProfileCategories,
    enabled: options?.enabled ?? true,
    staleTime: 60_000,
  })
}

/** POST /finance/fees : catalogue, grille V2 et dettes élèves changent ensemble. */
export function useCreateFee() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: CreateFeePayload) => financeApi.createFee(payload),
    onSuccess: () => {
      // Catégories de frais, barèmes, grille V2 (préfixe ['admin', 'finance']).
      qc.invalidateQueries({ queryKey: ['admin', 'finance'] })
      qc.invalidateQueries({ queryKey: ['finance', 'fee-structures-v2'] })
      // Échéanciers élèves : les obligations viennent d'être générées.
      qc.invalidateQueries({ queryKey: ['admin', 'fee-schedule'] })
    },
  })
}
