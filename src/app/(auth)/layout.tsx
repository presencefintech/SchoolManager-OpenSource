import { PageTransition } from '@/components/ui/page-transition'

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950">
      <PageTransition>{children}</PageTransition>
    </div>
  )
}
