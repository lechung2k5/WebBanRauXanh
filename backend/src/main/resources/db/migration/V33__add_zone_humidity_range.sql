ALTER TABLE warehouse_zones
    ADD COLUMN IF NOT EXISTS humidity_min INTEGER,
    ADD COLUMN IF NOT EXISTS humidity_max INTEGER;

UPDATE warehouse_zones
SET humidity_min = GREATEST(0, COALESCE(humidity_target, 90) - 5),
    humidity_max = LEAST(100, COALESCE(humidity_target, 90) + 5)
WHERE humidity_min IS NULL OR humidity_max IS NULL;
