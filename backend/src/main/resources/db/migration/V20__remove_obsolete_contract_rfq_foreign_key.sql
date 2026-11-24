-- B2bContract.rfq now references rfq_negotiations. A legacy FK to
-- buyer_rfqs incorrectly required every new RFQ ID to exist in both tables.
DO $$
DECLARE obsolete_fk RECORD;
BEGIN
    FOR obsolete_fk IN
        SELECT conname FROM pg_constraint
        WHERE conrelid = 'b2b_contracts'::regclass
          AND confrelid = 'buyer_rfqs'::regclass
          AND contype = 'f'
    LOOP
        EXECUTE format('ALTER TABLE b2b_contracts DROP CONSTRAINT %I', obsolete_fk.conname);
    END LOOP;
END $$;
