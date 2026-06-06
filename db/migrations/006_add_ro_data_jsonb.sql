-- Add JSONB column to repair_orders for extended data
-- Stores: services, partsRequests, partsUsed, mpi, payment, attachments
-- This data was previously only held in frontend state and lost on refresh

ALTER TABLE repair_orders
  ADD COLUMN IF NOT EXISTS data JSONB DEFAULT '{}';

-- Index for querying parts requests status across all ROs
CREATE INDEX IF NOT EXISTS idx_ro_data_gin ON repair_orders USING GIN (data);
