import Link from 'next/link'
import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

export type AdminHeroMetric = {
  label: string
  value: string | number
  loading?: boolean
  valueClassName?: string
  icon: LucideIcon
}

type AdminModuleHeroProps = {
  eyebrow: string
  title: string
  subtitle?: string
  actions?: React.ReactNode
  metrics?: AdminHeroMetric[]
  footer?: React.ReactNode
  quickLinks?: ReadonlyArray<{ href: string; label: string; icon: LucideIcon }>
}

function HeroMetricCell({ label, value, loading, valueClassName, icon: Icon }: AdminHeroMetric) {
  return (
    <div className="flex flex-col justify-center gap-2 px-5 sm:px-6 py-5 min-w-0 border-t sm:border-t-0 sm:border-l border-white/10 sm:first:border-l-0">
      <div className="flex items-center gap-2">
        <Icon size={14} className="text-emerald-300/80 flex-shrink-0" />
        <p className="text-[11px] font-semibold uppercase tracking-wider text-emerald-100/70 truncate">{label}</p>
      </div>
      <p className={cn('text-3xl sm:text-4xl font-bold tabular-nums leading-none', valueClassName ?? 'text-white')}>
        {loading ? (
          <span className="inline-block w-12 h-9 bg-white/10 rounded animate-pulse" />
        ) : (
          value
        )}
      </p>
    </div>
  )
}

/** Bandeau module admin — gradient emerald, KPI, actions (aligné dashboard). */
export function AdminModuleHero({
  eyebrow,
  title,
  subtitle,
  actions,
  metrics,
  footer,
  quickLinks,
}: AdminModuleHeroProps) {
  return (
    <div className="relative w-full overflow-hidden bg-gradient-to-br from-slate-900 via-emerald-950 to-slate-900 text-white shadow-[0_4px_24px_rgba(0,0,0,0.15)]">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(16,185,129,0.22),_transparent_55%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,_rgba(15,23,42,0.4),_transparent_50%)]" />

      <div className="relative max-w-7xl mx-auto px-6 lg:px-8 pt-6 pb-0">
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-5 pb-5">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-emerald-300/90">{eyebrow}</p>
            <h1 className="text-2xl lg:text-3xl font-semibold tracking-tight mt-1.5">{title}</h1>
            {subtitle && <p className="text-sm text-emerald-100/60 mt-1">{subtitle}</p>}
          </div>
          {actions && <div className="flex items-center gap-2 flex-wrap flex-shrink-0">{actions}</div>}
        </div>

        {quickLinks && quickLinks.length > 0 && (
          <div className="flex flex-wrap gap-2 pb-5">
            {quickLinks.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-emerald-50/90 bg-white/8 hover:bg-white/12 border border-white/10 transition-colors"
              >
                <Icon size={13} className="text-emerald-200/80" />
                {label}
              </Link>
            ))}
          </div>
        )}
      </div>

      {metrics && metrics.length > 0 && (
        <div className="relative border-t border-white/10 bg-black/20 backdrop-blur-sm">
          <div
            className={cn(
              'max-w-7xl mx-auto grid',
              metrics.length >= 4 ? 'grid-cols-2 lg:grid-cols-4' : 'grid-cols-2 sm:grid-cols-3',
            )}
          >
            {metrics.map((m) => (
              <HeroMetricCell key={m.label} {...m} />
            ))}
          </div>
          {footer && (
            <div className="max-w-7xl mx-auto px-6 py-2.5 border-t border-white/10 text-xs text-emerald-100/70">
              {footer}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
