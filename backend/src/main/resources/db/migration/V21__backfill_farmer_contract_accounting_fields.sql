-- Restore Buyer visibility and accounting values for contracts created by Farmer.
UPDATE b2b_contracts
SET lot_id = COALESCE(lot_id, harvest_lot_id),
    offered_weight_kg = COALESCE(offered_weight_kg, quantity_kg, quantity),
    offered_price_per_kg = COALESCE(offered_price_per_kg, agreed_price_per_kg, unit_price),
    total_goods_amount = COALESCE(total_goods_amount, total_amount),
    deposit_30_amount = COALESCE(deposit_30_amount, deposit_amount)
WHERE lot_id IS NULL OR offered_weight_kg IS NULL OR offered_price_per_kg IS NULL
   OR total_goods_amount IS NULL OR deposit_30_amount IS NULL;
