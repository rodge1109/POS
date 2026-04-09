import pg from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

async function migrate() {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        
        console.log('--- Migrating Accounts Table for Hierarchy ---');
        
        // Add columns if they don't exist
        await client.query(`
            ALTER TABLE accounts 
            ADD COLUMN IF NOT EXISTS parent_id INTEGER REFERENCES accounts(id),
            ADD COLUMN IF NOT EXISTS is_header BOOLEAN DEFAULT FALSE
        `);

        // Update existing accounts to be sub-accounts of a header if needed
        // For now, let's create "Main" headers based on type
        const types = ['Asset', 'Liability', 'Equity', 'Revenue', 'Expense'];
        
        for (const type of types) {
            const code = type === 'Asset' ? '1' : 
                         type === 'Liability' ? '2' : 
                         type === 'Equity' ? '3' : 
                         type === 'Revenue' ? '4' : '5';
            
            // Create a Header account for each type across all companies
            const companiesResult = await client.query('SELECT DISTINCT company_id FROM accounts');
            
            for (const company of companiesResult.rows) {
                const company_id = company.company_id;
                
                // Create Header (Main) Account
                const headerName = type.toUpperCase();
                const existingHeader = await client.query(
                    'SELECT id FROM accounts WHERE company_id = $1 AND code = $2',
                    [company_id, code]
                );
                
                let headerId;
                if (existingHeader.rows.length === 0) {
                    const insertRes = await client.query(
                        'INSERT INTO accounts (company_id, code, name, type, category, is_header, is_system) VALUES ($1, $2, $3, $4, $5, true, true) RETURNING id',
                        [company_id, code, headerName, type, type]
                    );
                    headerId = insertRes.rows[0].id;
                } else {
                    headerId = existingHeader.rows[0].id;
                    await client.query('UPDATE accounts SET is_header = true WHERE id = $1', [headerId]);
                }
                
                // Link sub-accounts
                await client.query(
                    'UPDATE accounts SET parent_id = $1 WHERE company_id = $2 AND id != $1 AND type = $3',
                    [headerId, company_id, type]
                );
            }
        }

        await client.query('COMMIT');
        console.log('SUCCESS: Hierarchy migration complete.');
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('ERROR: Migration failed:', err.message);
    } finally {
        client.release();
        await pool.end();
    }
}

migrate();
