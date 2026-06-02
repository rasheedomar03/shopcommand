import { SignIn as ClerkSignIn, useUser } from '@clerk/clerk-react'
import { Link, Navigate } from 'react-router-dom'

function HexMark({ size = 32 }) {
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
      <polygon points={pts(32, 32.5, r)} fill="#0D0E14" />
    </svg>
  )
}

const clerkAppearance = {
  variables: {
    colorPrimary: '#F97316',
    colorText: '#0F172A',
    colorTextSecondary: '#64748B',
    colorBackground: '#FFFFFF',
    colorInputBackground: '#FFFFFF',
    colorInputText: '#0F172A',
    borderRadius: '0.75rem',
    fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
    fontSize: '0.875rem',
  },
  elements: {
    rootBox: 'w-full',
    card: 'shadow-lg shadow-slate-900/[0.08] border border-slate-200/80',
    footerPagesLink: 'hidden',
    footer: 'hidden',
  },
  layout: {
    unsafe_disableDevelopmentModeWarnings: true,
    socialButtonsPlacement: 'top',
  },
}

export default function SignInPage() {
  const { user, isSignedIn } = useUser()

  if (isSignedIn && user?.unsafeMetadata?.onboarded) {
    return <Navigate to="/dashboard" replace />
  }

  return (
    <main className="min-h-screen bg-[#FAFAF8] flex flex-col items-center justify-center px-4 py-8">
      <Link to="/" className="flex items-center gap-2.5 mb-8 hover:opacity-80 transition-opacity">
        <HexMark size={28} />
        <span className="text-xl font-semibold tracking-tight" style={{ letterSpacing: '-0.02em' }}>
          <span className="text-slate-900">Shop</span>
          <span className="text-orange-500">Command</span>
        </span>
      </Link>

      <div className="w-full max-w-sm mx-auto">
        <ClerkSignIn
          routing="path"
          path="/sign-in"
          signUpUrl="/sign-up"
          forceRedirectUrl="/onboarding"
          appearance={clerkAppearance}
        />
      </div>

      <p className="mt-6 text-xs text-slate-400">
        Don't have an account?{' '}
        <Link to="/sign-up" className="text-orange-500 hover:text-orange-600 font-medium">Sign up</Link>
      </p>
    </main>
  )
}
