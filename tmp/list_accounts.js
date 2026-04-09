import pg from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

async function check() {
    try {
        const companyId = 'd6797595-412e-4b3b-8378-4442a397d207';
        const res = await pool.query('SELECT id, code, name FROM accounts WHERE company_id = $1', [companyId]);
        fs.writeFileSync('tmp/accounts_list.json', JSON.stringify(res.rows, null, 2));
        console.log(`Found ${res.rows.length} accounts. Saved to tmp/accounts_list.json`);
    } catch (err) {
        console.error(err);
    } finally {
        await pool.end();
    }
}

check();
