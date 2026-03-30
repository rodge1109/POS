-- ==========================================================
-- Migration v3: Add Product Cost
-- ==========================================================
-- This script adds a "cost" column to the products table for 
-- profit and margin analysis.
-- ==========================================================

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'products' 
        AND column_name = 'cost'
    ) THEN
        ALTER TABLE public.products ADD COLUMN cost NUMERIC(10,2) DEFAULT 0;
        COMMENT ON COLUMN public.products.cost IS 'Internal unit cost of the product';
    END IF;
END $$;
