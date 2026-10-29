---
name: ShopCommand
description: Auto repair shop management software for independent shop owners.
colors:
  brand-orange: "#F97316"
  brand-orange-hover: "#EA6A0A"
  surface-warm: "#FAFAF8"
  surface-section: "#F0EDEA"
  ink-primary: "#0F172A"
  ink-secondary: "#475569"
  ink-muted: "#94A3B8"
  ink-disabled: "#CBD5E1"
  border-light: "#E2E8F0"
  border-subtle: "#F1F5F9"
  app-bg: "#0A0A0F"
  app-surface: "#12131A"
  app-border: "#1E2028"
  status-green: "#22C55E"
  status-yellow: "#EAB308"
  status-red: "#EF4444"
  status-blue: "#3B82F6"
  status-purple: "#A855F7"
typography:
  display:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "clamp(2rem, 5vw, 3rem)"
    fontWeight: 800
    lineHeight: 1.1
    letterSpacing: "-0.03em"
  headline:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "clamp(1.5rem, 3vw, 2.25rem)"
    fontWeight: 700
    lineHeight: 1.15
    letterSpacing: "-0.02em"
  title:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "1.125rem"
    fontWeight: 600
    lineHeight: 1.3
  body:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.6
  label:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 500
    lineHeight: 1.4
    letterSpacing: "0.02em"
rounded:
  sm: "8px"
  md: "12px"
  lg: "16px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "24px"
  xl: "32px"
  section: "96px"
components:
  button-primary:
    backgroundColor: "{colors.brand-orange}"
    textColor: "#FFFFFF"
    rounded: "{rounded.md}"
    padding: "12px 24px"
  button-primary-hover:
    backgroundColor: "{colors.brand-orange-hover}"
    textColor: "#FFFFFF"
  button-secondary:
    backgroundColor: "transparent"
    textColor: "{colors.ink-secondary}"
    rounded: "{rounded.md}"
    padding: "12px 24px"
  input-default:
    backgroundColor: "{colors.border-subtle}"
    textColor: "{colors.ink-primary}"
    rounded: "{rounded.md}"
    padding: "0 16px"
    height: "44px"
---

# Design System: ShopCommand

## 1. Overview

**Creative North Star: "The Shop Floor"**

Clean concrete, fluorescent lighting, tools where they belong. Everything visible, nothing hidden. The design equivalent of a well-organized bay where every wrench has a spot and every job has a status.

ShopCommand's visual system is built for people who work with their hands and manage with their eyes. The interface is direct: information sits where you expect it, controls do what they look like they do, and nothing exists for decoration. This is a tool that respects the operator's time and intelligence.

The system explicitly rejects three things: the generic SaaS template aesthetic (identical card grids, warm-cream-serif trending pages, three-step numbered circles), the dated auto industry software look (cluttered, dense, Windows-XP-era), and overdesigned startup aesthetics (glassmorphism, gratuitous gradients, design-award-chasing). If someone could look at this interface and say "AI made that" or "this is a Framer template," it has failed.

**Key Characteristics:**
- Information-dense without feeling cluttered
- Orange used deliberately, not everywhere
- Sans-serif throughout; no decorative serif headings
- Dark dashboard (the product), warm light landing (the front door)
- Smooth, responsive interactions; never flashy or slow

## 2. Colors

The palette is warm-neutral with one deliberate accent. Orange earns its presence through restraint.

### Primary
- **Shop Orange** (#F97316): CTAs, active states, data highlights. The only saturated color on the landing page. In the dashboard, it marks the primary action and live data.

### Neutral
- **Warm Paper** (#FAFAF8): Landing page background. Not white, not cream. A barely-warm neutral that avoids the trending SaaS-cream look.
- **Section Stone** (#F0EDEA): Alternating section backgrounds on the landing page. No dot grid overlay, no radial gradient texture.
- **Ink** (#0F172A): Primary text on light surfaces. Warm-tinted near-black.
- **Ink Secondary** (#475569): Supporting text, descriptions, metadata.
- **Ink Muted** (#94A3B8): Tertiary text, placeholders, disabled labels.
- **Border Light** (#E2E8F0): Dividers, card borders, input strokes.

### Dashboard (dark theme)
- **App Background** (#0A0A0F): Main canvas. Near-black with a slight blue tint.
- **App Surface** (#12131A): Cards, panels, elevated surfaces.
- **App Border** (#1E2028): Dividers and container edges in dark mode.

### Status
- **Clear** (#22C55E): Complete, paid, success states.
- **Caution** (#EAB308): Waiting, pending, attention needed.
- **Alert** (#EF4444): Errors, overdue, destructive actions.
- **Info** (#3B82F6): Informational, in-progress, neutral highlights.

### Named Rules
**The Restraint Rule.** Orange appears on no more than 10% of any screen. Its rarity is what makes it effective. When everything is orange, nothing is.

**The No Pure Black/White Rule.** Neither `#000` nor `#fff` appear anywhere. Every extreme is warm-tinted. `#0F172A` for ink, `#FAFAF8` for paper.

## 3. Typography

**Display Font:** Inter (with system-ui, sans-serif fallback)
**Body Font:** Inter (same stack)
**Monospace:** JetBrains Mono (for tabular data, code)

**Character:** One typeface family, no decorative display font. Inter carries everything from hero headlines to form labels. Hierarchy is created through weight and size contrast, not font switching. This is a tool's typography: readable, scannable, invisible until you need it.

### Hierarchy
- **Display** (800, clamp(2rem, 5vw, 3rem), 1.1): Landing page hero headline. Tight tracking (-0.03em). Used once per page, maximum.
- **Headline** (700, clamp(1.5rem, 3vw, 2.25rem), 1.15): Section headings. Tight tracking (-0.02em).
- **Title** (600, 1.125rem, 1.3): Card headers, feature titles, modal headers.
- **Body** (400, 0.875rem, 1.6): All running text. Max line length 65ch on desktop.
- **Label** (500, 0.75rem, 1.4): Form labels, badges, metadata. Slight tracking (0.02em). Uppercase only for section eyebrow labels.

### Named Rules
**The One Family Rule.** No serif display fonts. No decorative type pairings. Inter handles everything. Hierarchy through scale and weight, never through font switching.

**The Tabular Rule.** All numerical data uses `font-variant-numeric: tabular-nums`. Revenue, RO counts, tech stats: columns align.

## 4. Elevation

The landing page is flat by default. Depth is conveyed through background tint changes (warm paper to section stone), not shadows. The dashboard uses subtle surface elevation (background color steps from app-bg to app-surface) rather than box-shadow.

### Shadow Vocabulary
- **Card shadow** (`0 1px 3px rgba(15,23,42,0.04), 0 4px 12px rgba(15,23,42,0.03)`): Landing page form containers and pricing cards only. Barely visible. Never on content cards.
- **Dropdown shadow** (`0 4px 24px rgba(15,23,42,0.08)`): Compare dropdown, mobile menu overlay. Functional, not decorative.

### Named Rules
**The Flat-By-Default Rule.** Surfaces are flat at rest. Shadows appear only on floating elements (dropdowns, modals, the signup form container). If you're tempted to add a shadow, the element is probably not floating.

## 5. Components

### Buttons
- **Shape:** Generously curved (12px radius)
- **Primary:** Shop Orange background, white text, 12px 24px padding. Semi-bold (600).
- **Hover:** Darkened orange (#EA6A0A), 150ms ease-out transition.
- **Focus:** 2px orange outline, 2px offset. Always visible.
- **Secondary:** Transparent background, slate border, slate text. Border darkens on hover.
- **Ghost:** No border, no background. Text color shift on hover only.

### Inputs / Fields
- **Style:** Slate-50 background fill, 1px slate-200 border, 12px radius. 44px height minimum (touch-friendly for shop hands).
- **Focus:** Border shifts to orange, 2px orange ring at 20% opacity. No background change.
- **Error:** Red-600 text below the field, border shifts to red.
- **Labels:** Always visible above the field. 12px, medium weight, uppercase tracking. Never placeholder-only.

### Cards / Containers
- **Corner Style:** 16px radius on landing page, 12px in the dashboard.
- **Background:** White on landing (light sections), app-surface in dashboard.
- **Border:** 1px border-light. No shadow unless the card is a floating element.
- **Internal Padding:** 28px on landing, 16-20px in dashboard.

### Navigation
- **Landing navbar:** Sticky, backdrop-blur, 64px height. Logo left, links center, CTA right. Links are 14px, medium weight, slate-500 default, slate-900 hover. Orange CTA button at right edge.
- **Dashboard sidebar:** Dark theme, fixed. Active item marked with orange text and subtle orange background tint. No colored left-border stripe.

### Dashboard Preview (signature component)
The live dashboard preview on the landing page is the strongest conversion element. Dark-themed to match the actual product, embedded in the light landing page. Animated revenue counters on scroll entry. This component should always look like a real product screenshot, not a marketing illustration.

## 6. Do's and Don'ts

### Do:
- **Do** use Inter for all text. Hierarchy through weight (400/500/600/700/800) and size, never font family.
- **Do** keep orange to CTAs, active states, and data highlights. Count the orange elements per screen; fewer is better.
- **Do** use flat backgrounds with tint shifts for section rhythm. Warm paper (#FAFAF8) and section stone (#F0EDEA) alternate.
- **Do** make every interactive element 44px minimum touch target. Shop owners have big hands.
- **Do** show the actual product. Dashboard screenshots and live previews beat marketing illustrations.
- **Do** vary section layouts. Not every section needs a centered heading, centered subheading, then a grid of cards.

### Don't:
- **Don't** use Gambetta, General Sans, Bricolage Grotesque, or any serif/display font. These are the trending vibecoded font pairings of 2025-2026.
- **Don't** use dot-grid backgrounds (`radial-gradient` dot patterns). This is the current AI-generated landing page tell.
- **Don't** use three identical cards in a row with icon + heading + bullet points. Find a different layout for grouped information.
- **Don't** use numbered step circles (01, 02, 03) with connecting gradient lines. This is the single most common vibecoded pattern.
- **Don't** use pill badges with colored dots unless they convey real status information. Decorative pills are a template tell.
- **Don't** animate every section on scroll. Animate the hero and the dashboard preview. Everything else should be present when scrolled to.
- **Don't** use glassmorphism, gradient text, or `border-left` accent stripes.
- **Don't** use `#000` or `#fff` anywhere. Tint all extremes warm.
- **Don't** use em dashes in copy. Use commas, colons, semicolons, or periods.
- **Don't** make the landing page feel like a separate marketing site. It should feel like the front door to the tool.
