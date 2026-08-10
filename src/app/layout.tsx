import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import { QueryProvider } from '@/providers/query-provider'
import { AuthProvider } from '@/providers/auth-provider'
import { ToastProvider } from '@/providers/toast-provider'
import { SecurityEventListener } from '@/components/auth/security-event-listener'
import { OfflineBanner } from '@/components/layout/offline-banner'
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
    <html lang="fr">
      <body className={inter.className}>
        <QueryProvider>
          <AuthProvider>
            <ToastProvider>
              <OfflineBanner />
              <SecurityEventListener />
              {children}
            </ToastProvider>
          </AuthProvider>
        </QueryProvider>
        <Analytics />
      </body>
    </html>
  )
}
