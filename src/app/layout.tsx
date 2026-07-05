import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import { QueryProvider } from '@/providers/query-provider'
import { AuthProvider } from '@/providers/auth-provider'
import { ToastProvider } from '@/providers/toast-provider'
import { SecurityEventListener } from '@/components/auth/security-event-listener'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'presenceFintech — Admin',
  description: "Tableau de bord de gestion scolaire",
  icons: { icon: '/favicon.svg' },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body className={inter.className}>
        <QueryProvider>
          <AuthProvider>
            <ToastProvider>
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
