-- Add scheduled_at field for appointments
ALTER TABLE repair_orders ADD COLUMN IF NOT EXISTS scheduled_at TIMESTAMPTZ;
CREATE INDEX IF NOT EXISTS idx_ro_scheduled ON repair_orders(scheduled_at);
