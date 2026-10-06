import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import { QueryProvider } from '@/providers/query-provider'
import { AuthProvider } from '@/providers/auth-provider'
import { ToastProvider } from '@/providers/toast-provider'
import { ThemeProvider } from '@/providers/theme-provider'
import { SecurityEventListener } from '@/components/auth/security-event-listener'
import { OfflineBanner } from '@/components/layout/offline-banner'
import { AppSerwistProvider } from '@/components/pwa/serwist-provider'
import { SentryClientInit } from '@/components/observability/sentry-client-init'
import { ForcePasswordChangeGate } from '@/components/auth/force-password-change-gate'
import { THEME_BOOT_SCRIPT } from '@/lib/theme/preferences'
import { ThemeAtmosphere } from '@/components/theme/theme-atmosphere'
import { SchoolThemeSync } from '@/components/theme/school-theme-sync'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Presence — Collab',
  description: 'Gestion scolaire — présences, finances et guichet hors ligne',
  applicationName: 'Presence Guichet',
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Presence Guichet',
  },
  icons: {
    icon: [
      { url: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [{ url: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' }],
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
        <AppSerwistProvider>
          <ThemeProvider>
            <QueryProvider>
              <AuthProvider>
                <SchoolThemeSync />
                <ThemeAtmosphere />
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
        </AppSerwistProvider>
        <Analytics />
      </body>
    </html>
  )
}
