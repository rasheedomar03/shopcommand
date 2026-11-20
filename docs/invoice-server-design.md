# Server-side invoices: design draft

Drafted Nov 18, 2026. Nothing here is built. It waits on Trinity's answers (see Open questions) and your go-ahead.

> **Update Nov 20:** the database section below is superseded by the draft migration
> `db/migrations/008_server_invoices_fleet_credits.sql`, which adds customer and
> truck links, a fleet flag, a drafts status, a credits ledger and unique invoice
> numbers. Trinity's answers (own Fleet page, customer credits, invoices never
> deleted, revenue counted when paid) are recorded in docs/HANDOFF.md.

## Problem

Invoices made from scratch in the Invoice Generator (what J2M does, since they do not use repair orders) are saved only in the browser (localStorage key `sc_invoices`). Cause: the server cannot hold them.
- `POST /api/invoices` requires an `ro_id` (api/invoices.js) and `invoices.ro_id` is `NOT NULL` (db/schema.sql).
- Everything an invoice shows is derived by joining the repair order: customer, vehicle, shop, line items, and email.

Consequences: clearing browser data, switching computers, or another staff member means those invoices vanish or are invisible. Reports and revenue never count them. Two other limits: no company name, truck number, VIN or mileage anywhere in the model.

## Goals

1. A from-scratch invoice is saved on the server, visible to every owner and advisor in the org, and survives any browser.
2. Existing browser-only invoices are moved to the server, once, without loss.
3. Add company name, customer name and phone, year/make/model, truck number, VIN and mileage, and print them.
4. Totals are calculated on the server, not trusted from the browser.
5. Nothing changes for invoices that come from repair orders (J2M's existing paid and sent ones).

Non-goals for now: companies as their own records, statements and net terms, card payments, estimates from scratch (see Open questions), a labor guide.

## Approach: additive, two kinds of invoice

Keep RO-based invoices exactly as they are (derived from the RO at read time). Add a second kind, a standalone invoice, that carries its own data. A `source` column says which: `ro` (existing rows, default) or `manual` / `import`. Later we can snapshot RO-based invoices too, but that is a separate, riskier change.

### Database (additive; run in the Neon console BEFORE pushing code that reads it)

```sql
ALTER TABLE invoices ALTER COLUMN ro_id DROP NOT NULL;
ALTER TABLE invoices
  ADD COLUMN IF NOT EXISTS source         TEXT NOT NULL DEFAULT 'ro',
  ADD COLUMN IF NOT EXISTS shop_id        UUID REFERENCES shops(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS customer_name  TEXT,
  ADD COLUMN IF NOT EXISTS customer_email TEXT,
  ADD COLUMN IF NOT EXISTS customer_phone TEXT,
  ADD COLUMN IF NOT EXISTS company_name   TEXT,
  ADD COLUMN IF NOT EXISTS vehicle_year   SMALLINT,
  ADD COLUMN IF NOT EXISTS vehicle_make   TEXT,
  ADD COLUMN IF NOT EXISTS vehicle_model  TEXT,
  ADD COLUMN IF NOT EXISTS unit_number    TEXT,
  ADD COLUMN IF NOT EXISTS vin            TEXT,
  ADD COLUMN IF NOT EXISTS mileage        INTEGER,
  ADD COLUMN IF NOT EXISTS lines          JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS subtotal       NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS tax            NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS tax_rate       NUMERIC(5,2),
  ADD COLUMN IF NOT EXISTS tax_labor      BOOLEAN,
  ADD COLUMN IF NOT EXISTS notes          TEXT;
CREATE INDEX IF NOT EXISTS idx_invoices_org_created ON invoices(org_id, created_at DESC);
```

- Existing rows: `source='ro'`, new columns empty. Nothing about them changes.
- `amount` keeps its meaning: the invoice total including tax (so payments, `pay`, and revenue keep working unchanged).
- Unique invoice number per org, added only after checking there are no duplicates today:
  `SELECT org_id, number, count(*) FROM invoices WHERE number IS NOT NULL GROUP BY 1,2 HAVING count(*) > 1;` then
  `CREATE UNIQUE INDEX IF NOT EXISTS uq_invoices_org_number ON invoices(org_id, number) WHERE number IS NOT NULL;`
- Related, small, separate: `ALTER TABLE parts ADD COLUMN IF NOT EXISTS notes TEXT;` (the "sold by the foot" note).
- Later phase (work order print): `diagnostics TEXT`, `technician TEXT` on invoices, plus `customers.company TEXT` and `vehicles.unit_number TEXT` so the Add Customer form can fill them.

### API (api/invoices.js; keep inside the existing file, the project is at the 12-function limit)

- `POST /api/invoices` with `{ manual: true, ... }` creates a standalone invoice. Roles: owner and advisor (techs refused). The shop must belong to the org.
  - Body: `shop_id`, `customer_name` (required), `company_name`, `customer_email`, `customer_phone`, vehicle fields, `unit_number`, `vin`, `mileage`, `lines: [{desc, type: labor|part|fee, qty, price}]`, `tax_rate`, `tax_labor`, `itemize`, `notes`, optional `number`, optional `created`.
  - The server validates and bounds everything (max lines, qty and price ranges, string lengths, VIN 17 characters or blank, email format), then computes `subtotal`, `tax` and `total` itself using the generator's current rules (tax on parts, optionally labor; or on everything when not itemized) with cents rounding. `amount` = total.
  - Number: use the supplied one if valid and unused, otherwise generate `INV-YYMMDD-NNN` and retry on conflict.
- `PUT /api/invoices?id=` for a standalone invoice that is still unpaid: replace the customer, vehicle, lines, tax settings and notes, then recompute. RO-based invoices keep today's rules (the tax-safe edit in lib/invoiceEdit.js).
- `GET` list and single: already `SELECT i.*`, so new columns come through. Customer name becomes `COALESCE(i.customer_name, c.name)`; shop is `COALESCE(i.shop_id, ro.shop_id)`.
- `pay`, `email`, void and unpaid: stop assuming an RO exists. Use the invoice's own shop and customer when `ro_id` is null; only update the RO stage when there is one. The email builds its lines from `lines`, and prints the stored tax instead of the derived "gap" line.
- All new queries keep `WHERE org_id = user.orgId`. Rate limiting stays as is.

### Front end

- Generator: add fields for company name, customer name, phone, email, year, make/model, truck #, VIN, mileage; autosave stays; Save invoice calls the server and shows "Saved". Only if the network fails does it fall back to this computer and say "Saved on this computer" (today's message), and it retries later.
- Print / PDF and the invoice detail show the new fields.
- DataContext: `addInvoice` sends standalone invoices to the server; `transformInvoice` maps the new columns; the list merge already hides a local copy whose number matches a server invoice.
- Later: Add Customer form gets company and truck # (and VIN), and the printed work order matches J2M's paper form (Diagnostics and Parts columns).

## One-time import of browser invoices (the careful part)

1. On first load after the update, the app finds `sc_invoices` entries with no `dbId`.
2. Before anything else it copies them to `sc_invoices_backup_v1` (kept, not deleted).
3. It posts them in batches to `POST /api/invoices?action=import` (max 200 per call). Each item is stored verbatim: invoice number from `id`, `customerName`, `customerEmail`, vehicle text (split into year/make/model when it parses, else kept in `vehicle_model`), `services` converted to lines (`name` with `parts` or `labor` amounts, quantity 1), and the stored `subtotal`, `tax` and `total` are kept exactly, not recomputed.
4. Status: `draft` and `sent` become `unpaid`. `paid` becomes `paid` with `paid_at` and a payment row (method mapped to the allowed list, else `other`). A local invoice with an `amountPaid` gets a matching payment.
5. Idempotent: if an invoice with the same number already exists in the org it is skipped, so a retry or a second browser cannot duplicate it.
6. The app removes an item from `sc_invoices` only after the server confirms it. The result shows "N invoices moved, total $X", and the owner can check that against Export.
7. If anything fails, nothing is deleted, the invoices stay local, and the import retries on the next load.

Because `sc_invoices` is per browser, the import must run in each browser Trinity used. Invoices in a browser she cleared are gone.

## Rollout order (safe at every step)

1. Ask Trinity to press Export on the Invoices page now, as an independent copy. Check what it contains.
2. Run the additive migration in Neon. Nothing visible changes.
3. Deploy the API changes. Old front end keeps working (it still sends `ro_id`).
4. Test on your own test account in two browsers: create standalone invoices, edit, pay, email, void, print; compare totals; run the import against a seeded `sc_invoices`.
5. Deploy the front end. Do the import on a test account first, then ask Trinity to open the app and confirm the "moved" banner and totals.
6. After a week of clean use, stop reading `sc_invoices` and delete the backup key in a later release.

Never deploy a version that stops reading `sc_invoices` before the import has run for everyone.

## Tests (in /tests)

Server: create validates and recomputes totals (ignores client totals); techs refused; shop from another org refused; number conflicts retried; edit only while unpaid; pay, email, void with no RO; import idempotent and verbatim; org isolation. Front end: the lines-from-services conversion and status mapping as pure functions.

## Risks

- Tax rules: today the generator defaults to 8.25% and the RO flow uses 8.5%, with no per-shop setting. The server must copy the generator's rules for now; the per-shop tax rate (after J2M's answer) is a separate change.
- Browser import is the one step that cannot be rehearsed on her data. Mitigations: backup key, verbatim storage, idempotence, totals shown, and the Export she makes beforehand.
- Two kinds of invoice means two code paths until RO invoices are snapshotted too.
- Numbering: if J2M relies on their own numbering, keep supplied numbers; do not force sequential ones without asking.

## Open questions for Trinity

1. How many invoices do you have so far, and do you always use the same computer and browser?
2. Where do you make estimates (generator, Estimates page, paper)? If from scratch, estimates need the same fix.
3. What does the truck number mean (their fleet number)? Trailer number too?
4. Should Diagnostics and Parts print on the invoice, or only on a work order?
5. Does the "sold by the foot" part note need to print on estimates and invoices?
6. Any rule about invoice numbers they want kept?

## Rough size

Migration and checks: small. API with tests: about a day. Front end (generator fields, detail, DataContext, list): about a day. Import with tests: about half a day. Work order print and customer fields: another half day to a day. Total roughly 3 to 4 days of focused work, shippable in the order above.
