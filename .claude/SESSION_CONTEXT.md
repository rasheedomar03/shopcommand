# ShopCommand Session Context

Last updated: June 9, 2026

## Project Overview

ShopCommand is an auto repair shop management SaaS for independent shop owners running 1-10 locations. Built by Rasheed Omar in Houston, TX.

- **Stack**: React 18 + Vite 6.4, Tailwind CSS, Clerk auth, Neon PostgreSQL, Vercel serverless functions, Stripe billing
- **Repo**: C:\Users\rashe\shopcommand (GitHub: rasheedomar03/shopcommand)
- **Live**: shopcommand.net
- **Clerk**: Development instance (production switch deferred)
- **Vercel**: Hobby plan (12 serverless function limit) — no upgrade needed for current fixes

## Pricing Model (Current)

- Founding: $100/mo first shop + $50/mo each additional shop (25 spots, locked forever)
- Standard (after launch): $175/mo first shop + $100/mo each additional shop
- No per-seat fees, unlimited users at every tier
- 14-day free trial

## First Real Customer Feedback (Andre — Service Advisor)

Andre reported several issues that were fixed in this session:
- Advisor couldn't change part status (ordered → in transit, etc.) — backend actually allowed it, issue was silent API errors with no feedback
- Clicking "ordered" didn't switch to Parts Orders tab
- SKU field needed to be SKU/VIN and optional
- Needed Return and Credited status options
- "Ready" status was unnecessary — Arrived should be the final state
- Inventory qty should auto-adjust when parts arrive or get returned

## Parts Status Flow (Current)

```
Requested → Ordered → In Transit → Arrived ✓
                                  ↘ Returned (purple) → Credited (teal)
```

- 6 statuses: requested, ordered, shipped (In Transit), arrived, returned, credited
- Active orders = everything except arrived, returned, credited
- Arrived = green dot + checkmark (was yellow before)
- Inventory auto-adjustment: Arrived = +qty, Returned = -qty, Credited = no change
- Reversal handling: undo arrived = -qty, undo returned = +qty

## What Was Built/Fixed (June 9)

### Parts Inventory Overhaul
- **Removed "Ready" status** — Arrived is now the terminal positive state with green styling
- **Added "Returned" (purple) and "Credited" (teal)** statuses to Parts.jsx and RODetailModal.jsx
- **Inventory auto-adjustment** — `adjustInventory()` in Parts.jsx handles qty changes on status transitions, matching parts by SKU/partNumber or name within the same shop
- **advanceOrder() error handling** — Now async with try/catch, shows red dismissible error banner on API failure
- **saveTracking() error handling** — Same pattern
- **Auto-tab switch** — Clicking "ordered" auto-switches to the Parts Orders tab
- **SKU → SKU/VIN** — Label renamed, validation removed (now optional), table header updated
- **SKU/VIN field styling fix** — The `field()` helper spreads `{...props}` after className, so passing `className: 'font-mono'` replaced all input styling. Removed the override.
- **RODetailModal.jsx** — Matching status updates: removed "✓ Got it — mark ready" button, updated PART_STATUS_CFG/PART_STATUS_DOTS, advancePartStatus() now calls usePart/restockPart for inventory

### localStorage → API Fixes (Done)
- **usePart()** in DataContext.jsx — Now calls `api('/api/health?action=update-part', ...)` for real users
- **restockPart()** in DataContext.jsx — Same pattern as usePart
- Both check `!session?.demo` before API call

### Dashboard
- Active orders filter changed from `o.status !== 'ready'` to `!['arrived', 'returned', 'credited'].includes(o.status)`

## What Was Built/Fixed (June 6 — Previous Session)

### Security Fixes
- **Cross-account data bleed**: Added explicit `WHERE org_id = ${user.orgId}` to all 41 API queries across 8 files. RLS via set_config doesn't work with Neon's serverless HTTP driver (each query is a separate connection). Commit 64c6ad8.
- **Onboarding role protection**: Techs/advisors can't accidentally create their own org by clicking "owner". Commit 4c292b8.
- **Onboarding check endpoint**: Separated GET /api/onboard?action=check (read-only) from POST. Commit ca06a50.

### Bug Fixes
- **Create RO modal**: Auto-creates customer and vehicle records before creating RO. Commit cc115d1.
- **Cross-account state**: DataContext wipes all state when clerkId changes. Commit 67c4cc7.
- **TechBoard, Messages, Inspection buttons**: Various missing onClick handlers. Commit 1c393c6.
- **RO stage change errors**: try/catch with error banner. Commit 52c4e8e.
- **Settings checkout**: Loading state. Commit b5a460d.
- **Demo mode updateRepairOrder**: Skips API in demo. Commit fdc51a5.

### Features Added
- **Bug report button**: In-app form → Neon + Discord webhook. Merged into health.js. 
- **Parts order tracking**: Age indicators, dashboard summary, overdue alerts.
- **RO data persistence**: JSONB `data` column on repair_orders. Migration 006.
- **Demo mock data**: Sample partsRequests for demo mode.

### SEO & Marketing
- Comparison page FAQs + schema for all 5 competitors
- Pricing update to tiered model across 12+ files
- Text wrapping CSS fix

## Facebook Marketing

### Groups Joined (17 total)
- Auto Body Shop Owners Group (15K members) — posted Day 3 story, deleted (wrong audience for mechanic shops)
- Auto Repair Shop Owners (673) — commented on tech productivity post, target for next post
- Auto Repair Shops USA (3.4K) — mostly buy/sell, low discussion value
- MECHANICS ONLY — memes/trivia, not owners
- Automobile Mechanics USA — techs not owners
- Mobile Mechanics — commented Day 2
- Mechanics of San Antonio — consumer/ad group, not useful
- + several others (Mobile Mechanics Killeen, Mechanics, etc.)

### Pending Groups (3)
- Shop Hackers - Auto Repair (6.1K) — best target if approved
- Starting An Auto Repair Shop / ASOG (5.9K) — best target if approved
- Auto Repair Shop Owners Mastermind (2K)

### Comments Posted (Days 1-3)
- Day 1: Rafael Mendoza (Fred Loya insurance), Brandon Anderson (State Farm communication log), Eduardo Pliego (total loss)
- Day 2: Mikey Otte (AC condenser Transit Connect), Jason Grubb (insurance appraisers), Rafael Mendoza (Fred Loya lawyer)
- Day 3: Anonymous tech productivity post (Auto Repair Shop Owners group)

### Key Lesson
- Auto Body Shop Owners Group = body shops (collision/paint), NOT mechanic shops
- ShopCommand is for mechanic shop owners, not body shops
- Only 2 groups worth marketing in: Auto Repair Shop Owners (673) and pending groups
- Need more mechanic-owner-focused groups

## Reddit Marketing

### r/SideProject Post
- Title: "I got tired of calling my shop managers every day so I built my own dashboard"
- 176+ views, 4+ comments
- Replied to Technical-Branch9178 (aggressive critic) — came off grounded
- Replied to Life-District8367 (enterprise feedback) — owned text wrapping bug, explained positioning

### Life-District8367 DM (Important Contact)
- Sells auto SaaS currently, used to run auto/commercial ops
- Initially critical publicly, then DM'd saying "this looks really clean, could be a clean gap"
- Said inspections tab is "dope idea" for reducing pencil whips
- Asked about SMS/payment processing plans
- His advice: "Simplicity and visibility. Less clicks to action. Easy to find reports/history. Simple is best."
- He's in r/mechanics threads too, commenting about Tekmetric's history gap
- Potential connector/referral source/distribution partner

### r/Businessowners Comment
- Replied to mechanic shop owner using Excel for customer contacts
- Offered to DM demo link, also recommended HubSpot as free alternative
- 2 upvotes, OP said he'd try HubSpot first — replied "HubSpot should get you off Excel pretty quick. If you ever outgrow it and want something built for shops hit me up."

### Life-District8367 DM Conversation (Ongoing)
- Sent detailed reply explaining inspections (green/yellow/red checklist on each RO) and invoicing/payment status (tracking not processing yet, Stripe Connect not wired up)
- Asked him what he sees shops wanting on the payment side
- His reply: "Simplicity and visibility. Less clicks to action. Easy to find reports/history. Simple is best."
- Replied asking what auto SaaS he sells — waiting for response
- Key insight: He validates ShopCommand's approach but thinks 3-5 shop owners might find it annoying ("only scalable at size") — we disagree but didn't push back hard

### Reddit Lead Monitoring
- Using a lead tool that scans subreddits for relevant threads
- Evaluated 8 leads across r/ecommerce, r/serviceadvisors, r/smallbusinessowner, r/sweatystartup, r/buyingabusiness, r/AutomotiveLearning, r/askplumbing
- Only r/serviceadvisors thread about walk-arounds was close but decided to skip — thread is about personal discipline not software
- r/mechanics thread about international shop software — skipped (needs VAT/multi-currency, not our market)
- Rule: Only comment when the thread is specifically asking about shop management software or managing multiple locations

### Reddit Strategy Rules Learned
- Old Reddit (old.reddit.com) is reliable for posting comments — new Reddit's rich text editor eats text on submit
- Always switch to markdown mode if using new Reddit
- Don't argue with aggressive commenters — agree with their premise and redirect
- "Roast the landing page if you want. I can take it." works well as a Reddit closer
- Don't comment on threads older than a few days
- Don't comment on threads where the topic doesn't naturally lead to software
- Generic "what tools do you use" threads cast too wide a net — wait for auto-repair-specific threads

## Competitive Intelligence (from Reddit threads)

### What shops use
- Tekmetric: Most popular but expensive ($345/mo), slow history search, add-ons cost extra
- Mitchell1: Old interface, reliable, $289 with 5 licenses
- Shopmonkey: Good system but QuickBooks integration broken (especially Canadian taxes)
- Shop-Ware: Liked by users, less common
- R.O. Writer: Legacy

### Top complaints
1. Price — Tekmetric at $345/mo feels expensive for small shops
2. QuickBooks integration — broken or tax errors
3. Speed/load times — Tekmetric users complain
4. History search — Tekmetric is bad at this
5. Mobile vs desktop mismatch
6. Parts ordering integration
7. Labor times access

### Integration Priority (for closing deals)
1. QuickBooks ($0, 2-3 weeks) — removes #1 objection
2. Stripe Connect ($0, 2-3 weeks) — adds text-to-pay, creates revenue stream
3. PartsTech ($0, 1-2 weeks) — unlocks parts ordering
4. Square sync ($0, 2-3 weeks) — nice to have
5. Labor times API ($200-500/mo) — wait until revenue supports it

## Customer Pipeline

### Friend's Dad (Mechanic Shop)
- Knows about ShopCommand, willing to try it
- Wants parts order tracking (can see where a part is, parts getting lost)
- Demo not done yet — bring laptop, show Dashboard + one RO + tech board (3 screens)
- Ask what he uses now, match his complaint to ShopCommand

### Clerk Setup
- Development instance (staying on it for now, no functional difference)
- Double verification email: caused by captcha race condition (both sign-up creation and captcha completion trigger the code)
- Production instance deferred — unnecessary overhead for first customers
- Clerk footer hidden via `elements: { footer: 'hidden' }` in appearance config

## Product Insights

### What ShopCommand Actually Does vs Doesn't
- MPI inspections: Built in (green/yellow/red checklist per RO) but NOT mandatory — tech can skip
- Invoicing: Built in, create from RO
- Payment tracking: Records that payment happened, does NOT process payments (no Stripe Connect yet)
- Parts tracking: Full status pipeline (requested → ordered → in transit → arrived, with return/credited branches) with age/overdue indicators, tracking links (UPS/FedEx/USPS), inventory auto-adjustment on arrival/return, but manual status updates only (no automated carrier API)
- Messages: Mock data only in demo, basic local state for real accounts
- 15 sidebar items total — may overwhelm first-time users. Core screens: Dashboard, Repair Orders, Technicians

### "Vibe Coded" Perception
- Reddit commenter called it "clearly full ai/vibe coded"
- Text wrapping bug was the visible tell — fixed with global CSS
- For shop owner customers: doesn't matter, they care if it works
- For developer/Reddit audience: consistent error handling, loading skeletons, and one or two unique UI touches would help
- Source maps OFF, Vite minifies by default — code is not inspectable

### International Market
- Not pursuing now — needs multi-currency, VAT tax engine, localization
- Tekmetric, Autoleap, Shopmonkey all US/Canada only
- Gap exists but 2-3 months of work, not validated
- Focus: 300K US shops, need 25 of them

### Customer Acquisition Math (to get 10 paying)
1. Friend's dad demo → 1 customer
2. His referrals → 1-2
3. Cold calls (50 calls over 2 days) → 3-4
4. Facebook groups + DMs → 2-3
5. Reddit threads → 1
6. Parts supplier referrals ($100 bounty) → 1-2

## Remaining localStorage-Only Functions (Not Yet Fixed)

| Function | Fix Strategy | New Endpoint? |
|----------|-------------|:---:|
| `orderPart(partId)` | Add API call to existing `update-part` action in health.js | No |
| `startJobTimer` / `stopJobTimer` | Store in RO's JSONB `data` column via existing repair-orders PUT | No |
| `notifications` | Keep as localStorage — per-user ephemeral state, cross-device sync not worth it | Skip |

None of these require a Vercel Pro subscription.

## Pending Migrations

- **007_add_parts_table.sql** — Needs to be run on Neon. Without it, parts API errors for real users because the `parts` table doesn't exist.
- **006_add_ro_data_jsonb.sql** — May already be done. `ALTER TABLE repair_orders ADD COLUMN IF NOT EXISTS data JSONB DEFAULT '{}';`

## Environment
- Discord webhook: DISCORD_BUG_WEBHOOK_URL env var in Vercel + .env
- Must await Discord fetch before returning response (Vercel kills serverless functions after response sent)
- Neon critical note: `set_config` doesn't persist between queries because each `sql` tagged template runs on a separate HTTP connection. All queries need explicit `WHERE org_id = ${user.orgId}`
