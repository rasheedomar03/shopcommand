/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        // Dark-first hardcoded tokens — light mode overrides live in index.css
        background: '#0A0A0F',
        surface: '#12131A',
        border: '#1E2028',
        'border-hover': '#2A2D3A',
        orange: {
          DEFAULT: '#F97316',
          hover: '#EA6A0A',
          subtle: 'rgba(249,115,22,0.12)',
          muted: 'rgba(249,115,22,0.08)',
        },
        blue: {
          DEFAULT: '#3B82F6',
          hover: '#2563EB',
          subtle: 'rgba(59,130,246,0.12)',
        },
        text: {
          primary: '#F1F5F9',
          secondary: '#94A3B8',
          muted: '#64748B',
          disabled: '#475569',
        },
        status: {
          green: '#22C55E',
          'green-subtle': 'rgba(34,197,94,0.12)',
          yellow: '#EAB308',
          'yellow-subtle': 'rgba(234,179,8,0.12)',
          red: '#EF4444',
          'red-subtle': 'rgba(239,68,68,0.12)',
          blue: '#3B82F6',
          'blue-subtle': 'rgba(59,130,246,0.12)',
          purple: '#A855F7',
          'purple-subtle': 'rgba(168,85,247,0.12)',
          orange: '#F97316',
          'orange-subtle': 'rgba(249,115,22,0.12)',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      fontSize: {
        '2xs': ['0.625rem', { lineHeight: '1rem' }],
      },
      animation: {
        'skeleton-pulse': 'skeleton-pulse 1.5s ease-in-out infinite',
        'fade-in': 'fade-in 200ms ease-out',
        'fade-out': 'fade-out 150ms ease-in',
        'slide-in': 'slide-in 250ms cubic-bezier(0.16, 1, 0.3, 1)',
        'fade-up': 'fade-up 0.7s cubic-bezier(0.16, 1, 0.3, 1) both',
        'glow-pulse': 'glow-pulse 4s ease-in-out infinite',
        'float': 'float 6s ease-in-out infinite',
      },
      keyframes: {
        'skeleton-pulse': {
          '0%, 100%': { opacity: '0.4' },
          '50%': { opacity: '0.7' },
        },
        'fade-in': {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        'fade-out': {
          from: { opacity: '1' },
          to: { opacity: '0' },
        },
        'slide-in': {
          from: { opacity: '0', transform: 'translateY(8px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'fade-up': {
          from: { opacity: '0', transform: 'translateY(28px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'glow-pulse': {
          '0%, 100%': { opacity: '0.6' },
          '50%': { opacity: '1' },
        },
        'float': {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-10px)' },
        },
      },
      transitionTimingFunction: {
        'out-quart': 'cubic-bezier(0.25, 1, 0.5, 1)',
        'out-expo': 'cubic-bezier(0.16, 1, 0.3, 1)',
      },
    },
  },
  plugins: [],
}
