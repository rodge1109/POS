-- ==========================================================
-- Migration v2: Product Isolation (Barcode & SKU)
-- ==========================================================
-- This script fixes the "global" unique constraints on products
-- so that different restaurants can use the same barcodes/SKUs.
-- ==========================================================

DO $$ 
BEGIN
    -- 1. Fix Barcode Uniqueness
    -- Remove the global unique constraint
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'products_barcode_key') THEN
        ALTER TABLE public.products DROP CONSTRAINT products_barcode_key;
    END IF;
    
    -- Add the restaurant-scoped unique constraint
    -- Since some companies might not use barcodes, we allow multiple NULLs (standard PG behavior)
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'products_company_barcode_unique') THEN
        ALTER TABLE public.products ADD CONSTRAINT products_company_barcode_unique UNIQUE (company_id, barcode);
    END IF;

    -- 2. Fix SKU Uniqueness
    -- Remove the global unique index
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace WHERE c.relname = 'idx_products_sku') THEN
        DROP INDEX IF EXISTS public.idx_products_sku;
    END IF;

    -- Add the restaurant-scoped unique index for SKU
    -- Filter out NULLs so multiple products can have no SKU without collision
    IF NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace WHERE c.relname = 'idx_products_company_sku') THEN
        CREATE UNIQUE INDEX idx_products_company_sku ON public.products USING btree (company_id, sku) WHERE (sku IS NOT NULL);
    END IF;

END $$;
