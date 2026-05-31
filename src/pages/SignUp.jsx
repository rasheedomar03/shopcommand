import { SignUp as ClerkSignUp } from '@clerk/clerk-react'
import { Link } from 'react-router-dom'
import { useTheme } from '@/contexts/ThemeContext'

function HexMark({ size = 32, bg = '#12131A' }) {
  const pts = (cx, cy, r) =>
    [90, 30, -30, -90, -150, 150]
      .map(deg => {
        const a = (deg * Math.PI) / 180
        return `${(cx + r * Math.cos(a)).toFixed(2)},${(cy - r * Math.sin(a)).toFixed(2)}`
      })
      .join(' ')
  const R = 28, r = R * 0.56
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" role="img" aria-hidden="true">
      <polygon points={pts(32, 32, R)} fill="#F97316" />
      <polygon points={pts(32, 32.5, r)} fill={bg} />
    </svg>
  )
}

export default function SignUpPage() {
  const { theme } = useTheme()
  const hexBg = theme === 'light' ? '#FFFFFF' : '#12131A'

  return (
    <main className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
      <Link to="/" className="flex items-center gap-3 mb-8 hover:opacity-80 transition-opacity">
        <HexMark size={32} bg={hexBg} />
        <span className="text-2xl font-semibold tracking-tight" style={{ letterSpacing: '-0.02em' }}>
          <span className="text-text-primary">Shop</span>
          <span className="text-orange">Command</span>
        </span>
      </Link>

      <ClerkSignUp
        routing="path"
        path="/sign-up"
        signInUrl="/sign-in"
        forceRedirectUrl="/onboarding"
        appearance={{
          elements: {
            rootBox: 'w-full max-w-sm',
            card: 'bg-surface border border-border rounded-xl shadow-xl',
            headerTitle: 'text-text-primary',
            headerSubtitle: 'text-text-muted',
            formFieldLabel: 'text-text-secondary text-xs',
            formFieldInput: 'bg-surface border-border text-text-primary focus:border-orange focus:ring-orange/30',
            formButtonPrimary: 'bg-orange hover:bg-orange/90 text-white',
            footerActionLink: 'text-orange hover:text-orange/80',
            socialButtonsBlockButton: 'border-border text-text-secondary hover:bg-border/40',
            dividerLine: 'bg-border',
            dividerText: 'text-text-muted',
            formFieldErrorText: 'text-red-400',
            identityPreviewEditButton: 'text-orange',
            alert: 'bg-red-500/10 border-red-500/20 text-red-400',
          },
        }}
      />

    </main>
  )
}
