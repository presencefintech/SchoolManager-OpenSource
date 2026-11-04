import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'SchoolManager',
    short_name: 'SchoolManager',
    description:
      'SchoolManager — espace parents, guichet de pointage et gestion scolaire, installable et résilient hors ligne',
    // '/' : le middleware redirige chaque rôle vers son espace (parent, guichet…)
    start_url: '/',
    scope: '/',
    display: 'standalone',
    orientation: 'any',
    background_color: '#f8fafc',
    theme_color: '#0f766e',
    categories: ['education', 'productivity'],
    lang: 'fr',
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      {
        src: '/icons/icon-512-maskable.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
    shortcuts: [
      {
        name: 'Espace parents',
        short_name: 'Parents',
        url: '/parent/dashboard',
        icons: [{ src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' }],
      },
      {
        name: 'Payer les frais',
        short_name: 'Payer',
        url: '/parent/finance/pay',
        icons: [{ src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' }],
      },
      {
        name: 'Ouvrir le guichet',
        short_name: 'Pointage',
        description: 'Écran de scan douchette / badge',
        url: '/teacher/attendance',
        icons: [{ src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' }],
      },
      {
        name: 'Tableau de bord enseignant',
        short_name: 'Dashboard',
        url: '/teacher/dashboard',
        icons: [{ src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' }],
      },
    ],
  }
}
