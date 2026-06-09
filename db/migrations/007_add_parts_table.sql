-- Parts inventory table
CREATE TABLE IF NOT EXISTS parts (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  shop_id     UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  sku         TEXT NOT NULL DEFAULT '',
  category    TEXT NOT NULL DEFAULT 'Other',
  vendor      TEXT DEFAULT '',
  qty         INTEGER NOT NULL DEFAULT 0,
  min_qty     INTEGER NOT NULL DEFAULT 2,
  cost        NUMERIC(10,2) DEFAULT 0,
  price       NUMERIC(10,2) DEFAULT 0,
  last_ordered TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_parts_org ON parts(org_id);
CREATE INDEX IF NOT EXISTS idx_parts_shop ON parts(shop_id);

-- RLS
ALTER TABLE parts ENABLE ROW LEVEL SECURITY;

CREATE POLICY parts_read ON parts FOR SELECT USING (org_id = current_org_id());
CREATE POLICY parts_insert ON parts FOR INSERT WITH CHECK (org_id = current_org_id());
CREATE POLICY parts_update ON parts FOR UPDATE USING (org_id = current_org_id());
CREATE POLICY parts_delete ON parts FOR DELETE USING (org_id = current_org_id());
