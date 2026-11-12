// Shared Clerk theming: brand orange, the site's 8px radius system, and
// the display face on the card title so auth matches the rest of the site.
export const clerkAppearance = {
  variables: {
    colorPrimary: '#F97316',
    colorText: '#0F172A',
    colorTextSecondary: '#64748B',
    colorBackground: '#FFFFFF',
    colorInputBackground: '#FFFFFF',
    colorInputText: '#0F172A',
    borderRadius: '0.5rem',
    fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
    fontSize: '0.875rem',
  },
  elements: {
    rootBox: 'w-full',
    card: 'shadow-lg shadow-slate-900/[0.08] border border-slate-200/80',
    headerTitle: 'font-display',
    formButtonPrimary: 'font-semibold',
    footerPagesLink: 'hidden',
    footer: 'hidden',
  },
  layout: {
    unsafe_disableDevelopmentModeWarnings: true,
    socialButtonsPlacement: 'top',
  },
}
