import { AdminNav } from '@/components/layout/admin-nav'
import { PageTransition } from '@/components/ui/page-transition'
import { ErrorBoundary } from '@/components/ui/error-boundary'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <AdminNav />
      <main className="flex-1 ml-64 min-h-screen bg-zinc-50">
        <ErrorBoundary>
          <PageTransition>{children}</PageTransition>
        </ErrorBoundary>
      </main>
    </div>
  )
}
