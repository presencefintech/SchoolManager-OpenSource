import type { Metadata } from 'next'
import { FourProofsSheet } from '@/components/commercial/four-proofs-sheet'

export const metadata: Metadata = {
  title: 'Les 4 preuves — SchoolManager',
  description:
    'Arrivé, sorti, payé, suivi : la fiche d’une page pour les promoteurs d’écoles (PresenceFintech).',
}

export default function FourProofsPage() {
  return <FourProofsSheet />
}
