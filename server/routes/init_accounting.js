import pg from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

const schema = `
-- 1. Vendors/Suppliers
CREATE TABLE IF NOT EXISTS vendors (
    id SERIAL PRIMARY KEY,
    company_id UUID NOT NULL,
    name TEXT NOT NULL,
    contact_person TEXT,
    email TEXT,
    phone TEXT,
    address TEXT,
    tin TEXT, -- Tax ID
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Chart of Accounts
CREATE TABLE IF NOT EXISTS accounts (
    id SERIAL PRIMARY KEY,
    company_id UUID NOT NULL,
    code TEXT NOT NULL, -- e.g. 1000, 5000
    name TEXT NOT NULL, -- e.g. Cash on Hand, Sales Revenue
    type TEXT NOT NULL, -- Asset, Liability, Equity, Revenue, Expense
    category TEXT,      -- Current Asset, Operating Expense, etc.
    description TEXT,
    active BOOLEAN DEFAULT TRUE,
    parent_id INTEGER REFERENCES accounts(id),
    is_header BOOLEAN DEFAULT FALSE,
    is_system BOOLEAN DEFAULT FALSE, -- Predefined accounts that shouldn't be deleted
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(company_id, code)
);

-- 3. Accounting Transactions (Journal Entries)
CREATE TABLE IF NOT EXISTS journal_entries (
    id SERIAL PRIMARY KEY,
    company_id UUID NOT NULL,
    transaction_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    reference_no TEXT, -- Invoice #, Receipt #, Order #
    description TEXT,
    source_module TEXT, -- 'pos', 'expenses', 'inventory', 'manual'
    created_by UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. Ledger Entries (Double Entry)
CREATE TABLE IF NOT EXISTS ledger_entries (
    id SERIAL PRIMARY KEY,
    company_id UUID NOT NULL,
    journal_entry_id INTEGER REFERENCES journal_entries(id) ON DELETE CASCADE,
    account_id INTEGER REFERENCES accounts(id),
    debit DECIMAL(15,2) DEFAULT 0,
    credit DECIMAL(15,2) DEFAULT 0,
    memo TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. Expenses (Simplified Record)
CREATE TABLE IF NOT EXISTS expenses (
    id SERIAL PRIMARY KEY,
    company_id UUID NOT NULL,
    vendor_id INTEGER REFERENCES vendors(id),
    category TEXT NOT NULL, -- operational, admin, inventory, etc.
    amount DECIMAL(15,2) NOT NULL,
    tax_amount DECIMAL(15,2) DEFAULT 0,
    total_amount DECIMAL(15,2) NOT NULL,
    payment_status TEXT DEFAULT 'paid', -- paid, pending, partial
    payment_method TEXT, -- cash, bank_transfer, credit
    date_incurred DATE NOT NULL DEFAULT CURRENT_DATE,
    due_date DATE,
    description TEXT,
    attachment_url TEXT,
    journal_entry_id INTEGER REFERENCES journal_entries(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
`;

const seedData = `
-- We will seed a default Chart of Accounts only if it doesn't exist
INSERT INTO accounts (company_id, code, name, type, category, is_system)
SELECT id, '1000', 'Cash on Hand', 'Asset', 'Current Asset', true FROM companies
ON CONFLICT (company_id, code) DO NOTHING;

INSERT INTO accounts (company_id, code, name, type, category, is_system)
SELECT id, '1100', 'Bank Account', 'Asset', 'Current Asset', true FROM companies
ON CONFLICT (company_id, code) DO NOTHING;

INSERT INTO accounts (company_id, code, name, type, category, is_system)
SELECT id, '1200', 'Inventory', 'Asset', 'Current Asset', true FROM companies
ON CONFLICT (company_id, code) DO NOTHING;

INSERT INTO accounts (company_id, code, name, type, category, is_system)
SELECT id, '2000', 'Accounts Payable', 'Liability', 'Current Liability', true FROM companies
ON CONFLICT (company_id, code) DO NOTHING;

INSERT INTO accounts (company_id, code, name, type, category, is_system)
SELECT id, '4000', 'Sales Revenue', 'Revenue', 'Operating Revenue', true FROM companies
ON CONFLICT (company_id, code) DO NOTHING;

INSERT INTO accounts (company_id, code, name, type, category, is_system)
SELECT id, '5000', 'Cost of Goods Sold', 'Expense', 'Direct Cost', true FROM companies
ON CONFLICT (company_id, code) DO NOTHING;

INSERT INTO accounts (company_id, code, name, type, category, is_system)
SELECT id, '6000', 'Rent Expense', 'Expense', 'Operational Expense', true FROM companies
ON CONFLICT (company_id, code) DO NOTHING;

INSERT INTO accounts (company_id, code, name, type, category, is_system)
SELECT id, '6100', 'Utilities Expense', 'Expense', 'Operational Expense', true FROM companies
ON CONFLICT (company_id, code) DO NOTHING;

INSERT INTO accounts (company_id, code, name, type, category, is_system)
SELECT id, '6200', 'Salaries & Wages', 'Expense', 'Operational Expense', true FROM companies
ON CONFLICT (company_id, code) DO NOTHING;
`;

async function setup() {
    const client = await pool.connect();
    try {
        console.log('--- Initializing Accounting Schema ---');
        await client.query('BEGIN');
        await client.query(schema);
        await client.query(seedData);
        await client.query('COMMIT');
        console.log('SUCCESS: Accounting tables created and seeded.');
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('ERROR: Schema initialization failed:', err.message);
    } finally {
        client.release();
        await pool.end();
    }
}

setup();
