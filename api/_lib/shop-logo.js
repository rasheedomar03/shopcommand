// A shop's logo: a small image stored with the shop's other settings (shops.data)
// as a data URL, plus the width it prints at. The browser shrinks the picture
// before sending (src/lib/shopLogo.js); this is the server's own limit so nobody
// can store something huge or something that is not an image.

export const MAX_LOGO_CHARS = 200_000 // roughly 150 KB of image
export const LOGO_WIDTH_MIN = 40
export const LOGO_WIDTH_MAX = 400

// PNG, JPEG or WebP only (no SVG: it can carry scripts)
const LOGO_RE = /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/]+={0,2}$/

/** Error messages for a `logo` and/or `logo_width` in the request body (none = fine). */
export function logoErrors(body) {
  const errors = []
  if (body && 'logo' in body && body.logo !== null) {
    if (typeof body.logo !== 'string' || body.logo.length > MAX_LOGO_CHARS || !LOGO_RE.test(body.logo)) {
      errors.push('Logo must be a PNG, JPEG or WebP image under about 150 KB')
    }
  }
  if (body && 'logo_width' in body && body.logo_width != null) {
    const w = Number(body.logo_width)
    if (!Number.isFinite(w) || w < LOGO_WIDTH_MIN || w > LOGO_WIDTH_MAX) {
      errors.push(`Logo size must be between ${LOGO_WIDTH_MIN} and ${LOGO_WIDTH_MAX}`)
    }
  }
  return errors
}

/** The keys to merge into shops.data. `logo: null` removes the logo. */
export function logoPatch(body) {
  const patch = {}
  if (body && 'logo' in body) patch.logo = body.logo === null ? null : String(body.logo)
  if (body && 'logo_width' in body && body.logo_width != null) patch.logo_width = Math.round(Number(body.logo_width))
  return patch
}
