// The logo shown at the top of printed invoices. The owner picks a picture and a
// size; the picture is shrunk in the browser first so what is stored is small.

export const LOGO_MAX_W = 400 // pixels kept when stored (plenty for print)
export const LOGO_MAX_H = 200
export const LOGO_SIZE_MIN = 40 // width on paper, in pixels, set with the slider
export const LOGO_SIZE_MAX = 300
export const LOGO_SIZE_DEFAULT = 120
export const LOGO_MAX_CHARS = 190_000 // a little under the server's limit
export const LOGO_TYPES = ['image/png', 'image/jpeg', 'image/webp']

/** The size to shrink a picture to: fits inside max w by max h, never enlarged. */
export function fitLogo(width, height, maxW = LOGO_MAX_W, maxH = LOGO_MAX_H) {
  const w = Number(width), h = Number(height)
  if (!(w > 0) || !(h > 0)) return { width: 0, height: 0 }
  const scale = Math.min(1, maxW / w, maxH / h)
  return { width: Math.max(1, Math.round(w * scale)), height: Math.max(1, Math.round(h * scale)) }
}

/** Keep the slider value inside its range; anything else becomes the default. */
export function clampLogoSize(value) {
  const n = Number(value)
  if (!Number.isFinite(n)) return LOGO_SIZE_DEFAULT
  return Math.min(LOGO_SIZE_MAX, Math.max(LOGO_SIZE_MIN, Math.round(n)))
}

/** A usable logo from the shop's stored settings, or null. */
export function logoOf(shop) {
  const src = shop?.logo
  return typeof src === 'string' && src.startsWith('data:image/') ? { src, width: clampLogoSize(shop?.logoWidth || LOGO_SIZE_DEFAULT) } : null
}

/**
 * Read a picture file and return a small data URL, or { error }. PNG keeps
 * transparency; other pictures become JPEG. It is re-encoded smaller if needed.
 */
export async function logoFromFile(file) {
  if (!file) return { error: 'Choose a picture first.' }
  if (!LOGO_TYPES.includes(file.type)) return { error: 'Use a PNG, JPEG or WebP picture.' }
  if (file.size > 8 * 1024 * 1024) return { error: 'That picture is too large. Use one under 8 MB.' }
  let bitmap
  try { bitmap = await createImageBitmap(file) } catch { return { error: 'That picture could not be read.' } }
  const keepAlpha = file.type === 'image/png' || file.type === 'image/webp'
  let { width, height } = fitLogo(bitmap.width, bitmap.height)
  for (let attempt = 0; attempt < 4; attempt++) {
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d')
    if (!keepAlpha) { ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, width, height) }
    ctx.drawImage(bitmap, 0, 0, width, height)
    const url = keepAlpha ? canvas.toDataURL('image/png') : canvas.toDataURL('image/jpeg', 0.85)
    if (url.length <= LOGO_MAX_CHARS) return { src: url }
    width = Math.max(1, Math.round(width * 0.75)) // too big: shrink and try again
    height = Math.max(1, Math.round(height * 0.75))
  }
  return { error: 'That picture is still too large after shrinking. Try a simpler or smaller one.' }
}
