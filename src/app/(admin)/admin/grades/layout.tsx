import { AdminGradesSubnav } from '@/components/admin/grades/admin-grades-subnav'

export default function AdminGradesLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-full bg-[#e8ecf4]">
      <div className="max-w-7xl mx-auto px-6 lg:px-8 pt-4">
        <AdminGradesSubnav />
      </div>
      {children}
    </div>
  )
}
