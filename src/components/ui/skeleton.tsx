import { cn } from '@/lib/utils'

export function Skeleton({ className }: { className?: string }) {
  return (
    <div className={cn('pf-skeleton rounded-xl', className)} />
  )
}
