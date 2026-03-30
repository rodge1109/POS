-- ==========================================================
-- Supabase Master Initialization - Multi-Tenant POS Platform
-- ==========================================================
-- This script mirrors your 18-table POS architecture with full 
-- multi-tenancy support using company_id (UUID).
-- Run this in your Supabase SQL Editor.
-- ==========================================================

-- 0. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. COMPANIES TABLE (Tenant Master)
CREATE TABLE IF NOT EXISTS public.companies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    profile_image TEXT,
    address TEXT,
    tax_id VARCHAR(100),
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- INITIAL SEED: The "Default Shop" (Zeros UUID)
INSERT INTO public.companies (id, name, status)
VALUES ('00000000-0000-0000-0000-000000000000', 'Initial Shop (Default)', 'active')
ON CONFLICT (id) DO NOTHING;

-- 2. CORE POS TABLES (Scoped by company_id)

-- Table: employees
CREATE TABLE IF NOT EXISTS public.employees (
    id SERIAL PRIMARY KEY,
    company_id UUID DEFAULT '00000000-0000-0000-0000-000000000000' REFERENCES companies(id),
    username VARCHAR(50) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(100) NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('admin', 'manager', 'cashier', 'waiter')),
    active BOOLEAN DEFAULT true,
    email VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (company_id, username)
);

-- Table: shifts
CREATE TABLE IF NOT EXISTS public.shifts (
    id SERIAL PRIMARY KEY,
    company_id UUID DEFAULT '00000000-0000-0000-0000-000000000000' REFERENCES companies(id),
    employee_id INTEGER NOT NULL,
    start_time TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    end_time TIMESTAMP WITH TIME ZONE,
    opening_cash NUMERIC(10,2) DEFAULT 0 NOT NULL,
    closing_cash NUMERIC(10,2),
    expected_cash NUMERIC(10,2),
    cash_variance NUMERIC(10,2),
    status VARCHAR(20) DEFAULT 'active' NOT NULL CHECK (status IN ('active', 'closed')),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Table: tables
CREATE TABLE IF NOT EXISTS public.tables (
    id SERIAL PRIMARY KEY,
    company_id UUID DEFAULT '00000000-0000-0000-0000-000000000000' REFERENCES companies(id),
    table_number VARCHAR(10) NOT NULL,
    capacity INTEGER DEFAULT 4 NOT NULL,
    section VARCHAR(50) DEFAULT 'Main',
    status VARCHAR(20) DEFAULT 'available' NOT NULL CHECK (status IN ('available', 'occupied', 'reserved', 'needs-cleaning')),
    current_order_id INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (company_id, table_number)
);

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
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (company_id, name)
);

-- Table: modifieres
CREATE TABLE IF NOT EXISTS public.modifiers (
    id SERIAL PRIMARY KEY,
    company_id UUID DEFAULT '00000000-0000-0000-0000-000000000000' REFERENCES companies(id),
    name VARCHAR(120) NOT NULL,
    type VARCHAR(30) DEFAULT 'addon' NOT NULL CHECK (type IN ('addon', 'option')),
    price NUMERIC(10,2) DEFAULT 0 NOT NULL,
    active BOOLEAN DEFAULT true NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (company_id, name)
);

-- Table: product_sizes
CREATE TABLE IF NOT EXISTS public.product_sizes (
    id SERIAL PRIMARY KEY,
    company_id UUID DEFAULT '00000000-0000-0000-0000-000000000000' REFERENCES companies(id),
    product_id INTEGER REFERENCES products(id),
    size_name VARCHAR(50) NOT NULL,
    price NUMERIC(10,2) NOT NULL
);

-- Table: customers
CREATE TABLE IF NOT EXISTS public.customers (
    id SERIAL PRIMARY KEY,
    company_id UUID DEFAULT '00000000-0000-0000-0000-000000000000' REFERENCES companies(id),
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(50),
    address TEXT,
    city VARCHAR(100),
    barangay VARCHAR(100),
    player_id VARCHAR(255),
    pin VARCHAR(6),
    credit_balance NUMERIC(10,2) DEFAULT 0,
    credit_limit NUMERIC(10,2) DEFAULT 1000,
    loyalty_points INTEGER DEFAULT 0,
    loyalty_tier VARCHAR(50) DEFAULT 'basic',
    loyalty_discount NUMERIC(5,2) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Table: order-related tables
CREATE TABLE IF NOT EXISTS public.orders (
    id SERIAL PRIMARY KEY,
    company_id UUID DEFAULT '00000000-0000-0000-0000-000000000000' REFERENCES companies(id),
    order_number VARCHAR(50) NOT NULL,
    customer_id INTEGER,
    subtotal NUMERIC(10,2) NOT NULL,
    delivery_fee NUMERIC(10,2) DEFAULT 0,
    tax_amount NUMERIC(10,2) NOT NULL,
    discount_amount NUMERIC(10,2) DEFAULT 0,
    total_amount NUMERIC(10,2) NOT NULL,
    payment_method VARCHAR(50) NOT NULL,
    payment_reference VARCHAR(255),
    payment_status VARCHAR(50) DEFAULT 'pending',
    order_status VARCHAR(50) DEFAULT 'received',
    order_type VARCHAR(50) DEFAULT 'online',
    service_type VARCHAR(20) DEFAULT 'dine-in',
    shift_id INTEGER,
    table_id INTEGER,
    parent_order_id INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (company_id, order_number)
);

CREATE TABLE IF NOT EXISTS public.order_items (
    id SERIAL PRIMARY KEY,
    company_id UUID DEFAULT '00000000-0000-0000-0000-000000000000' REFERENCES companies(id),
    order_id INTEGER REFERENCES orders(id),
    product_id INTEGER,
    product_name VARCHAR(255) NOT NULL,
    size_name VARCHAR(50),
    quantity INTEGER NOT NULL,
    unit_price NUMERIC(10,2) NOT NULL,
    subtotal NUMERIC(10,2) NOT NULL,
    combo_id INTEGER,
    is_combo BOOLEAN DEFAULT false,
    notes TEXT,
    status VARCHAR(20) DEFAULT 'active'
);

CREATE TABLE IF NOT EXISTS public.order_payments (
    id SERIAL PRIMARY KEY,
    company_id UUID DEFAULT '00000000-0000-0000-0000-000000000000' REFERENCES companies(id),
    order_id INTEGER REFERENCES orders(id),
    payment_method VARCHAR(50) NOT NULL,
    amount NUMERIC(10,2) NOT NULL,
    payment_reference VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Table: inventory tables
CREATE TABLE IF NOT EXISTS public.ingredients (
    id SERIAL PRIMARY KEY,
    company_id UUID DEFAULT '00000000-0000-0000-0000-000000000000' REFERENCES companies(id),
    name VARCHAR(255) NOT NULL,
    unit VARCHAR(50) NOT NULL,
    current_stock NUMERIC(10,3) DEFAULT 0 NOT NULL,
    reorder_level NUMERIC(10,3) DEFAULT 0,
    supplier VARCHAR(255),
    supplier_contact VARCHAR(100),
    cost_per_unit NUMERIC(10,2) DEFAULT 0 NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_ingredients_company_name_ci ON public.ingredients (company_id, lower(name));

CREATE TABLE IF NOT EXISTS public.system_settings (
    id SERIAL PRIMARY KEY,
    company_id UUID DEFAULT '00000000-0000-0000-0000-000000000000' REFERENCES companies(id),
    key VARCHAR(100) NOT NULL,
    value TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (company_id, key)
);

-- 3. INDEXES
CREATE INDEX IF NOT EXISTS idx_products_company_barcode ON products(company_id, barcode);
CREATE INDEX IF NOT EXISTS idx_orders_company_number ON orders(company_id, order_number);
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);
