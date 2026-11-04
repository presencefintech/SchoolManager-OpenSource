'use client'

import Link from 'next/link'
import { GraduationCap, Users, ArrowRight, Ban } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { School } from '@/types/super-admin'

const healthColors = {
  CRITICAL: 'bg-red-100 text-red-700',
  STABLE: 'bg-amber-100 text-amber-700',
  EXCELLENT: 'bg-green-100 text-green-700',
}

export function SchoolCard({ school }: { school: School }) {
  const suspended = school.active === false

  return (
    <div
      className={cn(
        'bg-white rounded-xl border shadow-sm p-5 flex flex-col gap-4 hover:shadow-md transition-all',
        suspended ? 'border-red-200 hover:border-red-300' : 'border-slate-200 hover:border-blue-300',
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="font-semibold text-slate-900">{school.name}</h3>
          <p className="text-sm text-slate-500 mt-0.5">{school.city}</p>
        </div>
        {suspended ? (
          <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-red-100 text-red-700">
            <Ban size={11} /> Suspendue
          </span>
        ) : (
          <span className={cn('text-xs font-medium px-2 py-0.5 rounded-full', healthColors[school.health.level])}>
            {school.health.label}
          </span>
        )}
      </div>

      {suspended && school.operationalSuspension ? (
        <p className="text-xs text-red-700/90 line-clamp-2 bg-red-50 rounded-lg px-2.5 py-1.5 border border-red-100">
          {school.operationalSuspension.reason}
        </p>
      ) : null}

      <div className="space-y-2">
        <div className="flex items-center gap-2 text-sm text-slate-600">
          <GraduationCap size={15} className="text-slate-400" />
          <span>{school._count.students} élèves</span>
        </div>
        <div className="flex items-center gap-2 text-sm text-slate-600">
          <Users size={15} className="text-slate-400" />
          <span>{school._count.admins} admin{school._count.admins > 1 ? 's' : ''}</span>
        </div>
        {!suspended ? (
          <div className="flex items-center gap-2 text-sm text-slate-600">
            <span className="text-slate-400 text-xs font-mono">Score</span>
            <div className="flex-1 h-1.5 rounded-full bg-slate-100 overflow-hidden">
              <div
                className={cn('h-full rounded-full', {
                  'bg-red-400': school.health.level === 'CRITICAL',
                  'bg-amber-400': school.health.level === 'STABLE',
                  'bg-green-400': school.health.level === 'EXCELLENT',
                })}
                style={{ width: `${school.health.score}%` }}
              />
            </div>
            <span className="text-xs text-slate-500">{school.health.score}%</span>
          </div>
        ) : null}
      </div>

      <Link
        href={`/super-admin/schools/${school.id}`}
        className="flex items-center justify-end gap-1 text-sm font-medium text-blue-600 hover:text-blue-700 transition-colors"
      >
        Voir <ArrowRight size={14} />
      </Link>
    </div>
  )
}

export function SchoolCardSkeleton() {
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-4">
      <div className="flex justify-between">
        <div className="space-y-2">
          <div className="h-4 w-36 rounded bg-slate-200 animate-pulse" />
          <div className="h-3 w-20 rounded bg-slate-200 animate-pulse" />
        </div>
        <div className="h-5 w-20 rounded-full bg-slate-200 animate-pulse" />
      </div>
      <div className="space-y-2">
        <div className="h-3 w-28 rounded bg-slate-200 animate-pulse" />
        <div className="h-3 w-24 rounded bg-slate-200 animate-pulse" />
        <div className="h-2 w-full rounded bg-slate-200 animate-pulse" />
      </div>
      <div className="h-3 w-16 rounded bg-slate-200 animate-pulse ml-auto" />
    </div>
  )
}
