/**
 * Compression photo côté navigateur avant upload.
 *
 * Le proxy Next (/api/[...path]) tourne en fonction serverless : l'hébergeur rejette
 * tout corps > ~4,5 Mo en 413 avant même d'atteindre le backend. Une photo smartphone
 * brute (4–8 Mo) échoue donc systématiquement — on la réduit ici.
 */

/** Bord max envoyé — le backend redescend à 800 px, on garde de la marge pour sharp. */
const MAX_EDGE = 1600
/** Cible par fichier, très en dessous de la limite proxy. */
const TARGET_BYTES = 1.5 * 1024 * 1024
const COMPRESSIBLE = /^image\/(jpeg|png|webp|gif|heic|heif|bmp)$/i

function canvasToBlob(canvas: HTMLCanvasElement, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', quality))
}

function jpegName(name: string): string {
  const dot = name.lastIndexOf('.')
  return `${dot > 0 ? name.slice(0, dot) : name}.jpg`
}

/**
 * Retourne un JPEG ≤ 1600 px, idéalement ≤ 1,5 Mo. Le nom de base est conservé
 * (matching batch {numeroCourt|matricule}.jpg). En cas d'échec de décodage
 * (format non lisible par le navigateur), le fichier d'origine est renvoyé tel quel.
 */
export async function compressImageFile(file: File): Promise<File> {
  if (!COMPRESSIBLE.test(file.type)) return file
  if (file.size <= TARGET_BYTES && file.type === 'image/jpeg') return file

  let bitmap: ImageBitmap
  try {
    // from-image : applique l'orientation EXIF (photos téléphone)
    bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' })
  } catch {
    return file
  }

  try {
    const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height))
    const canvas = document.createElement('canvas')
    canvas.width = Math.round(bitmap.width * scale)
    canvas.height = Math.round(bitmap.height * scale)
    const ctx = canvas.getContext('2d')
    if (!ctx) return file
    // Fond blanc : la transparence PNG deviendrait noire en JPEG
    ctx.fillStyle = '#fff'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height)

    let quality = 0.85
    let blob = await canvasToBlob(canvas, quality)
    while (blob && blob.size > TARGET_BYTES && quality > 0.5) {
      quality -= 0.1
      blob = (await canvasToBlob(canvas, quality)) ?? blob
    }
    if (!blob || blob.size >= file.size) return file
    return new File([blob], jpegName(file.name), { type: 'image/jpeg', lastModified: file.lastModified })
  } finally {
    bitmap.close()
  }
}
