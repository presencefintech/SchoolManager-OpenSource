'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { useCallback, useEffect, useState } from 'react'
import {
  LogOut, LayoutDashboard, GraduationCap, Users, UserPlus,
  ShieldAlert, BookOpen, Activity, Wallet, Mail, School,
  Settings, CreditCard, FileText, Clock, Shield, Building2, Network,
  Bell, Monitor, FolderOpen, Gavel, ChevronDown, RotateCcw, Fingerprint, UserCircle, QrCode, BarChart3, Megaphone, CalendarClock, Inbox, ClipboardList, Contact, Layers3, Smartphone, Upload,
  Menu, X, BadgeCheck, NotebookPen, Calculator, Lock, ScrollText, LifeBuoy, Award,
} from 'lucide-react'
import { useQueryClient } from '@tanstack/react-query'
import { cn } from '@/lib/utils'
import { ThemePicker } from '@/components/theme/theme-picker'
import { useAuth } from '@/providers/auth-provider'
import { getAuthToken, getAuthSchoolId } from '@/lib/api/auth-storage'
import type { UserRole } from '@/types/auth'
import {
  dashboardApi, studentsApi,
  presencesApi, financeApi,
} from '@/lib/admin/api'

type SubLink = { label: string; href: string; icon: React.ElementType }
type NavLink = { label: string; href: string; icon: React.ElementType; children?: SubLink[] }
type NavSection = { title?: string; links: NavLink[] }

const NAV_SECTIONS: NavSection[] = [
  {
    links: [
      { label: 'Tableau de bord', href: '/admin/dashboard', icon: LayoutDashboard },
      { label: 'Présences', href: '/admin/presences', icon: Activity },
    ],
  },
  {
    title: 'Gestion',
    links: [
      { label: 'Élèves', href: '/admin/students', icon: GraduationCap },
      { label: 'Cartes élèves', href: '/admin/cards', icon: CreditCard },
      { label: 'Cartes parent', href: '/admin/desk?gap=pickup', icon: Contact },
      { label: 'Boîte d\'entrée', href: '/admin/inbox', icon: Inbox },
      { label: 'Pré-inscriptions', href: '/admin/pre-enrollments', icon: UserCircle },
      { label: 'Inscriptions', href: '/admin/enrollments', icon: UserPlus },
      { label: 'Classes', href: '/admin/classes', icon: BookOpen },
      { label: 'Emploi du temps', href: '/admin/schedule', icon: CalendarClock },
      { label: 'Devoirs', href: '/admin/devoirs', icon: NotebookPen },
      {
        label: 'Notes',
        href: '/admin/grades/overview',
        icon: Calculator,
        children: [
          { label: 'Vue d’ensemble', href: '/admin/grades/overview', icon: LayoutDashboard },
          { label: 'Cahier de notes', href: '/admin/grades/gradebook', icon: BookOpen },
          { label: 'Périodes', href: '/admin/grades/periods', icon: Lock },
          { label: 'Délibérations', href: '/admin/deliberations', icon: Award },
          { label: 'Journal d’audit', href: '/admin/grades/audit-logs', icon: ScrollText },
        ],
      },
      { label: 'Enseignants', href: '/admin/teachers', icon: School },
      { label: 'Personnel', href: '/admin/staff', icon: Users },
    ],
  },
  {
    title: 'Finances',
    links: [
      {
        label: 'Finance', href: '/admin/finance', icon: Wallet,
        children: [
          { label: 'Tableau de bord', href: '/admin/finance', icon: LayoutDashboard },
          { label: 'Rapports', href: '/admin/finance/rapports', icon: BarChart3 },
          { label: 'Frais annuels par classe', href: '/admin/finance/frais-annuels-classes', icon: Layers3 },
          { label: 'Paiements', href: '/admin/finance/paiements', icon: CreditCard },
          { label: 'Contrôle', href: '/admin/finance/controle', icon: ClipboardList },
          { label: 'Déclarations SMS', href: '/admin/finance/declarations', icon: Smartphone },
          { label: 'Remboursements', href: '/admin/finance/remboursements', icon: RotateCcw },
          { label: 'Factures & Frais', href: '/admin/finance/factures', icon: FileText },
          { label: 'Moratoires', href: '/admin/finance/moratoriums', icon: Clock },
          { label: 'Lots scellés', href: '/admin/finance/scelles', icon: Fingerprint },
          { label: 'Profil règlement', href: '/admin/finance/payment-profile', icon: Building2 },
          { label: 'Console groupe', href: '/admin/finance/reseau', icon: Network },
          { label: 'Caisse & fonds', href: '/admin/finance/caisse', icon: Wallet },
          { label: 'Secours', href: '/admin/finance/rescue', icon: LifeBuoy },
          { label: 'Audit & Fraude', href: '/admin/finance/audit', icon: Shield },
          { label: 'Vérifier document', href: '/verify', icon: QrCode },
        ],
      },
    ],
  },
  {
    title: 'Outils',
    links: [
      { label: 'Invitations', href: '/admin/invitations', icon: Mail },
      { label: 'Emails', href: '/admin/email', icon: Mail },
      { label: 'Notifications', href: '/admin/notifications', icon: Bell },
      { label: 'Communiqués', href: '/admin/announcements', icon: Megaphone },
      { label: 'Notifications de présence', href: '/admin/attendance-notifications', icon: Activity },
      { label: 'Fraude', href: '/admin/fraud', icon: ShieldAlert },
      { label: 'Sanctions', href: '/admin/sanctions', icon: Gavel },
      { label: 'Fichiers', href: '/admin/files', icon: FolderOpen },
      { label: 'Import Excel', href: '/admin/import', icon: Upload },
      { label: 'État du système', href: '/admin/monitoring', icon: Monitor },
      { label: 'Vérifier document', href: '/verify', icon: QrCode },
      { label: 'Mon abonnement', href: '/admin/abonnement', icon: BadgeCheck },
      { label: 'Paramètres', href: '/admin/settings', icon: Settings },
      { label: 'Profil & sécurité', href: '/admin/profil-securite', icon: UserCircle },
    ],
  },
]

const IT_NAV_SECTIONS: NavSection[] = [
  {
    title: 'Guichet',
    links: [
      { label: 'Accueil guichet', href: '/admin/desk', icon: LayoutDashboard },
      { label: 'Boîte d\'entrée', href: '/admin/inbox', icon: Inbox },
      { label: 'Inscriptions', href: '/admin/enrollments', icon: UserPlus },
      { label: 'Pré-inscriptions', href: '/admin/pre-enrollments', icon: UserCircle },
      { label: 'Élèves', href: '/admin/students', icon: GraduationCap },
      { label: 'Cartes élèves', href: '/admin/cards', icon: CreditCard },
      { label: 'Cartes parent', href: '/admin/desk?gap=pickup', icon: Contact },
      { label: 'Classes', href: '/admin/classes', icon: BookOpen },
      { label: 'Dettes / en ordre', href: '/admin/finance/controle', icon: Wallet },
      { label: 'Enseignants', href: '/admin/teachers', icon: School },
      { label: 'Import Excel', href: '/admin/import', icon: Upload },
    ],
  },
  {
    title: 'Consultation',
    links: [
      { label: 'Présences', href: '/admin/presences', icon: Activity },
      { label: 'Emploi du temps', href: '/admin/schedule', icon: CalendarClock },
      { label: 'Codes parents', href: '/admin/invitations', icon: Mail },
      { label: 'Communiqués', href: '/admin/announcements', icon: Megaphone },
      { label: 'Fichiers', href: '/admin/files', icon: FolderOpen },
      { label: 'Vérifier document', href: '/verify', icon: QrCode },
      { label: 'Profil & sécurité', href: '/admin/profil-securite', icon: UserCircle },
    ],
  },
]

function navForRole(role?: UserRole): NavSection[] {
  return role === 'IT' ? IT_NAV_SECTIONS : NAV_SECTIONS
}

export function AdminNav() {
  const pathname = usePathname()
  const { user, logout } = useAuth()
  const queryClient = useQueryClient()
  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(() => {
    setMobileOpen(false)
  }, [pathname])

  useEffect(() => {
    if (!mobileOpen) return
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [mobileOpen])

  const prefetch = useCallback((href: string) => {
    if (!getAuthToken()) return
    if (href === '/admin/dashboard') {
      void queryClient.prefetchQuery({
        queryKey: ['admin', 'stats'],
        queryFn: dashboardApi.getStats,
        staleTime: 30_000,
      })
    } else if (href === '/admin/students') {
      void queryClient.prefetchQuery({
        queryKey: ['admin', 'students', 'dashboard'],
        queryFn: studentsApi.getMainDashboard,
        staleTime: 60_000,
      })
    } else if (href === '/admin/presences') {
      void queryClient.prefetchQuery({
        queryKey: ['admin', 'presences', 'stats'],
        queryFn: presencesApi.getStats,
        staleTime: 30_000,
      })
    } else if (href === '/admin/finance') {
      void queryClient.prefetchQuery({
        queryKey: ['admin', 'finance', 'dashboard'],
        queryFn: financeApi.getStrategicDashboard,
        staleTime: 60_000,
      })
    }
  }, [queryClient])

  const initials = user
    ? `${user.firstName?.[0] ?? ''}${user.lastName?.[0] ?? ''}`.toUpperCase()
    : 'AD'
  const sections = navForRole(user?.role)
  const homeHref = user?.role === 'IT' ? '/admin/inbox' : '/admin/dashboard'
  const badgeLabel = user?.role === 'IT' ? 'IT · Guichet' : 'Admin'

  return (
    <>
      {/* Barre mobile — hamburger + logo, masquée en desktop */}
      <div
        className="pf-chrome lg:hidden fixed left-0 right-0 z-40 flex items-center gap-3 px-4 h-14 bg-white border-b border-zinc-100"
        style={{ top: 'var(--impersonation-banner-h, 0px)' }}
      >
        <button
          type="button"
          onClick={() => setMobileOpen(true)}
          className="p-2 -ml-2 rounded-lg text-zinc-600 hover:bg-zinc-50 active:bg-zinc-100 transition-colors"
          aria-label="Ouvrir le menu"
        >
          <Menu size={20} />
        </button>
        <Link href={homeHref} className="flex items-center gap-2 min-w-0">
          <div className="w-6 h-6 flex-shrink-0">
            <Image src="/logo-icon-transparent.png" alt="SchoolManager" width={24} height={24} className="h-full w-full object-contain" />
          </div>
          <p className="text-sm font-bold text-zinc-900 truncate tracking-tight">SchoolManager</p>
        </Link>
      </div>

      {/* Fond assombri derrière le tiroir mobile */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 z-40 bg-black/40"
          onClick={() => setMobileOpen(false)}
          aria-hidden="true"
        />
      )}

      <aside
        className={cn(
          'pf-chrome fixed left-0 w-64 z-50 flex flex-col overflow-hidden bg-white border-r border-slate-200 shadow-sm',
          'transition-transform duration-200 ease-out lg:translate-x-0',
          mobileOpen ? 'translate-x-0' : '-translate-x-full',
        )}
        style={{
          top: 'var(--impersonation-banner-h, 0px)',
          height: 'calc(100vh - var(--impersonation-banner-h, 0px))',
        }}
      >
        <div className="flex items-center justify-between gap-2 px-4 py-3.5 flex-shrink-0">
          <Link href={homeHref} className="group flex items-center gap-3 min-w-0">
            <div className="w-8 h-8 flex-shrink-0 group-hover:scale-105 transition-transform duration-200">
              <Image src="/logo-icon-transparent.png" alt="SchoolManager" width={32} height={32} className="h-full w-full object-contain" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold text-zinc-900 leading-tight truncate tracking-tight">SchoolManager</p>
              <span className="inline-block text-[10px] font-medium text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-full leading-none mt-0.5">
                {badgeLabel}
              </span>
            </div>
          </Link>
          <button
            type="button"
            onClick={() => setMobileOpen(false)}
            className="lg:hidden flex-shrink-0 p-1.5 rounded-lg text-zinc-400 hover:bg-zinc-50 hover:text-zinc-700 transition-colors"
            aria-label="Fermer le menu"
          >
            <X size={18} />
          </button>
        </div>

        <nav className="flex-1 min-h-0 px-3 py-2 overflow-y-auto overscroll-contain space-y-3 [scrollbar-gutter:stable] [scrollbar-width:thin] [scrollbar-color:#d4d4d8_transparent] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-zinc-300 hover:[&::-webkit-scrollbar-thumb]:bg-zinc-400 [&::-webkit-scrollbar-track]:bg-transparent">
        {sections.map(({ title, links }) => (
          <div key={title ?? '__root__'}>
            {title && (
              <p className="px-2 pb-1 text-[9px] font-semibold text-zinc-400 uppercase tracking-widest select-none">
                {title}
              </p>
            )}
            <div className="space-y-0.5">
              {links.map(({ label, href, icon: Icon, children }) => {
                const expanded = !!children && pathname.startsWith(href)
                const active = !children && pathname.startsWith(href)

                return (
                  <div key={href}>
                    <Link
                      href={href}
                      onMouseEnter={() => prefetch(href)}
                      className={cn(
                        'group flex items-center gap-2.5 px-3 py-1.5 rounded-xl text-[13px] font-medium transition-colors duration-150',
                        expanded
                          ? 'bg-zinc-50 text-zinc-800'
                          : active
                            ? 'bg-zinc-900 text-white shadow-sm'
                            : 'text-zinc-500 hover:bg-zinc-50 hover:text-zinc-900',
                      )}
                    >
                      <Icon
                        size={15}
                        className={cn(
                          'flex-shrink-0 transition-colors',
                          active ? 'text-emerald-400' : expanded ? 'text-zinc-500' : 'text-zinc-400 group-hover:text-zinc-600',
                        )}
                      />
                      <span className="flex-1 leading-none">{label}</span>
                      {children && (
                        <ChevronDown
                          size={12}
                          className={cn('text-zinc-400 transition-transform duration-200', expanded && 'rotate-180')}
                        />
                      )}
                    </Link>

                    {children && expanded ? (
                      <div className="ml-4 pl-3 border-l-2 border-zinc-100 mt-1 mb-1 space-y-0.5">
                        {children.map(({ label: sub, href: subHref, icon: SubIcon }) => {
                          const subActive = subHref === href
                            ? pathname === subHref
                            : pathname.startsWith(subHref)
                          return (
                            <Link
                              key={subHref}
                              href={subHref}
                              className={cn(
                                'flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors',
                                subActive
                                  ? 'bg-zinc-900 text-white'
                                  : 'text-zinc-400 hover:text-zinc-800 hover:bg-zinc-50',
                              )}
                            >
                              <SubIcon
                                size={12}
                                className={cn('flex-shrink-0', subActive ? 'text-emerald-400' : 'text-zinc-300')}
                              />
                              {sub}
                            </Link>
                          )
                        })}
                      </div>
                    ) : null}
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="px-3 pb-3 flex-shrink-0 border-t border-zinc-100 pt-2.5 space-y-1">
        <div className="flex items-center justify-between px-1">
          <span className="text-[10px] font-semibold uppercase tracking-widest text-zinc-400 px-1">Thème</span>
          <ThemePicker compact />
        </div>
        <Link
          href="/admin/profil-securite"
          className="flex items-center gap-2.5 px-2 py-2 rounded-xl hover:bg-zinc-50 transition-colors group"
        >
          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center flex-shrink-0 shadow-sm ring-2 ring-white">
            <span className="text-[10px] font-bold text-white">{initials}</span>
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold text-zinc-700 truncate leading-tight group-hover:text-emerald-700">
              {user?.firstName} {user?.lastName}
            </p>
            <p className="text-[10px] text-zinc-400 truncate leading-tight">Profil &amp; sécurité</p>
          </div>
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              logout()
            }}
            title="Déconnexion"
            className="p-1.5 rounded-lg text-zinc-300 hover:text-red-500 hover:bg-red-50 transition-all flex-shrink-0"
          >
            <LogOut size={13} />
          </button>
        </Link>
        </div>
      </aside>
    </>
  )
}
