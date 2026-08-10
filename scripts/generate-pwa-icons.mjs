// One-off / re-run-on-demand script — regenerate PWA icons from the master logo.
// Usage: node scripts/generate-pwa-icons.mjs
import sharp from 'sharp'
import { mkdir } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, '..')
const source = path.join(root, 'public', 'logo-icon-transparent.png')
const outDir = path.join(root, 'public', 'icons')

const BRAND_GREEN = '#059669' // emerald-600, matches login CTA gradient

await mkdir(outDir, { recursive: true })

// Plain (transparent) icons — "any" purpose
await sharp(source).resize(192, 192).png().toFile(path.join(outDir, 'icon-192.png'))
await sharp(source).resize(512, 512).png().toFile(path.join(outDir, 'icon-512.png'))

// Maskable icon — solid background + padding so OS masks (circle/squircle) don't clip the logo
const maskableSize = 512
const logoSize = Math.round(maskableSize * 0.6) // ~60% keeps the logo inside the safe zone
const logoBuffer = await sharp(source).resize(logoSize, logoSize).png().toBuffer()

await sharp({
  create: {
    width: maskableSize,
    height: maskableSize,
    channels: 4,
    background: BRAND_GREEN,
  },
})
  .composite([{ input: logoBuffer, gravity: 'center' }])
  .png()
  .toFile(path.join(outDir, 'icon-512-maskable.png'))

console.log('PWA icons written to', outDir)
