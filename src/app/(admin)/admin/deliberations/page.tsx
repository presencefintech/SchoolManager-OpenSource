import { DeliberationsWorkspace } from '@/components/admin/deliberations/deliberations-workspace'

export const metadata = {
  title: 'Délibérations de classe',
}

export default function AdminDeliberationsPage() {
  return (
    <div className="min-h-full bg-[#e8ecf4]">
      <DeliberationsWorkspace />
    </div>
  )
}
