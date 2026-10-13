import { AdminNav } from '@/components/layout/admin-nav'
import { PageTransition } from '@/components/ui/page-transition'
import { ErrorBoundary } from '@/components/ui/error-boundary'
import { AdminGlobalSearch } from '@/components/admin/shared/global-search'
import { EmailVerificationBanner } from '@/components/auth/email-verification-banner'
import {
  ImpersonationBanner,
  ImpersonationBannerSpacer,
} from '@/components/auth/impersonation-banner'
import { PlatformBroadcastBanner } from '@/components/auth/platform-broadcast-banner'
import { AdminRealtimeShell } from '@/components/admin/admin-realtime-shell'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <AdminRealtimeShell>
      <ImpersonationBanner />
      <ImpersonationBannerSpacer />
      <div className="flex min-h-screen">
        <AdminNav />
        <main className="flex-1 min-w-0 pt-14 lg:pt-0 lg:ml-64 min-h-screen bg-canvas">
          <div className="pf-chrome sticky top-0 z-20 border-b border-line bg-canvas/90 px-4 py-2.5 backdrop-blur sm:px-6">
            <AdminGlobalSearch />
          </div>
          <EmailVerificationBanner />
          <PlatformBroadcastBanner />
          <ErrorBoundary>
            <PageTransition>{children}</PageTransition>
          </ErrorBoundary>
        </main>
      </div>
    </AdminRealtimeShell>
  )
}
