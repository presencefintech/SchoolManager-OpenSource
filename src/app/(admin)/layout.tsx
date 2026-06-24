import { AdminNav } from '@/components/layout/admin-nav'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <AdminNav />
      <main className="flex-1 ml-64 min-h-screen bg-zinc-50">
        {children}
      </main>
    </div>
  )
}
