 -- ==========================================================
-- Supabase "TOTAL SYNC" - Comprehensive 18-Table Sync Script
-- ==========================================================
-- Safety: Uses IF NOT EXISTS for all operations. No data loss.
-- ==========================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. CREATE TABLES (IF MISSING)
CREATE TABLE IF NOT EXISTS public.employees (id SERIAL PRIMARY KEY, username VARCHAR(50) NOT NULL UNIQUE, password_hash VARCHAR(255) NOT NULL, name VARCHAR(100) NOT NULL, role VARCHAR(20) NOT NULL, active BOOLEAN DEFAULT true, created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP, email VARCHAR(255));
CREATE TABLE IF NOT EXISTS public.shifts (id SERIAL PRIMARY KEY, employee_id INTEGER NOT NULL, start_time TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL, end_time TIMESTAMP WITH TIME ZONE, opening_cash DECIMAL(10,2) DEFAULT 0 NOT NULL, closing_cash DECIMAL(10,2), expected_cash DECIMAL(10,2), cash_variance DECIMAL(10,2), status VARCHAR(20) DEFAULT 'active' NOT NULL, notes TEXT, created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS public.tables (id SERIAL PRIMARY KEY, table_number VARCHAR(10) NOT NULL UNIQUE, capacity INTEGER DEFAULT 4 NOT NULL, section VARCHAR(50) DEFAULT 'Main', status VARCHAR(20) DEFAULT 'available' NOT NULL, current_order_id INTEGER, created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS public.products (id SERIAL PRIMARY KEY, name VARCHAR(255) NOT NULL, category VARCHAR(100) NOT NULL, price DECIMAL(10,2), description TEXT, image VARCHAR(500), popular BOOLEAN DEFAULT false, created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP, barcode VARCHAR(100), active BOOLEAN DEFAULT true, stock_quantity INTEGER DEFAULT 0, low_stock_threshold INTEGER DEFAULT 10, send_to_kitchen BOOLEAN DEFAULT true, sku VARCHAR(100));
CREATE TABLE IF NOT EXISTS public.customers (id SERIAL PRIMARY KEY, name VARCHAR(255) NOT NULL, email VARCHAR(255), phone VARCHAR(50), address TEXT, city VARCHAR(100), barangay VARCHAR(100), player_id VARCHAR(255), created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP, pin VARCHAR(6), credit_balance DECIMAL(10,2) DEFAULT 0, credit_limit DECIMAL(10,2) DEFAULT 1000, updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP, company_id UUID DEFAULT '00000000-0000-0000-0000-000000000000' REFERENCES companies(id), loyalty_points INTEGER DEFAULT 0, loyalty_tier VARCHAR(50) DEFAULT 'basic', loyalty_discount NUMERIC(5,2) DEFAULT 0);
CREATE TABLE IF NOT EXISTS public.customer_ledger (id SERIAL PRIMARY KEY, customer_id INTEGER REFERENCES public.customers (id) ON DELETE CASCADE, order_id INTEGER REFERENCES public.orders (id), transaction_type VARCHAR(50) NOT NULL, amount DECIMAL(10,2) NOT NULL, balance_after DECIMAL(10,2) NOT NULL, notes TEXT, created_by VARCHAR(100), created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP, company_id UUID DEFAULT '00000000-0000-0000-0000-000000000000' REFERENCES companies(id));
CREATE TABLE IF NOT EXISTS public.ingredients (id SERIAL PRIMARY KEY, name VARCHAR(255) NOT NULL, unit VARCHAR(50) NOT NULL, current_stock DECIMAL(10,3) DEFAULT 0 NOT NULL, reorder_level DECIMAL(10,3) DEFAULT 0, supplier VARCHAR(255), supplier_contact VARCHAR(100), cost_per_unit DECIMAL(10,2) DEFAULT 0 NOT NULL, created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS public.inventory_transactions (id SERIAL PRIMARY KEY, ingredient_id INTEGER, transaction_type VARCHAR(50) NOT NULL, quantity_change DECIMAL(10,3) NOT NULL, quantity_after DECIMAL(10,3) NOT NULL, reference_id INTEGER, reference_type VARCHAR(50), notes TEXT, created_by VARCHAR(100), created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS public.combos (id SERIAL PRIMARY KEY, name VARCHAR(255) NOT NULL, description TEXT, price DECIMAL(10,2) NOT NULL, image VARCHAR(500), active BOOLEAN DEFAULT true, created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS public.combo_items (id SERIAL PRIMARY KEY, combo_id INTEGER, product_id INTEGER, quantity INTEGER DEFAULT 1, size_name VARCHAR(50));
CREATE TABLE IF NOT EXISTS public.product_sizes (id SERIAL PRIMARY KEY, product_id INTEGER, size_name VARCHAR(50) NOT NULL, price DECIMAL(10,2) NOT NULL);
CREATE TABLE IF NOT EXISTS public.product_composition (id SERIAL PRIMARY KEY, product_id INTEGER, ingredient_id INTEGER, quantity_required DECIMAL(10,3) NOT NULL, created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS public.modifiers (id SERIAL PRIMARY KEY, name VARCHAR(120) NOT NULL UNIQUE, type VARCHAR(30) DEFAULT 'addon' NOT NULL, price DECIMAL(10,2) DEFAULT 0 NOT NULL, active BOOLEAN DEFAULT true NOT NULL, created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS public.orders (id SERIAL PRIMARY KEY, order_number VARCHAR(50) NOT NULL UNIQUE, customer_id INTEGER, subtotal DECIMAL(10,2) NOT NULL, delivery_fee DECIMAL(10,2) DEFAULT 0, tax_amount DECIMAL(10,2) NOT NULL, discount_amount DECIMAL(10,2) DEFAULT 0, total_amount DECIMAL(10,2) NOT NULL, payment_method VARCHAR(50) NOT NULL, payment_reference VARCHAR(255), payment_status VARCHAR(50) DEFAULT 'pending', order_status VARCHAR(50) DEFAULT 'received', order_type VARCHAR(50) DEFAULT 'online', created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP, service_type VARCHAR(20) DEFAULT 'dine-in', shift_id INTEGER, table_id INTEGER, parent_order_id INTEGER);
CREATE TABLE IF NOT EXISTS public.order_items (id SERIAL PRIMARY KEY, order_id INTEGER, product_id INTEGER, product_name VARCHAR(255) NOT NULL, size_name VARCHAR(50), quantity INTEGER NOT NULL, unit_price DECIMAL(10,2) NOT NULL, subtotal DECIMAL(10,2) NOT NULL, combo_id INTEGER, is_combo BOOLEAN DEFAULT false, notes TEXT, status VARCHAR(20) DEFAULT 'active');
CREATE TABLE IF NOT EXISTS public.order_payments (id SERIAL PRIMARY KEY, order_id INTEGER, payment_method VARCHAR(50) NOT NULL, amount DECIMAL(10,2) NOT NULL, payment_reference VARCHAR(255), created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS public.order_item_adjustments (id SERIAL PRIMARY KEY, order_item_id INTEGER, order_id INTEGER, adjustment_type VARCHAR(20) NOT NULL, reason TEXT NOT NULL, original_amount DECIMAL(10,2) NOT NULL, created_by VARCHAR(100), created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS public.system_settings (id SERIAL PRIMARY KEY, key VARCHAR(100) NOT NULL, value TEXT, updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP);

-- 3. ADD MISSING COLUMNS (SAFE ALTER)
-- Orders Additions
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS discount_amount DECIMAL(10,2) DEFAULT 0;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS tax_amount DECIMAL(10,2) DEFAULT 0;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS service_type VARCHAR(20) DEFAULT 'dine-in';
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS order_status VARCHAR(50) DEFAULT 'received';
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS payment_status VARCHAR(50) DEFAULT 'pending';
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS shift_id INTEGER;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS table_id INTEGER;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS parent_order_id INTEGER;

-- Products Additions
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS barcode VARCHAR(100);
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS sku VARCHAR(100);
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS send_to_kitchen BOOLEAN DEFAULT true;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS active BOOLEAN DEFAULT true;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS stock_quantity INTEGER DEFAULT 0;

-- Employees Additions
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS email VARCHAR(255);
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS active BOOLEAN DEFAULT true;

-- Customers Additions
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS pin VARCHAR(6);
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS credit_balance DECIMAL(10,2) DEFAULT 0;
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS credit_limit DECIMAL(10,2) DEFAULT 1000;
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS company_id UUID DEFAULT '00000000-0000-0000-0000-000000000000' REFERENCES companies(id);
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS loyalty_points INTEGER DEFAULT 0;
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS loyalty_tier VARCHAR(50) DEFAULT 'basic';
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS loyalty_discount NUMERIC(5,2) DEFAULT 0;

-- 4. CONSTRAINTS (IF MISSING)
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'employees_role_check') THEN
        ALTER TABLE public.employees ADD CONSTRAINT employees_role_check CHECK (role IN ('admin', 'manager', 'cashier', 'waiter'));
    END IF;
END $$;

-- 5. INDEXES (PERFORMANCE)
CREATE INDEX IF NOT EXISTS idx_orders_order_number ON orders(order_number);
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_products_barcode ON products(barcode);
CREATE INDEX IF NOT EXISTS idx_customer_ledger_customer_id ON customer_ledger(customer_id);
