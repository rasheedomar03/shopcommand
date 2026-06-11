import { Clock, FileText, Clipboard, BarChart3, Package, Wrench, Search } from 'lucide-react'

const articles = [
  {
    slug: 'track-technician-hours-without-separate-app',
    title: 'How to Track Technician Hours Without a Separate App',
    description: 'Most shops use one system for repair orders and another for time tracking. Here\'s why that costs you money and how to fix it.',
    icon: Clock,
    readTime: '5 min',
    audience: 'Owners & Service Managers',
    publishedAt: '2026-06-08',
    content: [
      {
        type: 'paragraph',
        text: 'If your techs clock in on a wall-mounted terminal, write hours on a paper timesheet, or use a completely separate app from your shop management system — you have a data gap. And that gap is costing you real money every single week.',
      },
      {
        type: 'heading',
        text: 'The hidden cost of disconnected time tracking',
      },
      {
        type: 'paragraph',
        text: 'When time tracking lives in a different system from your repair orders, nobody can answer basic questions without cross-referencing two screens. How many hours did we bill on that transmission job versus how many we actually spent? Which tech is consistently going over estimate? Where are we losing margin?',
      },
      {
        type: 'paragraph',
        text: 'The answers exist — they\'re just trapped in two systems that don\'t talk to each other. So the questions go unasked, and the margin bleeds quietly.',
      },
      {
        type: 'heading',
        text: 'What "built-in" time tracking actually means',
      },
      {
        type: 'paragraph',
        text: 'When your time clock lives inside your shop management platform, every clock-in and clock-out is tied to a real person, a real repair order, and a real bay. You don\'t reconcile anything at the end of the week — the data is already connected.',
      },
      {
        type: 'list',
        items: [
          'A tech clocks in — you see them on the floor immediately.',
          'They start a job timer on an RO — billable hours accumulate in real time.',
          'You compare actual hours against estimated hours before the job closes.',
          'Overtime flags before it happens, not when payroll runs.',
          'End-of-week labor reports pull from one source of truth.',
        ],
      },
      {
        type: 'heading',
        text: 'The payroll reconciliation problem',
      },
      {
        type: 'paragraph',
        text: 'Every Friday, someone in your shop spends 30 minutes to an hour matching timesheets to repair orders. They\'re checking if Jose really worked 9.5 hours on Tuesday or if he forgot to clock out. They\'re figuring out if that brake job took 3 hours or 4. This is administrative work that exists only because your systems are disconnected.',
      },
      {
        type: 'paragraph',
        text: 'With integrated time tracking, the data is already right. The tech clocked in at 7:02am, started the brake job timer at 7:15am, stopped it at 10:48am, and clocked out at 5:01pm. No reconciliation needed. No guessing. No Friday afternoon spreadsheet sessions.',
      },
      {
        type: 'heading',
        text: 'What to look for in a shop management time clock',
      },
      {
        type: 'list',
        items: [
          'Clock-in/out from phone or shop terminal — no dedicated hardware.',
          'Job-level timers tied to specific repair orders.',
          'Real-time visibility into who\'s on the floor and who\'s not.',
          'Billable vs. actual hour comparison per tech, per job.',
          'Overtime alerts before hours exceed thresholds.',
          'Export-ready data for your payroll provider.',
        ],
      },
      {
        type: 'paragraph',
        text: 'The goal isn\'t to add another system. It\'s to eliminate one. Your shop management software should handle time — because time is the core unit of everything you sell.',
      },
    ],
  },
  {
    slug: 'why-completed-repair-orders-dont-get-invoiced',
    title: 'Why Completed Repair Orders Still Don\'t Get Invoiced',
    description: 'The job is done, the car is ready — but the invoice hasn\'t been sent. Here\'s where the handoff breaks down and how to close the gap.',
    icon: FileText,
    readTime: '5 min',
    audience: 'Owners & Service Managers',
    publishedAt: '2026-06-06',
    content: [
      {
        type: 'paragraph',
        text: 'You\'ve seen it. The car is sitting in the lot, the tech finished the work two days ago, but the RO is still "in progress" in your system. The customer hasn\'t been called, the invoice hasn\'t been created, and the revenue is stuck in limbo. This isn\'t a rare edge case — it\'s one of the most common revenue leaks in auto repair.',
      },
      {
        type: 'heading',
        text: 'Where the handoff breaks',
      },
      {
        type: 'paragraph',
        text: 'In most shops, the flow from "work complete" to "invoice sent" involves at least three people: the tech who finished the job, the advisor who needs to verify the work and add final charges, and whoever handles billing. Each handoff is a chance for the ball to drop.',
      },
      {
        type: 'list',
        items: [
          'The tech finishes but doesn\'t update the RO status — they just move to the next car.',
          'The advisor doesn\'t know the job is done because they\'re managing five other conversations.',
          'Parts were added during the job but never logged, so the invoice would be wrong.',
          'The customer was called but didn\'t answer, so the RO just... sits.',
        ],
      },
      {
        type: 'heading',
        text: 'The revenue impact of delayed invoicing',
      },
      {
        type: 'paragraph',
        text: 'Every day an RO sits completed-but-not-invoiced is a day your cash flow takes a hit. For a shop doing 15 ROs per day with an average ticket of $400, even a one-day average delay across all jobs means $6,000 sitting unbilled at any given time. Over a month, that delay compounds into tens of thousands of dollars in float.',
      },
      {
        type: 'paragraph',
        text: 'Worse, the longer an invoice takes, the harder it is to collect. Customers who pick up their car and don\'t receive an invoice within 24 hours are significantly less likely to pay promptly. Some dispute charges they\'ve had time to forget about.',
      },
      {
        type: 'heading',
        text: 'How to fix the invoice gap',
      },
      {
        type: 'list',
        items: [
          'Digital RO status transitions — when a tech marks "complete," the advisor gets notified instantly.',
          'Required fields before closing: labor lines, parts, customer approval — all must be present.',
          'One-click invoice generation directly from the completed RO.',
          'Dashboard visibility into completed-but-not-invoiced ROs with age tracking.',
          'Payment collection at the point of pickup, online or in-shop.',
        ],
      },
      {
        type: 'paragraph',
        text: 'The fix isn\'t a process change or a new policy memo. It\'s making "completed RO without an invoice" impossible to ignore in your software. If it shows up on your dashboard every morning, it gets handled.',
      },
    ],
  },
  {
    slug: 'real-cost-of-running-shop-on-paper',
    title: 'The Real Cost of Running Your Shop on Paper and Whiteboards',
    description: 'Paper ROs and whiteboard dispatch feel free. They\'re not. Here\'s what they actually cost your shop every month.',
    icon: Clipboard,
    readTime: '6 min',
    audience: 'Owners',
    publishedAt: '2026-06-04',
    content: [
      {
        type: 'paragraph',
        text: 'Paper repair orders and a whiteboard on the wall have been running shops for decades. They\'re familiar, they don\'t crash, and they don\'t have a monthly fee. But they have a cost — it\'s just invisible until you add it up.',
      },
      {
        type: 'heading',
        text: 'The time cost: 5-8 hours per week in admin',
      },
      {
        type: 'paragraph',
        text: 'Every paper RO has to be written by hand, filed somewhere, and eventually entered into whatever system you use for invoicing. Someone is re-typing information that was already written once. Someone is digging through a stack to find a specific job. Someone is calling the shop from home because they can\'t remember if the parts came in.',
      },
      {
        type: 'paragraph',
        text: 'Conservative estimate: your service advisor spends 5-8 hours per week on tasks that exist only because your system is paper-based. At $25/hour fully loaded, that\'s $500-$800/month in labor just to maintain the paper system. That\'s already more than most shop management software costs.',
      },
      {
        type: 'heading',
        text: 'The visibility cost: decisions without data',
      },
      {
        type: 'paragraph',
        text: 'With paper, you can\'t answer basic questions without physically being in the shop. How much revenue did we do this week? Which tech is most efficient? How many ROs are open right now? You either don\'t know, or you call someone to count.',
      },
      {
        type: 'paragraph',
        text: 'Multi-location owners feel this the hardest. You can\'t look at a whiteboard in two shops at the same time. So you drive across town, or you call your manager and interrupt their day. Neither is a real solution.',
      },
      {
        type: 'heading',
        text: 'The error cost: lost ROs and missed charges',
      },
      {
        type: 'list',
        items: [
          'A paper RO gets coffee-stained and the parts list is illegible.',
          'A tech adds labor that never makes it onto the invoice.',
          'A customer disputes a charge and you can\'t find the authorization.',
          'Parts are used but never deducted from inventory counts.',
          'A vehicle comes back and you have no digital history to reference.',
        ],
      },
      {
        type: 'paragraph',
        text: 'Each of these is a $50-$500 mistake. They happen weekly in paper-based shops. Over a year, the cumulative cost dwarfs any software subscription.',
      },
      {
        type: 'heading',
        text: 'When to make the switch',
      },
      {
        type: 'paragraph',
        text: 'If you\'re doing more than 5 ROs per day, the math already favors digital. The question isn\'t whether you can afford shop management software — it\'s whether you can afford to keep running without it. The paper system isn\'t free. You\'re just paying for it in ways that don\'t show up on a bill.',
      },
    ],
  },
  {
    slug: 'multi-location-owner-visibility',
    title: 'How Multi-Location Shop Owners Stay in Control Without Being On-Site',
    description: 'You can\'t be in every shop at once. Here\'s how owners with 2-10 locations manage without the check-in calls.',
    icon: BarChart3,
    readTime: '5 min',
    audience: 'Multi-Location Owners',
    publishedAt: '2026-06-02',
    content: [
      {
        type: 'paragraph',
        text: 'You own three shops. It\'s 4pm. You want to know how the day went. Your options: drive to each location, call three managers and pull them away from customers, or log into your shop management platform and see everything in 30 seconds.',
      },
      {
        type: 'paragraph',
        text: 'If option three isn\'t available to you, you\'re managing by phone — and you\'re always behind.',
      },
      {
        type: 'heading',
        text: 'The 4pm phone call problem',
      },
      {
        type: 'paragraph',
        text: 'Most multi-location owners have a daily ritual: call each shop late in the afternoon and ask how the day went. Revenue? "Pretty good." Open ROs? "I think like 15." Who clocked in late? "Uh, let me check." This call takes 10-15 minutes per location, delivers approximate information, and interrupts your manager every single day.',
      },
      {
        type: 'paragraph',
        text: 'Multiply that by 3 locations and you\'re spending 45 minutes a day getting information that should take 30 seconds to read on a screen.',
      },
      {
        type: 'heading',
        text: 'What a multi-location dashboard actually shows you',
      },
      {
        type: 'list',
        items: [
          'Revenue per location — today, this week, this month. No phone call needed.',
          'Open RO count and status breakdown per shop.',
          'Which techs are clocked in at each location right now.',
          'Which location is ahead of target and which is behind.',
          'Flagged items: overdue ROs, missing parts, incomplete invoices.',
        ],
      },
      {
        type: 'heading',
        text: 'The manager\'s perspective',
      },
      {
        type: 'paragraph',
        text: 'Your managers don\'t love the 4pm call either. They\'re managing the floor, handling customers, and coordinating techs. Stopping to give you a verbal report is a context switch that costs them momentum. When you can see the numbers yourself, you only call when something actually needs discussion — not for a daily status update.',
      },
      {
        type: 'heading',
        text: 'One login, every location',
      },
      {
        type: 'paragraph',
        text: 'The key is a single dashboard that aggregates all your shops without requiring separate logins or tab-switching. You see the whole business in one view: total revenue, total open work, total headcount. Then you drill into whichever location needs attention. The information comes to you — you don\'t go hunting for it.',
      },
    ],
  },
  {
    slug: 'parts-inventory-tracking-stop-losing-money',
    title: 'Parts Inventory Tracking: Stop Losing Money to Shrinkage and Stockouts',
    description: 'Your parts room is either overstocked, understocked, or untracked. Here\'s how to fix all three without a warehouse management system.',
    icon: Package,
    readTime: '6 min',
    audience: 'Owners & Parts Counter Staff',
    publishedAt: '2026-05-30',
    content: [
      {
        type: 'paragraph',
        text: 'Parts are the second biggest cost in your shop after labor. But most independent shops track inventory with a spreadsheet, a visual check, or pure memory. The result: you order parts you already have, you run out of parts you need daily, and you have no idea where the shrinkage is happening.',
      },
      {
        type: 'heading',
        text: 'The three ways untracked inventory costs you',
      },
      {
        type: 'list',
        items: [
          'Stockouts: A tech needs brake pads you thought you had. Now the job is delayed a day while you wait on delivery. That\'s a bay sitting empty and a customer waiting.',
          'Overstocking: You ordered 20 oil filters because you weren\'t sure how many you had. You had 14. Now you have $120 in dead capital on the shelf.',
          'Shrinkage: Parts walk off the shelf and nobody notices because there\'s no system tracking what should be there. The average shop loses 2-5% of parts value to untracked shrinkage annually.',
        ],
      },
      {
        type: 'heading',
        text: 'What practical inventory tracking looks like',
      },
      {
        type: 'paragraph',
        text: 'You don\'t need a warehouse management system. You need basic visibility: what do we have, what did we use, and what do we need to reorder? When parts tracking is built into your shop management platform, every part added to an RO automatically deducts from inventory. No second step. No manual adjustment.',
      },
      {
        type: 'list',
        items: [
          'Every part has a quantity, a cost, a location, and a reorder point.',
          'When a part is added to an RO, inventory adjusts automatically.',
          'Low-stock alerts fire before you run out, not after.',
          'QR labels let you scan a shelf and see part details instantly.',
          'Usage history shows which parts move fastest and which are gathering dust.',
        ],
      },
      {
        type: 'heading',
        text: 'The QR label workflow',
      },
      {
        type: 'paragraph',
        text: 'Print a QR label for any part in your system. Stick it on the shelf or the bin. When anyone scans it — phone camera, no app needed — they see the part details, current quantity, and last order date. Your parts counter staff spends less time looking things up, and your techs can self-serve for common items.',
      },
      {
        type: 'paragraph',
        text: 'Inventory tracking doesn\'t have to be complicated. It just has to exist. The bar is low, and the payoff is immediate.',
      },
    ],
  },
  {
    slug: 'modern-repair-order-workflow',
    title: 'From Estimate to Payment: What a Modern RO Workflow Looks Like',
    description: 'A repair order should flow from intake to invoice without dropping a step. Here\'s the 4-stage workflow that keeps nothing stuck.',
    icon: Wrench,
    readTime: '7 min',
    audience: 'Owners & Service Managers',
    publishedAt: '2026-05-28',
    content: [
      {
        type: 'paragraph',
        text: 'A repair order is the backbone of your shop. Every dollar of revenue, every hour of labor, and every part you sell flows through an RO. When ROs get stuck, lost, or mishandled, everything downstream breaks: invoicing is late, customers are frustrated, and revenue sits in limbo.',
      },
      {
        type: 'paragraph',
        text: 'Here\'s what a clean RO workflow looks like when nothing falls through the cracks.',
      },
      {
        type: 'heading',
        text: 'Stage 1: Intake — capture everything upfront',
      },
      {
        type: 'paragraph',
        text: 'The customer arrives or calls. You create the RO with the customer name, vehicle info (year, make, model, VIN), and the stated complaint. This takes under two minutes in a good system. The RO is now open and visible to everyone in the shop.',
      },
      {
        type: 'paragraph',
        text: 'Key detail: capture the customer\'s complaint in their words. "It makes a grinding noise when I brake" is more useful than "brake inspection." Their words become the tech\'s starting point.',
      },
      {
        type: 'heading',
        text: 'Stage 2: Diagnosis and authorization',
      },
      {
        type: 'paragraph',
        text: 'The tech inspects the vehicle and reports findings. The advisor builds an estimate with labor and parts, then contacts the customer for approval. In a digital workflow, this approval can happen via text or email — the customer sees exactly what they\'re authorizing and responds with a tap.',
      },
      {
        type: 'paragraph',
        text: 'No approval, no work beyond diagnosis. This protects the shop and the customer relationship.',
      },
      {
        type: 'heading',
        text: 'Stage 3: Work, parts, and time tracking',
      },
      {
        type: 'paragraph',
        text: 'Once authorized, the tech starts the job timer and begins work. Parts are pulled from inventory (or ordered) and added to the RO. Labor lines accumulate in real time. If the tech discovers additional work needed, the advisor creates a supplemental estimate and gets a second authorization before proceeding.',
      },
      {
        type: 'list',
        items: [
          'Job timer ties hours directly to the RO.',
          'Parts deduct from inventory when added.',
          'Supplemental estimates keep the customer in the loop.',
          'The advisor can see progress without walking to the bay.',
        ],
      },
      {
        type: 'heading',
        text: 'Stage 4: Complete, invoice, collect',
      },
      {
        type: 'paragraph',
        text: 'The tech marks the job complete. The advisor reviews: are all labor lines accounted for? Are parts correct? Is the customer authorization on file? One click generates the invoice from the RO data — no re-typing. The customer pays in-shop or receives a payment link. The RO closes, revenue posts, and inventory is already updated.',
      },
      {
        type: 'paragraph',
        text: 'The entire flow — intake to payment — should happen without anyone re-entering data, hunting for a paper ticket, or forgetting a step. When the system enforces the workflow, the workflow works.',
      },
    ],
  },
  {
    slug: 'what-to-look-for-in-shop-management-software',
    title: 'What to Look for in Auto Repair Shop Management Software',
    description: 'Not all shop management platforms are built the same. Here\'s what actually matters when you\'re evaluating your options.',
    icon: Search,
    readTime: '6 min',
    audience: 'Owners',
    publishedAt: '2026-05-26',
    content: [
      {
        type: 'paragraph',
        text: 'There are a dozen shop management platforms on the market, and they all claim to do everything. But when you\'re actually running a shop — writing ROs, tracking techs, managing parts, sending invoices — the differences matter. Here\'s what to evaluate beyond the feature checklist.',
      },
      {
        type: 'heading',
        text: 'Speed matters more than features',
      },
      {
        type: 'paragraph',
        text: 'Your service advisor is going to use this software 200 times a day. If it takes 3 seconds to load a page instead of 0.5 seconds, that\'s 8+ minutes of waiting per day. Over a month, that\'s hours of lost productivity — and a frustrated team that starts working around the system instead of in it.',
      },
      {
        type: 'paragraph',
        text: 'Test the actual speed. Create an RO. Search for a customer. Pull up vehicle history. If any of those take more than a second, the tool will slow your shop down.',
      },
      {
        type: 'heading',
        text: 'Per-seat pricing adds up fast',
      },
      {
        type: 'paragraph',
        text: 'Many platforms charge per user: $50-$100 per person per month. For a shop with an owner, two advisors, and six techs, that\'s $450-$900/month. And it creates a perverse incentive: you limit who gets access to keep costs down, which means techs can\'t see their jobs and advisors share logins.',
      },
      {
        type: 'paragraph',
        text: 'Look for per-location pricing with unlimited users. Everyone who needs access should have it. Shared logins are a security and accountability problem.',
      },
      {
        type: 'heading',
        text: 'Multi-location support isn\'t an afterthought',
      },
      {
        type: 'paragraph',
        text: 'If you have (or plan to have) more than one location, check whether the platform was built for it or bolted it on. Can you see all shops in one dashboard? Can you compare performance across locations? Or do you need separate logins for each shop?',
      },
      {
        type: 'heading',
        text: 'The checklist that actually matters',
      },
      {
        type: 'list',
        items: [
          'Sub-second page loads on real shop workflows.',
          'Full RO lifecycle: intake, estimate, authorization, work, invoice, payment.',
          'Built-in time clock tied to repair orders.',
          'Parts inventory that auto-deducts when parts are added to ROs.',
          'Multi-location dashboard without separate logins.',
          'Per-location pricing, not per-seat.',
          'Mobile-friendly for techs without a stripped-down experience.',
          'Data export — your data is yours, always.',
          'No long-term contract or implementation fee.',
        ],
      },
      {
        type: 'paragraph',
        text: 'Skip the flashy demos and test it with your real workflow. Add a customer, create an RO, assign a tech, add parts, generate an invoice. If that flow feels fast and natural, you\'ve found your tool. If it feels clunky, it\'ll feel clunkier at 3pm on a busy Tuesday.',
      },
    ],
  },
]

export default articles
