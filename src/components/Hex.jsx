// Brand hexagon family. Flat-top hex matching the logo nut; used as step
// markers, icon chips, list dots, and panel texture across marketing pages.

const HEX = '16,2 28.1,9 28.1,23 16,30 3.9,23 3.9,9' // viewBox 0 0 32 32

/** Numbered step marker: orange hex outline with the number inside. */
export function HexNum({ n, size = 30, className = '' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" className={className} aria-hidden="true">
      <polygon points={HEX} fill="none" stroke="#F97316" strokeWidth="2" />
      <text x="16" y="21" textAnchor="middle" fontSize="13" fontWeight="700" fill="#0f172a">{n}</text>
    </svg>
  )
}

/** Icon chip: soft orange hex behind a lucide icon. Pass the icon as children. */
export function HexChip({ size = 44, className = '', children }) {
  return (
    <div className={`relative inline-flex items-center justify-center ${className}`} style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox="0 0 32 32" className="absolute inset-0" aria-hidden="true">
        <polygon points={HEX} fill="#FFF7ED" stroke="#FED7AA" strokeWidth="1.5" />
      </svg>
      <span className="relative flex items-center justify-center">{children}</span>
    </div>
  )
}

/** Tiny filled hex, used as a list bullet. */
export function HexDot({ size = 9, color = '#F97316', className = '' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" className={`flex-shrink-0 ${className}`} aria-hidden="true">
      <polygon points={HEX} fill={color} />
    </svg>
  )
}

/** Subtle repeating hex outline texture for dark brand panels. */
export function HexPattern({ className = '', stroke = '#F97316' }) {
  return (
    <svg className={className} width="100%" height="100%" aria-hidden="true">
      <defs>
        <pattern id="sc-hex-grid" width="52" height="46" patternUnits="userSpaceOnUse">
          <polygon points="26,4 44,14.5 44,33.5 26,44 8,33.5 8,14.5" fill="none" stroke={stroke} strokeWidth="1.2" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#sc-hex-grid)" />
    </svg>
  )
}
