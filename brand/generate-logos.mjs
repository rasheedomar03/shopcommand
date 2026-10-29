import { execSync } from 'child_process'
import { writeFileSync } from 'fs'
import { join } from 'path'

const dir = import.meta.dirname

// ─── Profile picture mark (square, white bg, orange+black hex) ───────────────
function markSvg(size) {
  const pad = Math.round(size * 0.15)
  const hex = size - pad * 2
  const cx = size / 2, cy = size / 2, R = hex / 2
  const r = R * 0.56
  const pts = (cx, cy, radius) =>
    [90, 30, -30, -90, -150, 150]
      .map(deg => {
        const a = (deg * Math.PI) / 180
        return `${(cx + radius * Math.cos(a)).toFixed(1)},${(cy - radius * Math.sin(a)).toFixed(1)}`
      })
      .join(' ')
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" rx="${Math.round(size * 0.08)}" fill="#FFFFFF"/>
  <polygon points="${pts(cx, cy, R)}" fill="#F97316"/>
  <polygon points="${pts(cx, cy + 1, r)}" fill="#0D0E14"/>
</svg>`
}

// ─── Full logo (horizontal, mark + two-tone text) ────────────────────────────
function fullSvg(w, h) {
  const pad = Math.round(h * 0.18)
  const hexH = h - pad * 2
  const cx = pad + hexH / 2, cy = h / 2, R = hexH / 2
  const r = R * 0.56
  const pts = (cx, cy, radius) =>
    [90, 30, -30, -90, -150, 150]
      .map(deg => {
        const a = (deg * Math.PI) / 180
        return `${(cx + radius * Math.cos(a)).toFixed(1)},${(cy - radius * Math.sin(a)).toFixed(1)}`
      })
      .join(' ')
  const textX = cx + R + pad * 0.8
  const fontSize = Math.round(hexH * 0.48)
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  <rect width="${w}" height="${h}" rx="${Math.round(h * 0.06)}" fill="#FFFFFF"/>
  <polygon points="${pts(cx, cy, R)}" fill="#F97316"/>
  <polygon points="${pts(cx, cy + 0.5, r)}" fill="#0D0E14"/>
  <text x="${textX}" y="${cy + fontSize * 0.35}" font-family="Arial, Helvetica, sans-serif" font-size="${fontSize}" font-weight="700" letter-spacing="-0.5"><tspan fill="#1E293B">Shop</tspan><tspan fill="#F97316">Command</tspan></text>
</svg>`
}

// ─── Cover / banner (wide, centered logo + two-tone text) ────────────────────
function coverSvg(w, h) {
  const hexH = Math.round(h * 0.35)
  const cx = w / 2, cy = h / 2 - hexH * 0.15, R = hexH / 2
  const r = R * 0.56
  const pts = (cx, cy, radius) =>
    [90, 30, -30, -90, -150, 150]
      .map(deg => {
        const a = (deg * Math.PI) / 180
        return `${(cx + radius * Math.cos(a)).toFixed(1)},${(cy - radius * Math.sin(a)).toFixed(1)}`
      })
      .join(' ')
  const fontSize = Math.round(hexH * 0.55)
  const textY = cy + R + fontSize * 1.1
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  <rect width="${w}" height="${h}" fill="#FFFFFF"/>
  <polygon points="${pts(cx, cy, R)}" fill="#F97316"/>
  <polygon points="${pts(cx, cy + 0.5, r)}" fill="#0D0E14"/>
  <text x="${cx}" y="${textY}" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="${fontSize}" font-weight="700" letter-spacing="-0.5"><tspan fill="#1E293B">Shop</tspan><tspan fill="#F97316">Command</tspan></text>
</svg>`
}

const assets = [
  // Profile pics
  { name: 'fb-profile-170x170.png',    svg: markSvg(170),  w: 170,  h: 170  },
  { name: 'ig-profile-320x320.png',    svg: markSvg(320),  w: 320,  h: 320  },
  { name: 'profile-512x512.png',       svg: markSvg(512),  w: 512,  h: 512  },

  // Posts (square with full logo)
  { name: 'ig-post-1080x1080.png',     svg: coverSvg(1080, 1080), w: 1080, h: 1080 },

  // Stories
  { name: 'ig-story-1080x1920.png',    svg: coverSvg(1080, 1920), w: 1080, h: 1920 },

  // Covers / banners
  { name: 'fb-cover-820x312.png',      svg: coverSvg(820, 312),   w: 820,  h: 312  },
  { name: 'fb-page-cover-1200x630.png',svg: coverSvg(1200, 630),  w: 1200, h: 630  },
]

for (const { name, svg, w, h } of assets) {
  const svgPath = join(dir, `_tmp_${name}.svg`)
  const pngPath = join(dir, name)
  writeFileSync(svgPath, svg)
  try {
    execSync(`npx --yes sharp-cli -i "${svgPath}" -o "${pngPath}" resize ${w} ${h}`, { stdio: 'pipe' })
    console.log(`✓ ${name}`)
  } catch (e) {
    try {
      execSync(`npx --yes sharp-cli resize ${w} ${h} -i "${svgPath}" -o "${pngPath}"`, { stdio: 'pipe' })
      console.log(`✓ ${name}`)
    } catch {
      console.log(`✗ ${name} — falling back to SVG only`)
    }
  }
}

// Cleanup temp SVGs
console.log('\nDone! Check the brand/ folder.')
