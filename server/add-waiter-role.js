import pg from 'pg';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '..', '.env') });

const { Pool } = pg;
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'restaurant_db',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '',
});

async function migrate() {
  const client = await pool.connect();
  try {
    // Drop the old check constraint and add a new one that includes 'waiter'
    await client.query(`
      ALTER TABLE employees
        DROP CONSTRAINT IF EXISTS employees_role_check;
    `);
    await client.query(`
      ALTER TABLE employees
        ADD CONSTRAINT employees_role_check
        CHECK (role IN ('admin', 'manager', 'cashier', 'waiter'));
    `);
    console.log('Waiter role added to employees table successfully.');
  } catch (e) {
    console.error('Migration failed:', e.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

migrate();
