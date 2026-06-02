-- Performance indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_ro_stage ON repair_orders(stage);
CREATE INDEX IF NOT EXISTS idx_ro_updated ON repair_orders(updated_at);
CREATE INDEX IF NOT EXISTS idx_customers_name ON customers(name);
CREATE INDEX IF NOT EXISTS idx_payments_created ON payments(created_at);
