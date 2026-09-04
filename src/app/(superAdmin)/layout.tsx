import { SuperAdminNav } from '@/components/layout/super-admin-nav'
import { PageTransition } from '@/components/ui/page-transition'
import { ErrorBoundary } from '@/components/ui/error-boundary'
import { EmailVerificationBanner } from '@/components/auth/email-verification-banner'

export default function SuperAdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <SuperAdminNav />
      <main className="flex-1 min-w-0 pt-14 lg:pt-0 lg:ml-64 min-h-screen bg-canvas">
        <EmailVerificationBanner />
        <ErrorBoundary>
          <PageTransition>{children}</PageTransition>
        </ErrorBoundary>
      </main>
    </div>
  )
}
