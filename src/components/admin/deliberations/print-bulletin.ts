import { createRoot } from 'react-dom/client'
import { flushSync } from 'react-dom'
import { createElement } from 'react'
import { OfficialBulletinView } from '@/components/bulletin/OfficialBulletinView'
import type { StudentBulletinProps } from '@/types/official-bulletin'

function copyStyles(fromDoc: Document, toDoc: Document) {
  fromDoc.querySelectorAll('link[rel="stylesheet"], style').forEach((node) => {
    toDoc.head.appendChild(node.cloneNode(true))
  })
}

/** Impression / aperçu d’un bulletin EPST dans une fenêtre dédiée. */
export function printOfficialBulletin(bulletin: StudentBulletinProps): void {
  const win = window.open('', '_blank', 'noopener,noreferrer,width=900,height=1100')
  if (!win) {
    throw new Error(
      'Impossible d’ouvrir la fenêtre d’impression. Autorisez les pop-ups pour ce site.',
    )
  }

  win.document.open()
  win.document.write(`<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8" />
  <title>Bulletin — ${bulletin.student.fullName.replace(/[<>&]/g, '')}</title>
  <style>
    @page { size: A4 portrait; margin: 8mm; }
    html, body { margin: 0; background: #fff; }
  </style>
</head>
<body><div id="root"></div></body>
</html>`)
  win.document.close()

  copyStyles(document, win.document)

  const mount = win.document.getElementById('root')
  if (!mount) {
    win.close()
    throw new Error('Impossible de préparer l’impression du bulletin.')
  }

  const root = createRoot(mount)
  flushSync(() => {
    root.render(createElement(OfficialBulletinView, { bulletin }))
  })

  setTimeout(() => {
    win.focus()
    win.print()
  }, 450)
}
