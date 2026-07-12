import { AdminNav } from '@/components/layout/admin-nav'
import { PageTransition } from '@/components/ui/page-transition'
import { ErrorBoundary } from '@/components/ui/error-boundary'
import { AdminGlobalSearch } from '@/components/admin/shared/global-search'
import { EmailVerificationBanner } from '@/components/auth/email-verification-banner'
import { AdminRealtimeShell } from '@/components/admin/admin-realtime-shell'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <AdminRealtimeShell>
      <div className="flex min-h-screen">
        <AdminNav />
        <main className="flex-1 ml-64 min-h-screen bg-[#e8ecf4]">
          <div className="sticky top-0 z-20 bg-[#e8ecf4]/90 backdrop-blur border-b border-slate-200/70 px-6 py-3">
            <AdminGlobalSearch />
          </div>
          <EmailVerificationBanner />
          <ErrorBoundary>
            <PageTransition>{children}</PageTransition>
          </ErrorBoundary>
        </main>
      </div>
    </AdminRealtimeShell>
  )
}
