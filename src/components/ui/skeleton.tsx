import { cn } from '@/lib/utils'

export function Skeleton({ className }: { className?: string }) {
  return (
    <div className={cn('rounded-xl bg-zinc-100 animate-pulse', className)} />
  )
}
