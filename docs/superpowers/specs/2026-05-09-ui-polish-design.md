# ShopCommand UI Polish — Design Spec
**Date:** 2026-05-09
**Surfaces:** Landing page (`/`) · Dashboard app shell (`/dashboard`)
**Approach:** Surface-first — landing page fully fixed, then dashboard

---

## Context

ShopCommand is a multi-location auto repair shop management SaaS. The UI was built without running it through `impeccable` or `ui-ux-pro-max`. A full critique identified violations across both surfaces that need to be resolved before any new features are added.

---

## Issues Identified

### Landing Page
| # | Issue | Rule violated |
|---|-------|---------------|
| 1 | Hero section uses big-number stat cards | `impeccable` — hero-metric template ban |
| 2 | Features section is three identical icon+title+text cards | `impeccable` — identical card grid ban |
| 3 | Emojis used as structural icons (🏪 🔧 👥) | `ui-ux-pro-max` — no emoji as icons |
| 4 | `text-white/50` body copy fails 4.5:1 contrast ratio | `ui-ux-pro-max` — color-accessible-pairs |
| 5 | No `line-height` set on body copy (browser default ~1.2) | `ui-ux-pro-max` — line-height 1.5 minimum |
| 6 | All animations missing `prefers-reduced-motion` support | `ui-ux-pro-max` — reduced-motion critical |
| 7 | Data preview labels at 9px in mockup | `ui-ux-pro-max` — 12px minimum floor |

### Dashboard
| # | Issue | Rule violated |
|---|-------|---------------|
| 8 | Sidebar close button is 28px — below touch target minimum | `ui-ux-pro-max` — 44px touch target |
| 9 | Icon-only buttons have no aria-labels | `ui-ux-pro-max` — aria-labels critical |
| 10 | NavLink active state uses color alone | `ui-ux-pro-max` — color-not-only |
| 11 | Sidebar section labels at `text-2xs` (10px) | `ui-ux-pro-max` — 12px minimum floor |

---

## Design Decisions

### Landing Page — Hero Section
**Decision:** Replace the 4-stat card grid with a multi-shop comparison table.

The table shows all locations side by side (shop name, revenue, open ROs, active techs) with a total at the bottom. This directly demonstrates ShopCommand's primary value proposition — seeing all your locations in one place — which is the problem shop owners currently solve with spreadsheets and Friday drives. A "↑ Best day this month" callout on the best-performing location adds the insight layer.

Rationale: Passes `impeccable` AI slop test (not the default SaaS hero template), reinforces the multi-location value prop more directly than a product screenshot or activity feed, immediately recognizable to the target user.

### Landing Page — Features Section
**Decision:** Replace identical card grid with horizontal feature rows (Option A).

Each feature gets a full-width row with the feature icon (Lucide SVG), title, and description on the left, and a small live data preview on the right. Proof points:
- Multi-Shop Command Center → `$375K MTD`
- Repair Order Tracking → `73 open ROs`
- Team Management → `34 active techs`

Each row is visually distinct because the data differs. No card borders — rows are separated by a subtle `border-bottom`. This replaces both the identical card grid AND the emoji icons in one change.

### Landing Page — Accessibility & Polish
- **Contrast:** `text-white/50` → `text-white/65` minimum on all muted body text
- **Line-height:** `leading-relaxed` (1.625) added to all paragraph elements
- **Reduced motion:** All Tailwind `animate-*` classes wrapped in `@media (prefers-reduced-motion: no-preference)` in `index.css`. Elements default to their final visible state; motion is an enhancement.
- **Data preview labels:** Minimum `text-xs` (12px) in production implementation

### Dashboard — Touch & Accessibility
- **Close button:** Change from `w-7 h-7` to `w-11 h-11` (44px) with `flex items-center justify-center` — the icon stays `size={15}` visually, the button element itself becomes the full touch target
- **Aria-labels:** `aria-label="Close menu"` on sidebar close, `aria-label="Toggle theme"` on header theme button
- **Active state indicator:** 2px solid orange left border on active `NavLink` items, alongside existing orange text color. Two distinct signals for colorblind users.
- **Sidebar labels:** `text-2xs` → `text-xs` (12px) on "OVERVIEW" and "OPERATIONS" section labels

---

## Files to Change

### Phase 1 — Landing Page
- `src/pages/Landing.jsx` — hero section, features section, line-height, contrast classes
- `src/index.css` — `prefers-reduced-motion` media query wrapping all animate-* keyframes

### Phase 2 — Dashboard
- `src/components/layout/Sidebar.jsx` — close button touch target, aria-label, active indicator, section label font size

---

## Out of Scope
- No new features
- No changes to routing, data, or mock data
- No changes to dark/light mode logic
- No changes to pages other than Landing.jsx

---

## Success Criteria
- Zero `impeccable` absolute ban violations on both surfaces
- All body text meets 4.5:1 contrast ratio
- All interactive elements meet 44px touch target
- All icon-only buttons have aria-labels
- Active nav state communicates via two signals (color + border)
- Site is fully usable with `prefers-reduced-motion: reduce` enabled
- No emojis used as structural UI icons
