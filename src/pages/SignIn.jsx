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

export default function SignInPage() {
  const { user, isSignedIn } = useUser()

  if (isSignedIn && user?.unsafeMetadata?.onboarded) {
    return <Navigate to="/dashboard" replace />
  }

  return (
    <main className="min-h-screen bg-[#FAFAF8] flex flex-col items-center justify-center px-4 py-8">
      <Link to="/" className="flex items-center gap-2.5 mb-8 hover:opacity-80 transition-opacity">
        <HexMark size={30} />
        <span className="text-xl font-semibold tracking-tight" style={{ letterSpacing: '-0.02em' }}>
          <span className="text-slate-900">Shop</span>
          <span className="text-orange-500">Command</span>
        </span>
      </Link>

      <ClerkSignIn
        routing="path"
        path="/sign-in"
        signUpUrl="/sign-up"
        forceRedirectUrl="/onboarding"
        appearance={{
          elements: {
            rootBox: 'w-full max-w-[380px] mx-auto',
            card: 'bg-white border border-slate-200/80 rounded-2xl shadow-xl shadow-slate-900/[0.06] p-0',
            cardBox: 'shadow-none',
            headerTitle: 'text-slate-900 text-lg font-semibold',
            headerSubtitle: 'text-slate-500 text-sm',
            formFieldLabel: 'text-slate-600 text-xs font-medium',
            formFieldInput: 'bg-white border-slate-200 text-slate-900 rounded-lg h-10 text-sm focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 placeholder:text-slate-400',
            formButtonPrimary: 'bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-lg h-10 text-sm transition-colors shadow-none',
            footerActionLink: 'text-orange-500 hover:text-orange-600 font-medium',
            footerActionText: 'text-slate-500 text-sm',
            socialButtonsBlockButton: 'border-slate-200 text-slate-700 hover:bg-slate-50 rounded-lg h-10 text-sm font-medium transition-colors',
            socialButtonsBlockButtonText: 'text-slate-700 font-medium',
            dividerLine: 'bg-slate-200',
            dividerText: 'text-slate-400 text-xs',
            formFieldErrorText: 'text-red-500 text-xs',
            identityPreviewEditButton: 'text-orange-500',
            identityPreviewText: 'text-slate-700',
            alert: 'bg-red-50 border border-red-200 text-red-600 rounded-lg',
            alertText: 'text-red-600 text-sm',
            footerPagesLink: 'hidden',
            footer: 'bg-transparent',
            main: 'gap-6',
          },
          layout: { unsafe_disableDevelopmentModeWarnings: true },
        }}
      />

      <p className="mt-6 text-xs text-slate-400">
        Don't have an account?{' '}
        <Link to="/sign-up" className="text-orange-500 hover:text-orange-600 font-medium">Sign up</Link>
      </p>
    </main>
  )
}
