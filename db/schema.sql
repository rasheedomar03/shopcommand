-- ShopCommand Database Schema
-- Neon (Postgres 16+) with Row Level Security
-- Run this against your Neon database to initialize

-- ─── Extensions ─────────────────────────────────────────────────────────────

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ─── Enums ──────────────────────────────────────────────────────────────────

CREATE TYPE user_role AS ENUM ('owner', 'advisor', 'tech');
CREATE TYPE ro_stage AS ENUM (
  'Estimate', 'Approved', 'Waiting Parts', 'In Progress',
  'Complete', 'Invoiced', 'Paid'
);

-- ─── Organizations ──────────────────────────────────────────────────────────
-- An org is the billing entity — one owner can have multiple shops under it.

CREATE TABLE organizations (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name        TEXT NOT NULL,
  owner_clerk_id TEXT NOT NULL UNIQUE,
  plan        TEXT NOT NULL DEFAULT 'founding',
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_org_stripe_customer ON organizations(stripe_customer_id);

-- ─── Shops ──────────────────────────────────────────────────────────────────

CREATE TABLE shops (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id      UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  address     TEXT,
  phone       TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_shops_org ON shops(org_id);

-- ─── Users ──────────────────────────────────────────────────────────────────
-- Maps Clerk user IDs to our internal user records + role assignments.

CREATE TABLE users (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  clerk_id    TEXT NOT NULL UNIQUE,
  org_id      UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  shop_id     UUID REFERENCES shops(id) ON DELETE SET NULL,
  role        user_role NOT NULL DEFAULT 'tech',
  name        TEXT NOT NULL,
  email       TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_users_org ON users(org_id);
CREATE INDEX idx_users_clerk ON users(clerk_id);

-- ─── Customers ──────────────────────────────────────────────────────────────

CREATE TABLE customers (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id      UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  email       TEXT,
  phone       TEXT,
  address     TEXT,
  notes       TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_customers_org ON customers(org_id);

-- ─── Vehicles ───────────────────────────────────────────────────────────────

CREATE TABLE vehicles (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id      UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  year        SMALLINT,
  make        TEXT,
  model       TEXT,
  vin         TEXT,
  license     TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_vehicles_org ON vehicles(org_id);
CREATE INDEX idx_vehicles_customer ON vehicles(customer_id);

-- ─── Repair Orders ──────────────────────────────────────────────────────────

CREATE TABLE repair_orders (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id      UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  shop_id     UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  vehicle_id  UUID REFERENCES vehicles(id) ON DELETE SET NULL,
  tech_id     UUID REFERENCES users(id) ON DELETE SET NULL,
  advisor_id  UUID REFERENCES users(id) ON DELETE SET NULL,
  ro_number   TEXT NOT NULL,
  stage       ro_stage NOT NULL DEFAULT 'Estimate',
  notes       TEXT,
  total       NUMERIC(10,2) DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_ro_org ON repair_orders(org_id);
CREATE INDEX idx_ro_shop ON repair_orders(shop_id);
CREATE INDEX idx_ro_customer ON repair_orders(customer_id);
CREATE UNIQUE INDEX idx_ro_number_org ON repair_orders(org_id, ro_number);

-- ─── Line Items ─────────────────────────────────────────────────────────────

CREATE TABLE line_items (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id      UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  ro_id       UUID NOT NULL REFERENCES repair_orders(id) ON DELETE CASCADE,
  type        TEXT NOT NULL CHECK (type IN ('labor', 'part', 'fee', 'discount')),
  description TEXT NOT NULL,
  qty         NUMERIC(10,2) NOT NULL DEFAULT 1,
  unit_price  NUMERIC(10,2) NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_line_items_ro ON line_items(ro_id);

-- ─── Invoices ───────────────────────────────────────────────────────────────

CREATE TABLE invoices (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id      UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  ro_id       UUID NOT NULL REFERENCES repair_orders(id) ON DELETE CASCADE,
  amount      NUMERIC(10,2) NOT NULL,
  status      TEXT NOT NULL DEFAULT 'unpaid' CHECK (status IN ('unpaid', 'paid', 'void')),
  paid_at     TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_invoices_org ON invoices(org_id);

-- ─── Time Entries (tech clock in/out) ───────────────────────────────────────

CREATE TABLE time_entries (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id      UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  tech_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  ro_id       UUID REFERENCES repair_orders(id) ON DELETE SET NULL,
  clock_in    TIMESTAMPTZ NOT NULL DEFAULT now(),
  clock_out   TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_time_entries_tech ON time_entries(tech_id);

-- ─── Audit Log ──────────────────────────────────────────────────────────────
-- Append-only log for debugging and compliance.

CREATE TABLE audit_log (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id      UUID NOT NULL,
  user_id     UUID,
  action      TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id   UUID,
  metadata    JSONB DEFAULT '{}',
  ip_address  INET,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_audit_org ON audit_log(org_id);
CREATE INDEX idx_audit_created ON audit_log(created_at);

-- ═══════════════════════════════════════════════════════════════════════════
-- ROW LEVEL SECURITY
-- Every table scoped to org_id. Users can only access their own org's data.
-- The current user's org_id is set via: SET app.current_org_id = 'uuid';
-- This is set by the API layer after verifying the Clerk JWT.
-- ═══════════════════════════════════════════════════════════════════════════

-- Helper function to get current org from session variable
CREATE OR REPLACE FUNCTION current_org_id() RETURNS UUID AS $$
  SELECT COALESCE(
    NULLIF(current_setting('app.current_org_id', true), ''),
    '00000000-0000-0000-0000-000000000000'
  )::UUID;
$$ LANGUAGE SQL STABLE;

-- Helper function to get current user role from session variable
CREATE OR REPLACE FUNCTION current_user_role() RETURNS user_role AS $$
  SELECT COALESCE(
    NULLIF(current_setting('app.current_user_role', true), ''),
    'tech'
  )::user_role;
$$ LANGUAGE SQL STABLE;

-- Helper function to get current user's shop_id (for advisors/techs)
CREATE OR REPLACE FUNCTION current_shop_id() RETURNS UUID AS $$
  SELECT COALESCE(
    NULLIF(current_setting('app.current_shop_id', true), ''),
    '00000000-0000-0000-0000-000000000000'
  )::UUID;
$$ LANGUAGE SQL STABLE;

-- ── Organizations ───────────────────────────────────────────────────────────

ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;

CREATE POLICY org_isolation ON organizations
  USING (id = current_org_id());

CREATE POLICY org_insert ON organizations
  FOR INSERT WITH CHECK (true);  -- signup creates the org

-- ── Shops ───────────────────────────────────────────────────────────────────

ALTER TABLE shops ENABLE ROW LEVEL SECURITY;

CREATE POLICY shops_isolation ON shops
  USING (org_id = current_org_id());

CREATE POLICY shops_insert ON shops
  FOR INSERT WITH CHECK (org_id = current_org_id());

CREATE POLICY shops_update ON shops
  FOR UPDATE USING (org_id = current_org_id() AND current_user_role() = 'owner');

CREATE POLICY shops_delete ON shops
  FOR DELETE USING (org_id = current_org_id() AND current_user_role() = 'owner');

-- ── Users ───────────────────────────────────────────────────────────────────

ALTER TABLE users ENABLE ROW LEVEL SECURITY;

CREATE POLICY users_read ON users
  FOR SELECT USING (org_id = current_org_id());

CREATE POLICY users_insert ON users
  FOR INSERT WITH CHECK (org_id = current_org_id());

-- Only owners can change roles or delete users
CREATE POLICY users_update ON users
  FOR UPDATE USING (
    org_id = current_org_id()
    AND (
      current_user_role() = 'owner'
      OR clerk_id = current_setting('app.current_clerk_id', true)
    )
  );

CREATE POLICY users_delete ON users
  FOR DELETE USING (org_id = current_org_id() AND current_user_role() = 'owner');

-- ── Customers ───────────────────────────────────────────────────────────────

ALTER TABLE customers ENABLE ROW LEVEL SECURITY;

CREATE POLICY customers_isolation ON customers
  USING (org_id = current_org_id());

CREATE POLICY customers_insert ON customers
  FOR INSERT WITH CHECK (org_id = current_org_id());

CREATE POLICY customers_update ON customers
  FOR UPDATE USING (org_id = current_org_id());

-- ── Vehicles ────────────────────────────────────────────────────────────────

ALTER TABLE vehicles ENABLE ROW LEVEL SECURITY;

CREATE POLICY vehicles_isolation ON vehicles
  USING (org_id = current_org_id());

CREATE POLICY vehicles_insert ON vehicles
  FOR INSERT WITH CHECK (org_id = current_org_id());

CREATE POLICY vehicles_update ON vehicles
  FOR UPDATE USING (org_id = current_org_id());

-- ── Repair Orders ───────────────────────────────────────────────────────────

ALTER TABLE repair_orders ENABLE ROW LEVEL SECURITY;

-- Owners see all ROs in their org. Advisors/techs see only their shop's ROs.
CREATE POLICY ro_read ON repair_orders
  FOR SELECT USING (
    org_id = current_org_id()
    AND (
      current_user_role() = 'owner'
      OR shop_id = current_shop_id()
    )
  );

CREATE POLICY ro_insert ON repair_orders
  FOR INSERT WITH CHECK (
    org_id = current_org_id()
    AND current_user_role() IN ('owner', 'advisor')
  );

CREATE POLICY ro_update ON repair_orders
  FOR UPDATE USING (
    org_id = current_org_id()
    AND (
      current_user_role() = 'owner'
      OR shop_id = current_shop_id()
    )
  );

-- ── Line Items ──────────────────────────────────────────────────────────────

ALTER TABLE line_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY line_items_isolation ON line_items
  USING (org_id = current_org_id());

CREATE POLICY line_items_insert ON line_items
  FOR INSERT WITH CHECK (org_id = current_org_id());

CREATE POLICY line_items_update ON line_items
  FOR UPDATE USING (org_id = current_org_id());

CREATE POLICY line_items_delete ON line_items
  FOR DELETE USING (org_id = current_org_id());

-- ── Invoices ────────────────────────────────────────────────────────────────

ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY invoices_isolation ON invoices
  USING (org_id = current_org_id());

CREATE POLICY invoices_insert ON invoices
  FOR INSERT WITH CHECK (
    org_id = current_org_id()
    AND current_user_role() IN ('owner', 'advisor')
  );

CREATE POLICY invoices_update ON invoices
  FOR UPDATE USING (
    org_id = current_org_id()
    AND current_user_role() IN ('owner', 'advisor')
  );

-- ── Time Entries ────────────────────────────────────────────────────────────

ALTER TABLE time_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY time_entries_read ON time_entries
  FOR SELECT USING (
    org_id = current_org_id()
    AND (
      current_user_role() = 'owner'
      OR tech_id::TEXT = current_setting('app.current_user_id', true)
    )
  );

CREATE POLICY time_entries_insert ON time_entries
  FOR INSERT WITH CHECK (org_id = current_org_id());

CREATE POLICY time_entries_update ON time_entries
  FOR UPDATE USING (
    org_id = current_org_id()
    AND (
      current_user_role() = 'owner'
      OR tech_id::TEXT = current_setting('app.current_user_id', true)
    )
  );

-- ── Audit Log ───────────────────────────────────────────────────────────────

ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

-- Append-only: anyone in the org can insert, only owners can read
CREATE POLICY audit_insert ON audit_log
  FOR INSERT WITH CHECK (org_id = current_org_id());

CREATE POLICY audit_read ON audit_log
  FOR SELECT USING (org_id = current_org_id() AND current_user_role() = 'owner');

-- No update or delete on audit_log — it's immutable

-- ═══════════════════════════════════════════════════════════════════════════
-- UPDATED_AT TRIGGER
-- Auto-updates the updated_at column on row modification.
-- ═══════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_organizations_updated BEFORE UPDATE ON organizations FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_shops_updated BEFORE UPDATE ON shops FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_users_updated BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_customers_updated BEFORE UPDATE ON customers FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_repair_orders_updated BEFORE UPDATE ON repair_orders FOR EACH ROW EXECUTE FUNCTION update_updated_at();
