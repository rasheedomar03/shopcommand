import { SignIn as ClerkSignIn, useUser } from '@clerk/clerk-react'
import { Link, Navigate } from 'react-router-dom'
import { HexDot, HexPattern } from '@/components/Hex'
import { clerkAppearance } from '@/lib/clerkAppearance'

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
    <main className="min-h-screen grid lg:grid-cols-[1.05fr_1fr]">
      {/* Brand panel */}
      <aside className="hidden lg:flex relative flex-col justify-between overflow-hidden p-10 xl:p-14" style={{ backgroundColor: '#0D0E14' }}>
        <HexPattern className="absolute inset-0 opacity-[0.06]" stroke="#F97316" />
        <Link to="/" className="relative flex items-center gap-2.5 hover:opacity-80 transition-opacity w-fit">
          <HexMark size={30} />
          <span className="text-xl font-semibold tracking-tight" style={{ letterSpacing: '-0.02em' }}>
            <span className="text-white">Shop</span>
            <span className="text-orange-500">Command</span>
          </span>
        </Link>

        <div className="relative max-w-sm">
          <h1 className="font-display text-3xl xl:text-4xl font-bold text-white mb-4" style={{ letterSpacing: '-0.01em' }}>
            Every shop.
            <br />
            One screen.
          </h1>
          <p className="text-slate-400 text-sm leading-relaxed mb-8">
            Repair orders, technician hours, parts, and revenue across all your locations, live.
          </p>
          <ul className="space-y-3">
            {[
              'Open ROs and revenue by location',
              'Who is clocked in, right now',
              'Parts running low before they run out',
            ].map(item => (
              <li key={item} className="flex items-center gap-2.5 text-slate-300 text-sm">
                <HexDot size={9} />
                {item}
              </li>
            ))}
          </ul>
        </div>

        <p className="relative text-xs text-slate-500">Built in Houston, TX</p>
      </aside>

      {/* Form side */}
      <div className="flex flex-col items-center justify-center px-4 py-10 bg-[#FAFAF8]">
        <Link to="/" className="lg:hidden flex items-center gap-2.5 mb-8 hover:opacity-80 transition-opacity">
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
      </div>
    </main>
  )
}
