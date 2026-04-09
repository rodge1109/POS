import pg from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

async function debugData() {
    try {
        console.log('--- LATEST ORDERS ---');
        const orders = await pool.query('SELECT id, order_number, total_amount, created_at FROM orders ORDER BY created_at DESC LIMIT 5');
        console.table(orders.rows);

        console.log('\n--- LATEST JOURNAL ENTRIES ---');
        const journal = await pool.query('SELECT id, description, source_module, reference_no, created_at FROM journal_entries ORDER BY created_at DESC LIMIT 10');
        console.table(journal.rows);
        
        console.log('\n--- ACCOUNT CODES CHECK ---');
        const codes = ['1001', '4000', '5000', '1200'];
        const accounts = await pool.query('SELECT code, id, name FROM accounting_accounts WHERE code = ANY($1)', [codes]);
        console.table(accounts.rows);

    } catch (err) {
        console.error(err);
    } finally {
        await pool.end();
    }
}

debugData();
