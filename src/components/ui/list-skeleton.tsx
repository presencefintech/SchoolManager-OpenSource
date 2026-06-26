import { cn } from '@/lib/utils'

export function ListRowSkeleton({ rows = 5, className }: { rows?: number; className?: string }) {
  return (
    <div className={cn('divide-y divide-zinc-100', className)}>
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="px-5 py-4 flex items-center gap-4 animate-pulse">
          <div className="w-9 h-9 rounded-full bg-zinc-100" />
          <div className="flex-1 space-y-2">
            <div className="h-3 w-40 bg-zinc-100 rounded" />
            <div className="h-3 w-24 bg-zinc-100 rounded" />
          </div>
          <div className="h-5 w-16 bg-zinc-100 rounded-full" />
        </div>
      ))}
    </div>
  )
}

export function StatGridSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="h-24 bg-zinc-100 rounded-xl animate-pulse" />
      ))}
    </div>
  )
}
