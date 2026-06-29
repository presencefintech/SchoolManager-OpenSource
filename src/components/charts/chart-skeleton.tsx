import { cn } from '@/lib/utils'

export function ChartSkeleton({
  height = 200,
  className,
  variant = 'block',
}: {
  height?: number
  className?: string
  variant?: 'block' | 'donut' | 'dashboard-hero'
}) {
  if (variant === 'donut') {
    return (
      <div className={cn('flex flex-col items-center gap-4 animate-pulse', className)}>
        <div className="w-40 h-40 rounded-full bg-zinc-100" />
        <div className="w-full space-y-3">
          <div className="h-4 bg-zinc-100 rounded" />
          <div className="h-4 bg-zinc-100 rounded w-4/5" />
          <div className="h-4 bg-zinc-100 rounded w-3/5" />
        </div>
      </div>
    )
  }

  if (variant === 'dashboard-hero') {
    return (
      <div className={cn('grid grid-cols-1 lg:grid-cols-3 gap-4 animate-pulse', className)}>
        <div className="lg:col-span-2 h-48 bg-zinc-100 rounded-xl" />
        <div className="h-48 bg-zinc-100 rounded-xl" />
      </div>
    )
  }

  return <div className={cn('bg-zinc-100 rounded-xl animate-pulse', className)} style={{ height }} />
}
