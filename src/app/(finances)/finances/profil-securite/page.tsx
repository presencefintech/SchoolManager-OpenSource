import { SecurityProfilePanel } from '@/components/auth/security-profile-panel'
import { FinancePageHeader, FinancePageShell } from '@/components/finance/finance-page-shell'

export default function FinanceSecurityProfilePage() {
  return (
    <FinancePageShell>
      <FinancePageHeader
        title="Profil & sécurité"
        subtitle="Mot de passe, vérification email et paramètres de session"
        accent="slate"
      />
      <SecurityProfilePanel />
    </FinancePageShell>
  )
}
