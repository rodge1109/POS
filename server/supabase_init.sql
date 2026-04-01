-- ==========================================================
-- Supabase Master Initialization - Multi-Tenant POS Platform
-- ==========================================================
-- This script ensures your Supabase architecture has the full 
-- multi-tenancy support required for the latest build.
-- Run this in your Supabase SQL Editor.
-- ==========================================================

-- 0. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. COMPANIES TABLE (Tenant Master)
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

-- REPAIR: Add missing company columns
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS login_pin VARCHAR(20);

-- INITIAL SEED: The "Default Shop" (Zeros UUID)
INSERT INTO public.companies (id, name, login_pin, status)
VALUES ('00000000-0000-0000-0000-000000000000', 'Initial Shop (Default)', '123456', 'active')
ON CONFLICT (id) DO NOTHING;

-- 2. EMPLOYEES REPAIR & SEED
CREATE TABLE IF NOT EXISTS public.employees (
    id SERIAL PRIMARY KEY,
    company_id UUID DEFAULT '00000000-0000-0000-0000-000000000000' REFERENCES companies(id),
    username VARCHAR(50) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    "PIN" NUMERIC,
    name VARCHAR(101) NOT NULL,
    role VARCHAR(20) NOT NULL,
    active BOOLEAN DEFAULT true,
    email VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- REPAIR: Ensure columns and constraints exist
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS "PIN" NUMERIC;
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS company_id UUID DEFAULT '00000000-0000-0000-0000-000000000000' REFERENCES companies(id);

-- DROP LEGACY SINGLE-TENANT CONSTRAINTS
ALTER TABLE public.employees DROP CONSTRAINT IF EXISTS employees_username_key;
ALTER TABLE public.employees DROP CONSTRAINT IF EXISTS employees_company_id_username_unique;
ALTER TABLE public.employees ADD CONSTRAINT employees_company_id_username_unique UNIQUE (company_id, username);

-- PRE-SEED: Admin User (Kiara)
INSERT INTO public.employees (company_id, username, password_hash, "PIN", name, role, email)
VALUES ('00000000-0000-0000-0000-000000000000', 'admin', 'admin', 1234, 'Admin User', 'admin', 'kiara@gmail.com')
ON CONFLICT (company_id, username) DO NOTHING;

-- 3. OTHER CORE TABLES REPAIR

-- Table: tables
CREATE TABLE IF NOT EXISTS public.tables (
    id SERIAL PRIMARY KEY,
    company_id UUID DEFAULT '00000000-0000-0000-0000-000000000000' REFERENCES companies(id),
    table_number VARCHAR(10) NOT NULL,
    capacity INTEGER DEFAULT 4 NOT NULL,
    section VARCHAR(50) DEFAULT 'Main',
    status VARCHAR(20) DEFAULT 'available' NOT NULL,
    current_order_id INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
ALTER TABLE public.tables ADD COLUMN IF NOT EXISTS company_id UUID DEFAULT '00000000-0000-0000-0000-000000000000' REFERENCES companies(id);
ALTER TABLE public.tables DROP CONSTRAINT IF EXISTS tables_table_number_key;
ALTER TABLE public.tables DROP CONSTRAINT IF EXISTS tables_company_number_unique;
ALTER TABLE public.tables ADD CONSTRAINT tables_company_number_unique UNIQUE (company_id, table_number);

-- Table: products
CREATE TABLE IF NOT EXISTS public.products (
    id SERIAL PRIMARY KEY,
    company_id UUID DEFAULT '00000000-0000-0000-0000-000000000000' REFERENCES companies(id),
    name VARCHAR(255) NOT NULL,
    category VARCHAR(100) NOT NULL,
    price NUMERIC(10,2),
    cost NUMERIC(10,2) DEFAULT 0,
    description TEXT,
    image VARCHAR(500),
    popular BOOLEAN DEFAULT false,
    barcode VARCHAR(100),
    sku VARCHAR(100),
    active BOOLEAN DEFAULT true,
    stock_quantity INTEGER DEFAULT 0,
    low_stock_threshold INTEGER DEFAULT 10,
    send_to_kitchen BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS company_id UUID DEFAULT '00000000-0000-0000-0000-000000000000' REFERENCES companies(id);
ALTER TABLE public.products DROP CONSTRAINT IF EXISTS products_name_key;
ALTER TABLE public.products DROP CONSTRAINT IF EXISTS products_company_name_unique;
ALTER TABLE public.products ADD CONSTRAINT products_company_name_unique UNIQUE (company_id, name);

-- Table: modifiers
CREATE TABLE IF NOT EXISTS public.modifiers (
    id SERIAL PRIMARY KEY,
    company_id UUID DEFAULT '00000000-0000-0000-0000-000000000000' REFERENCES companies(id),
    name VARCHAR(120) NOT NULL,
    type VARCHAR(30) DEFAULT 'addon' NOT NULL,
    price NUMERIC(10,2) DEFAULT 0 NOT NULL,
    active BOOLEAN DEFAULT true NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
ALTER TABLE public.modifiers ADD COLUMN IF NOT EXISTS company_id UUID DEFAULT '00000000-0000-0000-0000-000000000000' REFERENCES companies(id);
ALTER TABLE public.modifiers DROP CONSTRAINT IF EXISTS modifiers_name_key;
ALTER TABLE public.modifiers DROP CONSTRAINT IF EXISTS modifiers_company_name_unique;
ALTER TABLE public.modifiers ADD CONSTRAINT modifiers_company_name_unique UNIQUE (company_id, name);

-- Table: system_settings
CREATE TABLE IF NOT EXISTS public.system_settings (
    id SERIAL PRIMARY KEY,
    company_id UUID DEFAULT '00000000-0000-0000-0000-000000000000' REFERENCES companies(id),
    key VARCHAR(100) NOT NULL,
    value TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
ALTER TABLE public.system_settings ADD COLUMN IF NOT EXISTS company_id UUID DEFAULT '00000000-0000-0000-0000-000000000000' REFERENCES companies(id);
ALTER TABLE public.system_settings DROP CONSTRAINT IF EXISTS system_settings_key_key;
ALTER TABLE public.system_settings DROP CONSTRAINT IF EXISTS system_settings_company_key_unique;
ALTER TABLE public.system_settings ADD CONSTRAINT system_settings_company_key_unique UNIQUE (company_id, key);

-- 4. CLEANUP AND INDEXES
CREATE INDEX IF NOT EXISTS idx_products_company_barcode ON products(company_id, barcode);
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);
