'use client'

import Link from 'next/link'
import { CreditCard, UserPlus, ArrowRight, Wallet, AlertCircle, CheckCircle2, Banknote } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAdminRealtimeStatus } from '@/lib/admin/hooks/admin-realtime-provider'

function fmtTime(iso: string) {
  try {
    return new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  } catch {
    return '—'
  }
}

function fmtAmount(amount?: number, currency?: string) {
  if (amount == null || !Number.isFinite(amount)) return null
  try {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: currency && currency.length === 3 ? currency : 'CDF',
      maximumFractionDigits: 0,
    }).format(amount)
  } catch {
    return `${amount} ${currency ?? ''}`.trim()
  }
}

export function AdminPlatformEventsPanel() {
  const { status, recentPayments, recentEnrollments, recentCashActivity } = useAdminRealtimeStatus()

  return (
    <div className="rounded-xl border border-slate-200/80 bg-white/90 shadow-[0_1px_3px_rgba(15,23,42,0.06)] overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-2 px-5 py-3.5 border-b border-slate-100 bg-slate-50/50">
        <div className="flex items-center gap-2">
          <Wallet size={16} className="text-indigo-600" />
          <h3 className="text-sm font-semibold text-slate-800">Événements plateforme</h3>
          <span
            className={cn(
              'text-[10px] font-medium px-2 py-0.5 rounded-full',
              status === 'live' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500',
            )}
          >
            {status === 'live' ? 'Temps réel' : 'Actualisation'}
          </span>
        </div>
        <div className="flex gap-3 text-[11px]">
          <Link href="/admin/finance/caisse" className="text-indigo-600 hover:text-indigo-700 font-medium inline-flex items-center gap-0.5">
            Caisse <ArrowRight size={11} />
          </Link>
          <Link href="/admin/finance/paiements" className="text-indigo-600 hover:text-indigo-700 font-medium inline-flex items-center gap-0.5">
            Paiements <ArrowRight size={11} />
          </Link>
          <Link href="/admin/enrollments" className="text-indigo-600 hover:text-indigo-700 font-medium inline-flex items-center gap-0.5">
            Inscriptions <ArrowRight size={11} />
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-slate-100">
        <div className="p-4">
          <div className="flex items-center gap-1.5 mb-3">
            <Banknote size={14} className="text-emerald-700" />
            <h4 className="text-xs font-semibold text-slate-700 uppercase tracking-wide">Caisse</h4>
          </div>
          {recentCashActivity.length === 0 ? (
            <p className="text-xs text-slate-400 py-6 text-center">
              Aucun mouvement de caisse en direct pour l’instant.
            </p>
          ) : (
            <ul className="space-y-2 max-h-48 overflow-y-auto">
              {recentCashActivity.map((m) => (
                <li key={m.id} className="flex items-start gap-2 text-xs rounded-lg border border-slate-100 px-3 py-2">
                  <Banknote size={14} className="text-emerald-600 mt-0.5 flex-shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-slate-800 truncate">{m.label}</p>
                    <p className="text-slate-500">
                      {m.schoolName ? `${m.schoolName} · ` : ''}
                      {fmtAmount(m.amount, m.currency) ?? '—'}
                    </p>
                  </div>
                  <span className="text-[10px] text-slate-400 tabular-nums flex-shrink-0">{fmtTime(m.timestamp)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="p-4">
          <div className="flex items-center gap-1.5 mb-3">
            <CreditCard size={14} className="text-emerald-600" />
            <h4 className="text-xs font-semibold text-slate-700 uppercase tracking-wide">Paiements</h4>
          </div>
          {recentPayments.length === 0 ? (
            <p className="text-xs text-slate-400 py-6 text-center">
              Aucun paiement confirmé ou échoué récemment.
            </p>
          ) : (
            <ul className="space-y-2 max-h-48 overflow-y-auto">
              {recentPayments.map((p) => (
                <li key={p.id} className="flex items-start gap-2 text-xs rounded-lg border border-slate-100 px-3 py-2">
                  {p.type === 'confirmed' ? (
                    <CheckCircle2 size={14} className="text-emerald-500 mt-0.5 flex-shrink-0" />
                  ) : (
                    <AlertCircle size={14} className="text-red-500 mt-0.5 flex-shrink-0" />
                  )}
                  <div className="min-w-0 flex-1">
                    {p.type === 'confirmed' ? (
                      <>
                        <p className="font-medium text-slate-800 truncate">
                          {p.studentName ?? `Paiement #${p.paymentId}`}
                        </p>
                        <p className="text-slate-500">
                          {fmtAmount(p.amount, p.currency) ?? '—'}{p.provider ? ` · ${p.provider}` : ''}
                        </p>
                      </>
                    ) : (
                      <>
                        <p className="font-medium text-red-800">Échec #{p.paymentId}</p>
                        <p className="text-slate-500 truncate">{p.message ?? p.reason ?? 'Erreur inconnue'}</p>
                      </>
                    )}
                  </div>
                  <span className="text-[10px] text-slate-400 tabular-nums flex-shrink-0">{fmtTime(p.timestamp)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="p-4">
          <div className="flex items-center gap-1.5 mb-3">
            <UserPlus size={14} className="text-violet-600" />
            <h4 className="text-xs font-semibold text-slate-700 uppercase tracking-wide">Inscriptions</h4>
          </div>
          {recentEnrollments.length === 0 ? (
            <p className="text-xs text-slate-400 py-6 text-center">
              Aucune inscription validée ou nouvelle demande récente.
            </p>
          ) : (
            <ul className="space-y-2 max-h-48 overflow-y-auto">
              {recentEnrollments.map((e) => (
                <li key={e.id} className="flex items-start gap-2 text-xs rounded-lg border border-slate-100 px-3 py-2">
                  <UserPlus
                    size={14}
                    className={cn(
                      'mt-0.5 flex-shrink-0',
                      e.type === 'approved' ? 'text-emerald-500' : 'text-violet-500',
                    )}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-slate-800 truncate">
                      {e.rdcFullName ?? e.fullName ?? `Élève #${e.studentId}`}
                    </p>
                    <p className="text-slate-500">
                      {e.type === 'approved'
                        ? `Validée${e.matricule ? ` · ${e.matricule}` : ''}`
                        : 'Nouvelle demande'}
                    </p>
                  </div>
                  <span className="text-[10px] text-slate-400 tabular-nums flex-shrink-0">{fmtTime(e.timestamp)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}
