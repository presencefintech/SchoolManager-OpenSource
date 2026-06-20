import { SuperAdminNav } from '@/components/layout/super-admin-nav'

export default function SuperAdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <SuperAdminNav />
      <main className="pt-14 min-h-screen bg-zinc-50">
        {children}
      </main>
    </>
  )
}
