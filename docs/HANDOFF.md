# ShopCommand Handoff

Last updated: 2026-11-17 (late evening)

## Project Summary

ShopCommand is a multi-location auto and truck repair shop management SaaS. Stack: React 18, Vite, Tailwind, Clerk auth, Neon Postgres, Vercel serverless functions in /api. Folder: C:\Users\rashe\shopcommand. Live at shopcommand.net (www redirects to the non-www host in vercel.json). Pushing to master auto-deploys to production on Vercel. Founder: Rasheed Omar, Houston.

Pricing: founders rate is $100/mo for the first shop and $50/mo for each additional location, locked for life. Standard pricing is $175 plus $100 per additional location.

The first paying customer is J2M Truck Repair (owner Maher F. Mansour, Chicago Ridge IL, same time zone as Houston). Their parts manager Trinity sends in bug reports. J2M's account belongs to them: never log in to it or test with it. "Omar's Auto" (plan founding, no Stripe customer) is the founder's OWN real shop and is not J2M.

Roles in the app: owner, advisor, tech. There is no manager role. Owners get everything (billing, invites, all shops, Technicians, Reports, deleting ROs). Advisors are the front desk and are limited to their own shop on at least the Estimates page. Techs only get the tech board, can move a job only to In Progress or Complete, and cannot create ROs, manage parts, invoice, or send estimates for approval.

Tests: vitest, files in /tests, run with `npx vitest run` (118 passing on Nov 17). Run them and `npm run build` before every push.

## Current State

Stripe (live mode, account acct_1TdfHdDyrARKmiET):
- Fully configured. Checkout, branding, receipts, invoices, trial reminders, failed-payment emails, hosted confirmation links, dunning reminders, customer portal, and a public Stripe profile (handle @shopcmd) are all set up.
- Webhook endpoint "shopcommand-production" points at https://shopcommand.net/api/stripe?action=webhook and listens to six events: checkout.session.completed, customer.subscription.deleted, customer.subscription.updated, invoice.payment_failed, invoice.paid, customer.subscription.trial_will_end. The signing secret is in the Vercel environment.
- J2M is recorded as plan "founding" with their Stripe IDs. Verified read-only on Nov 17: one active subscription, one item (founding_base, $100, quantity 1), no cancellation pending.
- Subscriptions use two items by shop count (founding_base quantity 1, founding_additional_shop quantity shops minus 1), kept in sync by api/_lib/billing.js. Prices are created lazily in Stripe by lookup key.
- Stripe MCP connector is authorized (read-only use). Tax is not enabled. See Parked.

Free trial system (commit 32ec338): new orgs get trial_ends_at = signup plus 14 days; NULL means a legacy org (exempt); plan "founding" means paid and exempt. Expired unpaid orgs get HTTP 402 subscription_required on writes (reads stay open; fails open). Banner and full-screen lock in the app; Stripe checkout uses the remaining days as trial_period_days.

Shipped to production on Nov 17 (all on master):
- eb48414 Billing total in Settings sums every subscription item. Added a texting add-on price (lookup key sms_addon, PLACEHOLDER $15/mo) and syncSmsAddon() in billing.js. Nothing calls them, so nothing exists in Stripe for it. organizations.sms_enabled (boolean) was added in Neon; nothing reads it yet.
- ff705b3 and f988225 Customer estimate approval links, then improved emails and an RO deep link (details below).
- 570baec Onboarding rework and email-bound invites (details below). f20013a "Not getting a code? Try signing in" hint under the sign-up form. 620ab78 sign-out link on the onboarding page.
- c8b4ddf RO number (RO-20261117-0001) shown instead of the database UUID everywhere (helper roLabel in src/lib/utils.js). Keep using ro.id for keys, timers, links, and lookups.
- de7b684 Invoice edit no longer drops sales tax (details under Money).
- 22f68e8 and 50fe90f Exact cents on invoice lines/totals, estimate panel, RO totals, service packet, part prices (formatMoney). Aggregates (revenue, MTD, averages, tech pay) intentionally stay whole dollars (formatCurrency). 50fe90f is READY in production. Rollback target if needed: the 50fe90f deployment (dpl_4bkKzda3YT1ycHFfTAuVVdnw3AMi); the one before it is 22f68e8 (dpl_FmaK8hHbafj7JsDERqW7j6dywsmH).
- e044462 New orgs start on plan 'trial' (see Money section note on the trial plan fix); schema default and the live Neon column default are 'trial'.
- 01e36f9 Trial copy: the in-app 14-day trial starts at signup with no card; Stripe checkout only covers the days remaining (api/stripe.js trial_period_days), and an expired trial gets no Stripe trial (charged at once from the lock screen). Billing tab button now says "Add a card to keep your account"; banner button says "Add a card".
- 5f8e89b Location billing: the Settings > Locations add form shows the +$50/mo, the new monthly total and when it is charged; the button reads "Add Location (+$50/mo)". POST /api/shops now undoes the new shop, realigns Stripe, and returns 502 billing_failed if the subscription cannot be updated (so no unbilled shop). A failed billing update when removing a shop tells the owner the amount has not changed yet. Tests in tests/shops-billing.test.js (122 tests total).

How shop count and billing work: before subscribing, shops are free and untracked in Stripe; checkout counts the shops that exist at that moment. After subscribing, adding a shop is a quantity update on founding_additional_shop with create_prorations (the prorated amount goes on the next invoice, believed Stripe default, not yet verified on a real invoice); removing a shop drops the amount at next renewal with no refund; during Stripe's trial the quantity changes without charging. Locked orgs cannot add shops (402).

Verified live by the founder on Nov 17: onboarding tests 1 to 6 all passed (returning owner login goes straight to dashboard; new owner creates a shop; technician joins by code with no email and lands on the tech board; advisor joins with a matching-email invite; mismatched email is refused and the code stays usable; invite form email field and "Only works for" note). The approval flow worked end to end: emailed link opened, approved with a typed name, shop notification email arrived. The customer email landed in SPAM (see Deliverability).

Live checks of the invoice edit fix, exact cents on estimates and invoices (invoice shows $89.99 + $7.65 tax = $97.64), and RO numbers on the tech board were done by the founder late Nov 17 and all came out fine.

Approval links:
- Link /approve/{roId}/{token}. Token is 32 random bytes; only its SHA-256 hash is stored in repair_orders.data.approval. Expires in 14 days; generating a new link replaces the old one (the shop UI reuses the current link for copy/QR/email within a session). No database change.
- Shop side: RODetailModal estimate panel has Email approval link, Copy link, QR code. Estimates page has Declined status. The shop list auto-refreshes every 30 seconds. Repair orders page opens /repair-orders?ro=<id> (used by notification emails), scoped like the list.
- Customer page ApproveEstimate.jsx is mobile first, exact cents, needs a typed name plus checkbox. The server requires the exact total the customer saw, so an estimate edited after sending cannot be approved at a stale price.
- Public routes are in api/health.js (action=approval GET, action=approval-respond POST), link creation in api/repair-orders.js (action=approval-link), shared logic in api/_lib/approval.js and api/_lib/approval-email.js. The api folder has 12 function files, believed to be the Hobby cap, so new routes go into existing files.
- Customer email: styled HTML plus text, first-name greeting, work summary, expiry date, shop phone and address, safety line, quoted sanitized sender name, reply-to is the staff member who sent it. Shop notification names the shop, customer name and phone, and links to the RO. The Resend SDK returns { error } instead of throwing; the code checks it.
- Known edges: reverting an RO to Estimate can make an unexpired old link usable again. Texting the link is not built (needs Twilio). Link email only works if the customer has an email on file.

Onboarding (570baec, f20013a, 620ab78):
- Page forwards already-onboarded users; the server lookup (GET /api/onboard?action=check) finds any existing user by clerk_id and repairs their Clerk profile. Two choices: "Set up my shop" and "I have an invite code"; the invite decides the role (old clients that send a role still work). Signed-out visitors go to sign-in. Sign-out link shows "Signed in as <email>" on every step.
- Invite email rule: an invite with an email only works for an account with that same VERIFIED email (case-insensitive). Settings invite form has the optional email field; server validates and lowercases it. Invites without an email stay open to the code holder.
- Clerk email enumeration protection stays ON (decision): signing up with an existing email shows the normal code screen and emails the real owner a notice. Password sign-in is kept. The sign-up form has Clerk's show-password eye icon; there is no retype field.

Clerk (IMPORTANT, found Nov 17): production runs on a Clerk DEVELOPMENT instance (publishable key pk_test, frontend domain clerk.accounts.dev). Not meant for production: limits, emails say "[Development]" from noreply@accounts.dev and may land in spam, dev-browser handshake. Likely cause of two different verification codes seconds apart from one click (unconfirmed). Fix: a Clerk production instance with DNS records on shopcommand.net and new keys in Vercel; vercel.json CSP currently allows *.clerk.accounts.dev and must change. Subscriptions and all shop data hang off the organization and are NOT affected; only the login identity changes (new clerk_id). Plan: people sign in with an emailed code and the app links the new login to the existing users row by VERIFIED email (to be built) and restores metadata. Passwords do not carry over. Warn J2M first. Verify Clerk's migration docs before starting. Not urgent, easier with few users. A separate Clerk dev instance is still needed for staging.

Deliverability: customer-facing mail sends from notifications@shopcommand.net via Resend. DNS looked right on Nov 17 (DKIM present, SPF on the send subdomain, DMARC p=none). First approval email landed in spam, most likely a new sender. Check Gmail "Show original" for SPF/DKIM/DMARC results; mark Not spam to warm up; tighten DMARC later.

Competitor audit vs the Shop Tech Score article (Nov 17):
- Has: ROs, estimates, invoices with email, multi-location pricing, tech time clocking, parts and inventory with order tracking, VIN decode (NHTSA), Resend email, basic RO inspection checklist with photo upload, customer approval link.
- Missing: two-way texting, QuickBooks, PartsTech/CARFAX supplier ordering, MOTOR labor guide, DVI sent to the customer with photo and video, real card processing. Inspections and Messages pages show demo data only; real accounts see empty lists.
- Landing page labels QuickBooks, PartsTech, CARFAX, Worldpac as "Planned integrations"; compare pages mark texting and integrations as "Coming".

Google Search Console (property under rasheedomar12345@gmail.com, browser profile /u/1): 9 pages submitted so far, several confirmed indexed, sitemap fresh, Request Indexing quota roughly 10 per day.

## Money (invoices, tax, revenue)

Fixed: de7b684. Database invoices store amount = repair order total, which INCLUDES tax, while editable lines are BEFORE tax. Any invoice edit used to re-save the amount as the line sum, dropping tax. Now src/lib/invoiceEdit.js: an edit never changes the amount unless the line items change; changed lines re-price at the invoice's own tax basis (fallback 8.5%); the invoice screen shows lines, real tax, and total; the edited total is also written back to the RO. Neon checks run Nov 17: no invoice amount differed from its RO total, and no RO with lines had total 0 (invoice count not confirmed, so the empty result may mean few invoices).

Verified: the tech board's "Revenue (MTD) $98" was a Paid test RO (RO-20261111-0001, $97.64). Approved ROs are not counted.

NOT fixed yet:
- repair_orders.total is only written by "Save estimate", markPaid, and invoice edits. Lines changed after the last save, or an RO approved with the "Customer approved estimate" button without ever clicking Save estimate (total stays 0), can produce a stale or $0 invoice. The invoice email shows the gap as a "Tax" line.
- Tax rate is hard-coded 8.5% (RO modal, service packet, approval page) but 8.25% on the invoice screen for device-only invoices and the free invoice tools. No per-shop tax setting. Tax rules for parts vs labor vary by state; ask each shop's accountant.
- Revenue (MTD) sums repair_orders.total (tax-inclusive) for Complete, Invoiced, Paid by updated_at, so it includes tax, counts unbilled Complete work, and edits to old ROs move them into the current month.
- Plan, in order: (1) per-shop tax rate setting used everywhere, after asking J2M how they charge tax (question 10 on the call script); (2) derive RO total on the server whenever lines change; (3) split revenue into Billed (before tax, by invoice date), Collected (payments table), and Unbilled work.

## What Was Done

1. Invoice editing rework (Nov 12), Stripe audit and webhook fix, lifecycle webhooks, 14-day trial system, Google Search Console round one, Stripe email automation and branding, hosted Stripe MCP authorized.
2. Nov 17: billing total fix and texting add-on helper; approval links and emails; onboarding rework and invite email rule; sign-up hint; sign-out link; RO number display; invoice edit tax fix; exact-cents display. 118 tests in /tests.
3. Cost modeling for 50 shops (see Key Decisions). Reviewed the MentionAgent cold email pointing at the Shop Tech Score guide; decided to pitch hello@shoptechscore.com ourselves (multi-location and heavy-duty angle) after verifying the site. No email sent to anyone.
4. Test cleanup in the founder's own shop (Omar's Auto): two test members (Rick O Omar tech, Rick Owens advisor) were removed from the database with their used invite codes and 2 time entries, verified with a check query. Their Clerk users were also deleted in the Clerk dashboard. The throwaway "Main Street Auto" org (1 shop, 2 users, 2 invites, no Stripe data) was deleted from Neon and verified as zero rows left; the Clerk users were deleted too.

FIXED (Nov 17, pending deploy): organizations.plan used to default to 'founding', which the code treats as paid and exempt from the trial lock (api/health.js, api/_lib/handler.js), so new signups' 14-day trials never expired. Now api/onboard.js inserts plan 'trial', db/schema.sql defaults to 'trial', and the live column default was changed in Neon (verified 'trial'::text). 'founding' is set only when Stripe checkout completes (api/stripe.js). No real customer was affected: the only founding orgs without a Stripe subscription were three test shops (Omar's Auto, Ray's Auto, ev center), all legacy with trial_ends_at NULL (exempt), left unchanged. Still to verify with a real new signup: the app shows a 14-day countdown, not a paid state.
5. J2M call prep (call planned Wed Nov 18, about 10 AM Central). Trinity replied from the shop address with her number (708) 522-1155; shop line 708-522-2999. A reply email confirming the call was drafted; confirm whether it was sent. The call script is C:\Users\rashe\My Projects\docs\j2m-call-script.html (fillable, notes autosave in the browser) and .pdf (one page). It is outside the repo. Questions are written as full spoken sentences. It includes the tax question (#10), a follow-up asking whether they edited invoices, a "mention only if it fits" box (estimate link as an offer at the end, staff invites only if raised), and an Avoid list.
6. Maher outreach: check-in email and recap email drafted earlier; referral offer is one free month per referred shop that becomes paid.

## Key Decisions

- Trial length stays 14 days. Data is never locked after a trial ends. Existing orgs are grandfathered with trial_ends_at NULL.
- Database changes go through the user's Neon SQL console, run BEFORE pushing code that reads a new column. For deletes, run a read-only preview first and check foreign keys (users is referenced by repair_orders advisor_id/tech_id set null, time_entries tech_id cascade, invites created_by/used_by no action).
- Stripe tooling is read-only guidance; anything that moves or changes money stays in the user's hands. App code (billing.js) does create products and prices lazily in live Stripe by lookup key.
- Referral program: one free month ($100 credit on the referrer's Stripe customer balance, applied by the user) per referred shop that becomes PAID. No promo code for now; ask "who sent you?" at signup.
- Texting will be a paid flat monthly add-on (third subscription item, placeholder $15/mo, confirm before enabling). Built last: needs Twilio, US 10DLC registration, ongoing cost. Twilio pricing checked Nov 17: about $0.0083 per segment plus carrier fees, $1.15/mo per number, brand registration about $46, campaign vetting $15, campaign $1.50 to $10/mo; per-shop registration for an ISV setup unconfirmed.
- Infrastructure at 50 shops without texting: about $50 to $120/mo plus Stripe fees (2.9% + 30 cents, 0.7% Billing); texting adds about $250/mo. QuickBooks API has a free Builder tier but paid tiers conflict across sources; PartsTech terms unchecked.
- Approval links use an unguessable hashed token, 14-day expiry, and always the https://shopcommand.net host.
- Onboarding: the invite code decides the role; email-bound invites require a verified matching email. Keep password sign-in and Clerk's enumeration protection for now.
- Stripe Tax deferred until about the 5th to 10th customer. Handle @shopcommand was taken, @shopcmd is used. Retention coupons skipped.

## Standing Rules

- No em dashes in any email or customer-facing copy.
- Every email draft ends with "Thanks," then "Rasheed Omar" and "ShopCommand" on separate lines (the user's real signature). Do not flatten it.
- Never commit secrets, credentials, or .env files. Do not paste or print environment variable values; secrets go straight into Vercel.
- Database work goes through the user's Neon SQL console. Node scripts reading .env or DATABASE_URL get blocked by the auto-mode classifier.
- Tenancy is enforced only by WHERE org_id = user.orgId in every query (no active row-level security). Public token routes derive the org from the row.
- On Windows PowerShell 5.1, Get-Content, -replace, and Set-Content corrupt UTF-8. Use the Edit tool for file text changes. Write commit messages to a file and use git commit -F.
- Commit attribution line is whatever the current session's system reminder specifies. Do not commit or push without being asked. After a push, check the Vercel deployment reaches READY and note the previous READY deployment as the rollback target.
- Environment variable changes need a fresh Vercel deploy to take effect.
- Never log in to or test with J2M's account. Test with the founder's own accounts (Gmail plus-addresses are separate Clerk accounts). Make test invites from a separate throwaway shop, not from Omar's Auto.
- Vercel Preview deployments are NOT a safe sandbox: DATABASE_URL, Clerk keys, and Stripe keys exist for Production and Preview (RESEND_API_KEY is Production only), so a preview would hit the live database and live Stripe.
- Display rules: show RO numbers with roLabel(ro), never the raw id. Use formatMoney (cents) for exact amounts and formatCurrency (whole dollars) only for aggregates.
- New logic gets tests in /tests. Do what was asked, nothing more; prefer editing existing files; do not create documentation files unless asked; read a file before editing it.

## J2M feedback from the Nov 18 call (Trinity, in progress; call was paused, a text was sent asking for a callback and a photo of their paper invoice)

Trinity uses only invoices, estimates and parts; she has not used repair orders. Her notes and what the code review found:
- Parts, price blank on every edit: FIXED locally (uncommitted). The Edit Part form turned a $0 price into a blank required field (Parts.jsx). It now keeps 0.
- Parts, minimum quantity resets: add-part turned an explicit 0 into 2 (api/health.js, `Number(min_qty) || 2`); fixed locally. The minimum also had no tap-to-edit like quantity; the Min column is now tap-to-edit (QtyCell with field="minQty"). Not confirmed this is exactly what she hit (ask: new parts or existing). Parts auto-created from RO part requests still default min to 2 (Parts.jsx, addPart minQty: 2).
- Related, not fixed: update-part uses COALESCE with `x?.trim() || null`, so clearing SKU or vendor to empty cannot be saved.
- Parts notes ("3/4 heater hose sold by foot"): needs a notes column on the parts table (migration), then form, API, list. Ask whether notes should print on estimates and invoices. SKU / VIN already exists as one field.
- IMPORTANT RISK: invoices made from scratch in the Invoice Generator (what Trinity does) are saved only in the browser (localStorage key sc_invoices). POST /api/invoices requires an ro_id and invoices.ro_id is NOT NULL in the schema, so no-RO invoices cannot exist on the server. They can vanish if browser data is cleared and are invisible to other devices, to Maher, and to reports. Plan: migration making ro_id optional with customer, vehicle, lines and notes stored on the invoice; a one-time import of the browser's sc_invoices on first load after the fix (keep reading sc_invoices until the import finishes); autosave drafts. Interim advice to Trinity: same computer and browser, do not clear browsing data, press Export weekly (not yet verified that Export includes local invoices).
- Print / PDF on a saved invoice closes the detail view and rebuilds from the original services (Invoices.jsx onPrint, InvoiceGeneratorModal itemsFromInvoice), so edits do not carry over and it looks like a new invoice. itemsFromInvoice also appends a dash plus the word "labor" or "parts" to every description, which she deletes each time. Plan: print the saved invoice directly and drop the suffix.
- Invoice generator has one Customer and one Vehicle box. She needs company name, customer name, truck number, year/make, VIN, and a truck number bubble in the add-customer form; the schema has no company on customers and no unit/truck number on vehicles (vehicles has vin and license). She sent a photo of their paper invoice (not seen by Claude); the printed layout should match it.
- Her paper form (photo): J2M's old handwritten work order, which they used before ShopCommand and want as a paper fallback if the system is ever down. Fields: date, company name, customer name, phone, year, truck #, make/model, VIN #, mileage; Diagnostics and Parts ruled columns (no prices); technician, customer signature, notes. BUILT (Invoices page, "Blank form" button, src/components/modals/BlankFormModal.jsx): prints a blank copy of this layout with the shop's name, address and phone; no logo yet (need J2M's logo as an image file) and no shop email column exists. Next: a filled-in version once the invoice migration adds company name, truck #, mileage and diagnostics.
- Shipped Nov 18 afternoon (cb7263e and earlier): price blank and minimum-0 fixes, Min tap-to-edit, Qty/Min boxes on desktop and phone, unsaved-changes warning, generator autosave of from-scratch drafts (device-local, one slot), Print / PDF prints the saved invoice directly (no generator screen), generator no longer appends a dash suffix, Billing tab shows trial end date and days left.
- Questions still open for her: where she makes estimates (estimates normally live as repair orders in Estimate stage), how many invoices she has, truck number meaning (their fleet number? trailer too?), how she sends estimates, how Maher's friend found us, referrals, OK to quote, follow-up date.

## Signup funnel (Nov 18 evening; shipped in 42b1e14 and ab5784d)

Missy Hein signed up Oct 5, 2026 and never finished onboarding (no users row, no org; confirmed with two empty Neon queries); found by chance in the Clerk dashboard. In October the page showed three role cards (Owner / Manager, Service Advisor, Technician), where a non-owner without an invite code hit a dead end; why she stopped is unknown. A friendly email to her was scheduled by hand in Zoho for Nov 19 9:00 AM. Changes built after the onboarding read-through:
- Founder alerts (api/_lib/founder-alert.js, used by api/onboard.js): a plain-text email to hello@shopcommand.net (override with env FOUNDER_ALERT_EMAIL) when (1) a new account first reaches onboarding (once per account, remembered in Clerk privateMetadata.signupAlerted, only marked after a successful send), (2) a shop is created, (3) someone joins with an invite code. If the "started onboarding" email is not followed by a "shop created" or "joined" email within a day or two, they are probably stuck: send a short note. Alerts never block or fail onboarding; they need RESEND_API_KEY, which is Production only.
- Onboarding page: a "14-day free trial, no card needed" line, a "Stuck? Email hello@shopcommand.net" line, and an "I own a shop. Set up my own shop instead" shortcut on the invite-code step.
- Sign-up and sign-in: a loading card while the Clerk form loads, a phone-only pitch above the sign-up form, and a "14-day free trial, no card needed" bullet on the desktop panel.
- Onboarding shop-name step (ab5784d): optional shop address and phone, saved with the shop (api/onboard.js trims them; blank or non-text values stay empty). Before this, a shop was created with only a name, so first invoices, the blank form and customer emails had a blank header.
- Dashboard "Finish setting up" card (ab5784d; src/components/SetupChecklist.jsx, rules in src/lib/setupChecklist.js with tests): owners only. Steps: shop address and phone (every shop needs both), first repair order or invoice, parts, invite the team (optional, never blocks completion), and add a card (only for owners on a free trial, with days left; paying and legacy accounts never see it). Hides itself when the required steps are done, waits for real data, stays hidden if the data fetch failed, and the owner can hide it (remembered per browser in localStorage sc_setup_hidden_<orgId>, so it returns on a new browser). Everything is computed from data the app already loads; nothing new is stored on the server.
- Settings now opens the section named in ?tab= (locations, team, billing...). Stripe's cancel return (/settings?tab=billing) and the checklist links relied on this, but it was ignored before, so people always landed on the first tab.
- The "started onboarding" alert also fires for staff who sign up with an invite code, since they reach the same page. Expected.
- Still the bigger risk: production runs on a Clerk DEVELOPMENT instance (emails say "[Development]" and may land in spam). Moving to a production instance remains the proper fix.
- Seen only in the demo or by tests, never on a real account yet: the checklist card (checked in demo with a temporary override that was removed), the new onboarding fields, the alert emails (Resend only runs in production), the Billing tab trial line, Print / PDF and the blank form on a real printer.

## Open Items

Waiting on the user:
- Confirm ab5784d reached READY, then sign up a fresh test owner with a plus-address and check: both alert emails arrive ("started onboarding", then "New shop created"); the shop-name step shows the optional address and phone; the dashboard shows "Finish setting up" starting with the address and phone step if skipped; its links work and the card disappears when the basics are done; the 14-day trial banner counts down. Then ask Claude to write the cleanup for that test org and delete the Clerk user.
- Reply from Trinity (text sent Nov 18 afternoon asking for a callback and a photo of the paper invoice).
- Confirm whether the Trinity reply was sent; take the J2M call and write down their answer on tax (parts only or labor too, rate) and whether they edited invoices. Then send the recap email.
- Rick Owens and Rick O Omar were deleted from the Clerk dashboard (done).
- After the trial plan fix deploys, sign up a fresh test owner and confirm the 14-day countdown shows (then clean it up).
- On a test account with no subscription, try Settings > Locations > Add Location: the price note shows and the shop is added with no charge. Do not test on J2M. The first time a real subscribed org adds a shop, check that the prorated $50 appears on their next invoice as expected.
- Known edge, not fixed: a legacy org (no trial date) that cancels stays unlocked, because the lock needs a trial date.
- Confirm the Stripe customer portal changes were saved and the "trial over" statement descriptor toggle is on.
- Check Vercel plan (Hobby vs Pro; Hobby commercial-use terms now that J2M pays) plus Neon, Clerk, Resend plans and usage. Confirm how many invoices exist (SELECT COUNT(*) FROM invoices;).
- Waiting on Trinity's answer about how Maher's friend found ShopCommand. Decide the real texting add-on price and whether managers need a role.

Prospects (cold emails drafted earlier, subject "six locations, one screen"): Clutch Automotive (Matthew Schwab, about 6 Houston-area locations), Adams Automotive (Perry Adams, about 3 locations), Ripley's Total Car Care (needs verification). Two research agents (Texas multi-location independents; truck and diesel shops with a Fullbay angle, excluding J2M) should be relaunched.

Feature roadmap (recommended order): send inspections to the customer with photos, QuickBooks sync, two-way texting (paid add-on), PartsTech.

Parked:
- Stripe Tax: invoices show "No tax rate applied". Revisit around customers 5 to 10.
- Public support address on Stripe is the founder's home address; consider a virtual business address.
- Revisit trial length only with evidence (3 or more lock-outs that did not convert).
- Onboarding hardening: one transaction for org, shop, and user creation, remove the ALTER TABLE from the signup request, secure random invite codes, rename "Owner / Manager" to "Shop owner", invite links by email.
- Header search results open the RO list, not the specific RO (could use the ?ro= deep link).
- Remaining Search Console pages: alternatives/mitchell1, alternatives/shop-ware, alternatives/ro-writer, and remaining resource articles.

## Next Options

Ranked by recommendation:

1. J2M call (Wed Nov 18) using the call script, then record their tax answer.
2. Per-shop tax rate setting used on estimates, the approval page, packets, and invoices, plus server-calculated RO totals (after the call).
3. Split revenue into Billed, Collected, and Unbilled.
4. Verify the trial plan fix with a fresh signup after deploy.
5. Plan the Clerk production instance move and a proper staging environment (Neon branch, Clerk dev instance, Stripe test keys scoped to Preview only).
6. Send the Clutch and Adams cold emails; relaunch the prospect research agents.
7. Pitch Shop Tech Score (multi-location and heavy-duty angle) once the site is verified.
8. Google Search Console round two; directory listings (G2, Capterra, SourceForge, Software Advice, Crunchbase, LinkedIn).
9. Build the next gap feature (send inspections to the customer), then QuickBooks, then texting.
10. Stripe Tax setup, deferred until about 5 to 10 customers.
