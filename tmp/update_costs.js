import pg from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

async function updateCosts() {
    try {
        await pool.query("UPDATE products SET cost = 4.50 WHERE name = 'Greek Salad'");
        await pool.query("UPDATE products SET cost = 6.00 WHERE name = 'Spaghetti Carbonara'");
        console.log('SUCCESS: Updated costs for Greek Salad and Spaghetti Carbonara');
    } catch (err) {
        console.error(err);
    } finally {
        await pool.end();
    }
}

updateCosts();
