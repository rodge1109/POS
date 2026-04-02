
// Migration to add product_id to inventory_transactions
import pool from './config/database.js';

async function migrate() {
    try {
        console.log('Starting inventory_transactions migration...');
        
        // 1. Add product_id column
        await pool.query(`
            ALTER TABLE inventory_transactions 
            ADD COLUMN IF NOT EXISTS product_id integer;
        `);
        console.log('Added product_id column to inventory_transactions.');

        // 2. Add company_id if missing (for multi-tenant support)
        await pool.query(`
            ALTER TABLE inventory_transactions 
            ADD COLUMN IF NOT EXISTS company_id uuid DEFAULT '00000000-0000-0000-0000-000000000000'::uuid;
        `);
        console.log('Ensured company_id exists on inventory_transactions.');

        console.log('Migration completed successfully.');
        process.exit(0);
    } catch (err) {
        console.error('Migration failed:', err);
        process.exit(1);
    }
}

migrate();
