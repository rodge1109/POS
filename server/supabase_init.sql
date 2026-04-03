-- ==========================================================
-- Supabase Master Initialization - Multi-Tenant POS Platform
-- ==========================================================
-- Run this in your Supabase SQL Editor.
-- ==========================================================

-- 0. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. COMPANIES TABLE
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
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS login_pin VARCHAR(20);

-- 2. EMPLOYEES
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS "PIN" NUMERIC;
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS company_id UUID DEFAULT '00000000-0000-0000-0000-000000000000' REFERENCES companies(id);
ALTER TABLE public.employees DROP CONSTRAINT IF EXISTS employees_username_key;
ALTER TABLE public.employees DROP CONSTRAINT IF EXISTS employees_company_id_username_unique;
ALTER TABLE public.employees ADD CONSTRAINT employees_company_id_username_unique UNIQUE (company_id, username);

-- 3. ORDERS (CRITICAL FOR PAYMENT FIX)
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS company_id UUID DEFAULT '00000000-0000-0000-0000-000000000000' REFERENCES companies(id);
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS order_number VARCHAR(50);
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS customer_id INTEGER;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS subtotal NUMERIC(10,2);
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS delivery_fee NUMERIC(10,2) DEFAULT 0;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS tax_amount NUMERIC(10,2) DEFAULT 0;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS discount_amount NUMERIC(10,2) DEFAULT 0;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS total_amount NUMERIC(10,2);
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS payment_method VARCHAR(50);
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS payment_reference VARCHAR(255);
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS payment_status VARCHAR(50) DEFAULT 'pending';
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS order_status VARCHAR(50) DEFAULT 'received';
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS order_type VARCHAR(50) DEFAULT 'pos';
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS service_type VARCHAR(20) DEFAULT 'dine-in';
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS shift_id INTEGER;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS table_id INTEGER;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS parent_order_id INTEGER;

-- 4. ORDER ITEMS
ALTER TABLE public.order_items ADD COLUMN IF NOT EXISTS company_id UUID DEFAULT '00000000-0000-0000-0000-000000000000' REFERENCES companies(id);
ALTER TABLE public.order_items ADD COLUMN IF NOT EXISTS product_id INTEGER;
ALTER TABLE public.order_items ADD COLUMN IF NOT EXISTS product_name VARCHAR(255);
ALTER TABLE public.order_items ADD COLUMN IF NOT EXISTS size_name VARCHAR(50);
ALTER TABLE public.order_items ADD COLUMN IF NOT EXISTS quantity INTEGER;
ALTER TABLE public.order_items ADD COLUMN IF NOT EXISTS unit_price NUMERIC(10,2);
ALTER TABLE public.order_items ADD COLUMN IF NOT EXISTS subtotal NUMERIC(10,2);
ALTER TABLE public.order_items ADD COLUMN IF NOT EXISTS combo_id INTEGER;
ALTER TABLE public.order_items ADD COLUMN IF NOT EXISTS is_combo BOOLEAN DEFAULT false;
ALTER TABLE public.order_items ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'active';

-- 5. TABLES, PRODUCTS & MODIFIERS REPAIR
ALTER TABLE public.tables ADD COLUMN IF NOT EXISTS company_id UUID DEFAULT '00000000-0000-0000-0000-000000000000' REFERENCES companies(id);
ALTER TABLE public.tables ADD COLUMN IF NOT EXISTS table_number VARCHAR(50);
ALTER TABLE public.tables ADD COLUMN IF NOT EXISTS capacity INTEGER DEFAULT 4;
ALTER TABLE public.tables ADD COLUMN IF NOT EXISTS section VARCHAR(100) DEFAULT 'Main';
ALTER TABLE public.tables ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'available';
ALTER TABLE public.tables ADD COLUMN IF NOT EXISTS current_order_id UUID;
ALTER TABLE public.tables ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE public.products ADD COLUMN IF NOT EXISTS company_id UUID DEFAULT '00000000-0000-0000-0000-000000000000' REFERENCES companies(id);
ALTER TABLE public.modifiers ADD COLUMN IF NOT EXISTS company_id UUID DEFAULT '00000000-0000-0000-0000-000000000000' REFERENCES companies(id);
ALTER TABLE public.modifiers ADD COLUMN IF NOT EXISTS type VARCHAR(30) DEFAULT 'addon';

-- 6. INVENTORY & RECIPES REPAIR
ALTER TABLE public.product_composition ADD COLUMN IF NOT EXISTS size_id INTEGER;
ALTER TABLE public.inventory_transactions ADD COLUMN IF NOT EXISTS size_id INTEGER;

-- 7. CUSTOMERS & LEDGER REPAIR
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS company_id UUID DEFAULT '00000000-0000-0000-0000-000000000000' REFERENCES companies(id);
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS loyalty_points integer DEFAULT 0;
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS loyalty_tier character varying(50) DEFAULT 'basic';
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS loyalty_discount numeric(5,2) DEFAULT 0;
ALTER TABLE public.customer_ledger ADD COLUMN IF NOT EXISTS company_id UUID DEFAULT '00000000-0000-0000-0000-000000000000' REFERENCES companies(id);

-- Ensure unique constraint for recipe variants
ALTER TABLE public.product_composition DROP CONSTRAINT IF EXISTS product_composition_unique_link;
ALTER TABLE public.product_composition ADD CONSTRAINT product_composition_unique_link UNIQUE (company_id, product_id, ingredient_id, size_id);

-- INITIAL SEEDS
INSERT INTO public.companies (id, name, login_pin, status)
VALUES ('00000000-0000-0000-0000-000000000000', 'Initial Shop (Default)', '123456', 'active')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.employees (company_id, username, password_hash, "PIN", name, role, email)
VALUES ('00000000-0000-0000-0000-000000000000', 'admin', 'admin', 1234, 'Admin User', 'admin', 'kiara@gmail.com')
ON CONFLICT (company_id, username) DO NOTHING;
