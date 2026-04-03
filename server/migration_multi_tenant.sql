-- ==========================================================
-- Phase 1: Multi-Tenancy Migration (THE BIG SYNC)
-- ==========================================================
-- This script transforms your single-shop POS into a Multi-Tenant
-- platform by adding "Company" context to every single table.
-- ==========================================================

-- 1. CREATE THE COMPANIES TABLE
CREATE TABLE IF NOT EXISTS public.companies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    login_pin VARCHAR(20),
    profile_image TEXT,
    address TEXT,
    tax_id VARCHAR(100),
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. CREATE A "DEFAULT SHOP" (For existing data)
-- We use a fixed UUID so we can easily reference it in the migration
INSERT INTO public.companies (id, name, status)
VALUES ('00000000-0000-0000-0000-000000000000', 'Initial Shop (Default)', 'active')
ON CONFLICT (id) DO NOTHING;

-- 3. ADD company_id TO ALL 18 TABLES
-- We add it as a UUID column that defaults to the 'Initial Shop' ID.
-- This ensures all your existing data is automatically tagged.

-- Table: employees
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS company_id UUID DEFAULT '00000000-0000-0000-0000-000000000000' REFERENCES companies(id);

-- Table: products
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS company_id UUID DEFAULT '00000000-0000-0000-0000-000000000000' REFERENCES companies(id);

-- Table: product_sizes
ALTER TABLE public.product_sizes ADD COLUMN IF NOT EXISTS company_id UUID DEFAULT '00000000-0000-0000-0000-000000000000' REFERENCES companies(id);

-- Table: combos
ALTER TABLE public.combos ADD COLUMN IF NOT EXISTS company_id UUID DEFAULT '00000000-0000-0000-0000-000000000000' REFERENCES companies(id);

-- Table: combo_items
ALTER TABLE public.combo_items ADD COLUMN IF NOT EXISTS company_id UUID DEFAULT '00000000-0000-0000-0000-000000000000' REFERENCES companies(id);

-- Table: modifiers
ALTER TABLE public.modifiers ADD COLUMN IF NOT EXISTS company_id UUID DEFAULT '00000000-0000-0000-0000-000000000000' REFERENCES companies(id);

-- Table: tables
ALTER TABLE public.tables ADD COLUMN IF NOT EXISTS company_id UUID DEFAULT '00000000-0000-0000-0000-000000000000' REFERENCES companies(id);

-- Table: orders
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS company_id UUID DEFAULT '00000000-0000-0000-0000-000000000000' REFERENCES companies(id);

-- Table: order_items
ALTER TABLE public.order_items ADD COLUMN IF NOT EXISTS company_id UUID DEFAULT '00000000-0000-0000-0000-000000000000' REFERENCES companies(id);

-- Table: order_payments
ALTER TABLE public.order_payments ADD COLUMN IF NOT EXISTS company_id UUID DEFAULT '00000000-0000-0000-0000-000000000000' REFERENCES companies(id);

-- Table: order_item_adjustments
ALTER TABLE public.order_item_adjustments ADD COLUMN IF NOT EXISTS company_id UUID DEFAULT '00000000-0000-0000-0000-000000000000' REFERENCES companies(id);

-- Table: customers
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS company_id UUID DEFAULT '00000000-0000-0000-0000-000000000000' REFERENCES companies(id);

-- Table: customer_ledger
ALTER TABLE public.customer_ledger ADD COLUMN IF NOT EXISTS company_id UUID DEFAULT '00000000-0000-0000-0000-000000000000' REFERENCES companies(id);

-- Table: ingredients
ALTER TABLE public.ingredients ADD COLUMN IF NOT EXISTS company_id UUID DEFAULT '00000000-0000-0000-0000-000000000000' REFERENCES companies(id);

-- Allow same ingredient names across companies (case-insensitive within a company)
ALTER TABLE public.ingredients DROP CONSTRAINT IF EXISTS ingredients_name_key;
CREATE UNIQUE INDEX IF NOT EXISTS idx_ingredients_company_name_ci
  ON public.ingredients (company_id, lower(name));

-- Table: product_composition
ALTER TABLE public.product_composition ADD COLUMN IF NOT EXISTS company_id UUID DEFAULT '00000000-0000-0000-0000-000000000000' REFERENCES companies(id);
ALTER TABLE public.product_composition ADD COLUMN IF NOT EXISTS size_id INTEGER;

-- Unique link for recipe variants
ALTER TABLE public.product_composition DROP CONSTRAINT IF EXISTS product_composition_unique_link;
ALTER TABLE public.product_composition ADD CONSTRAINT product_composition_unique_link UNIQUE (company_id, product_id, ingredient_id, size_id);

-- Table: inventory_transactions
ALTER TABLE public.inventory_transactions ADD COLUMN IF NOT EXISTS company_id UUID DEFAULT '00000000-0000-0000-0000-000000000000' REFERENCES companies(id);
ALTER TABLE public.inventory_transactions ADD COLUMN IF NOT EXISTS size_id INTEGER;

-- Table: shifts
ALTER TABLE public.shifts ADD COLUMN IF NOT EXISTS company_id UUID DEFAULT '00000000-0000-0000-0000-000000000000' REFERENCES companies(id);

-- Table: system_settings
ALTER TABLE public.system_settings ADD COLUMN IF NOT EXISTS company_id UUID DEFAULT '00000000-0000-0000-0000-000000000000' REFERENCES companies(id);

-- 4. UPDATE UNIQUE CONSTRAINTS
-- We must make sure that fields like "key" in settings or "table_number" are unique PER COMPANY.

-- Table: system_settings (Allow the same key for different companies)
ALTER TABLE public.system_settings DROP CONSTRAINT IF EXISTS system_settings_key_key;
ALTER TABLE public.system_settings ADD CONSTRAINT system_settings_company_key_unique UNIQUE (company_id, key);

-- Loyalty / Discounts on customers
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS loyalty_points INTEGER DEFAULT 0;
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS loyalty_tier VARCHAR(50) DEFAULT 'basic';
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS loyalty_discount NUMERIC(5,2) DEFAULT 0;

-- Table: tables (Allow the same table number for different companies)
ALTER TABLE public.tables DROP CONSTRAINT IF EXISTS tables_table_number_key;
ALTER TABLE public.tables ADD CONSTRAINT tables_company_number_unique UNIQUE (company_id, table_number);

-- Table: products (Allow same name, barcode, or SKU in different shops)
ALTER TABLE public.products DROP CONSTRAINT IF EXISTS products_name_key;
ALTER TABLE public.products ADD CONSTRAINT products_company_name_unique UNIQUE (company_id, name);

-- Barcode isolation
ALTER TABLE public.products DROP CONSTRAINT IF EXISTS products_barcode_key;
ALTER TABLE public.products ADD CONSTRAINT products_company_barcode_unique UNIQUE (company_id, barcode);

-- SKU isolation (using custom index to allow multiple NULLs)
DROP INDEX IF EXISTS public.idx_products_sku;
CREATE UNIQUE INDEX idx_products_company_sku ON public.products USING btree (company_id, sku) WHERE (sku IS NOT NULL);

-- Table: modifiers (Allow same name in different shops)
-- Note: The table might be created by ensureModifiersTable, so we use IF EXISTS
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'modifiers_name_key') THEN
        ALTER TABLE public.modifiers DROP CONSTRAINT modifiers_name_key;
    END IF;
END $$;
ALTER TABLE public.modifiers ADD CONSTRAINT modifiers_company_name_unique UNIQUE (company_id, name);

-- Table: employees (Email uniqueness)
-- Usually, authentication emails should stay globally unique to avoid login collisions, 
-- but if we want to allow the same email in different companies, we'd add company_id here.
-- For now, we'll keep email globally unique for the master login system.

-- 4. CLEANUP (OPTIONAL)
-- If you want new records to struggle if they don't have a company_id, 
-- we would remove the default value after migration. 
-- However, for the first stage, we keep it for safety.

-- ==========================================================
-- SCRIPT COMPLETE: Your database is now Multi-Tenant ready!
-- ==========================================================
