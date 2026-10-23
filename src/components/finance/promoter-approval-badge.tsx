import { ShieldCheck, UserCheck } from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * Paiement manuel sur preuve : qui le valide, selon le seuil du Promoteur.
 * À partir du seuil, le guichet contrôle et le Promoteur valide ; en dessous,
 * la validation du guichet confirme le paiement.
 */
export function PromoterApprovalBadge({
  requiresPromoterApproval,
  className,
}: {
  requiresPromoterApproval: boolean
  className?: string
}) {
  return requiresPromoterApproval ? (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full bg-violet-50 px-2 py-0.5 text-[10px] font-medium text-violet-700',
        className,
      )}
      title="Montant au-dessus du seuil de validation : le Promoteur valide après le contrôle du guichet."
    >
      <ShieldCheck size={10} />
      Validation Promoteur
    </span>
  ) : (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-700',
        className,
      )}
      title="Sous le seuil de validation : la validation du guichet confirme le paiement."
    >
      <UserCheck size={10} />
      Validation guichet
    </span>
  )
}
