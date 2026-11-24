-- V30: Allow re-dispatching outbound delivery stops when previous stop was CANCELLED
-- Drop existing unconditional unique constraint
ALTER TABLE outbound_delivery_stops DROP CONSTRAINT IF EXISTS uq_outbound_stop_contract;

-- Create partial unique index ensuring a contract can only have at most one ACTIVE outbound stop
CREATE UNIQUE INDEX IF NOT EXISTS uq_outbound_stop_contract 
ON outbound_delivery_stops (contract_id) 
WHERE status != 'CANCELLED';
