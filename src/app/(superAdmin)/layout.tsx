import { SuperAdminNav } from '@/components/layout/super-admin-nav'

export default function SuperAdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <SuperAdminNav />
      <main className="flex-1 ml-64 min-h-screen bg-zinc-50">
        {children}
      </main>
    </div>
  )
}
