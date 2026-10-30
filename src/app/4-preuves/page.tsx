import type { Metadata } from 'next'
import { FourProofsSheet } from '@/components/commercial/four-proofs-sheet'

export const metadata: Metadata = {
  title: 'Les 4 preuves — SchoolManager',
  description:
    'Arrivé, sorti, payé, suivi. En RDC : M-Pesa, Orange Money, Airtel Money (CDF/USD) ou guichet. Compte école, code d’accès, pas d’enfant bloqué à l’entrée.',
}

export default function FourProofsPage() {
  return <FourProofsSheet />
}
