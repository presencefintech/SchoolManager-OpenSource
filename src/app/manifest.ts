import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Presence Guichet',
    short_name: 'Guichet',
    description:
      'Guichet de pointage Presence — installable, résilient hors ligne (file de scans + référentiel élèves)',
    start_url: '/teacher/attendance',
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
