-- 008: server-side invoices, fleet trucks and customer credits
--
-- DRAFT. Not run yet. Run it in the Neon SQL console only after reading
-- docs/invoice-server-design.md and the notes in docs/HANDOFF.md. It is
-- additive: nothing is dropped except two CHECK constraints that are recreated
-- with extra allowed values, so the current app keeps working unchanged until
-- the code that uses these columns ships.
--
-- What it enables
--   * Invoices made from scratch (no repair order) saved on the server, with the
--     customer, truck, line items (quantity and unit price), tax, card fee and
--     notes stored on the invoice itself, plus drafts.
--   * Invoices linked to a customer and a truck, so a customer profile and a
--     Fleet page can list them, and invoices are never deleted with a customer.
--   * The shop's own trucks (a customer flagged as fleet) with internal invoices
--     that do not count as revenue.
--   * Customer credit (prepaid or overpaid balances) as a ledger, applied to
--     invoices as a 'credit' payment.
--
-- ───────────────────────────────────────────────────────────────────────────
-- STEP 1: PRE-FLIGHT CHECKS (read only). Run these first and look at the results.
-- ───────────────────────────────────────────────────────────────────────────
--
-- 1a. Must return ZERO rows, or the unique invoice number index below will fail.
--     (Fix any duplicates first, for example by renumbering one of them.)
--
--   SELECT org_id, lower(number) AS number, count(*)
--   FROM invoices WHERE number IS NOT NULL
--   GROUP BY 1, 2 HAVING count(*) > 1;
--
-- 1b. See the current CHECK constraints this migration replaces.
--
--   SELECT conrelid::regclass AS table_name, conname, pg_get_constraintdef(oid) AS definition
--   FROM pg_constraint
--   WHERE contype = 'c' AND conrelid IN ('invoices'::regclass, 'payments'::regclass);
--
-- 1c. Counts to compare after the migration (nothing should change).
--
--   SELECT (SELECT count(*) FROM invoices) AS invoices,
--          (SELECT count(*) FROM payments) AS payments,
--          (SELECT count(*) FROM customers) AS customers,
--          (SELECT count(*) FROM vehicles) AS vehicles;
--
-- ───────────────────────────────────────────────────────────────────────────
-- STEP 2: THE MIGRATION
-- ───────────────────────────────────────────────────────────────────────────

BEGIN;

-- ── Invoices: allow ones with no repair order, and store their own content ──

ALTER TABLE invoices ALTER COLUMN ro_id DROP NOT NULL;

ALTER TABLE invoices
  ADD COLUMN IF NOT EXISTS number          TEXT,
  ADD COLUMN IF NOT EXISTS source          TEXT NOT NULL DEFAULT 'ro',       -- 'ro' (existing), 'manual', 'import'
  ADD COLUMN IF NOT EXISTS invoice_date    DATE,                             -- the date on the invoice (created_at is when the row was saved)
  ADD COLUMN IF NOT EXISTS shop_id         UUID REFERENCES shops(id) ON DELETE SET NULL,
  -- Customer and truck links. RESTRICT: a customer or truck with invoices cannot be deleted.
  ADD COLUMN IF NOT EXISTS customer_id     UUID REFERENCES customers(id) ON DELETE RESTRICT,
  ADD COLUMN IF NOT EXISTS vehicle_id      UUID REFERENCES vehicles(id) ON DELETE RESTRICT,
  -- Snapshots of what was printed, so later edits to a customer never change an old invoice
  ADD COLUMN IF NOT EXISTS customer_name   TEXT,
  ADD COLUMN IF NOT EXISTS customer_email  TEXT,
  ADD COLUMN IF NOT EXISTS customer_phone  TEXT,
  ADD COLUMN IF NOT EXISTS company_name    TEXT,
  ADD COLUMN IF NOT EXISTS vehicle_year    SMALLINT,
  ADD COLUMN IF NOT EXISTS vehicle_make    TEXT,
  ADD COLUMN IF NOT EXISTS vehicle_model   TEXT,
  ADD COLUMN IF NOT EXISTS vehicle_text    TEXT,                             -- free text as typed (older invoices keep a truck number here)
  ADD COLUMN IF NOT EXISTS unit_number     TEXT,
  ADD COLUMN IF NOT EXISTS vin             TEXT,
  ADD COLUMN IF NOT EXISTS mileage         INTEGER,
  ADD COLUMN IF NOT EXISTS job_title       TEXT,
  ADD COLUMN IF NOT EXISTS diagnostics     TEXT,
  ADD COLUMN IF NOT EXISTS notes           TEXT,
  -- Lines: [{ desc, type: labor|part|fee, qty, price }]. qty x price per line; labor qty is hours.
  ADD COLUMN IF NOT EXISTS lines           JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS itemize         BOOLEAN,
  ADD COLUMN IF NOT EXISTS subtotal        NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS tax             NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS tax_rate        NUMERIC(6,3),
  ADD COLUMN IF NOT EXISTS tax_labor       BOOLEAN,
  ADD COLUMN IF NOT EXISTS card_fee_rate   NUMERIC(5,2),
  ADD COLUMN IF NOT EXISTS card_fee_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS credit_applied  NUMERIC(10,2) NOT NULL DEFAULT 0, -- customer credit used on this invoice
  ADD COLUMN IF NOT EXISTS is_internal     BOOLEAN NOT NULL DEFAULT false;   -- the shop's own fleet: not billed, not revenue

-- `amount` keeps its meaning: the invoice TOTAL including tax and card fee.

-- Drafts exist only in the browser today. Allow them on the server too.
DO $$
DECLARE c record;
BEGIN
  FOR c IN
    SELECT conname FROM pg_constraint
    WHERE conrelid = 'invoices'::regclass AND contype = 'c'
      AND pg_get_constraintdef(oid) ILIKE '%status%'
  LOOP
    EXECUTE format('ALTER TABLE invoices DROP CONSTRAINT %I', c.conname);
  END LOOP;
END $$;
ALTER TABLE invoices ADD CONSTRAINT invoices_status_check
  CHECK (status IN ('draft', 'unpaid', 'paid', 'void'));

ALTER TABLE invoices DROP CONSTRAINT IF EXISTS invoices_source_check;
ALTER TABLE invoices ADD CONSTRAINT invoices_source_check
  CHECK (source IN ('ro', 'manual', 'import'));

-- Link existing repair-order invoices to their shop, customer and date.
-- Idempotent: only fills what is still empty.
UPDATE invoices i
SET shop_id = ro.shop_id
FROM repair_orders ro
WHERE ro.id = i.ro_id AND i.shop_id IS NULL;

UPDATE invoices i
SET customer_id = ro.customer_id
FROM repair_orders ro
WHERE ro.id = i.ro_id AND i.customer_id IS NULL;

UPDATE invoices SET invoice_date = created_at::date WHERE invoice_date IS NULL;

-- Unique invoice numbers per shop account (case-insensitive). Step 1a must be empty.
CREATE UNIQUE INDEX IF NOT EXISTS uq_invoices_org_number
  ON invoices (org_id, lower(number)) WHERE number IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_invoices_org_date     ON invoices (org_id, invoice_date DESC);
CREATE INDEX IF NOT EXISTS idx_invoices_org_customer ON invoices (org_id, customer_id);
CREATE INDEX IF NOT EXISTS idx_invoices_org_vehicle  ON invoices (org_id, vehicle_id);
CREATE INDEX IF NOT EXISTS idx_invoices_org_unit     ON invoices (org_id, lower(unit_number)) WHERE unit_number IS NOT NULL;

-- ── Customers: company name and the shop's own fleet ───────────────────────

ALTER TABLE customers
  ADD COLUMN IF NOT EXISTS company  TEXT,
  ADD COLUMN IF NOT EXISTS is_fleet BOOLEAN NOT NULL DEFAULT false;  -- true: the shop's own trucks (internal, not revenue)

CREATE INDEX IF NOT EXISTS idx_customers_org_fleet ON customers (org_id) WHERE is_fleet;

-- ── Vehicles: truck number, trim, last known mileage ───────────────────────

ALTER TABLE vehicles
  ADD COLUMN IF NOT EXISTS unit_number  TEXT,
  ADD COLUMN IF NOT EXISTS trim         TEXT,
  ADD COLUMN IF NOT EXISTS last_mileage INTEGER;

CREATE INDEX IF NOT EXISTS idx_vehicles_org_unit ON vehicles (org_id, lower(unit_number)) WHERE unit_number IS NOT NULL;

-- ── Customer credit: a ledger, so every change is kept and the balance is a sum ─
-- amount > 0 adds credit (deposit), amount < 0 uses or removes it (applied, refund).
-- Balance = SUM(amount) for the customer. A deposit is NOT revenue until it is
-- applied to an invoice.

CREATE TABLE IF NOT EXISTS customer_credits (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
  kind        TEXT NOT NULL CHECK (kind IN ('deposit', 'applied', 'refund', 'adjustment')),
  amount      NUMERIC(10,2) NOT NULL CHECK (amount <> 0),
  invoice_id  UUID REFERENCES invoices(id) ON DELETE SET NULL,
  note        TEXT,
  created_by  UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT customer_credits_sign CHECK (
    (kind = 'deposit' AND amount > 0) OR
    (kind IN ('applied', 'refund') AND amount < 0) OR
    kind = 'adjustment'
  )
);

CREATE INDEX IF NOT EXISTS idx_credits_org_customer ON customer_credits (org_id, customer_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_credits_invoice      ON customer_credits (invoice_id);

ALTER TABLE customer_credits ENABLE ROW LEVEL SECURITY;
CREATE POLICY credits_read   ON customer_credits FOR SELECT USING (org_id = current_org_id());
CREATE POLICY credits_insert ON customer_credits FOR INSERT WITH CHECK (
  org_id = current_org_id() AND current_user_role() IN ('owner', 'advisor')
);
-- No update or delete policy: the ledger is append-only. Corrections are new rows.

-- Applying credit to an invoice is recorded as a payment with method 'credit'.
DO $$
DECLARE c record;
BEGIN
  FOR c IN
    SELECT conname FROM pg_constraint
    WHERE conrelid = 'payments'::regclass AND contype = 'c'
      AND pg_get_constraintdef(oid) ILIKE '%method%'
  LOOP
    EXECUTE format('ALTER TABLE payments DROP CONSTRAINT %I', c.conname);
  END LOOP;
END $$;
ALTER TABLE payments ADD CONSTRAINT payments_method_check
  CHECK (method IN ('visa', 'mastercard', 'amex', 'cash', 'check', 'financing', 'credit', 'other'));

COMMIT;

-- ───────────────────────────────────────────────────────────────────────────
-- STEP 3: POST-FLIGHT CHECKS (read only). Run after the migration.
-- ───────────────────────────────────────────────────────────────────────────
--
-- 3a. Same counts as step 1c (nothing should have changed).
--
--   SELECT (SELECT count(*) FROM invoices) AS invoices,
--          (SELECT count(*) FROM payments) AS payments,
--          (SELECT count(*) FROM customers) AS customers,
--          (SELECT count(*) FROM vehicles) AS vehicles,
--          (SELECT count(*) FROM customer_credits) AS credits;   -- 0
--
-- 3b. Existing invoices should now have a date, and shop and customer when
--     they come from a repair order. Should return 0 and 0.
--
--   SELECT count(*) FILTER (WHERE invoice_date IS NULL)                     AS missing_date,
--          count(*) FILTER (WHERE ro_id IS NOT NULL AND customer_id IS NULL) AS missing_customer
--   FROM invoices;
--
-- 3c. The new statuses and payment method are allowed.
--
--   SELECT conrelid::regclass AS table_name, conname, pg_get_constraintdef(oid)
--   FROM pg_constraint
--   WHERE contype = 'c' AND conname IN ('invoices_status_check', 'payments_method_check', 'invoices_source_check');
--
-- ───────────────────────────────────────────────────────────────────────────
-- ROLLBACK (only if needed, and only before the new code ships; it deletes any
-- data saved in the new columns and the credits ledger):
-- ───────────────────────────────────────────────────────────────────────────
--
--   DROP TABLE IF EXISTS customer_credits;
--   DROP INDEX IF EXISTS uq_invoices_org_number, idx_invoices_org_date, idx_invoices_org_customer,
--                        idx_invoices_org_vehicle, idx_invoices_org_unit, idx_customers_org_fleet, idx_vehicles_org_unit;
--   ALTER TABLE invoices DROP COLUMN IF EXISTS source, DROP COLUMN IF EXISTS invoice_date, DROP COLUMN IF EXISTS shop_id,
--     DROP COLUMN IF EXISTS customer_id, DROP COLUMN IF EXISTS vehicle_id, DROP COLUMN IF EXISTS customer_name,
--     DROP COLUMN IF EXISTS customer_email, DROP COLUMN IF EXISTS customer_phone, DROP COLUMN IF EXISTS company_name,
--     DROP COLUMN IF EXISTS vehicle_year, DROP COLUMN IF EXISTS vehicle_make, DROP COLUMN IF EXISTS vehicle_model,
--     DROP COLUMN IF EXISTS vehicle_text, DROP COLUMN IF EXISTS unit_number, DROP COLUMN IF EXISTS vin,
--     DROP COLUMN IF EXISTS mileage, DROP COLUMN IF EXISTS job_title, DROP COLUMN IF EXISTS diagnostics,
--     DROP COLUMN IF EXISTS notes, DROP COLUMN IF EXISTS lines, DROP COLUMN IF EXISTS itemize,
--     DROP COLUMN IF EXISTS subtotal, DROP COLUMN IF EXISTS tax, DROP COLUMN IF EXISTS tax_rate,
--     DROP COLUMN IF EXISTS tax_labor, DROP COLUMN IF EXISTS card_fee_rate, DROP COLUMN IF EXISTS card_fee_amount,
--     DROP COLUMN IF EXISTS credit_applied, DROP COLUMN IF EXISTS is_internal;
--   ALTER TABLE customers DROP COLUMN IF EXISTS company, DROP COLUMN IF EXISTS is_fleet;
--   ALTER TABLE vehicles  DROP COLUMN IF EXISTS unit_number, DROP COLUMN IF EXISTS trim, DROP COLUMN IF EXISTS last_mileage;
--   (ro_id stays nullable; the status and method constraints stay widened. Both are harmless.)
