import { AdminNav } from '@/components/layout/admin-nav'
import { PageTransition } from '@/components/ui/page-transition'
import { ErrorBoundary } from '@/components/ui/error-boundary'
import { AdminGlobalSearch } from '@/components/admin/shared/global-search'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <AdminNav />
      <main className="flex-1 ml-64 min-h-screen bg-[#e8ecf4]">
        <div className="sticky top-0 z-20 bg-[#e8ecf4]/90 backdrop-blur border-b border-slate-200/70 px-6 py-3">
          <AdminGlobalSearch />
        </div>
        <ErrorBoundary>
          <PageTransition>{children}</PageTransition>
        </ErrorBoundary>
      </main>
    </div>
  )
}
