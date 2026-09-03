import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import { QueryProvider } from '@/providers/query-provider'
import { AuthProvider } from '@/providers/auth-provider'
import { ToastProvider } from '@/providers/toast-provider'
import { ThemeProvider } from '@/providers/theme-provider'
import { SecurityEventListener } from '@/components/auth/security-event-listener'
import { OfflineBanner } from '@/components/layout/offline-banner'
import { SentryClientInit } from '@/components/observability/sentry-client-init'
import { ForcePasswordChangeGate } from '@/components/auth/force-password-change-gate'
import { THEME_BOOT_SCRIPT } from '@/lib/theme/preferences'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'SchoolManager — Admin',
  description: "Tableau de bord de gestion scolaire",
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'SchoolManager',
  },
}

export const viewport: Viewport = {
  themeColor: '#059669',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOT_SCRIPT }} />
      </head>
      <body className={inter.className}>
        <ThemeProvider>
          <QueryProvider>
            <AuthProvider>
              <ToastProvider>
                <SentryClientInit />
                <ForcePasswordChangeGate />
                <OfflineBanner />
                <SecurityEventListener />
                {children}
              </ToastProvider>
            </AuthProvider>
          </QueryProvider>
        </ThemeProvider>
        <Analytics />
      </body>
    </html>
  )
}
