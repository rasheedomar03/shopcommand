-- Payment transactions table
CREATE TABLE IF NOT EXISTS payments (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id      UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  invoice_id  UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  shop_id     UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  amount      NUMERIC(10,2) NOT NULL,
  method      TEXT NOT NULL CHECK (method IN ('visa', 'mastercard', 'amex', 'cash', 'check', 'financing', 'other')),
  last4       TEXT,
  status      TEXT NOT NULL DEFAULT 'completed' CHECK (status IN ('completed', 'pending', 'failed', 'refunded')),
  customer_name TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_payments_org ON payments(org_id);
CREATE INDEX IF NOT EXISTS idx_payments_invoice ON payments(invoice_id);
CREATE INDEX IF NOT EXISTS idx_payments_shop ON payments(shop_id);

ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY payments_read ON payments
  FOR SELECT USING (org_id = current_org_id());

CREATE POLICY payments_insert ON payments
  FOR INSERT WITH CHECK (
    org_id = current_org_id()
    AND current_user_role() IN ('owner', 'advisor')
  );

CREATE POLICY payments_update ON payments
  FOR UPDATE USING (
    org_id = current_org_id()
    AND current_user_role() IN ('owner', 'advisor')
  );
