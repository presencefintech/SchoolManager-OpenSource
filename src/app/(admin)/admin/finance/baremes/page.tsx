import { redirect } from 'next/navigation'

/** Alias route — les barèmes / grille V2 vivent sur Factures & Frais. */
export default function BaremesAliasPage() {
  redirect('/admin/finance/factures#grille-tarifaire-v2')
}
