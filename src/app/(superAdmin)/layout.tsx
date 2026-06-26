import { SuperAdminNav } from '@/components/layout/super-admin-nav'
import { PageTransition } from '@/components/ui/page-transition'

export default function SuperAdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <SuperAdminNav />
      <main className="flex-1 ml-64 min-h-screen bg-zinc-50">
        <PageTransition>{children}</PageTransition>
      </main>
    </div>
  )
}
