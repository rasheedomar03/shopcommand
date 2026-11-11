import { Clock, FileText, Clipboard, BarChart3, Package, Wrench, Search } from 'lucide-react'

const articles = [
  {
    slug: 'track-technician-hours-without-separate-app',
    title: 'How to Track Technician Hours Without a Separate App',
    description: 'Most shops use one system for repair orders and another for time tracking. Here\'s why that costs you money and how to fix it.',
    icon: Clock,
    readTime: '7 min',
    audience: 'Owners & Service Managers',
    publishedAt: '2026-06-08',
    updatedAt: '2026-11-11',
    content: [
      {
        type: 'paragraph',
        text: "If your techs clock in on a wall-mounted terminal, write hours on a paper timesheet, or use a completely separate app from your shop management system, you have a data gap. And that gap is costing you real money every single week.",
      },
      {
        type: 'heading',
        text: 'The hidden cost of disconnected time tracking',
      },
      {
        type: 'paragraph',
        text: "When time tracking lives in a different system from your repair orders, nobody can answer basic questions without cross-referencing two screens. How many hours did we bill on that transmission job versus how many we actually spent? Which tech is consistently going over estimate? Where are we losing margin?",
      },
      {
        type: 'paragraph',
        text: "The answers exist. They're just trapped in two systems that don't talk to each other. So the questions go unasked, and the margin bleeds quietly.",
      },
      {
        type: 'heading',
        text: 'Run the math on your own shop',
      },
      {
        type: 'paragraph',
        text: "Here's a quick check you can do tonight. Take last week's payroll hours for your techs. Then add up the labor hours you actually billed on closed ROs for the same week. Divide billed hours by paid hours. That's your labor utilization, and in shops with disconnected time tracking it's usually a guess until the moment you calculate it.",
      },
      {
        type: 'paragraph',
        text: "Say you run a 6-bay shop with five techs. You paid 200 tech hours last week and billed 118. That's 59% utilization. Industry-healthy shops run 70% or better. The 22-hour gap, at a $120 labor rate, is $2,640 of labor capacity you paid for and didn't sell. In one week. Some of that gap is legitimate (cleanup, training, waiting on parts), but you can't fix what you can't see, and with two systems you usually can't see it until month-end, if ever.",
      },
      {
        type: 'heading',
        text: 'What "built-in" time tracking actually means',
      },
      {
        type: 'paragraph',
        text: "When your time clock lives inside your shop management platform, every clock-in and clock-out is tied to a real person, a real repair order, and a real bay. You don't reconcile anything at the end of the week. The data is already connected.",
      },
      {
        type: 'list',
        items: [
          'A tech clocks in, and you see them on the floor immediately.',
          'They start a job timer on an RO, and billable hours accumulate in real time.',
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
        text: "Every Friday, someone in your shop spends 30 minutes to an hour matching timesheets to repair orders. They're checking if Jose really worked 9.5 hours on Tuesday or if he forgot to clock out. They're figuring out if that brake job took 3 hours or 4. This is administrative work that exists only because your systems are disconnected.",
      },
      {
        type: 'paragraph',
        text: "With integrated time tracking, the data is already right. The tech clocked in at 7:02am, started the brake job timer at 7:15am, stopped it at 10:48am, and clocked out at 5:01pm. No reconciliation needed. No guessing. No Friday afternoon spreadsheet sessions.",
      },
      {
        type: 'paragraph',
        text: "Call the reconciliation hour what it is: $25-$35 a week of pure overhead, plus whatever the errors cost when a forgotten clock-out becomes two hours of phantom overtime that payroll pays anyway because nobody could prove otherwise.",
      },
      {
        type: 'heading',
        text: 'Common objections, answered honestly',
      },
      {
        type: 'paragraph',
        text: '"My techs will hate punching timers." Some will, for about two weeks. The pushback almost always comes from the fear that the data will be used against them. Be upfront: the timers exist to price jobs correctly and to prove when a tech beats the estimate, which is the case for a raise, not against one. Your best techs usually end up liking timers most, because the numbers show they are your best techs.',
      },
      {
        type: 'paragraph',
        text: '"We already have a time clock that works fine for payroll." It probably does work fine for payroll. The problem is that payroll hours and billable hours are different questions, and a payroll-only clock answers the cheaper one. Knowing Jose worked 42 hours tells you what to pay him. Knowing 31 of those hours were on ROs tells you whether the shop made money.',
      },
      {
        type: 'paragraph',
        text: '"Switching sounds like a project." It is a small one. Budget one morning to set up techs in the new system and one week of running both clocks in parallel so payroll has a safety net. After that, turn the old one off. Shops that try to run both forever end up trusting neither.',
      },
      {
        type: 'heading',
        text: 'A simple rollout plan',
      },
      {
        type: 'list',
        items: [
          'Week 1: Techs clock in and out only. No job timers yet. Let the habit form.',
          'Week 2: Add job timers on the two or three most common job types, like brakes and oil changes.',
          'Week 3: Timers on everything. Start comparing actual vs. estimated hours in your Monday review.',
          'Week 4: Pick one number to improve, usually utilization or one chronically underestimated job type, and reprice or retrain accordingly.',
        ],
      },
      {
        type: 'heading',
        text: 'What the data unlocks after 30 days',
      },
      {
        type: 'paragraph',
        text: "The first month of connected time data usually surprises owners in two specific ways. First, one or two job types are chronically underpriced. You estimated front brakes at 2.0 hours because that's what the labor guide says, but your actual average across 14 jobs is 2.6 hours, often because of rusted hardware the guide doesn't account for in your climate. That's 0.6 hours of free labor on every brake job. At $120 an hour and three brake jobs a week, you've been giving away roughly $900 a month on one job type. Reprice it to 2.5 hours and nobody blinks, because the number is now true.",
      },
      {
        type: 'paragraph',
        text: "Second, the spread between techs is wider than you thought, and not always in the direction you assumed. The tech who looks busiest sometimes bills the fewest hours, and the quiet one in bay four turns out to beat estimate on everything. Connected data replaces impressions with numbers, which changes who gets the gravy work, who gets training, and who gets the raise. Those decisions were always being made. Now they're being made on evidence.",
      },
      {
        type: 'paragraph',
        text: "Scheduling gets sharper too. When you know your real average for each job type, you stop promising five cars for Friday when your actual capacity is four. Overpromising isn't a character flaw. It's what happens when nobody knows the true numbers.",
      },
      {
        type: 'heading',
        text: 'Mistakes to avoid',
      },
      {
        type: 'list',
        items: [
          'Using timer data to nitpick minutes. Chase patterns across weeks, not one slow Tuesday.',
          'Skipping the "why" conversation with techs before day one. Surprise monitoring breeds bad data.',
          'Leaving the old paper timesheet available "just in case." It becomes the real system again within a month.',
          'Ignoring the data once you have it. If nobody reviews utilization weekly, the timers are just theater.',
        ],
      },
      {
        type: 'paragraph',
        text: "The goal isn't to add another system. It's to eliminate one. Your shop management software should handle time, because time is the core unit of everything you sell. ShopCommand builds the time clock, per-job timers, and overtime alerts directly into the RO screen for exactly this reason.",
      },
    ],
    faqs: [
      {
        q: 'How do auto repair shops track technician hours?',
        a: 'Most shops use one of three methods: paper timesheets, a standalone punch clock or app, or a time clock built into their shop management software. The built-in approach is the only one that ties hours directly to repair orders, so you can see billed hours versus paid hours without reconciling two systems every week.',
      },
      {
        q: 'What is a good labor utilization rate for a repair shop?',
        a: 'A healthy independent shop bills 70% or more of the tech hours it pays for. Below 60% usually means hours are leaking into unbilled diagnostic time, waiting on parts, or jobs that run past estimate. You can only measure it reliably when clock data and RO data live in the same system.',
      },
      {
        q: 'Will technicians push back on per-job timers?',
        a: 'Usually for a week or two. The resistance fades when techs see the data used to fix underpriced jobs and to document who beats estimates, rather than to punish anyone over minutes. Explain the purpose before rollout and review patterns weekly, not individual punches.',
      },
      {
        q: 'Can I run payroll from shop management software time data?',
        a: 'Yes, if the system records true clock-in and clock-out times, not just job timer totals. Look for exportable hour reports your payroll provider accepts, plus overtime alerts so you catch hours crossing thresholds before the pay period closes instead of after.',
      },
    ],
  },
  {
    slug: 'why-completed-repair-orders-dont-get-invoiced',
    title: 'Why Completed Repair Orders Still Don\'t Get Invoiced',
    description: 'The job is done, the car is ready, but the invoice hasn\'t been sent. Here\'s where the handoff breaks down and how to close the gap.',
    icon: FileText,
    readTime: '7 min',
    audience: 'Owners & Service Managers',
    publishedAt: '2026-06-06',
    updatedAt: '2026-11-11',
    content: [
      {
        type: 'paragraph',
        text: "You've seen it. The car is sitting in the lot, the tech finished the work two days ago, but the RO is still \"in progress\" in your system. The customer hasn't been called, the invoice hasn't been created, and the revenue is stuck in limbo. This isn't a rare edge case. It's one of the most common revenue leaks in auto repair.",
      },
      {
        type: 'heading',
        text: 'Where the handoff breaks',
      },
      {
        type: 'paragraph',
        text: "In most shops, the flow from \"work complete\" to \"invoice sent\" involves at least three people: the tech who finished the job, the advisor who needs to verify the work and add final charges, and whoever handles billing. Each handoff is a chance for the ball to drop.",
      },
      {
        type: 'list',
        items: [
          "The tech finishes but doesn't update the RO status. They just move to the next car.",
          "The advisor doesn't know the job is done because they're managing five other conversations.",
          'Parts were added during the job but never logged, so the invoice would be wrong.',
          "The customer was called but didn't answer, so the RO just sits.",
        ],
      },
      {
        type: 'heading',
        text: 'The revenue impact of delayed invoicing',
      },
      {
        type: 'paragraph',
        text: "Every day an RO sits completed-but-not-invoiced is a day your cash flow takes a hit. For a shop doing 15 ROs per day with an average ticket of $400, even a one-day average delay across all jobs means $6,000 sitting unbilled at any given time. Over a month, that delay compounds into tens of thousands of dollars in float.",
      },
      {
        type: 'paragraph',
        text: "Worse, the longer an invoice takes, the harder it is to collect. Customers who pick up their car and don't receive an invoice within 24 hours are significantly less likely to pay promptly. Some dispute charges they've had time to forget about.",
      },
      {
        type: 'heading',
        text: 'A worked example: the Thursday brake job',
      },
      {
        type: 'paragraph',
        text: "Walk through a typical failure. A brake job finishes Thursday at 3pm. The tech parks the car out back and grabs the next ticket. Friday is slammed, so the advisor doesn't notice the finished car until the customer calls Saturday asking if it's ready. The advisor scrambles, discovers a caliper was added mid-job but never written down, calls the tech (who is off), guesses at the part price, and sends an invoice Monday. The customer, who expected $480, sees $610 with a line item nobody explained to them. Now you have a four-day-old receivable and an argument.",
      },
      {
        type: 'paragraph',
        text: "Nothing in that story involves a bad employee. Every person did their job as the shop defined it. The process failed because nothing forced the handoffs to happen, and nothing surfaced the stuck RO until a customer did.",
      },
      {
        type: 'heading',
        text: 'How to fix the invoice gap',
      },
      {
        type: 'list',
        items: [
          'Digital RO status transitions: when a tech marks "complete," the advisor gets notified instantly.',
          'Required fields before closing: labor lines, parts, customer approval. All must be present.',
          'One-click invoice generation directly from the completed RO.',
          'Dashboard visibility into completed-but-not-invoiced ROs with age tracking.',
          'Payment collection at the point of pickup, online or in-shop.',
        ],
      },
      {
        type: 'heading',
        text: 'The daily habit that closes the gap',
      },
      {
        type: 'paragraph',
        text: "Process fixes stick when they attach to a routine you already have. The simplest one: every morning, before the first customer, pull up every RO marked complete without an invoice and every RO that hasn't changed status in 48 hours. That review takes five minutes when the list is short, and the whole point is to keep the list short. A stuck RO caught on day one is a phone call. A stuck RO caught on day four is a dispute.",
      },
      {
        type: 'paragraph',
        text: "If your software can't produce that list in one view, that's the real problem. You can't build a five-minute habit on top of a 45-minute hunt through paper tickets and whiteboard columns.",
      },
      {
        type: 'paragraph',
        text: "Assign the review to a named person, not to \"the front office.\" Shared responsibilities are how this gap formed in the first place. In a one-advisor shop, it's the advisor. In a bigger shop, it's whoever opens, and the owner spot-checks on Fridays. The whole fix costs 25 minutes a week and recovers receivables measured in thousands.",
      },
      {
        type: 'heading',
        text: 'What about customers who won\'t pick up the car?',
      },
      {
        type: 'paragraph',
        text: "Some ROs stall on the customer side, not yours. The fix is to separate the two events: invoice when the work is done, collect when they show up. Emailing the invoice the day the job completes starts the payment clock and gives the customer a written record while the work is fresh in their mind. Taking a partial payment or deposit on bigger jobs helps too; a customer with $300 already in is far more motivated to collect their vehicle. And a customer-facing status link, where they can see \"ready for pickup\" without calling, quietly removes your busiest phone interruption.",
      },
      {
        type: 'heading',
        text: 'Measure one number: days to invoice',
      },
      {
        type: 'paragraph',
        text: "If you want to know whether you actually have this problem, measure it for two weeks. For every closed RO, note the date the work finished and the date the invoice went out. Average the gap. Most owners guess their number is under one day; shops measuring for the first time commonly find two to four. The number also tells you whether your fixes are working. If your average drops from 2.8 days to 0.4 over a month, you've pulled tens of thousands of dollars of receivables forward, permanently, without writing a single extra RO.",
      },
      {
        type: 'paragraph',
        text: "Track the spread, not just the average. An average of one day that hides three ROs at six days means you have a specific failure mode, usually one advisor, one job type, or one customer category like fleet accounts, and you can fix it surgically instead of lecturing everyone.",
      },
      {
        type: 'paragraph',
        text: "Fleet and commercial accounts deserve their own look here. They often run on net-30 terms, which makes same-day invoicing more important, not less. Every day you sit on the invoice extends their 30 days to 32, 34, 36. The customer is paying on time by their clock. The delay was yours.",
      },
      {
        type: 'heading',
        text: 'Mistakes to avoid',
      },
      {
        type: 'list',
        items: [
          'Blaming individuals for a process problem. If three different people have dropped the same handoff, the handoff is the problem.',
          'Letting techs add parts verbally. Every part goes on the RO when it goes on the car, or your invoices will keep surprising customers.',
          'Writing the invoice from memory days later. Invoice from the RO data, the same day, every time.',
          'Tracking stuck ROs in your head. The list has to live somewhere everyone can see, with ages attached.',
        ],
      },
      {
        type: 'paragraph',
        text: "The fix isn't a new policy memo. It's making \"completed RO without an invoice\" impossible to ignore in your software. If it shows up on your dashboard every morning, it gets handled. That visibility is exactly what ShopCommand's RO pipeline was built around, from intake through paid.",
      },
    ],
    faqs: [
      {
        q: 'Why do finished repair orders not get invoiced right away?',
        a: 'Usually because the handoff from tech to advisor to billing relies on memory and verbal updates. The tech moves to the next car, the advisor is busy, and nothing in the system flags the finished job. Shops fix it with status notifications, required fields before closing, and a daily review of completed-but-uninvoiced ROs.',
      },
      {
        q: 'How much does slow invoicing cost a repair shop?',
        a: 'A shop writing 15 ROs a day at a $400 average ticket carries about $6,000 in unbilled work for every day of average delay. Slow invoices also collect worse: customers billed days after pickup dispute more charges and pay later, so the cost shows up in both cash flow and write-offs.',
      },
      {
        q: 'Should a shop invoice before the customer picks up the vehicle?',
        a: 'Yes. Generate and email the invoice the day the work completes, then collect at pickup or through a payment link. Invoicing and collecting are separate events; tying the invoice to pickup means a customer who waits three days delays your paperwork too, for no reason.',
      },
      {
        q: 'How do shops handle parts added in the middle of a job?',
        a: 'The reliable rule is that a part goes on the repair order at the moment it goes on the vehicle, with the customer approving any supplemental charge before the work continues. Shops that reconstruct mid-job parts from memory at invoice time end up with wrong invoices and billing disputes.',
      },
    ],
  },
  {
    slug: 'real-cost-of-running-shop-on-paper',
    title: 'The Real Cost of Running Your Shop on Paper and Whiteboards',
    description: 'Paper ROs and whiteboard dispatch feel free. They\'re not. Here\'s what they actually cost your shop every month.',
    icon: Clipboard,
    readTime: '7 min',
    audience: 'Owners',
    publishedAt: '2026-06-04',
    updatedAt: '2026-11-11',
    content: [
      {
        type: 'paragraph',
        text: "Paper repair orders and a whiteboard on the wall have been running shops for decades. They're familiar, they don't crash, and they don't have a monthly fee. But they have a cost. It's just invisible until you add it up.",
      },
      {
        type: 'heading',
        text: 'The time cost: 5-8 hours per week in admin',
      },
      {
        type: 'paragraph',
        text: "Every paper RO has to be written by hand, filed somewhere, and eventually entered into whatever system you use for invoicing. Someone is re-typing information that was already written once. Someone is digging through a stack to find a specific job. Someone is calling the shop from home because they can't remember if the parts came in.",
      },
      {
        type: 'paragraph',
        text: "Conservative estimate: your service advisor spends 5-8 hours per week on tasks that exist only because your system is paper-based. At $25/hour fully loaded, that's $500-$800/month in labor just to maintain the paper system. That's already more than most shop management software costs.",
      },
      {
        type: 'heading',
        text: 'The visibility cost: decisions without data',
      },
      {
        type: 'paragraph',
        text: "With paper, you can't answer basic questions without physically being in the shop. How much revenue did we do this week? Which tech is most efficient? How many ROs are open right now? You either don't know, or you call someone to count.",
      },
      {
        type: 'paragraph',
        text: "Multi-location owners feel this the hardest. You can't look at a whiteboard in two shops at the same time. So you drive across town, or you call your manager and interrupt their day. Neither is a real solution.",
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
          "A customer disputes a charge and you can't find the authorization.",
          'Parts are used but never deducted from inventory counts.',
          'A vehicle comes back and you have no digital history to reference.',
        ],
      },
      {
        type: 'paragraph',
        text: "Each of these is a $50-$500 mistake. They happen weekly in paper-based shops. Over a year, the cumulative cost dwarfs any software subscription.",
      },
      {
        type: 'heading',
        text: 'Add it up for one real shop',
      },
      {
        type: 'paragraph',
        text: "Take a 6-bay shop doing 12 ROs a day, five days a week. Admin labor to feed the paper system: call it 6 hours a week at $25, so $650 a month. Missed charges: if just one labor line or part per week never makes the invoice, at an average of $85, that's about $370 a month. One lost or unbillable RO per month at a $400 average ticket: $400. That's roughly $1,400 a month, about $17,000 a year, before counting a single bad decision made on missing data. Against a software bill of $100-$200 a month, the paper system is the expensive option by a wide margin.",
      },
      {
        type: 'paragraph',
        text: "Run the same math with your own numbers. Even if you cut every estimate in half, paper still loses. And the estimate above leaves out the hardest cost to price: the jobs you turned away on a Friday because nobody could tell, without walking the lot and counting tickets, whether the shop had room to take one more car. Capacity you can't see is capacity you can't sell.",
      },
      {
        type: 'heading',
        text: 'The honest case for paper, and where it falls apart',
      },
      {
        type: 'paragraph',
        text: "Paper has real advantages, and pretending otherwise insults your intelligence. It never goes down. Every employee already knows how to use it. A clipboard survives a drop onto concrete. For a one-tech shop doing 3 ROs a day, paper plus a basic invoicing tool is genuinely defensible.",
      },
      {
        type: 'paragraph',
        text: "It falls apart with scale and with distance. The whiteboard works when everyone who needs the information can see the wall. The moment you add a second advisor, a second shift, or a second location, the wall stops being shared truth and starts being one person's version of it. And paper has no memory: when the customer from last March comes back, the whiteboard has been erased 200 times since.",
      },
      {
        type: 'heading',
        text: 'The compounding cost: no vehicle history',
      },
      {
        type: 'paragraph',
        text: "There's a slower cost that never shows up in a monthly tally: paper has no memory. When a customer returns after eight months, a digital system shows you every prior visit in two seconds: what was done, what was declined, what you flagged as \"watch this.\" That declined-work list is the cheapest sales pipeline you will ever own. The customer who passed on rear brakes in April at 4mm is a one-sentence conversation in November: \"Last time you were in, your rear brakes were close. Want us to check them while it's on the lift?\" Shops that work their declined-services list consistently add hundreds of dollars a week in work they had already diagnosed and simply never followed up on.",
      },
      {
        type: 'paragraph',
        text: "With paper, that history is theoretically in a file cabinet. In practice, nobody pulls the folder during a busy intake, so every visit starts from zero. You're not just losing the follow-up revenue. You're re-diagnosing things you already knew.",
      },
      {
        type: 'paragraph',
        text: "History also protects you. When a customer claims you touched their transmission last year and you didn't, the complete digital record of what you actually did is the difference between a two-minute conversation and a small-claims headache.",
      },
      {
        type: 'heading',
        text: 'How to switch without chaos',
      },
      {
        type: 'list',
        items: [
          'Start with new ROs only. Do not try to back-enter your file cabinet; let history build forward.',
          'Run paper and digital in parallel for two weeks, with digital as the official record.',
          'Pick one champion, usually your advisor, who learns the system first and fields questions.',
          'Keep the whiteboard up for 30 days as a mirror of the digital board, then take it down. If it still has information the system lacks, the system is misconfigured; fix that first.',
          'Enter your 20 most common parts with costs before day one, so estimates are fast immediately.',
        ],
      },
      {
        type: 'paragraph',
        text: "Most shops are fully switched in two to three weeks. The common failure mode isn't the software being hard. It's keeping paper as a permanent backup, which splits the truth into two places and gives you the worst of both.",
      },
      {
        type: 'heading',
        text: 'When to make the switch',
      },
      {
        type: 'paragraph',
        text: "If you're doing more than 5 ROs per day, the math already favors digital. The question isn't whether you can afford shop management software. It's whether you can afford to keep running without it. The paper system isn't free. You're just paying for it in ways that don't show up on a bill. If you want to see what the digital version of your shop looks like, ShopCommand has a free live demo at shopcommand.net/demo you can poke around in before talking to anyone.",
      },
    ],
    faqs: [
      {
        q: 'How much does it cost to run a repair shop on paper?',
        a: 'For a typical 6-bay shop, paper costs roughly $1,000-$1,500 a month once you count admin labor to re-enter information, missed charges that never reach invoices, and the occasional lost RO. The money never appears on a bill, which is why paper feels free when it is usually the most expensive system in the shop.',
      },
      {
        q: 'When should a shop move from paper ROs to software?',
        a: 'The usual threshold is about 5 repair orders a day. Above that volume, the admin time and missed charges from paper exceed the cost of software. A second advisor, a second shift, or a second location makes the case even stronger, because paper cannot be in two places at once.',
      },
      {
        q: 'How long does it take to switch a shop from paper to digital?',
        a: 'Most shops are fully switched in two to three weeks. Start with new ROs only rather than back-entering old files, run paper in parallel for the first two weeks with digital as the official record, and preload your most common parts so estimates are fast from day one.',
      },
      {
        q: 'Do techs who are used to paper adapt to shop software?',
        a: 'Yes, faster than owners expect, as long as the software is simple on a phone and the shop commits to one system. The failure mode is keeping paper around permanently as a backup; the team drifts back to it and you end up maintaining two half-accurate systems instead of one good one.',
      },
    ],
  },
  {
    slug: 'multi-location-owner-visibility',
    title: 'How Multi-Location Shop Owners Stay in Control Without Being On-Site',
    description: 'You can\'t be in every shop at once. Here\'s how owners with 2-10 locations manage without the check-in calls.',
    icon: BarChart3,
    readTime: '6 min',
    audience: 'Multi-Location Owners',
    publishedAt: '2026-06-02',
    updatedAt: '2026-11-11',
    content: [
      {
        type: 'paragraph',
        text: "You own three shops. It's 4pm. You want to know how the day went. Your options: drive to each location, call three managers and pull them away from customers, or log into your shop management platform and see everything in 30 seconds.",
      },
      {
        type: 'paragraph',
        text: "If option three isn't available to you, you're managing by phone, and you're always behind. Behind on slow days you could have caught at noon instead of hearing about at 4pm. Behind on the stuck RO that aged three days before anyone mentioned it. Behind on the location that's quietly drifting while the other two carry it.",
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
        text: "Multiply that by 3 locations and you're spending 45 minutes a day getting information that should take 30 seconds to read on a screen. That's almost four hours a week, 190 hours a year, spent collecting numbers instead of acting on them.",
      },
      {
        type: 'heading',
        text: 'What a multi-location dashboard actually shows you',
      },
      {
        type: 'list',
        items: [
          'Revenue per location: today, this week, this month. No phone call needed.',
          'Open RO count and status breakdown per shop.',
          'Which techs are clocked in at each location right now.',
          'Which location is ahead of target and which is behind.',
          'Flagged items: overdue ROs, missing parts, incomplete invoices.',
        ],
      },
      {
        type: 'heading',
        text: 'A worked example: the two-location owner',
      },
      {
        type: 'paragraph',
        text: "Say you run two shops, one doing $95,000 a month and one doing $70,000. On phone-call management, both \"had a pretty good month.\" On a dashboard, you notice the second shop's average ticket is $340 against $425 at the first, on nearly identical car counts. That's not a traffic problem, it's a sales process problem: the second shop's advisor isn't presenting inspections findings consistently. Closing half of that gap is worth roughly $7,000 a month, and you found it in five minutes of looking at numbers side by side. No phone call would ever have surfaced it, because nobody at either shop can see the other shop's tickets.",
      },
      {
        type: 'paragraph',
        text: "This is the real argument for cross-location visibility. It's not surveillance. It's that your locations are each other's best benchmark, and without shared numbers that benchmark goes unused.",
      },
      {
        type: 'heading',
        text: 'The five numbers worth checking daily',
      },
      {
        type: 'list',
        items: [
          'Revenue vs. target, per location. The headline number, but only the starting point.',
          'Completed-but-uninvoiced ROs older than one day. This is where cash leaks.',
          'ROs with no status change in 48 hours. Stuck work, stuck revenue, usually a stuck decision.',
          'Average ticket this week vs. trailing month. Early warning that sales process is slipping.',
          'Techs clocked in vs. scheduled. Tells you about staffing reality before a manager has to admit it.',
        ],
      },
      {
        type: 'paragraph',
        text: "Five numbers, two minutes per location. Anything deeper happens only when one of them looks wrong. That's the whole system. Resist the urge to track twenty metrics; dashboards die of clutter faster than they die of neglect. Five numbers you actually look at every day beat twenty you stopped reading in March.",
      },
      {
        type: 'heading',
        text: 'A weekly rhythm that replaces the daily calls',
      },
      {
        type: 'paragraph',
        text: "Daily numbers tell you what happened. The weekly conversation is where you decide what to do about it, and it works better when both sides walk in having seen the same screen. A format that works: 20 minutes per manager, Monday morning, looking at last week together. The manager talks first. You ask about the two or three numbers that moved, agree on one thing to improve this week, and write it down where you'll both see it next Monday. That's it. No surprise inspections, no gotcha calls, and the managers run their shops knowing exactly what you're looking at, because they're looking at the same thing.",
      },
      {
        type: 'paragraph',
        text: "Owners who adopt this rhythm consistently report the same shift: the time they used to spend collecting information gets reinvested in the things only an owner can do. Negotiating with the parts supplier. Scouting the third location. Taking an actual day off, with the dashboard on their phone if they get nervous.",
      },
      {
        type: 'paragraph',
        text: "Shared software also quietly standardizes your locations. When both shops write estimates, log parts, and close ROs the same way in the same system, your processes converge without a binder of procedures nobody reads. That standardization is what makes the third location possible: you're no longer cloning a manager's habits, you're cloning a system.",
      },
      {
        type: 'heading',
        text: "The manager's perspective",
      },
      {
        type: 'paragraph',
        text: "Your managers don't love the 4pm call either. They're managing the floor, handling customers, and coordinating techs. Stopping to give you a verbal report is a context switch that costs them momentum. When you can see the numbers yourself, you only call when something actually needs discussion, not for a daily status update.",
      },
      {
        type: 'paragraph',
        text: "One honest caution: visibility changes the relationship if you handle it badly. If your first move on seeing a slow day is an accusatory phone call, your managers will start managing the dashboard instead of the shop. Set the rule for yourself that data starts conversations, it doesn't end them. Ask \"what happened Tuesday?\" and listen; half the time there's a reason the dashboard can't show you, like a tech's kid in the hospital or a lift down for repair.",
      },
      {
        type: 'heading',
        text: 'Watch out for per-seat pricing at scale',
      },
      {
        type: 'paragraph',
        text: "Multi-location is where software pricing models bite. At $60 per user per month, two shops with 16 total staff cost you $960 a month, and the temptation is to share logins, which destroys the accountability you bought the system for. Look for per-location pricing with unlimited users, so adding a tech or a counter person never triggers a pricing conversation. ShopCommand prices this way deliberately: one flat rate per location, every employee gets their own login.",
      },
      {
        type: 'heading',
        text: 'One login, every location',
      },
      {
        type: 'paragraph',
        text: "The key is a single dashboard that aggregates all your shops without requiring separate logins or tab-switching. You see the whole business in one view: total revenue, total open work, total headcount. Then you drill into whichever location needs attention. The information comes to you. You don't go hunting for it.",
      },
    ],
    faqs: [
      {
        q: 'How do owners manage multiple repair shop locations remotely?',
        a: 'The owners who do it well rely on a single dashboard showing revenue, open ROs, and clocked-in staff across every location, then reserve phone calls for actual decisions. A five-number daily check, about two minutes per shop, replaces the afternoon status call and catches stuck work a day earlier.',
      },
      {
        q: 'What metrics should a multi-location shop owner check every day?',
        a: 'Five cover most of it: revenue versus target per location, completed ROs not yet invoiced, ROs unchanged for 48 hours, average ticket versus the trailing month, and techs clocked in versus scheduled. Everything else is drill-down you do only when one of those five looks off.',
      },
      {
        q: 'Do I need separate software accounts for each shop location?',
        a: 'No, and you should avoid platforms that work that way. Separate logins per location mean nobody can compare shops side by side, which is where most multi-location insight comes from. Look for one account, one dashboard, with per-location filtering and location-level permissions for staff.',
      },
      {
        q: 'How much does shop management software cost for multiple locations?',
        a: 'It varies widely by pricing model. Per-seat platforms at $50-$100 per user get expensive fast; 16 staff across two shops can run $800-$1,600 a month. Per-location pricing with unlimited users is usually far cheaper for multi-shop owners and avoids the shared-login problem entirely.',
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
    updatedAt: '2026-11-11',
    content: [
      {
        type: 'paragraph',
        text: "Parts are the second biggest cost in your shop after labor. But most independent shops track inventory with a spreadsheet, a visual check, or pure memory. The result: you order parts you already have, you run out of parts you need daily, and you have no idea where the shrinkage is happening.",
      },
      {
        type: 'heading',
        text: 'The three ways untracked inventory costs you',
      },
      {
        type: 'list',
        items: [
          "Stockouts: A tech needs brake pads you thought you had. Now the job is delayed a day while you wait on delivery. That's a bay sitting empty and a customer waiting.",
          'Overstocking: You ordered 20 oil filters because you weren\'t sure how many you had. You had 14. Now you have $120 in dead capital on the shelf.',
          "Shrinkage: Parts walk off the shelf and nobody notices because there's no system tracking what should be there. The average shop loses 2-5% of parts value to untracked shrinkage annually.",
        ],
      },
      {
        type: 'paragraph',
        text: "All three come from the same root: nobody can answer \"what do we have right now\" without walking to the shelf. Fix the visibility and all three costs shrink together.",
      },
      {
        type: 'heading',
        text: 'Put real numbers on it',
      },
      {
        type: 'paragraph',
        text: "A 6-bay shop typically carries $15,000-$30,000 in parts. Take the middle: $22,000. Shrinkage at 3% is $660 a year, and that's the smallest of the three costs. One stockout a week that delays a job a day costs you roughly a bay-day; at even four billable hours and a $120 labor rate, that's $480 a week of capacity, call it $1,900 a month, lost to parts you thought you had. Overstock is slower poison: $3,000-$5,000 of slow-moving parts is cash that could be a new lift, sitting on a shelf collecting dust and occasionally going obsolete when a model year ages out.",
      },
      {
        type: 'paragraph',
        text: "You don't need to eliminate all three. Cutting stockouts in half pays for the entire effort on its own.",
      },
      {
        type: 'heading',
        text: 'What practical inventory tracking looks like',
      },
      {
        type: 'paragraph',
        text: "You don't need a warehouse management system. You need basic visibility: what do we have, what did we use, and what do we need to reorder? When parts tracking is built into your shop management platform, every part added to an RO automatically deducts from inventory. No second step. No manual adjustment.",
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
        text: 'Auto-deduct is the feature that makes it stick',
      },
      {
        type: 'paragraph',
        text: "Every failed inventory effort dies the same way: the counts drift from reality because updating them is a separate chore, and after a month nobody trusts the numbers, so everyone goes back to looking at the shelf. The fix is structural, not motivational. When adding a part to a repair order is the same action that deducts it from stock, the count stays right as a side effect of billing correctly, which people already have a reason to do. One action, two records. That's the entire trick.",
      },
      {
        type: 'paragraph',
        text: "The flip side matters too: not everything belongs in inventory. The weird sensor you special-order once for one customer's 2009 wagon shouldn't become a permanent inventory record. A good system lets you add a one-off custom part directly to the RO, priced for that job, without polluting your stock list. Track the 150 parts you actually reuse; pass everything else straight through.",
      },
      {
        type: 'heading',
        text: 'Setting it up in one weekend',
      },
      {
        type: 'list',
        items: [
          'Friday: Export or write down your top 50 parts by usage. Oil filters, pads, rotors, wipers, fluids. These cover most of your volume.',
          'Saturday morning: Count only those 50, enter quantities, costs, and shelf locations. Two people, two to three hours.',
          'Saturday afternoon: Set reorder points. A workable default is two weeks of average usage, adjusted for supplier delivery time.',
          'Next month: Add parts as you touch them. A part you order twice gets a record; a one-off goes on the RO as a custom part and is forgotten.',
        ],
      },
      {
        type: 'paragraph',
        text: "Do not attempt a full count of every bolt and clip on day one. Shops that try stall at hour six, declare inventory impossible, and quit. Fifty accurate records beat eight hundred stale ones.",
      },
      {
        type: 'heading',
        text: 'The QR label workflow',
      },
      {
        type: 'paragraph',
        text: "Print a QR label for any part in your system. Stick it on the shelf or the bin. When anyone scans it with a phone camera, no app needed, they see the part details, current quantity, and last order date. Your parts counter staff spends less time looking things up, and your techs can self-serve for common items.",
      },
      {
        type: 'heading',
        text: 'What usage history tells you after 90 days',
      },
      {
        type: 'paragraph',
        text: "Once you have a quarter of real usage data, two reports earn their keep. The first is dead stock: anything with zero movement in 90 days. Pull it onto one shelf and make a decision per part: return it, use it in a promotion, or write it off. Most shops free up $1,500-$3,000 in the first pass, cash that was pretending to be an asset. The second is your true fast movers, which are rarely exactly what you'd have guessed. Those 20 parts deserve negotiated pricing with your supplier; a 5% improvement on the parts that make up 60% of your volume is worth more than a 15% deal on parts you buy twice a year.",
      },
      {
        type: 'paragraph',
        text: "Usage history also settles the stocking argument that every shop has. Should we stock that $190 wheel bearing? Opinion says maybe. Data says you've installed nine in the last quarter and waited on delivery for six of them. Stock two. The argument is over.",
      },
      {
        type: 'heading',
        text: 'Mistakes to avoid',
      },
      {
        type: 'list',
        items: [
          'Tracking everything on day one instead of your top movers. Start small, stay accurate.',
          'Letting parts leave the room without touching an RO. If it goes on a car, it goes on the order. No exceptions, including comebacks and warranty work.',
          'Setting reorder points once and never revisiting them. Usage changes with seasons; brake pads move differently in December.',
          'Skipping a quarterly spot check. Count 10 random parts every quarter; if more than one is off, find the leak in your process before it compounds.',
        ],
      },
      {
        type: 'paragraph',
        text: "Inventory tracking doesn't have to be complicated. It just has to exist. The bar is low, and the payoff is immediate. ShopCommand handles the auto-deduct, reorder alerts, and one-off custom parts as part of the same RO screen your advisors already work in.",
      },
    ],
    faqs: [
      {
        q: 'How do small auto repair shops track parts inventory?',
        a: 'The workable approach is tracking only the 50-150 parts the shop reuses, with quantity, cost, location, and a reorder point for each, inside the same software that handles repair orders. Parts deduct automatically when added to an RO, and one-off special orders go on the RO as custom parts without creating inventory records.',
      },
      {
        q: 'How much inventory shrinkage is normal in a repair shop?',
        a: 'Untracked shops typically lose 2-5% of parts value a year to shrinkage, which is $440-$1,100 on a $22,000 parts room. But shrinkage is usually the smallest cost; stockouts that idle bays and overstock that ties up cash each cost most shops more than theft or loss does.',
      },
      {
        q: 'What is a good reorder point for shop parts?',
        a: 'A solid default is two weeks of average usage, adjusted for how fast your supplier delivers. If you use 10 oil filters a week and delivery takes two days, a reorder point around 20-22 keeps you covered. Revisit the numbers quarterly, because usage shifts with seasons.',
      },
      {
        q: 'Should every part go into the inventory system?',
        a: 'No. Track parts you buy repeatedly; handle one-time special orders as custom parts priced on that repair order alone. Loading every one-off into inventory clutters the catalog with records that will never move again and makes counts slower and less accurate.',
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
    updatedAt: '2026-11-11',
    content: [
      {
        type: 'paragraph',
        text: "A repair order is the backbone of your shop. Every dollar of revenue, every hour of labor, and every part you sell flows through an RO. When ROs get stuck, lost, or mishandled, everything downstream breaks: invoicing is late, customers are frustrated, and revenue sits in limbo.",
      },
      {
        type: 'paragraph',
        text: "Here's what a clean RO workflow looks like when nothing falls through the cracks. Four stages, each with a clear owner and a clear exit condition, so a glance at any RO tells you exactly where it is and what has to happen next.",
      },
      {
        type: 'heading',
        text: 'Stage 1: Intake. Capture everything upfront',
      },
      {
        type: 'paragraph',
        text: "The customer arrives or calls. You create the RO with the customer name, vehicle info (year, make, model, VIN), and the stated complaint. This takes under two minutes in a good system. The RO is now open and visible to everyone in the shop.",
      },
      {
        type: 'paragraph',
        text: 'Key detail: capture the customer\'s complaint in their words. "It makes a grinding noise when I brake" is more useful than "brake inspection." Their words become the tech\'s starting point.',
      },
      {
        type: 'paragraph',
        text: "Two more intake habits pay off later. First, get a cell number and confirm texting is okay; every approval and status update downstream depends on being able to reach this person without phone tag. Second, note the promised time honestly. \"End of day\" promised to twelve customers is a promise to none of them. A good intake takes three minutes and prevents an hour of friction.",
      },
      {
        type: 'heading',
        text: 'Stage 2: Diagnosis and authorization',
      },
      {
        type: 'paragraph',
        text: "The tech inspects the vehicle and reports findings. The advisor builds an estimate with labor and parts, then contacts the customer for approval. In a digital workflow, this approval can happen via text or email. The customer sees exactly what they're authorizing and responds with a tap.",
      },
      {
        type: 'paragraph',
        text: "No approval, no work beyond diagnosis. This protects the shop and the customer relationship.",
      },
      {
        type: 'paragraph',
        text: "Timestamped digital approval also protects you in the specific moment it matters: the dispute. \"I never approved that\" is unanswerable when the authorization was a phone call three weeks ago. It's a ten-second conversation when you can show the customer their own approval, with the itemized estimate they saw, at 2:14pm on the 9th. Most shops only appreciate this feature the first time it saves them a $600 argument.",
      },
      {
        type: 'heading',
        text: 'Stage 3: Work, parts, and time tracking',
      },
      {
        type: 'paragraph',
        text: "Once authorized, the tech starts the job timer and begins work. Parts are pulled from inventory (or ordered) and added to the RO. Labor lines accumulate in real time. If the tech discovers additional work needed, the advisor creates a supplemental estimate and gets a second authorization before proceeding.",
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
        type: 'paragraph',
        text: "This stage is also where customers generate most of your inbound calls: \"is my car done yet?\" A customer-facing status link, where they can check progress themselves the way they'd track a package, removes most of those calls. Your advisor answers the phone less and sells more. In a shop fielding 20 status calls a day at three minutes each, that's an hour of advisor time recovered daily.",
      },
      {
        type: 'heading',
        text: 'Stage 4: Complete, invoice, collect',
      },
      {
        type: 'paragraph',
        text: "The tech marks the job complete. The advisor reviews: are all labor lines accounted for? Are parts correct? Is the customer authorization on file? One click generates the invoice from the RO data, no re-typing. The customer pays in-shop or receives a payment link. The RO closes, revenue posts, and inventory is already updated.",
      },
      {
        type: 'paragraph',
        text: "On larger tickets, partial payments belong in this stage. A customer facing a $1,800 repair who can put $900 down and pay the rest at pickup says yes more often than one staring at the full number. Send the invoice under your shop's name by email the day the work completes, even if pickup is tomorrow; the clock on getting paid starts when the invoice lands, not when the car leaves.",
      },
      {
        type: 'heading',
        text: 'Where ROs actually get stuck',
      },
      {
        type: 'paragraph',
        text: "In practice, ROs stall at the seams between stages, not inside them. The intake that never became an estimate because the advisor got busy. The estimate sitting \"awaiting approval\" for four days because nobody followed up after the first unanswered text. The completed job that nobody invoiced. Each seam needs an owner and an age limit: estimates older than 24 hours without customer contact get a follow-up, approvals older than 48 hours get a phone call, completed ROs get invoiced same day. If your system can show you every RO grouped by stage with its age, this review takes five minutes a morning.",
      },
      {
        type: 'heading',
        text: 'Two numbers that tell you the workflow is working',
      },
      {
        type: 'paragraph',
        text: "You don't need a wall of metrics to manage this. Two will do. The first is cycle time: how long an average RO takes from intake to paid. Measure your baseline for two weeks before changing anything, because improvement you can't measure is improvement you can't defend when the team asks why the new process is worth the bother. Shops moving from paper or loose digital habits to an enforced pipeline routinely cut a day or more out of their cycle, and every day removed is cash arriving sooner.",
      },
      {
        type: 'paragraph',
        text: "The second is supplemental approval rate: what percentage of mid-job recommendations customers say yes to. If it's low, the problem is almost never the customer. It's how the finding is presented. A photo of the worn part attached to the supplemental estimate, with a one-line plain-English explanation, routinely moves approval rates by double digits. The workflow gives you the delivery mechanism; the photo and the sentence are the craft.",
      },
      {
        type: 'heading',
        text: 'Mistakes to avoid',
      },
      {
        type: 'list',
        items: [
          'Starting work on a verbal okay and papering the approval afterward. The one time it goes wrong costs more than every minute it ever saved.',
          'Letting "complete" mean different things to different techs. Define it: work done, parts logged, ready for review.',
          'Writing estimates so vague the customer approves a number, not a scope. Itemize, or every supplemental becomes a fight.',
          'Treating the workflow as advice instead of structure. If the software allows skipping approval, approval will get skipped on the busiest day, which is exactly when you can least afford it.',
        ],
      },
      {
        type: 'paragraph',
        text: "The entire flow, intake to payment, should happen without anyone re-entering data, hunting for a paper ticket, or forgetting a step. When the system enforces the workflow, the workflow works. This four-stage pipeline, with approvals, timers, auto-deducting parts, and one-click invoicing, is the spine ShopCommand is built on.",
      },
    ],
    faqs: [
      {
        q: 'What are the stages of a repair order?',
        a: 'A clean RO lifecycle runs intake, estimate and authorization, work in progress, then complete, invoiced, and paid. Each stage has a clear owner and exit condition: no work without approval, no completion without parts and labor logged, no closed RO without an invoice. Most revenue leaks happen between stages, not inside them.',
      },
      {
        q: 'How should a shop get customer authorization for repairs?',
        a: 'Send an itemized estimate by text or email and have the customer approve digitally, so the authorization is timestamped and tied to the exact scope they saw. Verbal approvals work until a dispute, at which point a recorded digital approval turns a $600 argument into a ten-second conversation.',
      },
      {
        q: 'How do shops reduce "is my car ready" phone calls?',
        a: 'Give customers a status link they can check themselves, the way they track a package. When the RO moves from in progress to complete, the customer sees it without calling. Shops that add status visibility report noticeably fewer inbound calls, which frees the advisor to sell and write estimates.',
      },
      {
        q: 'Should repair shops take partial payments?',
        a: 'Yes, especially on tickets over $1,000. A deposit or split payment raises approval rates on big jobs and reduces the risk of finished vehicles sitting unclaimed. The invoice should still go out the day the work completes, with the balance collected at pickup or through a payment link.',
      },
    ],
  },
  {
    slug: 'what-to-look-for-in-shop-management-software',
    title: 'What to Look for in Auto Repair Shop Management Software',
    description: 'Not all shop management platforms are built the same. Here\'s what actually matters when you\'re evaluating your options.',
    icon: Search,
    readTime: '7 min',
    audience: 'Owners',
    publishedAt: '2026-05-26',
    updatedAt: '2026-11-11',
    content: [
      {
        type: 'paragraph',
        text: "There are a dozen shop management platforms on the market, and they all claim to do everything. But when you're actually running a shop, writing ROs, tracking techs, managing parts, sending invoices, the differences matter. Here's what to evaluate beyond the feature checklist.",
      },
      {
        type: 'heading',
        text: 'Speed matters more than features',
      },
      {
        type: 'paragraph',
        text: "Your service advisor is going to use this software 200 times a day. If it takes 3 seconds to load a page instead of 0.5 seconds, that's 8+ minutes of waiting per day. Over a month, that's hours of lost productivity, and a frustrated team that starts working around the system instead of in it.",
      },
      {
        type: 'paragraph',
        text: "Test the actual speed. Create an RO. Search for a customer. Pull up vehicle history. If any of those take more than a second, the tool will slow your shop down.",
      },
      {
        type: 'heading',
        text: 'Per-seat pricing adds up fast',
      },
      {
        type: 'paragraph',
        text: "Many platforms charge per user: $50-$100 per person per month. For a shop with an owner, two advisors, and six techs, that's $450-$900/month. And it creates a perverse incentive: you limit who gets access to keep costs down, which means techs can't see their jobs and advisors share logins.",
      },
      {
        type: 'paragraph',
        text: "Look for per-location pricing with unlimited users. Everyone who needs access should have it. Shared logins are a security and accountability problem.",
      },
      {
        type: 'paragraph',
        text: "Do the three-year math before you sign anything, because pricing models compound. That nine-person shop on per-seat pricing at $75 a head pays $675 a month, $24,300 over three years, and every new hire raises the bill. The same shop on flat per-location pricing at, say, $175 a month pays $6,300 over three years and hires freely. The sticker prices look comparable in a demo; the structures are not.",
      },
      {
        type: 'heading',
        text: "Multi-location support isn't an afterthought",
      },
      {
        type: 'paragraph',
        text: "If you have (or plan to have) more than one location, check whether the platform was built for it or bolted it on. Can you see all shops in one dashboard? Can you compare performance across locations? Or do you need separate logins for each shop?",
      },
      {
        type: 'paragraph',
        text: "Check the pricing structure for additional locations too. Some platforms charge full price for every shop; others discount additional locations because most of the setup is shared. If you're planning shop number two, this difference is worth real money.",
      },
      {
        type: 'heading',
        text: 'How the vendor handles problems tells you everything',
      },
      {
        type: 'paragraph',
        text: "Every platform has bugs. What varies, enormously, is what happens when you report one. Before you buy, email the vendor's support with a real question and time the response. Ask existing customers how long fixes actually take. Big platforms often route you through ticket queues where a workflow-breaking bug sits for a quarter; smaller vendors can ship fixes in days because the person reading your email can change the code.",
      },
      {
        type: 'paragraph',
        text: "This is worth a concrete example. ShopCommand's first founding shop, a truck repair shop in Illinois, filed six bug reports in its early weeks. Every fix shipped the same day. Whatever software you choose, that's the response standard to hold vendors to while your shop depends on their tool, and it's a fair question to ask any sales rep directly: what was your median time to fix last quarter?",
      },
      {
        type: 'heading',
        text: 'Questions to ask on every demo',
      },
      {
        type: 'list',
        items: [
          'What happens to my data if I leave? Get the export policy in writing before you import a single customer.',
          'What does onboarding cost, and who does the data migration, you or them?',
          'Is there a contract term, and what does month-to-month cost instead?',
          'Can a tech use it from a phone in the bay, or is the mobile version a stripped-down afterthought?',
          'How do customers approve estimates and pay? Watch the actual flow, not slides about it.',
          'When something breaks, who do I talk to, and how fast do fixes actually ship?',
        ],
      },
      {
        type: 'heading',
        text: 'Red flags worth walking away from',
      },
      {
        type: 'list',
        items: [
          'A required annual contract before you have used the product with real work.',
          'Setup or "implementation" fees over a few hundred dollars for a single shop. You are not deploying an ERP.',
          'No self-serve demo or trial. If they will only show it to you on a guided call, ask yourself why.',
          'Vague answers about data export. Your customer list and vehicle history are your business; hostage data is the oldest lock-in trick in software.',
          'A mobile experience that is clearly a port. Your techs live on their phones; if the demo dodges the phone view, the phone view is bad.',
        ],
      },
      {
        type: 'heading',
        text: 'Plan the migration before you pick the platform',
      },
      {
        type: 'paragraph',
        text: "Most software evaluations ignore the part that actually hurts: getting your existing world into the new system. Ask specifically what imports and what doesn't. Customers and vehicles usually transfer cleanly from a spreadsheet export. Full RO history often doesn't, and that's more acceptable than it sounds: let history build forward from day one and keep read-only access to the old system for 90 days for lookups. What you should insist on importing is your customer list, vehicle list, and parts catalog with costs, because re-typing those by hand is the task that stalls switches for months.",
      },
      {
        type: 'paragraph',
        text: "Also ask who does the work. Some vendors hand you a CSV template and wish you luck; others do the import for you from whatever export your current system produces. For a solo owner, that difference is a weekend.",
      },
      {
        type: 'heading',
        text: 'A note on early-adopter pricing',
      },
      {
        type: 'paragraph',
        text: "Newer platforms often offer founding or early-adopter rates well below their eventual list price, locked in permanently, in exchange for feedback while the product matures. ShopCommand, for the record, does this: founding members pay $100 a month for their first shop and $50 for each additional location, locked for life against a planned standard rate of $175 plus $100 per location, with 25 founding spots. The honest trade-off runs both ways. You get a permanently lower bill and direct influence on the roadmap; you accept a younger product with gaps a ten-year-old platform has filled. Whether that trade makes sense depends on how responsive the vendor is when you hit one of those gaps, which is exactly why the support test above matters more for young platforms, not less.",
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
          'Data export: your data is yours, always.',
          'No long-term contract or implementation fee.',
        ],
      },
      {
        type: 'paragraph',
        text: "Skip the flashy demos and test it with your real workflow. Add a customer, create an RO, assign a tech, add parts, generate an invoice. If that flow feels fast and natural, you've found your tool. If it feels clunky, it'll feel clunkier at 3pm on a busy Tuesday. ShopCommand's demo at shopcommand.net/demo is open for exactly this kind of kick-the-tires testing, no sales call required.",
      },
    ],
    faqs: [
      {
        q: 'How much does auto repair shop management software cost?',
        a: 'Per-seat platforms run $50-$100 per user per month, which puts a nine-person shop at $450-$900 monthly. Flat per-location pricing typically lands between $100 and $300 a month regardless of headcount. Over three years the structures diverge by $15,000 or more for a typical shop, so model your actual team size before comparing sticker prices.',
      },
      {
        q: 'What features matter most in shop management software?',
        a: 'The full RO lifecycle from intake through payment, a built-in time clock tied to repair orders, parts inventory that auto-deducts, digital customer approvals, and genuinely fast page loads. Speed is underrated: your advisor touches the system 200 times a day, and a slow tool gets worked around instead of used.',
      },
      {
        q: 'How do I test shop software before committing?',
        a: 'Run your real workflow in a demo or trial: add a customer, create an RO, assign a tech, add parts, generate an invoice, and try it from a phone. Time each step. Then email support with a real question and see how fast and how well they answer. That response is what breakage will feel like later.',
      },
      {
        q: 'What are red flags when choosing shop management software?',
        a: 'Required annual contracts before you have used the product, large implementation fees for a single shop, no self-serve trial, vague or evasive answers about exporting your data, and a mobile experience the demo avoids showing. Any one of these is worth pausing on; two or more are worth walking away from.',
      },
    ],
  },
]

export default articles
