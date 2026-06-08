# ShopCommand

Auto repair shop management software for independent shop owners running multiple locations.

See revenue, open repair orders, technician status, and parts tracking across all your shops from one dashboard. No more 4pm check-in calls.

**Live:** [shopcommand.net](https://shopcommand.net)
**Demo:** [shopcommand.net/demo](https://shopcommand.net/demo) (click through the full dashboard without signing up)

## What it does

- Real-time multi-location dashboard
- Repair order tracking (Estimate > Approved > Waiting Parts > In Progress > Complete > Invoiced > Paid)
- Technician clock-in/out and efficiency scoring
- Multi-point vehicle inspections (green/yellow/red)
- Parts order tracking with overdue alerts
- Customer and vehicle management
- Role-based access (owner, service advisor, technician)
- Mobile-friendly technician job board
- Invoicing and payment tracking
- Appointment scheduling

## Tech stack

- **Frontend:** React 18, Vite, Tailwind CSS
- **Auth:** Clerk (JWT verification via Web Crypto API)
- **Database:** Neon PostgreSQL with row-level security
- **API:** Vercel serverless functions
- **Payments:** Stripe
- **Testing:** Vitest (43 tests)
- **CI/CD:** GitHub Actions + Vercel auto-deploy

## Getting started

```bash
# Clone
git clone https://github.com/rasheedomar03/shopcommand.git
cd shopcommand

# Install
npm install

# Set up environment
cp .env.example .env
# Fill in your Clerk, Neon, and Stripe credentials

# Run locally
npm run dev

# Run tests
npm test

# Build
npm run build
```

## Pricing

- **Founding member:** $100/mo first shop + $50/mo each additional. Locked forever.
- **Standard (after launch):** $175/mo first shop + $100/mo each additional.
- No per-seat fees. Unlimited users at every tier.

## Author

Built by [Rasheed Omar](https://github.com/rasheedomar03) in Houston, TX.
