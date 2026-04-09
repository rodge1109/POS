import pg from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

async function seedCash() {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        
        console.log('--- Seeding Sub-Accounts for Cash ---');
        
        const companiesResult = await client.query('SELECT DISTINCT company_id FROM accounts');
        
        for (const company of companiesResult.rows) {
            const company_id = company.company_id;
            
            // 1. Find the "Main" Cash account (usually 1000)
            const mainCashRes = await client.query(
                "SELECT id FROM accounts WHERE company_id = $1 AND code = '1000'",
                [company_id]
            );
            
            if (mainCashRes.rows.length > 0) {
                const mainCashId = mainCashRes.rows[0].id;
                
                // Update it to be a header
                await client.query(
                    "UPDATE accounts SET name = 'CASH', is_header = true WHERE id = $1",
                    [mainCashId]
                );
                
                // 2. Create Sub-Accounts
                const subs = [
                    { code: '1001', name: 'Cash on Hand', type: 'Asset', category: 'Current Asset' },
                    { code: '1002', name: 'Petty Cash', type: 'Asset', category: 'Current Asset' },
                    { code: '1101', name: 'BPI Checking', type: 'Asset', category: 'Current Asset' },
                    { code: '1102', name: 'GCash Business', type: 'Asset', category: 'Current Asset' }
                ];
                
                for (const sub of subs) {
                    await client.query(
                        `INSERT INTO accounts (company_id, code, name, type, category, parent_id, is_header, is_system)
                         VALUES ($1, $2, $3, $4, $5, $6, false, true)
                         ON CONFLICT (company_id, code) DO UPDATE SET parent_id = $6`,
                        [company_id, sub.code, sub.name, sub.type, sub.category, mainCashId]
                    );
                }
            }
        }

        await client.query('COMMIT');
        console.log('SUCCESS: Cash sub-accounts seeded.');
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('ERROR: Seeding failed:', err.message);
    } finally {
        client.release();
        await pool.end();
    }
}

seedCash();
